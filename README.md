# Codex Viz

Local Codex session visualizer for JSONL files under `~/.codex/sessions`.

## Run

```bash
bun install
bun run dev
```

The server runs on `http://localhost:3456` by default. Set `PORT=3457` to use another port, or `OPEN_BROWSER=0` to skip auto-opening the browser.

## Scope

- Reads local session JSONL files only.
- Does not modify `~/.codex` data.
- Shows sessions, projects, timeline, tool calls, token charts, graph view, raw entries, and cross-session search.
- Does not attempt to decrypt `encrypted_content`.

## Pricing

Cost display is disabled by default. Fill `src/server/pricing.ts` after checking official OpenAI pricing if cost estimates are needed.
