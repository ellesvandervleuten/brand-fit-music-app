// components/tabs/QuestionWizard.jsx - vragenlijst in 8 stappen (Mise-huisstijl)
import React from 'react';
import { CheckCircle, Store, Coffee, Utensils, Wine, Clock, Users, DollarSign, Timer, BarChart3, Star } from 'lucide-react';

const iconClass = "mr-3 shrink-0 text-muted-strong";

// Let op: de `id`s hieronder worden opgeslagen in brandData en gebruikt door de logica.
// Alleen labels en uitleg mogen wijzigen.
const brandQuestions = {
    1: {
        title: "Hoe heet je zaak?",
        subtitle: "Dan zetten we de naam van je zaak op het advies.",
        type: "text",
        required: true
    },
    2: {
        title: "Wat voor zaak heb je?",
        subtitle: "Kies wat er het meest op lijkt.",
        type: "single",
        options: [
            {
                id: "fine_dining",
                label: "Fine dining",
                subtitle: "Uitgebreid en culinair, gasten komen voor de ervaring",
                icon: <Utensils className={iconClass} size={20} />
            },
            {
                id: "casual_dining",
                label: "Restaurant",
                subtitle: "Ongedwongen lekker uit eten",
                icon: <Store className={iconClass} size={20} />
            },
            {
                id: "brunch_breakfast",
                label: "Ontbijt- of brunchzaak",
                subtitle: "Vooral open in de ochtend en rond lunchtijd",
                icon: <Coffee className={iconClass} size={20} />
            },
            {
                id: "coffee_shop",
                label: "Koffiezaak",
                subtitle: "Koffie met iets lekkers of een lichte lunch",
                icon: <Coffee className={iconClass} size={20} />
            },
            {
                id: "bar_lounge",
                label: "Bar of lounge",
                subtitle: "Draait om drankjes en sfeer",
                icon: <Wine className={iconClass} size={20} />
            },
            {
                id: "quick_service",
                label: "Snel eten en afhalen",
                subtitle: "Gasten zijn snel geholpen of nemen het mee",
                icon: <Clock className={iconClass} size={20} />
            }
        ]
    },
    3: {
        title: "Wat wil je met de muziek bereiken?",
        subtitle: "Kies wat voor jou het belangrijkst is.",
        type: "single",
        options: [
            {
                id: "high_revenue_per_customer",
                label: "Gasten blijven langer en bestellen meer",
                subtitle: "Nog een drankje, toch een dessert",
                icon: <DollarSign className={iconClass} size={20} />
            },
            {
                id: "high_table_turnover",
                label: "Snellere doorloop van tafels",
                subtitle: "Meer gasten op een drukke dag",
                icon: <Timer className={iconClass} size={20} />
            },
            {
                id: "balanced_operation",
                label: "Mooi in balans",
                subtitle: "Een beetje van allebei",
                icon: <BarChart3 className={iconClass} size={20} />
            },
            {
                id: "premium_experience",
                label: "Luxere sfeer",
                subtitle: "De beleving gaat voor alles",
                icon: <Star className={iconClass} size={20} />
            }
        ]
    },
    4: {
        title: "Welke sfeer past het best bij je zaak?",
        subtitle: "Denk aan je keuken, inrichting en uitstraling.",
        type: "single",
        options: [
            {
                id: "local_authentic",
                label: "Lokaal en authentiek",
                subtitle: "Streekgerechten en eigen tradities",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "european_sophisticated",
                label: "Europees en verfijnd",
                subtitle: "Stijlvol, met een Europese keuken",
                icon: <Wine className={iconClass} size={20} />
            },
            {
                id: "international_modern",
                label: "Internationaal en modern",
                subtitle: "Smaken uit de hele wereld, eigentijds",
                icon: <Store className={iconClass} size={20} />
            },
            {
                id: "classic_timeless",
                label: "Klassiek en tijdloos",
                subtitle: "Elegant, zonder modegrillen",
                icon: <Utensils className={iconClass} size={20} />
            }
        ]
    },
    5: {
        title: "Wie zijn je gasten vooral?",
        subtitle: "Je mag meerdere groepen kiezen.",
        type: "multiple",
        options: [
            {
                id: "young_adults",
                label: "Jongeren (18 tot 35)",
                subtitle: "Studenten en starters",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "business_professionals",
                label: "Zakelijke gasten",
                subtitle: "Zakenlunch, afspraak of overleg",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "families_groups",
                label: "Gezinnen en vriendengroepen",
                subtitle: "Gezellig samen uit eten",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "locals_regulars",
                label: "Buurtbewoners en vaste gasten",
                subtitle: "Mensen die je bij naam kent",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "seniors_mature",
                label: "50-plussers",
                subtitle: "Houden van rust, kwaliteit en comfort",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "tourists_visitors",
                label: "Toeristen en dagjesmensen",
                subtitle: "Gasten van buiten de stad",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "food_enthusiasts",
                label: "Echte fijnproevers",
                subtitle: "Komen voor goed eten en vakmanschap",
                icon: <Users className={iconClass} size={20} />
            },
            {
                id: "quick_convenience",
                label: "Gasten met haast",
                subtitle: "Snel iets halen of eten, onderweg",
                icon: <Timer className={iconClass} size={20} />
            }
        ]
    },
    7: {
        title: "Welke woorden passen bij je zaak?",
        subtitle: "Kies er een paar, maximaal 5.",
        type: "vibes",
        options: [
            { id: "luxurious", label: "Luxe" },
            { id: "hip", label: "Hip" },
            { id: "modern", label: "Modern" },
            { id: "traditional", label: "Traditioneel" },
            { id: "rough", label: "Stoer en ruig" },
            { id: "happy", label: "Vrolijk" },
            { id: "serious", label: "Serieus" },
            { id: "calm", label: "Rustig" },
            { id: "upbeat", label: "Swingend" },
            { id: "romantic", label: "Romantisch" },
            { id: "authentic", label: "Echt en eerlijk" },
            { id: "energetic", label: "Energiek" },
            { id: "youthful", label: "Jong" }
        ]
    },
    8: {
        title: "Welke muziek wil je liever niet horen?",
        subtitle: "Deze stijlen laten we weg. Niets kiezen mag ook.",
        type: "multiple",
        options: [
            { id: "heavy_metal", label: "Heavy metal" },
            { id: "country", label: "Country" },
            { id: "rap_hip_hop", label: "Rap en hiphop" },
            { id: "electronic_dance", label: "Elektronisch en dance" },
            { id: "punk_rock", label: "Punk en rock" },
            { id: "classical", label: "Klassiek" },
            { id: "reggae", label: "Reggae" },
            { id: "folk", label: "Folk" }
        ]
    }
};

