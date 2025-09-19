// lib/enrichedDatabase.js - Voor sortyourmusic.xlsx database - FIXED
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Cache voor de database
let cachedDatabase = null;
let lastLoadTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuten

/**
 * CRITICAL FIX: Converteer Excel 1-100 schaal naar Spotify 0-1 schaal
 */
function convertExcelScaleToSpotify(track) {
    return {
        ...track,
        // Audio features - converteer 1-100 naar 0-1
        energy: (track.Energy || 0) / 100,
        danceability: (track.Dance || 0) / 100,
        acousticness: (track.Acoustic || 0) / 100,
        valence: (track.Valence || 0) / 100,
        // BPM blijft hetzelfde
        tempo: track.BPM || 120,
        // Loudness blijft hetzelfde (dB waarde)
        loudness: track.Loud || -10,
        // Popularity normaliseren
        popularity: track['Pop.'] || 50,

        // Spotify-specifieke features schatten of gebruiken
        instrumentalness: parseFloat(track.Instrumentalness) || estimateInstrumentalness(track),
        speechiness: parseFloat(track.Speechiness) || estimateSpeechiness(track),

        // Debug: bewaar originele Excel waarden
        _excel_original: {
            energy: track.Energy,
            dance: track.Dance,
            acoustic: track.Acoustic,
            valence: track.Valence,
            bpm: track.BPM
        }
    };
}

/**
 * Laadt de sortyourmusic database (verrijkt met Spotify data)
 */
