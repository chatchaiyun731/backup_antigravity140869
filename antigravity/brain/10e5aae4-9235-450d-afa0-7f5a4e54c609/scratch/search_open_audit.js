const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js', 'utf8');

const lines = content.split('\n');
let inside = false;
let start = 0;
lines.forEach((line, index) => {
    if (line.includes('function openAuditForm')) {
        start = index;
        inside = true;
    }
    if (inside && index < start + 50) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
