/**
 * Adds chapters 21-27 to constants/matthew-raw-chapters.json from constants/matthew-extra.json
 * Run: node scripts/add-matthew-21-27.js
 */
const fs = require('fs');
const path = require('path');
const rawPath = path.join(__dirname, '..', 'constants', 'matthew-raw-chapters.json');
const extraPath = path.join(__dirname, '..', 'constants', 'matthew-extra.json');

if (!fs.existsSync(extraPath)) {
  console.log('matthew-extra.json not found - create it with keys "21" through "27"');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
for (let c = 21; c <= 27; c++) {
  if (extra[String(c)]) {
    raw[String(c)] = extra[String(c)];
    console.log('Added chapter', c);
  }
}
fs.writeFileSync(rawPath, JSON.stringify(raw, null, 2), 'utf8');
console.log('Done.');
