const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/style.css', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('checkpoints') || line.includes('guard') || line.includes('role') || line.includes('officer')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
