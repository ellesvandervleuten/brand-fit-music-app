#!/usr/bin/env node
/**
 * Enrich Database (Self-Update) - CommonJS
 * Run: node enrich-database-resume.js [--batch 0] [--batch-size 50]
 *
 * Wat het doet:
 * - Leest input (enriched_database.xlsx) - gebruikt output als input!
 * - Zoekt alleen ontbrekende entries op (waar Spotify_ID, Genre_1 etc. leeg zijn)
 * - Haalt artist-genres in batches (50 tegelijk)
 * - Robuuste 429-handling met Retry-After + backoff
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Load environment variables (bijv. ../.env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use native fetch (Node 18+) of node-fetch@2 fallback
let fetch;
if (global.fetch) {
    fetch = global.fetch;
} else {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        console.error('❌ Node 18+ met native fetch vereist of installeer node-fetch@2');
        console.log('Install: npm install node-fetch@2');
        process.exit(1);
    }
}

/* ----------------- Config ----------------- */
const CONFIG = {
    BATCH_SIZE: 50,
    RATE_LIMIT_DELAY_MS: 800,  // lichte pauze tussen API-calls
    SEARCH_DELAY_MS: 200,      // mini-pauze tussen subcalls binnen 1 track
    DEBUG_API: false,          // 1x korte check; zet op false voor productie

    // NU GEBRUIKT HET ENRICHED_DATABASE ALS INPUT!
    INPUT_FILE: path.join(__dirname, '..', '..', 'public', 'data', 'output', 'enriched_database.xlsx'),
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

function makeKey(title, artist) {
    const t = (title || '').toString().trim().toLowerCase();
    const a = (artist || '').toString().trim().toLowerCase();
    return `${t}|||${a}`;
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

// Helper functie om te checken of een track nog enrichment nodig heeft
function needsEnrichment(row) {
    const hasSpotifyId = row.Spotify_ID && row.Spotify_ID.toString().trim();
    const hasGenres = row.Genre_1 && row.Genre_1.toString().trim();
    const hasPopularity = row.Popularity && row.Popularity.toString().trim();

    // Als we geen Spotify ID hebben, hebben we zeker enrichment nodig
    if (!hasSpotifyId) return true;

    // Als we wel een ID hebben maar geen genres of popularity, kunnen we die nog ophalen
    if (!hasGenres || !hasPopularity) return true;

    return false;
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
    for (const ids of batches) {
        const url = `https://api.spotify.com/v1/artists?ids=${ids.join(',')}`;
        const resp = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } });

        if (!resp.ok) {
            const txt = await resp.text();
            console.warn(`❌ Artists batch failed (${resp.status}): ${txt}`);
            await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
            continue;
        }

        const data = await resp.json();
        const artists = data.artists || [];
        for (const a of artists) {
            artistCache.set(a.id, a.genres || []);
        }

        await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
    }
}

