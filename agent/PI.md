# Pi as Althea's analysis provider

Althea's analysis functions use a provider contract, `analyze({module, codeIds, project, signal}) -> finding`. Until now every provider has been a local simulation (`src/verification.js`). This adapter adds a provider backed by the [pi agent](https://github.com/earendil-works/pi) SDK. The decision and confirmation pipeline doesn't change.

## How it fits

```
browser (src/pi-provider.js)            local server (server.mjs)               pi SDK (agent/pi-analyst.mjs)
piProvider.analyze()  ── POST /api/analyze ─▶ origin + size checks ──▶ isolated in-memory AgentSession
  read-only project slice                    abort on disconnect           tools: list_codes, get_code_quotations,
◀── finding (same shape as simulation) ◀─────────────────────────────────  search_quotations, submit_finding
```

- **The project stays in the browser (IndexedDB).** Each request sends a read-only copy of the codes, quotations and assignments. The server keeps no state.
- **One isolated session per analysis.** Pi's built-in tools (bash, read, edit, write), extensions, skills and AGENTS.md files are all off. The agent can only read the project slice and report.
- **Structured output through a tool.** The agent must call `submit_finding` with a module-specific schema (TypeBox): assessment, evidence, interpretation, confidence, suggestion, action, per-quotation classifications, the six verification answers, subgroups (coherence), or core and boundary (definition).
- **Guard rails on the result.** Evidence and classification IDs outside the selected code are dropped. Unclassified quotations are reported in `limitation`. Provenance reads "AI-generated interpretation · Pi agent (provider/model) · review required", in line with the design guidelines' "no autonomous AI framing".
- **Cancellation.** The browser's `AbortSignal` cancels the fetch, the server sees the closed request and calls `session.abort()`.
- **Credentials.** The adapter reuses the researcher's pi login (`~/.pi/agent/auth.json`, `models.json`, default model from `settings.json`). Keys never reach the browser. The server only listens on loopback and rejects cross-origin requests, so other websites can't spend those credentials.

## Running it

```sh
pi          # then /login, once
npm start
```

The server finds the pi SDK in this order: `ALTHEA_PI_SDK`, a project install of `@earendil-works/pi-coding-agent`, then the global install that puts `pi` on PATH. If none is found, or pi has no working login, `/api/pi/status` reports Pi as unavailable and the app uses the simulation.

Optional: `ALTHEA_PI_MODEL=openai/gpt-5.1:medium` (pi's `provider/model[:thinking]` syntax) overrides pi's default model.

Without the UI: `node scripts/try-pi.mjs [verification|coherence|definition] [code label]` runs one analysis on the example exports and prints the finding.

## In the UI

`app.js` checks `/api/pi/status` once at startup (`state.pi`). `analyze()` then uses `piProvider` when Pi is available, and the simulation (with the curated examples) otherwise. The finding's provenance, under "How this was produced", names the model. A run takes about a minute (65 s for 13 quotations, about the same for 23, on `openai-codex/gpt-6.1-sol`), so the busy state says so and keeps its Cancel button. Cancel closes the request, which aborts the agent on the server.

**Settings** (the avatar button in the top bar) lets the researcher choose the model (from the models pi has credentials for), the thinking level, and additional instructions. Those instructions are appended to the built-in ones, which stay in force because they carry the `submit_finding` contract. The settings are stored in this browser's localStorage and sent with each request. Each finding records its `model`, `thinking` and `instructions`. Settings also has "Delete all projects", which clears this browser's saved projects after a confirmation and keeps the Pi settings.

Note that a ChatGPT login through `openai-codex` only allows some models (in testing, `gpt-6.1-sol` worked and `gpt-5.4-mini` and `gpt-5.5` were refused). Stale `OPENAI_API_KEY` or `GOOGLE_API_KEY` environment variables make pi list those providers' models even when the keys are invalid.

If Pi was available at startup but a run fails (expired login, provider outage), the error appears on the finding card. The app doesn't silently fall back to the simulation, so a lexical demonstration is never mistaken for an AI reading.

## Open questions

- **Data protection.** Quotations go to whichever model provider pi is configured with. Interview data may need a local model (pi supports Ollama and vLLM through `models.json`) or a provider with an appropriate data agreement.
- **Hosting.** `.openai/hosting.json` deploys a static `dist/`. A static site can't run the agent, so a hosted Althea needs a server (or the agent behind a separate API).
- **Streaming progress.** The endpoint returns once at the end. It could stream `tool_execution_start` events (NDJSON or SSE) to show progress.
- **Large codes.** Every quotation of the selected code goes into the prompt. Very large codes may need paging through the tools instead.
- **Evaluation.** Compare Pi findings with researcher decisions on the training export before trusting the ratings.
