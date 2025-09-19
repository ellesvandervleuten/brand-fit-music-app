// Test handler: /pages/api/test-playlist.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.accessToken) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        console.log("🧪 Starting playlist creation test...");

        // Step 1: Get current user info
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });

        if (!userResponse.ok) {
            return res.status(400).json({ error: "Failed to get user info" });
        }

        const userData = await userResponse.json();
        console.log("✅ User:", userData.display_name, userData.id);

        // Step 2: Create a test playlist
        const playlistData = {
            name: "🧪 API Test Playlist " + new Date().toLocaleTimeString(),
            description: "Test playlist created via API to verify functionality",
            public: false
        };

        const createResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playlistData)
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            console.log("❌ Create playlist failed:", createResponse.status, error);
            return res.status(400).json({ error: "Failed to create playlist", details: error });
        }

        const playlist = await createResponse.json();
        console.log("✅ Playlist created:", playlist.name, playlist.id);

        // Step 3: Test adding specific track IDs
        // These are popular, well-known track IDs that should exist
        const testTrackIds = [
            "4iV5W9uYEdYUVa79Axb7Rh", // Shape of You - Ed Sheeran
            "7qiZfU4dY1lWllzX7mPBI3", // Blinding Lights - The Weeknd  
            "1301WleyT98MSxVHPZCA6M", // Bad Guy - Billie Eilish
        ];

        const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: testTrackIds.map(id => `spotify:track:${id}`)
            })
        });

        if (!addTracksResponse.ok) {
            const error = await addTracksResponse.text();
            console.log("❌ Add tracks failed:", addTracksResponse.status, error);
            return res.status(400).json({ error: "Failed to add tracks", details: error });
        }

        const addResult = await addTracksResponse.json();
        console.log("✅ Tracks added successfully:", addResult);

        // Step 4: Verify the playlist content
        const verifyResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });

        if (verifyResponse.ok) {
            const tracks = await verifyResponse.json();
            console.log(`✅ Verification: Playlist has ${tracks.items.length} tracks`);
            tracks.items.forEach(item => {
                console.log(`   - ${item.track.name} by ${item.track.artists[0].name}`);
            });
        }

        return res.status(200).json({
            success: true,
            message: "Test completed successfully!",
            playlist: {
                id: playlist.id,
                name: playlist.name,
                url: playlist.external_urls.spotify,
                tracks_added: testTrackIds.length
            }
        });

    } catch (error) {
        console.error("Test failed:", error);
        return res.status(500).json({ error: error.message });
    }
}