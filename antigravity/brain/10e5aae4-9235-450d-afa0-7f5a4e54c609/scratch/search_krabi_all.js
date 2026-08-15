const fs = require('fs');
const path = require('path');

const directory = 'C:/Users/66830/.gemini/antigravity/scratch/g-patrol';

function searchInFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('กระบี่') || line.includes('krabi') || line.includes('Krabi')) {
                console.log(`${filePath} [Line ${index + 1}]: ${line.trim()}`);
            }
        });
    } catch (e) {
        // ignore errors
    }
}

function searchDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchDirectory(fullPath);
            }
        } else {
            searchInFile(fullPath);
        }
    });
}

searchDirectory(directory);
console.log('Search complete.');
