// pages/api/create_playlist_database.js - DATABASE-FIRST WITH YEAR FILTERING + CULTURAL CONTEXT + EXCLUSIONS + SIMPLE POPULARITY SORTING
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { loadEnrichedDatabase, searchTracksByFeatures, searchTracksByGenres, getDatabaseStats } from '../../lib/enrichedDatabase';

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

/**
 * Genre exclusion filtering functie
 */
function filterExcludedGenres(tracks, excludedGenres) {
    if (!excludedGenres || excludedGenres.length === 0) {
        return tracks;
    }

    console.log(`🚫 Applying genre exclusions: ${excludedGenres.join(', ')}`);

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
        const trackGenres = (track.genres_all || track.genres || '').toLowerCase();

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

    console.log(`✅ Exclusion filtering: ${tracks.length} → ${filteredTracks.length} tracks (removed ${tracks.length - filteredTracks.length})`);
    return filteredTracks;
}

// ENHANCED CULTURAL + DATABASE-FIRST TRACK SEARCH WITH YEAR FILTERING + EXCLUSIONS + SIMPLE POPULARITY SORTING
async function searchTracksFromSortYourMusicDatabase(audioFeatures, secondaryGenres, operationalGoal, culturalGenres = [], culturalContext = null, yearPreferences = null, excludedGenres = [], limit = 50) {
    console.log("Cultural Database Search with Year Filtering + Exclusions + Simple Popularity Sorting:", {
        targetFeatures: audioFeatures,
        secondaryGenres,
        culturalGenres,
        culturalContext,
        yearPreferences,
        excludedGenres,
        operationalGoal,
        note: "Popularity used for final sorting only (always high to low)"
    });

    const meta = {
        approach: "cultural_database_first_with_year_filtering_exclusions_and_simple_popularity_sorting",
        target_features: audioFeatures,
        secondary_genres: secondaryGenres,
        cultural_genres: culturalGenres,
        cultural_context: culturalContext,
        year_preferences: yearPreferences,
        excluded_genres: excludedGenres,
        operational_goal: operationalGoal,
        steps: [],
        filtering_results: {},
        database_stats: null
    };

    try {
        // Load database
        console.log("Loading database with cultural context...");
        const database = await loadEnrichedDatabase();
        const dbStats = getDatabaseStats(database);
        meta.database_stats = dbStats;

        console.log(`Database loaded: ${dbStats.total_tracks} tracks, ${dbStats.with_spotify_data} enriched (${dbStats.coverage_percentage}%)`);

        // STEP 1: Apply year filtering if preferences exist
        let filteredDatabase = database;
        if (yearPreferences && yearPreferences.min_year) {
            console.log(`Applying year filtering: minimum year ${yearPreferences.min_year}`);

            const originalCount = database.length;
            filteredDatabase = database.filter(track => {
                const trackYear = extractYearFromTrack(track);
                return trackYear >= yearPreferences.min_year;
            });

            console.log(`Year filtering: ${originalCount} -> ${filteredDatabase.length} tracks`);

            meta.filtering_results.year_filtering = {
                original_count: originalCount,
                after_filtering: filteredDatabase.length,
                removed: originalCount - filteredDatabase.length
            };

            // Fallback if year filtering removes too many tracks
            if (filteredDatabase.length < 100) {
                console.warn('Year filtering removed too many tracks, relaxing minimum year');
                const relaxedMinYear = yearPreferences.min_year - 10;
                filteredDatabase = database.filter(track => {
                    const trackYear = extractYearFromTrack(track);
                    return trackYear >= relaxedMinYear;
                });
                console.log(`Relaxed year filtering (${relaxedMinYear}+): ${filteredDatabase.length} tracks`);
                meta.filtering_results.year_filtering.relaxed_min_year = relaxedMinYear;
                meta.filtering_results.year_filtering.after_relaxed = filteredDatabase.length;
            }
        }

        // Create musicProfile object for scoring (only audio + year)
        const musicProfile = {
            features: audioFeatures,
            year_preferences: yearPreferences
        };

        // STRATEGY 1: Cultural genres first (highest priority)
        if (culturalGenres && culturalGenres.length > 0) {
            console.log("Strategy 1: Cultural genres priority search");

            let tracks = searchTracksByFeatures(filteredDatabase, audioFeatures, {
                tolerance: 0.3,
                limit: Math.min(limit * 3, 300),
                requireSpotifyData: false,
                operationalGoal,
                genrePreFilter: culturalGenres,
                excludedGenres: excludedGenres
            });

            // Apply scoring (audio + year only)
            tracks = tracks.map(track => ({
                ...track,
                match_score: calculateIndividualTrackScore(track, musicProfile),
                year: extractYearFromTrack(track),
                year_boost: yearPreferences ? calculateYearBoost(extractYearFromTrack(track), yearPreferences) : 1.0
            }));

            // Apply final sort with popularity as tie-breaker (always high to low)
            tracks = applyPopularitySorting(tracks);

            // Apply exclusion filtering after scoring
            tracks = filterExcludedGenres(tracks, excludedGenres);

            meta.filtering_results.cultural_genre_search = tracks.length;
            meta.steps.push({
                step: "cultural_genres_priority_with_year_exclusions_and_simple_popularity_sorting",
                tracks_found: tracks.length,
                genres_used: culturalGenres,
                excluded_applied: excludedGenres.length > 0,
                popularity_sorting: "high_to_low"
            });

            if (tracks.length >= 15) {
                console.log(`Cultural success: ${tracks.length} tracks found (sorted by popularity)`);
                const finalTracks = tracks.slice(0, Math.min(MAX_TRACKS, tracks.length));
                const spotifyFormatTracks = finalTracks.map(formatTrackForSpotify);

                meta.final_stats = calculateFinalStats(finalTracks);
                meta.success_strategy = "cultural_genres_primary_with_year_exclusions_and_simple_popularity_sorting";
                logYearDistribution(finalTracks);
                logPopularityDistribution(finalTracks);
                return { tracks: spotifyFormatTracks, meta };
            }
        }

        // STRATEGY 2: Secondary genres with cultural boost and year scoring + exclusions + simple popularity sorting
        if (secondaryGenres && secondaryGenres.length > 0) {
            console.log("Strategy 2: Secondary genres + cultural boost + year scoring + exclusions + simple popularity sorting");

            let tracks = searchTracksByFeatures(filteredDatabase, audioFeatures, {
                tolerance: 0.25,
                limit: Math.min(limit * 3, 300),
                requireSpotifyData: false,
                operationalGoal,
                genrePreFilter: secondaryGenres,
                excludedGenres: excludedGenres
            });

            // Apply scoring (audio + year only)
            tracks = tracks.map(track => ({
                ...track,
                match_score: calculateIndividualTrackScore(track, musicProfile),
                year: extractYearFromTrack(track),
                year_boost: yearPreferences ? calculateYearBoost(extractYearFromTrack(track), yearPreferences) : 1.0
            }));

            // Apply cultural boosting to tracks if we have cultural context
            if (culturalContext && culturalContext.detected_culture) {
                tracks = tracks.map(track => {
                    let culturalBoost = 0;

                    // Check if track has cultural relevance
                    const trackGenres = (track.genres_all || '').toLowerCase();
                    const trackArtist = (track.artist || '').toLowerCase();

                    // Cultural relevance patterns
                    const culturalPatterns = {
                        french: ['french', 'chanson', 'cafe', 'jazz manouche', 'francais'],
                        spanish: ['spanish', 'latin', 'flamenco', 'espanol', 'latino'],
                        italian: ['italian', 'italiano', 'mediterranean'],
                        british: ['british', 'uk', 'english', 'indie'],
                        greek: ['greek', 'mediterranean']
                    };

                    const patterns = culturalPatterns[culturalContext.detected_culture] || [];
                    const hasCulturalMatch = patterns.some(pattern =>
                        trackGenres.includes(pattern) || trackArtist.includes(pattern)
                    );

                    if (hasCulturalMatch) {
                        culturalBoost = 0.15 * (culturalContext.cultural_score || 0.5);
                        track.cultural_match = true;
                    }

                    track.match_score = (track.match_score || 0) + culturalBoost;
                    return track;
                });
            }

            // Apply final sort with popularity as tie-breaker (always high to low)
            tracks = applyPopularitySorting(tracks);

            // Apply exclusion filtering after all scoring
            tracks = filterExcludedGenres(tracks, excludedGenres);

            meta.filtering_results.secondary_genres_cultural_year_popularity = tracks.length;
            meta.steps.push({
                step: "secondary_genres_cultural_year_boost_with_exclusions_and_simple_popularity_sorting",
                tracks_found: tracks.length,
                excluded_applied: excludedGenres.length > 0,
                popularity_sorting: "high_to_low"
            });

            if (tracks.length >= 10) {
                const finalTracks = tracks.slice(0, Math.min(MAX_TRACKS, tracks.length));
                const spotifyFormatTracks = finalTracks.map(formatTrackForSpotify);

                meta.final_stats = calculateFinalStats(finalTracks);
                meta.success_strategy = "secondary_genres_cultural_year_with_exclusions_and_simple_popularity_sorting";
                logYearDistribution(finalTracks);
                logPopularityDistribution(finalTracks);
                return { tracks: spotifyFormatTracks, meta };
            }
        }

        // STRATEGY 3: Pure feature matching with year scoring + exclusions + simple popularity sorting (fallback)
        console.log("Strategy 3: Pure feature matching with year scoring + exclusions + simple popularity sorting fallback...");

        let tracks = searchTracksByFeatures(filteredDatabase, audioFeatures, {
            tolerance: 0.3,
            limit: Math.min(limit * 2, 200),
            requireSpotifyData: false,
            operationalGoal,
            excludedGenres: excludedGenres
        });

        // Apply scoring (audio + year only)
        tracks = tracks.map(track => ({
            ...track,
            match_score: calculateIndividualTrackScore(track, musicProfile),
            year: extractYearFromTrack(track),
            year_boost: yearPreferences ? calculateYearBoost(extractYearFromTrack(track), yearPreferences) : 1.0
        }));

        // Apply final sort with popularity as tie-breaker (always high to low)
        tracks = applyPopularitySorting(tracks);

        // Apply exclusions even in fallback
        tracks = filterExcludedGenres(tracks, excludedGenres);

        meta.filtering_results.pure_features_year_popularity = tracks.length;
        meta.steps.push({
            step: "pure_feature_year_fallback_with_exclusions_and_simple_popularity_sorting",
            tracks_found: tracks.length,
            excluded_applied: excludedGenres.length > 0,
            popularity_sorting: "high_to_low"
        });

        const finalTracks = tracks.slice(0, Math.min(MAX_TRACKS, tracks.length));
        const spotifyFormatTracks = finalTracks.map(formatTrackForSpotify);

        meta.final_stats = calculateFinalStats(finalTracks);
        meta.success_strategy = "feature_year_fallback_with_exclusions_and_simple_popularity_sorting";
        logYearDistribution(finalTracks);
        logPopularityDistribution(finalTracks);
        return { tracks: spotifyFormatTracks, meta };

    } catch (error) {
        console.error("Cultural search with year filtering, exclusions, and simple popularity sorting failed:", error);
        meta.error = error.message;
        return { tracks: [], meta };
    }
}

