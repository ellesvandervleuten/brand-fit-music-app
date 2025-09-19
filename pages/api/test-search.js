// Test handler: /pages/api/test-search.js
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

        console.log("🔍 Starting Search API test...");

        // Test cases - verschillende zoek scenario's
        const testCases = [
            {
                name: "Exact match test",
                title: "Electronic Universe",
                artist: "The Dark Horror"
            },
            {
                name: "Popular song test",
                title: "Shape of You",
                artist: "Ed Sheeran"
            },
            {
                name: "Common name test",
                title: "Blinding Lights",
                artist: "The Weeknd"
            }
        ];

        const results = [];

        for (const test of testCases) {
            console.log(`\n🧪 Testing: ${test.name}`);
            console.log(`   Looking for: "${test.title}" by "${test.artist}"`);

            // Method 1: Basic search
            const basicQuery = `${test.title} ${test.artist}`;
            const basicUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(basicQuery)}&type=track&limit=5`;

            const basicResponse = await fetch(basicUrl, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });

            if (basicResponse.ok) {
                const basicData = await basicResponse.json();
                console.log(`   ✅ Basic search: ${basicData.tracks.items.length} results`);

                if (basicData.tracks.items.length > 0) {
                    const firstResult = basicData.tracks.items[0];
                    console.log(`      → Top result: "${firstResult.name}" by "${firstResult.artists[0].name}"`);
                    console.log(`      → Track ID: ${firstResult.id}`);
                    console.log(`      → Popularity: ${firstResult.popularity}`);
                }
            } else {
                console.log(`   ❌ Basic search failed: ${basicResponse.status}`);
            }

            // Method 2: Precise search with quotes
            const preciseQuery = `track:"${test.title}" artist:"${test.artist}"`;
            const preciseUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(preciseQuery)}&type=track&limit=5`;

            const preciseResponse = await fetch(preciseUrl, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });

            if (preciseResponse.ok) {
                const preciseData = await preciseResponse.json();
                console.log(`   🎯 Precise search: ${preciseData.tracks.items.length} results`);

                if (preciseData.tracks.items.length > 0) {
                    const firstResult = preciseData.tracks.items[0];
                    console.log(`      → Top result: "${firstResult.name}" by "${firstResult.artists[0].name}"`);
                    console.log(`      → Track ID: ${firstResult.id}`);
                }
            } else {
                console.log(`   ❌ Precise search failed: ${preciseResponse.status}`);
            }

            // Store results for response
            if (basicResponse.ok) {
                const data = await (await fetch(basicUrl, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                })).json();

                results.push({
                    testCase: test.name,
                    searchTerm: `"${test.title}" by "${test.artist}"`,
                    totalResults: data.tracks.items.length,
                    topMatch: data.tracks.items[0] ? {
                        name: data.tracks.items[0].name,
                        artist: data.tracks.items[0].artists[0].name,
                        id: data.tracks.items[0].id,
                        popularity: data.tracks.items[0].popularity,
                        preview_url: data.tracks.items[0].preview_url
                    } : null
                });
            }
        }

        // Test edge cases
        console.log("\n🧪 Testing edge cases...");

        // Test with special characters
        const edgeCaseQuery = "track:\"Let's Go\" artist:\"The Cars\"";
        const edgeUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(edgeCaseQuery)}&type=track&limit=3`;

        const edgeResponse = await fetch(edgeUrl, {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });

        if (edgeResponse.ok) {
            const edgeData = await edgeResponse.json();
            console.log(`   ✅ Edge case test: ${edgeData.tracks.items.length} results`);
        }

        console.log("\n✅ Search API test completed!");

        return res.status(200).json({
            success: true,
            message: "Search API test completed successfully!",
            results: results,
            summary: {
                totalTests: testCases.length,
                searchApiWorking: true,
                note: "Check console logs for detailed results"
            }
        });

    } catch (error) {
        console.error("Search test failed:", error);
        return res.status(500).json({ error: error.message });
    }
}