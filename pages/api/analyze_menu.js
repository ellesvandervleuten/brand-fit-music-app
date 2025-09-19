// pages/api/analyze_menu.js - OpenAI Menu Analysis met Cultural Context System
import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
    api: {
        bodyParser: false,
    },
};

// Cultural patterns matching lib/logic.js
const culturalPatterns = {
    french: {
        name_patterns: ['café', 'brasserie', 'bistro', 'le ', 'la ', 'chez', 'maison', 'auberge'],
        menu_indicators: ['croissant', 'baguette', 'coq au vin', 'bouillabaisse', 'ratatouille', 'crème brûlée', 'quiche', 'escargot', 'foie gras', 'fromage', 'croque', 'pain', 'tarte'],
        boost_multiplier: 0.15
    },
    spanish: {
        name_patterns: ['valencia', 'casa', 'el ', 'la ', 'tapas', 'bodega', 'mesón', 'taberna'],
        menu_indicators: ['tapas', 'paella', 'jamón', 'gazpacho', 'tortilla', 'sangria', 'chorizo', 'patatas bravas', 'albondigas', 'manchego', 'ibérico'],
        boost_multiplier: 0.12
    },
    italian: {
        name_patterns: ['trattoria', 'osteria', 'bella', 'romano', 'milano', 'casa', 'da ', 'il ', 'la '],
        menu_indicators: ['pasta', 'risotto', 'antipasti', 'bruschetta', 'osso buco', 'tiramisu', 'gelato', 'prosciutto', 'mozzarella', 'chianti', 'carbonara', 'bolognese', 'parmigiano'],
        boost_multiplier: 0.1
    },
    british: {
        name_patterns: ['the ', 'pub', 'arms', 'crown', 'red lion', 'george', 'royal', 'old'],
        menu_indicators: ['fish and chips', 'shepherd\'s pie', 'bangers', 'mash', 'sunday roast', 'ale', 'cider', 'scones', 'cornish', 'yorkshire'],
        boost_multiplier: 0.08
    },
    greek: {
        name_patterns: ['taverna', 'opa', 'mykonos', 'santorini', 'zeus', 'apollo'],
        menu_indicators: ['gyros', 'souvlaki', 'moussaka', 'tzatziki', 'feta', 'ouzo', 'baklava', 'dolmades', 'spanakopita'],
        boost_multiplier: 0.09
    }
};

function parseForm(req) {
    return new Promise((resolve, reject) => {
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
            keepExtensions: true,
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                console.log('Menu files parsed:', Object.keys(files));
                resolve({ fields, files });
            }
        });
    });
}

function imageToBase64(filepath) {
    const imageBuffer = fs.readFileSync(filepath);
    return imageBuffer.toString('base64');
}