// UPDATED: Always sort by popularity (high to low) as final tie-breaker + Top 50 boost + Redistribute hits
function applyPopularitySorting(tracks) {
    const sortedTracks = tracks.map(track => {
        // Apply Top 50 boost before sorting
        if (track.source === 'Top 50 - Nederland' || track.is_current_hit) {
            track.popularity = (track.popularity || 0) + 50;
            console.log(`🎵 Top 50 boost applied: ${track.title} by ${track.artist} (${track.popularity - 50} → ${track.popularity})`);
        }
        return track;
    }).sort((a, b) => {
        // First sort by match score if there's a significant difference
        const scoreA = a.match_score || 0;
        const scoreB = b.match_score || 0;

        if (Math.abs(scoreA - scoreB) > 0.05) { // 5% difference threshold
            return scoreB - scoreA; // Higher match score wins
        }

        // For similar match scores, ALWAYS prefer higher popularity
        const popA = a.popularity || 0; // Default to 0 for unknown popularity
        const popB = b.popularity || 0;

        return popB - popA; // Higher popularity first (always)
    });

    // NEW: Apply stratified distribution after sorting
    return redistributeHits(sortedTracks);
}

// Updated log popularity distribution to account for Top 50 boosts
function logPopularityDistribution(tracks) {
    const popularityBuckets = {
        'Top 50 Boosted (100+)': 0, // New category for boosted hits
        'Very High (80-99)': 0,
        'High (60-79)': 0,
        'Medium (40-59)': 0,
        'Low (20-39)': 0,
        'Very Low (0-19)': 0,
        'Unknown': 0
    };

    let top50Count = 0;

    tracks.forEach(track => {
        const pop = track.popularity;
        
        // Count Top 50 tracks separately
        if (track.source === 'Top 50 - Nederland' || track.is_current_hit) {
            top50Count++;
        }

        if (pop === undefined || pop === null) {
            popularityBuckets['Unknown']++;
        } else if (pop >= 100) {
            popularityBuckets['Top 50 Boosted (100+)']++;
        } else if (pop >= 80) {
            popularityBuckets['Very High (80-99)']++;
        } else if (pop >= 60) {
            popularityBuckets['High (60-79)']++;
        } else if (pop >= 40) {
            popularityBuckets['Medium (40-59)']++;
        } else if (pop >= 20) {
            popularityBuckets['Low (20-39)']++;
        } else {
            popularityBuckets['Very Low (0-19)']++;
        }
    });

    console.log('Final playlist popularity distribution:');
    Object.entries(popularityBuckets).forEach(([bucket, count]) => {
        if (count > 0) {
            const pct = ((count / tracks.length) * 100).toFixed(1);
            console.log(`  ${bucket}: ${count} tracks (${pct}%)`);
        }
    });

    const avgPopularity = tracks.filter(t => t.popularity !== undefined)
        .reduce((sum, t) => sum + t.popularity, 0) / tracks.filter(t => t.popularity !== undefined).length;

    console.log(`Average popularity: ${avgPopularity?.toFixed(1) || 'N/A'}`);
    
    if (top50Count > 0) {
        console.log(`🎵 Current hits in playlist: ${top50Count} tracks (${((top50Count / tracks.length) * 100).toFixed(1)}%)`);
    }
    if (top50Count > 0) {
        console.log(`🎵 Current hits in playlist: ${top50Count} tracks (${((top50Count / tracks.length) * 100).toFixed(1)}%)`);
        console.log(`🔄 Hits distributed using stratified placement algorithm`);
    }
}

