
// components/BrandFitMusicTool.jsx - RocketScience met standaard Tailwind
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Camera as CameraIcon, BarChart3, Beaker, Database, Rocket } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';

import QuestionWizard from './tabs/QuestionWizard';
import VisualAnalysis from './tabs/VisualAnalysis';
import ResultsPanel from './tabs/ResultsPanel';
import ResearchDatabase from './tabs/ResearchDatabase';

import {
    loadTop2000Database,
    calculateOptimalMusicProfile,
    calculateROI,
    generateImplementationPlan,
    calculateMatchScore,
} from '../lib/logic';

export default function BrandFitMusicTool() {
    const [activeTab, setActiveTab] = useState('analyzer');

    // ——— Global state ———
    const [analysisStep, setAnalysisStep] = useState(1);
    const [brandData, setBrandData] = useState({});
    const [uploadedImages, setUploadedImages] = useState([]);
    const [websiteAnalysis, setWebsiteAnalysis] = useState(null);
    const [websiteScreenshot, setWebsiteScreenshot] = useState(null);
    const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);

    const [analysisResults, setAnalysisResults] = useState(null);
    const [spotifyPlaylist, setSpotifyPlaylist] = useState(null);
    const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);

    const [menuImages, setMenuImages] = useState([]);
    const [menuAnalysis, setMenuAnalysis] = useState(null);
    const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);

    // Database integration state
    const [enrichedDatabase, setEnrichedDatabase] = useState(null);
    const [databaseStats, setDatabaseStats] = useState(null);
    const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
    const [playlistMethod, setPlaylistMethod] = useState('database');

    const [top2000Database, setTop2000Database] = useState(null);

    const fileInputRef = useRef(null);
    const screenshotInputRef = useRef(null);

    const { status } = useSession();

    // Load databases on mount
    useEffect(() => {
        (async () => {
            const data = await loadTop2000Database();
            setTop2000Database(data || []);
            await loadEnrichedDatabaseData();
        })();
    }, []);

    const loadEnrichedDatabaseData = async () => {
        setIsLoadingDatabase(true);
        try {
            const response = await fetch('/api/database/stats');
            if (response.ok) {
                const stats = await response.json();
                setDatabaseStats(stats);
                console.log('📊 Database stats loaded:', stats);
            } else {
                console.warn('⚠️ Could not load database stats');
            }
        } catch (error) {
            console.error('❌ Error loading database:', error);
        } finally {
            setIsLoadingDatabase(false);
        }
    };

    const calculateBrandFit = () => {
        const music_profile = calculateOptimalMusicProfile({
            brandData,
            websiteAnalysis,
            menuAnalysis
        });

        const roi_projection = calculateROI(music_profile);
        const implementation_plan = generateImplementationPlan(music_profile);

        setAnalysisResults({ music_profile, roi_projection, implementation_plan });
    };

    const generateSpotifyPlaylist = async () => {
        if (!analysisResults) return;
        if (status !== 'authenticated') return signIn('spotify');

        setIsGeneratingPlaylist(true);
        try {
            const { music_profile } = analysisResults;

            const apiEndpoint = playlistMethod === 'database'
                ? '/api/create_playlist_database'
                : '/api/create_playlist';

            const requestBody = {
                audio_features: music_profile.features,
                genres: music_profile.secondary_genres,
                cultural_genres: music_profile.cultural_context?.cultural_genres || [],
                cultural_context: music_profile.cultural_context || null,
                year_preferences: music_profile.year_preferences || null,
                excluded_genres: brandData.q8 || [],
                operational_goal: music_profile.operational_goal || 'balanced_operation',
                playlistName: `🚀 RocketScience Brand-Fit Playlist (${playlistMethod === 'database' ? 'Database' : 'Live API'})`,
                playlistDescription: `Generated using ${playlistMethod === 'database' ? 'database-first' : 'features-first'} scientific approach`,
            };

            console.log(`🎵 Creating playlist using ${playlistMethod} method:`, requestBody);

            const resp = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await resp.json();

            if (!resp.ok) {
                // Handle specific error cases
                if (resp.status === 403 && data.existingPlaylist) {
                    // User already has a playlist - show friendly message instead of crashing
                    alert(`Je hebt al een RocketScience playlist!\n\nNaam: ${data.existingPlaylist.name}\nAangemaakt: ${new Date(data.existingPlaylist.created_at).toLocaleDateString()}\n\nJe kunt maar één playlist per account hebben.`);
                    return; // Exit gracefully instead of throwing error
                }
                
                throw new Error(data.error || 'Failed to create playlist');
            }

            console.log('✅ Playlist creation response:', data);

            const tracks = (data.tracks || []).map((t) => ({
                name: t.name,
                artist: t.artist,
                bpm: t.tempo,
                energy: t.energy,
                acousticness: t.acousticness ?? 0.5,
                danceability: t.danceability ?? 0.3,
                valence: t.valence ?? 0.6,
                instrumentalness: t.instrumentalness ?? 0.5,
                url: t.uri ? `https://open.spotify.com/track/${t.id}` : null,
                artists: [{ name: t.artist }],
                match_score: t.match_score || 0,
                has_spotify_data: t.has_spotify_data || false,
                source: t.source || playlistMethod
            }));

            setSpotifyPlaylist({
                name: data.playlist?.name || '🚀 RocketScience Brand-Fit Playlist',
                description: data.playlist?.description || 'Features-first scientific approach',
                tracks,
                match_score: data.meta?.match_quality || calculateMatchScore(music_profile.features, tracks, top2000Database),
                estimated_impact: music_profile.predicted_impact,
                url: data.playlist?.url,
                method: playlistMethod,
                database_info: data.database_info,
                meta: data.meta,
                note: data.note
            });

            if (data.playlist?.url) {
                window.open(data.playlist.url, '_blank');
            }

        } catch (error) {
            console.error('❌ Playlist generation failed:', error);
            alert(`Failed to create playlist: ${error.message}`);
        } finally {
            setIsGeneratingPlaylist(false);
        }
    };

    const tabs = [
        { id: 'analyzer', label: 'Business Analyzer', icon: <Brain size={20} /> },
        { id: 'visual', label: 'Visual Analysis', icon: <CameraIcon size={20} /> },
        { id: 'results', label: 'Scientific Results', icon: <BarChart3 size={20} /> },
        { id: 'database', label: 'Research Foundation', icon: <Beaker size={20} /> },
    ];

    return (
        <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-indigo-50 via-white to-orange-50 min-h-screen">
            {/* Header - RocketScience Styling */}
            <div className="mb-8">
                <div className="flex items-center justify-center mb-4">
                    <Rocket className="h-12 w-12 text-orange-500 mr-4 drop-shadow-lg animate-pulse" />
                    <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-orange-600 bg-clip-text text-transparent">
                        RocketScience Music Tool
                    </h1>
                </div>
                <p className="text-center text-gray-700 text-lg mb-4">
                    Database-First AI-Powered Music Optimization for Hospitality Business
                </p>
                <div className="flex justify-center flex-wrap gap-2">
                    <div className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 rounded-full border border-indigo-200 inline-flex items-center shadow-sm font-medium">
                        <Beaker size={16} className="mr-2" />
                        🗄️ Database-First Scientific Approach
                    </div>
                    {databaseStats && (
                        <div className="px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 rounded-full border border-orange-200 inline-flex items-center shadow-sm font-medium">
                            <BarChart3 size={16} className="mr-2" />
                            📊 {databaseStats.total_tracks} tracks • {databaseStats.coverage_percentage}% enriched
                        </div>
                    )}
                    {isLoadingDatabase && (
                        <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full inline-flex items-center shadow-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                            Loading research database...
                        </div>
                    )}
                </div>
            </div>


            {/* Exclusion Preview */}
                        {analysisResults && brandData.q8 && brandData.q8.length > 0 && (
                            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                                <h3 className="text-lg font-bold mb-2 text-red-800">🚫 Excluded Genres</h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {brandData.q8.map((genre, i) => (
                                        <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                            {genre.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm text-red-700">
                                    <strong>Science-based filtering:</strong> These genres will be excluded from your optimized playlist
                                </p>
                            </div>
                        )}

                        {status === "unauthenticated" ? (
                            <div className="text-center bg-white p-12 rounded-2xl shadow-lg border border-indigo-200">
                                <Rocket size={64} className="mx-auto text-orange-500 mb-6 animate-pulse" />
                                <h3 className="text-3xl font-bold text-gray-800 mb-4">Connect with Spotify</h3>
                                <p className="text-gray-600 mb-6 text-lg">Login to Spotify to create personalized playlists for your business</p>
                                <button
                                    onClick={() => signIn("spotify")}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg"
                                >
                                    🎵 Login to Spotify
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Tabs */}
                                <div className="mb-8">
                                    <div className="mobile-tabs-container flex space-x-2 bg-white/60 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-indigo-100">
                                        <div className="mobile-tabs-flex flex space-x-2">
                                            {tabs.map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`mobile-tab-button flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                                        activeTab === tab.id 
                                                            ? 'bg-white text-indigo-600 shadow-lg border border-indigo-200 transform scale-105' 
                                                            : 'text-gray-600 hover:text-indigo-500 hover:bg-indigo-50'
                                                    }`}
                                                >
                                                    {tab.icon}
                                                    <span className="ml-2">{tab.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {activeTab === 'analyzer' && (
                                        <QuestionWizard
                                            analysisStep={analysisStep}
                                            setAnalysisStep={setAnalysisStep}
                                            brandData={brandData}
                                            setBrandData={setBrandData}
                                            onAnalyze={() => {
                                                calculateBrandFit();
                                                setActiveTab('results');
                                            }}
                                        />
                                    )}

                                    {activeTab === 'visual' && (
                                        <VisualAnalysis
                                            uploadedImages={uploadedImages}
                                            setUploadedImages={setUploadedImages}
                                            websiteScreenshot={websiteScreenshot}
                                            setWebsiteScreenshot={setWebsiteScreenshot}
                                            websiteAnalysis={websiteAnalysis}
                                            setWebsiteAnalysis={setWebsiteAnalysis}
                                            isAnalyzingScreenshot={isAnalyzingScreenshot}
                                            setIsAnalyzingScreenshot={setIsAnalyzingScreenshot}
                                            fileInputRef={fileInputRef}
                                            screenshotInputRef={screenshotInputRef}
                                            menuImages={menuImages}
                                            setMenuImages={setMenuImages}
                                            menuAnalysis={menuAnalysis}
                                            setMenuAnalysis={setMenuAnalysis}
                                            isAnalyzingMenu={isAnalyzingMenu}
                                            setIsAnalyzingMenu={setIsAnalyzingMenu}
                                            brandData={brandData}
                                            onReanalyze={() => {
                                                calculateBrandFit();
                                                setActiveTab('results');
                                            }}
                                        />
                                    )}

                                    {activeTab === 'results' && (
                                        <EnhancedResultsPanel
                                            analysisResults={analysisResults}
                                            spotifyPlaylist={spotifyPlaylist}
                                            isGeneratingPlaylist={isGeneratingPlaylist}
                                            onGeneratePlaylist={generateSpotifyPlaylist}
                                            databaseStats={databaseStats}
                                            playlistMethod={playlistMethod}
                                            brandData={brandData}
                                            status={status}
                                        />
                                    )}

                                    {activeTab === 'database' && (
                                        <EnhancedResearchDatabase
                                            databaseStats={databaseStats}
                                            onRefreshDatabase={loadEnrichedDatabaseData}
                                            isLoading={isLoadingDatabase}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            }

// Enhanced Results Panel
function EnhancedResultsPanel({
    analysisResults,
    spotifyPlaylist,
    isGeneratingPlaylist,
    onGeneratePlaylist,
    databaseStats,
    playlistMethod,
    brandData,
    status  
}) {
    if (!analysisResults) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center border border-indigo-200">
                <Rocket size={64} className="mx-auto text-indigo-400 mb-4 drop-shadow-lg animate-pulse" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Ready for Launch</h3>
                <p className="text-gray-600">Complete the business analysis to generate your science-based music profile.</p>
            </div>
        );
    }

    const { music_profile, roi_projection, implementation_plan } = analysisResults;

    return (
        <div className="space-y-6">
            {/* Scientific Music Profile */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-200">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                    <Beaker size={28} className="mr-3 text-orange-500" />
                    🧪 Scientific Music Profile
                </h3>
                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                        <h4 className="font-bold mb-4 text-gray-800 flex items-center">
                            <BarChart3 size={20} className="mr-2 text-indigo-500" />
                            Target Audio Features
                        </h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Tempo:</span>
                                <span className="font-mono text-lg font-bold text-indigo-600">{music_profile.features.tempo} BPM</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Energy:</span>
                                <div className="flex items-center">
                                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                                        <div 
                                            className="h-2 bg-gradient-to-r from-indigo-500 to-orange-500 rounded-full"
                                            style={{width: `${music_profile.features.energy * 100}%`}}
                                        ></div>
                                    </div>
                                    <span className="font-mono font-bold text-indigo-600">
                                        {(music_profile.features.energy * 10).toFixed(1)}/10
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Acousticness:</span>
                                <div className="flex items-center">
                                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                                        <div 
                                            className="h-2 bg-gradient-to-r from-indigo-500 to-orange-500 rounded-full"
                                            style={{width: `${music_profile.features.acousticness * 100}%`}}
                                        ></div>
                                    </div>
                                    <span className="font-mono font-bold text-indigo-600">
                                        {(music_profile.features.acousticness * 10).toFixed(1)}/10
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Danceability:</span>
                                <div className="flex items-center">
                                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                                        <div 
                                            className="h-2 bg-gradient-to-r from-indigo-500 to-orange-500 rounded-full"
                                            style={{width: `${music_profile.features.danceability * 100}%`}}
                                        ></div>
                                    </div>
                                    <span className="font-mono font-bold text-indigo-600">
                                        {(music_profile.features.danceability * 10).toFixed(1)}/10
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
                        <h4 className="font-bold mb-4 text-gray-800 flex items-center">
                            <Database size={20} className="mr-2 text-orange-500" />
                            Secondary Genres
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {music_profile.secondary_genres?.map((genre, i) => (
                                <span key={i} className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold border border-indigo-200">
                                    {genre}
                                </span>
                            ))}
                        </div>

                        {/* Show excluded genres */}
                        {brandData.q8 && brandData.q8.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-bold mb-2 text-red-600">Excluded Genres</h4>
                                <div className="flex flex-wrap gap-2">
                                    {brandData.q8.map((genre, i) => (
                                        <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                            🚫 {genre.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cultural Context */}
                {music_profile.cultural_context && (
                    <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                        <h4 className="font-bold text-purple-800 mb-3">🌍 Cultural Intelligence</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Detected Culture:</span>
                                <span className="ml-2 capitalize font-bold text-purple-700">{music_profile.cultural_context.detected_culture}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Confidence:</span>
                                <span className="ml-2 font-bold text-purple-700">{music_profile.cultural_context.cultural_confidence}</span>
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="font-medium text-sm text-gray-700">Cultural Genres:</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {music_profile.cultural_context.cultural_genres?.map((genre, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Demographics */}
                {music_profile.year_preferences && music_profile.year_preferences.demographic_influence && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-3">👥 Demographic Targeting</h4>
                        <div className="text-sm">
                            <div className="mb-2">
                                <span className="font-medium text-gray-700">Target Groups:</span>
                                <span className="ml-2 font-bold text-blue-700">{music_profile.year_preferences.demographic_influence}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Music Era:</span>
                                <span className="ml-2 font-bold text-blue-700">{music_profile.year_preferences.description}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Database Statistics */}
            {databaseStats && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-200">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                        <Database size={24} className="mr-3 text-indigo-500" />
                        📊 Research Database Coverage
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                            <div className="text-3xl font-bold text-indigo-600 mb-2">{databaseStats.total_tracks}</div>
                            <div className="text-sm text-gray-600 font-medium">Total Research Tracks</div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                            <div className="text-3xl font-bold text-orange-600 mb-2">{databaseStats.with_spotify_data}</div>
                            <div className="text-sm text-gray-600 font-medium">Enriched Tracks</div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                            <div className="text-3xl font-bold text-green-600 mb-2">{databaseStats.coverage_percentage}%</div>
                            <div className="text-sm text-gray-600 font-medium">Database Coverage</div>
                        </div>
                    </div>
                </div>
            )}

{/* Generate Playlist Button */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-200">
                {status === "unauthenticated" ? (
                    <button
                        onClick={() => signIn("spotify")}
                        className="w-full bg-gradient-to-r from-green-600 to-blue-500 hover:from-green-700 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg"
                    >
                        <span className="flex items-center justify-center">
                            <Rocket className="mr-3" size={24} />
                            🎵 Login to Spotify First
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={onGeneratePlaylist}
                        disabled={isGeneratingPlaylist}
                        className="w-full bg-gradient-to-r from-indigo-600 to-orange-500 hover:from-indigo-700 hover:to-orange-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg"
                    >
                        {isGeneratingPlaylist ? (
                            <span className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                                <Rocket className="mr-2 animate-bounce" size={20} />
                                Launching Scientific Playlist ({playlistMethod})...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center">
                                <Rocket className="mr-3" size={24} />
                                🚀 Launch Scientific Playlist ({playlistMethod === 'database' ? 'Database-First' : 'Live API'})
                            </span>
                        )}
                    </button>
                )}

                {brandData.q8 && brandData.q8.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center text-sm">
                            <Database size={16} className="mr-2 text-red-600" />
                            <strong className="text-red-800">Science-based filtering:</strong>
                            <span className="ml-2 text-red-700">
                                Excluding {brandData.q8.length} genre{brandData.q8.length > 1 ? 's' : ''} from optimization
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Playlist Results */}
            {spotifyPlaylist && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-200">
                    <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                        <BarChart3 size={28} className="mr-3 text-orange-500" />
                        🎵 Generated RocketScience Playlist
                    </h3>

                    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-orange-50 rounded-xl border border-indigo-200">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-lg text-gray-800">{spotifyPlaylist.name}</h4>
                            {spotifyPlaylist.url && (
                                <a
                                    href={spotifyPlaylist.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                                >
                                    🚀 Launch in Spotify →
                                </a>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{spotifyPlaylist.note}</p>

                        {spotifyPlaylist.database_info && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                <div className="text-center p-3 bg-white/70 rounded-lg">
                                    <div className="font-bold text-indigo-600 text-lg">{spotifyPlaylist.database_info.total_tracks_found}</div>
                                    <div className="text-xs text-gray-600">Found</div>
                                </div>
                                <div className="text-center p-3 bg-white/70 rounded-lg">
                                    <div className="font-bold text-orange-600 text-lg">{spotifyPlaylist.database_info.spotify_tracks_in_playlist}</div>
                                    <div className="text-xs text-gray-600">In Spotify</div>
                                </div>
                                <div className="text-center p-3 bg-white/70 rounded-lg">
                                    <div className="font-bold text-green-600 text-lg">{spotifyPlaylist.database_info.research_tracks_found}</div>
                                    <div className="text-xs text-gray-600">Research</div>
                                </div>
                                <div className="text-center p-3 bg-white/70 rounded-lg">
                                    <div className="font-bold text-purple-600 text-lg">{spotifyPlaylist.match_score}%</div>
                                    <div className="text-xs text-gray-600">Match</div>
                                </div>
                            </div>
                        )}

                        {/* Filtering Pipeline */}
                        {spotifyPlaylist.meta && spotifyPlaylist.meta.filtering_results && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h5 className="font-medium text-blue-800 mb-2 flex items-center">
                                    <Beaker size={16} className="mr-2" />
                                    Scientific Filtering Pipeline:
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    {spotifyPlaylist.meta.filtering_results.year_filtering && (
                                        <div className="bg-blue-100 px-2 py-1 rounded text-blue-700">
                                            Year Filter: -{spotifyPlaylist.meta.filtering_results.year_filtering.removed}
                                        </div>
                                    )}
                                    {spotifyPlaylist.meta.filtering_results.cultural_genre_search && (
                                        <div className="bg-blue-100 px-2 py-1 rounded text-blue-700">
                                            Cultural: {spotifyPlaylist.meta.filtering_results.cultural_genre_search}
                                        </div>
                                    )}
                                    {brandData.q8 && brandData.q8.length > 0 && (
                                        <div className="bg-red-100 px-2 py-1 rounded text-red-700">
                                            Exclusions: {brandData.q8.length} blocked
                                        </div>
                                    )}
                                    <div className="bg-green-100 px-2 py-1 rounded text-green-700">
                                        Final: {spotifyPlaylist.tracks.length} tracks
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Track List */}
                    <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-indigo-50 sticky top-0">
                                <tr>
                                    <th className="text-left p-3 font-bold text-indigo-700">Track</th>
                                    <th className="text-left p-3 font-bold text-indigo-700">BPM</th>
                                    <th className="text-left p-3 font-bold text-indigo-700">Energy</th>
                                    <th className="text-left p-3 font-bold text-indigo-700">Year</th>
                                    <th className="text-left p-3 font-bold text-indigo-700">Match</th>
                                    <th className="text-left p-3 font-bold text-indigo-700">Source</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {spotifyPlaylist.tracks.map((track, i) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-indigo-25 transition-colors">
                                        <td className="p-3">
                                            <div>
                                                <div className="font-medium text-gray-800">{track.name}</div>
                                                <div className="text-gray-500 text-xs">{track.artist}</div>
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono font-medium">{Math.round(track.bpm)}</td>
                                        <td className="p-3 font-mono font-medium">{(track.energy * 10).toFixed(1)}</td>
                                        <td className="p-3 font-mono text-xs">
                                            {track.year || 'N/A'}
                                            {track.year >= 2020 && <span className="text-green-600 ml-1">🆕</span>}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                (track.match_score || 0) > 0.8 ? 'bg-green-100 text-green-800' :
                                                (track.match_score || 0) > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {Math.round((track.match_score || 0) * 100)}%
                                            </span>
                                            {track.cultural_match && <span className="text-purple-600 ml-1 text-xs">🌍</span>}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                track.has_spotify_data ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {track.has_spotify_data ? '🎵 Spotify' : '🧮 Estimated'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROI Projection */}
            {/* Potential Impact */}
            {roi_projection && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-200">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                        <Database size={24} className="mr-3 text-orange-500" />
                        🎯 Potential Business Impact
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                            <div className="text-2xl font-bold text-green-600 mb-2">Higher Revenue</div>
                            <div className="text-sm text-gray-600 font-medium">Customer Satisfaction</div>
                            <div className="text-xs text-gray-500 mt-1">Through optimized music selection</div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600 mb-2">
                                {music_profile.features.tempo < 80 ? "Longer Stays" : "Faster Turnover"}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Tempo Optimization</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {music_profile.features.tempo < 80 ? "Slower tempo increases dwell time" : "Faster tempo encourages quicker decisions"}
                            </div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-100 rounded-xl border border-purple-200">
                            <div className="text-2xl font-bold text-purple-600 mb-2">{roi_projection.implementation_time}</div>
                            <div className="text-sm text-gray-600 font-medium">Implementation Time</div>
                            <div className="text-xs text-gray-500 mt-1">Ready to launch</div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                            <strong>Research-based approach:</strong> Impact depends on current music quality and customer demographics. 
                            Results based on audio psychology research.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Enhanced Research Database
function EnhancedResearchDatabase({ databaseStats, onRefreshDatabase, isLoading }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-200">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                <Database size={28} className="mr-3 text-indigo-500" />
                🔬 Research Foundation Database
            </h3>
            
            {isLoading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading research database...</p>
                </div>
            ) : databaseStats ? (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                            <div className="text-2xl font-bold text-indigo-600">{databaseStats.total_tracks}</div>
                            <div className="text-sm text-gray-600 font-medium">Total Tracks</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                            <div className="text-2xl font-bold text-orange-600">{databaseStats.with_spotify_data}</div>
                            <div className="text-sm text-gray-600 font-medium">Enriched</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                            <div className="text-2xl font-bold text-green-600">{databaseStats.coverage_percentage}%</div>
                            <div className="text-sm text-gray-600 font-medium">Coverage</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl border border-indigo-200">
                            <button
                                onClick={onRefreshDatabase}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                disabled={isLoading}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-orange-50 rounded-xl border border-indigo-200">
                        <p className="text-gray-700 text-sm">
                            <strong>RocketScience Database:</strong> Our research foundation contains scientifically validated music data 
                            optimized for hospitality environments. Each track is analyzed for business impact potential.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <Beaker size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Database information not available</p>
                </div>
            )}
        </div>
    );
}