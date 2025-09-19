#!/usr/bin/env node
/**
 * Smart Database Enrichment Script - Merge Original + Enriched
 * Filename: enrich-database-smart.js
 * 
 * This version intelligently merges original and enriched data:
 * - Preserves existing enriched tracks
 * - Adds new tracks from original file
 * - Only enriches missing data
 * 
 * Run from terminal: node enrich-database-smart.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use native fetch (Node.js 18+) or import node-fetch
let fetch;
if (global.fetch) {
    fetch = global.fetch;
} else {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        console.error('❌ This script requires Node.js 18+ for native fetch, or install node-fetch@2');
        console.log('Install older version: npm install node-fetch@2');
        process.exit(1);
    }
}

// Configuration
const CONFIG = {
    BATCH_SIZE: 50,
    RATE_LIMIT_DELAY: 100, // ms between requests
    INPUT_FILE: path.join(__dirname, '..', '..', 'public', 'data', 'input', 'sortyourmusic.xlsx'),
    OUTPUT_FILE: path.join(__dirname, '..', '..', 'public', 'data', 'output', 'enriched_database.xlsx'),

    // Spotify credentials from .env file
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || process.env.NEXTAUTH_SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXTAUTH_SPOTIFY_CLIENT_SECRET
};

/* ----------------- Helper Functions ----------------- */
async function safeJson(resp) {
    try {
        const text = await resp.text();
        if (!text) return null;
        try { return JSON.parse(text); } catch { return null; }
    } catch {
        return null;
    }
}

function assertOk(cond, msg) {
    if (!cond) throw new Error(msg);
}

// Check if a track already has Spotify data
function hasSpotifyData(track) {
    // Check if any of the Spotify columns have data
    return !!(
        track.Spotify_ID ||
        track.Genre_1 ||
        track.Genre_2 ||
        track.Genre_3 ||
        track.Genres_All ||
        track.Popularity ||
        track.Album_Name ||
        track.Preview_URL ||
        track.Match_Confidence
    );
}

// Helper function to calculate match confidence
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
    const spotifyArtist = spotifyTrack.artists[0].name.toLowerCase().trim();

    if (originalArtist === spotifyArtist) {
        confidence += 40;
    } else if (spotifyArtist.includes(originalArtist) || originalArtist.includes(spotifyArtist)) {
        confidence += 25;
    }

    if (spotifyTrack.preview_url) {
        confidence += 10;
    }

    if (spotifyTrack.popularity > 70) {
        confidence += 10;
    }

    return Math.min(confidence, 100);
}

/* ----------------- Spotify Auth Manager ----------------- */
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

        console.log('🔑 Getting new Spotify access token...');

        const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
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
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000;

            console.log('✅ Spotify access token acquired');
            return this.accessToken;

        } catch (error) {
            console.error('❌ Failed to get Spotify access token:', error.message);
            throw error;
        }
    }
}

