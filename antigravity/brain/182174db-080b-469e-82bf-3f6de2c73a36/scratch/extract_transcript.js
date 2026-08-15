const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\66830\\.gemini\\antigravity\\brain\\c65c70e4-1473-4c30-bb91-f17f7cbd18d7\\.system_generated\\logs\\transcript.jsonl';

const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.type === 'USER_INPUT') {
      console.log(`Step ${data.step_index}: ${data.content}`);
      console.log("-".repeat(50));
    }
  } catch (e) {
    // Ignore parse errors
  }
});
