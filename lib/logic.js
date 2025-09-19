
// lib/logic.js - Met RADICALIZED Vibe Adjustments + Genre Hints

// ---------- Constants ----------
export const operationalGoals = {
    high_revenue_per_customer: {
        priority: 'maximize_spending',
        target_features: { tempo: 70, energy: 0.3, valence: 0.6, acousticness: 0.7, danceability: 0.2, instrumentalness: 0.7, speechiness: 0.05 },
        reasoning: 'Milliman (1982): Slow tempo increases dwell time by 38%, leading to higher per-customer spending',
    },
    high_table_turnover: {
        priority: 'maximize_throughput',
        target_features: { tempo: 115, energy: 0.7, valence: 0.8, acousticness: 0.4, danceability: 0.5, instrumentalness: 0.4, speechiness: 0.05 },
        reasoning: 'Fast tempo stimulates quick decision-making and movement, increasing table turnover',
    },
    balanced_operation: {
        priority: 'optimize_both',
        target_features: { tempo: 88, energy: 0.5, valence: 0.65, acousticness: 0.6, danceability: 0.3, instrumentalness: 0.5, speechiness: 0.05 },
        reasoning: 'Balanced tempo for moderate dwell time with reasonable turnover',
    },
    premium_experience: {
        priority: 'maximize_sophistication',
        target_features: { tempo: 65, energy: 0.25, valence: 0.5, acousticness: 0.85, danceability: 0.15, instrumentalness: 0.8, speechiness: 0.03 },
        reasoning: 'Very slow tempo for contemplative dining, high acousticness for sophistication',
    },
};

export const timeBasedAdjustments = {
    morning_energetic: { energy: +0.15, tempo: +8, valence: +0.1 },
    morning_rustig: { energy: -0.1, tempo: -5, acousticness: +0.1 },
    morning_productief: { instrumentalness: +0.15, speechiness: -0.02 },
    middag_social: { energy: +0.1, valence: +0.1, danceability: +0.1 },
    middag_professioneel: { instrumentalness: +0.1, speechiness: -0.02 },
    middag_ontspannen: { energy: -0.05, acousticness: +0.05 },
    avond_intiem: { energy: -0.15, tempo: -8, instrumentalness: +0.1 },
    avond_levendig: { energy: +0.1, valence: +0.1 },
    avond_sophisticated: { acousticness: +0.1, instrumentalness: +0.1 },
};

// RADICALIZED: Verhoogde vibe adjustments voor echte differentiatie
export const vibesAdjustments = {
    luxurious: { acousticness: +0.6, instrumentalness: +0.4, energy: -0.4, danceability: -0.3 },
    hip: { energy: +0.3, valence: +0.3, danceability: +0.4, acousticness: -0.2 },
    modern: { energy: +0.2, acousticness: -0.2, danceability: +0.2 },
    traditional: { acousticness: +0.4, instrumentalness: +0.3, tempo: -10 },
    rough: { energy: +0.4, acousticness: -0.4, danceability: +0.3, instrumentalness: -0.2 },
    happy: { valence: +0.6, energy: +0.3, tempo: +12 },
    serious: { energy: -0.3, instrumentalness: +0.3, valence: -0.2 },
    calm: { energy: -0.5, tempo: -15, acousticness: +0.3 },
    upbeat: { energy: +0.5, tempo: +20, valence: +0.3, danceability: +0.2 },
    romantic: { energy: -0.3, tempo: -10, instrumentalness: +0.2, valence: +0.1 },
    authentic: { acousticness: +0.3, instrumentalness: +0.2 },
    energetic: { energy: +0.6, tempo: +25, valence: +0.2, danceability: +0.2 },
    youthful: { energy: +0.3, valence: +0.3, tempo: +15, danceability: +0.2 },
};

// Cultural Context System met echte database genres
export const culturalPatterns = {
    french: {
        name_patterns: ['café', 'brasserie', 'bistro', 'le ', 'la ', 'chez', 'maison', 'auberge'],
        menu_indicators: ['croissant', 'baguette', 'coq au vin', 'bouillabaisse', 'ratatouille', 'crème brûlée', 'quiche', 'escargot', 'foie gras', 'fromage'],
        audio_adjustments: { acousticness: +0.2, instrumentalness: +0.15, tempo: -5, valence: +0.05 },
        cultural_genres: ['chanson', 'chanson québécoise', 'french house', 'french indie pop', 'french jazz'],
        boost_multiplier: 0.15
    },
    spanish: {
        name_patterns: ['valencia', 'casa', 'el ', 'la ', 'tapas', 'bodega', 'mesón', 'taberna'],
        menu_indicators: ['tapas', 'paella', 'jamón', 'gazpacho', 'tortilla', 'sangria', 'chorizo', 'patatas bravas', 'albondigas'],
        audio_adjustments: { acousticness: +0.12, valence: +0.1, instrumentalness: +0.1, tempo: -3 },
        cultural_genres: ['flamenco', 'flamenco pop', 'latin', 'latin alternative', 'latin afrobeats'],
        boost_multiplier: 0.12
    },
    italian: {
        name_patterns: ['trattoria', 'osteria', 'bella', 'romano', 'milano', 'casa', 'da ', 'il ', 'la '],
        menu_indicators: ['pasta', 'risotto', 'antipasti', 'bruschetta', 'osso buco', 'tiramisu', 'gelato', 'prosciutto', 'mozzarella', 'chianti'],
        audio_adjustments: { acousticness: +0.1, valence: +0.08, instrumentalness: +0.08, tempo: -2 },
        cultural_genres: ['italian singer-songwriter', 'folk', 'folk pop', 'acoustic pop'],
        boost_multiplier: 0.1
    },
    british: {
        name_patterns: ['the ', 'pub', 'arms', 'crown', 'red lion', 'george', 'royal', 'old'],
        menu_indicators: ['fish and chips', 'shepherd\'s pie', 'bangers', 'mash', 'sunday roast', 'ale', 'cider', 'scones'],
        audio_adjustments: { acousticness: +0.08, instrumentalness: +0.05, tempo: +2 },
        cultural_genres: ['british invasion', 'madchester', 'indie rock', 'britpop', 'new wave'],
        boost_multiplier: 0.08
    },
    greek: {
        name_patterns: ['taverna', 'opa', 'mykonos', 'santorini', 'zeus', 'apollo'],
        menu_indicators: ['gyros', 'souvlaki', 'moussaka', 'tzatziki', 'feta', 'ouzo', 'baklava'],
        audio_adjustments: { acousticness: +0.1, valence: +0.1, instrumentalness: +0.08 },
        cultural_genres: ['folk', 'world', 'mediterranean folk'],
        boost_multiplier: 0.09
    }
};

