const fs = require('fs');
const path = require('path');

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.cmd')) {
      const fullPath = path.join(dir, file);
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      if (content.includes('SET dp0=%~dp0')) {
        content = content.replace(/SET dp0=%~dp0/g, 'SET "dp0=%~dp0"');
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

// Patch root and workspace bin dirs
patchDir(path.resolve(__dirname, '../node_modules/.bin'));
patchDir(path.resolve(__dirname, '../server/node_modules/.bin'));
patchDir(path.resolve(__dirname, '../client/node_modules/.bin'));
patchDir(path.resolve(__dirname, '../shared/node_modules/.bin'));
console.log('Successfully patched all .cmd shims for Windows paths containing "&"');