// Extract year from track
function extractYearFromTrack(track) {
    const releaseValue = track.release || track.Release || track.release_date || track.year;

    if (!releaseValue || releaseValue === '' || isNaN(releaseValue)) {
        return 2015; // Default
    }

    // Check if it's already a direct year (1900-2024)
    if (releaseValue >= 1900 && releaseValue <= 2024) {
        return releaseValue;
    }

    // Excel date format
    if (releaseValue > 15000 && releaseValue < 50000) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + (releaseValue * 24 * 60 * 60 * 1000));
        return date.getFullYear();
    }

    // Fallback for other reasonable year values
    if (releaseValue >= 1950 && releaseValue <= 2030) {
        return releaseValue;
    }

    return 2015;
}

// SIMPLIFIED calculateIndividualTrackScore - only audio + year
function calculateIndividualTrackScore(track, musicProfile) {
    const features = musicProfile.features || musicProfile;
    let score = 0;
    let weightSum = 0;

    // Simplified weight distribution - only audio and year
    const hasYearPrefs = musicProfile.year_preferences && musicProfile.year_preferences.recency_weight !== 0;

    let audioWeight = hasYearPrefs ? 0.6 : 1.0;  // 60% audio when year matters, 100% otherwise
    let yearWeight = hasYearPrefs ? 0.4 : 0;     // 40% year when it matters, 0% otherwise

    // Audio features scoring
    // Tempo matching (30% of audio weight)
    if (track.tempo && features.tempo) {
        const tempoMatch = 1 - Math.abs(track.tempo - features.tempo) / 100;
        const weight = 0.3 * audioWeight;
        score += Math.max(0, tempoMatch) * weight;
        weightSum += weight;
    }

    // Energy matching (25% of audio weight)  
    if (track.energy !== undefined && features.energy !== undefined) {
        const energyMatch = 1 - Math.abs(track.energy - features.energy);
        const weight = 0.25 * audioWeight;
        score += Math.max(0, energyMatch) * weight;
        weightSum += weight;
    }

    // Other features (45% of audio weight total, divided equally)
    const otherFeatures = ['acousticness', 'danceability', 'valence', 'instrumentalness'];
    const featureWeight = (0.45 * audioWeight) / otherFeatures.length;

    otherFeatures.forEach(feature => {
        if (track[feature] !== undefined && features[feature] !== undefined) {
            const match = 1 - Math.abs(track[feature] - features[feature]);
            score += Math.max(0, match) * featureWeight;
            weightSum += featureWeight;
        }
    });

    // Year-based scoring (only if year preferences exist)
    if (hasYearPrefs) {
        const trackYear = extractYearFromTrack(track);
        const yearScore = calculateYearBoost(trackYear, musicProfile.year_preferences);
        score += yearScore * yearWeight;
        weightSum += yearWeight;
    }

    // Normalize score
    return weightSum > 0 ? score / weightSum : 0;
}

