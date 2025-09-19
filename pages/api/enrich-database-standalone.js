#!/usr/bin/env node
/**
 * Standalone Database Enrichment Script - CommonJS Version
 * Run: node enrich-database-standalone.js [--batch 0] [--batch-size 50]
 *
 * Verbeteringen:
 * - 429 handling met Retry-After + exponential backoff
 * - Artist-genres in batches via /v1/artists?ids=...
 * - Caching van artist-genres
 * - Minder onnodige calls (debug optioneel)
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use native fetch (Node.js 18+) or node-fetch@2 fallback
let fetch;
if (global.fetch) {
    fetch = global.fetch;
} else {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        console.error('❌ This script requires Node.js 18+ for native fetch, or install node-fetch@2');
        console.log('Install: npm install node-fetch@2');
        process.exit(1);
    }
}

/* ----------------- Config ----------------- */
const CONFIG = {
    BATCH_SIZE: 50,
    RATE_LIMIT_DELAY_MS: 800,      // kleine pauze tussen calls
    SEARCH_DELAY_MS: 200,          // mini-pauze tussen subcalls binnen 1 track
    DEBUG_API: false,              // zet true voor 1x debug per run
    INPUT_FILE: path.join(__dirname, '..', '..', 'public', 'data', 'input', 'sortyourmusic.xlsx'),
    OUTPUT_FILE: path.join(__dirname, '..', '..', 'public', 'data', 'output', 'enriched_database.xlsx'),

    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || process.env.NEXTAUTH_SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXTAUTH_SPOTIFY_CLIENT_SECRET
};

