// pages/api/database/stats.js - Database Statistics API
import { loadEnrichedDatabase, getDatabaseStats } from '../../../lib/enrichedDatabase';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('📊 Loading database for stats...');

        // Load the enriched database
        const database = await loadEnrichedDatabase();

        // Get comprehensive statistics
        const stats = getDatabaseStats(database);

        console.log('✅ Database stats generated:', {
            total: stats.total_tracks,
            enriched: stats.with_spotify_data,
            coverage: stats.coverage_percentage
        });

        return res.status(200).json({
            success: true,
            ...stats,
            last_updated: new Date().toISOString(),
            note: "Database statistics generated from enriched music database"
        });

    } catch (error) {
        console.error('❌ Error generating database stats:', error);

        return res.status(500).json({
            error: 'Failed to load database statistics',
            details: error.message,
            note: 'Make sure the enriched database file exists at public/data/output/enriched_database.xlsx'
        });
    }
}