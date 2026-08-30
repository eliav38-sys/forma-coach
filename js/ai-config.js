/* FORMA — live AI connection config.
   Empty string = not connected yet; the Coach silently uses the local,
   rule-based reasoning engine (still real, still grounded in real data —
   see coach-engine.js). Once the Cloudflare Worker in /cloudflare-worker
   is deployed, its *.workers.dev URL goes here and the Coach starts
   calling real Claude for free-text answers, with the local engine kept
   as an automatic offline/error fallback. */
const FORMA_AI_WORKER_URL = '';
