// components/BrandFitMusicTool.jsx - Updated with Database Integration + Excluded Genres
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Camera as CameraIcon, BarChart3, Beaker, Database } from 'lucide-react';
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

    // NEW: Database integration state
    const [enrichedDatabase, setEnrichedDatabase] = useState(null);
    const [databaseStats, setDatabaseStats] = useState(null);
    const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
    const [playlistMethod, setPlaylistMethod] = useState('database'); // 'database' or 'spotify_api'

    const [top2000Database, setTop2000Database] = useState(null);

    const fileInputRef = useRef(null);
    const screenshotInputRef = useRef(null);

    const { status } = useSession();

    // Load databases on mount
    useEffect(() => {
        (async () => {
            // Load original database
            const data = await loadTop2000Database();
            setTop2000Database(data || []);

            // Load enriched database
            await loadEnrichedDatabaseData();
        })();
    }, []);

    // NEW: Load enriched database
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

    // UPDATED: Generate playlist with database or Spotify API + EXCLUDED GENRES
    const generateSpotifyPlaylist = async () => {
        if (!analysisResults) return;
        if (status !== 'authenticated') return signIn('spotify');

        setIsGeneratingPlaylist(true);
        try {
            const { music_profile } = analysisResults;

            // Choose API endpoint based on method
            const apiEndpoint = playlistMethod === 'database'
                ? '/api/create_playlist_database'
                : '/api/create_playlist';

            const requestBody = {
                audio_features: music_profile.features,
                genres: music_profile.secondary_genres,
                cultural_genres: music_profile.cultural_context?.cultural_genres || [],
                cultural_context: music_profile.cultural_context || null,
                year_preferences: music_profile.year_preferences || null,
                excluded_genres: brandData.q8 || [], // FIXED: q8 instead of q7
                operational_goal: music_profile.operational_goal || 'balanced_operation',
                playlistName: `Scientific Brand-Fit Playlist (${playlistMethod === 'database' ? 'Database' : 'Live API'})`,
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
                name: data.playlist?.name || 'Scientific Brand-Fit Playlist',
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
        <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Scientific Brand-Fit Music Tool</h1>
                <p className="text-gray-600 text-lg">
                    Database-First AI-Powered Music Optimization for Hospitality Business
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg inline-block">
                        🗄️ Database-First Scientific Approach
                    </div>
                    {databaseStats && (
                        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg inline-block">
                            📊 {databaseStats.total_tracks} tracks • {databaseStats.coverage_percentage}% enriched
                        </div>
                    )}
                    {isLoadingDatabase && (
                        <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg inline-block">
                            ⏳ Loading database...
                        </div>
                    )}
                </div>
            </div>

            {/* Method Selection */}
            {analysisResults && (
                <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-3">📡 Playlist Generation Method</h3>
                    <div className="flex gap-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                value="database"
                                checked={playlistMethod === 'database'}
                                onChange={(e) => setPlaylistMethod(e.target.value)}
                                className="text-blue-600"
                            />
                            <span className="font-medium">Database-First</span>
                            <span className="text-sm text-gray-600">
                                (Uses enriched local database - {databaseStats?.total_tracks || 0} tracks)
                            </span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                value="spotify_api"
                                checked={playlistMethod === 'spotify_api'}
                                onChange={(e) => setPlaylistMethod(e.target.value)}
                                className="text-blue-600"
                            />
                            <span className="font-medium">Spotify API</span>
                            <span className="text-sm text-gray-600">
                                (Live API with feature estimation fallback)
                            </span>
                        </label>
                    </div>
                </div>
            )}

            {/* FIXED: Exclusion Preview - q8 instead of q7 */}
            {analysisResults && brandData.q8 && brandData.q8.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-red-800">🚫 Excluded Genres</h3>
                    <div className="flex flex-wrap gap-2">
                        {brandData.q8.map((genre, i) => (
                            <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                {genre.replace('_', ' ')}
                            </span>
                        ))}
                    </div>
                    <p className="text-sm text-red-600 mt-2">
                        These genres will be filtered out from your playlist
                    </p>
                </div>
            )}

            <div className="mb-8">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab.icon}
                            <span className="ml-2">{tab.label}</span>
                        </button>
                    ))}
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
                        brandData={brandData} // NIEUW: Pass brandData voor exclusion display
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
        </div>
    );
}

