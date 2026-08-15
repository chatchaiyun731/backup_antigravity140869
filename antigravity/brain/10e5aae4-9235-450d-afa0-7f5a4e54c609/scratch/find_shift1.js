const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/66830/.gemini/antigravity/scratch/g-patrol';
const files = fs.readdirSync(dir);

files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.html'))) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('shift1')) {
            console.log(`Found 'shift1' in file: ${file}`);
        }
    }
});
