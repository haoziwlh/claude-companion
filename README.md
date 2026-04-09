# cc-statusline

A drop-in statusline for [Claude Code](https://claude.ai/code) showing everything you actually want to know at a glance:

```
~/github/project │  main ✓ │ ◆ Opus 4.6 · ctx:58% │ 5h:14% 7d:66% │ $4.91
```

- **Current path** (with `~` shorthand)
- **Git branch + status** — green ✓ when clean, yellow ● when dirty
- **Model + context window %** — how full your session context is (color-coded)
- **5h / 7d usage %** — real numbers from Claude Code's own `/usage` source of truth, not local estimates
- **Session cost** — `$X.XX` for the current session

All segments auto-hide when their data isn't available (e.g. outside a git repo, or before the first message in a new session).

## Install

```bash
npx cc-statusline
```

That's it. Start a new `claude` session (or press `shift+tab` to force a redraw) and you'll see the new statusline.

## What it does

1. Copies `statusline.sh` to `~/.claude/statusline.sh`
2. Sets `statusLine` in `~/.claude/settings.json` to run that script

Both steps are idempotent — re-running `npx cc-statusline` is safe and will only overwrite if the script changed.

## How the 5h / 7d numbers work

Claude Code pipes a session JSON into every statusline render. In recent versions (2.1.x+) that JSON includes a `rate_limits` field populated from the same backend that powers the `/usage` dialog — so the numbers you see in the statusline match `/usage` exactly. No local estimation, no API calls, no auth.

The `rate_limits` field is only populated **after the first message in a session**, so new sessions briefly show no 5h/7d segment. This is expected.

## Uninstall

```bash
npx cc-statusline --uninstall
```

Removes `~/.claude/statusline.sh` and the `statusLine` entry from `~/.claude/settings.json`. Leaves everything else alone.

## Diagnose

```bash
node $(npm root -g)/cc-statusline/diagnose.js
```

Checks that the script is installed, executable, and wired into `settings.json`.

## Requirements

- Claude Code 2.1.x or newer (for the `rate_limits` and `context_window` fields in statusline stdin)
- Node.js 16+
- Bash and `git` on PATH

## Color thresholds

Percentage segments use these thresholds:

| Range     | Color  |
|-----------|--------|
| < 70%     | green  |
| 70–89%    | yellow |
| ≥ 90%     | red    |

Applies to `ctx:` (context window), `5h:`, and `7d:`.

## Customize

The statusline is a single bash script at `~/.claude/statusline.sh`. Edit it directly to reorder, add, or remove segments. Re-running `npx cc-statusline` will overwrite your edits, so copy the file if you want to preserve customizations.

## Repository

Source: [github.com/haoziwlh/claude-statusline](https://github.com/haoziwlh/claude-statusline)  
Package: `cc-statusline` on npm

## License

MIT
