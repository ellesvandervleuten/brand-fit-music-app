// components/tabs/VisualAnalysis.jsx — foto's en menukaart uploaden
import React, { useRef } from 'react';
import { Camera, Upload, FileText, Info, X } from 'lucide-react';
import { analyzeImageWithOpenAI } from '../../lib/logic';

export default function VisualAnalysis({
    uploadedImages, setUploadedImages,
    // NIEUW: Menu state
    menuImages, setMenuImages,
    menuAnalysis, setMenuAnalysis,
    isAnalyzingMenu, setIsAnalyzingMenu,
    fileInputRef,
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
        <div className="space-y-4">
            {/* Privacy-melding: uploads gaan naar OpenAI */}
            <div className="flex items-start gap-3 bg-card border border-line rounded-card p-4 text-[13px] text-muted-strong">
                <Info className="shrink-0 mt-0.5 text-copper" size={18} />
                <p>
                    Foto’s en menukaarten die je hier uploadt worden geanalyseerd door OpenAI.
                    De bestanden worden na de analyse direct van onze server verwijderd.
                    Upload geen foto’s waarop mensen herkenbaar in beeld zijn.
                </p>
            </div>

            {/* Menukaart: telt mee voor de muziekkeuze */}
            <section className="bg-card rounded-card border border-line p-5 sm:p-6">
                <h3 className="text-[20px] text-ink mb-1">Menukaart</h3>
                <p className="text-muted mb-5">
                    Aan je menu zien we welke keuken je hebt en in welke prijsklasse je zit. Dat telt mee voor de muziek.
                    {brandData?.restaurantName && <> Voor <span className="text-ink font-medium">{brandData.restaurantName}</span>.</>}
                </p>

                {menuImages && menuImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {menuImages.map((menu) => (
                            <UploadTile
                                key={menu.id}
                                item={menu}
                                onRemove={() => removeMenuImage(menu.id)}
                            />
                        ))}
                    </div>
                )}

                <button
                    onClick={() => menuInputRef.current?.click()}
                    disabled={isAnalyzingMenu}
                    className="min-h-[44px] px-5 rounded-input bg-ink text-cream font-semibold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                >
                    <Upload size={18} />
                    {isAnalyzingMenu ? 'Bezig met lezen…' : menuImages?.length ? 'Nog een menu toevoegen' : 'Menu uploaden'}
                </button>
                <p className="text-muted text-[13px] mt-2">Foto of PDF</p>
                <input
                    ref={menuInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleMenuUpload}
                    className="hidden"
                />

                {menuAnalysis && <MenuSummary analysis={menuAnalysis} />}
            </section>

            {/* Foto's van de zaak */}
            <section className="bg-card rounded-card border border-line p-5 sm:p-6">
                <h3 className="text-[20px] text-ink mb-1">Foto’s van je zaak</h3>
                <p className="text-muted mb-5">Interieur, logo of andere beelden van je zaak.</p>

                {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {uploadedImages.map((image) => (
                            <UploadTile
                                key={image.id}
                                item={image}
                                onRemove={() => setUploadedImages((prev) => prev.filter((img) => img.id !== image.id))}
                            />
                        ))}
                    </div>
                )}

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-5 rounded-input bg-sand text-ink font-semibold inline-flex items-center gap-2 hover:opacity-90"
                >
                    <Camera size={18} />
                    {uploadedImages.length ? 'Meer foto’s toevoegen' : 'Foto’s kiezen'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </section>

            {(uploadedImages.length > 0 || menuAnalysis) && (
                <div className="bg-card rounded-card border border-line p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[20px] text-ink">Klaar met uploaden?</h3>
                        <p className="text-muted">We passen je muziekprofiel aan op wat we gezien hebben.</p>
                    </div>
                    <button
                        onClick={onReanalyze}
                        className="min-h-[44px] px-6 rounded-input bg-ink text-cream font-semibold hover:opacity-90"
                    >
                        Bekijk je muziek
                    </button>
                </div>
            )}
        </div>
    );
}

function UploadTile({ item, onRemove }) {
    const isPdf = /\.pdf$/i.test(item.name || '') || String(item.src || '').startsWith('data:application/pdf');
    const status = item.analyzing ? 'Bezig…' : item.error ? 'Niet gelukt' : item.analysis ? 'Gelezen' : '';
    return (
        <div className="relative rounded-input overflow-hidden border border-line bg-sand">
            {isPdf ? (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-strong px-2">
                    <FileText size={28} />
                    <span className="text-[12px] truncate max-w-full">{item.name}</span>
                </div>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt={item.name} className="w-full h-32 object-cover" />
            )}
            {status && (
                <span
                    className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                        item.error ? 'bg-copper-soft text-copper-text' : 'bg-card/90 text-ink'
                    }`}
                >
                    {status}
                </span>
            )}
            <button
                onClick={onRemove}
                aria-label="Verwijderen"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/90 text-ink flex items-center justify-center hover:bg-card"
            >
                <X size={16} />
            </button>
        </div>
    );
}

const PRICE_LABELS = {
    budget: 'Betaalbaar',
    'mid-range': 'Middenklasse',
    upscale: 'Hoger segment',
    premium: 'Exclusief',
};

const MEAL_LABELS = {
    breakfast: 'Ontbijt',
    lunch: 'Lunch',
    dinner: 'Diner',
};

function MenuSummary({ analysis }) {
    const pricing = analysis.pricing_analysis;
    const genres = analysis.audio_feature_adjustments?.cultural_genres || [];
    return (
        <div className="mt-6 pt-5 border-t border-line">
            <p className="uppercase text-[12px] tracking-[0.1em] font-semibold text-muted mb-3">Wat we zagen</p>
            {pricing && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <Stat label="Prijsklasse" value={PRICE_LABELS[pricing.pricing_level] || pricing.pricing_level} strong />
                    <Stat label="Gemiddelde prijs" value={pricing.average_price ? `€ ${pricing.average_price}` : '–'} />
                    <Stat label="Vooral" value={MEAL_LABELS[pricing.meal_type] || pricing.meal_type} />
                </div>
            )}
            {genres.length > 0 && (
                <div>
                    <p className="text-muted text-[13px] mb-2">Muziek die bij je keuken past</p>
                    <div className="flex flex-wrap gap-2">
                        {genres.map((g, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-apricot-soft text-ink text-[13px] font-medium capitalize">
                                {g}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, strong = false }) {
    return (
        <div>
            <p className="text-muted text-[13px]">{label}</p>
            <p className={`tabular-nums ${strong ? 'font-display text-[20px] text-ink' : 'text-muted-strong font-medium'}`}>{value}</p>
        </div>
    );
}