// Cultural Context Detection
export function detectCulturalContext({ restaurantName, menuAnalysis, vibes }) {
    const name = String(restaurantName || '').toLowerCase();
    const menuItems = (menuAnalysis?.menu_items || []).join(' ').toLowerCase();
    const selectedVibes = vibes || [];

    let detectedCulture = null;
    let culturalScore = 0;
    let matchReasons = [];

    // Check each cultural pattern
    for (const [culture, patterns] of Object.entries(culturalPatterns)) {
        let score = 0;
        let reasons = [];

        // Name pattern matching
        const nameMatches = patterns.name_patterns.filter(pattern => name.includes(pattern));
        if (nameMatches.length > 0) {
            score += 0.3 * nameMatches.length;
            reasons.push(`Name "${restaurantName}" contains ${culture} patterns: ${nameMatches.join(', ')}`);
        }

        // Menu item matching
        const menuMatches = patterns.menu_indicators.filter(indicator => menuItems.includes(indicator));
        if (menuMatches.length > 0) {
            score += 0.2 * menuMatches.length;
            reasons.push(`Menu contains ${culture} items: ${menuMatches.slice(0, 3).join(', ')}${menuMatches.length > 3 ? '...' : ''}`);
        }

        // Vibe multiplier - "european_sophisticated" boosts European cultures
        if (selectedVibes.includes('european_sophisticated')) {
            if (['french', 'spanish', 'italian', 'greek'].includes(culture)) {
                score *= 1.5;
                reasons.push(`"European Sophisticated" vibe boosts ${culture} cultural match`);
            }
        }

        if (score > culturalScore) {
            culturalScore = score;
            detectedCulture = culture;
            matchReasons = reasons;
        }
    }

    // Only return if we have a significant cultural match
    if (culturalScore >= 0.3) {
        const pattern = culturalPatterns[detectedCulture];
        return {
            culture: detectedCulture,
            score: Math.min(culturalScore, 1.0),
            audio_adjustments: pattern.audio_adjustments,
            cultural_genres: pattern.cultural_genres,
            boost_amount: pattern.boost_multiplier * Math.min(culturalScore, 1.0),
            match_reasons: matchReasons,
            confidence: culturalScore >= 0.6 ? 'high' : culturalScore >= 0.4 ? 'medium' : 'low'
        };
    }

    return null;
}

// UI vragen
import React from 'react';
import { Award, Utensils, Coffee, Wine, ShoppingBag, Zap, DollarSign, Timer, BarChart3, Star } from 'lucide-react';

export const brandQuestions = {
    1: {
        title: 'Wat is jouw type horecazaak?',
        type: 'single',
        options: [
            { id: 'fine_dining', label: 'Fine Dining Restaurant', icon: <Award className="mr-2" size={20} /> },
            { id: 'casual_dining', label: 'Casual Dining', icon: <Utensils className="mr-2" size={20} /> },
            { id: 'brunch_breakfast', label: 'Brunch/Breakfast Spot', icon: <Coffee className="mr-2" size={20} /> },
            { id: 'coffee_shop', label: 'Coffee Shop / Café', icon: <Coffee className="mr-2" size={20} /> },
            { id: 'bar_lounge', label: 'Bar / Lounge', icon: <Wine className="mr-2" size={20} /> },
            { id: 'retail_food', label: 'Retail met Food', icon: <ShoppingBag className="mr-2" size={20} /> },
            { id: 'quick_service', label: 'Quick Service', icon: <Zap className="mr-2" size={20} /> },
        ],
    },
    2: {
        title: 'Wat is je primaire bedrijfsdoel met muziek?',
        type: 'single',
        options: [
            { id: 'high_revenue_per_customer', label: 'Maximaliseer besteding per klant', subtitle: 'Langere verblijven, hogere uitgaven', icon: <DollarSign className="mr-2" size={20} /> },
            { id: 'high_table_turnover', label: 'Maximaliseer tafelomzet', subtitle: 'Snellere doorstroming, meer klanten', icon: <Timer className="mr-2" size={20} /> },
            { id: 'balanced_operation', label: 'Gebalanceerde operatie', subtitle: 'Beide optimaliseren', icon: <BarChart3 className="mr-2" size={20} /> },
            { id: 'premium_experience', label: 'Premium ervaring', subtitle: 'Sophistication boven alles', icon: <Star className="mr-2" size={20} /> },
        ],
    },
    3: {
        title: 'Welke vibe past het beste bij je zaak?',
        subtitle: 'Kies de atmosfeer die je wilt uitstralen',
        type: 'single',
        options: [
            { id: 'local_authentic', label: 'Lokaal & Authentiek', subtitle: 'Lokale tradities en gerechten' },
            { id: 'european_sophisticated', label: 'Europees & Sophisticated', subtitle: 'Verfijnde Europese stijl' },
            { id: 'international_modern', label: 'International & Modern', subtitle: 'Wereldse en hedendaagse aanpak' },
            { id: 'classic_timeless', label: 'Classic & Timeless', subtitle: 'Tijdloze elegantie' },
        ],
    },
    4: {
        title: 'Wat is je hoofddoelgroep? (kies wat het best past)',
        type: 'multiple',
        options: [
            { id: 'locals_regulars', label: 'Locals & Vaste Klanten' },
            { id: 'families_groups', label: 'Families & Vriendengroepen' },
            { id: 'business_professionals', label: 'Business & Professionals' },
            { id: 'young_adults', label: 'Jongeren 18-35' },
            { id: 'tourists_visitors', label: 'Toeristen & Bezoekers' },
            { id: 'seniors_mature', label: '50+ Generatie' },
            { id: 'food_enthusiasts', label: 'Food Lovers' },
            { id: 'quick_convenience', label: 'Quick & Convenient' },
        ],
    },
    5: {
        title: 'Welke atmosfeer past bij verschillende momenten?',
        subtitle: 'Kies per dagdeel de gewenste sfeer',
        type: 'time_based',
        timeSlots: {
            morning: {
                label: 'Ochtend (7:00-11:00)',
                options: [
                    { id: 'morning_energetic', label: 'Energiek', color: 'bg-orange-100 text-orange-800' },
                    { id: 'morning_rustig', label: 'Rustig', color: 'bg-blue-100 text-blue-800' },
                    { id: 'morning_productief', label: 'Productief', color: 'bg-green-100 text-green-800' },
                ],
            },
            middag: {
                label: 'Middag (11:00-17:00)',
                options: [
                    { id: 'middag_social', label: 'Social', color: 'bg-purple-100 text-purple-800' },
                    { id: 'middag_professioneel', label: 'Professioneel', color: 'bg-gray-100 text-gray-800' },
                    { id: 'middag_ontspannen', label: 'Ontspannen', color: 'bg-cyan-100 text-cyan-800' },
                ],
            },
            avond: {
                label: 'Avond (17:00-23:00)',
                options: [
                    { id: 'avond_intiem', label: 'Intiem', color: 'bg-pink-100 text-pink-800' },
                    { id: 'avond_levendig', label: 'Levendig', color: 'bg-yellow-100 text-yellow-800' },
                    { id: 'avond_sophisticated', label: 'Sophisticated', color: 'bg-indigo-100 text-indigo-800' },
                ],
            },
        },
    },
    6: {
        title: 'Snelle vibes check - Welke woorden beschrijven jouw zaak het beste?',
        subtitle: 'Kies 3-5 woorden',
        type: 'vibes',
        options: [
            { id: 'luxurious', label: 'Luxurious', color: 'bg-purple-100 text-purple-800' },
            { id: 'hip', label: 'Hip', color: 'bg-pink-100 text-pink-800' },
            { id: 'modern', label: 'Modern', color: 'bg-blue-100 text-blue-800' },
            { id: 'traditional', label: 'Traditional', color: 'bg-amber-100 text-amber-800' },
            { id: 'rough', label: 'Rough', color: 'bg-stone-100 text-stone-800' },
            { id: 'happy', label: 'Happy', color: 'bg-yellow-100 text-yellow-800' },
            { id: 'serious', label: 'Serious', color: 'bg-gray-100 text-gray-800' },
            { id: 'calm', label: 'Calm', color: 'bg-green-100 text-green-800' },
            { id: 'upbeat', label: 'Upbeat', color: 'bg-orange-100 text-orange-800' },
            { id: 'romantic', label: 'Romantic', color: 'bg-rose-100 text-rose-800' },
            { id: 'authentic', label: 'Authentic', color: 'bg-emerald-100 text-emerald-800' },
            { id: 'energetic', label: 'Energetic', color: 'bg-red-100 text-red-800' },
            { id: 'youthful', label: 'Youthful', color: 'bg-cyan-100 text-cyan-800' },
        ],
    },
    7: {
        title: 'Welke muziekstijlen wil je absoluut vermijden?',
        subtitle: 'Kies genres die niet passen',
        type: 'multiple',
        options: [
            { id: 'heavy_metal', label: 'Heavy Metal / Death Metal', color: 'bg-red-100 text-red-800' },
            { id: 'rap_hip_hop', label: 'Rap / Hip-Hop', color: 'bg-orange-100 text-orange-800' },
            { id: 'electronic_dance', label: 'Electronic / Dance', color: 'bg-yellow-100 text-yellow-800' },
            { id: 'country', label: 'Country', color: 'bg-amber-100 text-amber-800' },
            { id: 'classical', label: 'Klassiek / Opera', color: 'bg-purple-100 text-purple-800' },
            { id: 'punk_rock', label: 'Punk / Hard Rock', color: 'bg-gray-100 text-gray-800' },
            { id: 'reggae', label: 'Reggae / Ska', color: 'bg-green-100 text-green-800' },
            { id: 'folk', label: 'Folk / Traditional', color: 'bg-brown-100 text-brown-800' },
        ],
    },
};

