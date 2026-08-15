const fs = require('fs');
const path = 'C:/Users/66830/.gemini/antigravity/scratch/g-patrol/app.js';
let content = fs.readFileSync(path, 'utf8');

const oldMappingRegex = /const\s+shiftTextMapping\s*=\s*\{[\s\S]*?\};/g;

const newMapping = `const shiftTextMapping = {
                'shift1': 'กะ 1 (06:00-11:00)',
                'shift2': 'กะ 2 (12:00-14:00)',
                'shift3': 'กะ 3 (14:30-16:00)',
                'shift4': 'กะ 4 (16:30-18:00)',
                'shift5': 'กะ 5 (20:30-22:00)',
                'shift6': 'กะ 6 (00:30-02:00)',
                'shift7': 'กะ 7 (02:30-04:00)',
                'shift8': 'กะ 8 (04:30-06:00)'
            };`;

const count = (content.match(oldMappingRegex) || []).length;
console.log(`Found ${count} occurrences of shiftTextMapping.`);

content = content.replace(oldMappingRegex, newMapping);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully replaced all occurrences.');