/* ----------------- Utils ----------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeJson(resp) {
    try {
        const text = await resp.text();
        if (!text) return null;
        try { return JSON.parse(text); } catch { return null; }
    } catch {
        return null;
    }
}

function calculateMatchConfidence(originalTrack, spotifyTrack) {
    let confidence = 0;

    const originalTitle = originalTrack.Title?.toLowerCase().trim() || '';
    const spotifyTitle = spotifyTrack.name.toLowerCase().trim();

    if (originalTitle === spotifyTitle) {
        confidence += 40;
    } else if (spotifyTitle.includes(originalTitle) || originalTitle.includes(spotifyTitle)) {
        confidence += 25;
    }

    const originalArtist = originalTrack.Artist?.toLowerCase().trim() || '';
    const spotifyArtist = (spotifyTrack.artists?.[0]?.name || '').toLowerCase().trim();

    if (originalArtist === spotifyArtist) {
        confidence += 40;
    } else if (spotifyArtist.includes(originalArtist) || originalArtist.includes(spotifyArtist)) {
        confidence += 25;
    }

    if (spotifyTrack.preview_url) confidence += 10;
    if (spotifyTrack.popularity > 70) confidence += 10;

    return Math.min(confidence, 100);
}

/* ----------------- Robust fetch (429 & 5xx) ----------------- */
async function fetchWithRetry(url, options = {}, { maxRetries = 6 } = {}) {
    let attempt = 0;
    while (true) {
        const resp = await fetch(url, options);

        // Respecteer 429 (Too Many Requests)
        if (resp.status === 429) {
            const retryAfterHeader = resp.headers.get('Retry-After');
            const retryAfter = Number(retryAfterHeader) || 2; // fallback 2s
            console.warn(`⚠️ 429 Too Many Requests. Retry-After: ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
            await sleep(retryAfter * 1000);
            attempt++;
            if (attempt > maxRetries) return resp; // geef resp terug; caller beslist
            continue;
        }

        // 5xx -> exponential backoff
        if (resp.status >= 500 && resp.status < 600 && attempt < maxRetries) {
            const wait = Math.min(2 ** attempt, 8) * 1000;
            console.warn(`⚠️ ${resp.status} server error. Wachten ${wait}ms… (attempt ${attempt + 1}/${maxRetries})`);
            await sleep(wait);
            attempt++;
            continue;
        }

        return resp;
    }
}

/* ----------------- Spotify Auth ----------------- */
class SpotifyAuthManager {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        // hergebruik token als geldig
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await fetchWithRetry('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const error = await safeJson(response);
            throw new Error(`Token request failed: ${response.status} - ${error?.error_description || 'Unknown error'}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000; // 30s buffer
        return this.accessToken;
    }
}

/* ----------------- Optionele debug ----------------- */
async function debugSpotifyAccess(token) {
    console.log("🔍 Testing Spotify API access...");
    try {
        const searchResp = await fetchWithRetry('https://api.spotify.com/v1/search?q=jazz&type=track&limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("   Search:", searchResp.status);
    } catch (e) {
        console.log("   Search error:", e.message);
    }
    try {
        const featResp = await fetchWithRetry('https://api.spotify.com/v1/audio-features/4iV5W9uYEdYUVa79Axb7Rh', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("   Audio features:", featResp.status);
    } catch (e) {
        console.log("   Audio features error:", e.message);
    }
}

/* ----------------- Artist batching & cache ----------------- */
function chunk(array, size) {
    const out = [];
    for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
    return out;
}

/**
 * Haal genres op voor meerdere artiesten in batches van max 50.
 * @param {string[]} artistIds
 * @param {string} token
 * @param {Map} artistCache  // id -> genres[]
 */
async function fetchArtistGenresBatched(artistIds, token, artistCache) {
    const missing = artistIds.filter((id) => !artistCache.has(id));
    if (missing.length === 0) return;

    const batches = chunk(missing, 50);
    for (const [idx, ids] of batches.entries()) {
        const url = `https://api.spotify.com/v1/artists?ids=${ids.join(',')}`;
        const resp = await fetchWithRetry(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!resp.ok) {
            const txt = await resp.text();
            console.warn(`❌ Artists batch failed (${resp.status}): ${txt}`);
            // kleine pauze, ga verder met volgende batch
            await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
            continue;
        }

        const data = await resp.json();
        const artists = data.artists || [];
        for (const a of artists) {
            artistCache.set(a.id, a.genres || []);
        }

        // throttle een tikje tussen batches
        await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
    }
}

/* ----------------- Main Enrichment ----------------- */
async function enrichDatabase(options = {}) {
    const { batch = 0, batchSize = CONFIG.BATCH_SIZE } = options;

    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
        throw new Error(`Excel file not found: ${CONFIG.INPUT_FILE}\nCreate the directory and place your Excel file.`);
    }

    const workbook = XLSX.readFile(CONFIG.INPUT_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const spotifyAuth = new SpotifyAuthManager(CONFIG.SPOTIFY_CLIENT_ID, CONFIG.SPOTIFY_CLIENT_SECRET);
    const accessToken = await spotifyAuth.getAccessToken();

    if (CONFIG.DEBUG_API) {
        await debugSpotifyAccess(accessToken);
    }

    console.log(`📊 Total tracks: ${jsonData.length}`);

    const startIndex = batch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, jsonData.length);
    const batchData = jsonData.slice(startIndex, endIndex);
    const totalBatches = Math.ceil(jsonData.length / batchSize);

    console.log(`🎯 Processing batch ${batch + 1}/${totalBatches} (tracks ${startIndex + 1}-${endIndex})`);

    if (batchData.length === 0) {
        console.log("✅ All batches completed!");
        return { completed: true, totalTracks: jsonData.length };
    }

    const enrichedBatch = [];
    const artistCache = new Map();       // id -> genres[]
    const artistIdsNeeded = new Set();   // unieke artist ids uit deze batch

    let successful = 0;
    let failed = 0;

    // 1) Eerst per track: zoek track (max 2 searches) en verzamel primary artistId
    for (let i = 0; i < batchData.length; i++) {
        const raw = batchData[i];
        const trackIndex = startIndex + i + 1;
        console.log(`\n🎵 Track ${trackIndex}/${jsonData.length}: "${raw.Title}" by "${raw.Artist}"`);

        const token = await spotifyAuth.getAccessToken(); // vernieuwing indien nodig

        const enriched = {
            ...raw,
            Spotify_ID: '',
            Genre_1: '',
            Genre_2: '',
            Genre_3: '',
            Genres_All: '',
            Popularity: '',
            Album_Name: '',
            Preview_URL: '',
            Match_Confidence: 0,
            __primaryArtistId: '' // tijdelijk veld voor fase 2
        };

        try {
            // 1a) Strikte search
            const qStrict = `track:"${raw.Title}" artist:"${raw.Artist}"`;
            const urlStrict = `https://api.spotify.com/v1/search?q=${encodeURIComponent(qStrict)}&type=track&limit=3`;
            let resp = await fetchWithRetry(urlStrict, { headers: { Authorization: `Bearer ${token}` } });
            if (!resp.ok) throw new Error(`Search strict failed: ${resp.status}`);
            let data = await safeJson(resp);

            // 1b) Zo nodig brede search
            if (!data?.tracks?.items?.length) {
                await sleep(CONFIG.SEARCH_DELAY_MS);
                const qBroad = `${raw.Title} ${raw.Artist}`;
                const urlBroad = `https://api.spotify.com/v1/search?q=${encodeURIComponent(qBroad)}&type=track&limit=3`;
                const resp2 = await fetchWithRetry(urlBroad, { headers: { Authorization: `Bearer ${token}` } });
                if (resp2.ok) {
                    const data2 = await safeJson(resp2);
                    if (data2?.tracks?.items?.length) data = data2;
                }
            }

            const item = data?.tracks?.items?.[0];
            if (!item) {
                console.log('   ❌ No match found');
                failed++;
                enrichedBatch.push(enriched);
                // throttle zachtjes
                await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
                continue;
            }

            const primaryArtistId = item.artists?.[0]?.id || '';
            if (primaryArtistId) artistIdsNeeded.add(primaryArtistId);

            enriched.Spotify_ID = item.id;
            enriched.Popularity = item.popularity ?? '';
            enriched.Album_Name = item.album?.name ?? '';
            enriched.Preview_URL = item.preview_url ?? '';
            enriched.Match_Confidence = calculateMatchConfidence(raw, item);
            enriched.__primaryArtistId = primaryArtistId;

            console.log(`   ✅ Found: "${item.name}" by "${item.artists?.[0]?.name || 'Unknown'}"`);
            console.log(`   📈 Popularity: ${item.popularity}`);
            console.log(`   🎯 Match confidence: ${enriched.Match_Confidence}%`);

            successful++;
            enrichedBatch.push(enriched);

            // throttle zachtjes tussen track-searches
            await sleep(CONFIG.RATE_LIMIT_DELAY_MS);

        } catch (err) {
            console.error(`   💥 Error: ${err.message}`);
            failed++;
            enrichedBatch.push(enriched);
            await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
        }
    }

    // 2) Artist-genres in batches ophalen en cache vullen
    const token2 = await spotifyAuth.getAccessToken();
    await fetchArtistGenresBatched([...artistIdsNeeded], token2, artistCache);

    // 3) Genres invullen in enrichedBatch
    for (const row of enrichedBatch) {
        const aid = row.__primaryArtistId;
        if (aid && artistCache.has(aid)) {
            const genres = artistCache.get(aid) || [];
            row.Genre_1 = genres[0] || '';
            row.Genre_2 = genres[1] || '';
            row.Genre_3 = genres[2] || '';
            row.Genres_All = genres.join(', ');
        }
        delete row.__primaryArtistId; // opruimen temp veld
    }

    // 4) Wegschrijven
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    if (batch === 0) {
        // eerste batch -> nieuw bestand met resterende rijen leeg ingevuld
        const remainingData = jsonData.slice(endIndex).map(track => ({
            ...track,
            Spotify_ID: '',
            Genre_1: '',
            Genre_2: '',
            Genre_3: '',
            Genres_All: '',
            Popularity: '',
            Album_Name: '',
            Preview_URL: '',
            Match_Confidence: ''
        }));

        const fullData = [...enrichedBatch, ...remainingData];
        const newWb = XLSX.utils.book_new();
        const newWs = XLSX.utils.json_to_sheet(fullData);
        XLSX.utils.book_append_sheet(newWb, newWs, 'Enriched Database');
        XLSX.writeFile(newWb, CONFIG.OUTPUT_FILE);
        console.log(`💾 Created: ${CONFIG.OUTPUT_FILE}`);
    } else {
        // update bestaand bestand
        if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
            const existingWb = XLSX.readFile(CONFIG.OUTPUT_FILE);
            const existingWs = existingWb.Sheets[existingWb.SheetNames[0]];
            const existingData = XLSX.utils.sheet_to_json(existingWs);

            for (let i = 0; i < enrichedBatch.length; i++) {
                const idx = startIndex + i;
                if (idx < existingData.length) {
                    existingData[idx] = enrichedBatch[i];
                }
            }

            const newWs = XLSX.utils.json_to_sheet(existingData);
            const newWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWb, newWs, 'Enriched Database');
            XLSX.writeFile(newWb, CONFIG.OUTPUT_FILE);
            console.log(`💾 Updated: ${CONFIG.OUTPUT_FILE}`);
        } else {
            // als bestand ontbreekt, maak ‘m alsnog volledig
            const prefix = jsonData.slice(0, startIndex).map(track => ({
                ...track,
                Spotify_ID: '',
                Genre_1: '',
                Genre_2: '',
                Genre_3: '',
                Genres_All: '',
                Popularity: '',
                Album_Name: '',
                Preview_URL: '',
                Match_Confidence: ''
            }));
            const suffix = jsonData.slice(endIndex).map(track => ({
                ...track,
                Spotify_ID: '',
                Genre_1: '',
                Genre_2: '',
                Genre_3: '',
                Genres_All: '',
                Popularity: '',
                Album_Name: '',
                Preview_URL: '',
                Match_Confidence: ''
            }));

            const fullData = [...prefix, ...enrichedBatch, ...suffix];
            const newWb = XLSX.utils.book_new();
            const newWs = XLSX.utils.json_to_sheet(fullData);
            XLSX.utils.book_append_sheet(newWb, newWs, 'Enriched Database');
            XLSX.writeFile(newWb, CONFIG.OUTPUT_FILE);
            console.log(`💾 Recreated: ${CONFIG.OUTPUT_FILE}`);
        }
    }

    console.log(`\n✅ Batch ${batch + 1} done`);
    console.log(`   📊 Successful matches: ${successful}`);
    console.log(`   ❌ Failed matches: ${failed}`);
    console.log(`   📈 Success rate: ${((successful / batchData.length) * 100).toFixed(1)}%`);

    return {
        success: true,
        batch: batch + 1,
        totalBatches,
        tracksProcessed: endIndex,
        totalTracks: jsonData.length,
        batchStats: {
            successful,
            failed,
            successRate: ((successful / batchData.length) * 100).toFixed(1)
        },
        nextBatch: batch + 1 < totalBatches ? batch + 1 : null,
        completed: batch + 1 >= totalBatches
    };
}

/* ----------------- CLI ----------------- */
async function main() {
    console.log("🎵 Database Enrichment Tool");
    console.log("==========================");

    if (!CONFIG.SPOTIFY_CLIENT_ID || !CONFIG.SPOTIFY_CLIENT_SECRET) {
        console.error("❌ Spotify credentials not found!");
        console.log("Check your .env (in parent folder):");
        console.log("  SPOTIFY_CLIENT_ID=...");
        console.log("  SPOTIFY_CLIENT_SECRET=...");
        console.log("or NEXTAUTH_SPOTIFY_CLIENT_ID / NEXTAUTH_SPOTIFY_CLIENT_SECRET");
        console.log("Checked path:", path.join(__dirname, '..', '.env'));
        process.exit(1);
    }

    // Args
    const args = process.argv.slice(2);
    const options = {};
    if (args.includes('--help')) {
        console.log("Usage: node enrich-database-standalone.js [options]");
        console.log("  --batch <n>        Start from batch index (default 0)");
        console.log("  --batch-size <n>   Tracks per batch (default 50)");
        console.log("");
        console.log("Files:");
        console.log("  Input:  ./public/data/input/sortyourmusic.xlsx");
        console.log("  Output: ./public/data/output/enriched_database.xlsx");
        process.exit(0);
    }
    if (args.includes('--batch')) {
        const idx = args.indexOf('--batch') + 1;
        options.batch = parseInt(args[idx]) || 0;
    }
    if (args.includes('--batch-size')) {
        const idx = args.indexOf('--batch-size') + 1;
        options.batchSize = parseInt(args[idx]) || CONFIG.BATCH_SIZE;
    }

    try {
        console.log(`📁 Input:  ${CONFIG.INPUT_FILE}`);
        console.log(`📁 Output: ${CONFIG.OUTPUT_FILE}\n`);

        let currentBatch = options.batch || 0;
        let result;

        do {
            result = await enrichDatabase({
                batch: currentBatch,
                batchSize: options.batchSize
            });

            if (result.completed) {
                console.log("\n🎉 All batches completed!");
                console.log(`📁 Final output: ${CONFIG.OUTPUT_FILE}`);
                break;
            }

            currentBatch++;
            console.log("\n⏳ Waiting 2 seconds before next batch...");
            await sleep(2000);
        } while (!result.completed);

    } catch (error) {
        console.error("💥 Fatal error:", error.message);
        if (error.message.includes('Excel file not found')) {
            console.log("\n💡 Ensure structure:");
            console.log("   your-project/");
            console.log("   ├── enrich-database-standalone.js");
            console.log("   └── public/data/input/sortyourmusic.xlsx");
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
