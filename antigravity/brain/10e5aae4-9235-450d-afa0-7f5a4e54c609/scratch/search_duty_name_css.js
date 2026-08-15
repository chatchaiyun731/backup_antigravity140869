const fs = require('fs');
const path = require('path');

const directory = 'C:/Users/66830/.gemini/antigravity/scratch/g-patrol';

function searchInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('duty-name') || line.includes('duty-loc') || line.includes('duty-details')) {
            console.log(`${filePath} [Line ${index + 1}]: ${line.trim()}`);
        }
    });
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
        } else if (file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.js')) {
            searchInFile(fullPath);
        }
    });
}

searchDirectory(directory);
