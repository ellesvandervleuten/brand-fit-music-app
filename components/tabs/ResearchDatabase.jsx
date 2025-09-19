// components/tabs/ResearchDatabase.jsx
import React from 'react';

export default function ResearchDatabase() {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Research Database & Scientific Foundation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scientific Features Framework */}
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Scientific Features Framework</h4>
                    <ul className="text-sm space-y-2 list-disc pl-5">
                        <li><strong>Tempo:</strong> Milliman (1982) - langzamer tempo verhoogt dwell time en omzet</li>
                        <li><strong>Acousticness:</strong> Spence - kan smaakperceptie versterken</li>
                        <li><strong>Energy:</strong> North & Hargreaves - beïnvloedt bestedingspatronen</li>
                        <li><strong>Valence:</strong> Mood congruency - hogere tevredenheid bij passende stemming</li>
                        <li><strong>Instrumentalness:</strong> minder cognitieve belasting tijdens dineren</li>
                        <li><strong>Danceability:</strong> stuurt bewegingsdrang in de ruimte</li>
                        <li><strong>Speechiness:</strong> lage waarden storen conversatie minder</li>
                    </ul>
                </div>
                {/* Operational Goals Impact */}
                <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">Operational Goals Impact</h4>
                    <ul className="text-sm space-y-2 list-disc pl-5">
                        <li><strong>Spending max:</strong> 60–80 BPM → grotere dwell time</li>
                        <li><strong>Turnover max:</strong> 100+ BPM → snellere tafel-doorstroom</li>
                        <li><strong>Premium:</strong> hogere acousticness → meer premium beleving</li>
                        <li><strong>Balanced:</strong> 85–95 BPM → gebalanceerde performance overall</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}