// FIXED calculateYearBoost with proper negative recency_weight handling
function calculateYearBoost(trackYear, yearPreferences) {
    if (!yearPreferences || yearPreferences.recency_weight === 0) {
        return 1.0;
    }

    const [preferredStart, preferredEnd] = yearPreferences.preferred_years;

    // Strong modern/youthful preference (positive recency_weight)
    if (yearPreferences.recency_weight >= 0.4) {
        if (trackYear >= 2020) {
            return 1.0; // 2020+ gets full score
        } else if (trackYear >= 2015) {
            return 0.9; // 2015-2019 gets high score
        } else if (trackYear >= 2010) {
            return 0.7; // 2010-2014 gets good score
        } else if (trackYear >= 2005) {
            return 0.5; // 2005-2009 gets medium score
        } else {
            return 0.2; // Pre-2005 gets low score
        }
    }
    // Strong traditional/classic preference (negative recency_weight)
    else if (yearPreferences.recency_weight <= -0.3) {
        if (trackYear <= 1980) {
            return 1.0; // Pre-1980 gets full score
        } else if (trackYear <= 1995) {
            return 0.9; // 1980-1995 gets high score  
        } else if (trackYear <= 2005) {
            return 0.7; // 1995-2005 gets good score
        } else if (trackYear <= 2015) {
            return 0.4; // 2005-2015 gets medium score
        } else {
            return 0.1; // Post-2015 gets very low score
        }
    }
    // Moderate preferences (small positive or negative recency_weight)
    else {
        if (trackYear >= preferredEnd - 4) {
            return 1.0;
        } else if (trackYear >= preferredEnd - 9) {
            return 0.9;
        } else if (trackYear >= preferredStart) {
            return 0.7;
        } else if (trackYear >= yearPreferences.min_year) {
            return 0.4;
        } else {
            return 0.1;
        }
    }
}

