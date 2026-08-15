const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/index.html', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('officer-only')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
