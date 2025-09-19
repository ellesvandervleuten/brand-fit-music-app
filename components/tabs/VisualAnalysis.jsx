// components/tabs/VisualAnalysis.jsx - Updated met Menu Upload
import React, { useRef } from 'react';
import { Camera, Upload, FileText, Eye, X } from 'lucide-react';
import { analyzeImageWithOpenAI, analyzeWebsiteWithOpenAI } from '../../lib/logic';

export default function VisualAnalysis({
    uploadedImages, setUploadedImages,
    websiteScreenshot, setWebsiteScreenshot,
    websiteAnalysis, setWebsiteAnalysis,
    isAnalyzingScreenshot, setIsAnalyzingScreenshot,
    // NIEUW: Menu state
    menuImages, setMenuImages,
    menuAnalysis, setMenuAnalysis,
    isAnalyzingMenu, setIsAnalyzingMenu,
    fileInputRef, screenshotInputRef,
    onReanalyze,
    // NIEUW: Restaurant data voor context
    brandData
}) {
    const menuInputRef = useRef(null);

    // Bestaande interieur foto upload functie
    const handleImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const id = Date.now() + Math.random();
                const newImage = { id, src: e.target.result, name: file.name, analysis: null, analyzing: true };
                setUploadedImages((prev) => [...prev, newImage]);

                try {
                    const analysis = await analyzeImageWithOpenAI(file);
                    setUploadedImages((prev) =>
                        prev.map((img) => (img.id === id ? { ...img, analysis, analyzing: false } : img))
                    );
                } catch (err) {
                    setUploadedImages((prev) =>
                        prev.map((img) => (img.id === id ? { ...img, analysis: null, analyzing: false, error: String(err) } : img))
                    );
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Bestaande website screenshot upload functie
    const handleScreenshotUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            setWebsiteScreenshot(e.target.result);
            setIsAnalyzingScreenshot(true);
            setWebsiteAnalysis({ status: 'analyzing' });

            try {
                const analysis = await analyzeWebsiteWithOpenAI(file);
                setWebsiteAnalysis(analysis);
            } catch (err) {
                setWebsiteAnalysis({ error: String(err), confidence_score: 0 });
            } finally {
                setIsAnalyzingScreenshot(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // NIEUW: Handle menu upload
    const handleMenuUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setIsAnalyzingMenu(true);
        const uploadedMenus = [];

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const id = Date.now() + Math.random();
                const newMenu = {
                    id,
                    src: e.target.result,
                    name: file.name,
                    analyzing: true,
                    analysis: null
                };
                uploadedMenus.push(newMenu);
                setMenuImages([...uploadedMenus]);

                try {
                    // Gebruik de nieuwe menu API
                    const formData = new FormData();
                    formData.append('file', file);

                    // Voeg restaurant context toe
                    if (brandData?.restaurantName) {
                        formData.append('restaurantName', brandData.restaurantName);
                    }
                    if (brandData?.q2) {
                        formData.append('businessType', brandData.q2);
                    }
                    // NIEUWE REGEL: Voeg vibe toe voor cultural context
                    if (brandData?.q3) {
                        formData.append('vibe', brandData.q3);
                    }

                    const response = await fetch('/api/analyze_menu', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    const analysis = data.success ? data.analysis : data.fallback_analysis;

                    // Update de specifieke menu analyse
                    setMenuImages(prev =>
                        prev.map(menu =>
                            menu.id === id
                                ? { ...menu, analysis, analyzing: false, error: data.success ? null : data.error }
                                : menu
                        )
                    );

                    // Set gecombineerde analyse voor de eerste succesvolle analyse
                    if (data.success && !menuAnalysis) {
                        setMenuAnalysis(analysis);
                    }

                } catch (error) {
                    console.error('Menu analysis error:', error);
                    setMenuImages(prev =>
                        prev.map(menu =>
                            menu.id === id
                                ? { ...menu, analyzing: false, error: error.message }
                                : menu
                        )
                    );
                }
            };
            reader.readAsDataURL(file);
        }

        setIsAnalyzingMenu(false);
    };
    const removeMenuImage = (id) => {
        setMenuImages(prev => prev.filter(menu => menu.id !== id));
    };

    return (
        <div className="space-y-8">
            {/* Visual Images (bestaand) */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Camera className="mr-2 text-blue-500" /> Visual Brand Analysis
                </h3>

                <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center mb-6">
                    {uploadedImages.length > 0 ? (
                        <div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {uploadedImages.map((image) => (
                                    <div key={image.id} className="relative">
                                        <img src={image.src} alt={image.name} className="w-full h-32 object-cover rounded border" />
                                        <div className="absolute bottom-1 left-1 right-1">
                                            <div
                                                className={`text-xs px-2 py-1 rounded text-white ${image.analysis ? 'bg-green-500' :
                                                    image.analyzing ? 'bg-yellow-500' :
                                                        image.error ? 'bg-red-500' : 'bg-gray-500'
                                                    }`}
                                            >
                                                {image.analysis ? 'Geanalyseerd' : image.analyzing ? 'Analyseren...' : image.error ? 'Error' : 'Pending'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setUploadedImages((prev) => prev.filter((img) => img.id !== image.id))}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center mx-auto"
                            >
                                <Upload className="mr-2" size={16} /> Voeg meer toe
                            </button>
                        </div>
                    ) : (
                        <div>
                            <Camera className="mx-auto text-blue-400 mb-4" size={48} />
                            <h4 className="text-lg font-medium mb-2">Upload Brand Visuals</h4>
                            <p className="text-gray-600 mb-4">Logo, interieur foto's, branding materiaal</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center mx-auto"
                            >
                                <Upload className="mr-2" size={20} /> Kies Brand Images
                            </button>
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </div>
            </div>

            {/* Website Screenshot (bestaand) */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Eye className="mr-2 text-green-500" /> Website Analysis
                </h3>

                <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center mb-6">
                    {websiteScreenshot ? (
                        <div>
                            <img
                                src={websiteScreenshot}
                                alt="Website Screenshot"
                                className="max-w-full h-64 object-contain mx-auto rounded border mb-4"
                            />

                            {isAnalyzingScreenshot && (
                                <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                                        <span className="text-yellow-800">Analyzing website with OpenAI Vision...</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => screenshotInputRef.current?.click()}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                    disabled={isAnalyzingScreenshot}
                                >
                                    <Upload className="mr-2 inline" size={16} /> Upload Another
                                </button>
                                <button
                                    onClick={() => {
                                        setWebsiteScreenshot(null);
                                        setWebsiteAnalysis(null);
                                    }}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    disabled={isAnalyzingScreenshot}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Eye className="mx-auto text-green-400 mb-4" size={48} />
                            <h4 className="text-lg font-medium mb-2">Upload Website Screenshot</h4>
                            <p className="text-gray-600 mb-4">Screenshot van website homepage voor AI analyse</p>
                            <button
                                onClick={() => screenshotInputRef.current?.click()}
                                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center mx-auto"
                            >
                                <Upload className="mr-2" size={20} /> Upload Website
                            </button>
                        </div>
                    )}
                    <input
                        ref={screenshotInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                    />
                </div>

                {websiteAnalysis && websiteAnalysis.status !== 'analyzing' && !isAnalyzingScreenshot && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 text-green-800">Website Analysis Results</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium text-gray-800">Business Type</div>
                                <div className="text-green-600">
                                    {websiteAnalysis.business_indicators?.business_type?.replace('_', ' ') || 'N/A'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium text-gray-800">Price Range</div>
                                <div className="text-green-600 capitalize">{websiteAnalysis.business_indicators?.price_range || 'N/A'}</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium text-gray-800">Cuisine</div>
                                <div className="text-green-600 capitalize">
                                    {websiteAnalysis.business_indicators?.cuisine_type || 'N/A'}
                                </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium text-gray-800">Confidence</div>
                                <div className="text-green-600">{((websiteAnalysis.confidence_score || 0) * 100).toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* NIEUW: Menu Upload Sectie */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <FileText className="mr-2 text-purple-500" /> Menu Analysis
                </h3>

                <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center mb-6">
                    {menuImages && menuImages.length > 0 ? (
                        <div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {menuImages.map((menu) => (
                                    <div key={menu.id} className="relative">
                                        <img src={menu.src} alt={menu.name} className="w-full h-32 object-cover rounded border" />
                                        <div className="absolute bottom-1 left-1 right-1">
                                            <div
                                                className={`text-xs px-2 py-1 rounded text-white ${menu.analysis ? 'bg-green-500' :
                                                    menu.analyzing ? 'bg-yellow-500' :
                                                        menu.error ? 'bg-red-500' : 'bg-gray-500'
                                                    }`}
                                            >
                                                {menu.analysis ? 'Geanalyseerd' : menu.analyzing ? 'Analyseren...' : menu.error ? 'Error' : 'Pending'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeMenuImage(menu.id)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => menuInputRef.current?.click()}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center mx-auto"
                                disabled={isAnalyzingMenu}
                            >
                                <Upload className="mr-2" size={16} /> Voeg meer menu's toe
                            </button>
                        </div>
                    ) : (
                        <div>
                            <FileText className="mx-auto text-purple-400 mb-4" size={48} />
                            <h4 className="text-lg font-medium mb-2">Upload Menu</h4>
                            <p className="text-gray-600 mb-4">
                                Menukaart foto's voor prijsanalyse en culturele context
                                {brandData?.restaurantName && (
                                    <span className="block text-sm text-purple-600 mt-1">
                                        Gekoppeld aan {brandData.restaurantName}
                                    </span>
                                )}
                            </p>
                            <button
                                onClick={() => menuInputRef.current?.click()}
                                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center mx-auto"
                                disabled={isAnalyzingMenu}
                            >
                                <Upload className="mr-2" size={20} />
                                {isAnalyzingMenu ? 'Analyseren...' : 'Upload Menu'}
                            </button>
                        </div>
                    )}
                    <input
                        ref={menuInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={handleMenuUpload}
                        className="hidden"
                    />
                </div>

                {/* Menu Analysis Results */}
                {menuAnalysis && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 text-purple-800">Menu Analysis Results</h4>

                        {/* Pricing Info */}
                        {menuAnalysis.pricing_analysis && (
                            <div className="mb-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                                    <div className="text-center p-2 bg-white rounded">
                                        <div className="font-medium text-gray-800">Pricing Level</div>
                                        <div className="text-purple-600 capitalize">
                                            {menuAnalysis.pricing_analysis.pricing_level}
                                        </div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                        <div className="font-medium text-gray-800">Avg Price</div>
                                        <div className="text-purple-600">
                                            €{menuAnalysis.pricing_analysis.average_price}
                                        </div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                        <div className="font-medium text-gray-800">Meal Type</div>
                                        <div className="text-purple-600 capitalize">
                                            {menuAnalysis.pricing_analysis.meal_type}
                                        </div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                        <div className="font-medium text-gray-800">Upscale Keywords</div>
                                        <div className="text-purple-600">
                                            {menuAnalysis.pricing_analysis.upscale_keywords_found}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cultural Genres */}
                        {menuAnalysis.audio_feature_adjustments?.cultural_genres?.length > 0 && (
                            <div className="mb-3">
                                <div className="font-medium text-gray-800 mb-2">Cultural Music Genres:</div>
                                <div className="flex flex-wrap gap-2">
                                    {menuAnalysis.audio_feature_adjustments.cultural_genres.map((genre, i) => (
                                        <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                            {genre}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sophistication & Features */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <strong>Sophistication:</strong> {((menuAnalysis.sophistication_level || 0.7) * 10).toFixed(1)}/10
                            </div>
                            <div>
                                <strong>Confidence:</strong> {((menuAnalysis.confidence_score || 0) * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Heranalyse button (bestaand) */}
            {(uploadedImages.length > 0 || websiteAnalysis || menuAnalysis) && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-lg mb-1">Integreer Visual Data</h4>
                            <p className="text-sm opacity-90">Heranalyse met visual input, website en menu data voor optimale features</p>
                        </div>
                        <button
                            onClick={onReanalyze}
                            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
                        >
                            Heranalyse
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}