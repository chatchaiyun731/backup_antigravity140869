const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('view-checkpoints') || line.includes('viewCheckpoints') || line.includes('CheckpointsNav') || line.includes('checkpoints-nav')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