// Log year distribution
function logYearDistribution(tracks) {
    const yearStats = {};
    const recentStats = { '2020+': 0, '2015+': 0, '2010+': 0, '2005+': 0 };

    tracks.forEach(track => {
        const decade = Math.floor(track.year / 10) * 10;
        yearStats[decade] = (yearStats[decade] || 0) + 1;

        // Recent year tracking
        if (track.year >= 2020) recentStats['2020+']++;
        if (track.year >= 2015) recentStats['2015+']++;
        if (track.year >= 2010) recentStats['2010+']++;
        if (track.year >= 2005) recentStats['2005+']++;
    });

    console.log('Final playlist year distribution:');
    Object.entries(yearStats)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([decade, count]) => {
            const pct = ((count / tracks.length) * 100).toFixed(1);
            console.log(`  ${decade}s: ${count} tracks (${pct}%)`);
        });

    console.log('Recent music breakdown:');
    Object.entries(recentStats).forEach(([period, count]) => {
        const pct = ((count / tracks.length) * 100).toFixed(1);
        console.log(`  ${period}: ${count} tracks (${pct}%)`);
    });
}

// Helper functions
function formatTrackForSpotify(track) {
    return {
        id: track.spotify_id || `db_${track.database_index}`,
        name: track.title,
        artist: track.artist,
        uri: track.spotify_id ? `spotify:track:${track.spotify_id}` : null,
        energy: track.energy,
        tempo: Math.round(track.tempo),
        acousticness: track.acousticness,
        danceability: track.danceability,
        valence: track.valence,
        instrumentalness: track.instrumentalness,
        speechiness: track.speechiness,
        loudness: track.loudness,
        popularity: track.popularity,
        match_score: track.match_score || 0,
        year: track.year,
        year_boost: track.year_boost || 1.0,
        has_spotify_data: track.has_spotify_data,
        source: track.source,
        cultural_match: track.cultural_match || false,
        database_info: {
            index: track.database_index,
            source_database: track.source_database,
            album_name: track.album_name,
            duplicate_check: track.duplicate_check
        }
    };
}

