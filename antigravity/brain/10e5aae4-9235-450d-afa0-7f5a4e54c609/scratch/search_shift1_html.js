const fs = require('fs');
const path = 'C:/Users/66830/.gemini/antigravity/scratch/g-patrol/index.html';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('shift1')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
