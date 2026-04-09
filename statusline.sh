#!/usr/bin/env bash
# cc-statusline — Claude Code statusline showing path, git, model,
# context window usage, 5h/7d rate-limit usage, and session cost.
#
# Example output:
#   ~/github/project │  main ✓ │ ◆ Opus 4.6 · ctx:58% │ 5h:14% 7d:66% │ $4.91
#
# Reads the session JSON Claude Code pipes in on stdin. `rate_limits`
# come from the same source as the /usage dialog, so numbers match exactly.

INPUT=$(cat)

# ── Parse everything in one node pass ────────────────────────────────────────
PARSED=$(printf '%s' "$INPUT" | node -e '
let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
  try {
    const j = JSON.parse(s);
    const cwd = j.cwd || (j.workspace && j.workspace.current_dir) || "";
    const m = j.model || {};
    const name = m.display_name || m.id || "";
    const rl = j.rate_limits || {};
    const p5 = rl.five_hour && typeof rl.five_hour.used_percentage === "number"
      ? Math.round(rl.five_hour.used_percentage) : "";
    const p7 = rl.seven_day && typeof rl.seven_day.used_percentage === "number"
      ? Math.round(rl.seven_day.used_percentage) : "";
    const cw = j.context_window || {};
    const ctxPct = typeof cw.used_percentage === "number" ? Math.round(cw.used_percentage) : "";
    const cost = j.cost && typeof j.cost.total_cost_usd === "number"
      ? j.cost.total_cost_usd.toFixed(2) : "";
    process.stdout.write([cwd, name, p5, p7, ctxPct, cost].join("\t"));
  } catch(e) {}
});
' 2>/dev/null)

IFS=$'\t' read -r CWD MODEL PCT5 PCT7 CTX COST <<< "$PARSED"
[ -z "$CWD" ] && CWD="$PWD"

# Tilde-ify home
case "$CWD" in
  "$HOME"/*) SHORT_CWD="~${CWD#$HOME}" ;;
  "$HOME")   SHORT_CWD="~" ;;
  *)         SHORT_CWD="$CWD" ;;
esac

# ── Helper: color by percentage ──────────────────────────────────────────────
colorize() {
  local p=$1
  if   [ "$p" -ge 90 ]; then printf '\e[31m';
  elif [ "$p" -ge 70 ]; then printf '\e[33m';
  else                       printf '\e[32m';
  fi
}

# ── Git segment ──────────────────────────────────────────────────────────────
GIT_SEG=""
if BRANCH=$(git -C "$CWD" symbolic-ref --short HEAD 2>/dev/null); then
  if [ -z "$(git -C "$CWD" status --porcelain 2>/dev/null)" ]; then
    MARK=$'\e[32m✓\e[0m'
  else
    MARK=$'\e[33m●\e[0m'
  fi
  GIT_SEG=" \e[2m│\e[0m \e[36m $BRANCH\e[0m $MARK"
fi

# ── Model + context window ───────────────────────────────────────────────────
MODEL_SEG=""
if [ -n "$MODEL" ]; then
  MODEL_SEG=" \e[2m│\e[0m \e[35m◆ $MODEL\e[0m"
  if [ -n "$CTX" ]; then
    C=$(colorize "$CTX")
    MODEL_SEG="${MODEL_SEG} \e[2m·\e[0m ctx:${C}${CTX}%%\e[0m"
  fi
fi

# ── 5h / 7d rate-limit usage (only shown when Claude Code provides it) ───────
USAGE_SEG=""
if [ -n "$PCT5" ] || [ -n "$PCT7" ]; then
  USAGE_SEG=" \e[2m│\e[0m"
  if [ -n "$PCT5" ]; then
    C=$(colorize "$PCT5")
    USAGE_SEG="${USAGE_SEG} 5h:${C}${PCT5}%%\e[0m"
  fi
  if [ -n "$PCT7" ]; then
    C=$(colorize "$PCT7")
    USAGE_SEG="${USAGE_SEG} 7d:${C}${PCT7}%%\e[0m"
  fi
fi

# ── Session cost ─────────────────────────────────────────────────────────────
COST_SEG=""
[ -n "$COST" ] && [ "$COST" != "0.00" ] && COST_SEG=" \e[2m│ \$${COST}\e[0m"

printf "\e[34m${SHORT_CWD}\e[0m${GIT_SEG}${MODEL_SEG}${USAGE_SEG}${COST_SEG}"