function calculateFinalStats(finalTracks) {
    const avgMatchScore = finalTracks.length > 0
        ? finalTracks.reduce((sum, track) => sum + (track.match_score || 0), 0) / finalTracks.length
        : 0;

    const culturalMatches = finalTracks.filter(t => t.cultural_match).length;
    const recent2020s = finalTracks.filter(t => t.year >= 2020).length;
    const recent2010s = finalTracks.filter(t => t.year >= 2010).length;

    // Popularity stats
    const withPopularity = finalTracks.filter(t => t.popularity !== undefined).length;
    const avgPopularity = withPopularity > 0
        ? finalTracks.filter(t => t.popularity !== undefined)
            .reduce((sum, t) => sum + t.popularity, 0) / withPopularity
        : null;

    return {
        total_selected: finalTracks.length,
        with_spotify_data: finalTracks.filter(t => t.has_spotify_data).length,
        cultural_matches: culturalMatches,
        recent_2020s: recent2020s,
        recent_2010s: recent2010s,
        tracks_with_popularity: withPopularity,
        average_popularity: avgPopularity ? Math.round(avgPopularity) : null,
        average_match_score: Math.round(avgMatchScore * 100),
        ladder: finalTracks.length >= 20 ? "cultural_success" : "cultural_limited"
    };
}

