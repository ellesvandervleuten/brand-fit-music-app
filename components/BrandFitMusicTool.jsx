// components/BrandFitMusicTool.jsx — hoofdscherm in Mise-huisstijl
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, Camera as CameraIcon, Music, ExternalLink } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';

import QuestionWizard from './tabs/QuestionWizard';
import VisualAnalysis from './tabs/VisualAnalysis';

import {
    loadTop2000Database,
    calculateOptimalMusicProfile,
    calculateROI,
    generateImplementationPlan,
    calculateMatchScore,
} from '../lib/logic';

const PLAYLIST_NAME = 'RocketScience playlist';
const PLAYLIST_DESCRIPTION = 'Muziek die past bij je zaak, gemaakt met RocketScience';

const CULTURE_LABELS = {
    french: 'Frans',
    italian: 'Italiaans',
    spanish: 'Spaans',
    greek: 'Grieks',
    british: 'Brits',
};

export default function BrandFitMusicTool() {
    const [activeTab, setActiveTab] = useState('analyzer');

    const [analysisStep, setAnalysisStep] = useState(1);
    const [brandData, setBrandData] = useState({});
    const [uploadedImages, setUploadedImages] = useState([]);

    const [analysisResults, setAnalysisResults] = useState(null);
    const [spotifyPlaylist, setSpotifyPlaylist] = useState(null);
    const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
    const [playlistMessage, setPlaylistMessage] = useState(null);

    const [menuImages, setMenuImages] = useState([]);
    const [menuAnalysis, setMenuAnalysis] = useState(null);
    const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);

    const [top2000Database, setTop2000Database] = useState(null);

    const fileInputRef = useRef(null);

    const { status } = useSession();

    useEffect(() => {
        (async () => {
            const data = await loadTop2000Database();
            setTop2000Database(data || []);
        })();
    }, []);

    const calculateBrandFit = () => {
        const music_profile = calculateOptimalMusicProfile({ brandData, menuAnalysis });
        const roi_projection = calculateROI(music_profile);
        const implementation_plan = generateImplementationPlan(music_profile);
        setAnalysisResults({ music_profile, roi_projection, implementation_plan });
    };

    const generateSpotifyPlaylist = async () => {
        if (!analysisResults) return;
        if (status !== 'authenticated') return signIn('spotify');

        setIsGeneratingPlaylist(true);
        setPlaylistMessage(null);
        try {
            const { music_profile } = analysisResults;

            const resp = await fetch('/api/create_playlist_database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_features: music_profile.features,
                    genres: music_profile.secondary_genres,
                    cultural_genres: music_profile.cultural_context?.cultural_genres || [],
                    cultural_context: music_profile.cultural_context || null,
                    year_preferences: music_profile.year_preferences || null,
                    excluded_genres: brandData.q8 || [],
                    operational_goal: music_profile.operational_goal || 'balanced_operation',
                    playlistName: PLAYLIST_NAME,
                    playlistDescription: PLAYLIST_DESCRIPTION,
                }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                if (resp.status === 403 && (data.existingPlaylists || data.existingPlaylist)) {
                    const playlists = data.existingPlaylists || [data.existingPlaylist];
                    setPlaylistMessage({
                        kind: 'limit',
                        text: `Je hebt al ${playlists.length} playlist${playlists.length > 1 ? 's' : ''} gemaakt. Dat is het maximum voor nu. Neem contact met ons op als je er meer wilt.`,
                    });
                    return;
                }
                throw new Error(data.error || 'Playlist maken mislukt');
            }

            const tracks = (data.tracks || []).map((t) => ({
                name: t.name,
                artist: t.artist,
                bpm: t.tempo,
                year: t.year,
                url: t.id ? `https://open.spotify.com/track/${t.id}` : null,
                match_score: t.match_score || 0,
            }));

            setSpotifyPlaylist({
                name: data.playlist?.name || PLAYLIST_NAME,
                tracks,
                tracks_added: data.database_info?.spotify_tracks_in_playlist ?? tracks.length,
                match_score: data.meta?.match_quality || calculateMatchScore(music_profile.features, tracks, top2000Database),
                url: data.playlist?.url,
            });

            if (data.playlist?.url) {
                window.open(data.playlist.url, '_blank');
            }
        } catch (error) {
            console.error('Playlist maken mislukt:', error);
            setPlaylistMessage({ kind: 'error', text: `Het maken van de playlist is niet gelukt. Probeer het nog een keer. (${error.message})` });
        } finally {
            setIsGeneratingPlaylist(false);
        }
    };

    const goToResults = () => {
        calculateBrandFit();
        setActiveTab('results');
    };

    const tabs = [
        { id: 'analyzer', label: 'Je zaak', icon: <ClipboardList size={18} /> },
        { id: 'visual', label: 'Foto’s & menu', icon: <CameraIcon size={18} /> },
        { id: 'results', label: 'Je muziek', icon: <Music size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-ground">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-[clamp(16px,4vw,48px)] py-8">
                <header className="mb-8 flex items-center gap-3">
                    <img src="/merk/mise-beeldmerk-licht.svg" alt="" className="h-9 w-9" />
                    <div>
                        <h1 className="text-[24px] sm:text-[34px] leading-tight text-ink">RocketScience Music Tool</h1>
                        <p className="text-muted">Muziek die past bij je zaak</p>
                    </div>
                </header>

                {status === 'unauthenticated' ? (
                    <div className="mise-hero rounded-hero p-8 sm:p-12 max-w-xl">
                        <Grain />
                        <div className="relative">
                            <h2 className="text-[28px] mb-3">Koppel je Spotify</h2>
                            <p className="opacity-90 mb-8">
                                Log in met Spotify. Dan zetten we de muziek die bij je zaak past direct in een playlist in je account.
                            </p>
                            <button
                                onClick={() => signIn('spotify')}
                                className="min-h-[44px] px-6 py-3 rounded-input bg-apricot text-ink font-semibold hover:opacity-90"
                            >
                                Inloggen met Spotify
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <nav className="mb-6 grid grid-cols-3 sm:inline-grid gap-1 p-1 rounded-full bg-sand">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`min-h-[44px] flex items-center justify-center gap-2 px-2 sm:px-5 rounded-full text-[13px] sm:text-[15px] font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === tab.id ? 'bg-apricot text-ink' : 'text-muted-strong hover:text-ink'
                                    }`}
                                >
                                    <span className="hidden sm:inline-flex">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="space-y-6">
                            {activeTab === 'analyzer' && (
                                <QuestionWizard
                                    analysisStep={analysisStep}
                                    setAnalysisStep={setAnalysisStep}
                                    brandData={brandData}
                                    setBrandData={setBrandData}
                                    onAnalyze={goToResults}
                                />
                            )}

                            {activeTab === 'visual' && (
                                <VisualAnalysis
                                    uploadedImages={uploadedImages}
                                    setUploadedImages={setUploadedImages}
                                    fileInputRef={fileInputRef}
                                    menuImages={menuImages}
                                    setMenuImages={setMenuImages}
                                    menuAnalysis={menuAnalysis}
                                    setMenuAnalysis={setMenuAnalysis}
                                    isAnalyzingMenu={isAnalyzingMenu}
                                    setIsAnalyzingMenu={setIsAnalyzingMenu}
                                    brandData={brandData}
                                    onReanalyze={goToResults}
                                />
                            )}

                            {activeTab === 'results' && (
                                <ResultsPanel
                                    analysisResults={analysisResults}
                                    spotifyPlaylist={spotifyPlaylist}
                                    isGeneratingPlaylist={isGeneratingPlaylist}
                                    playlistMessage={playlistMessage}
                                    onGeneratePlaylist={generateSpotifyPlaylist}
                                    onStart={() => setActiveTab('analyzer')}
                                    brandData={brandData}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ——— Kleine bouwstenen ——— */

function Grain() {
    return (
        <svg className="mise-grain" aria-hidden="true">
            <filter id="mise-grain-filter">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#mise-grain-filter)" />
        </svg>
    );
}

// 10 blokjes, naar beneden afgerond; alles boven 0 toont minstens 1 blokje.
function Blocks({ value, onDark = false }) {
    const v = Math.max(0, Math.min(1, value || 0));
    const filled = v >= 1 ? 10 : v > 0 ? Math.max(1, Math.floor(v * 10)) : 0;
    const on = onDark ? 'bg-apricot' : 'bg-copper';
    const off = onDark ? 'bg-cream/20' : 'bg-sand';
    return (
        <div className="flex gap-1" aria-label={`${filled} van 10`}>
            {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-3 w-3 rounded-[4px] ${i < filled ? on : off}`} />
            ))}
        </div>
    );
}

function Card({ title, children, className = '' }) {
    return (
        <section className={`bg-card rounded-card border border-line p-5 sm:p-6 ${className}`}>
            {title && <h3 className="text-[20px] text-ink mb-4">{title}</h3>}
            {children}
        </section>
    );
}

function Chip({ children }) {
    return (
        <span className="px-3 py-1 rounded-full bg-apricot-soft text-ink text-[13px] font-medium capitalize">
            {children}
        </span>
    );
}

function tempoWord(bpm) {
    if (bpm < 75) return 'Rustig';
    if (bpm < 95) return 'Ontspannen';
    if (bpm < 115) return 'Levendig';
    return 'Vlot';
}

/* ——— Resultaten ——— */

function ResultsPanel({
    analysisResults,
    spotifyPlaylist,
    isGeneratingPlaylist,
    playlistMessage,
    onGeneratePlaylist,
    onStart,
    brandData,
}) {
    if (!analysisResults) {
        return (
            <Card>
                <h3 className="text-[20px] text-ink mb-2">Nog geen muziekprofiel</h3>
                <p className="text-muted mb-5">Beantwoord eerst een paar vragen over je zaak. Dan zie je hier welke muziek erbij past.</p>
                <button
                    onClick={onStart}
                    className="min-h-[44px] px-6 rounded-input bg-ink text-cream font-semibold hover:opacity-90"
                >
                    Naar de vragen
                </button>
            </Card>
        );
    }

    const { music_profile } = analysisResults;
    const f = music_profile.features;
    const culture = music_profile.cultural_context;
    const cultureLabel = culture ? (CULTURE_LABELS[culture.detected_culture] || culture.detected_culture) : null;
    const years = music_profile.year_preferences?.preferred_years;
    const excluded = brandData.q8 || [];

    return (
        <div className="space-y-4">
            {/* Hero: het profiel + de ene primaire actie */}
            <section className="mise-hero rounded-hero p-6 sm:p-8">
                <Grain />
                <div className="relative">
                    <p className="uppercase text-[12px] tracking-[0.1em] font-semibold opacity-80 mb-2">Je muziekprofiel</p>
                    <h2 className="text-[34px] leading-tight mb-1">{tempoWord(f.tempo)}</h2>
                    <p className="opacity-90 mb-6 tabular-nums">Rond {Math.round(f.tempo)} slagen per minuut</p>

                    <div className="grid sm:grid-cols-3 gap-5 mb-8">
                        <ProfileBar label="Energie" value={f.energy} />
                        <ProfileBar label="Akoestisch" value={f.acousticness} />
                        <ProfileBar label="Dansbaar" value={f.danceability} />
                    </div>

                    <button
                        onClick={onGeneratePlaylist}
                        disabled={isGeneratingPlaylist}
                        className="min-h-[44px] px-6 py-3 rounded-input bg-apricot text-ink font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
                    >
                        {isGeneratingPlaylist ? (
                            <>
                                <span className="h-4 w-4 rounded-full border-2 border-ink border-t-transparent animate-spin" />
                                Playlist wordt gemaakt…
                            </>
                        ) : (
                            'Maak playlist in Spotify'
                        )}
                    </button>
                </div>
            </section>

            {playlistMessage && (
                <div className="bg-copper-soft text-copper-text rounded-card p-4 text-[15px]">
                    {playlistMessage.text}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                <Card title="Stijl">
                    {music_profile.secondary_genres?.length > 0 && (
                        <div className="mb-4">
                            <p className="text-muted text-[13px] mb-2">Genres</p>
                            <div className="flex flex-wrap gap-2">
                                {music_profile.secondary_genres.map((g, i) => <Chip key={i}>{g}</Chip>)}
                            </div>
                        </div>
                    )}
                    {cultureLabel && (
                        <div className="mb-4">
                            <p className="text-muted text-[13px] mb-1">Past bij je keuken</p>
                            <p className="text-ink font-semibold">{cultureLabel}</p>
                        </div>
                    )}
                    {years && (
                        <div>
                            <p className="text-muted text-[13px] mb-1">Vooral muziek uit</p>
                            <p className="text-ink font-semibold tabular-nums">{years[0]} – {years[1]}</p>
                        </div>
                    )}
                </Card>

                {excluded.length > 0 && (
                    <Card title="Liever niet">
                        <p className="text-muted text-[13px] mb-2">Deze genres laten we weg</p>
                        <div className="flex flex-wrap gap-2">
                            {excluded.map((g, i) => (
                                <span key={i} className="px-3 py-1 rounded-full bg-sand text-muted-strong text-[13px] font-medium capitalize">
                                    {g.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {spotifyPlaylist && (
                <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-[20px] text-ink">{spotifyPlaylist.name}</h3>
                            <p className="text-muted tabular-nums">{spotifyPlaylist.tracks_added} nummers in je Spotify</p>
                        </div>
                        {spotifyPlaylist.url && (
                            <a
                                href={spotifyPlaylist.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[44px] px-5 rounded-input bg-sand text-ink font-semibold inline-flex items-center gap-2 hover:opacity-90"
                            >
                                Open in Spotify <ExternalLink size={16} />
                            </a>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto -mx-5 sm:-mx-6">
                        <table className="w-full text-[15px]">
                            <thead className="sticky top-0 bg-card">
                                <tr className="text-left text-muted text-[12px] uppercase tracking-[0.1em]">
                                    <th className="font-semibold py-2 px-5 sm:px-6">Nummer</th>
                                    <th className="font-semibold py-2 px-3 text-right">Jaar</th>
                                    <th className="font-semibold py-2 px-5 sm:px-6 text-right">Tempo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {spotifyPlaylist.tracks.map((t, i) => (
                                    <tr key={i} className="border-t border-line">
                                        <td className="py-3 px-5 sm:px-6">
                                            <div className="font-semibold text-ink">{t.name}</div>
                                            <div className="text-muted text-[13px]">{t.artist}</div>
                                        </td>
                                        <td className="py-3 px-3 text-right text-muted tabular-nums">{t.year || '–'}</td>
                                        <td className="py-3 px-5 sm:px-6 text-right text-muted tabular-nums">
                                            {t.bpm ? Math.round(t.bpm) : '–'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

function ProfileBar({ label, value }) {
    return (
        <div>
            <p className="text-[13px] opacity-80 mb-2">{label}</p>
            <Blocks value={value} onDark />
        </div>
    );
}