// DEEL 3: Context-aware pricing analysis
function analyzeMenuPricing(menuItems, businessType = null) {
    let pricingLevel = 'mid-range';
    let upscaleBoost = 0;

    // Define price thresholds based on meal type
    const priceThresholds = {
        breakfast: { budget: 8, mid: [8, 12], premium: 15 },
        brunch: { budget: 8, mid: [8, 12], premium: 15 },
        lunch: { budget: 12, mid: [12, 18], premium: 25 },
        dinner: { budget: 18, mid: [18, 30], premium: 40 }
    };

    // Extract prices and analyze
    const prices = [];
    const upscaleKeywords = ['artisanal', 'house-made', 'house made', 'handcrafted', 'locally sourced', 'organic', 'farm-to-table', 'seasonal', 'chef\'s special', 'signature', 'premium'];
    let upscaleKeywordCount = 0;

    // Combine all menu items into one string for content analysis
    const menuContent = menuItems.join(' ').toLowerCase();

    menuItems.forEach(item => {
        // Extract price from item (€15.50, $12.95, etc.)
        const priceMatch = item.match(/[€$£¥](\d+(?:[\.,]\d{2})?)/);
        if (priceMatch) {
            const price = parseFloat(priceMatch[1].replace(',', '.'));
            prices.push(price);
        }

        // Count upscale keywords
        upscaleKeywords.forEach(keyword => {
            if (item.toLowerCase().includes(keyword.toLowerCase())) {
                upscaleKeywordCount++;
            }
        });
    });

    // STAP 1: Bepaal meal type op basis van business context en menu inhoud
    let mealType = 'lunch'; // default

    if (businessType === 'brunch_breakfast') {
        // Voor brunch/breakfast zaak: check menu items
        const breakfastIndicators = ['pancake', 'waffle', 'egg', 'toast', 'croissant', 'yogurt', 'granola', 'bacon', 'omelette', 'coffee', 'tea'];
        const hasBreakfastItems = breakfastIndicators.some(indicator =>
            menuContent.includes(indicator)
        );
        mealType = hasBreakfastItems ? 'breakfast' : 'brunch';
    } else {
        // Voor andere zaak types: check voor dinner vs lunch indicators
        const dinnerIndicators = ['steak', 'wine', 'course', 'lobster', 'filet', 'tasting menu', 'dessert wine', 'aperitif', '3-course', '4-course'];
        const lunchIndicators = ['sandwich', 'salad', 'soup', 'wrap', 'burger', 'pasta', 'pizza'];

        const hasDinnerItems = dinnerIndicators.some(indicator =>
            menuContent.includes(indicator)
        );
        const hasLunchItems = lunchIndicators.some(indicator =>
            menuContent.includes(indicator)
        );

        if (hasDinnerItems && !hasLunchItems) {
            mealType = 'dinner';
        } else if (hasLunchItems && !hasDinnerItems) {
            mealType = 'lunch';
        } else {
            // Mixed menu - use average price to decide
            if (prices.length > 0) {
                const avgPrice = prices.reduce((a, b) => a + b) / prices.length;
                mealType = avgPrice > 25 ? 'dinner' : 'lunch';
            }
        }
    }

    // STAP 2: Bepaal pricing level binnen het correcte meal type
    if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b) / prices.length;
        const maxPrice = Math.max(...prices);
        const thresholds = priceThresholds[mealType];

        // Bepaal pricing level binnen meal type context
        if (avgPrice >= thresholds.premium) {
            pricingLevel = 'premium';
        } else if (avgPrice >= thresholds.mid[0] && avgPrice <= thresholds.mid[1]) {
            pricingLevel = 'mid-range';
        } else if (avgPrice < thresholds.budget) {
            pricingLevel = 'budget';
        } else if (avgPrice > thresholds.mid[1] && avgPrice < thresholds.premium) {
            pricingLevel = 'upscale';
        }

        // Apply upscale keyword boost
        if (upscaleKeywordCount >= 3) {
            upscaleBoost = 0.2;
            if (pricingLevel === 'mid-range') pricingLevel = 'upscale';
            if (pricingLevel === 'budget') pricingLevel = 'mid-range';
        }

        return {
            pricing_level: pricingLevel,
            average_price: Math.round(avgPrice * 100) / 100,
            price_range: [Math.min(...prices), Math.max(...prices)],
            meal_type: mealType,
            upscale_keywords_found: upscaleKeywordCount,
            upscale_boost: upscaleBoost,
            pricing_reasoning: [
                `Business type: ${businessType || 'unknown'} → meal type: ${mealType}`,
                `${mealType} thresholds: budget <€${thresholds.budget}, mid €${thresholds.mid[0]}-${thresholds.mid[1]}, premium €${thresholds.premium}+`,
                `Average price: €${avgPrice.toFixed(2)} → ${pricingLevel} ${mealType}`,
                `Upscale keywords found: ${upscaleKeywordCount}${upscaleBoost > 0 ? ' (pricing boost applied)' : ''}`
            ]
        };
    }

    return {
        pricing_level: 'mid-range',
        average_price: 0,
        price_range: [0, 0],
        meal_type: mealType,
        upscale_keywords_found: 0,
        upscale_boost: 0,
        pricing_reasoning: ['No prices detected in menu', `Assumed meal type: ${mealType} based on business context`]
    };
}

