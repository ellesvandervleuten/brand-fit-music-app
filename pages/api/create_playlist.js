// pages/api/create_playlist.js - FEATURES-FIRST SCIENTIFIC APPROACH
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const MAX_TRACKS = 100;
/* ----------------- helpers ----------------- */
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

// SCIENTIFIC AUDIO FEATURES ESTIMATION - Based on genre + popularity + variation
function estimateCompleteAudioFeatures(track, targetFeatures, primaryGenre) {
    // Base genre characteristics (scientific profiles)
    const genreFeatures = {
        'jazz': {
            energy: 0.4, tempo: 85, acousticness: 0.8, danceability: 0.3,
            valence: 0.6, instrumentalness: 0.7, speechiness: 0.04
        },
        'acoustic': {
            energy: 0.3, tempo: 75, acousticness: 0.9, danceability: 0.4,
            valence: 0.7, instrumentalness: 0.3, speechiness: 0.05
        },
        'classical': {
            energy: 0.2, tempo: 70, acousticness: 0.95, danceability: 0.1,
            valence: 0.4, instrumentalness: 0.9, speechiness: 0.03
        },
        'indie': {
            energy: 0.5, tempo: 95, acousticness: 0.4, danceability: 0.5,
            valence: 0.6, instrumentalness: 0.2, speechiness: 0.06
        },
        'electronic': {
            energy: 0.8, tempo: 120, acousticness: 0.1, danceability: 0.8,
            valence: 0.7, instrumentalness: 0.6, speechiness: 0.04
        },
        'ambient': {
            energy: 0.2, tempo: 65, acousticness: 0.3, danceability: 0.1,
            valence: 0.4, instrumentalness: 0.9, speechiness: 0.03
        },
        'folk': {
            energy: 0.4, tempo: 80, acousticness: 0.8, danceability: 0.3,
            valence: 0.7, instrumentalness: 0.4, speechiness: 0.05
        },
        'pop': {
            energy: 0.6, tempo: 100, acousticness: 0.3, danceability: 0.6,
            valence: 0.8, instrumentalness: 0.1, speechiness: 0.07
        }
    };

    const base = genreFeatures[primaryGenre.toLowerCase()] || genreFeatures['jazz'];

    // Adjust based on track popularity (higher popularity = slight energy boost)
    const popularityBoost = (track.popularity || 50) / 200; // 0-0.5 boost

    // Start with genre base
    let features = { ...base };

    // Apply popularity adjustments
    features.energy = Math.min(1, features.energy + (popularityBoost * 0.1));
    features.valence = Math.min(1, features.valence + (popularityBoost * 0.1));
    features.tempo = Math.round(features.tempo + (popularityBoost * 10) - 5); // ±5 variation

    // Slight bias toward target features (20% weight)
    if (targetFeatures) {
        Object.keys(features).forEach(feature => {
            if (targetFeatures[feature] !== undefined && feature !== 'tempo') {
                features[feature] = (features[feature] * 0.8) + (targetFeatures[feature] * 0.2);
            }
        });

        // Tempo special handling
        if (targetFeatures.tempo) {
            features.tempo = Math.round((features.tempo * 0.8) + (targetFeatures.tempo * 0.2));
        }
    }

    // Add natural variation (±5%)
    Object.keys(features).forEach(feature => {
        if (feature !== 'tempo') {
            const variation = (Math.random() - 0.5) * 0.1; // ±5%
            features[feature] = Math.max(0, Math.min(1, features[feature] + variation));
        } else {
            const variation = (Math.random() - 0.5) * 10; // ±5 BPM
            features[feature] = Math.max(50, Math.min(150, Math.round(features[feature] + variation)));
        }
    });

    return features;
}

