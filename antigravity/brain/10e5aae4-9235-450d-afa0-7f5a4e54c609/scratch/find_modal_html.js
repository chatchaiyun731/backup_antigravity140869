const fs = require('fs');
const content = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/index.html', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('Incident details') || line.includes('รายละเอียดเหตุการณ์') || line.includes('modal')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
