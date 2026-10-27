# AGENTS.md

A guide for coding agents working on Althea. Read this first, then `README.md` (how researchers use it) and `agent/PI.md` (the Pi integration in depth).

## What Althea is

A local, single-researcher web app for reviewing qualitative coding exported from ATLAS.ti. A researcher imports two spreadsheets (Quotation Manager, Code Manager), checks them, picks a code, gets an AI-assisted reading of how well the quotations fit it, and decides what to change. Every change needs an explicit researcher decision and is recorded in history. The app never writes back to ATLAS.ti or the source files.

The AI ("Pi") proposes; the researcher decides. That principle shapes the code, the wording and the UI.

## Run it

Requires Node.js 20+. There are no npm dependencies to install.

```sh
npm start        # http://127.0.0.1:4173 (PORT=... to change; loopback only)
npm test         # node --test, ~39 tests over the real example exports
```

**AI analysis needs pi** (the [pi coding agent](https://github.com/earendil-works/pi)), installed globally and logged in:

```sh
pi               # then /login once (e.g. ChatGPT via openai-codex), /model to pick a default
```

The server finds the pi SDK in this order: `ALTHEA_PI_SDK` (path to `@earendil-works/pi-coding-agent`), a project install, then the install behind `pi` on `PATH` (npm global or Pi's managed `~/.pi/agent` install). `ALTHEA_PI_MODEL=provider/model[:thinking]` overrides pi's default model. Check with `curl http://127.0.0.1:4173/api/pi/status`. Without the UI: `node scripts/try-pi.mjs [verification|coherence|definition] [code label]`.

**System check.** On a fresh install (no saved projects and no passed check in this browser) the app opens a system check: browser storage, spreadsheet reader and example files, the server, Node.js, the pi SDK, the pi login, and a one-prompt model test (`GET /api/checkup`, `POST /api/checkup/model`; `checkup()` and `pingModel()` in `agent/pi-analyst.mjs`). It can be rerun from Settings. A pass is remembered in `localStorage` (`althea-system-check`).

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
| `src/pi-provider.js` | Browser side of Pi: builds the read-only payload (without uncoded quotations), calls `/api/analyze` with the project's orientation, stores model/thinking/trace settings in `localStorage`. |
| `src/orientations.js` | Help text and example methodological orientations (constructivist) for the orientation setting. |
| `agent/pi-analyst.mjs` | Server side of Pi: one isolated pi SDK session per analysis, read-only tools, structured `submit_finding`. |
| `agent/PI.md` | Pi integration design, settings and open questions. |
| `server.mjs` | Static file server plus `/api/pi/status` and `/api/analyze`. |
| `scripts/try-pi.mjs` | Runs one Pi analysis on the example exports from the command line. |
| `tests/workspace.test.js` | Node tests against the real example exports. |
| `Althea.md` | Product specification (layers, workflow, functions). |
| `Althea_Design_Guidelines.md` | Visual and wording rules. Follow them for any UI text. |
| `docs/althea-demo.gif` | Workflow recording embedded in the README (re-record when the UI changes noticeably). |
| `Althea_Technical_Appendix.docx`, `docs/TECHNICAL_APPENDIX.md` | Technical appendix for the journal submission (Word) and the same text for reading on GitHub, with figures in `docs/appendix/`. Keep the two in step when either changes. |
| `LICENSE` | MIT. Bundled SheetJS and fonts keep their own licences in `vendor/`. |
| `Example Data - *.xlsx` | Example ATLAS.ti exports (also served as `/samples/*.xlsx`). |
| `Assets/` | `althea-mark.svg` (the logo, also inlined in `app.js` so the sidebar shows the light version), favicons, `icons/*.png` (96 px alpha masks coloured by CSS `mask`, so one file serves light and dark surfaces), `brand/*.jpg` (design references, not served by the build). The original multi-megabyte PNGs were removed; they remain in git history. |

## How a researcher moves through it

1. **Import**: name the project, upload both exports or load the example.
2. **Prepare**: inspect validation issues (Accepted/Resolved/Deferred), then prepare data. This is data checking, not analysis.
3. **Scope**: choose single code + function (Internal Code Coherence, Verifying Coding, Creating Code Definitions). Multi-code and whole-dataset scopes are shown but disabled.
4. **Review**: run the analysis (Pi), classify each quotation, then Approve / Edit / Defer / Reject (rationale optional). Per quotation: keep, move to an existing or new code, or uncode (`uncodeQuotation`: removes every assignment, sets `quotation.excluded`, records an `uncode` history entry). Approve opens a confirmation of every change; nothing is saved to the codebook until confirmed.

Codebook and History sit beside the stages. Settings (avatar button, top right) holds the researcher name, Pi model/thinking, "show reasoning trace", the project's methodological orientation (empty for a new project; "Load an existing orientation" offers the built-in examples, other projects' orientations and older per-browser instructions), the system check, an explanation of saving and backups, and "Delete all projects". A new project opens a one-time prompt to set the orientation. Codebook has "Export final files" (quotation list and codebook as XLSX, history and quotation-per-code as CSV). "Your saved projects" (sidebar) can delete a single project.

## How the AI analysis works

```
app.js analyze() ─▶ piAvailable() (fresh each run) ─▶ piProvider.analyze()
   ─▶ POST /api/analyze {module, payload, options} ─▶ analyzeWithPi()
   ─▶ pi AgentSession: tools list_codes, get_code_quotations, search_quotations, submit_finding
   ◀─ finding (same shape as the simulation) ◀─ guard rails in toFinding()
```

- **Provider contract** (`src/analysis.js`): `analyze({module, codeIds, project, signal}) -> finding`. A finding has title, rating, evidenceSummary, interpretation, confidence, suggestion, evidenceIds, classifications `{quotationId: {rating, note}}`, suggestedFields, limitation, provenance, origin (`'pi'` or `'simulation'`), and for Pi also model, thinking, instructions and `trace` (`traceOf()` in `agent/pi-analyst.mjs`: reasoning steps, tool calls and shortened results; never the prompt or the submitted finding). Providers must never mutate the project.
- **Isolation**: pi's built-in tools (bash, read, edit, write), extensions, skills and AGENTS.md discovery are all off. The agent sees only the payload through read-only tools and must report via `submit_finding` (TypeBox schema per module).
- **Guard rails**: evidence and classifications citing quotations outside the selected code are dropped; unclassified quotations are noted in `limitation`; provenance always says "AI-generated interpretation · Althea AI (model) · review required".
- **Naming**: the UI calls the AI "Althea AI" everywhere (never "Pi" or a bare "AI"). "pi" appears only where the researcher must act on the tool itself (install it, `/login`, `/model`).
- **Settings**: model, thinking level and `showTrace` are per browser (`localStorage` key `althea-pi-settings`). The methodological orientation is per project (`project.orientation`, travels in backups, up to 10,000 characters). Both are sent with each request and recorded on each finding. The orientation is appended to the built-in system prompt, never replaces it (it carries the `submit_finding` contract).
- **Justification**: after `submit_finding`, the same session is asked to explain the finding (`explain_finding`: reasoning, alternatives, uncertainty), stored as `finding.justification`. Same thread on purpose, so the model explains from its own context instead of reconstructing it; labelled in the UI as a self-explanation written after the finding. A failed justification never discards the finding.
- **Reasoning traces** are always recorded and shown only when the researcher turns them on. Providers differ: `openai-codex` (gpt-6.1-sol) reasons but sends the reasoning encrypted with an empty summary, so its trace shows "not shared by the model provider" plus tool use; providers that share reasoning show the text.
- **Credentials** stay on the server (pi's `~/.pi/agent/auth.json`). The API rejects cross-origin requests and the server only listens on loopback, so other sites cannot spend them.
- **Cancellation**: the browser aborts the fetch; the server sees the closed request and calls `session.abort()`.
- **A run takes a minute or two** (analysis, then justification). The UI says so and keeps a Cancel button.

## Decisions to respect

- **Pi does the analysis; the simulation never runs silently.** Each run re-checks Pi. If Pi is unavailable the card shows the reason and offers "run the lexical simulation" as an explicit choice. A simulated finding is labelled as such. Do not reintroduce automatic fallback: a word-matching demo must never be mistaken for an AI reading.
- **Preparation is deterministic.** Validation issues in Prepare (counts, duplicates, groundedness) come from `src/data.js`, not from Pi. Keep data checking and AI analysis separate (see `Althea.md`: functionality vs. user action vs. database adaptation).
- **Rationales are optional** (research-team feedback). History shows "No reason given." when empty.
- **Uncoding is not deleting.** An uncoded quotation stays in `project.quotations` with `excluded: true`; it is left out of analyses and of the final quotation list (it has its own sheet), and `project.original` keeps its assignments.
- **Suggestions are not changes.** Only `commitDecision` after the confirmation screen changes codes or assignments. Originals stay unchanged; history is append-only.
- **Typography**: Montserrat for all text, Roboto Mono for IDs and literal values. No serif faces (see `Althea_Design_Guidelines.md`).
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
- Final exports cannot be re-imported into ATLAS.ti. Writing changes back (e.g. through an ATLAS.ti MCP or API) is an open question.
- There is no hosted version: Pi needs the local server. A hosted Althea would need the agent behind a server.
- The analyze endpoint returns once at the end; progress streaming is not implemented.
- Only single-code functions exist; comparison, hierarchy and dataset-wide functions are specified but disabled.
