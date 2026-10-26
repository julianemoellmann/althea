# Althea research workspace

A local, single-researcher prototype for reviewing qualitative coding. `Althea.md` is the product specification and `Althea_Design_Guidelines.md` the visual and wording rules.

## Run

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173. On first launch Althea runs a system check (browser storage, spreadsheet reader, server, Pi and a short model test) and shows how to fix anything that fails; it can be rerun from Settings. Keep this address and port consistent: browser storage belongs to the origin. To use another port, set `PORT` before starting the server. The server only listens on loopback and exposes application assets and the two named example exports.

## Use

The navigation follows the four workflow stages agreed with the research team (see the workflow map):

1. **Import.** Name the project, enter your name, and upload the Quotation Manager and Code Manager exports (or load the example). Create project stays disabled until a name is entered and both files pass validation.
2. **Prepare.** Inspect the grouped validation issues and set each warning to Accepted, Resolved or Deferred, then select Prepare data. The quotation-per-code table can be searched, filtered and sorted, and downloaded as `quotation_per_code.csv`.
3. **Scope.** Choose a scope (only Single code is active; multi-code and whole-dataset are shown but disabled), a function (Internal Code Coherence, Verifying Coding, Creating Code Definitions), and a code.
4. **Review.** Run the analysis, classify each quotation, then Approve, Edit suggestion, Defer or Reject, with an optional rationale. Each quotation can stay, move to another code or a new one, or be uncoded (for text that should not have been coded, such as an interviewer's turn: it loses every code and leaves the working dataset, while the originals and history keep it). Approve opens a confirmation screen showing the code change and every quotation change; nothing is saved until you confirm.

Every suggestion is Under review, Approved, Deferred or Rejected. Applying a change is part of approving and is shown as "Approved and applied"; deferred suggestions are counted in the top bar and can be reopened. Codebook and History sit beside the stages as the project record. Download a project backup before moving to another browser or device.

When a project is created, Althea asks for a **methodological orientation**: the assumptions about meaning, evidence, context and alternative readings that should guide its review. It is saved with the project, can start from an example (constructivist, after Guba & Lincoln, 1994), and is changed under Settings.

The supplied example is the "Example Data" export: 160 quotations from 92 sources, 10 flat codes, and 174 assignments, with the coder recorded as "Jane Doe". The Code Manager's Groundedness column is checked against the Quotation Manager; in this export the counts agree, so the import raises no Groundedness warnings.

## Saving and exports

Projects, originals, draft reviews, selections, and decision history are saved in IndexedDB on this browser. An error is shown if a save fails. Browser data clearing removes these saved projects: downloadable `.althea.json` backups include the complete project and original files and can be restored separately without replacing existing work.

To continue on another computer, run Althea there and choose **Restore a backup**. Nothing else is needed: no database, ATLAS.ti project or original spreadsheets. Pi has to be installed and logged in on that computer for new analyses, and the model and trace settings are chosen again because they belong to the browser. Settings explains this to researchers under "Saving and moving your work".

**Export final files** (Codebook) downloads the reviewed quotation list and codebook as XLSX, laid out like the ATLAS.ti exports, plus the decision history and quotation-per-code table as CSV. ATLAS.ti cannot import these files back; changes have to be applied there by hand from the history. The Prepare and History screens also export CSV files. CSV fields beginning with spreadsheet formula characters are prefixed with an apostrophe for safe opening in spreadsheet software; exact raw data remains in the original XLSX/CSV and JSON backup. Changes only affect the working project; the app never writes to ATLAS.ti or the source exports.

## Analysis provider

`src/analysis.js` defines `analyze({module, codeIds, project, signal})`. It returns a finding or `null` and supports cancellation with `AbortSignal`. A finding has a title, interpretation, evidence IDs, suggested editable fields, and provenance. The UI owns decisions and mutations; a provider must never change the project.

`src/verification.js` provides simulated providers for all three single-code functions. They separate evidence, interpretation, confidence and suggestion, and propose a classification per quotation from label-word matches and co-assigned codes. These are labelled lexical demonstrations, not AI output. The earlier curated Authenticity examples remain for an earlier version of the example export. All codes support manual review.

When [pi](https://github.com/earendil-works/pi) is installed and logged in, the server offers `/api/analyze` and the app uses the Pi agent instead of the simulation, through the same decision and confirmation pipeline. The selected code's quotations are then sent to the model provider pi is configured with. Findings are labelled with the model and "review required". Pi then explains its finding in the same session (reasoning, readings it set aside, what it is least sure of), shown under "Why AI reached this finding". Each Pi finding also records a reasoning trace (the model's reasoning where its provider shares it, and every tool it used); Settings can show it on the finding card for interpretability. Without pi, or on a static build, the simulation is used and no AI API is called. See `agent/PI.md`.

## Verification

```sh
npm test
```

Tests exercise the actual supplied exports, malformed imports, decision previews, splitting/merging/recoding, unchanged originals, audit history, and backup validation. UI verification should include refresh/resume, project backup/restore, filtering, all four review paths, and responsive layouts.

## Third-party component

The locally packaged spreadsheet parser is SheetJS CE 0.20.3, obtained from the [official standalone distribution](https://docs.sheetjs.com/docs/getting-started/installation/standalone/). Its Apache 2.0 license is in `vendor/LICENSE.sheetjs.txt`. No external assets or services are required at runtime; the optional Pi analysis uses the model provider configured in pi.
