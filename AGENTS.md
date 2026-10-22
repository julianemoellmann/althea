# AGENTS.md

A guide for coding agents working on Althea. Read this first, then `README.md` (how researchers use it) and `agent/PI.md` (the Pi integration in depth).

## What Althea is

A local, single-researcher web app for reviewing qualitative coding exported from ATLAS.ti. A researcher imports two spreadsheets (Quotation Manager, Code Manager), checks them, picks a code, gets an AI-assisted reading of how well the quotations fit it, and decides what to change. Every change needs an explicit researcher decision and is recorded in history. The app never writes back to ATLAS.ti or the source files.

The AI ("Pi") proposes; the researcher decides. That principle shapes the code, the wording and the UI.

## Run it

Requires Node.js 20+. There are no npm dependencies to install.

```sh
npm start        # http://127.0.0.1:4173 (PORT=... to change; loopback only)
npm test         # node --test, ~36 tests over the real example exports
```

**AI analysis needs pi** (the [pi coding agent](https://github.com/earendil-works/pi)), installed globally and logged in:

```sh
pi               # then /login once (e.g. ChatGPT via openai-codex), /model to pick a default
```

The server finds the pi SDK in this order: `ALTHEA_PI_SDK` (path to `@earendil-works/pi-coding-agent`), a project install, then the install behind `pi` on `PATH` (npm global or Pi's managed `~/.pi/agent` install). `ALTHEA_PI_MODEL=provider/model[:thinking]` overrides pi's default model. Check with `curl http://127.0.0.1:4173/api/pi/status`. Without the UI: `node scripts/try-pi.mjs [verification|coherence|definition] [code label]`.

**Restart the server after changing `server.mjs` or `agent/`.** Browser files are served with `no-cache`, so a stale server process still serves new page code against an old API. If Settings says "this Althea server has no Pi support", that is what happened.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Shell. Loads three stylesheets and `src/app.js` as an ES module. |
| `src/app.js` | The whole UI: state, rendering (template strings), one `handleAction` switch for `data-action` clicks, dialogs. |
| `src/data.js` | Import and preparation: reads CSV/XLSX (SheetJS in `vendor/`), maps columns, builds quotations/codes/assignments, raises validation issues (e.g. "Groundedness differs"). Deterministic, no AI. |
| `src/model.js` | Domain logic: modules, actions, statuses, drafts, `previewDecision`/`commitDecision` (the only way the codebook changes), backups. |
| `src/storage.js` | IndexedDB (`althea-workspace` / `projects`): save, list, delete one, delete all. |
| `src/analysis.js` | The provider contract and the old curated examples. |
| `src/verification.js` | Labelled lexical simulation providers (word matching, co-assigned codes). Explicit fallback only. |
| `src/pi-provider.js` | Browser side of Pi: builds the read-only payload, calls `/api/analyze`, stores Pi settings in `localStorage`. |
| `agent/pi-analyst.mjs` | Server side of Pi: one isolated pi SDK session per analysis, read-only tools, structured `submit_finding`. |
| `agent/PI.md` | Pi integration design, settings and open questions. |
| `server.mjs` | Static file server plus `/api/pi/status` and `/api/analyze`. |
| `scripts/build-sites.mjs` | Copies the static app to `dist/` for hosting (no Pi there). |
| `scripts/try-pi.mjs` | Runs one Pi analysis on the example exports from the command line. |
| `tests/workspace.test.js` | Node tests against the real example exports. |
| `Althea.md` | Product specification (layers, workflow, functions). |
| `20260929_Althea_Design_Guidelines.md` | Visual and wording rules. Follow them for any UI text. |
| `IMPLEMENTATION.md` | Notes on the verification workflow and design-system implementation. |
| `Training Data - *.xlsx` | Example ATLAS.ti exports (also served as `/samples/*.xlsx`). |

## How a researcher moves through it

1. **Import**: name the project, upload both exports or load the example.
2. **Prepare**: inspect validation issues (Accepted/Resolved/Deferred), then prepare data. This is data checking, not analysis.
3. **Scope**: choose single code + function (Internal Code Coherence, Verifying Coding, Creating Code Definitions). Multi-code and whole-dataset scopes are shown but disabled.
4. **Review**: run the analysis (Pi), classify each quotation, then Approve / Edit / Defer / Reject with a rationale. Approve opens a confirmation of every change; nothing is saved to the codebook until confirmed.

Codebook and History sit beside the stages. Settings (avatar button, top right) holds the researcher name, Pi model/thinking/instructions, and "Delete all projects". "Your saved projects" (sidebar) can delete a single project.

## How the AI analysis works

```
app.js analyze() ─▶ piAvailable() (fresh each run) ─▶ piProvider.analyze()
   ─▶ POST /api/analyze {module, payload, options} ─▶ analyzeWithPi()
   ─▶ pi AgentSession: tools list_codes, get_code_quotations, search_quotations, submit_finding
   ◀─ finding (same shape as the simulation) ◀─ guard rails in toFinding()
```

- **Provider contract** (`src/analysis.js`): `analyze({module, codeIds, project, signal}) -> finding`. A finding has title, rating, evidenceSummary, interpretation, confidence, suggestion, evidenceIds, classifications `{quotationId: {rating, note}}`, suggestedFields, limitation, provenance, origin (`'pi'` or `'simulation'`), and for Pi also model, thinking and instructions. Providers must never mutate the project.
- **Isolation**: pi's built-in tools (bash, read, edit, write), extensions, skills and AGENTS.md discovery are all off. The agent sees only the payload through read-only tools and must report via `submit_finding` (TypeBox schema per module).
- **Guard rails**: evidence and classifications citing quotations outside the selected code are dropped; unclassified quotations are noted in `limitation`; provenance always says "AI-generated interpretation · Pi agent (model) · review required".
- **Settings**: model, thinking level and additional instructions are per browser (`localStorage` key `althea-pi-settings`), sent with each request, and recorded on each finding. Researcher instructions are appended to the built-in system prompt, never replace it (it carries the `submit_finding` contract).
- **Credentials** stay on the server (pi's `~/.pi/agent/auth.json`). The API rejects cross-origin requests and the server only listens on loopback, so other sites cannot spend them.
- **Cancellation**: the browser aborts the fetch; the server sees the closed request and calls `session.abort()`.
- **A run takes about a minute.** The UI says so and keeps a Cancel button.

## Decisions to respect

- **Pi does the analysis; the simulation never runs silently.** Each run re-checks Pi. If Pi is unavailable the card shows the reason and offers "run the lexical simulation" as an explicit choice. A simulated finding is labelled as such. Do not reintroduce automatic fallback: a word-matching demo must never be mistaken for an AI reading.
- **Preparation is deterministic.** Validation issues in Prepare (counts, duplicates, groundedness) come from `src/data.js`, not from Pi. Keep data checking and AI analysis separate (see `Althea.md`: functionality vs. user action vs. database adaptation).
- **Suggestions are not changes.** Only `commitDecision` after the confirmation screen changes codes or assignments. Originals stay unchanged; history is append-only.
- **Wording**: follow the design guidelines. Never imply the system knows, proves or decides. Use "Evidence-linked interpretation", "Review required". No AI imagery (sparkles, robots, gradients).
- **No build step, no dependencies.** Plain ES modules, template-string rendering, CSS files. The pi SDK is optional and loaded dynamically by the server only.
- **Local-first.** Projects live in the browser's IndexedDB per origin (keep the same host and port). Users move work with `.althea.json` backups.

## Conventions

- Code style is dense: short helpers, one-line handlers, few comments. Comments explain *why*, not *what*. Match it.
- UI text: British-leaning plain English, sentence case, no exclamation marks.
- New UI actions: add a `data-action` button via `button(label, action, cls, extra)` and a `case` in `handleAction`.
- Dialogs: `openDialog(title, bodyHtml, footerHtml)`. Escape all user/project text with `e()`.
- Styles: tokens in `src/design-system.css`; app additions in `src/workflow.css`. `.btn.danger` is for destructive actions.
- Tests: `node --test`; add cases to `tests/workspace.test.js` using the real example exports. Pi is not exercised by `npm test` (it needs credentials); pi-ai's faux provider can script a model for agent-loop tests (see `agent/PI.md`).

## Known limits and open questions

- Quotations are sent to whichever model provider pi uses. Interview data may need a local model or a provider with a suitable data agreement.
- `openai-codex` with a ChatGPT login only accepts some models (`gpt-6.1-sol` worked; `gpt-5.4-mini` and `gpt-5.5` were refused). Stale `OPENAI_API_KEY`/`GOOGLE_API_KEY` environment variables make pi list models that will fail.
- Hosting (`.openai/hosting.json`) serves the static `dist/`; a hosted Althea has no Pi until the agent runs behind a server.
- The analyze endpoint returns once at the end; progress streaming is not implemented.
- Only single-code functions exist; comparison, hierarchy and dataset-wide functions are specified but disabled.
