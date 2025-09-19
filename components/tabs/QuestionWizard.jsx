// components/tabs/QuestionWizard.jsx - FIXED met bedrijfsdoelen
import React from 'react';
import { CheckCircle, Store, Coffee, Utensils, Wine, Clock, Users, DollarSign, Timer, BarChart3, Star } from 'lucide-react';

// NIEUWE brandQuestions met bedrijfsdoelen toegevoegd
const brandQuestions = {
    1: {
        title: "Wat is de naam van je restaurant/zaak?",
        subtitle: "Dit helpt ons je brand te personaliseren",
        type: "text",
        required: true
    },
    2: {
        title: "Wat voor type zaak heb je?",
        subtitle: "Kies het type dat het beste bij je zaak past",
        type: "single",
        options: [
            {
                id: "fine_dining",
                label: "Fine Dining",
                subtitle: "Hoogwaardige culinaire ervaring",
                icon: <Utensils className="mr-3 text-purple-600" size={20} />
            },
            {
                id: "casual_dining",
                label: "Casual Dining",
                subtitle: "Ontspannen eetervaring",
                icon: <Store className="mr-3 text-blue-600" size={20} />
            },
            {
                id: "brunch_breakfast",
                label: "Brunch/Breakfast Spot",
                subtitle: "Ontbijt en brunch specialist",
                icon: <Coffee className="mr-3 text-orange-600" size={20} />
            },
            {
                id: "coffee_shop",
                label: "Coffee Shop",
                subtitle: "Koffie en lichte maaltijden",
                icon: <Coffee className="mr-3 text-brown-600" size={20} />
            },
            {
                id: "bar_lounge",
                label: "Bar/Lounge",
                subtitle: "Drinks en sfeer",
                icon: <Wine className="mr-3 text-red-600" size={20} />
            },
            {
                id: "quick_service",
                label: "Quick Service",
                subtitle: "Snelle service en takeaway",
                icon: <Clock className="mr-3 text-green-600" size={20} />
            }
        ]
    },
    3: {
        title: "Wat is je primaire bedrijfsdoel met muziek?",
        subtitle: "Kies wat je vooral wilt bereiken",
        type: "single",
        options: [
            {
                id: "high_revenue_per_customer",
                label: "Maximaliseer besteding per klant",
                subtitle: "Langere verblijven, hogere uitgaven",
                icon: <DollarSign className="mr-3 text-green-600" size={20} />
            },
            {
                id: "high_table_turnover",
                label: "Maximaliseer tafelomzet",
                subtitle: "Snellere doorstroming, meer klanten",
                icon: <Timer className="mr-3 text-blue-600" size={20} />
            },
            {
                id: "balanced_operation",
                label: "Gebalanceerde operatie",
                subtitle: "Beide optimaliseren",
                icon: <BarChart3 className="mr-3 text-purple-600" size={20} />
            },
            {
                id: "premium_experience",
                label: "Premium ervaring",
                subtitle: "Sophistication boven alles",
                icon: <Star className="mr-3 text-yellow-600" size={20} />
            }
        ]
    },
    4: {
        title: "Welke vibe past het beste bij je zaak?",
        subtitle: "Kies de atmosfeer die je wilt uitstralen",
        type: "single",
        options: [
            {
                id: "local_authentic",
                label: "Lokaal & Authentiek",
                subtitle: "Lokale tradities en gerechten",
                icon: <Users className="mr-3 text-green-600" size={20} />
            },
            {
                id: "european_sophisticated",
                label: "Europees & Sophisticated",
                subtitle: "Verfijnde Europese stijl",
                icon: <Wine className="mr-3 text-purple-600" size={20} />
            },
            {
                id: "international_modern",
                label: "International & Modern",
                subtitle: "Wereldse en hedendaagse aanpak",
                icon: <Store className="mr-3 text-blue-600" size={20} />
            },
            {
                id: "classic_timeless",
                label: "Classic & Timeless",
                subtitle: "Tijdloze elegantie",
                icon: <Utensils className="mr-3 text-gray-600" size={20} />
            }
        ]
    },
    5: {
        title: "Wat wil je bereiken met achtergrondmuziek?",
        subtitle: "Kies per dagdeel de gewenste sfeer",
        type: "time_based",
        timeSlots: {
            morning: {
                label: "Ochtend (8:00-12:00)",
                options: [
                    { id: "energetic_start", label: "Energieke start", color: "bg-yellow-100 text-yellow-800" },
                    { id: "calm_focus", label: "Rustige focus", color: "bg-blue-100 text-blue-800" },
                    { id: "social_buzz", label: "Social buzz", color: "bg-green-100 text-green-800" }
                ]
            },
            afternoon: {
                label: "Middag (12:00-17:00)",
                options: [
                    { id: "productive_atmosphere", label: "Productieve sfeer", color: "bg-purple-100 text-purple-800" },
                    { id: "relaxed_dining", label: "Ontspannen dineren", color: "bg-blue-100 text-blue-800" },
                    { id: "background_ambiance", label: "Achtergrond ambiance", color: "bg-gray-100 text-gray-800" }
                ]
            },
            evening: {
                label: "Avond (17:00-23:00)",
                options: [
                    { id: "sophisticated_dining", label: "Verfijnd dineren", color: "bg-purple-100 text-purple-800" },
                    { id: "social_atmosphere", label: "Sociale sfeer", color: "bg-red-100 text-red-800" },
                    { id: "intimate_setting", label: "Intieme setting", color: "bg-pink-100 text-pink-800" }
                ]
            }
        }
    },
    6: {
        title: "Snelle vibes check - Welke woorden beschrijven jouw zaak het beste?",
        subtitle: "Kies 3-5 woorden",
        type: "vibes",
        options: [
            { id: "luxurious", label: "Luxurious", color: "bg-purple-100 text-purple-800" },
            { id: "hip", label: "Hip", color: "bg-pink-100 text-pink-800" },
            { id: "modern", label: "Modern", color: "bg-blue-100 text-blue-800" },
            { id: "traditional", label: "Traditional", color: "bg-amber-100 text-amber-800" },
            { id: "rough", label: "Rough", color: "bg-stone-100 text-stone-800" },
            { id: "happy", label: "Happy", color: "bg-yellow-100 text-yellow-800" },
            { id: "serious", label: "Serious", color: "bg-gray-100 text-gray-800" },
            { id: "calm", label: "Calm", color: "bg-green-100 text-green-800" },
            { id: "upbeat", label: "Upbeat", color: "bg-orange-100 text-orange-800" },
            { id: "romantic", label: "Romantic", color: "bg-rose-100 text-rose-800" },
            { id: "authentic", label: "Authentic", color: "bg-emerald-100 text-emerald-800" },
            { id: "energetic", label: "Energetic", color: "bg-red-100 text-red-800" },
            { id: "youthful", label: "Youthful", color: "bg-cyan-100 text-cyan-800" }
        ]
    },
    7: {
        title: "Welke muziekstijlen wil je absoluut vermijden?",
        subtitle: "Deze genres worden uitgesloten van je playlist",
        type: "multiple",
        options: [
            { id: "heavy_metal", label: "Heavy Metal", color: "bg-red-100 text-red-800" },
            { id: "country", label: "Country", color: "bg-orange-100 text-orange-800" },
            { id: "rap_hip_hop", label: "Rap/Hip-Hop", color: "bg-purple-100 text-purple-800" },
            { id: "electronic_dance", label: "Electronic/Dance", color: "bg-blue-100 text-blue-800" },
            { id: "punk_rock", label: "Punk/Rock", color: "bg-red-100 text-red-800" },
            { id: "classical", label: "Klassiek", color: "bg-gray-100 text-gray-800" },
            { id: "reggae", label: "Reggae", color: "bg-green-100 text-green-800" },
            { id: "folk", label: "Folk", color: "bg-brown-100 text-brown-800" }
        ]
    }
};

