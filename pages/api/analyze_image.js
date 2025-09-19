// pages/api/analyze_image.js - OpenAI Vision Analysis
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
                console.log('📁 Parsed files:', Object.keys(files));
                console.log('📁 File details:', files.file);
                resolve({ fields, files });
            }
        });
    });
}

function imageToBase64(filepath) {
    const imageBuffer = fs.readFileSync(filepath);
    return imageBuffer.toString('base64');
}

function parseAnalysisResponse(text) {
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
        console.warn('Failed to parse OpenAI response as JSON:', error);

        // Fallback: extract key information with regex
        return extractFallbackAnalysis(text);
    }
}

function extractFallbackAnalysis(text) {
    // Fallback parsing when JSON fails
    const sophisticationMatch = text.match(/sophistication.*?(\d\.?\d*)/i);
    const energyMatch = text.match(/energy.*?(\d\.?\d*)/i);

    return {
        dominant_colors: ["#2C3E50", "#E8DCC6", "#D4AF37"],
        sophistication_level: sophisticationMatch ? parseFloat(sophisticationMatch[1]) : 0.7,
        energy_level: energyMatch ? parseFloat(energyMatch[1]) : 0.5,
        style_keywords: extractKeywords(text),
        price_signals: extractPriceSignals(text),
        detected_text: [],
        business_type: "restaurant",
        target_demographic: "general",
        atmosphere_cues: ["welcoming", "professional"],
        confidence_score: 0.7,
        raw_response: text
    };
}

function extractKeywords(text) {
    const keywords = [];
    const keywordPatterns = [
        /modern/gi, /traditional/gi, /elegant/gi, /casual/gi, /warm/gi,
        /sophisticated/gi, /rustic/gi, /contemporary/gi, /vintage/gi, /premium/gi
    ];

    keywordPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            keywords.push(matches[0].toLowerCase());
        }
    });

    return [...new Set(keywords)].slice(0, 5);
}

function extractPriceSignals(text) {
    if (/luxury|expensive|premium|high-end/i.test(text)) return "luxury";
    if (/mid-range|moderate|average/i.test(text)) return "mid-range";
    if (/budget|affordable|cheap|low-cost/i.test(text)) return "budget";
    return "mid-range";
}

function mapVisualToAudioFeatures(visualAnalysis) {
    /**
     * Convert visual analysis to audio feature adjustments
     * These will be applied to the base operational goal features
     */

    const sophistication = visualAnalysis.sophistication_level || 0.5;
    const energy = visualAnalysis.energy_level || 0.5;

    return {
        acousticness_boost: sophistication * 0.2, // Higher sophistication = more acoustic
        energy_adjustment: (energy - 0.5) * 0.15, // Visual energy affects audio energy
        instrumentalness_boost: sophistication * 0.15, // Sophisticated spaces prefer instrumental
        tempo_adjustment: (energy - 0.5) * 15, // Visual energy affects tempo (±15 BPM max)
        valence_adjustment: (energy - 0.5) * 0.1, // Visual energy affects mood
        reasoning: [
            `Visual sophistication (${(sophistication * 10).toFixed(1)}/10) → +${(sophistication * 0.2).toFixed(2)} acousticness`,
            `Visual energy (${(energy * 10).toFixed(1)}/10) → ${energy > 0.5 ? '+' : ''}${((energy - 0.5) * 0.15).toFixed(2)} energy`,
            `Sophistication → +${(sophistication * 0.15).toFixed(2)} instrumentalness`,
            `Visual energy → ${energy > 0.5 ? '+' : ''}${((energy - 0.5) * 15).toFixed(0)} BPM tempo adjustment`
        ]
    };
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

    console.log('🔑 OpenAI API key found:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');

    try {
        // Parse the uploaded file
        const { files } = await parseForm(req);
        console.log('📁 Received files:', files);

        // Handle formidable v3 file structure
        let file = files.file;

        // formidable v3 returns array of files
        if (Array.isArray(file)) {
            file = file[0];
        }

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('📁 File object:', file);
        console.log('📁 File properties:', Object.keys(file));

        // Get the correct file path (formidable v3 uses 'filepath' property)
        const filePath = file.filepath || file.path;

        if (!filePath) {
            return res.status(400).json({
                error: 'File path not found',
                details: 'Unable to locate uploaded file path',
                file_properties: Object.keys(file)
            });
        }

        console.log('📁 Using file path:', filePath);

        // Convert image to base64
        const base64Image = imageToBase64(filePath);

        console.log('🖼️ Analyzing image with OpenAI Vision API...');
        console.log('📁 File size:', base64Image.length, 'chars');

        // OpenAI Vision API call with better error handling
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Updated model name
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                                detail: "low" // Use "low" for cost efficiency, "high" for detailed analysis
                            }
                        },
                        {
                            type: "text",
                            text: `Analyze this hospitality/restaurant business image for music selection optimization. 

Please return a JSON response with this exact structure:

{
  "dominant_colors": ["#hex1", "#hex2", "#hex3"],
  "sophistication_level": 0.8,
  "energy_level": 0.4,
  "style_keywords": ["modern", "warm", "premium"],
  "price_signals": "mid-range",
  "detected_text": ["menu items or text found"],
  "business_type": "fine_dining",
  "target_demographic": "professionals_families",
  "atmosphere_cues": ["welcoming", "sophisticated"],
  "confidence_score": 0.85
}

Focus on visual elements that would influence music characteristics:
- Sophistication level (0-1): How upscale/refined does the space look?
- Energy level (0-1): How energetic/dynamic is the visual design?
- Style keywords: Descriptive words about the aesthetic
- Price signals: budget/mid-range/premium/luxury based on visual cues
- Target demographic: Who seems to be the intended customer base?
- Atmosphere cues: What mood does the space convey?

Be specific and analytical about visual design elements.`
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

        const analysisData = parseAnalysisResponse(analysisText);

        // Clean up temporary file
        try {
            fs.unlinkSync(filePath);
            console.log('🗑️ Temporary file cleaned up');
        } catch (cleanupError) {
            console.warn('⚠️ Could not clean up temporary file:', cleanupError.message);
        }

        // Map visual analysis to audio feature adjustments
        const audioFeatureAdjustments = mapVisualToAudioFeatures(analysisData);

        return res.status(200).json({
            success: true,
            analysis: {
                ...analysisData,
                audio_feature_adjustments: audioFeatureAdjustments
            },
            filename: file.originalFilename || file.originalName || file.name || 'uploaded_image',
            api_used: 'openai_vision',
            debug: {
                api_key_present: !!process.env.OPENAI_API_KEY,
                response_received: true
            }
        });

    } catch (error) {
        console.error('🚨 Image analysis error:', error);
        console.error('🚨 Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // Return a detailed error response
        return res.status(500).json({
            error: 'Failed to analyze image',
            details: error.message,
            error_type: error.name,
            fallback_analysis: {
                dominant_colors: ["#2C3E50", "#E8DCC6", "#D4AF37"],
                sophistication_level: 0.7,
                energy_level: 0.5,
                style_keywords: ["error_fallback"],
                price_signals: "mid-range",
                detected_text: [],
                business_type: "restaurant",
                target_demographic: "general",
                atmosphere_cues: ["professional"],
                confidence_score: 0.0,
                audio_feature_adjustments: {
                    acousticness_boost: 0,
                    energy_adjustment: 0,
                    instrumentalness_boost: 0,
                    tempo_adjustment: 0,
                    valence_adjustment: 0,
                    reasoning: ["Analysis failed - using fallback values"]
                }
            }
        });
    }
}