const primaryButton = "ml-auto min-h-[44px] px-6 py-2 rounded-input bg-ink text-cream font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed";
const secondaryButton = "min-h-[44px] px-5 py-2 rounded-input bg-sand text-ink font-semibold hover:opacity-90";
const cardClass = "bg-card rounded-card border border-line p-6 text-ink";

function WizardHeader({ title, subtitle, step, totalSteps }) {
    const completed = Math.max(0, Math.min(totalSteps, step - 1));
    return (
        <div className="mb-6">
            <div className="flex gap-1.5 mb-2" aria-hidden="true">
                {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                        key={i}
                        className={`h-2 w-full rounded-block ${i < completed ? 'bg-copper' : 'bg-sand'}`}
                    />
                ))}
            </div>
            <p className="text-sm text-muted mb-4">Stap {step} van {totalSteps}</p>
            <h2 className="text-xl text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
    );
}

export default function QuestionWizard({
    analysisStep,
    setAnalysisStep,
    brandData,
    setBrandData,
    onAnalyze,
}) {
    const handleQuestionAnswer = (questionId, answerId, isMultiple = false) => {
        setBrandData((prev) => {
            if (isMultiple) {
                const currentAnswers = prev[`q${questionId}`] || [];
                const newAnswers = currentAnswers.includes(answerId)
                    ? currentAnswers.filter((id) => id !== answerId)
                    : [...currentAnswers, answerId];
                return { ...prev, [`q${questionId}`]: newAnswers };
            } else {
                return { ...prev, [`q${questionId}`]: answerId };
            }
        });
    };

    const handleTextInput = (value) => {
        setBrandData(prev => ({ ...prev, restaurantName: value }));
    };

    const question = brandQuestions[analysisStep];
    if (!question) return null;

    // Stap 6 (sfeer per dagdeel) is vervallen: die gaf één raar gemiddelde over de hele dag.
    // De stapnummers 7 en 8 (q7, q8) blijven intern gelijk; we slaan 6 over.
    const LAST_STEP = 8;
    const totalSteps = 7;
    const nextStep = (s) => (s === 5 ? 7 : s + 1);
    const prevStep = (s) => (s === 7 ? 5 : s - 1);
    const shownStep = (s) => (s > 6 ? s - 1 : s);

    // Stap 1: naam van de zaak
    if (question.type === 'text') {
        return (
            <div className={cardClass}>
                <WizardHeader title={question.title} subtitle={question.subtitle} step={shownStep(analysisStep)} totalSteps={totalSteps} />

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Bijv. Café de Zon of Restaurant Valencia"
                        value={brandData.restaurantName || ''}
                        onChange={(e) => handleTextInput(e.target.value)}
                        className="w-full p-4 rounded-input border border-line-strong bg-card text-lg text-ink focus:border-ink focus:outline-none"
                        autoFocus
                    />
                    {brandData.restaurantName && brandData.restaurantName.length > 0 && (
                        <p className="mt-2 text-sm text-ink">
                            Mooi, we stellen muziek samen die past bij {brandData.restaurantName}.
                        </p>
                    )}
                </div>

                <div className="flex justify-between">
                    <div></div>
                    <button
                        onClick={() => setAnalysisStep(2)}
                        className={primaryButton}
                        disabled={!brandData.restaurantName || brandData.restaurantName.trim().length === 0}
                    >
                        Volgende
                    </button>
                </div>
            </div>
        );
    }

    // Stap 7: woorden die bij de zaak passen
    if (question.type === 'vibes') {
        const chosen = brandData[`q${analysisStep}`] || [];
        return (
            <div className={cardClass}>
                <WizardHeader title={question.title} subtitle={question.subtitle} step={shownStep(analysisStep)} totalSteps={totalSteps} />

                <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => {
                        const selected = chosen.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleQuestionAnswer(analysisStep, option.id, true)}
                                className={`min-h-[44px] px-4 py-2 rounded-full font-medium border text-ink disabled:opacity-40 disabled:cursor-not-allowed ${selected
                                    ? 'bg-apricot-soft border-apricot'
                                    : 'bg-card border-line hover:border-line-strong'
                                    }`}
                                disabled={brandData[`q${analysisStep}`]?.length >= 5 && !brandData[`q${analysisStep}`]?.includes(option.id)}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {chosen.length > 0 && (
                    <p className="mt-4 text-sm text-muted">
                        {chosen.length} van maximaal 5 gekozen
                    </p>
                )}

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => setAnalysisStep(prevStep(analysisStep))}
                        className={secondaryButton}
                    >
                        Vorige
                    </button>
                    <button
                        onClick={() => setAnalysisStep(nextStep(analysisStep))}
                        className={primaryButton}
                        disabled={!brandData[`q${analysisStep}`]?.length}
                    >
                        Volgende
                    </button>
                </div>
            </div>
        );
    }

    // Stap 8: muziek die je niet wilt
    if (analysisStep === 8) {
        const q = brandQuestions[8];
        return (
            <div className={cardClass}>
                <WizardHeader title={q.title} subtitle={q.subtitle} step={totalSteps} totalSteps={totalSteps} />

                <div className="flex flex-wrap gap-2">
                    {q.options.map((option) => {
                        const selected = brandData.q8?.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleQuestionAnswer(8, option.id, true)}
                                className={`min-h-[44px] px-4 py-2 rounded-full font-medium border text-ink ${selected
                                    ? 'bg-apricot-soft border-apricot'
                                    : 'bg-card border-line hover:border-line-strong'
                                    }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {brandData.q8?.length > 0 && (
                    <div className="mt-4 p-3 rounded-input bg-copper-soft">
                        <p className="text-sm text-copper-text">
                            {brandData.q8.length === 1
                                ? '1 muziekstijl komt niet in je playlist.'
                                : `${brandData.q8.length} muziekstijlen komen niet in je playlist.`}
                        </p>
                    </div>
                )}

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => setAnalysisStep(7)}
                        className={secondaryButton}
                    >
                        Vorige
                    </button>
                    <button
                        onClick={onAnalyze}
                        className={primaryButton}
                    >
                        {brandData.restaurantName ? `Maak het muziekadvies voor ${brandData.restaurantName}` : 'Maak mijn muziekadvies'}
                    </button>
                </div>
            </div>
        );
    }

    // Stap 2 t/m 5: één of meer keuzes uit een lijst
    return (
        <div className={cardClass}>
            <WizardHeader title={question.title} subtitle={question.subtitle} step={shownStep(analysisStep)} totalSteps={totalSteps} />

            <div className="space-y-3">
                {question.options.map((option) => {
                    const selected = question.type === 'multiple'
                        ? brandData[`q${analysisStep}`]?.includes(option.id)
                        : brandData[`q${analysisStep}`] === option.id;

                    return (
                        <button
                            key={option.id}
                            onClick={() => {
                                handleQuestionAnswer(analysisStep, option.id, question.type === 'multiple');
                                if (question.type === 'single' && analysisStep < LAST_STEP) {
                                    setTimeout(() => setAnalysisStep(nextStep(analysisStep)), 250);
                                }
                            }}
                            className={`w-full min-h-[44px] p-4 text-left border rounded-input text-ink ${selected
                                ? 'bg-apricot-soft border-apricot'
                                : 'bg-card border-line hover:border-line-strong'
                                }`}
                        >
                            <div className="flex items-center">
                                {option.icon}
                                <div className="flex-1">
                                    <span className="font-semibold">{option.label}</span>
                                    {option.subtitle && <div className="text-sm text-muted mt-1">{option.subtitle}</div>}
                                </div>
                                {question.type === 'multiple' && selected && <CheckCircle className="ml-3 shrink-0 text-ink" size={20} />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 flex justify-between">
                {analysisStep > 1 && (
                    <button
                        onClick={() => setAnalysisStep(prevStep(analysisStep))}
                        className={secondaryButton}
                    >
                        Vorige
                    </button>
                )}

                {analysisStep < LAST_STEP && question.type === 'multiple' && (
                    <button
                        onClick={() => setAnalysisStep(nextStep(analysisStep))}
                        className={primaryButton}
                        disabled={!brandData[`q${analysisStep}`]?.length}
                    >
                        Volgende
                    </button>
                )}
            </div>
        </div>
    );
}
