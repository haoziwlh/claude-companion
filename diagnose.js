#!/usr/bin/env node
/**
 * cc-statusline diagnose — checks installation health.
 */
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_DIR = path.join(HOME, '.claude');
const SETTINGS_JSON = path.join(CLAUDE_DIR, 'settings.json');
const TARGET_SCRIPT = path.join(CLAUDE_DIR, 'statusline.sh');

function check(label, ok, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('\n📊 cc-statusline diagnose\n');

const scriptExists = fs.existsSync(TARGET_SCRIPT);
check('statusline script', scriptExists, TARGET_SCRIPT);

let scriptExecutable = false;
if (scriptExists) {
  try {
    const mode = fs.statSync(TARGET_SCRIPT).mode;
    scriptExecutable = (mode & 0o111) !== 0;
  } catch {}
  check('script is executable', scriptExecutable);
}

let settings = null;
try { settings = JSON.parse(fs.readFileSync(SETTINGS_JSON, 'utf8')); } catch {}
const statusOk = !!(settings && settings.statusLine && settings.statusLine.command &&
  settings.statusLine.command.includes('statusline.sh'));
check('settings.json statusLine', statusOk,
  statusOk ? settings.statusLine.command : 'not configured');

const healthy = scriptExists && scriptExecutable && statusOk;
console.log('');
if (healthy) {
  console.log('  All good. Start a new claude session or press shift+tab to redraw.');
} else {
  console.log('  Run: npx cc-statusline');
}
console.log('');
