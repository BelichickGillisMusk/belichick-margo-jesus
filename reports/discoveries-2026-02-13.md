# DISCOVERIES — Feb 13, 2026
## Awaiting Bryan's Approval

Reply with GO / NO / RESEARCH next to each one.

---

### Discovery #1 — FREE TOOL
**Found by:** Claude (this session)
**While doing:** Setting up Cloud Run infrastructure

**FOUND:** Google Cloud Run has a PERMANENT free tier — 2 million requests/month, 360K vCPU-seconds, 180K GiB-seconds. For a local service business getting maybe 100 chats/day, Mila Cloud Run will likely cost $0/month in compute.

**CURRENT:** Not deployed yet
**PROPOSED:** Deploy with min-instances: 0 (scale to zero)
**COST IMPACT:** $0/month compute (Claude API calls are the real cost at ~$0.003/chat)
**RISK:** None
**RECOMMENDATION:** GO — deploy it

**YOUR CALL:** GO / NO / RESEARCH

---

### Discovery #2 — FREE TOOL
**Found by:** Claude (this session)
**While doing:** Writing SEO playbook

**FOUND:** Google Search Console is completely free and gives you the EXACT search terms people use to find your site, how many impressions, clicks, and your average position for each keyword. This is the #1 tool for knowing if SEO is working.

**CURRENT:** No analytics at all
**PROPOSED:** Set up Search Console at search.google.com/search-console
**COST IMPACT:** $0 — completely free
**RISK:** None — read-only, just watching your search data
**RECOMMENDATION:** GO — this should have been set up day one

**YOUR CALL:** GO / NO / RESEARCH

---

### Discovery #3 — CHEAPER ALTERNATIVE
**Found by:** Claude (this session)
**While doing:** Reviewing agent model assignments in ARCHITECTURE.md

**FOUND:** The ARCHITECTURE.md already plans for Gemini free tier to handle 80% of agent grunt work ($0) with Claude only for complex tasks. But right now, everything uses Claude Sonnet at $3/million input tokens. The Gemini 2.0 Flash free tier gives 1500 requests/day — more than enough for Mila CS, calendar, and basic tasks.

**CURRENT:** All workflows use `claude-sonnet-4-20250514` (~$10-30/month)
**PROPOSED:** Switch Mila CS chatbot + simple workflows to Gemini 2.0 Flash (free), keep Claude for complex analysis only
**COST IMPACT:** Current ~$10-30/month → Proposed ~$5-15/month
**RISK:** Gemini may give lower quality answers for complex CARB questions. Test first.
**RECOMMENDATION:** TEST FIRST — run both side by side for a week

**YOUR CALL:** GO / NO / RESEARCH

---

### Discovery #4 — BETTER WORKFLOW
**Found by:** Claude (this session)
**While doing:** Auditing GCP project activity

**FOUND:** Someone enabled Cloud Run + Pub/Sub + Artifact Registry + Container Registry on the GCP project. Pub/Sub was auto-enabled as a Cloud Run dependency. Container Registry is deprecated — Google wants you to use Artifact Registry instead. You're paying for a deprecated service.

**CURRENT:** Both Container Registry AND Artifact Registry enabled
**PROPOSED:** Disable Container Registry (deprecated), use only Artifact Registry
**COST IMPACT:** Saves storage cost on Container Registry (small, but why pay for deprecated stuff)
**RISK:** None — Artifact Registry is the replacement
**RECOMMENDATION:** GO

**YOUR CALL:** GO / NO / RESEARCH

---

### Discovery #5 — REGULATORY CHANGE
**Found by:** Claude (this session)
**While doing:** Writing CARB knowledge base for Mila CS

**FOUND:** CARB Heavy-Duty I/M testing frequency is tightening: currently semi-annual, but moving to QUARTERLY starting October 2027. That means your customers will need testing 2x more often. This is a massive revenue opportunity — every fleet customer becomes a quarterly customer instead of twice a year.

**CURRENT:** Marketing assumes semi-annual testing cycle
**PROPOSED:** Start telling fleet customers NOW about the upcoming quarterly requirement. Position NorCal Carb Mobile as the company that keeps them ahead of deadlines. Lock in annual fleet contracts before the change hits.
**COST IMPACT:** Potential 2x revenue from existing fleet customers
**RISK:** None — this is public CARB policy
**RECOMMENDATION:** GO — update marketing, start conversations with fleet customers

**YOUR CALL:** GO / NO / RESEARCH

---

### Discovery #6 — FREE TOOL
**Found by:** Claude (this session)
**While doing:** Building chat widget for Squarespace

**FOUND:** Squarespace has built-in "Code Injection" that lets you add the Mila chat widget site-wide with one paste. No plugin needed, no monthly fee for a chat tool. Most businesses pay $20-50/month for Intercom, Drift, or Zendesk chat. The widget we built is free and connects directly to Mila on Cloud Run.

**CURRENT:** No live chat on website
**PROPOSED:** Paste `widget.html` into Squarespace Settings → Advanced → Code Injection → Footer
**COST IMPACT:** $0 vs $20-50/month for commercial chat tools
**RISK:** None — easy to remove if it doesn't work
**RECOMMENDATION:** GO — after Cloud Run is deployed

**YOUR CALL:** GO / NO / RESEARCH

---

## HOW TO RESPOND

Just write GO, NO, or RESEARCH next to each discovery number. Examples:
- `#1 GO` — Deploy Cloud Run with free tier
- `#3 RESEARCH` — Test Gemini vs Claude before switching
- `#4 GO` — Kill the deprecated Container Registry

Or approve all at once: `GO: #1, #2, #4, #5, #6 | RESEARCH: #3`
