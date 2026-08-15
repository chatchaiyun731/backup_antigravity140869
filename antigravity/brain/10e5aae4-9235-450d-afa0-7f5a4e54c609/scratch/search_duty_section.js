const fs = require('fs');

const appJs = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js', 'utf8');
const indexHtml = fs.readFileSync('C:/Users/66830/.gemini/antigravity/scratch/g-patrol/index.html', 'utf8');

console.log('--- app.js ---');
appJs.split('\n').forEach((line, index) => {
    if (line.includes('duty-report') || line.includes('dutyReport') || line.includes('section-duty-report')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});

console.log('--- index.html ---');
indexHtml.split('\n').forEach((line, index) => {
    if (line.includes('duty-report') || line.includes('section-duty-report')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
