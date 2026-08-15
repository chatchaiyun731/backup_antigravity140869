const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('btn-export-pdf') || line.includes('export-pdf')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
