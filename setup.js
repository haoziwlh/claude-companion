#!/usr/bin/env node
/**
 * Claude Code Companion Customizer
 *
 * Customize your Claude Code companion's name, species, rarity, and personality.
 * Works by patching the local claude-code cli.js to allow ~/.claude.json overrides.
 *
 * Usage:
 *   node setup.js                          # interactive mode
 *   node setup.js --name "魏征" --species dragon --rarity legendary --shiny
 *   node setup.js --patch-only             # just re-apply the cli.js patch
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIES = [
  'duck','goose','blob','cat','dragon','octopus','owl','penguin',
  'turtle','snail','ghost','axolotl','capybara','cactus','robot',
  'rabbit','mushroom','chonk'
];

const RARITIES = ['common','uncommon','rare','epic','legendary'];

const RARITY_COLORS = {
  common: 'gray', uncommon: 'green', rare: 'blue',
  epic: 'purple', legendary: 'gold ✨'
};

// Custom dragon art (魏征 style: 官帽 + long beard)
// Each pose = array of 5 display rows. {E} = eye placeholder.
const CUSTOM_DRAGON_ART = [
  // Pose 1 – normal
  ['  ,_===_,   ', '  /^\\  /^\\  ', ' ({E}  {E}) ', '  |~~~~~|   ', '  `-vvv-´   '],
  // Pose 2 – stern (直谏)
  ['  ,_===_,   ', '  /^\\  /^\\  ', ' ({E}><{E}) ', '  |~~~~~|   ', '  `-vvv-´   '],
  // Pose 3 – animated
  ['  ,_===_,   ', ' >/^\\  /^\\< ', ' ({E}  {E}) ', '  /~~~~~\\   ', '  `-vvv-´   '],
];

// ── Find cli.js ───────────────────────────────────────────────────────────────

function findCliJs() {
  // Try resolving the `claude` binary symlink
  try {
    const claudeBin = execSync('which claude 2>/dev/null', { encoding: 'utf8' }).trim();
    if (claudeBin) {
      const real = fs.realpathSync(claudeBin);
      if (real.endsWith('cli.js') && fs.existsSync(real)) return real;
      // symlink points to a wrapper; walk up to find the package
      const pkg = path.resolve(path.dirname(real), '..', 'lib', 'node_modules',
                               '@anthropic-ai', 'claude-code', 'cli.js');
      if (fs.existsSync(pkg)) return pkg;
    }
  } catch {}

  // npm global root
  try {
    const root = execSync('npm root -g 2>/dev/null', { encoding: 'utf8' }).trim();
    const p = path.join(root, '@anthropic-ai', 'claude-code', 'cli.js');
    if (fs.existsSync(p)) return p;
  } catch {}

  return null;
}

// ── Patch cli.js ──────────────────────────────────────────────────────────────

// Marker injected by our patch — used to detect if already applied
const PATCH_MARKER = 'R.species=q.species';

function artToJs(art) {
  return '[' + art.map(pose => JSON.stringify(pose)).join(',') + ']';
}

function patchCliJs(cliPath) {
  let code = fs.readFileSync(cliPath, 'utf8');
  let changed = false;

  // Patch 1: vC() — allow ~/.claude.json to override species/rarity/shiny.
  // Uses regex to be resilient across minification differences between versions.
  // Pattern: function vC(){ ... j8().companion ... hR1(RR1()) ... return{...q,...K}}
  if (code.includes(PATCH_MARKER)) {
    log('-', 'cli.js patch already applied');
  } else {
    // Regex that doesn't rely on specific minified identifier names (j8/hR1/RR1/vC).
    // Matches any function that:
    //   1. reads .companion from a call
    //   2. destructures {bones:X} from a nested call
    //   3. returns a two-variable spread
    const vcRegex = /(function \w+\(\)\{let (\w+)=\w+\(\)\.companion;if\(!\2\)return;let\{bones:(\w+)\}=\w+\(\w+\(\)\);)return\{\.\.\.\2,\.\.\.\3\}\}/;
    const m = vcRegex.exec(code);
    if (m) {
      const q = m[2]; // companion var
      const K = m[3]; // bones var
      const patched = `${m[1]}let R={...${q},...${K}};if(${q}.species)R.species=${q}.species;if(${q}.rarity)R.rarity=${q}.rarity;if(${q}.shiny!==void 0)R.shiny=${q}.shiny;return R}`;
      code = code.replace(m[0], patched);
      log('✓', 'cli.js patched (species/rarity/shiny override enabled)');
      changed = true;
    } else {
      log('✗', 'vC() pattern not found — species override unavailable (name/personality still work)');
    }
  }

  // Patch 2: dragon art (only if dragon is selected)
  const rfkIdx = code.indexOf('RFK={');
  const dragonStart = rfkIdx >= 0 ? code.indexOf('[Zv8]', rfkIdx) : -1;
  const dragonEnd   = dragonStart >= 0 ? code.indexOf(',[Gv8]', dragonStart) : -1;

  if (dragonStart > 0 && dragonEnd > 0) {
    const newArt = artToJs(CUSTOM_DRAGON_ART);
    const currentArt = code.substring(dragonStart + 6, dragonEnd);
    if (currentArt === newArt) {
      log('-', 'Dragon art already customized');
    } else {
      // dragonEnd points to ',[Gv8]' — keep the leading comma
      code = code.substring(0, dragonStart + 6) + newArt + code.substring(dragonEnd);
      log('✓', 'Dragon art updated (魏征 style: 官帽 + beard)');
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(cliPath, code);
  return changed;
}

// ── Update ~/.claude.json ─────────────────────────────────────────────────────

function updateCompanion(settings) {
  const claudeJson = path.join(process.env.HOME, '.claude.json');
  let data = {};
  try { data = JSON.parse(fs.readFileSync(claudeJson, 'utf8')); } catch {}

  const prev = data.companion || {};
  const next = { ...prev };
  if (settings.name)        next.name        = settings.name;
  if (settings.personality) next.personality  = settings.personality;
  if (settings.species)     next.species      = settings.species;
  if (settings.rarity)      next.rarity       = settings.rarity;
  if (settings.shiny !== undefined) next.shiny = settings.shiny;

  data.companion = next;
  fs.writeFileSync(claudeJson, JSON.stringify(data, null, 4));
  log('✓', `~/.claude.json updated → name="${next.name}" species=${next.species} rarity=${next.rarity}${next.shiny ? ' ✨' : ''}`);
}

// ── Shell wrapper hint ────────────────────────────────────────────────────────

function printShellWrapper(cliPath, scriptPath) {
  console.log(`
To auto-re-patch after claude updates, add this to ~/.zshrc or ~/.bashrc:

  function claude() {
    if ! grep -q 'R.species=q.species' "${cliPath}" 2>/dev/null; then
      node "${scriptPath}" --patch-only
    fi
    command claude "$@"
  }
`);
}

// ── Interactive ───────────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise(r => rl.question(question, a => r(a.trim())));
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nAvailable species:');
  console.log(' ', SPECIES.join(', '));
  const species = await ask(rl, 'Species (default: turtle): ');

  console.log('\nAvailable rarities (affects color):');
  Object.entries(RARITY_COLORS).forEach(([r, c]) => console.log(`  ${r} → ${c}`));
  const rarity = await ask(rl, 'Rarity (default: common): ');

  const shinyInput = await ask(rl, 'Shiny? ✨  (y/N): ');
  const name = await ask(rl, 'Companion name (default: keep current): ');
  const personality = await ask(rl, 'Personality one-liner (leave blank to keep current): ');

  rl.close();

  return {
    species:     SPECIES.includes(species)  ? species  : undefined,
    rarity:      RARITIES.includes(rarity)  ? rarity   : undefined,
    shiny:       shinyInput.toLowerCase() === 'y' ? true : undefined,
    name:        name        || undefined,
    personality: personality || undefined,
  };
}

// ── Args ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  return {
    name:        get('--name'),
    species:     get('--species'),
    rarity:      get('--rarity'),
    personality: get('--personality'),
    shiny:       args.includes('--shiny') ? true : undefined,
    patchOnly:   args.includes('--patch-only'),
    interactive: args.length === 0,
  };
}

// ── Logging ───────────────────────────────────────────────────────────────────

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  console.log('\n🐉 Claude Code Companion Customizer\n');

  // Step 1: find cli.js
  process.stdout.write('[1] Finding claude-code... ');
  const cliPath = findCliJs();
  if (!cliPath) {
    console.log('');
    log('✗', 'claude-code not found. Install it with: npm install -g @anthropic-ai/claude-code');
    process.exit(1);
  }
  console.log('found\n');

  // Step 2: patch cli.js
  console.log('[2] Patching cli.js...');
  patchCliJs(cliPath);

  if (args.patchOnly) {
    console.log('\nPatch complete.\n');
    return;
  }

  // Step 3: collect settings
  let settings = args;
  if (args.interactive) {
    console.log('\n[3] Configure your companion:');
    settings = await interactive();
  }

  // Step 4: update ~/.claude.json
  console.log('\n[4] Updating companion config...');
  const hasSettings = Object.values(settings).some(v => v !== undefined);
  if (hasSettings) {
    updateCompanion(settings);
  } else {
    log('-', 'No changes to companion config');
  }

  console.log('\n✅ Done! Start a new claude session and run /buddy pet\n');
  printShellWrapper(cliPath, __filename);
}

main().catch(err => { console.error(err.message); process.exit(1); });