/* ----------------- Debug Spotify Access ----------------- */
async function debugSpotifyAccess(token) {
    console.log("🔍 Testing Spotify API access...");

    try {
        const searchResp = await fetch('https://api.spotify.com/v1/search?q=jazz&type=track&limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("✅ Search access:", searchResp.status);
        if (!searchResp.ok) {
            const errorText = await searchResp.text();
            console.log("❌ Search error:", errorText);
        }
    } catch (e) {
        console.error("❌ Search test failed:", e.message);
    }

    try {
        const featResp = await fetch('https://api.spotify.com/v1/audio-features/4iV5W9uYEdYUVa79Axb7Rh', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("✅ Audio features access:", featResp.status);
        if (!featResp.ok) {
            const errorText = await featResp.text();
            console.log("❌ Audio features error:", errorText);
        }
    } catch (e) {
        console.error("❌ Audio features test failed:", e.message);
    }
}

/* ----------------- Main Enrichment Logic ----------------- */
async function enrichDatabase(options = {}) {
    const {
        batch = 0,
        batchSize = CONFIG.BATCH_SIZE,
        skipExisting = true
    } = options;

    const spotifyAuth = new SpotifyAuthManager(CONFIG.SPOTIFY_CLIENT_ID, CONFIG.SPOTIFY_CLIENT_SECRET);

    try {
        const accessToken = await spotifyAuth.getAccessToken();
        await debugSpotifyAccess(accessToken);

        console.log(`🔄 Starting smart enrichment batch ${batch + 1}...`);
        if (skipExisting) {
            console.log('📋 Smart mode: Merging files and processing only missing data');
        }

        // Smart file reading: merge original with enriched if both exist
        let jsonData = [];

        if (fs.existsSync(CONFIG.OUTPUT_FILE) && fs.existsSync(CONFIG.INPUT_FILE)) {
            console.log('📚 Merging original database with enriched database...');

            // Read original file
            const originalWorkbook = XLSX.readFile(CONFIG.INPUT_FILE);
            const originalWorksheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
            const originalData = XLSX.utils.sheet_to_json(originalWorksheet);

            // Read enriched file
            const enrichedWorkbook = XLSX.readFile(CONFIG.OUTPUT_FILE);
            const enrichedWorksheet = enrichedWorkbook.Sheets[enrichedWorkbook.SheetNames[0]];
            const enrichedData = XLSX.utils.sheet_to_json(enrichedWorksheet);

            // Create lookup map from enriched data
            const enrichedMap = new Map();
            enrichedData.forEach(track => {
                const key = `${track.Title}|${track.Artist}`;
                enrichedMap.set(key, track);
            });

            // Merge: use enriched data if available, otherwise original
            const mergedData = originalData.map(originalTrack => {
                const key = `${originalTrack.Title}|${originalTrack.Artist}`;

                if (enrichedMap.has(key)) {
                    // Use enriched version but ensure all original columns are preserved
                    return { ...originalTrack, ...enrichedMap.get(key) };
                } else {
                    // New track - add empty Spotify columns
                    return {
                        ...originalTrack,
                        Spotify_ID: '',
                        Genre_1: '',
                        Genre_2: '',
                        Genre_3: '',
                        Genres_All: '',
                        Popularity: '',
                        Album_Name: '',
                        Preview_URL: '',
                        Match_Confidence: ''
                    };
                }
            });

            jsonData = mergedData;
            console.log(`📊 Merged database: ${originalData.length} original tracks, ${enrichedData.length} enriched tracks`);

            // Count tracks that need enrichment
            const tracksNeedingEnrichment = mergedData.filter(track => !hasSpotifyData(track)).length;
            console.log(`🆕 Found ${tracksNeedingEnrichment} tracks that need enrichment`);

            // Early exit if no tracks need processing
            if (tracksNeedingEnrichment === 0) {
                console.log("🎉 All tracks already enriched! No work needed.");

                // Still save the merged file to ensure it's up to date
                const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                const newWorkbook = XLSX.utils.book_new();
                const newWorksheet = XLSX.utils.json_to_sheet(mergedData);
                XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Enriched Database");
                XLSX.writeFile(newWorkbook, CONFIG.OUTPUT_FILE);

                return {
                    completed: true,
                    totalTracks: mergedData.length,
                    alreadyEnriched: mergedData.length,
                    message: "All tracks already enriched - file updated with latest merge"
                };
            }

        } else if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
            console.log('📚 Using existing enriched database as source');
            const workbook = XLSX.readFile(CONFIG.OUTPUT_FILE);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            jsonData = XLSX.utils.sheet_to_json(worksheet);

        } else if (fs.existsSync(CONFIG.INPUT_FILE)) {
            console.log('📚 Using original database as source (first run)');
            const workbook = XLSX.readFile(CONFIG.INPUT_FILE);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            jsonData = XLSX.utils.sheet_to_json(worksheet);

        } else {
            throw new Error(`No input file found. Please ensure either:\n- ${CONFIG.INPUT_FILE} (original)\n- ${CONFIG.OUTPUT_FILE} (enriched)\nexists.`);
        }

        console.log(`📊 Total tracks in merged database: ${jsonData.length}`);

        // Filter out tracks that already have Spotify data (if skipExisting is true)
        let tracksToProcess = jsonData;
        if (skipExisting) {
            tracksToProcess = jsonData.filter(track => !hasSpotifyData(track));
            console.log(`📋 Tracks without Spotify data: ${tracksToProcess.length}`);
            console.log(`✅ Tracks already enriched: ${jsonData.length - tracksToProcess.length}`);
        }

        if (tracksToProcess.length === 0) {
            console.log("🎉 All tracks already have Spotify data!");
            return {
                completed: true,
                totalTracks: jsonData.length,
                alreadyEnriched: jsonData.length
            };
        }

        // Calculate batch boundaries for tracks that need processing
        const startIndex = batch * batchSize;
        const endIndex = Math.min(startIndex + batchSize, tracksToProcess.length);
        const batchData = tracksToProcess.slice(startIndex, endIndex);

        const totalBatches = Math.ceil(tracksToProcess.length / batchSize);

        console.log(`🎯 Processing batch ${batch + 1}/${totalBatches} (${batchData.length} tracks)`);

        if (batchData.length === 0) {
            console.log("✅ All remaining batches completed!");
            return {
                completed: true,
                totalTracks: jsonData.length,
                processedTracks: tracksToProcess.length
            };
        }

        // Enrich each track in this batch
        const enrichedTracks = [];
        let successful = 0;
        let failed = 0;

        for (let i = 0; i < batchData.length; i++) {
            const track = batchData[i];
            const trackIndex = startIndex + i + 1;

            console.log(`\n🎵 Track ${trackIndex}/${tracksToProcess.length}: "${track.Title}" by "${track.Artist}"`);

            try {
                const currentToken = await spotifyAuth.getAccessToken();

                // Search for track on Spotify
                const searchQuery = `track:"${track.Title}" artist:"${track.Artist}"`;
                const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=3`;

                const searchResponse = await fetch(searchUrl, {
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });

                if (!searchResponse.ok) {
                    throw new Error(`Search failed: ${searchResponse.status}`);
                }

                const searchData = await safeJson(searchResponse);

                if (!searchData || !searchData.tracks || searchData.tracks.items.length === 0) {
                    // Try broader search without quotes
                    const broadQuery = `${track.Title} ${track.Artist}`;
                    const broadUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(broadQuery)}&type=track&limit=3`;

                    const broadResponse = await fetch(broadUrl, {
                        headers: { 'Authorization': `Bearer ${currentToken}` }
                    });

                    if (broadResponse.ok) {
                        const broadData = await safeJson(broadResponse);
                        if (broadData && broadData.tracks && broadData.tracks.items.length > 0) {
                            searchData.tracks = broadData.tracks;
                        }
                    }
                }

                let enrichedTrack = { ...track };

                if (searchData && searchData.tracks && searchData.tracks.items.length > 0) {
                    const spotifyTrack = searchData.tracks.items[0];

                    // Get artist details for genres
                    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${spotifyTrack.artists[0].id}`, {
                        headers: { 'Authorization': `Bearer ${currentToken}` }
                    });

                    let genres = [];
                    if (artistResponse.ok) {
                        const artistData = await safeJson(artistResponse);
                        if (artistData && artistData.genres) {
                            genres = artistData.genres;
                        }
                    }

                    // Add Spotify data
                    enrichedTrack.Spotify_ID = spotifyTrack.id;
                    enrichedTrack.Genre_1 = genres[0] || '';
                    enrichedTrack.Genre_2 = genres[1] || '';
                    enrichedTrack.Genre_3 = genres[2] || '';
                    enrichedTrack.Genres_All = genres.join(', ');
                    enrichedTrack.Popularity = spotifyTrack.popularity;
                    enrichedTrack.Album_Name = spotifyTrack.album.name;
                    enrichedTrack.Preview_URL = spotifyTrack.preview_url || '';
                    enrichedTrack.Match_Confidence = calculateMatchConfidence(track, spotifyTrack);

                    console.log(`   ✅ Found: "${spotifyTrack.name}" by "${spotifyTrack.artists[0].name}"`);
                    console.log(`   🎭 Genres: ${genres.slice(0, 3).join(', ')}${genres.length > 3 ? ` (+${genres.length - 3} more)` : ''}`);
                    console.log(`   📈 Popularity: ${spotifyTrack.popularity}`);
                    console.log(`   🎯 Match confidence: ${enrichedTrack.Match_Confidence}%`);
                    successful++;
                } else {
                    // No match found - add empty columns
                    enrichedTrack.Spotify_ID = '';
                    enrichedTrack.Genre_1 = '';
                    enrichedTrack.Genre_2 = '';
                    enrichedTrack.Genre_3 = '';
                    enrichedTrack.Genres_All = '';
                    enrichedTrack.Popularity = '';
                    enrichedTrack.Album_Name = '';
                    enrichedTrack.Preview_URL = '';
                    enrichedTrack.Match_Confidence = 0;

                    console.log(`   ❌ No match found`);
                    failed++;
                }

                enrichedTracks.push(enrichedTrack);
                await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY));

            } catch (error) {
                console.error(`   💥 Error processing track: ${error.message}`);

                const enrichedTrack = {
                    ...track,
                    Spotify_ID: '',
                    Genre_1: '',
                    Genre_2: '',
                    Genre_3: '',
                    Genres_All: '',
                    Popularity: '',
                    Album_Name: '',
                    Preview_URL: '',
                    Match_Confidence: 0
                };
                enrichedTracks.push(enrichedTrack);
                failed++;
            }
        }

        // Save progress - update the original dataset with enriched data
        const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Create a map for quick lookup of enriched tracks
        const enrichedMap = new Map();
        enrichedTracks.forEach(track => {
            // Use title + artist as unique key
            const key = `${track.Title}|${track.Artist}`;
            enrichedMap.set(key, track);
        });

        // Update the full dataset
        const updatedData = jsonData.map(originalTrack => {
            const key = `${originalTrack.Title}|${originalTrack.Artist}`;

            // If this track was enriched in this batch, use the enriched version
            if (enrichedMap.has(key)) {
                return enrichedMap.get(key);
            }

            // Otherwise, keep the original (which might already have Spotify data)
            // But ensure it has all the expected columns
            return {
                ...originalTrack,
                Spotify_ID: originalTrack.Spotify_ID || '',
                Genre_1: originalTrack.Genre_1 || '',
                Genre_2: originalTrack.Genre_2 || '',
                Genre_3: originalTrack.Genre_3 || '',
                Genres_All: originalTrack.Genres_All || '',
                Popularity: originalTrack.Popularity || '',
                Album_Name: originalTrack.Album_Name || '',
                Preview_URL: originalTrack.Preview_URL || '',
                Match_Confidence: originalTrack.Match_Confidence || ''
            };
        });

        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Enriched Database");
        XLSX.writeFile(newWorkbook, CONFIG.OUTPUT_FILE);

        console.log(`💾 Updated enriched database file: ${CONFIG.OUTPUT_FILE}`);

        console.log(`\n✅ Batch ${batch + 1} completed!`);
        console.log(`   📊 Successful matches: ${successful}`);
        console.log(`   ❌ Failed matches: ${failed}`);
        console.log(`   📈 Success rate: ${((successful / batchData.length) * 100).toFixed(1)}%`);

        const remainingToProcess = tracksToProcess.length - endIndex;
        const nextBatch = remainingToProcess > 0 ? batch + 1 : null;

        return {
            success: true,
            batch: batch + 1,
            totalBatches,
            tracksProcessed: endIndex,
            totalTracksToProcess: tracksToProcess.length,
            totalTracks: jsonData.length,
            batchStats: {
                successful,
                failed,
                successRate: ((successful / batchData.length) * 100).toFixed(1)
            },
            nextBatch,
            completed: nextBatch === null
        };

    } catch (error) {
        console.error("Enrichment error:", error);
        throw error;
    }
}

/* ----------------- CLI Interface ----------------- */
async function main() {
    console.log("🎵 Smart Database Enrichment Tool");
    console.log("=================================");
    console.log("📋 This version merges original + enriched data automatically");
    console.log("");

    if (!CONFIG.SPOTIFY_CLIENT_ID || !CONFIG.SPOTIFY_CLIENT_SECRET) {
        console.error("❌ Spotify credentials not found!");
        console.log("Please check your .env file in the pages directory.");
        console.log("It should contain:");
        console.log("  SPOTIFY_CLIENT_ID=your_actual_client_id");
        console.log("  SPOTIFY_CLIENT_SECRET=your_actual_client_secret");
        console.log("Or:");
        console.log("  NEXTAUTH_SPOTIFY_CLIENT_ID=your_actual_client_id");
        console.log("  NEXTAUTH_SPOTIFY_CLIENT_SECRET=your_actual_client_secret");
        console.log("");
        console.log("Current path being checked:", path.join(__dirname, '..', '.env'));
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const options = {};

    if (args.includes('--help')) {
        console.log("Usage: node enrich-database-smart.js [options]");
        console.log("");
        console.log("Options:");
        console.log("  --batch <number>       Start from specific batch (default: 0)");
        console.log("  --batch-size <number>  Tracks per batch (default: 50)");
        console.log("  --force                Process all tracks, even if already enriched");
        console.log("  --help                 Show this help");
        console.log("");
        console.log("Smart Features:");
        console.log("  ✅ Automatically merges original + enriched files");
        console.log("  ✅ Preserves all existing enriched data");
        console.log("  ✅ Only processes tracks without Spotify data");
        console.log("  ✅ Detects new tracks automatically");
        console.log("");
        console.log("Files:");
        console.log("  Input:  ./public/data/input/sortyourmusic.xlsx");
        console.log("  Output: ./public/data/output/enriched_database.xlsx");
        process.exit(0);
    }

    if (args.includes('--batch')) {
        const batchIndex = args.indexOf('--batch') + 1;
        options.batch = parseInt(args[batchIndex]) || 0;
    }

    if (args.includes('--batch-size')) {
        const sizeIndex = args.indexOf('--batch-size') + 1;
        options.batchSize = parseInt(args[sizeIndex]) || CONFIG.BATCH_SIZE;
    }

    // Default is to skip existing, unless --force is specified
    options.skipExisting = !args.includes('--force');

    try {
        console.log(`📁 Looking for input file: ${CONFIG.INPUT_FILE}`);
        console.log(`📁 Output will be saved to: ${CONFIG.OUTPUT_FILE}`);
        console.log(`🔄 Mode: ${options.skipExisting ? 'Smart merge mode (recommended)' : 'Force all tracks'}`);
        console.log("");

        let currentBatch = options.batch || 0;
        let result;

        do {
            result = await enrichDatabase({
                batch: currentBatch,
                batchSize: options.batchSize,
                skipExisting: options.skipExisting
            });

            if (result.completed) {
                console.log("\n🎉 All batches completed successfully!");
                console.log(`📁 Final output saved to: ${CONFIG.OUTPUT_FILE}`);

                if (result.alreadyEnriched) {
                    console.log(`✅ All ${result.totalTracks} tracks already had Spotify data!`);
                } else {
                    console.log(`📊 Processed ${result.totalTracksToProcess} out of ${result.totalTracks} tracks`);
                }
                break;
            }

            currentBatch++;

            console.log("\n⏳ Waiting 2 seconds before next batch...");
            await new Promise(resolve => setTimeout(resolve, 2000));

        } while (!result.completed);

    } catch (error) {
        console.error("💥 Fatal error:", error.message);

        if (error.message.includes('Excel file not found') || error.message.includes('No input file found')) {
            console.log("\n💡 File Requirements:");
            console.log("   At least one of these files must exist:");
            console.log("   📄 ./public/data/input/sortyourmusic.xlsx (original)");
            console.log("   📄 ./public/data/output/enriched_database.xlsx (enriched)");
            console.log("");
            console.log("   For best results, keep your latest tracks in sortyourmusic.xlsx");
            console.log("   The script will automatically merge with enriched data!");
        }

        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}