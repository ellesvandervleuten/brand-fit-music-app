// scripts/parseTop2000.js - Run this once to convert Excel to JSON

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function parseTop2000Excel() {
    try {
        // Pad naar je gedownloade Excel file
        const excelPath = './NPO-Radio-2-Top-2000-2024.xlsx'; // Pas dit aan naar jouw file locatie

        console.log('🔍 Reading Excel file...');
        const workbook = XLSX.readFile(excelPath);

        // Neem het eerste sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        console.log('📊 Converting to JSON...');
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📄 Found ${rawData.length} rows`);
        console.log('First few rows:', rawData.slice(0, 3));

        // Clean en structureer de data
        const cleanedData = rawData.map((row, index) => {
            // NPO Excel heeft waarschijnlijk kolommen zoals: Positie, Artiest, Titel, Jaar
            // Pas deze namen aan op basis van wat je in de Excel ziet

            return {
                position: row.Positie || row.Position || row.Pos || (index + 1),
                artist: cleanString(row.Artiest || row.Artist || row.Interpret || ''),
                title: cleanString(row.Titel || row.Title || row.Song || row.Track || ''),
                year: parseInt(row.Jaar || row.Year || row.Jaartal || 0) || null
            };
        }).filter(item =>
            // Filter lege entries
            item.artist && item.title && item.position
        );

        console.log(`✅ Cleaned data: ${cleanedData.length} valid entries`);

        // Bewaar als JSON in je project
        const outputPath = './public/data/top2000-2024.json';

        // Maak directory als die niet bestaat
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(cleanedData, null, 2));

        console.log(`💾 Saved to: ${outputPath}`);
        console.log('🎵 Sample entries:');
        cleanedData.slice(0, 10).forEach(item => {
            console.log(`${item.position}. ${item.artist} - ${item.title} (${item.year})`);
        });

        return cleanedData;

    } catch (error) {
        console.error('❌ Error parsing Excel:', error);
        console.log('\n🔧 Debug tips:');
        console.log('1. Check if Excel file path is correct');
        console.log('2. Check column names in Excel (Positie/Position, Artiest/Artist, etc.)');
        console.log('3. Try opening Excel and check first few rows');
    }
}

// Helper functie om strings te cleanen
function cleanString(str) {
    if (!str) return '';
    return str.toString().trim().replace(/\s+/g, ' ');
}

// Run het script
parseTop2000Excel();