async function loadEnrichedDatabase() {
    // Check cache
    if (cachedDatabase && lastLoadTime && (Date.now() - lastLoadTime) < CACHE_DURATION) {
        return cachedDatabase;
    }

    try {
        // Zoek eerst naar verrijkte output versie
        const enrichedPath = path.join(process.cwd(), 'public', 'data', 'output', 'enriched_database.xlsx');
        let dbPath = enrichedPath;
        let isEnriched = true;

        // Als verrijkte versie niet bestaat, gebruik input versie
        if (!fs.existsSync(enrichedPath)) {
            const inputPath = path.join(process.cwd(), 'public', 'data', 'input', 'sortyourmusic.xlsx');
            if (!fs.existsSync(inputPath)) {
                throw new Error('Database not found. Expected: public/data/input/sortyourmusic.xlsx or public/data/output/enriched_database.xlsx');
            }
            dbPath = inputPath;
            isEnriched = false;
            console.log('⚠️  Using non-enriched database. Run enrichment script for full features.');
        }

        console.log(`📊 Loading database from: ${path.relative(process.cwd(), dbPath)}`);

        const workbook = XLSX.readFile(dbPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // Normaliseer de data naar ons format + SCALE CONVERSION
        const processedData = rawData.map((track, index) => {
            const baseTrack = {
                // Basis track info
                title: (track.Title || '').toString().trim(),
                artist: (track.Artist || '').toString().trim(),
                release: track.Release || '',
                length: track.Length || '',
                source: track.Source || 'sortyourmusic database',

                // Excel data (1-100 schaal)
                BPM: parseFloat(track.BPM) || 0,
                Energy: parseFloat(track.Energy) || 0,
                Dance: parseFloat(track.Dance) || 0,
                Valence: parseFloat(track.Valence) || 0,
                Acoustic: parseFloat(track.Acoustic) || 0,
                Loud: parseFloat(track.Loud) || -10,
                'Pop.': parseFloat(track['Pop.']) || 50,

                // Spotify enrichment data
                spotify_id: track.Spotify_ID || '',
                album_name: track.Album_Name || '',
                preview_url: track.Preview_URL || '',
                match_confidence: parseFloat(track.Match_Confidence) || 0,

                // Genres (uit Spotify enrichment)
                genre_1: track.Genre_1 || '',
                genre_2: track.Genre_2 || '',
                genre_3: track.Genre_3 || '',
                genres_all: track.Genres_All || '',

                // Metadata
                has_spotify_data: !!(track.Spotify_ID && track.Spotify_ID.trim()),
                database_index: index + 1,
                source_database: isEnriched ? 'enriched_sortyourmusic' : 'original_sortyourmusic',
                duplicate_check: track['Duplicate Check'] || ''
            };

            // CRITICAL: Apply scale conversion
            return convertExcelScaleToSpotify(baseTrack);

        }).filter(track => track.title && track.artist); // Filter lege entries

        cachedDatabase = processedData;
        lastLoadTime = Date.now();

        const withSpotify = processedData.filter(t => t.has_spotify_data).length;

        console.log(`✅ Loaded ${processedData.length} tracks from sortyourmusic database`);
        console.log(`📊 Tracks with Spotify enrichment: ${withSpotify} (${Math.round(withSpotify / processedData.length * 100)}%)`);
        console.log(`🔄 Scale conversion applied: Excel 1-100 → Spotify 0-1`);
        console.log(`📈 Sample conversion: Energy ${processedData[0]?._excel_original?.energy} → ${(processedData[0]?.energy * 100).toFixed(1)}%`);

        return processedData;

    } catch (error) {
        console.error('❌ Error loading sortyourmusic database:', error);
        throw error;
    }
}

/**
 * UPDATED: Zoekt tracks in de database op basis van features + exclusions
 */
function searchTracksByFeatures(database, targetFeatures, options = {}) {
    const {
        tolerance = 0.2,
        limit = 100,
        requireSpotifyData = false,
        operationalGoal = 'balanced_operation',
        genrePreFilter = [], // Genre inclusie filter
        excludedGenres = [] // NIEUW: Genre exclusie filter
    } = options;

    console.log('🔍 Searching with HYBRID approach + exclusions:', {
        targetFeatures: {
            tempo: targetFeatures.tempo,
            energy: (targetFeatures.energy * 10).toFixed(1) + '/10',
            acousticness: (targetFeatures.acousticness * 10).toFixed(1) + '/10'
        },
        genrePreFilter,
        excludedGenres, // Log excluded genres
        operationalGoal
    });

    // STEP 1: Genre Pre-filtering (positieve filter)
    let candidates = database;

    if (genrePreFilter && genrePreFilter.length > 0) {
        console.log(`🎭 Applying genre pre-filter: ${genrePreFilter.join(', ')}`);

        candidates = database.filter(track => {
            return matchesAnyGenre(track, genrePreFilter);
        });

        console.log(`📊 Genre inclusion filter: ${database.length} → ${candidates.length} tracks`);
    }

    // STEP 2: NIEUW - Genre Exclusion filtering
    if (excludedGenres && excludedGenres.length > 0) {
        console.log(`🚫 Applying genre exclusions: ${excludedGenres.join(', ')}`);

        const beforeExclusion = candidates.length;
        candidates = filterExcludedGenres(candidates, excludedGenres);

        console.log(`📊 Genre exclusion filter: ${beforeExclusion} → ${candidates.length} tracks`);
    }

    // STEP 3: Basic filters
    candidates = candidates.filter(track => {
        if (requireSpotifyData && !track.has_spotify_data) return false;
        if (!track.title || !track.artist) return false;
        return true;
    });

    // STEP 4: SLIMME BPM FILTERING
    if (targetFeatures.tempo && targetFeatures.tempo > 0) {
        const smartTolerance = getSmartBPMTolerance(targetFeatures.tempo);
        const tempoMin = targetFeatures.tempo * (1 - smartTolerance);
        const tempoMax = targetFeatures.tempo * (1 + smartTolerance);

        console.log(`🎼 Smart BPM filter: ${targetFeatures.tempo} BPM ± ${Math.round(smartTolerance * 100)}% = ${Math.round(tempoMin)}-${Math.round(tempoMax)} BPM`);

        const beforeTempo = candidates.length;
        candidates = candidates.filter(track =>
            track.tempo >= tempoMin && track.tempo <= tempoMax
        );

        console.log(`📊 Tempo filter: ${beforeTempo} → ${candidates.length} tracks`);
    }

    // STEP 5: Feature scoring met GEBALANCEERDE gewichten
    const scored = candidates.map(track => {
        const score = calculateHospitalityMatchScore(track, targetFeatures);
        return { ...track, match_score: score };
    });

    // STEP 6: Filter op minimum match score
    const filtered = scored.filter(track => track.match_score >= 0.50);

    // STEP 7: Operational goal filtering
    const goalFiltered = filtered.filter(track => {
        if (operationalGoal === 'high_revenue_per_customer') {
            return track.tempo <= 90 && track.danceability <= 0.4 && track.energy <= 0.6;
        } else if (operationalGoal === 'high_table_turnover') {
            return track.tempo >= 95 && track.tempo <= 120 && track.energy >= 0.5;
        } else if (operationalGoal === 'premium_experience') {
            return track.acousticness >= 0.3 && track.speechiness <= 0.08;
        }
        return true; // balanced_operation: geen extra filters
    });

    // STEP 8: INTELLIGENTE SORTERING
    goalFiltered.sort((a, b) => {
        const scoreDiff = b.match_score - a.match_score;
        if (Math.abs(scoreDiff) > 0.05) return scoreDiff;

        if (a.has_spotify_data && !b.has_spotify_data) return -1;
        if (!a.has_spotify_data && b.has_spotify_data) return 1;

        if (operationalGoal === 'premium_experience') {
            return a.popularity - b.popularity;
        } else {
            return b.popularity - a.popularity;
        }
    });

    const result = goalFiltered.slice(0, limit);

    console.log(`📊 HYBRID search results: ${database.length} total → ${candidates.length} after filters → ${filtered.length} feature filtered → ${goalFiltered.length} goal filtered → ${result.length} final`);

    return result;
}

/**
 * NIEUW: Genre exclusion filtering functie
 */
function filterExcludedGenres(tracks, excludedGenres) {
    if (!excludedGenres || excludedGenres.length === 0) {
        return tracks;
    }

    // Genre mapping van frontend IDs naar database genres
    const genreMapping = {
        'heavy_metal': ['metal', 'heavy metal', 'death metal', 'black metal', 'metalcore'],
        'country': ['country', 'country rock', 'folk country', 'americana'],
        'rap_hip_hop': ['hip hop', 'rap', 'hip-hop', 'trap', 'gangsta rap'],
        'electronic_dance': ['electronic', 'edm', 'house', 'techno', 'dance', 'dubstep', 'trance'],
        'punk_rock': ['punk', 'punk rock', 'hard rock', 'grunge', 'hardcore'],
        'classical': ['classical', 'orchestra', 'symphony', 'baroque', 'romantic'],
        'reggae': ['reggae', 'ska', 'dub'],
        'folk': ['folk', 'folk rock', 'indie folk', 'traditional folk']
    };

    const filteredTracks = tracks.filter(track => {
        const trackGenres = (track.genres_all || '').toLowerCase();

        // Check of track een excluded genre bevat
        for (const excludedId of excludedGenres) {
            const genresToCheck = genreMapping[excludedId] || [excludedId.replace('_', ' ')];

            for (const genre of genresToCheck) {
                if (trackGenres.includes(genre.toLowerCase())) {
                    console.log(`🚫 Excluded: ${track.title} by ${track.artist} - contains ${genre}`);
                    return false; // Exclude this track
                }
            }
        }

        return true; // Keep this track
    });

    console.log(`✅ Exclusion filtering: ${tracks.length} → ${filteredTracks.length} tracks removed ${tracks.length - filteredTracks.length}`);
    return filteredTracks;
}

/**
 * Helper: Check of track matcht met een van de gewenste genres
 */
function matchesAnyGenre(track, targetGenres) {
    // Check Spotify genres
    const trackGenres = [
        track.genre_1,
        track.genre_2,
        track.genre_3,
        ...(track.genres_all ? track.genres_all.split(',').map(g => g.trim()) : [])
    ].filter(Boolean).map(g => g.toLowerCase());

    // Feature-based genre inferentie voor tracks zonder genre data
    const inferredGenres = [];
    if (track.acousticness > 0.7 && track.tempo < 100) {
        inferredGenres.push('acoustic', 'folk');
    }
    if (track.acousticness > 0.6 && track.instrumentalness > 0.5 && track.tempo < 90) {
        inferredGenres.push('jazz');
    }
    if (track.acousticness > 0.8 && track.instrumentalness > 0.7) {
        inferredGenres.push('classical');
    }
    if (track.energy > 0.7 && track.danceability > 0.6) {
        inferredGenres.push('pop', 'rock');
    }

    const allGenres = [...trackGenres, ...inferredGenres];
    const targetLower = targetGenres.map(g => g.toLowerCase());

    return targetLower.some(targetGenre =>
        allGenres.some(trackGenre =>
            trackGenre.includes(targetGenre) || targetGenre.includes(trackGenre)
        )
    );
}

/**
 * Genre-based search in sortyourmusic database
 */
function searchTracksByGenres(database, genres, options = {}) {
    const { limit = 50, requireSpotifyData = false, excludedGenres = [] } = options;

    let matches = database.filter(track => {
        if (requireSpotifyData && !track.has_spotify_data) {
            return false;
        }
        return matchesAnyGenre(track, genres);
    });

    // Apply exclusions
    if (excludedGenres.length > 0) {
        matches = filterExcludedGenres(matches, excludedGenres);
    }

    return matches.slice(0, limit);
}

// SLIMME BPM TOLERANTIE FUNCTIE
function getSmartBPMTolerance(targetBPM) {
    if (targetBPM < 70) {
        return 0.45; // Ultra-langzame muziek: extra tolerantie
    } else if (targetBPM < 85) {
        return 0.25; // Fine dining range: ruime tolerantie  
    } else if (targetBPM < 110) {
        return 0.20; // Sweet spot: normale tolerantie
    } else {
        return 0.15; // Snelle muziek: strengere tolerantie
    }
}

// GEOPTIMALISEERDE FEATURE MATCHING - Na Tempo Hard Filter
function calculateHospitalityMatchScore(track, targetFeatures) {
    let score = 0;
    let weights = 0;

    // Acousticness matching (35% - MEEST BELANGRIJK na tempo filter)
    if (track.acousticness !== undefined && targetFeatures.acousticness !== undefined) {
        const acousticMatch = 1 - Math.abs(track.acousticness - targetFeatures.acousticness);
        score += Math.max(0, acousticMatch) * 0.35;
        weights += 0.35;
    }

    // Valence matching (30% - ZEER BELANGRIJK voor mood & spending)
    if (track.valence !== undefined && targetFeatures.valence !== undefined) {
        const valenceMatch = 1 - Math.abs(track.valence - targetFeatures.valence);

        // BONUS voor hoge valence
        let valenceScore = valenceMatch;
        if (track.valence > 0.6) {
            valenceScore += 0.1; // +10% bonus voor positieve tracks
        }

        score += Math.max(0, Math.min(1, valenceScore)) * 0.30;
        weights += 0.30;
    }

    // Energy matching (20% - Belangrijk voor activiteitsniveau)
    if (track.energy !== undefined && targetFeatures.energy !== undefined) {
        const energyMatch = 1 - Math.abs(track.energy - targetFeatures.energy);
        score += Math.max(0, energyMatch) * 0.20;
        weights += 0.20;
    }

    // Danceability matching (10% - Controle factor)
    if (track.danceability !== undefined && targetFeatures.danceability !== undefined) {
        const danceMatch = 1 - Math.abs(track.danceability - targetFeatures.danceability);

        // PENALTY voor te hoge danceability in restaurants
        let danceScore = danceMatch;
        if (track.danceability > 0.7) {
            danceScore -= 0.2; // -20% penalty voor te dansbare tracks
        }

        score += Math.max(0, danceScore) * 0.10;
        weights += 0.10;
    }

    // Speechiness penalty (5% - Moet laag blijven)
    if (track.speechiness !== undefined) {
        const speechinessPenalty = track.speechiness > 0.08 ? track.speechiness : 0;
        score -= speechinessPenalty * 0.05;
        weights += 0.05;
    }

    return weights > 0 ? Math.max(0, score / weights) : 0;
}

// Feature match score calculation (legacy support)
function calculateFeatureMatchScore(track, targetFeatures) {
    return calculateHospitalityMatchScore(track, targetFeatures);
}

// Estimation functions voor ontbrekende features
function estimateInstrumentalness(track) {
    const genres = (track.genres_all || '').toLowerCase();

    if (genres.includes('classical') || genres.includes('instrumental')) {
        return 0.8;
    } else if (genres.includes('jazz') && track.acousticness > 0.6) {
        return 0.6;
    } else if (genres.includes('ambient')) {
        return 0.7;
    }

    // Schatting op basis van acousticness
    if (track.acousticness > 0.8) return 0.6;
    if (track.acousticness > 0.6) return 0.3;

    return 0.05; // Meeste muziek heeft vocals
}

function estimateSpeechiness(track) {
    const genres = (track.genres_all || '').toLowerCase();

    if (genres.includes('rap') || genres.includes('hip hop')) {
        return 0.15;
    } else if (genres.includes('spoken word')) {
        return 0.8;
    }

    return 0.04; // Lage speechiness voor meeste muziek
}

/**
 * Database statistieken
 */
function getDatabaseStats(database) {
    const withSpotify = database.filter(t => t.has_spotify_data);
    const genreCounts = {};

    // Tel genres uit Spotify enrichment
    database.forEach(track => {
        if (track.genre_1) genreCounts[track.genre_1] = (genreCounts[track.genre_1] || 0) + 1;
        if (track.genre_2) genreCounts[track.genre_2] = (genreCounts[track.genre_2] || 0) + 1;
        if (track.genre_3) genreCounts[track.genre_3] = (genreCounts[track.genre_3] || 0) + 1;
    });

    // Gemiddelde features (na scale conversion)
    const avgFeatures = database.length > 0 ? {
        tempo: database.reduce((sum, t) => sum + (t.tempo || 0), 0) / database.length,
        energy: database.reduce((sum, t) => sum + (t.energy || 0), 0) / database.length,
        danceability: database.reduce((sum, t) => sum + (t.danceability || 0), 0) / database.length,
        acousticness: database.reduce((sum, t) => sum + (t.acousticness || 0), 0) / database.length,
        valence: database.reduce((sum, t) => sum + (t.valence || 0), 0) / database.length,
        popularity: database.reduce((sum, t) => sum + (t.popularity || 0), 0) / database.length,
    } : null;

    // Tempo verdeling
    const tempoRanges = {
        'Very Slow (< 70 BPM)': database.filter(t => t.tempo < 70).length,
        'Slow (70-90 BPM)': database.filter(t => t.tempo >= 70 && t.tempo < 90).length,
        'Moderate (90-110 BPM)': database.filter(t => t.tempo >= 90 && t.tempo < 110).length,
        'Upbeat (110-130 BPM)': database.filter(t => t.tempo >= 110 && t.tempo < 130).length,
        'Fast (> 130 BPM)': database.filter(t => t.tempo >= 130).length,
    };

    return {
        total_tracks: database.length,
        with_spotify_data: withSpotify.length,
        coverage_percentage: Math.round((withSpotify.length / database.length) * 100),
        top_genres: Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([genre, count]) => ({ genre, count })),
        average_features: avgFeatures,
        tempo_distribution: tempoRanges,
        database_source: 'sortyourmusic (enriched with scale conversion)',
        spotify_enrichment: {
            enriched_tracks: withSpotify.length,
            enrichment_percentage: Math.round((withSpotify.length / database.length) * 100),
            genres_found: Object.keys(genreCounts).length
        }
    };
}

module.exports = {
    loadEnrichedDatabase,
    searchTracksByFeatures,
    searchTracksByGenres,
    getDatabaseStats,
    filterExcludedGenres // Export nieuwe functie
};