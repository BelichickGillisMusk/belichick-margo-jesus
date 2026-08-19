# Kimi competitive intelligence

Persistent research for NorCal CARB Mobile. Not a longer prompt.

Kimi watches 30 competitors every day, writes every launch / price / integration / positioning shift to an append-only log, and sends a daily brief split for sales, marketing, and product. The next assignment loads that log plus customer-voice themes so the work does not disappear when the chat closes.

```
npm run intel            # daily watch + brief (set INTEL_FETCH=1 to hit public pages)
npm run intel:brief      # brief from memory only
npm run intel:voice -- "fleets keep asking about the 2027 quarterly mandate"
npm run intel:assign -- "did A+ change OVI pricing in the Central Valley?"
```

Slack: `/intel`, `/intel fetch`, `/intel [question]`, `/recon-intel`. Quick action: **Intel pulse**. Customer voice: `/intel-voice`.

Memory lives in `intel/memory/` (gitignored). The roster is `intel/roster.json` (committed). Briefs land in `intel/briefs/` (gitignored).

Kimi API: `KIMI_API_KEY` + optional `KIMI_BASE_URL` (default `https://api.moonshot.ai/v1`) and `KIMI_MODEL` (default `kimi-k2-turbo-preview`). Without a key the watcher still diffs public pages and writes a structural brief; Kimi only writes the “why it matters / how to respond” layer.

Daily fetch on the Mac (ClawdBot’s cron posts from memory; this actually hits public pages):

```
0 7 * * * cd /path/to/belichick-margo-jesus && INTEL_FETCH=1 npm run intel
```
