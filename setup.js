#!/usr/bin/env node
/**
 * cc-statusline installer
 *
 * Copies statusline.sh into ~/.claude/ and wires it into
 * ~/.claude/settings.json via the statusLine field. Idempotent.
 *
 * Usage:
 *   npx cc-statusline              # install / update
 *   npx cc-statusline --uninstall  # remove
 */

const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_DIR = path.join(HOME, '.claude');
const SETTINGS_JSON = path.join(CLAUDE_DIR, 'settings.json');
const TARGET_SCRIPT = path.join(CLAUDE_DIR, 'statusline.sh');
const SOURCE_SCRIPT = path.join(__dirname, 'statusline.sh');

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

// ── Install script ───────────────────────────────────────────────────────────

function installScript() {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });

  if (!fs.existsSync(SOURCE_SCRIPT)) {
    throw new Error(`statusline.sh not found at ${SOURCE_SCRIPT}`);
  }
  const source = fs.readFileSync(SOURCE_SCRIPT, 'utf8');
  const existing = fs.existsSync(TARGET_SCRIPT) ? fs.readFileSync(TARGET_SCRIPT, 'utf8') : null;

  if (existing === source) {
    log('-', `${TARGET_SCRIPT} already up-to-date`);
    return false;
  }

  fs.writeFileSync(TARGET_SCRIPT, source);
  fs.chmodSync(TARGET_SCRIPT, 0o755);
  log('✓', `${TARGET_SCRIPT} installed`);
  return true;
}

// ── Configure settings.json ──────────────────────────────────────────────────

function loadSettings() {
  if (!fs.existsSync(SETTINGS_JSON)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_JSON, 'utf8'));
  } catch (e) {
    throw new Error(`~/.claude/settings.json is not valid JSON: ${e.message}`);
  }
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_JSON, JSON.stringify(settings, null, 2));
}

function configureSettings() {
  const settings = loadSettings();
  const desired = { type: 'command', command: `bash ${TARGET_SCRIPT}` };

  if (settings.statusLine &&
      settings.statusLine.type === desired.type &&
      settings.statusLine.command === desired.command) {
    log('-', 'settings.json statusLine already configured');
    return false;
  }

  settings.statusLine = desired;
  saveSettings(settings);
  log('✓', 'settings.json statusLine configured');
  return true;
}

// ── Uninstall ────────────────────────────────────────────────────────────────

function uninstall() {
  console.log('\n🗑  cc-statusline uninstaller\n');

  if (fs.existsSync(TARGET_SCRIPT)) {
    fs.unlinkSync(TARGET_SCRIPT);
    log('✓', `removed ${TARGET_SCRIPT}`);
  } else {
    log('-', 'statusline.sh not found');
  }

  if (fs.existsSync(SETTINGS_JSON)) {
    const settings = loadSettings();
    if (settings.statusLine && (settings.statusLine.command || '').includes('statusline.sh')) {
      delete settings.statusLine;
      saveSettings(settings);
      log('✓', 'removed statusLine from settings.json');
    } else {
      log('-', 'no matching statusLine in settings.json');
    }
  }

  console.log('\nDone. Start a new claude session to see the default statusline.\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--uninstall') || args.includes('-u')) {
    uninstall();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
cc-statusline — Claude Code statusline with path, git, model,
context usage, 5h/7d rate-limit usage, and session cost.

Usage:
  npx cc-statusline              install / update
  npx cc-statusline --uninstall  remove
  npx cc-statusline --help       show this
`);
    return;
  }

  console.log('\n📊 cc-statusline installer\n');
  console.log('[1] Installing statusline script...');
  installScript();
  console.log('\n[2] Configuring ~/.claude/settings.json...');
  configureSettings();
  console.log('\n✅ Done. Start a new claude session or press shift+tab to redraw.\n');
}

try { main(); }
catch (err) { console.error(`\n✗ ${err.message}\n`); process.exit(1); }
