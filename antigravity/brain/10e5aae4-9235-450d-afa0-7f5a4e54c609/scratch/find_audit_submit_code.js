const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('g_patrol_audit_records') && (line.includes('insert') || line.includes('upsert') || line.includes('client'))) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