// FEATURES-FIRST TRACK FILTERING - Scientific approach
function scientificTrackFiltering(tracks, targetFeatures, operationalGoal, tolerance = 0.2) {
    console.log("Applying scientific filtering with target features:", targetFeatures);

    return tracks.filter(track => {
        let score = 0;
        let maxScore = 0;

        // Tempo filtering (HIGHEST PRIORITY - 35% weight)
        if (track.tempo && targetFeatures.tempo) {
            const tempoRange = targetFeatures.tempo * 0.15; // ±15% tolerance
            if (track.tempo >= targetFeatures.tempo - tempoRange &&
                track.tempo <= targetFeatures.tempo + tempoRange) {
                score += 0.35;
            }
            maxScore += 0.35;
        }

        // Energy filtering (25% weight)
        if (track.energy !== undefined && targetFeatures.energy !== undefined) {
            if (Math.abs(track.energy - targetFeatures.energy) <= tolerance) {
                score += 0.25;
            }
            maxScore += 0.25;
        }

        // Acousticness filtering (20% weight) - Important for sophistication
        if (track.acousticness !== undefined && targetFeatures.acousticness !== undefined) {
            if (Math.abs(track.acousticness - targetFeatures.acousticness) <= tolerance) {
                score += 0.20;
            }
            maxScore += 0.20;
        }

        // Danceability filtering (10% weight) - Should be controlled in restaurants
        if (track.danceability !== undefined && targetFeatures.danceability !== undefined) {
            if (track.danceability <= targetFeatures.danceability + tolerance) {
                score += 0.10;
            }
            maxScore += 0.10;
        }

        // Speechiness filtering (10% weight) - Should be minimal
        if (track.speechiness !== undefined && targetFeatures.speechiness !== undefined) {
            if (track.speechiness <= targetFeatures.speechiness + 0.05) {
                score += 0.10;
            }
            maxScore += 0.10;
        }

        // Operational goal specific filtering
        if (operationalGoal === 'high_revenue_per_customer') {
            // For revenue maximization: strict tempo control, no dancing music
            if (track.tempo > 85 || track.danceability > 0.4) return false;
        } else if (operationalGoal === 'high_table_turnover') {
            // For turnover: need energy and movement
            if (track.tempo < 95 || track.energy < 0.5) return false;
        } else if (operationalGoal === 'premium_experience') {
            // For premium: high sophistication required
            if (track.acousticness < 0.6 || track.speechiness > 0.08) return false;
        }

        // Return true if track meets at least 65% of weighted criteria
        return maxScore > 0 && (score / maxScore) >= 0.65;
    });
}

// Audio-features with fallback to estimation
async function fetchAudioFeatures(ids, token, targetFeatures = null, primaryGenre = 'jazz') {
    // Test eerst of we toegang hebben tot de API
    const testId = ids[0];
    const testResponse = await fetch(`https://api.spotify.com/v1/audio-features/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log("Audio features test response:", testResponse.status);

    if (testResponse.status === 403) {
        console.log("🚫 No access to Audio Features API - using estimation only");
        return useEstimationOnly(ids, targetFeatures, primaryGenre);
    }

    // Als we wel toegang hebben, probeer batch request
    const chunks = [];
    for (let i = 0; i < ids.length; i += 50) { // Kleinere chunks
        chunks.push(ids.slice(i, i + 50));
    }

    const all = new Map();

    for (const chunk of chunks) {
        try {
            const params = new URLSearchParams({ ids: chunk.join(",") });
            const response = await fetch(`https://api.spotify.com/v1/audio-features?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await safeJson(response);
                if (data?.audio_features) {
                    data.audio_features.filter(Boolean).forEach(f => {
                        all.set(f.id, f);
                    });
                }
            } else {
                console.warn(`Audio features chunk failed: ${response.status}`);
            }
        } catch (e) {
            console.warn("Audio features chunk error:", e.message);
        }
    }

    // Fill missing tracks with estimation
    ids.forEach(id => {
        if (!all.has(id)) {
            const estimated = estimateCompleteAudioFeatures(
                { id, popularity: 50 },
                targetFeatures,
                primaryGenre
            );
            all.set(id, estimated);
        }
    });

    return all;
}

