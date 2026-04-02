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

  // Version
  const ver = code.match(/"version"\s*:\s*"([\d.]+)"/);
  console.log('claude version:', ver ? ver[1] : 'unknown');

  const patched = code.includes('R.species=q.species');
  console.log('patch applied:', patched);

  // Key strings
  const keys = ['bones:', '.companion', 'companionMuted', '/buddy', 'species', 'rarity', 'hR1', 'RR1'];
  keys.forEach(k => console.log(`has "${k}":`, code.includes(k)));

  // Find companion-related function
  const compIdx = code.indexOf('.companion');
  if (compIdx >= 0) {
    console.log('\n.companion context:');
    console.log(code.substring(compIdx - 150, compIdx + 200));
  }
}