// ---------- Data helpers ----------
export async function loadTop2000Database() {
    try {
        const resp = await fetch('/data/top2000-2024.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.error('Top2000 load failed', e);
        return [];
    }
}

export function getDutchRelevance(artist, title, top2000Database) {
    if (!top2000Database || top2000Database.length === 0) return 0;
    const normalize = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    const match = top2000Database.find(
        (e) => normalize(e.artist).includes(normalize(artist)) && normalize(e.title).includes(normalize(title))
    );
    if (!match) return 0;
    if (match.position <= 10) return 0.98;
    if (match.position <= 50) return 0.95;
    if (match.position <= 100) return 0.9;
    if (match.position <= 500) return 0.8;
    if (match.position <= 1000) return 0.65;
    if (match.position <= 1500) return 0.5;
    return 0.35;
}

// ---------- Genres ----------
// processExclusions with consistent naming
export function processExclusions(excludedGenres) {
    const map = {
        heavy_metal: ['metal', 'heavy-metal', 'death metal', 'black metal', 'thrash'],
        rap_hip_hop: ['rap', 'hip-hop', 'hip hop', 'trap', 'gangsta-rap'],
        electronic_dance: ['electronic', 'edm', 'house', 'techno', 'dance', 'dubstep'],
        country: ['country', 'bluegrass', 'honky-tonk', 'country rock'],
        classical: ['classical', 'opera', 'baroque', 'symphony'],
        punk_rock: ['punk', 'punk rock', 'hard rock', 'grunge'],
        reggae: ['reggae', 'ska', 'dub'],
        folk: ['folk', 'folk rock', 'indie folk', 'traditional folk'],
    };
    return (excludedGenres || []).flatMap((k) => map[k] || []);
}

// NEW: Vibe-specific genre hints voor extreme differentiation
function getVibeSpecificGenreHints(vibes, businessType) {
    const hints = [];

    if (!vibes || vibes.length === 0) return hints;

    // Extreme vibe combinations krijgen genre hints
    if (vibes.includes('rough')) {
        if (businessType === 'fine_dining') {
            hints.push('alternative', 'indie rock', 'post-rock', 'art rock');
        } else if (businessType === 'casual_dining') {
            hints.push('rock', 'alternative rock', 'garage rock', 'grunge');
        } else if (businessType === 'bar_lounge') {
            hints.push('industrial', 'dark ambient', 'post-punk');
        }
    }

    if (vibes.includes('luxurious')) {
        if (businessType === 'fine_dining') {
            hints.push('classical', 'chamber music', 'solo piano', 'ambient');
        } else if (businessType === 'casual_dining') {
            hints.push('smooth jazz', 'neo-soul', 'acoustic');
        } else if (businessType === 'bar_lounge') {
            hints.push('lounge', 'chillout', 'downtempo', 'nu jazz');
        }
    }

    if (vibes.includes('hip')) {
        if (businessType === 'fine_dining') {
            hints.push('nu jazz', 'trip hop', 'electronic', 'experimental');
        } else if (businessType === 'coffee_shop') {
            hints.push('indie pop', 'indie electronic', 'chillwave');
        } else if (businessType === 'bar_lounge') {
            hints.push('deep house', 'minimal techno', 'electro-jazz');
        }
    }

    if (vibes.includes('energetic')) {
        if (businessType === 'coffee_shop') {
            hints.push('indie pop', 'electro pop', 'dance-punk');
        } else if (businessType === 'bar_lounge') {
            hints.push('house', 'disco', 'funk');
        }
    }

    if (vibes.includes('youthful')) {
        hints.push('indie pop', 'electro pop', 'bedroom pop', 'indie dance');
    }

    console.log(`Genre hints for ${vibes.join(', ')} + ${businessType}:`, hints);
    return hints;
}

// UPDATED getGenresFromQuestionnaire with genre hints integration
// UPDATED getGenresFromQuestionnaire with genre hints integration + OPERATIONAL GOAL ADJUSTMENTS
export function getGenresFromQuestionnaire(brandData, culturalContext = null) {
    let genreWeights = {};
    const businessGenres = {
        fine_dining: { jazz: 0.4, classical: 0.3, acoustic: 0.2, ambient: 0.1 },
        casual_dining: { pop: 0.3, rock: 0.3, acoustic: 0.2, folk: 0.2 },
        brunch_breakfast: { acoustic: 0.4, folk: 0.3, indie: 0.2, jazz: 0.1 },
        coffee_shop: { acoustic: 0.4, folk: 0.3, indie: 0.2, jazz: 0.1 },
        bar_lounge: { electronic: 0.3, pop: 0.3, rock: 0.2, indie: 0.2 },
        retail_food: { pop: 0.4, indie: 0.3, electronic: 0.2, rock: 0.1 },
        quick_service: { pop: 0.4, electronic: 0.3, rock: 0.2, indie: 0.1 },
    };
    genreWeights = { ...(businessGenres[brandData.q2] || { pop: 0.4, rock: 0.3, acoustic: 0.3 }) };

    const vibesGenres = {
        energetic: { pop: +0.3, rock: +0.2, electronic: +0.2 },
        calm: { acoustic: +0.3, ambient: +0.2, jazz: +0.1 },
        happy: { pop: +0.3, folk: +0.2, reggae: +0.1 },
        traditional: { folk: +0.3, country: +0.2, classical: +0.1 },
        modern: { indie: +0.3, electronic: +0.2, pop: +0.1 },
        rough: { rock: +0.3, alternative: +0.2, grunge: +0.1 },
        romantic: { acoustic: +0.2, jazz: +0.2, soul: +0.1 },
        upbeat: { pop: +0.2, rock: +0.2, electronic: +0.1 },
        luxurious: { jazz: +0.2, classical: +0.1, ambient: +0.1 },
        hip: { indie: +0.2, electronic: +0.1, alternative: +0.1 },
        youthful: { pop: +0.2, indie: +0.1, electronic: +0.1 },
    };

    (brandData.q7 || []).forEach((vibe) => {
        const adj = vibesGenres[vibe];
        if (adj) Object.keys(adj).forEach((g) => (genreWeights[g] = (genreWeights[g] || 0) + adj[g]));
    });

    const timeAdj = {
        avond_levendig: { pop: +0.1, rock: +0.1 },
        avond_intiem: { jazz: +0.1, acoustic: +0.1 },
        morning_energetic: { pop: +0.1, electronic: +0.1 },
        middag_social: { pop: +0.05, indie: +0.05 },
    };
    Object.values(brandData.q5 || {}).forEach((choice) => {
        const adj = timeAdj[choice];
        if (adj) Object.keys(adj).forEach((g) => (genreWeights[g] = (genreWeights[g] || 0) + adj[g]));
    });

    // Cultural genres integration
    if (culturalContext && culturalContext.cultural_genres) {
        const culturalWeight = 0.4 * culturalContext.score;
        culturalContext.cultural_genres.forEach(genre => {
            genreWeights[genre] = (genreWeights[genre] || 0) + culturalWeight;
        });
    }

    // NEW: Add vibe-specific genre hints
    const genreHints = getVibeSpecificGenreHints(brandData.q7, brandData.q2);
    genreHints.forEach(hint => {
        genreWeights[hint] = (genreWeights[hint] || 0) + 0.3; // Significant boost for hints
    });

    // NEW: OPERATIONAL GOAL ADJUSTMENTS - Apply after all other genre calculations
    if (brandData.q3 === 'high_revenue_per_customer') {
        console.log('🎯 Applying high_revenue_per_customer genre adjustments...');
        
        // Boost achtergrond/instrumentale genres drastisch
        genreWeights['acoustic'] = (genreWeights['acoustic'] || 0) + 0.4;
        genreWeights['instrumental'] = (genreWeights['instrumental'] || 0) + 0.3;
        genreWeights['ambient'] = (genreWeights['ambient'] || 0) + 0.2;
        genreWeights['folk'] = (genreWeights['folk'] || 0) + 0.2;
        genreWeights['classical'] = (genreWeights['classical'] || 0) + 0.2;
        genreWeights['jazz'] = (genreWeights['jazz'] || 0) + 0.15;
        genreWeights['easy listening'] = (genreWeights['easy listening'] || 0) + 0.15;
        
        // Verlaag vocal-heavy/attention-grabbing genres STERKER
        genreWeights['pop'] = Math.max(0.02, (genreWeights['pop'] || 0) - 0.5); // Van -0.3 naar -0.5
        genreWeights['rock'] = Math.max(0.02, (genreWeights['rock'] || 0) - 0.5); // Van -0.3 naar -0.5
        genreWeights['alternative rock'] = Math.max(0.02, (genreWeights['alternative rock'] || 0) - 0.4);
        genreWeights['garage rock'] = Math.max(0.01, (genreWeights['garage rock'] || 0) - 0.4);
        
        console.log('✅ Boosted acoustic/instrumental genres, reduced pop/rock for background music');
    }

    // Apply exclusions using consistent mapping
    if (brandData.q8 && brandData.q8.length > 0) { // FIXED: q8 instead of q7
        console.log('Applying exclusions to secondary genres:', brandData.q8);

        const exclusionMapping = {
            'heavy_metal': ['metal', 'heavy metal', 'death metal', 'black metal'],
            'rap_hip_hop': ['hip hop', 'rap', 'trap'],
            'electronic_dance': ['electronic', 'edm', 'house', 'techno', 'dance'],
            'country': ['country', 'country rock', 'folk country'],
            'classical': ['classical', 'opera', 'baroque'],
            'punk_rock': ['punk', 'punk rock', 'hard rock', 'alternative rock'],
            'reggae': ['reggae', 'ska'],
            'folk': ['folk', 'folk rock', 'indie folk']
        };

        // Remove excluded genres from genreWeights
        brandData.q8.forEach(excludedId => {
            const genresToRemove = exclusionMapping[excludedId] || [excludedId.replace('_', ' ')];

            genresToRemove.forEach(genreToRemove => {
                Object.keys(genreWeights).forEach(weightedGenre => {
                    if (weightedGenre.toLowerCase().includes(genreToRemove.toLowerCase()) ||
                        genreToRemove.toLowerCase().includes(weightedGenre.toLowerCase())) {
                        console.log(`Removing ${weightedGenre} due to ${excludedId} exclusion`);
                        delete genreWeights[weightedGenre];
                    }
                });
            });
        });
    }

    // Normaliseer weights
    const total = Object.values(genreWeights).reduce((a, b) => a + b, 0) || 1;
    Object.keys(genreWeights).forEach((g) => (genreWeights[g] = genreWeights[g] / total));

    return Object.entries(genreWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8) // Increased from 5 to 8 for more variety with hints
        .map(([genre, weight]) => ({ genre, weight: Math.round(weight * 100) / 100 }));
}

// ---------- Feature profile ----------
function calculateDemographicYearPreferences(demographics) {
    if (!demographics || demographics.length === 0) {
        return { min_year: 1980, weight: 0 };
    }

    const demographicYears = {
        'young_adults': 2000,
        'business_professionals': 1990, 
        'families_groups': 1985,
        'locals_regulars': 1975,
        'seniors_mature': 1950,
        'tourists_visitors': 1985,
        'food_enthusiasts': 1975,
        'quick_convenience': 1995
    };

    // Gewogen gemiddelde berekening
    const validYears = demographics
        .map(demo => demographicYears[demo])
        .filter(year => year !== undefined);

    if (validYears.length === 0) {
        return { min_year: 1980, weight: 0 };
    }

    let avgYear = Math.round(
        validYears.reduce((sum, year) => sum + year, 0) / validYears.length
    );

    // NIEUWE MINIMUM CUTOFF LOGIC
    if (demographics.includes('seniors_mature')) {
        avgYear = Math.min(avgYear, 1960); // Nooit hoger dan 1960 voor 50+ generatie
    }
    
    // Extra conservatieve cutoff voor traditionele combinaties
    if (demographics.includes('seniors_mature') && demographics.includes('locals_regulars')) {
        avgYear = Math.min(avgYear, 1955); // Extra laag voor traditionele locals + seniors
    }

    return { 
        min_year: avgYear, 
        weight: validYears.length * 0.1
    };
}

// UPDATED calculateOptimalMusicProfile with RADICALIZED differentiation + Demographics + Conflict Detection
export function calculateOptimalMusicProfile({ brandData, websiteAnalysis, menuAnalysis }) {
    const {
        restaurantName,
        q2: businessType,           // Type zaak
        q3: operationalGoal,        // Bedrijfsdoel (40% basis!)
        q4: vibe,                   // Vibe/atmosfeer  
        q5: demographics,           // NIEUW: Demographics
        q6: timeBasedAtmosphere,    // Tijd-gebaseerde sfeer (was q5)
        q7: vibes,                  // Vibes woorden (was q6)
        q8: exclusions              // Exclusions (was q7)
    } = brandData || {};

    let reasoning = [];

    // NIEUW: Conflict detection en auto-fallback
    function detectConflicts(operationalGoal, vibes) {
        if (!vibes || vibes.length === 0) return false;
        
        const conflicts = {
            'high_table_turnover': ['calm', 'romantic', 'luxurious', 'serious'],
            'high_revenue_per_customer': ['energetic', 'upbeat', 'youthful', 'hip'],
            'premium_experience': ['rough', 'happy']
        };
        return conflicts[operationalGoal]?.some(conflict => vibes.includes(conflict));
    }

    // Check for conflicts and adjust
    let finalOperationalGoal = operationalGoal;
    let vibeInfluenceBoost = 1.0;

    if (detectConflicts(operationalGoal, vibes)) {
        finalOperationalGoal = 'balanced_operation';
        vibeInfluenceBoost = 3.0; // Triple vibe influence
        reasoning.push(`🔄 Auto-balanced: ${operationalGoal} conflicted with ${vibes?.join(', ')} - vibes prioritized`);
    }

    // STEP 1: BEDRIJFSDOEL ALS BASIS (40% weight) - use adjusted goal
    const operationalProfile = operationalGoals[finalOperationalGoal] || operationalGoals.balanced_operation;
    let features = { ...operationalProfile.target_features };
    reasoning.push(`🎯 PRIMARY (40%): ${operationalProfile.reasoning}`);

    // WEIGHTED ADJUSTMENT SYSTEM
    const layers = [];
    let totalWeight = 0.4; // Base operational goal weight (q3)

    // LAYER 1: Cultural Context (30% - highest adjustment priority)
    const culturalContext = detectCulturalContext({
        restaurantName,
        menuAnalysis,
        vibes: vibe ? [vibe] : [] // Convert single vibe to array
    });

    if (culturalContext) {
        const culturalAdj = { ...culturalContext.audio_adjustments };
        layers.push({
            name: 'Cultural Context',
            weight: 0.3,
            adjustments: culturalAdj
        });
        totalWeight += 0.3;
        reasoning.push(`🌍 Cultural Context (30%): ${culturalContext.culture} (${culturalContext.confidence})`);
        reasoning.push(`Match: ${culturalContext.match_reasons.join('; ')}`);
    }

    // LAYER 2: Business Type (15% weight) - q2
    if (businessType) {
        const adj = { acousticness: 0, energy: 0, instrumentalness: 0, tempo: 0, valence: 0 };

        if (businessType === 'fine_dining') {
            adj.acousticness = 0.2;
            adj.instrumentalness = 0.15;
            adj.energy = -0.15;
            reasoning.push('🍽️ Fine Dining (15%): Enhanced sophistication');
        } else if (businessType === 'brunch_breakfast') {
            adj.acousticness = 0.12;
            adj.valence = 0.08;
            adj.energy = 0.05;
            reasoning.push('🥐 Brunch/Breakfast (15%): Welcoming morning atmosphere');
        } else if (businessType === 'coffee_shop') {
            adj.acousticness = 0.15;
            adj.instrumentalness = 0.1;
            reasoning.push('☕ Coffee Shop (15%): Moderate acoustic enhancement');
        } else if (businessType === 'bar_lounge') {
            adj.energy = 0.1;
            adj.danceability = 0.08;
            adj.valence = 0.05;
            reasoning.push('🍸 Bar/Lounge (15%): Social energy boost');
        } else if (businessType === 'casual_dining') {
            adj.valence = 0.05;
            adj.energy = 0.03;
            reasoning.push('🍕 Casual Dining (15%): Comfortable energy');
        } else if (businessType === 'quick_service') {
            adj.tempo = 15;
            adj.energy = 0.1;
            reasoning.push('⚡ Quick Service (15%): Tempo & energy boost');
        }

        layers.push({
            name: 'Business Type',
            weight: 0.15,
            adjustments: adj
        });
        totalWeight += 0.15;
    }

    // LAYER 3: Vibe/Atmosfeer (12% weight) - q4
    if (vibe) {
        const adj = { acousticness: 0, energy: 0, instrumentalness: 0, tempo: 0, valence: 0 };

        if (vibe === 'european_sophisticated') {
            adj.acousticness = 0.2;
            adj.instrumentalness = 0.15;
            adj.tempo = -5;
            reasoning.push('🎭 European Sophisticated (12%): Refined elegance');
        } else if (vibe === 'local_authentic') {
            adj.acousticness = 0.1;
            adj.valence = 0.05;
            reasoning.push('🏡 Local Authentic (12%): Warm authenticity');
        } else if (vibe === 'international_modern') {
            adj.energy = 0.05;
            adj.danceability = 0.05;
            reasoning.push('🌐 International Modern (12%): Contemporary energy');
        } else if (vibe === 'classic_timeless') {
            adj.acousticness = 0.15;
            adj.instrumentalness = 0.1;
            adj.tempo = -3;
            reasoning.push('⏳ Classic Timeless (12%): Sophisticated heritage');
        }

        layers.push({
            name: 'Vibe/Atmosfeer',
            weight: 0.12,
            adjustments: adj
        });
        totalWeight += 0.12;
    }

    // LAYER 4: Time-Based Atmosphere (8% weight) - q6 (was q5)
    if (timeBasedAtmosphere && Object.keys(timeBasedAtmosphere).length) {
        const adj = { acousticness: 0, energy: 0, instrumentalness: 0, tempo: 0, valence: 0, speechiness: 0, danceability: 0 };

        Object.entries(timeBasedAtmosphere).forEach(([timeSlot, choice]) => {
            const timeAdj = timeBasedAdjustments[choice] || {};
            Object.keys(timeAdj).forEach((feature) => {
                adj[feature] = (adj[feature] || 0) + timeAdj[feature];
            });
        });

        layers.push({
            name: 'Time-Based Atmosphere',
            weight: 0.08,
            adjustments: adj
        });
        totalWeight += 0.08;

        const timeSlots = Object.keys(timeBasedAtmosphere).join(', ');
        reasoning.push(`⏰ Time-Based (8%): Optimized for ${timeSlots}`);
    }

    // LAYER 5: RADICALIZED Vibes Woorden (5% weight - but much bigger adjustments!) - q7 (was q6)
    // NIEUW: Met conflict boost
    if (vibes && vibes.length) {
        const adj = { acousticness: 0, energy: 0, instrumentalness: 0, tempo: 0, valence: 0, danceability: 0 };

        vibes.forEach((vibeWord) => {
            const vibeAdj = vibesAdjustments[vibeWord] || {};
            Object.keys(vibeAdj).forEach((feature) => {
                adj[feature] = (adj[feature] || 0) + (vibeAdj[feature] || 0);
            });
        });

        layers.push({
            name: 'Vibes Woorden (RADICALIZED)',
            weight: 0.05 * vibeInfluenceBoost, // 5% becomes 15% with conflicts
            adjustments: adj
        });
        totalWeight += (0.05 * vibeInfluenceBoost);

        const vibeWeightDisplay = vibeInfluenceBoost > 1 ? `${Math.round(5 * vibeInfluenceBoost)}% (CONFLICT BOOSTED)` : '5%';
        reasoning.push(`✨ RADICAL Vibe Words (${vibeWeightDisplay}): ${vibes.join(', ')} - Enhanced differentiation`);

        // Log the radical impact
        const totalVibeImpact = Object.entries(adj).map(([feature, change]) =>
            feature === 'tempo' ? `${feature}:${change > 0 ? '+' : ''}${change}BPM` :
                `${feature}:${change > 0 ? '+' : ''}${(change * 100).toFixed(0)}`
        ).join(', ');
        reasoning.push(`💥 Vibe Impact: ${totalVibeImpact}`);
    }

    // Apply all weighted adjustments
    layers.forEach((layer) => {
        const normalizedWeight = layer.weight / totalWeight;
        Object.keys(layer.adjustments).forEach((feature) => {
            if (features[feature] !== undefined) {
                const adjustment = layer.adjustments[feature] * normalizedWeight;
                features[feature] += adjustment;

                // Log significant adjustments
                if (Math.abs(adjustment) > 0.02 || (feature === 'tempo' && Math.abs(adjustment) > 1)) {
                    console.log(`${layer.name}: ${feature} ${adjustment > 0 ? '+' : ''}${feature === 'tempo' ? Math.round(adjustment) : (adjustment * 100).toFixed(0)}${feature === 'tempo' ? 'BPM' : '%'}`);
                }
            }
        });
    });

    // Website Analysis Integration (limited impact)
    const webAdj = websiteAnalysis?.audio_feature_adjustments;
    if (webAdj && (websiteAnalysis?.confidence_score || 0) > 0.3) {
        reasoning.push('🌐 Website Analysis: Integrated');
        features.acousticness += clamp(webAdj.acousticness_boost * 0.15, -0.05, 0.05) || 0;
        features.energy += clamp(webAdj.energy_adjustment * 0.15, -0.05, 0.05) || 0;
        features.instrumentalness += clamp(webAdj.instrumentalness_boost * 0.15, -0.05, 0.05) || 0;
        features.tempo += clamp(webAdj.tempo_adjustment * 0.15, -5, 5) || 0;
        features.valence += clamp(webAdj.valence_adjustment * 0.15, -0.05, 0.05) || 0;
    }

    // Menu Analysis Integration (limited impact)
    const menuAdj = menuAnalysis?.audio_feature_adjustments;
    if (menuAdj && (menuAnalysis?.confidence_score || 0) > 0.3) {
        reasoning.push('📋 Menu Analysis: Integrated');
        features.acousticness += clamp(menuAdj.acousticness_boost * 0.1, -0.03, 0.03) || 0;
        features.energy += clamp(menuAdj.energy_adjustment * 0.1, -0.03, 0.03) || 0;
        features.instrumentalness += clamp(menuAdj.instrumentalness_boost * 0.1, -0.03, 0.03) || 0;
        features.tempo += clamp(menuAdj.tempo_adjustment * 0.1, -3, 3) || 0;
        features.valence += clamp(menuAdj.valence_adjustment * 0.1, -0.03, 0.03) || 0;
    }

    // ENHANCED Clamp final ranges (allow more extreme values for differentiation)
    features.tempo = Math.max(45, Math.min(160, Math.round(features.tempo))); // Wider tempo range
    Object.keys(features).forEach((feature) => {
        if (feature !== 'tempo') {
            features[feature] = Math.max(0.02, Math.min(0.98, features[feature])); // Allow more extreme values
        }
    });

    // Calculate predicted impact
    const predicted_impact = calcImpact(operationalProfile.priority, features);

    // Generate secondary genres with genre hints integration
    const questionnaireGenres = getGenresFromQuestionnaire(brandData, culturalContext);
    let secondary_genres = questionnaireGenres.map((g) => g.genre);

    // Add exclusion tracking to reasoning - q8 (was q7)
    if (exclusions && exclusions.length > 0) {
        reasoning.push(`❌ Excluded ${exclusions.length} genre categories: ${exclusions.map(e => e.replace('_', ' ')).join(', ')}`);
    }

    // ENHANCED Year preferences with demographic input
    let year_preferences = null;
    const demographicYear = calculateDemographicYearPreferences(demographics || []);

    // Collect all vibe indicators
    const allVibes = [
        ...(vibes || []),        // q7 vibe words (was q6)
        vibe || null,            // q4 main vibe 
    ].filter(Boolean).map(v => v.toLowerCase());

    // Check for modern/contemporary characteristics
    const modernIndicators = [
        'youthful', 'modern', 'hip', 'energetic', 'upbeat',
        'contemporary', 'fresh', 'trendy', 'new'
    ];
    const isModernOrYouthful = allVibes.some(v =>
        modernIndicators.some(indicator => v.includes(indicator))
    ) || vibe === 'international_modern';

    // Check for traditional/classic characteristics  
    const traditionalIndicators = [
        'traditional', 'classic', 'authentic', 'luxurious',
        'sophisticated', 'timeless', 'heritage', 'vintage'
    ];
    const isTraditionalOrClassic = allVibes.some(v =>
        traditionalIndicators.some(indicator => v.includes(indicator))
    ) || vibe === 'classic_timeless' || vibe === 'european_sophisticated';

    // Determine final min_year and recency_weight with demographic influence
    let finalMinYear = demographicYear.min_year;
    let recencyWeight = 0;

    if (isModernOrYouthful && !isTraditionalOrClassic) {
        recencyWeight = 0.4;
        finalMinYear = Math.max(finalMinYear, 1995); // Don't go too old even with seniors
        reasoning.push(`📅 Modern/Youthful vibe + demographics → ${finalMinYear}+ (recency: +${recencyWeight})`);
    } else if (isTraditionalOrClassic && !isModernOrYouthful) {
        recencyWeight = -0.4; // Less extreme than -0.6
        // Keep demographic min_year as-is for traditional
        reasoning.push(`📅 Traditional vibe + demographics → ${finalMinYear}+ (recency: ${recencyWeight})`);
    } else {
        // Balanced or mixed - use demographic preference
        recencyWeight = 0.1;
        reasoning.push(`📅 Balanced approach based on demographics → ${finalMinYear}+`);
    }

    year_preferences = {
        min_year: finalMinYear,
        preferred_years: [finalMinYear, Math.min(finalMinYear + 25, 2024)],
        recency_weight: recencyWeight,
        description: `Demographics + vibes (${finalMinYear}+)`,
        demographic_influence: demographics ? demographics.join(', ') : null
    };

    // Cultural context can also influence year preferences
    if (culturalContext && culturalContext.culture) {
        if (year_preferences) {
            if (['french', 'italian'].includes(culturalContext.culture)) {
                year_preferences.min_year = Math.min(year_preferences.min_year, 1980);
                reasoning.push(`🎭 Cultural adjustment: ${culturalContext.culture} heritage allows older music`);
            }
        } else if (['french', 'italian', 'spanish'].includes(culturalContext.culture)) {
            year_preferences = {
                min_year: Math.max(1980, demographicYear.min_year),
                preferred_years: [1990, 2024],
                recency_weight: 0.1,
                description: `${culturalContext.culture} cultural context + demographics`,
                demographic_influence: demographics ? demographics.join(', ') : null
            };
            reasoning.push(`🎭 Cultural year preference: ${culturalContext.culture} context + demographics`);
        }
    }

    // Add contemporary genres for modern vibes
    if (isModernOrYouthful && !isTraditionalOrClassic) {
        const contemporary_additions = ['pop', 'electronic', 'indie pop', 'alternative', 'dance'];
        contemporary_additions.forEach(genre => {
            if (!secondary_genres.includes(genre)) {
                secondary_genres.push(genre);
            }
        });
    }

    // Add cultural context info
    const culturalInfo = culturalContext ? {
        detected_culture: culturalContext.culture,
        cultural_score: culturalContext.score,
        cultural_genres: culturalContext.cultural_genres,
        cultural_confidence: culturalContext.confidence
    } : null;

    // FINAL: Log the radical differentiation achieved
    const featureSummary = `T:${features.tempo}BPM E:${(features.energy * 10).toFixed(1)} A:${(features.acousticness * 10).toFixed(1)} D:${(features.danceability * 10).toFixed(1)} V:${(features.valence * 10).toFixed(1)}`;
    reasoning.push(`🎼 Final Profile: ${featureSummary}`);

    // Add demographic influence summary
    if (demographics && demographics.length > 0) {
        reasoning.push(`👥 Demographics: ${demographics.join(', ')} → min year ${demographicYear.min_year}`);
    }

    // Fill reasoning if needed
    if (reasoning.length < 8) {
        reasoning.push(
            '🔬 Scientific audio feature optimization',
            `🎯 Target: ${operationalProfile.priority}`,
            '⚖️ Multi-layered weighted system with ENHANCED differentiation'
        );
    }

    return {
        features,
        secondary_genres,
        predicted_impact,
        reasoning: reasoning.slice(0, 12),
        cultural_context: culturalInfo,
        operational_goal: finalOperationalGoal, // Return adjusted goal
        year_preferences,
        excluded_genres: exclusions || [], // q8 (was q7)
        demographics: demographics || [], // NEW: Include demographics in output
        weight_distribution: {
            operational_goal: finalOperationalGoal !== operationalGoal ? `40% (auto-balanced to ${finalOperationalGoal})` : '40%',
            cultural_context: culturalContext ? '30%' : '0%',
            business_type: '15%',
            vibe_atmosphere: '12%',
            time_based: '8%',
            vibe_words: vibeInfluenceBoost > 1 ? `${Math.round(5 * vibeInfluenceBoost)}% (CONFLICT BOOSTED)` : '5% (RADICALIZED)',
            demographics: demographics && demographics.length ? 'Influences year preferences' : 'Not provided',
            note: vibeInfluenceBoost > 1 ? 'Conflict detected - vibes given priority over business goals' : 'Vibe adjustments increased 3-5x for better differentiation'
        }
    };
}

function calcImpact(priority, features) {
    if (priority === 'maximize_spending') {
        const tempoScore = features.tempo <= 80 ? 1.0 : Math.max(0, 1 - (features.tempo - 80) / 40);
        const dwell = Math.round(20 + tempoScore * 36);
        const rev = Math.round(5 + tempoScore * 20);
        return {
            dwell_time_increase: `+${dwell}%`,
            revenue_per_customer: `+${rev}%`,
            table_turnover: `${tempoScore < 0.5 ? '-15%' : '-5%'} (trade-off)`,
            customer_satisfaction: '+25%',
        };
    }
    if (priority === 'maximize_throughput') {
        const tempoScore = features.tempo >= 100 ? 1.0 : Math.max(0, (features.tempo - 60) / 40);
        const turnover = Math.round(10 + tempoScore * 25);
        return {
            table_turnover: `+${turnover}%`,
            service_speed: `+${Math.round(tempoScore * 20)}%`,
            revenue_per_customer: `${tempoScore > 0.7 ? '-10%' : '+5%'} (trade-off)`,
            customer_satisfaction: '+15%',
        };
    }
    return {
        balanced_performance: '+15% overall efficiency',
        customer_satisfaction: '+20%',
        revenue_increase: '+12%',
        operational_efficiency: '+18%',
    };
}

export function calculateROI(profile) {
    let base = 5;
    if (profile.features.acousticness > 0.7) base += 15;
    if (profile.features.tempo < 80) base += 12;
    if (profile.features.instrumentalness > 0.6) base += 8;
    if (profile.features.energy < 0.4) base += 10;

    // Cultural boost to ROI
    if (profile.cultural_context && profile.cultural_context.cultural_score > 0.5) {
        base += Math.round(profile.cultural_context.cultural_score * 10);
    }

    // Demographic boost to ROI - targeted music performs better
    if (profile.demographics && profile.demographics.length > 0) {
        base += profile.demographics.length; // More specific targeting = better ROI
    }

    // Radical vibe boost to ROI
    const radicalVibes = ['luxurious', 'rough', 'energetic', 'youthful'];
    if (profile.excluded_genres && radicalVibes.some(v => profile.excluded_genres.includes && !profile.excluded_genres.includes(v))) {
        base += 3; // Bonus for strong differentiation
    }

    return {
        revenue_increase: `${Math.max(5, base)}%`,
        dwell_time_increase: profile.features.tempo < 80 ? '+56%' : '+25%',
        customer_satisfaction: '+25%',
        monthly_impact: `€${Math.round(base * 50)}`,
        implementation_time: '2-3 weeks',
    };
}

export function generateImplementationPlan(profile) {
    const f = profile.features;
    const plan = {
        immediate: [
            `Target tempo: ${f.tempo} BPM (${f.tempo < 80 ? 'slow for longer stays' : f.tempo > 100 ? 'fast for turnover' : 'balanced'})`,
            `Energy level: ${(f.energy * 10).toFixed(1)}/10`,
            `Acousticness: ${(f.acousticness * 10).toFixed(1)}/10`,
            `Instrumentalness: ${(f.instrumentalness * 10).toFixed(1)}/10`,
        ],
        weekly: [
            'A/B test different tempo ranges during peak hours',
            'Monitor customer dwell time and satisfaction metrics',
            'Implement time-of-day adjustments based on atmosphere settings',
            'Track correlation between music features and sales data',
        ],
        monthly: [
            'Analyze revenue impact vs music feature data',
            'Seasonal adjustments to energy and valence levels',
            'Staff feedback collection and feature optimization',
            'Expand playlist based on successful feature combinations',
        ],
    };

    // Add cultural-specific recommendations
    if (profile.cultural_context) {
        plan.immediate.push(`Cultural theme: ${profile.cultural_context.detected_culture} music integration`);
        plan.weekly.push(`Test ${profile.cultural_context.detected_culture} genre performance during different time slots`);
    }

    // Add demographic-specific recommendations
    if (profile.demographics && profile.demographics.length > 0) {
        plan.immediate.push(`Target demographics: ${profile.demographics.join(', ')} - optimized for ${profile.year_preferences?.description || 'balanced approach'}`);
        plan.weekly.push('Monitor demographic response to music selection and adjust year preferences if needed');
    }

    // Add radical vibe-specific recommendations
    if (profile.weight_distribution.note && profile.weight_distribution.note.includes('RADICALIZED')) {
        plan.immediate.push('Enhanced vibe differentiation - monitor customer response to stronger musical character');
        plan.weekly.push('A/B test radical vs subtle vibe adjustments for customer preference');
    }

    // Add exclusion-specific recommendations
    if (profile.excluded_genres && profile.excluded_genres.length > 0) {
        plan.immediate.push(`Genre exclusions: ${profile.excluded_genres.length} categories filtered out`);
        plan.weekly.push('Monitor if excluded genres accidentally appear and adjust filters');
    }

    return plan;
}

// ---------- Playlist matching ----------
// UPDATED calculateMatchScore with year preferences
export function calculateMatchScore(targetFeatures, tracks, top2000Database, yearPreferences = null) {
    if (!tracks || tracks.length === 0) return 94;
    const DUTCH_BOOST_MAX = 0.2;

    let total = 0;
    tracks.forEach((track) => {
        let score = 0;
        let weightSum = 0;

        // Audio features scoring (existing logic but with year-adjusted weights)
        const audioWeight = yearPreferences && yearPreferences.recency_weight !== 0
            ? Math.abs(1 - Math.abs(yearPreferences.recency_weight))  // Reduce audio weight if year matters
            : 1.0;

        if (track.bpm && targetFeatures.tempo) {
            const tempoMatch = 1 - Math.abs(track.bpm - targetFeatures.tempo) / 100;
            const weight = 0.3 * audioWeight;
            score += Math.max(0, tempoMatch) * weight;
            weightSum += weight;
        }

        if (track.energy !== undefined && targetFeatures.energy !== undefined) {
            const energyMatch = 1 - Math.abs(track.energy - targetFeatures.energy);
            const weight = 0.25 * audioWeight;
            score += Math.max(0, energyMatch) * weight;
            weightSum += weight;
        }

        // Other audio features (acousticness, danceability, valence, instrumentalness)
        const otherFeatures = ['acousticness', 'danceability', 'valence', 'instrumentalness'];
        otherFeatures.forEach((feature) => {
            if (track[feature] !== undefined && targetFeatures[feature] !== undefined) {
                const match = 1 - Math.abs(track[feature] - targetFeatures[feature]);
                const weight = 0.1125 * audioWeight; // 0.45 / 4 features
                score += Math.max(0, match) * weight;
                weightSum += weight;
            }
        });

        // Year-based scoring
        if (yearPreferences && yearPreferences.recency_weight !== 0) {
            const trackYear = extractYearFromTrack(track);
            let yearScore = calculateYearScore(trackYear, yearPreferences);

            const yearWeight = Math.abs(yearPreferences.recency_weight);
            score += yearScore * yearWeight;
            weightSum += yearWeight;
        }

        // Normalize the combined score
        let normalizedScore = weightSum > 0 ? score / weightSum : 0;

        // Dutch relevance boost (existing logic)
        const artistName = track.artists?.[0]?.name || track.artist || '';
        const trackName = track.name || track.title || '';
        const dutchRelevance = getDutchRelevance(artistName, trackName, top2000Database);
        const finalScore = normalizedScore * (1 + DUTCH_BOOST_MAX * dutchRelevance);

        total += finalScore;
    });

    return Math.round((total / tracks.length) * 100);
}

// Helper function to calculate year score
function calculateYearScore(trackYear, yearPreferences) {
    if (!yearPreferences || yearPreferences.recency_weight === 0) {
        return 1.0;
    }

    const [preferredStart, preferredEnd] = yearPreferences.preferred_years;

    if (yearPreferences.recency_weight > 0) {
        // Positive recency weight - favor newer music
        if (trackYear >= preferredEnd - 4) {
            return 1.0; // Very recent music
        } else if (trackYear >= preferredEnd - 9) {
            return 0.85; // Recent music
        } else if (trackYear >= preferredStart) {
            return 0.7; // Within preferred range
        } else if (trackYear >= yearPreferences.min_year) {
            return 0.4; // Acceptable but not preferred
        } else {
            return 0.1; // Too old
        }
    } else {
        // Negative recency weight - slightly favor older music
        if (trackYear <= preferredStart + 10) {
            return 1.0; // Classic era music
        } else if (trackYear <= preferredEnd) {
            return 0.9; // Within preferred range
        } else if (trackYear <= new Date().getFullYear() - 5) {
            return 0.8; // Not too recent
        } else {
            return 0.7; // Recent but still acceptable
        }
    }
}

// Helper function to extract year from track (reused)
function extractYearFromTrack(track) {
    const releaseValue = track.release || track.Release || track.release_date || track.year;

    if (!releaseValue || releaseValue === '') {
        return 2015;
    }

    // Handle MM/DD/YYYY or DD/MM/YYYY format
    if (typeof releaseValue === 'string' && releaseValue.includes('/')) {
        const parts = releaseValue.split('/');
        if (parts.length === 3) {
            const year = parseInt(parts[2]); // Year is always last in both formats
            if (year >= 1900 && year <= 2024) {
                return year;
            }
        }
    }

    // Handle ISO date strings like "1956-03-23"
    if (typeof releaseValue === 'string' && releaseValue.includes('-')) {
        const year = parseInt(releaseValue.split('-')[0]);
        if (year >= 1900 && year <= 2024) {
            return year;
        }
    }

    // Handle numeric values (Excel serial dates or direct years)
    if (!isNaN(releaseValue)) {
        if (releaseValue >= 1900 && releaseValue <= 2024) {
            return releaseValue;
        }

        if (releaseValue > 25000 && releaseValue < 50000) {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + (releaseValue * 24 * 60 * 60 * 1000));
            return date.getFullYear();
        }
    }

    return 2015;
}

// ---------- OpenAI API wrappers ----------
export async function analyzeImageWithOpenAI(file) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/analyze_image', { method: 'POST', body: formData });
    if (!resp.ok) throw new Error(`Image API ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('Invalid response format');
    const data = await resp.json();
    if (data.success) return data.analysis;
    if (data.fallback_analysis) return data.fallback_analysis;
    throw new Error(data.error || 'Analysis failed');
}

export async function analyzeWebsiteWithOpenAI(file) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/analyze_website', { method: 'POST', body: formData });
    if (!resp.ok) throw new Error(`Website API ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('Invalid response format');
    const data = await resp.json();
    if (data.success) return data.analysis;
    if (data.fallback_analysis) return data.fallback_analysis;
    throw new Error(data.error || 'Website analysis failed');
}

// ---------- utils ----------
function clamp(v, min, max) {
    if (typeof v !== 'number') return 0;
    return Math.max(min, Math.min(max, v));
}