/* ----------------- Main Enrichment (Self-Update) ----------------- */
async function enrichDatabase(options = {}) {
    const { batch = 0, batchSize = CONFIG.BATCH_SIZE } = options;

    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
        throw new Error(`Enriched database file not found: ${CONFIG.INPUT_FILE}\nRun the initial enrichment first to create this file.`);
    }

    // 1) Lees bestaande enriched database als input
    const wbIn = XLSX.readFile(CONFIG.INPUT_FILE);
    const wsIn = wbIn.Sheets[wbIn.SheetNames[0]];
    const inputRows = XLSX.utils.sheet_to_json(wsIn);

    console.log(`📊 Total tracks in database: ${inputRows.length}`);

    // 2) Filter alleen tracks die enrichment nodig hebben
    const tracksNeedingEnrichment = inputRows.filter(needsEnrichment);
    console.log(`🔍 Tracks needing enrichment: ${tracksNeedingEnrichment.length}`);

    if (tracksNeedingEnrichment.length === 0) {
        console.log("✅ All tracks are already enriched! Nothing to do.");
        return { completed: true, totalTracks: inputRows.length };
    }

    const spotifyAuth = new SpotifyAuthManager(CONFIG.SPOTIFY_CLIENT_ID, CONFIG.SPOTIFY_CLIENT_SECRET);
    const accessToken = await spotifyAuth.getAccessToken();
    if (CONFIG.DEBUG_API) await debugSpotifyAccess(accessToken);

    // 3) Bepaal batchrange van tracks die enrichment nodig hebben
    const startIndex = batch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, tracksNeedingEnrichment.length);
    const batchData = tracksNeedingEnrichment.slice(startIndex, endIndex);
    const totalBatches = Math.ceil(tracksNeedingEnrichment.length / batchSize);
    console.log(`🎯 Processing batch ${batch + 1}/${totalBatches} (${batchData.length} tracks needing enrichment)`);

    if (batchData.length === 0) {
        console.log("✅ All enrichment batches completed!");
        return { completed: true, totalTracks: inputRows.length };
    }

    const artistCache = new Map();       // id -> genres[]
    const artistIdsNeeded = new Set();   // unieke artist ids voor deze batch

    let successful = 0;
    let failed = 0;
    let updated = 0;

    // 4) Verwerk alleen tracks die enrichment nodig hebben
    for (let i = 0; i < batchData.length; i++) {
        const row = batchData[i];
        const trackIndex = startIndex + i + 1;

        console.log(`\n🎵 Track ${trackIndex}/${tracksNeedingEnrichment.length}: "${row.Title}" by "${row.Artist}"`);

        try {
            const token = await spotifyAuth.getAccessToken();

            // Als we nog geen Spotify ID hebben, zoeken
            if (!row.Spotify_ID || !row.Spotify_ID.toString().trim()) {
                const qStrict = `track:"${row.Title}" artist:"${row.Artist}"`;
                const urlStrict = `https://api.spotify.com/v1/search?q=${encodeURIComponent(qStrict)}&type=track&limit=3`;
                let resp = await fetchWithRetry(urlStrict, { headers: { Authorization: `Bearer ${token}` } });
                if (!resp.ok) throw new Error(`Search strict failed: ${resp.status}`);
                let data = await safeJson(resp);

                if (!data?.tracks?.items?.length) {
                    await sleep(CONFIG.SEARCH_DELAY_MS);
                    const qBroad = `${row.Title} ${row.Artist}`;
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
                    await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
                    continue;
                }

                // Update row met nieuwe Spotify data
                row.Spotify_ID = item.id;
                row.Popularity = item.popularity ?? '';
                row.Album_Name = item.album?.name ?? '';
                row.Preview_URL = item.preview_url ?? '';
                row.Match_Confidence = calculateMatchConfidence(row, item);
                row.__primaryArtistId = item.artists?.[0]?.id || '';

                console.log(`   ✅ Found: "${item.name}" by "${item.artists?.[0]?.name || 'Unknown'}"`);
                console.log(`   📈 Popularity: ${item.popularity}`);
                console.log(`   🎯 Match confidence: ${row.Match_Confidence}%`);

            } else {
                // We hebben al een Spotify ID, maar misschien geen genres
                console.log(`   ↩️ Already has Spotify ID: ${row.Spotify_ID}`);
                // We kunnen de artist ID afleiden van bestaande data indien nodig
            }

            // Als we een Spotify ID hebben maar geen genres, artist info ophalen
            if (row.Spotify_ID && (!row.Genre_1 || !row.Genre_1.toString().trim())) {
                console.log(`   🔍 Has Spotify ID but missing genres, fetching artist info...`);
                // We kunnen artist info ophalen via de track
                const trackUrl = `https://api.spotify.com/v1/tracks/${row.Spotify_ID}`;
                const trackResp = await fetchWithRetry(trackUrl, { headers: { Authorization: `Bearer ${token}` } });
                if (trackResp.ok) {
                    const trackData = await trackResp.json();
                    const artistId = trackData.artists?.[0]?.id;
                    if (artistId) {
                        row.__primaryArtistId = artistId;
                        artistIdsNeeded.add(artistId);
                        console.log(`   ✅ Found artist ID: ${artistId}`);
                    } else {
                        console.log(`   ❌ No artist ID found in track data`);
                    }
                } else {
                    console.log(`   ❌ Failed to fetch track data: ${trackResp.status}`);
                }
                await sleep(CONFIG.SEARCH_DELAY_MS);
            }

            if (row.__primaryArtistId) {
                artistIdsNeeded.add(row.__primaryArtistId);
            }

            successful++;
            updated++;
            await sleep(CONFIG.RATE_LIMIT_DELAY_MS);

        } catch (err) {
            console.error(`   💥 Error: ${err.message}`);
            failed++;
            await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
        }
    }

    // 5) Haal genres in batches op
    console.log(`\n🎭 Fetching genres for ${artistIdsNeeded.size} unique artists...`);
    if (artistIdsNeeded.size > 0) {
        const token2 = await spotifyAuth.getAccessToken();
        await fetchArtistGenresBatched([...artistIdsNeeded], token2, artistCache);
        console.log(`✅ Genre data retrieved for ${artistCache.size} artists`);
    } else {
        console.log(`⚠️ No artist IDs collected - skipping genre fetch`);
    }

    // Update genres voor alle verwerkte tracks
    let genresUpdated = 0;
    for (const row of batchData) {
        if (row.__primaryArtistId && artistCache.has(row.__primaryArtistId)) {
            const genres = artistCache.get(row.__primaryArtistId) || [];
            if (genres.length > 0) {
                row.Genre_1 = genres[0] || '';
                row.Genre_2 = genres[1] || '';
                row.Genre_3 = genres[2] || '';
                row.Genres_All = genres.join(', ');
                console.log(`   🎭 Updated genres for "${row.Title}": ${genres.slice(0, 3).join(', ')}`);
                genresUpdated++;
            } else {
                console.log(`   ⚠️ No genres found for artist ${row.__primaryArtistId}`);
            }
        }
        delete row.__primaryArtistId;
    }
    console.log(`\n📊 Total tracks with genres updated: ${genresUpdated}/${batchData.length}`);

    // 6) Schrijf updated data terug naar het bestand
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const newWs = XLSX.utils.json_to_sheet(inputRows);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newWs, 'Enriched Database');
    XLSX.writeFile(newWb, CONFIG.OUTPUT_FILE);
    console.log(`💾 Updated: ${CONFIG.OUTPUT_FILE}`);

    console.log(`\n✅ Batch ${batch + 1} done`);
    console.log(`   ✅ Successfully enriched: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Tracks updated: ${updated}`);
    console.log(`   📈 Success rate (this batch): ${((successful / batchData.length) * 100).toFixed(1)}%`);

    return {
        success: true,
        batch: batch + 1,
        totalBatches,
        tracksProcessed: endIndex,
        tracksNeedingEnrichment: tracksNeedingEnrichment.length,
        batchStats: {
            successful,
            failed,
            updated,
            successRate: ((successful / batchData.length) * 100).toFixed(1)
        },
        nextBatch: batch + 1 < totalBatches ? batch + 1 : null,
        completed: batch + 1 >= totalBatches
    };
}