// NEW: Redistribute Top 50 hits evenly throughout playlist
function redistributeHits(tracks) {
    console.log(`🔄 Starting hit redistribution for ${tracks.length} tracks`);
    
    // Separate hits from non-hits
    const hits = tracks.filter(track => 
        track.source === 'Top 50 - Nederland' || track.is_current_hit
    );
    const nonHits = tracks.filter(track => 
        track.source !== 'Top 50 - Nederland' && !track.is_current_hit
    );
    
    console.log(`📊 Redistribution split: ${hits.length} hits, ${nonHits.length} non-hits`);
    
    if (hits.length === 0 || nonHits.length === 0) {
        console.log('⚠️ No redistribution needed - missing hits or non-hits');
        return tracks; // Return original if no redistribution needed
    }
    
    // Calculate interval for even distribution
    const totalTracks = tracks.length;
    const interval = Math.floor(totalTracks / hits.length);
    
    console.log(`📐 Distribution interval: every ${interval} tracks`);
    
    // Create new distributed array
    const redistributed = [];
    let hitIndex = 0;
    let nonHitIndex = 0;
    
    for (let position = 0; position < totalTracks; position++) {
        // Place hit at calculated positions (1, 6, 11, 16, etc.)
        const shouldPlaceHit = position % interval === 0 && hitIndex < hits.length;
        
        if (shouldPlaceHit) {
            redistributed.push(hits[hitIndex]);
            console.log(`🎵 Placed hit at position ${position + 1}: ${hits[hitIndex].title} by ${hits[hitIndex].artist}`);
            hitIndex++;
        } else if (nonHitIndex < nonHits.length) {
            redistributed.push(nonHits[nonHitIndex]);
            nonHitIndex++;
        }
    }
    
    // Add any remaining tracks
    while (hitIndex < hits.length) {
        redistributed.push(hits[hitIndex]);
        console.log(`🎵 Added remaining hit: ${hits[hitIndex].title}`);
        hitIndex++;
    }
    while (nonHitIndex < nonHits.length) {
        redistributed.push(nonHits[nonHitIndex]);
        nonHitIndex++;
    }
    
    console.log(`✅ Hit redistribution complete: ${redistributed.length} total tracks`);
    return redistributed;
}

