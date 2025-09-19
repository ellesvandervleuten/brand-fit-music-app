// pages/api/analyze_website.js - OpenAI Vision for Website/Menu Analysis
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
                console.log('📁 Parsed website files:', Object.keys(files));
                resolve({ fields, files });
            }
        });
    });
}

function imageToBase64(filepath) {
    const imageBuffer = fs.readFileSync(filepath);
    return imageBuffer.toString('base64');
}

function parseWebsiteAnalysisResponse(text) {
    try {
        // Find JSON in response
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;

        if (start !== -1 && end > start) {
            const jsonStr = text.slice(start, end);
            return JSON.parse(jsonStr);
        }

        throw new Error('No JSON found in response');
    } catch (error) {
        console.warn('Failed to parse OpenAI website response as JSON:', error);

        // Fallback: extract key information with regex
        return extractWebsiteFallbackAnalysis(text);
    }
}

function extractWebsiteFallbackAnalysis(text) {
    // Extract business type from the actual response
    let businessType = "restaurant";
    if (/fine.dining|upscale|luxury/i.test(text)) businessType = "fine_dining";
    else if (/casual|family|bistro/i.test(text)) businessType = "casual_dining";
    else if (/coffee|café|cafe/i.test(text)) businessType = "coffee_shop";
    else if (/bar|pub|lounge/i.test(text)) businessType = "bar_lounge";
    else if (/quick|fast|takeaway/i.test(text)) businessType = "quick_service";

    // Extract price signals from actual text
    let priceRange = "mid-range";
    if (/\€[3-9][0-9]|\$[3-9][0-9]|expensive|luxury|premium/i.test(text)) priceRange = "premium";
    else if (/\€[1-2][0-9]|\$[1-2][0-9]|affordable|budget/i.test(text)) priceRange = "budget";

    return {
        detected_text: {
            restaurant_name: extractRestaurantName(text),
            menu_items: extractMenuItems(text),
            prices: extractPrices(text),
            taglines: extractTaglines(text),
            keywords: extractBusinessKeywords(text)
        },
        visual_cues: {
            color_palette: extractColors(text),
            typography_style: extractTypography(text),
            photography_style: extractPhotographyStyle(text),
            layout_complexity: extractLayoutComplexity(text),
            whitespace_usage: extractWhitespaceUsage(text)
        },
        business_indicators: {
            business_type: businessType,
            price_range: priceRange,
            service_style: businessType.replace('_', '-'),
            cuisine_type: extractCuisineType(text),
            target_demographic: extractTargetDemo(text),
            atmosphere_cues: extractAtmosphereCues(text)
        },
        content_keywords: extractBusinessKeywords(text),
        target_demographic: extractTargetDemo(text),
        confidence_score: 0.7,
        raw_response: text,
        note: "Fallback parsing - JSON parsing failed"
    };
}

function extractColors(text) {
    // Try to extract actual colors mentioned in the response
    const colorMatches = text.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
    if (colorMatches && colorMatches.length > 0) {
        return colorMatches.slice(0, 3);
    }

    // Extract color names and convert to hex approximations
    const colors = [];
    const colorMap = {
        'blue': '#2563EB', 'green': '#16A34A', 'red': '#DC2626',
        'orange': '#EA580C', 'purple': '#9333EA', 'yellow': '#CA8A04',
        'gray': '#6B7280', 'black': '#1F2937', 'white': '#F9FAFB',
        'brown': '#92400E', 'gold': '#D97706', 'silver': '#9CA3AF',
        'navy': '#1E3A8A', 'teal': '#0D9488', 'pink': '#EC4899'
    };

    Object.entries(colorMap).forEach(([colorName, hex]) => {
        if (new RegExp(colorName, 'i').test(text) && colors.length < 3) {
            colors.push(hex);
        }
    });

    return colors.length > 0 ? colors : ["unknown"];
}

function extractTypography(text) {
    if (/serif|traditional|classic/i.test(text)) return "serif";
    if (/sans.serif|modern|clean/i.test(text)) return "sans-serif";
    if (/script|handwritten|cursive/i.test(text)) return "script";
    if (/bold|heavy|thick/i.test(text)) return "bold";
    if (/elegant|refined/i.test(text)) return "elegant";
    return "modern";
}

