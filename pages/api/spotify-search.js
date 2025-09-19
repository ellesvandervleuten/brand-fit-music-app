// pages/api/spotify-search.js (DEBUG VERSION)

async function getToken() {
    console.log('=== TOKEN FETCH START ===');
    console.log('CLIENT_ID exists:', !!process.env.SPOTIFY_CLIENT_ID);
    console.log('CLIENT_SECRET exists:', !!process.env.SPOTIFY_CLIENT_SECRET);

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        throw new Error('Missing Spotify credentials');
    }

    try {
        const resp = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer
                    .from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET)
                    .toString('base64'),
            },
            body: 'grant_type=client_credentials'
        });

        console.log('Token response status:', resp.status);
        const data = await resp.json();
        console.log('Token response data:', data);

        if (!resp.ok) {
            throw new Error(`Token fetch failed: ${data.error_description || data.error}`);
        }

        console.log('Token acquired successfully');
        return data.access_token;
    } catch (error) {
        console.error('Token fetch error:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    console.log('=== API CALL START ===');
    console.log('Method:', req.method);
    console.log('Body:', req.body);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { genres = [], tempo_range = [80, 100], energy_level = 0.5, limit = 50 } = req.body || {};

    console.log('Parsed params:', { genres, tempo_range, energy_level, limit });

    if (!genres.length) {
        console.log('No genres provided');
        return res.status(400).json({ error: 'genres required', tracks: [] });
    }

    try {
        // Step 1: Get token
        console.log('Step 1: Getting token...');
        const token = await getToken();
        console.log('Token length:', token?.length);

        // Step 2: Test with first genre only
        const testGenre = genres[0];
        console.log('Step 2: Testing with genre:', testGenre);

        const searchUrl = `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(testGenre)}&type=track&limit=10`;
        console.log('Search URL:', searchUrl);

        const searchResp = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Search response status:', searchResp.status);
        const searchData = await searchResp.json();

        if (!searchResp.ok) {
            console.error('Search API error:', searchData);
            throw new Error(`Search failed: ${searchData.error?.message || 'Unknown error'}`);
        }

        console.log('Search results:', {
            total: searchData.tracks?.total,
            items: searchData.tracks?.items?.length
        });

        // Return basic info for now
        const items = searchData.tracks?.items || [];
        const basicTracks = items.slice(0, 5).map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists?.[0]?.name || 'Unknown',
            url: track.external_urls?.spotify
        }));

        console.log('Returning tracks:', basicTracks.length);
        return res.status(200).json({ tracks: basicTracks });

    } catch (err) {
        console.error('=== ERROR DETAILS ===');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);

        return res.status(500).json({
            error: 'Search failed',
            details: err.message,
            tracks: []
        });
    }
}