// NIEUW: Enhanced Cultural Detection
function detectMenuCulturalContext({ restaurantName, menuItems, vibe }) {
    const name = String(restaurantName || '').toLowerCase();
    const menuContent = menuItems.join(' ').toLowerCase();

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
            score += 0.4 * nameMatches.length;
            reasons.push(`Name "${restaurantName}" contains ${culture} patterns: ${nameMatches.join(', ')}`);
        }

        // Menu item matching
        const menuMatches = patterns.menu_indicators.filter(indicator => menuContent.includes(indicator));
        if (menuMatches.length > 0) {
            score += 0.3 * menuMatches.length;
            reasons.push(`Menu contains ${culture} items: ${menuMatches.slice(0, 3).join(', ')}${menuMatches.length > 3 ? '...' : ''}`);
        }

        // Vibe multiplier - "european_sophisticated" boosts European cultures
        if (vibe === 'european_sophisticated') {
            if (['french', 'spanish', 'italian', 'greek'].includes(culture)) {
                score *= 1.5;
                reasons.push(`"European Sophisticated" vibe amplifies ${culture} cultural match`);
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
            boost_amount: pattern.boost_multiplier * Math.min(culturalScore, 1.0),
            match_reasons: matchReasons,
            confidence: culturalScore >= 0.8 ? 'high' : culturalScore >= 0.5 ? 'medium' : 'low'
        };
    }

    return null;
}

function parseMenuAnalysisResponse(text) {
    try {
        // First try to extract JSON from markdown codeblocks
        let jsonStr = text;

        // Remove markdown codeblock if present
        if (text.includes('```json')) {
            const start = text.indexOf('```json') + 7;
            const end = text.indexOf('```', start);
            if (start > 6 && end > start) {
                jsonStr = text.slice(start, end).trim();
            }
        } else if (text.includes('```')) {
            const start = text.indexOf('```') + 3;
            const end = text.lastIndexOf('```');
            if (start > 2 && end > start) {
                jsonStr = text.slice(start, end).trim();
            }
        } else {
            // Look for JSON object
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}') + 1;
            if (start !== -1 && end > start) {
                jsonStr = text.slice(start, end);
            }
        }

        const parsed = JSON.parse(jsonStr);

        // Ensure menu_items is an array
        if (parsed.menu_items && !Array.isArray(parsed.menu_items)) {
            parsed.menu_items = [parsed.menu_items];
        }

        console.log('Successfully parsed menu analysis:', Object.keys(parsed));
        return parsed;

    } catch (error) {
        console.warn('Failed to parse menu analysis response:', error);
        console.warn('Raw text:', text.substring(0, 200) + '...');
        return extractMenuFallbackAnalysis(text);
    }
}