// Enhanced Results Panel with database info + exclusion display
function EnhancedResultsPanel({
    analysisResults,
    spotifyPlaylist,
    isGeneratingPlaylist,
    onGeneratePlaylist,
    databaseStats,
    playlistMethod,
    brandData // NIEUW: Voor exclusion display
}) {
    if (!analysisResults) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Analysis Results</h3>
                <p className="text-gray-500">Complete the business analyzer to see your scientific music profile.</p>
            </div>
        );
    }

    const { music_profile, roi_projection, implementation_plan } = analysisResults;

    return (
        <div className="space-y-6">
            {/* Scientific Music Profile */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold mb-4">🧪 Scientific Music Profile</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-3">Target Audio Features</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Tempo:</span>
                                <span className="font-mono">{music_profile.features.tempo} BPM</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Energy:</span>
                                <span className="font-mono">{(music_profile.features.energy * 10).toFixed(1)}/10</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Acousticness:</span>
                                <span className="font-mono">{(music_profile.features.acousticness * 10).toFixed(1)}/10</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Danceability:</span>
                                <span className="font-mono">{(music_profile.features.danceability * 10).toFixed(1)}/10</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-3">Secondary Genres</h4>
                        <div className="flex flex-wrap gap-2">
                            {music_profile.secondary_genres?.map((genre, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                    {genre}
                                </span>
                            ))}
                        </div>

                        {/* FIXED: Show excluded genres in results - q8 instead of q7 */}
                        {brandData.q8 && brandData.q8.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2 text-red-600">Excluded Genres</h4>
                                <div className="flex flex-wrap gap-2">
                                    {brandData.q8.map((genre, i) => (
                                        <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                            🚫 {genre.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* NIEUW: Cultural Context Display */}
                {music_profile.cultural_context && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">🌍 Cultural Context</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Detected Culture:</span>
                                <span className="ml-2 capitalize">{music_profile.cultural_context.detected_culture}</span>
                            </div>
                            <div>
                                <span className="font-medium">Confidence:</span>
                                <span className="ml-2">{music_profile.cultural_context.cultural_confidence}</span>
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className="font-medium text-sm">Cultural Genres:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {music_profile.cultural_context.cultural_genres?.map((genre, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* NIEUW: Demographic Influence Display */}
                {music_profile.year_preferences && music_profile.year_preferences.demographic_influence && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">👥 Demographics</h4>
                        <div className="text-sm text-blue-700">
                            <div className="mb-1">
                                <span className="font-medium">Target Groups:</span> {music_profile.year_preferences.demographic_influence}
                            </div>
                            <div>
                                <span className="font-medium">Music Era:</span> {music_profile.year_preferences.description}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Database Statistics */}
            {databaseStats && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-bold mb-4">📊 Database Coverage</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{databaseStats.total_tracks}</div>
                            <div className="text-sm text-gray-600">Total Tracks</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{databaseStats.with_spotify_data}</div>
                            <div className="text-sm text-gray-600">Enriched Tracks</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{databaseStats.coverage_percentage}%</div>
                            <div className="text-sm text-gray-600">Coverage</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Playlist Button */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <button
                    onClick={onGeneratePlaylist}
                    disabled={isGeneratingPlaylist}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    {isGeneratingPlaylist ? (
                        <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Generating Playlist ({playlistMethod})...
                        </span>
                    ) : (
                        `🎵 Generate Scientific Playlist (${playlistMethod === 'database' ? 'Database' : 'Live API'})`
                    )}
                </button>

                {/* FIXED: Preview van wat er uitgesloten wordt - q8 instead of q7 */}
                {brandData.q8 && brandData.q8.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                        <strong>Note:</strong> Excluding {brandData.q8.length} genre{brandData.q8.length > 1 ? 's' : ''} from playlist generation
                    </div>
                )}
            </div>

            {/* Playlist Results */}
            {spotifyPlaylist && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-bold mb-4">🎵 Generated Playlist</h3>

                    {/* Playlist Info */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{spotifyPlaylist.name}</h4>
                            {spotifyPlaylist.url && (
                                <a
                                    href={spotifyPlaylist.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-700 font-medium"
                                >
                                    Open in Spotify →
                                </a>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{spotifyPlaylist.note}</p>

                        {/* Database-specific info */}
                        {spotifyPlaylist.database_info && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Found:</span> {spotifyPlaylist.database_info.total_tracks_found}
                                </div>
                                <div>
                                    <span className="font-medium">In Spotify:</span> {spotifyPlaylist.database_info.spotify_tracks_in_playlist}
                                </div>
                                <div>
                                    <span className="font-medium">Research:</span> {spotifyPlaylist.database_info.research_tracks_found}
                                </div>
                                <div>
                                    <span className="font-medium">Match:</span> {spotifyPlaylist.match_score}%
                                </div>
                            </div>
                        )}

                        {/* FIXED: Show filtering impact - q8 instead of q7 */}
                        {spotifyPlaylist.meta && spotifyPlaylist.meta.filtering_results && (
                            <div className="mt-3 p-3 bg-blue-50 rounded">
                                <h5 className="font-medium text-blue-800 mb-2">Filtering Pipeline:</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
                                    {spotifyPlaylist.meta.filtering_results.year_filtering && (
                                        <div>Year Filter: -{spotifyPlaylist.meta.filtering_results.year_filtering.removed}</div>
                                    )}
                                    {spotifyPlaylist.meta.filtering_results.cultural_genre_search && (
                                        <div>Cultural: {spotifyPlaylist.meta.filtering_results.cultural_genre_search}</div>
                                    )}
                                    {brandData.q8 && brandData.q8.length > 0 && (
                                        <div>Exclusions: {brandData.q8.length} blocked</div>
                                    )}
                                    <div>Final: {spotifyPlaylist.tracks.length}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Track List */}
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="text-left p-2">Track</th>
                                    <th className="text-left p-2">BPM</th>
                                    <th className="text-left p-2">Energy</th>
                                    <th className="text-left p-2">Year</th>
                                    <th className="text-left p-2">Match</th>
                                    <th className="text-left p-2">Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {spotifyPlaylist.tracks.map((track, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2">
                                            <div>
                                                <div className="font-medium">{track.name}</div>
                                                <div className="text-gray-500">{track.artist}</div>
                                            </div>
                                        </td>
                                        <td className="p-2 font-mono">{Math.round(track.bpm)}</td>
                                        <td className="p-2 font-mono">{(track.energy * 10).toFixed(1)}</td>
                                        <td className="p-2 font-mono text-xs">
                                            {track.year || 'N/A'}
                                            {track.year >= 2020 && <span className="text-green-600 ml-1">🆕</span>}
                                        </td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded text-xs ${(track.match_score || 0) > 0.8 ? 'bg-green-100 text-green-800' :
                                                (track.match_score || 0) > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {Math.round((track.match_score || 0) * 100)}%
                                            </span>
                                            {track.cultural_match && <span className="text-purple-600 ml-1 text-xs">🌍</span>}
                                        </td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded text-xs ${track.has_spotify_data ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {track.has_spotify_data ? 'Spotify' : 'Estimated'}
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
            {roi_projection && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-bold mb-4">💰 ROI Projection</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">+{roi_projection.revenue_increase}%</div>
                            <div className="text-sm text-gray-600">Revenue Increase</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{roi_projection.customer_satisfaction}%</div>
                            <div className="text-sm text-gray-600">Satisfaction</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{roi_projection.implementation_time}</div>
                            <div className="text-sm text-gray-600">Implementation</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}