export default function QuestionWizard({
    analysisStep,
    setAnalysisStep,
    brandData,
    setBrandData,
    onAnalyze,
}) {
    const handleQuestionAnswer = (questionId, answerId, isMultiple = false, timeSlot = null) => {
        setBrandData((prev) => {
            if (questionId === 5 && timeSlot) { // Time-based is now step 5
                const timeData = prev.q5 || {};
                return { ...prev, q5: { ...timeData, [timeSlot]: answerId } };
            } else if (isMultiple) {
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

    // Text input voor restaurant naam (stap 1)
    if (question.type === 'text') {
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">{question.title}</h2>
                            <p className="text-sm text-gray-600 mt-1">{question.subtitle}</p>
                        </div>
                        <span className="text-sm text-gray-500">Stap {analysisStep}/7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(analysisStep / 7) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Bijv. Café de Zon, Restaurant Valencia, The Holy..."
                        value={brandData.restaurantName || ''}
                        onChange={(e) => handleTextInput(e.target.value)}
                        className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        autoFocus
                    />
                    {brandData.restaurantName && brandData.restaurantName.length > 0 && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                            Perfect! We gaan een gepersonaliseerde playlist maken voor {brandData.restaurantName}
                        </div>
                    )}
                </div>

                <div className="flex justify-between">
                    <div></div>
                    <button
                        onClick={() => setAnalysisStep(2)}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                        disabled={!brandData.restaurantName || brandData.restaurantName.trim().length === 0}
                    >
                        Volgende
                    </button>
                </div>
            </div>
        );
    }

    // Time-based UI (nu stap 5)
    if (question.type === 'time_based') {
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">{question.title}</h2>
                            <p className="text-sm text-gray-600 mt-1">{question.subtitle}</p>
                        </div>
                        <span className="text-sm text-gray-500">Stap {analysisStep}/7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(analysisStep / 7) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    {Object.entries(question.timeSlots).map(([timeSlot, slotData]) => (
                        <div key={timeSlot} className="border rounded-lg p-4">
                            <h3 className="font-medium mb-3">{slotData.label}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {slotData.options.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleQuestionAnswer(analysisStep, option.id, false, timeSlot)}
                                        className={`p-3 rounded-lg text-center font-medium transition-all border ${brandData.q5?.[timeSlot] === option.id
                                            ? `${option.color} border-current`
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => setAnalysisStep(analysisStep - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Vorige
                    </button>
                    <button
                        onClick={() => setAnalysisStep(analysisStep + 1)}
                        className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        disabled={!brandData.q5 || Object.keys(brandData.q5).length === 0}
                    >
                        Volgende
                    </button>
                </div>
            </div>
        );
    }

    // Vibes UI (nu stap 6)
    if (question.type === 'vibes') {
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">{question.title}</h2>
                            <p className="text-sm text-gray-600 mt-1">{question.subtitle}</p>
                        </div>
                        <span className="text-sm text-gray-500">Stap {analysisStep}/7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(analysisStep / 7) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {question.options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleQuestionAnswer(analysisStep, option.id, true)}
                            className={`p-3 rounded-full text-center font-medium transition-all border ${brandData[`q${analysisStep}`]?.includes(option.id)
                                ? `${option.color} border-current transform scale-105`
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            disabled={brandData[`q${analysisStep}`]?.length >= 5 && !brandData[`q${analysisStep}`]?.includes(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {brandData[`q${analysisStep}`]?.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            Geselecteerd: {brandData[`q${analysisStep}`]?.length || 0} van max 5 woorden
                        </p>
                    </div>
                )}

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => setAnalysisStep(analysisStep - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Vorige
                    </button>
                    <button
                        onClick={() => setAnalysisStep(7)}
                        className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        disabled={!brandData[`q${analysisStep}`]?.length}
                    >
                        Volgende
                    </button>
                </div>
            </div>
        );
    }

    // Exclusions (nu stap 7)
    if (analysisStep === 7) {
        const q = brandQuestions[7];
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">{q.title}</h2>
                            <p className="text-sm text-gray-600 mt-1">{q.subtitle}</p>
                        </div>
                        <span className="text-sm text-gray-500">Stap 7/7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: '100%' }} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {q.options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleQuestionAnswer(7, option.id, true)}
                            className={`p-3 rounded-lg text-left font-medium transition-all border ${brandData.q7?.includes(option.id)
                                ? `${option.color} border-current transform scale-105`
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {brandData.q7?.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-800">
                            Uitgesloten: {brandData.q7?.length || 0} genres – deze worden gefilterd uit je playlist
                        </p>
                    </div>
                )}

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => setAnalysisStep(6)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Vorige
                    </button>
                    <button
                        onClick={onAnalyze}
                        className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        {brandData.restaurantName ? `Analyseer ${brandData.restaurantName}` : 'Analyseer Mijn Brand'}
                    </button>
                </div>
            </div>
        );
    }

    // Standaard single/multiple vraag (stap 2, 3, 4)
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold">{question.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{question.subtitle}</p>
                    </div>
                    <span className="text-sm text-gray-500">Stap {analysisStep}/7</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(analysisStep / 7) * 100}%` }}
                    />
                </div>
            </div>

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
                                if (question.type === 'single' && analysisStep < 7) {
                                    setTimeout(() => setAnalysisStep(analysisStep + 1), 250);
                                }
                            }}
                            className={`w-full p-4 text-left border rounded-lg transition-all hover:border-blue-500 hover:bg-blue-50 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                }`}
                        >
                            <div className="flex items-center">
                                {option.icon}
                                <div className="flex-1">
                                    <span className="font-medium">{option.label}</span>
                                    {option.subtitle && <div className="text-sm text-gray-600 mt-1">{option.subtitle}</div>}
                                </div>
                                {question.type === 'multiple' && selected && <CheckCircle className="ml-auto text-blue-500" size={20} />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 flex justify-between">
                {analysisStep > 1 && (
                    <button
                        onClick={() => setAnalysisStep(analysisStep - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Vorige
                    </button>
                )}

                {analysisStep < 7 && question.type === 'multiple' && (
                    <button
                        onClick={() => setAnalysisStep(analysisStep + 1)}
                        className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        disabled={!brandData[`q${analysisStep}`]?.length}
                    >
                        Volgende
                    </button>
                )}
            </div>
        </div>
    );
}