function extractPhotographyStyle(text) {
    if (/professional|high.quality|polished/i.test(text)) return "professional";
    if (/casual|candid|natural/i.test(text)) return "casual";
    if (/artistic|creative|stylized/i.test(text)) return "artistic";
    if (/minimal|clean|simple/i.test(text)) return "minimal";
    if (/dark|moody|dramatic/i.test(text)) return "moody";
    return "standard";
}

function extractLayoutComplexity(text) {
    if (/complex|busy|cluttered|lots.of.elements/i.test(text)) return 0.8;
    if (/simple|clean|minimal|sparse/i.test(text)) return 0.3;
    if (/moderate|balanced|organized/i.test(text)) return 0.6;
    return 0.5; // neutral
}

function extractWhitespaceUsage(text) {
    if (/lots.of.space|spacious|airy|minimal/i.test(text)) return 0.8;
    if (/cramped|dense|packed|tight/i.test(text)) return 0.3;
    if (/balanced|moderate.spacing/i.test(text)) return 0.6;
    return 0.5; // neutral
}

function extractRestaurantName(text) {
    const nameMatch = text.match(/restaurant\s+([A-Za-z\s]+)|([A-Za-z\s]+)\s+restaurant/i);
    return nameMatch ? nameMatch[1] || nameMatch[2] : "Restaurant Name";
}

function extractMenuItems(text) {
    const items = [];
    const itemPatterns = [
        /([A-Za-z\s]+)\s*[\€\$]\s*(\d+)/g,
        /(pasta|pizza|steak|burger|salad|soup)[A-Za-z\s]*/gi,
        /(breakfast|lunch|dinner|appetizer)[A-Za-z\s]*/gi
    ];

    itemPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            if (match[0] && match[0].length > 3) {
                items.push(match[0].trim());
            }
        }
    });

    return [...new Set(items)].slice(0, 10);
}

function extractPrices(text) {
    const priceMatches = text.match(/[\€\$]\s*\d+[\.,]?\d*/g) || [];
    return priceMatches.slice(0, 10);
}

function extractTaglines(text) {
    const taglines = [];
    const taglinePatterns = [
        /fresh|local|authentic|premium|artisanal|homemade|traditional/gi,
        /seasonal|organic|sustainable|farm.to.table/gi
    ];

    taglinePatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            taglines.push(...matches);
        }
    });

    return [...new Set(taglines)].slice(0, 5);
}

function extractBusinessKeywords(text) {
    const keywords = [];
    const patterns = [
        /modern|contemporary|traditional|rustic|elegant|casual|cozy|intimate/gi,
        /family|business|romantic|group|celebration|event/gi,
        /breakfast|brunch|lunch|dinner|drinks|cocktails|wine/gi
    ];

    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            keywords.push(...matches);
        }
    });

    return [...new Set(keywords.map(k => k.toLowerCase()))].slice(0, 8);
}

function extractCuisineType(text) {
    const cuisines = [
        'italian', 'french', 'american', 'asian', 'mediterranean', 'mexican',
        'indian', 'japanese', 'chinese', 'thai', 'greek', 'spanish', 'european'
    ];

    for (const cuisine of cuisines) {
        if (new RegExp(cuisine, 'i').test(text)) {
            return cuisine;
        }
    }

    return "international";
}

function extractTargetDemo(text) {
    if (/family|children|kids/i.test(text)) return "families";
    if (/business|professional|corporate|meeting/i.test(text)) return "business_professionals";
    if (/young|student|casual|trendy/i.test(text)) return "young_adults";
    if (/fine|luxury|upscale|premium/i.test(text)) return "affluent_diners";
    if (/local|neighborhood|community/i.test(text)) return "locals_regulars";

    return "general_public";
}

function extractAtmosphereCues(text) {
    const cues = [];
    const patterns = {
        'welcoming': /welcome|friendly|warm|inviting/i,
        'sophisticated': /sophisticated|elegant|refined|upscale/i,
        'casual': /casual|relaxed|laid.back|comfortable/i,
        'romantic': /romantic|intimate|cozy|date/i,
        'energetic': /lively|vibrant|energetic|bustling/i,
        'professional': /professional|business|corporate|meeting/i
    };

    Object.entries(patterns).forEach(([cue, pattern]) => {
        if (pattern.test(text)) {
            cues.push(cue);
        }
    });

    return cues.length > 0 ? cues : ['welcoming', 'professional'];
}