function extractMenuFallbackAnalysis(text) {
    // Extract menu items with regex as fallback
    const menuItems = [];
    const lines = text.split('\n');

    lines.forEach(line => {
        // Look for lines with prices (€X.XX, $X.XX, etc.)
        if (/[€$£¥]\d+[\.,]\d{2}/.test(line) && line.trim().length > 5) {
            // Clean up the line - remove quotes, extra spaces, etc.
            let cleanLine = line.trim().replace(/["'`]/g, '').replace(/,\s*$/, '');
            if (cleanLine.length > 3) {
                menuItems.push(cleanLine);
            }
        }
    });

    // Also look for items in the format "Item - €XX.XX"
    const itemMatches = text.match(/[A-Za-z][^€$£¥\n]*[€$£¥]\d+[\.,]\d{2}/g);
    if (itemMatches) {
        itemMatches.forEach(match => {
            const cleanMatch = match.trim().replace(/["'`]/g, '');
            if (cleanMatch.length > 5 && !menuItems.includes(cleanMatch)) {
                menuItems.push(cleanMatch);
            }
        });
    }

    console.log('Fallback extracted menu items:', menuItems.length, 'items');

    return {
        menu_items: menuItems.length > 0 ? menuItems : ['Menu analysis failed - no items found'],
        cuisine_type: 'international',
        sophistication_level: 0.7,
        cultural_indicators: [],
        price_tier: 'mid-range',
        dietary_options: ['standard'],
        confidence_score: menuItems.length > 0 ? 0.6 : 0.3,
        raw_response: text
    };
}

// UPDATED: Enhanced mapMenuToAudioFeatures with full cultural detection
function mapMenuToAudioFeatures(menuAnalysis, restaurantName = '', vibe = '') {
    const sophistication = menuAnalysis.sophistication_level || 0.7;
    const pricingBoost = menuAnalysis.pricing_analysis?.upscale_boost || 0;

    // Enhanced cultural detection using menu items + name + vibe
    const culturalContext = detectMenuCulturalContext({
        restaurantName,
        menuItems: menuAnalysis.menu_items || [],
        vibe
    });

    let culturalBoost = 0;
    let culturalGenres = [];
    let culturalReasoning = ['No cultural context detected'];

    if (culturalContext) {
        culturalBoost = culturalContext.boost_amount;
        culturalReasoning = culturalContext.match_reasons;

        // Map detected culture to specific audio adjustments and genres
        const cultureAudioMap = {
            french: {
                acousticness_extra: 0.2,
                instrumentalness_extra: 0.15,
                tempo_adjustment: -5,
                valence_adjustment: 0.05,
                genres: ['french_cafe', 'chanson', 'jazz_manouche', 'acoustic_french']
            },
            spanish: {
                acousticness_extra: 0.12,
                instrumentalness_extra: 0.1,
                tempo_adjustment: -3,
                valence_adjustment: 0.1,
                genres: ['spanish_acoustic', 'latin', 'flamenco_acoustic', 'mediterranean']
            },
            italian: {
                acousticness_extra: 0.1,
                instrumentalness_extra: 0.08,
                tempo_adjustment: -2,
                valence_adjustment: 0.08,
                genres: ['italian_classics', 'acoustic_mediterranean', 'italian_folk']
            },
            british: {
                acousticness_extra: 0.08,
                instrumentalness_extra: 0.05,
                tempo_adjustment: 2,
                valence_adjustment: 0.02,
                genres: ['british_indie', 'british_folk', 'pub_music']
            },
            greek: {
                acousticness_extra: 0.1,
                instrumentalness_extra: 0.08,
                tempo_adjustment: 0,
                valence_adjustment: 0.1,
                genres: ['greek_traditional', 'mediterranean', 'acoustic_greek']
            }
        };

        const cultureAudio = cultureAudioMap[culturalContext.culture] || {};
        culturalGenres = cultureAudio.genres || [];
    }

    return {
        acousticness_boost: (sophistication * 0.15) + pricingBoost + culturalBoost,
        energy_adjustment: (sophistication > 0.8 ? -0.1 : 0.05),
        instrumentalness_boost: (sophistication * 0.12) + (pricingBoost * 0.5) + (culturalBoost * 0.8),
        tempo_adjustment: (sophistication > 0.8 ? -8 : 0) + (culturalContext?.score > 0.5 ? -3 : 0),
        valence_adjustment: culturalBoost > 0 ? 0.05 : 0,
        cultural_genres: culturalGenres,
        cultural_context: culturalContext,
        reasoning: [
            `Menu sophistication (${(sophistication * 10).toFixed(1)}/10) → base adjustments`,
            `Pricing level: ${menuAnalysis.pricing_analysis?.pricing_level || 'unknown'}${pricingBoost > 0 ? ' (upscale boost)' : ''}`,
            culturalContext ? `Cultural: ${culturalContext.culture} (${culturalContext.confidence}) → ${culturalGenres.join(', ')}` : 'No cultural context',
            ...culturalReasoning
        ].slice(0, 6)
    };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
            error: 'OpenAI API key not configured',
            details: 'Please add OPENAI_API_KEY to your .env.local file'
        });
    }

    try {
        const { fields, files } = await parseForm(req);

        // Get restaurant context for cultural analysis
        let restaurantName = fields.restaurantName || fields.restaurant_name || '';
        let businessType = fields.businessType || fields.business_type || '';
        let vibe = fields.vibe || '';

        // Extract string value if it's an array (formidable v3 behavior)
        if (Array.isArray(restaurantName)) restaurantName = restaurantName[0] || '';
        if (Array.isArray(businessType)) businessType = businessType[0] || '';
        if (Array.isArray(vibe)) vibe = vibe[0] || '';

        console.log('Menu analysis context:', { restaurantName, businessType, vibe });

        let file = files.file;
        if (Array.isArray(file)) {
            file = file[0];
        }

        if (!file) {
            return res.status(400).json({ error: 'No menu file uploaded' });
        }

        const filePath = file.filepath || file.path;
        if (!filePath) {
            return res.status(400).json({
                error: 'File path not found',
                details: 'Unable to locate uploaded menu file path'
            });
        }

        const base64Image = imageToBase64(filePath);

        console.log('Analyzing menu with OpenAI Vision API...');

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                                detail: "high"
                            }
                        },
                        {
                            type: "text",
                            text: `Analyze this restaurant menu for cultural music optimization. Restaurant context: "${restaurantName}" - ${businessType} with ${vibe} vibe.

Extract ALL menu items with prices and identify cultural/cuisine indicators for music matching.

Return JSON with this exact structure:

{
  "menu_items": [
    "Truffle Risotto - €24.50",
    "House-made Pasta Carbonara - €18.00"
  ],
  "cuisine_type": "italian",
  "sophistication_level": 0.8,
  "cultural_indicators": ["italian", "traditional"],
  "price_tier": "upscale",
  "dietary_options": ["vegetarian"],
  "confidence_score": 0.9
}

Focus on cultural cuisine markers:
- French: croissant, coq au vin, baguette, crème brûlée, quiche
- Spanish: tapas, paella, gazpacho, jamón, chorizo
- Italian: pasta, risotto, bruschetta, tiramisu, prosciutto
- British: fish and chips, shepherd's pie, scones
- Greek: moussaka, gyros, tzatziki, baklava

Extract ALL items with exact prices - this affects cultural music matching.`
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.2
        });

        const analysisText = response.choices[0].message.content;
        console.log('Menu analysis received:', analysisText.substring(0, 300) + '...');

        const menuAnalysis = parseMenuAnalysisResponse(analysisText);

        // Apply context-aware pricing analysis
        const pricingAnalysis = analyzeMenuPricing(
            menuAnalysis.menu_items || [],
            businessType
        );

        menuAnalysis.pricing_analysis = pricingAnalysis;

        // Clean up temporary file
        try {
            fs.unlinkSync(filePath);
            console.log('Menu file cleaned up');
        } catch (cleanupError) {
            console.warn('Could not clean up menu file:', cleanupError.message);
        }

        // Enhanced audio feature mapping with cultural context
        const audioFeatureAdjustments = mapMenuToAudioFeatures(menuAnalysis, restaurantName, vibe);

        return res.status(200).json({
            success: true,
            analysis: {
                ...menuAnalysis,
                audio_feature_adjustments: audioFeatureAdjustments
            },
            filename: file.originalFilename || file.originalName || file.name || 'menu_analysis',
            api_used: 'openai_vision_menu_cultural',
            debug: {
                restaurant_name: restaurantName,
                business_type: businessType,
                vibe: vibe,
                cultural_context_applied: true
            }
        });

    } catch (error) {
        console.error('Menu analysis error:', error);

        return res.status(500).json({
            error: 'Failed to analyze menu',
            details: error.message,
            fallback_analysis: {
                menu_items: ['Analysis failed - fallback data'],
                cuisine_type: 'international',
                sophistication_level: 0.7,
                cultural_indicators: [],
                price_tier: 'mid-range',
                dietary_options: ['standard'],
                confidence_score: 0.0,
                pricing_analysis: {
                    pricing_level: 'mid-range',
                    average_price: 0,
                    price_range: [0, 0],
                    meal_type: 'unknown',
                    upscale_keywords_found: 0,
                    upscale_boost: 0,
                    pricing_reasoning: ['Analysis failed - using fallback']
                },
                audio_feature_adjustments: {
                    acousticness_boost: 0,
                    energy_adjustment: 0,
                    instrumentalness_boost: 0,
                    tempo_adjustment: 0,
                    valence_adjustment: 0,
                    cultural_genres: [],
                    cultural_context: null,
                    reasoning: ['Menu analysis failed - using fallback values']
                }
            }
        });
    }
}