/* -------------------- HANDLER -------------------- */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session) return res.status(401).json({ error: "Not authenticated" });

        const {
            audio_features,
            genres = [],
            cultural_genres = [],
            cultural_context = null,
            year_preferences = null,
            excluded_genres = [],
            operational_goal = 'balanced_operation',
            playlistName = "Scientific Brand-Fit Playlist (Database)",
            playlistDescription = "Generated using database-first scientific approach",
        } = req.body || {};

        // Validate audio features
        if (!audio_features || typeof audio_features !== 'object') {
            return res.status(400).json({
                error: "Missing audio_features - this endpoint requires target audio features",
                note: "Please provide audio_features object with tempo, energy, acousticness, etc."
            });
        }

        console.log("DATABASE-FIRST API Call with Cultural Context + Year Filtering + Exclusions + Simple Popularity Sorting:", {
            target_features: audio_features,
            secondary_genres: genres,
            cultural_genres,
            cultural_context,
            year_preferences,
            excluded_genres,
            operational_goal,
            note: "Popularity always sorts high to low as final step"
        });

        // Search tracks using CULTURAL DATABASE-FIRST approach
        const { tracks, meta } = await searchTracksFromSortYourMusicDatabase(
            audio_features,
            genres,
            operational_goal,
            cultural_genres,
            cultural_context,
            year_preferences,
            excluded_genres,
            50
        );

        // Get user profile for playlist creation
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

        // Create playlist naming
        const spotifyTracks = tracks.filter(t => t.uri);
        const culturalPrefix = cultural_context && cultural_context.detected_culture
            ? `${cultural_context.detected_culture.charAt(0).toUpperCase() + cultural_context.detected_culture.slice(1)} `
            : '';

        const yearSuffix = year_preferences && year_preferences.description
            ? ` (${year_preferences.min_year}+)`
            : '';

        const exclusionSuffix = excluded_genres.length > 0
            ? ` (-${excluded_genres.length} genres)`
            : '';

        const finalPlaylistName = spotifyTracks.length
            ? `${culturalPrefix}${playlistName}${yearSuffix}${exclusionSuffix}`
            : `${culturalPrefix}${playlistName} (Research Only)${yearSuffix}${exclusionSuffix}`;

        const culturalDescription = cultural_context
            ? `Cultural: ${cultural_context.detected_culture} (${cultural_context.cultural_confidence}) | `
            : '';

        const yearDescription = year_preferences
            ? `Year Filter: ${year_preferences.min_year}+ | `
            : '';

        const exclusionDescription = excluded_genres.length > 0
            ? `Excluded: ${excluded_genres.join(', ')} | `
            : '';

        const createPlaylistResp = await fetch(
            `https://api.spotify.com/v1/users/${userId}/playlists`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: finalPlaylistName,
                    description: `${playlistDescription} | ${culturalDescription}${yearDescription}${exclusionDescription}Database: ${meta.database_stats?.total_tracks} tracks | Features: ${audio_features.tempo}BPM, Energy:${(audio_features.energy * 10).toFixed(1)}/10 | Sorted by popularity (high to low)`,
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

        // Add tracks to Spotify playlist
        if (spotifyTracks.length && playlistId) {
            const uris = spotifyTracks.map(t => t.uri);
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
                console.warn("Playlist created but failed to add tracks");
            }
        }

        // Calculate final statistics
        const avgMatchScore = tracks.length > 0
            ? tracks.reduce((sum, track) => sum + (track.match_score || 0), 0) / tracks.length
            : 0;

        const culturalMatches = tracks.filter(t => t.cultural_match).length;
        const recent2020s = tracks.filter(t => t.year >= 2020).length;
        const recent2010s = tracks.filter(t => t.year >= 2010).length;
        const avgPopularity = tracks.filter(t => t.popularity !== undefined).length > 0
            ? tracks.filter(t => t.popularity !== undefined)
                .reduce((sum, t) => sum + t.popularity, 0) / tracks.filter(t => t.popularity !== undefined).length
            : null;

        return res.status(200).json({
            success: true,
            approach: "cultural_database_first_with_year_filtering_exclusions_and_simple_popularity_sorting",
            playlist: {
                id: playlistId,
                name: playlistJson?.name || finalPlaylistName,
                url: playlistUrl,
                tracks_added: spotifyTracks.length,
                total_tracks_found: tracks.length,
            },
            tracks,
            meta: {
                ...meta,
                match_quality: Math.round(avgMatchScore * 100),
                cultural_matches: culturalMatches,
                recent_tracks_2020s: recent2020s,
                recent_tracks_2010s: recent2010s,
                average_popularity: avgPopularity ? Math.round(avgPopularity) : null,
                features_used: audio_features,
                year_preferences_used: year_preferences,
                excluded_genres_used: excluded_genres,
                note: [
                    cultural_context ? `${cultural_context.detected_culture} cultural context` : null,
                    year_preferences ? `${year_preferences.description}` : null,
                    excluded_genres.length > 0 ? `${excluded_genres.length} genres excluded` : null,
                    "popularity sorted high to low",
                    "database-first approach"
                ].filter(Boolean).join(" + ")
            },
            database_info: {
                total_tracks_in_db: meta.database_stats?.total_tracks || 0,
                tracks_with_spotify: meta.database_stats?.with_spotify_data || 0,
                coverage: meta.database_stats?.coverage_percentage || 0,
                spotify_tracks_in_playlist: spotifyTracks.length,
                research_tracks_found: tracks.length - spotifyTracks.length,
                cultural_tracks_found: culturalMatches,
                recent_2020s_found: recent2020s,
                recent_2010s_found: recent2010s,
                average_popularity_found: avgPopularity ? Math.round(avgPopularity) : null,
                year_filtering_applied: year_preferences ? true : false,
                exclusions_applied: excluded_genres.length > 0,
                excluded_genres_count: excluded_genres.length,
                popularity_sorting_applied: true
            },
            note: tracks.length
                ? `Found ${tracks.length} tracks (${culturalMatches} cultural matches, ${recent2020s} from 2020s, avg popularity: ${avgPopularity ? Math.round(avgPopularity) : 'N/A'}, ${Math.round(avgMatchScore * 100)}% feature match). Strategy: ${meta.success_strategy}. ${spotifyTracks.length} added to Spotify playlist. ${excluded_genres.length > 0 ? `Excluded ${excluded_genres.length} genre types. ` : ''}Sorted by popularity (high to low).`
                : "No tracks matched the specified criteria - try relaxing cultural, year, or audio feature requirements",
        });
    } catch (err) {
        console.error("Unhandled cultural database playlist error:", err);
        return res.status(500).json({
            error: "Failed to create cultural database playlist with year filtering, exclusions, and simple popularity sorting",
            details: err?.message || String(err),
        });
    }
}