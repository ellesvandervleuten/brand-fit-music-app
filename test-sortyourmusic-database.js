// test-sortyourmusic-database.js - Test script voor sortyourmusic database
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function testSortYourMusicDatabase() {
    console.log('🧪 Testing SortYourMusic Database Integration');
    console.log('============================================');

    try {
        // 1. Check for enriched database first
        const enrichedPath = path.join(process.cwd(), 'public', 'data', 'output', 'enriched_database.xlsx');
        const inputPath = path.join(process.cwd(), 'public', 'data', 'input', 'sortyourmusic.xlsx');

        let dbPath = null;
        let isEnriched = false;

        console.log('📁 Checking for database files...');
        console.log(`   Looking for: ${enrichedPath}`);
        console.log(`   Looking for: ${inputPath}`);

        if (fs.existsSync(enrichedPath)) {
            dbPath = enrichedPath;
            isEnriched = true;
            console.log('✅ Found enriched database: public/data/output/enriched_database.xlsx');
        } else if (fs.existsSync(inputPath)) {
            dbPath = inputPath;
            console.log('⚠️  Found original database: public/data/input/sortyourmusic.xlsx');
            console.log('💡 Run enrichment script for full Spotify features');
        } else {
            console.error('❌ No database found!');
            console.log('\n📁 Expected directory structure:');
            console.log('   brand-fit-music-app/');
            console.log('   └── public/');
            console.log('       └── data/');
            console.log('           ├── input/');
            console.log('           │   └── sortyourmusic.xlsx');
            console.log('           └── output/');
            console.log('               └── enriched_database.xlsx (generated)');

            console.log('\n🛠️  To fix this:');
            console.log('   1. Create: mkdir -p public/data/input');
            console.log('   2. Place your Excel file in: public/data/input/sortyourmusic.xlsx');
            console.log('   3. Run: npm run enrich-database');
            return;
        }

        // 2. Load and analyze Excel file
        console.log(`\n📊 Loading database from: ${path.relative(process.cwd(), dbPath)}`);
        const workbook = XLSX.readFile(dbPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`\n📊 Database Statistics:`);
        console.log(`   Database type: ${isEnriched ? 'Enriched' : 'Original'}`);
        console.log(`   Total rows: ${rawData.length}`);

        // 3. Analyze column structure
        const firstRow = rawData[0];
        if (!firstRow) {
            console.error('❌ Database appears to be empty!');
            return;
        }

        const columns = Object.keys(firstRow);
        console.log(`\n🔍 Column Analysis:`);
        console.log(`   Total columns: ${columns.length}`);
        console.log(`   Sample columns: ${columns.slice(0, 8).join(', ')}...`);

        // 4. Check for core columns
        const coreColumns = ['Title', 'Artist', 'BPM', 'Energy', 'Dance', 'Acoustic'];
        const spotifyColumns = ['Spotify_ID', 'Genre_1', 'Popularity', 'Match_Confidence'];

        console.log(`\n✅ Core audio feature columns:`);
        coreColumns.forEach(col => {
            const exists = columns.includes(col);
            if (exists) {
                const count = rawData.filter(row => row[col] && !isNaN(parseFloat(row[col])) && parseFloat(row[col]) > 0).length;
                const percentage = Math.round((count / rawData.length) * 100);
                console.log(`   ✓ ${col}: ${count}/${rawData.length} (${percentage}%)`);
            } else {
                console.log(`   ✗ ${col}: Missing`);
            }
        });

        console.log(`\n🎵 Spotify enrichment columns:`);
        spotifyColumns.forEach(col => {
            const exists = columns.includes(col);
            if (exists) {
                const count = rawData.filter(row => row[col] && row[col].toString().trim()).length;
                const percentage = Math.round((count / rawData.length) * 100);
                console.log(`   ✓ ${col}: ${count}/${rawData.length} (${percentage}%)`);
            } else {
                console.log(`   ✗ ${col}: Missing`);
            }
        });

        // 5. Data quality analysis
        console.log(`\n🔬 Data Quality Analysis:`);

        const withTitle = rawData.filter(row => row.Title && row.Title.toString().trim()).length;
        const withArtist = rawData.filter(row => row.Artist && row.Artist.toString().trim()).length;
        const withBPM = rawData.filter(row => row.BPM && !isNaN(parseFloat(row.BPM)) && parseFloat(row.BPM) > 0).length;
        const withSpotifyID = rawData.filter(row => row.Spotify_ID && row.Spotify_ID.toString().trim()).length;

        console.log(`   Valid titles: ${withTitle}/${rawData.length} (${Math.round(withTitle / rawData.length * 100)}%)`);
        console.log(`   Valid artists: ${withArtist}/${rawData.length} (${Math.round(withArtist / rawData.length * 100)}%)`);
        console.log(`   Valid BPM: ${withBPM}/${rawData.length} (${Math.round(withBPM / rawData.length * 100)}%)`);
        console.log(`   Spotify enrichment: ${withSpotifyID}/${rawData.length} (${Math.round(withSpotifyID / rawData.length * 100)}%)`);

        // 6. Audio features analysis
        if (withBPM > 0) {
            console.log(`\n🎼 Audio Features Analysis:`);

            const bpmValues = rawData.filter(row => !isNaN(parseFloat(row.BPM)) && parseFloat(row.BPM) > 0)
                .map(row => parseFloat(row.BPM));
            const energyValues = rawData.filter(row => !isNaN(parseFloat(row.Energy)))
                .map(row => parseFloat(row.Energy));

            if (bpmValues.length > 0) {
                const avgBPM = bpmValues.reduce((sum, val) => sum + val, 0) / bpmValues.length;
                const minBPM = Math.min(...bpmValues);
                const maxBPM = Math.max(...bpmValues);
                console.log(`   BPM range: ${Math.round(minBPM)}-${Math.round(maxBPM)} (avg: ${Math.round(avgBPM)})`);

                // Tempo distribution
                const tempoRanges = {
                    'Slow (< 90)': bpmValues.filter(bpm => bpm < 90).length,
                    'Moderate (90-110)': bpmValues.filter(bpm => bpm >= 90 && bpm < 110).length,
                    'Upbeat (110-130)': bpmValues.filter(bpm => bpm >= 110 && bpm < 130).length,
                    'Fast (> 130)': bpmValues.filter(bpm => bpm >= 130).length,
                };

                console.log(`   Tempo distribution:`);
                Object.entries(tempoRanges).forEach(([range, count]) => {
                    const percentage = Math.round((count / bpmValues.length) * 100);
                    console.log(`     ${range}: ${count} tracks (${percentage}%)`);
                });
            }

            if (energyValues.length > 0) {
                const avgEnergy = energyValues.reduce((sum, val) => sum + val, 0) / energyValues.length;
                const energyScale = avgEnergy > 1 ? '0-100' : '0-1';
                console.log(`   Energy scale: ${energyScale} (avg: ${avgEnergy.toFixed(2)})`);
            }
        }

        // 7. Genre analysis (if enriched)
        if (isEnriched && rawData.some(row => row.Genre_1)) {
            console.log(`\n🎭 Genre Analysis:`);
            const genreCounts = {};

            rawData.forEach(row => {
                if (row.Genre_1) genreCounts[row.Genre_1] = (genreCounts[row.Genre_1] || 0) + 1;
                if (row.Genre_2) genreCounts[row.Genre_2] = (genreCounts[row.Genre_2] || 0) + 1;
                if (row.Genre_3) genreCounts[row.Genre_3] = (genreCounts[row.Genre_3] || 0) + 1;
            });

            const topGenres = Object.entries(genreCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);

            console.log(`   Total unique genres: ${Object.keys(genreCounts).length}`);
            console.log(`   Top 10 genres:`);
            topGenres.forEach(([genre, count]) => {
                console.log(`     ${genre}: ${count} tracks`);
            });
        }

        // 8. Sample tracks
        console.log(`\n🎵 Sample Tracks:`);
        const samples = rawData.filter(row => row.Title && row.Artist).slice(0, 3);
        samples.forEach((track, i) => {
            console.log(`   ${i + 1}. "${track.Title}" by ${track.Artist}`);
            console.log(`      BPM: ${track.BPM || 'N/A'}, Energy: ${track.Energy || 'N/A'}`);
            if (track.Spotify_ID) {
                console.log(`      Spotify: ✓ (${track.Genre_1 || 'No genre'})`);
            }
        });

        console.log(`\n✅ Database analysis complete!`);
        console.log(`💡 Your database is ready for the music tool.`);

        if (!isEnriched) {
            console.log(`\n🚀 Next steps:`);
            console.log(`   1. Run: npm run enrich-database`);
            console.log(`   2. This will add Spotify genres, popularity, and audio features`);
            console.log(`   3. Enriched database will be saved as: public/data/output/enriched_database.xlsx`);
        } else {
            console.log(`\n🎉 Your database is fully enriched and ready to use!`);
        }

    } catch (error) {
        console.error('❌ Error analyzing database:', error.message);

        if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
            console.log('\n💡 File not found. Make sure your database is in the right location:');
            console.log('   public/data/input/sortyourmusic.xlsx');
        }
    }
}

// Run the test
if (require.main === module) {
    testSortYourMusicDatabase().catch(console.error);
}

module.exports = { testSortYourMusicDatabase };