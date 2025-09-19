// components/tabs/ResultsPanel.jsx
import React from 'react';
import { Settings, Music, Target, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function ResultsPanel({
    analysisResults,
    spotifyPlaylist,
    isGeneratingPlaylist,
    onGeneratePlaylist,
}) {
    if (!analysisResults) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Nog geen analyse. Ga naar “Business Analyzer” en doorloop de stappen.</p>
            </div>
        );
    }

    const { music_profile, implementation_plan } = analysisResults;

    return (
        <div className="space-y-6">
            {/* Impact */}
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">Scientific Music Profile Impact</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(music_profile.predicted_impact).map(([k, v]) => (
                        <div key={k} className="text-center">
                            <div className="text-3xl font-bold">{v}</div>
                            <div className="text-sm opacity-90 capitalize">{k.replaceAll('_', ' ')}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Audio Features */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Settings className="mr-2 text-blue-500" /> Scientific Audio Features Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Row label="Tempo" value={`${music_profile.features.tempo} BPM`} bar={null} />
                        <Row label="Energy" valueScale={music_profile.features.energy} />
                        <Row label="Acousticness" valueScale={music_profile.features.acousticness} />
                        <Row label="Valence (Mood)" valueScale={music_profile.features.valence} />
                    </div>
                    <div className="space-y-4">
                        <Row label="Danceability" valueScale={music_profile.features.danceability} />
                        <Row label="Instrumentalness" valueScale={music_profile.features.instrumentalness} />
                        <Row label="Speechiness" valueScale={music_profile.features.speechiness} />
                        <div className="p-3 bg-cyan-50 rounded">
                            <div className="font-medium mb-2">Secondary Genres:</div>
                            <div className="flex flex-wrap gap-2">
                                {music_profile.secondary_genres.map((g) => (
                                    <span key={g} className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm">
                                        {g}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="font-medium mb-2">Scientific Reasoning:</div>
                    <div className="space-y-1 text-sm text-gray-600 max-h-48 overflow-y-auto">
                        {music_profile.reasoning.map((r, i) => (
                            <div key={i} className="flex items-start">
                                <span className="mr-2 mt-0.5 text-yellow-500">★</span>
                                <span>{r}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Spotify */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Music className="mr-2 text-green-500" /> Features-Based Spotify Playlist
                </h3>

                {!spotifyPlaylist ? (
                    <div className="text-center">
                        <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-6 rounded-lg mb-4">
                            <h4 className="text-lg font-semibold mb-2">Generate Scientific Playlist</h4>
                            <p className="text-sm opacity-90 mb-4">Uses your calculated audio features to find perfectly matching tracks</p>
                            <button
                                onClick={onGeneratePlaylist}
                                disabled={isGeneratingPlaylist}
                                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-semibold"
                            >
                                {isGeneratingPlaylist ? 'Generating…' : 'Generate Features-Based Playlist'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-lg font-bold">{spotifyPlaylist.name}</h4>
                                    <p className="text-sm opacity-90">{spotifyPlaylist.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{spotifyPlaylist.match_score}%</div>
                                    <div className="text-xs opacity-90">Feature Match</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-3">
                                Track Analysis ({spotifyPlaylist.tracks.length} tracks)
                            </h4>
                            <div className="space-y-2">
                                {spotifyPlaylist.tracks.slice(0, 10).map((track, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded border">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{track.name}</div>
                                            <div className="text-xs text-gray-600">{track.artist}</div>
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs">
                                            <span className="text-blue-600">{track.bpm} BPM</span>
                                            <span className="text-green-600">E:{(track.energy * 10).toFixed(1)}</span>
                                            <span className="text-purple-600">A:{(track.acousticness * 10).toFixed(1)}</span>
                                            <span className="text-amber-600">V:{(track.valence * 10).toFixed(1)}</span>
                                        </div>
                                    </div>
                                ))}
                                {spotifyPlaylist.tracks.length > 10 && (
                                    <div className="text-center text-sm text-gray-500 py-2">
                                        …and {spotifyPlaylist.tracks.length - 10} more tracks
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Roadmap */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Target className="mr-2 text-green-500" /> Implementation Roadmap
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Col title="Deze Week" color="text-green-600" icon={CheckCircle} items={implementation_plan.immediate} />
                    <Col title="Deze Maand" color="text-yellow-600" icon={Clock} items={implementation_plan.weekly} />
                    <Col title="Lange Termijn" color="text-blue-600" icon={TrendingUp} items={implementation_plan.monthly} />
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, valueScale }) {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">{label}:</span>
            {value ? (
                <span className="text-blue-600 font-semibold">{value}</span>
            ) : (
                <div className="flex items-center">
                    <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(valueScale || 0) * 100}%` }} />
                    </div>
                    <span className="text-blue-600 font-semibold">{((valueScale || 0) * 10).toFixed(1)}/10</span>
                </div>
            )}
        </div>
    );
}

function Col({ title, color, icon: Icon, items }) {
    return (
        <div>
            <h4 className={`font-medium ${color} mb-3`}>{title}</h4>
            <ul className="space-y-2 text-sm">
                {items.map((t, i) => (
                    <li key={i} className="flex items-start">
                        <Icon className={`mr-2 mt-0.5 ${color.replace('text-', 'text-')}`} size={16} />
                        {t}
                    </li>
                ))}
            </ul>
        </div>
    );
}
