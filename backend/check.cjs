const fs = require('fs');

const exePath = 'PC_Info.exe';
const data = fs.readFileSync(exePath);
const placeholder = Buffer.from('00000000-0000-0000-0000-000000000000', 'utf16le');

const position = data.indexOf(placeholder);
if (position >= 0) {
    console.log(`Placeholder found at position: 0x${position.toString(16)}`);
    console.log('Context:', data.slice(position, position + 50).toString('hex'));
} else {
    console.log('Placeholder not found in EXE file');
}