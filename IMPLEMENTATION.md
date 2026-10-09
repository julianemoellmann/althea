# Verification and design-system implementation

The existing local-first prototype uses the approved 2026-09-29 visual and interaction guidelines. Original exports, the reference HTML, and the specification documents remain unchanged.

## Verification (Scope → Analyse → Review)
- Scope: one active code and all its current assigned quotations; requires prepared data.
- Entry: per-code Verify button or selected-code Verify code action. Searches, drafts, evidence selections, previous results, and scroll context are retained.
- Evidence comes first: immutable quotation text, ID, file, sheet, row, source, coder, date, notes, and assigned codes.
- The asynchronous provider returns six evaluation answers, proposed validity, evidence references, classifications, coverage, limitations, version, and timestamp. Cancellation leaves prior work intact.
- Authenticity has curated interpretations of verified quotations 11:11, 105:13, and 103:25. Other classifications use explicitly labelled lexical demonstration rules. None is semantic AI analysis.
- Researcher controls remain separate. Use proposed assessment explicitly copies suggestions to an editable assessment; verification itself never overwrites researcher content.
- Save review appends an Under review record without changing the codebook or assignments. Reject and defer also preserve working data.
- Preview database adaptation shows targets, current/proposed values, affected assignments, rationale, evidence count, and recovery limitations. Confirm adaptation applies the change and records a separate implementation status.
- Re-running verification retains prior analysis runs. Working-data or preparation-version changes flag the current suggestion for revalidation.
- Empty codes report insufficient evidence, not weak validity. Errors support retry or manual review.

## Shared shell and components
- Approved navy/slate/soft-white palette, semantic status tokens, blue selected evidence, lavender system interpretation, neutral researcher controls, bordered proposals.
- Approved original logo/navigation/module artwork is served without cropping or recolouring. Source artwork is large and includes whitespace; compact optimized source assets would improve download size and icon legibility.
- Self-hosted static Montserrat, Merriweather, and Roboto Mono WOFF2 fonts; original font licences are retained in vendor/fonts.
- Desktop three-pane evidence workspace; compact desktop icon rail and assessment drawer; tablet navigation/code/assessment drawers; mobile evidence-first stack and sticky assessment action.
- Native dialogs provide focus containment and Escape handling. Visible focus, textual statuses, minimum control sizes, narrow-screen reflow, and print styling are provided. Formal accessibility certification remains deferred as specified.
- Preparation revalidation creates another preparation record from immutable originals, retains working edits and earlier records, and flags prior analyses. Corrected replacement exports are imported as a separate project.
- Existing prepared assignments, codebook, history CSV and complete JSON backup exports remain available. Dedicated PDF and slide-deck generation and ATLAS.ti write-back are not part of this local prototype.

## Validation
Automated tests cover source reconciliation, all review paths, consequential edits, unchanged originals, review-only saving, verification evidence references, cancellation, insufficient evidence, and backup round-trips. Browser checks cover desktop, compact desktop, tablet, 390px and 320px layouts, saved results after refresh, drawer drafts, and mobile code filtering.
