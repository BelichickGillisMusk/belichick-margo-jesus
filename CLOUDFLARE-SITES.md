... (append to the end)

## Additional Sites (not CARB testing)

| Domain | Purpose | Status |
|--------|---------|--------|
| `silverbackai.agency` | AI automation agency landing page | Built | 
| `boardroom.bryanoneillgillis.com` | Samantha multi-agent office / boardroom for task execution. **Hermes agents rock** — full superpowers (terminal, browser, deploys, plugins, automations). Combined agents (Samantha, Condoleeza workspace guru, Mila, Sloane, Elon, Nora + Hermes variants). All skills/plugins + OpenClaw multi-agent routing, identities, bindings. Deploy/SMS/email/calendar/drive/content. | **Live** — Cloudflare Pages (or Worker), private via Cloudflare Access / Zero Trust | 

The boardroom is the internal office interface (https://boardroom.bryanoneillgillis.com or bryanoneillgillis.com/boardroom/). Pure Cloudflare — **no Vercel**. Rich UI with team selection, Hermes-powered shortcuts, dispatch producing executable plans, reminders for prompting agents with superpowers. See cloudflare/sites/boardroom/index.html and agents-site/index.html. Use Cloudflare Access to keep private/internal.

**Hermes Superpowers highlight:** terminal & local exec, browser automation, autonomous workflows, builder-deploy to Cloudflare, deep Google/Twilio/Slack integrations, persistent memory. Invoke explicitly for real execution muscle.
