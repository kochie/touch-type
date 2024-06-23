const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const buildNumber = process.env.BUILD_NUMBER || '0';

console.log(`${version}-${buildNumber}`);
