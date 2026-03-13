# OpenClaw Agent for BeastBots

This directory contains a simple example agent that uses the BeastBots HTTP
API to monitor and manage bots. It is **not required** for the core product, but
serves as a starting point if you want to build a supervised or autonomous
"operator" using the OpenClaw/Copilot framework.

## files

* `agent.yml` – metadata consumed by the Copilot/agent system (name, description,
  mode)
* `agent.ts` – a minimal Node script demonstrating how to list bots and restart
  stopped ones
* `README.md` – this document

## usage

1. install dependencies in workspace root:
   ```bash
   pnpm install node-fetch dotenv
   ```
2. create a `.env` file with the API endpoint and user access token:
   ```
   API_URL=http://localhost:3000
   # this must be a Bearer token obtained via the normal login flow
   API_KEY=<user access token>
   ```
   Only requests authenticated as a specific user/tenant are permitted to
   start, stop, pause, or modify bots. the backend will return 404 if you try
   to act on a bot belonging to another tenant.
3. run the agent from the repository root:
   ```bash
   tsx openclaw/agent.ts
   ```

This agent could be extended to:

* watch metrics and trigger configuration changes
* perform federated‑learning weight aggregation
* escalate alerts when bots error or audit entries show high risk
* invoke `/api/bots/:id/update` with new configs

The current example already contains per-family heuristics:

* **Trading bots**: pause when the consecutive‑loss counter reaches three.
* **Store bots**: restart after 100 ticks with no successful actions to recover
  from stale adapters.
* **Social bots**: enforce a soft posting rate limit by pausing after 10
  actions per hour.
* **Workforce bots**: pause if more than half of ticks result in failures.

These rules show how the agent can be specialized for each bot type; you can
swap them out or add platform‑specific checks (e.g. different thresholds for
Coinbase vs Binance) as your product needs evolve.

Feel free to delete this folder if you don't plan to run an external agent.