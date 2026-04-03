# Claude Code Companion Customizer

Customize your [Claude Code](https://claude.ai/code) companion's name, species, appearance, and personality.

> Built while customizing a dragon named 魏征 (Wei Zheng) — the famously blunt Tang Dynasty minister who never sugarcoated anything.

![demo](https://img.shields.io/badge/species-dragon-gold)

## What it does

Claude Code ships with a companion (a small creature that sits beside your input and occasionally comments on your code). By default it's randomly assigned. This script lets you:

- Change the **name** and **personality**
- Change the **species** (18 options)
- Set **rarity** to control the color (legendary = gold)
- Enable the **✨ shiny** badge

## Requirements

- Node.js
- `@anthropic-ai/claude-code` installed globally (`npm install -g @anthropic-ai/claude-code`)

## Usage

### npm (recommended)
```bash
# Interactive mode
npx cc-companion

# One-liner
npx cc-companion --name "魏征" --species dragon --rarity legendary --shiny \
  --personality "直言敢谏的龙，见到烂代码必冒火，从不说违心话。"

# Re-apply patch only (after claude updates)
npx cc-companion --patch-only
```

### Quick install (curl)
```bash
curl -sL https://raw.githubusercontent.com/haoziwlh/claude-companion/master/setup.js -o /tmp/companion.js && node /tmp/companion.js
```

One-liner with options:
```bash
curl -sL https://raw.githubusercontent.com/haoziwlh/claude-companion/master/setup.js -o /tmp/companion.js && \
  node /tmp/companion.js --name "魏征" --species dragon --rarity legendary --shiny \
  --personality "直言敢谏的龙，见到烂代码必冒火，从不说违心话。"
```

Re-apply patch after claude updates:
```bash
curl -sL https://raw.githubusercontent.com/haoziwlh/claude-companion/master/setup.js -o /tmp/companion.js && node /tmp/companion.js --patch-only
```

### Clone & run
```bash
git clone https://github.com/haoziwlh/claude-companion.git
cd claude-companion

# Interactive mode
node setup.js

# One-liner
node setup.js --name "魏征" --species dragon --rarity legendary --shiny \
  --personality "直言敢谏的龙，见到烂代码必冒火，从不说违心话。"

# Re-apply patch only (after claude updates)
node setup.js --patch-only
```

## Options

| Flag | Values | Description |
|------|--------|-------------|
| `--name` | any string | Companion name |
| `--species` | see below | Visual appearance |
| `--rarity` | see below | Color theme |
| `--shiny` | (flag) | Adds ✨ SHINY ✨ badge |
| `--personality` | one sentence | Shown in the companion card |
| `--patch-only` | (flag) | Only patch cli.js, skip config |

### Species
`duck` `goose` `blob` `cat` `dragon` `octopus` `owl` `penguin` `turtle` `snail` `ghost` `axolotl` `capybara` `cactus` `robot` `rabbit` `mushroom` `chonk`

### Rarities & colors
| Rarity | Color |
|--------|-------|
| common | gray |
| uncommon | green |
| rare | blue |
| epic | purple |
| **legendary** | **gold** |

## After claude auto-updates

Claude Code auto-updates and will overwrite the patch. Add this to your `~/.zshrc` or `~/.bashrc` to auto-re-patch on start:

```bash
function claude() {
  local cli="$(npm root -g)/@anthropic-ai/claude-code/cli.js"
  if [[ -f "$cli" ]] && ! grep -q 'R.species=q.species' "$cli" 2>/dev/null; then
    npx cc-companion --patch-only &>/dev/null
  fi
  command claude "$@"
}
```

## How it works

Claude Code determines your companion's species and rarity from your account UUID (deterministic, not stored locally). The settings are stored in `~/.claude.json` under the `companion` key, but they're overridden at runtime by the generated "bones."

This script patches one function in `cli.js` (`vC()`) to flip the merge order so your `~/.claude.json` settings take priority. It also replaces the dragon ASCII art with a custom 魏征-themed design (官帽 + long beard).

## Notes

- The patch targets a specific function signature in `cli.js` and may break on future versions of claude-code. Run `--patch-only` to re-apply.
- The companion name `~/.claude.json` is also used in the system prompt sent to Claude, so Claude will know your companion's name.
- Only the `dragon` species has a custom art override. Other species use their default art.