function mapWebsiteToAudioFeatures(websiteAnalysis) {
    /**
     * Convert website/menu analysis to audio feature adjustments
     */

    const businessType = websiteAnalysis.business_indicators?.business_type || 'restaurant';
    const priceRange = websiteAnalysis.business_indicators?.price_range || 'mid-range';
    const atmosphereCues = websiteAnalysis.business_indicators?.atmosphere_cues || [];

    let adjustments = {
        acousticness_boost: 0,
        energy_adjustment: 0,
        instrumentalness_boost: 0,
        tempo_adjustment: 0,
        valence_adjustment: 0,
        reasoning: []
    };

    // Business type adjustments
    if (businessType === 'fine_dining') {
        adjustments.acousticness_boost += 0.2;
        adjustments.instrumentalness_boost += 0.15;
        adjustments.tempo_adjustment -= 10;
        adjustments.reasoning.push("Fine dining detected → +0.2 acousticness, +0.15 instrumentalness, -10 BPM");
    } else if (businessType === 'coffee_shop') {
        adjustments.acousticness_boost += 0.15;
        adjustments.instrumentalness_boost += 0.1;
        adjustments.reasoning.push("Coffee shop detected → +0.15 acousticness, +0.1 instrumentalness");
    } else if (businessType === 'quick_service') {
        adjustments.energy_adjustment += 0.1;
        adjustments.tempo_adjustment += 8;
        adjustments.reasoning.push("Quick service detected → +0.1 energy, +8 BPM");
    }

    // Price range adjustments
    if (priceRange === 'premium' || priceRange === 'luxury') {
        adjustments.acousticness_boost += 0.1;
        adjustments.instrumentalness_boost += 0.1;
        adjustments.energy_adjustment -= 0.05;
        adjustments.reasoning.push(`${priceRange} pricing → +0.1 acousticness, +0.1 instrumentalness, -0.05 energy`);
    } else if (priceRange === 'budget') {
        adjustments.energy_adjustment += 0.05;
        adjustments.valence_adjustment += 0.05;
        adjustments.reasoning.push("Budget pricing → +0.05 energy, +0.05 valence");
    }

    // Atmosphere adjustments
    atmosphereCues.forEach(cue => {
        switch (cue) {
            case 'sophisticated':
                adjustments.acousticness_boost += 0.05;
                adjustments.instrumentalness_boost += 0.05;
                adjustments.reasoning.push("Sophisticated atmosphere → acoustic & instrumental boost");
                break;
            case 'romantic':
                adjustments.energy_adjustment -= 0.05;
                adjustments.tempo_adjustment -= 5;
                adjustments.instrumentalness_boost += 0.05;
                adjustments.reasoning.push("Romantic atmosphere → calmer, more instrumental");
                break;
            case 'energetic':
                adjustments.energy_adjustment += 0.1;
                adjustments.tempo_adjustment += 5;
                adjustments.valence_adjustment += 0.05;
                adjustments.reasoning.push("Energetic atmosphere → more energy & tempo");
                break;
            case 'casual':
                adjustments.valence_adjustment += 0.05;
                adjustments.reasoning.push("Casual atmosphere → positive valence boost");
                break;
        }
    });

    return adjustments;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
            error: 'OpenAI API key not configured',
            details: 'Please add OPENAI_API_KEY to your .env.local file'
        });
    }

    console.log('🔑 OpenAI API key found for website analysis');

    try {
        // Parse the uploaded file
        const { files } = await parseForm(req);

        // Handle formidable v3 file structure
        let file = files.file;
        if (Array.isArray(file)) {
            file = file[0];
        }

        if (!file) {
            return res.status(400).json({ error: 'No website screenshot uploaded' });
        }

        // Get the correct file path
        const filePath = file.filepath || file.path;

        if (!filePath) {
            return res.status(400).json({
                error: 'File path not found',
                details: 'Unable to locate uploaded website screenshot'
            });
        }

        console.log('🌐 Analyzing website/menu with OpenAI Vision API...');

        // Convert image to base64
        const base64Image = imageToBase64(filePath);

        // OpenAI Vision API call with website-specific prompt
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
                                detail: "high" // Use high detail for website/menu analysis
                            }
                        },
                        {
                            type: "text",
                            text: `Analyze this restaurant/hospitality business website or menu image for comprehensive business intelligence. This could be a website homepage, menu card, or business documentation.

Please return a JSON response with this exact structure:

{
  "detected_text": {
    "restaurant_name": "Name of the business",
    "menu_items": ["Item 1", "Item 2", "etc"],
    "prices": ["€15", "€22", "etc"],
    "taglines": ["Fresh local ingredients", "etc"],
    "keywords": ["organic", "seasonal", "etc"]
  },
  "visual_cues": {
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "typography_style": "serif/sans-serif/script/modern",
    "photography_style": "professional/casual/artistic/minimal", 
    "layout_complexity": 0.7,
    "whitespace_usage": 0.6
  },
  "business_indicators": {
    "business_type": "fine_dining/casual_dining/coffee_shop/bar_lounge/quick_service",
    "price_range": "budget/mid-range/premium/luxury",
    "service_style": "fine-dining/casual-dining/quick-service",
    "cuisine_type": "italian/french/american/asian/etc",
    "target_demographic": "families/business_professionals/young_adults/etc",
    "atmosphere_cues": ["welcoming", "sophisticated", "casual", "energetic"]
  },
  "content_keywords": ["fresh", "local", "seasonal"],
  "target_demographic": "families_professionals",
  "confidence_score": 0.85
}

IMPORTANT INSTRUCTIONS:
- Analyze the ACTUAL colors you see in the image and provide real hex codes
- Describe the ACTUAL typography style you observe
- Assess the REAL layout complexity (0.1 = very simple, 1.0 = very complex)
- Evaluate the ACTUAL whitespace usage (0.1 = cramped, 1.0 = lots of space)
- Extract ALL visible text including menu items and prices
- Identify the true business type and price range based on visual cues
- Be specific about what you actually see, not generic descriptions
- If you can't determine something, say "unknown" rather than guessing

Focus on what would influence music selection for this business.`
                        }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0.3 // Lower temperature for more consistent results
        });

        console.log('✅ OpenAI Vision API response received');
        console.log('📄 Response type:', typeof response);
        console.log('📄 Response structure:', Object.keys(response));

        // Check if we got a valid response
        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error('Invalid response structure from OpenAI API');
        }

        // Parse the response
        const analysisText = response.choices[0].message.content;
        console.log('📄 Analysis text received:', analysisText.substring(0, 200) + '...');

        const analysisData = parseWebsiteAnalysisResponse(analysisText);

        // Clean up temporary file
        try {
            fs.unlinkSync(filePath);
            console.log('🗑️ Temporary file cleaned up');
        } catch (cleanupError) {
            console.warn('⚠️ Could not clean up temporary file:', cleanupError.message);
        }

        // Map website analysis to audio feature adjustments
        const audioFeatureAdjustments = mapWebsiteToAudioFeatures(analysisData);

        return res.status(200).json({
            success: true,
            analysis: {
                ...analysisData,
                audio_feature_adjustments: audioFeatureAdjustments
            },
            filename: file.originalFilename || file.originalName || file.name || 'uploaded_website',
            api_used: 'openai_vision_website',
            debug: {
                api_key_present: !!process.env.OPENAI_API_KEY,
                response_received: true
            }
        });

    } catch (error) {
        console.error('🚨 Website analysis error:', error);
        console.error('🚨 Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // Return a detailed error response
        return res.status(500).json({
            error: 'Failed to analyze website',
            details: error.message,
            error_type: error.name,
            fallback_analysis: {
                detected_text: {
                    restaurant_name: "Analysis Failed",
                    menu_items: [],
                    prices: [],
                    taglines: [],
                    keywords: []
                },
                visual_cues: {
                    color_palette: ["unknown"],
                    typography_style: "unknown",
                    photography_style: "unknown",
                    layout_complexity: 0.5,
                    whitespace_usage: 0.5
                },
                business_indicators: {
                    business_type: "restaurant",
                    price_range: "mid-range",
                    service_style: "casual-dining",
                    cuisine_type: "unknown",
                    target_demographic: "general",
                    atmosphere_cues: ["professional"]
                },
                content_keywords: ["analysis_failed"],
                target_demographic: "general",
                confidence_score: 0.0,
                audio_feature_adjustments: {
                    acousticness_boost: 0,
                    energy_adjustment: 0,
                    instrumentalness_boost: 0,
                    tempo_adjustment: 0,
                    valence_adjustment: 0,
                    reasoning: ["Website analysis failed - using fallback values"]
                }
            }
        });
    }
}