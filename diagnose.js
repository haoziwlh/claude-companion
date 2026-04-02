#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let cliPath;
try {
  const bin = execSync('which claude', { encoding: 'utf8' }).trim();
  const real = fs.realpathSync(bin);
  cliPath = real.endsWith('cli.js') ? real : null;
} catch {}

if (!cliPath) {
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    cliPath = path.join(root, '@anthropic-ai/claude-code/cli.js');
  } catch {}
}

console.log('cli.js path :', cliPath);
console.log('file exists  :', cliPath ? fs.existsSync(cliPath) : false);

if (cliPath && fs.existsSync(cliPath)) {
  const code = fs.readFileSync(cliPath, 'utf8');
  const patched = code.includes('R.species=q.species');
  console.log('patch applied:', patched);

  const vcRegex = /(function \w+\(\)\{let (\w+)=\w+\(\)\.companion;if\(!\2\)return;let\{bones:(\w+)\}=\w+\(\w+\(\)\);)return\{\.\.\.\2,\.\.\.\3\}\}/;
  const m = vcRegex.exec(code);
  console.log('regex match  :', !!m);

  if (!m && !patched) {
    const i = code.indexOf('.companion');
    if (i >= 0) console.log('companion ctx:', code.substring(i - 80, i + 80));
  }
}