/* ----------------- CLI ----------------- */
async function main() {
    console.log("🎵 Enrich Database (Self-Update)");
    console.log("=================================");
    console.log("📝 Input = Output: enriched_database.xlsx");

    if (!CONFIG.SPOTIFY_CLIENT_ID || !CONFIG.SPOTIFY_CLIENT_SECRET) {
        console.error("❌ Spotify credentials not found!");
        console.log("Check your .env (in parent folder):");
        console.log("  SPOTIFY_CLIENT_ID=...");
        console.log("  SPOTIFY_CLIENT_SECRET=...");
        console.log("or NEXTAUTH_SPOTIFY_CLIENT_ID / NEXTAUTH_SPOTIFY_CLIENT_SECRET");
        console.log("Checked path:", path.join(__dirname, '..', '.env'));
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const options = {};
    if (args.includes('--help')) {
        console.log("Usage: node enrich-database-resume.js [options]");
        console.log("  --batch <n>        Start from batch index (default 0)");
        console.log("  --batch-size <n>   Tracks per batch (default 50)");
        console.log("");
        console.log("File (input = output):");
        console.log("  ./public/data/output/enriched_database.xlsx");
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
        console.log(`📁 Database: ${CONFIG.INPUT_FILE}\n`);

        let currentBatch = options.batch || 0;
        let result;

        do {
            result = await enrichDatabase({
                batch: currentBatch,
                batchSize: options.batchSize
            });

            if (result.completed) {
                console.log("\n🎉 All enrichment batches completed!");
                console.log(`📁 Updated database: ${CONFIG.OUTPUT_FILE}`);
                break;
            }

            currentBatch++;
            console.log("\n⏳ Waiting 2 seconds before next batch...");
            await sleep(2000);
        } while (!result.completed);

    } catch (error) {
        console.error("💥 Fatal error:", error.message);
        if (error.message.includes('Enriched database file not found')) {
            console.log("\n💡 The enriched_database.xlsx file doesn't exist yet.");
            console.log("   Run the initial enrichment script first to create it.");
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}