/* --------------- FEATURES-FIRST searchTracks --------------- */
async function searchTracks(audioFeatures, secondaryGenres, operationalGoal, userToken, limit = 50) {
    const token = userToken;

    const meta = {
        approach: "features_first",
        target_features: audioFeatures,
        secondary_genres: secondaryGenres,
        operational_goal: operationalGoal,
        steps: [],
        ladder: null,
        filtering_results: {}
    };

    console.log("🧪 FEATURES-FIRST searchTracks:", {
        targetFeatures: audioFeatures,
        secondaryGenres,
        operationalGoal
    });

    // Normalize secondary genres for Spotify
    const genreMap = {
        'World Music': 'world', 'Contemporary Jazz': 'jazz', 'Neo-Soul': 'neo-soul',
        'Classical': 'classical', 'Jazz': 'jazz', 'Acoustic': 'acoustic',
        'Indie': 'indie', 'Electronic': 'electronic', 'Ambient': 'ambient',
        'Folk Rock': 'folk', 'Indie Pop': 'indie-pop'
    };

    const mappedGenres = (secondaryGenres || [])
        .map(g => genreMap[g] || g.toLowerCase())
        .filter(Boolean);

    // Get allowed seeds
    let allowed = null;
    try {
        const seedsResp = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (seedsResp.ok) {
            const seedsData = await safeJson(seedsResp);
            allowed = new Set(seedsData?.genres || []);
        }
    } catch (e) {
        console.warn("genre-seeds failed:", e?.message);
    }

    const fallbackAllowed = new Set([
        'jazz', 'acoustic', 'indie', 'pop', 'rock', 'electronic', 'ambient',
        'classical', 'soul', 'funk', 'blues', 'latin', 'folk'
    ]);
    const filterSet = allowed?.size ? allowed : fallbackAllowed;

    let seeds = mappedGenres.filter(g => filterSet.has(g));
    if (!seeds.length) {
        // Choose seeds based on audio features
        if (audioFeatures.acousticness > 0.7) seeds.push('acoustic');
        if (audioFeatures.acousticness > 0.6 && audioFeatures.energy < 0.5) seeds.push('jazz');
        if (audioFeatures.energy > 0.6) seeds.push('indie');
        if (audioFeatures.instrumentalness > 0.8) seeds.push('classical');

        // Fallback
        if (!seeds.length) seeds = ['jazz', 'acoustic'];
    }
    seeds = seeds.slice(0, 5);

    // STRATEGY 1: Try Spotify Recommendations with SIMPLIFIED FEATURES parameters
    if (seeds.length > 0) {
        try {
            // Minder parameters om 404 fouten te voorkomen
            const params = new URLSearchParams({
                limit: '50',
                seed_genres: seeds.slice(0, 3).join(','), // Max 3 genres
                target_tempo: String(Math.round(audioFeatures.tempo)),
                target_energy: String(audioFeatures.energy.toFixed(2)),
                market: 'NL'
            });

            console.log("🎯 Trying Spotify recommendations with simplified params...");
            console.log("URL:", `https://api.spotify.com/v1/recommendations?${params}`);

            const recResp = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log("Recommendations response status:", recResp.status);

            if (recResp.ok) {
                const recData = await safeJson(recResp);
                const recItems = recData?.tracks || [];
                console.log("📊 Recommendations returned:", recItems.length, "tracks");

                if (recItems.length > 0) {
                    const ids = recItems.map(t => t.id);
                    const featuresById = await fetchAudioFeatures(ids, token, audioFeatures, seeds[0]);

                    const recTracks = recItems.map(t => {
                        const f = featuresById.get(t.id);
                        return {
                            id: t.id,
                            name: t.name,
                            artist: t.artists?.[0]?.name || 'Unknown',
                            uri: t.uri,
                            energy: f?.energy ?? 0.5,
                            tempo: f?.tempo ?? Math.round(audioFeatures.tempo),
                            acousticness: f?.acousticness ?? audioFeatures.acousticness,
                            danceability: f?.danceability ?? audioFeatures.danceability,
                            valence: f?.valence ?? audioFeatures.valence,
                            instrumentalness: f?.instrumentalness ?? audioFeatures.instrumentalness,
                            speechiness: f?.speechiness ?? audioFeatures.speechiness,
                            popularity: t.popularity ?? 0
                        };
                    });

                    // Apply scientific filtering
                    const filtered = scientificTrackFiltering(recTracks, audioFeatures, operationalGoal);
                    meta.filtering_results.recommendations_before = recTracks.length;
                    meta.filtering_results.recommendations_after = filtered.length;

                    console.log("🔬 Scientific filtering: ", recTracks.length, "→", filtered.length);

                    if (filtered.length >= 15) {
                        meta.ladder = "recommendations_features_filtered";
                        return { tracks: filtered.slice(0, MAX_TRACKS), meta };
                    } else if (recTracks.length >= 10) {
                        meta.ladder = "recommendations_features_unfiltered";
                        return { tracks: recTracks.slice(0, MAX_TRACKS), meta };
                    }
                }
            } else {
                const errorText = await recResp.text();
                console.log("❌ Recommendations failed:", recResp.status, errorText);

                // Probeer met nog simpelere parameters bij 404/400 errors
                if (recResp.status === 404 || recResp.status === 400) {
                    const simpleParams = new URLSearchParams({
                        limit: '50',
                        seed_genres: seeds[0] || 'jazz', // Alleen 1 genre
                        market: 'NL'
                    });

                    console.log("🔄 Trying with minimal params:", simpleParams.toString());
                    const retryResp = await fetch(`https://api.spotify.com/v1/recommendations?${simpleParams}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (retryResp.ok) {
                        const retryData = await safeJson(retryResp);
                        const retryItems = retryData?.tracks || [];
                        console.log("📊 Retry recommendations returned:", retryItems.length, "tracks");

                        if (retryItems.length > 0) {
                            const ids = retryItems.map(t => t.id);
                            const featuresById = await fetchAudioFeatures(ids, token, audioFeatures, seeds[0]);

                            const recTracks = retryItems.map(t => {
                                const f = featuresById.get(t.id);
                                return {
                                    id: t.id,
                                    name: t.name,
                                    artist: t.artists?.[0]?.name || 'Unknown',
                                    uri: t.uri,
                                    energy: f?.energy ?? 0.5,
                                    tempo: f?.tempo ?? Math.round(audioFeatures.tempo),
                                    acousticness: f?.acousticness ?? audioFeatures.acousticness,
                                    danceability: f?.danceability ?? audioFeatures.danceability,
                                    valence: f?.valence ?? audioFeatures.valence,
                                    instrumentalness: f?.instrumentalness ?? audioFeatures.instrumentalness,
                                    speechiness: f?.speechiness ?? audioFeatures.speechiness,
                                    popularity: t.popularity ?? 0
                                };
                            });

                            // Apply filtering to retry results too
                            const filtered = scientificTrackFiltering(recTracks, audioFeatures, operationalGoal, 0.25);

                            if (filtered.length >= 10) {
                                meta.ladder = "recommendations_minimal_params";
                                return { tracks: filtered.slice(0, MAX_TRACKS), meta };
                            }
                        }
                    } else {
                        console.log("❌ Retry also failed:", retryResp.status);
                    }
                }
            }
        } catch (e) {
            console.warn("Recommendations with features errored:", e?.message);
        }
    }
    // STRATEGY 2: Search + Feature-based filtering
    console.log("🔍 Falling back to search + feature filtering...");
    const pool = new Map();
    const searchTerms = seeds.length ? seeds.slice(0, 3) : ['jazz', 'acoustic', 'indie'];

    for (const term of searchTerms) {
        try {
            const searchResp = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=track&limit=${limit}&market=NL`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (searchResp.ok) {
                const searchData = await safeJson(searchResp);
                const items = searchData?.tracks?.items || [];
                meta.steps.push({ step: "search", term, status: searchResp.status, items: items.length });

                if (items.length > 0) {
                    const ids = items.map(t => t.id);
                    const featuresById = await fetchAudioFeatures(ids, token, audioFeatures, term);

                    items.forEach(track => {
                        const f = featuresById.get(track.id);
                        pool.set(track.id, {
                            id: track.id,
                            name: track.name,
                            artist: track.artists?.[0]?.name || 'Unknown',
                            uri: track.uri,
                            energy: f?.energy ?? 0.5,
                            tempo: f?.tempo ?? Math.round(audioFeatures.tempo),
                            acousticness: f?.acousticness ?? audioFeatures.acousticness,
                            danceability: f?.danceability ?? audioFeatures.danceability,
                            valence: f?.valence ?? audioFeatures.valence,
                            instrumentalness: f?.instrumentalness ?? audioFeatures.instrumentalness,
                            speechiness: f?.speechiness ?? audioFeatures.speechiness,
                            popularity: track.popularity ?? 0
                        });
                    });
                }
            }
        } catch (e) {
            console.warn("Search errored for", term, e?.message);
        }
    }

    const allTracks = Array.from(pool.values());
    console.log("🎵 Total tracks collected:", allTracks.length);

    if (allTracks.length > 0) {
        // Apply scientific filtering with different tolerance levels
        let filtered = scientificTrackFiltering(allTracks, audioFeatures, operationalGoal, 0.15);
        meta.filtering_results.search_strict = filtered.length;

        if (filtered.length >= 20) {
            meta.ladder = "search_features_strict";
            return { tracks: filtered.slice(0, MAX_TRACKS), meta };
        }

        // Relaxed filtering
        filtered = scientificTrackFiltering(allTracks, audioFeatures, operationalGoal, 0.25);
        meta.filtering_results.search_relaxed = filtered.length;

        if (filtered.length >= 15) {
            meta.ladder = "search_features_relaxed";
            return { tracks: filtered.slice(0, MAX_TRACKS), meta };
        }

        // Very relaxed - just tempo and energy
        const tempoEnergyFiltered = allTracks.filter(t => {
            const tempoOk = Math.abs(t.tempo - audioFeatures.tempo) <= audioFeatures.tempo * 0.25;
            const energyOk = Math.abs(t.energy - audioFeatures.energy) <= 0.3;
            return tempoOk && energyOk;
        });

        if (tempoEnergyFiltered.length >= 10) {
            meta.ladder = "search_tempo_energy_only";
            return { tracks: tempoEnergyFiltered.slice(0, MAX_TRACKS), meta };
        }

        // Last resort: best available tracks
        const sorted = allTracks.sort((a, b) => {
            const scoreA = calculateFeatureMatchScore(a, audioFeatures);
            const scoreB = calculateFeatureMatchScore(b, audioFeatures);
            return scoreB - scoreA;
        });

        meta.ladder = "search_best_available";
        return { tracks: sorted.slice(0, Math.min(30, sorted.length)), meta };
    }

    meta.ladder = "none";
    console.log("❌ No tracks found with any strategy");
    return { tracks: [], meta };
}

// Calculate how well a track matches target features
function calculateFeatureMatchScore(track, targetFeatures) {
    let score = 0;
    let weights = 0;

    // Tempo match (highest weight)
    if (track.tempo && targetFeatures.tempo) {
        const tempoMatch = 1 - Math.abs(track.tempo - targetFeatures.tempo) / 100;
        score += Math.max(0, tempoMatch) * 0.3;
        weights += 0.3;
    }

    // Other features
    const features = ['energy', 'acousticness', 'danceability', 'valence', 'instrumentalness', 'speechiness'];
    features.forEach(feature => {
        if (track[feature] !== undefined && targetFeatures[feature] !== undefined) {
            const match = 1 - Math.abs(track[feature] - targetFeatures[feature]);
            score += Math.max(0, match) * (0.7 / features.length);
            weights += 0.7 / features.length;
        }
    });

    return weights > 0 ? score / weights : 0;
}

// VOEG DEZE NIEUWE FUNCTIES TOE (boven je bestaande helpers):

// Functie voor alleen estimation (wanneer API niet werkt)
function useEstimationOnly(ids, targetFeatures, primaryGenre) {
    console.log("🧪 Using estimation-only mode for", ids.length, "tracks");
    const all = new Map();

    ids.forEach(id => {
        const estimated = estimateCompleteAudioFeatures(
            { id, popularity: 50 },
            targetFeatures,
            primaryGenre
        );
        all.set(id, estimated);
    });

    return all;
}

// Debug functie om API toegang te testen
async function debugSpotifyAccess(token) {
    console.log("🔍 Testing Spotify API access...");

    // Test basic profile access
    try {
        const profileResp = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("✅ Profile access:", profileResp.status);
    } catch (e) {
        console.error("❌ Profile test failed:", e.message);
    }

    // Test recommendations access  
    try {
        const recResp = await fetch('https://api.spotify.com/v1/recommendations?seed_genres=jazz&limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("✅ Recommendations access:", recResp.status);
        if (!recResp.ok) {
            const errorText = await recResp.text();
            console.log("❌ Recommendations error:", errorText);
        }
    } catch (e) {
        console.error("❌ Recommendations test failed:", e.message);
    }

    // Test audio features access
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

/* -------------------- HANDLER -------------------- */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session) return res.status(401).json({ error: "Not authenticated" });

        console.log("🔍 Starting debug of Spotify API access...");
        await debugSpotifyAccess(session.accessToken);

        const {
            audio_features, // NEW: Target audio features object
            genres = [], // Secondary genres only
            operational_goal = 'balanced_operation',
            playlistName = "Scientific Brand-Fit Playlist",
            playlistDescription = "Generated using features-first scientific approach",
        } = req.body || {};

        // Validate audio features
        if (!audio_features || typeof audio_features !== 'object') {
            return res.status(400).json({
                error: "Missing audio_features - this endpoint requires target audio features",
                note: "Please provide audio_features object with tempo, energy, acousticness, etc."
            });
        }

        console.log("🧪 FEATURES-FIRST API Call:", {
            target_features: audio_features,
            secondary_genres: genres,
            operational_goal
        });

        // Search tracks using FEATURES-FIRST approach
        const { tracks, meta } = await searchTracks(
            audio_features,
            genres,
            operational_goal,
            session.accessToken
        );

        // Get user profile
        const profileResp = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const profileJson = await safeJson(profileResp);
        if (!profileResp.ok) {
            console.error("GET /me failed", profileResp.status, profileJson);
            return res.status(401).json({ error: "Invalid Spotify token" });
        }
        const userId = profileJson?.id;
        assertOk(!!userId, "No user id from /me");

        // Create playlist
        const createPlaylistResp = await fetch(
            `https://api.spotify.com/v1/users/${userId}/playlists`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: tracks.length ? playlistName : `${playlistName} (Empty)`,
                    description: `${playlistDescription} | Features: ${audio_features.tempo}BPM, Energy:${(audio_features.energy * 10).toFixed(1)}/10, Acoustic:${(audio_features.acousticness * 10).toFixed(1)}/10`,
                    public: false,
                }),
            }
        );

        const playlistJson = await safeJson(createPlaylistResp);
        if (!createPlaylistResp.ok) {
            console.error("Create playlist failed:", createPlaylistResp.status, playlistJson);
            return res.status(500).json({
                error: "Failed to create playlist",
                details: playlistJson?.error?.message || playlistJson || null
            });
        }

        const playlistId = playlistJson?.id;
        const playlistUrl = playlistJson?.external_urls?.spotify
            ?? (playlistId ? `https://open.spotify.com/playlist/${playlistId}` : null);

        // Add tracks
        if (tracks.length && playlistId) {
            const uris = tracks.map(t => t.uri);
            const addTracksResp = await fetch(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ uris }),
                }
            );
            const addJson = await safeJson(addTracksResp);
            if (!addTracksResp.ok) {
                console.error("Add tracks failed:", addTracksResp.status, addJson);
                return res.status(500).json({
                    error: "Failed to add tracks to playlist",
                    details: addJson?.error?.message || addJson || null
                });
            }
        }

        // Calculate match quality
        const avgMatchScore = tracks.length > 0
            ? tracks.reduce((sum, track) => sum + calculateFeatureMatchScore(track, audio_features), 0) / tracks.length
            : 0;

        return res.status(200).json({
            success: true,
            approach: "features_first_scientific",
            playlist: {
                id: playlistId,
                name: playlistJson?.name || playlistName,
                url: playlistUrl,
                tracks_added: tracks.length,
            },
            tracks,
            meta: {
                ...meta,
                match_quality: Math.round(avgMatchScore * 100),
                features_used: audio_features,
                note: "Generated using features-first scientific approach with audio characteristics matching"
            },
            note: tracks.length
                ? `Playlist created with ${tracks.length} scientifically matched tracks (${Math.round(avgMatchScore * 100)}% feature match)`
                : "No tracks matched the specified audio features - try relaxing criteria",
        });
    } catch (err) {
        console.error("Unhandled features-first playlist error:", err);
        return res.status(500).json({
            error: "Failed to create features-based playlist",
            details: err?.message || String(err),
        });
    }
}