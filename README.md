# Althea research workspace

A local, single-researcher prototype for reviewing qualitative coding. The original `althea-import-data.html` and `Althea.md` remain reference documents.

## Run

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173. Keep this address and port consistent: browser storage belongs to the origin. To use another port, set `PORT` before starting the server. The server only listens on loopback and exposes application assets and the two named example exports.

## Use

1. Load the example project or import both ATLAS.ti XLSX/CSV exports.
2. Review the column mapping, issues, delimiter, and assignment preview. Explicitly acknowledge duplicate-label grouping and warnings before preparing.
3. Enter your reviewer name. Open Review and choose coherence, verification, definitions, or comparison.
4. Select quotations as evidence, write an assessment and rationale, then preview and confirm a decision.
5. Inspect the Codebook and History. Download a project backup before moving to another browser or device.

The supplied project has 1,905 quotations, 124 sources, and 6,834 assignments. The Code Manager contains 2,970 rows, mapping to 2,934 distinct full names after reconstructing parent/child names; 13 duplicate-name groups retain all their source rows. Unused codes remain in the codebook.

## Saving and exports

Projects, originals, draft reviews, selections, and decision history are saved in IndexedDB on this browser. An error is shown if a save fails. Browser data clearing removes these saved projects: downloadable `.althea.json` backups include the complete project and original files and can be restored separately without replacing existing work.

The Data, Codebook, and History screens export CSV files. CSV fields beginning with spreadsheet formula characters are prefixed with an apostrophe for safe opening in spreadsheet software; exact raw data remains in the original XLSX/CSV and JSON backup. Changes only affect the working project; the app never writes to ATLAS.ti or the source exports.

## Analysis provider

`src/analysis.js` defines `analyze({module, codeIds, project, signal})`. It returns a finding or `null` and supports cancellation with `AbortSignal`. A finding has a title, interpretation, evidence IDs, suggested editable fields, and provenance. The UI owns decisions and mutations; a provider must never change the project.

The current provider has curated examples for Authenticity in the supplied dataset, recognized by source quotation content. These are labelled example findings, not AI output. All codes support manual review. Replacing the provider with the future Pi adapter does not require changing the decision/confirmation pipeline. No AI API is called in this version.

## Verification

```sh
npm test
```

Tests exercise the actual supplied exports, malformed imports, decision previews, splitting/merging/recoding, unchanged originals, audit history, and backup validation. UI verification should include refresh/resume, project backup/restore, filtering, all four review paths, and responsive layouts.

## Third-party component

The locally packaged spreadsheet parser is SheetJS CE 0.20.3, obtained from the [official standalone distribution](https://docs.sheetjs.com/docs/getting-started/installation/standalone/). Its Apache 2.0 license is in `vendor/LICENSE.sheetjs.txt`. No external assets or services are required at runtime.
