const fs = require('fs');
const path = require('path');

function searchInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.toLowerCase().includes('court marshal') || line.toLowerCase().includes('court_marshal')) {
            console.log(`${path.basename(filePath)}:${index + 1}: ${line.trim()}`);
        }
    });
}

searchInFile('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js');
searchInFile('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/index.html');
searchInFile('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/supabase-service.js');
