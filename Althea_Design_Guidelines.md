# Althea Design Guidelines

Living product, interaction, and visual-design guideline for Althea.

## Document status

This document consolidates approved design decisions from the Althea workflow specification and subsequent decisions made in this chat. Update it when a decision is approved. Do not resolve items listed under **Open decisions** by assumption.

## Purpose

Althea is rigorous, inspectable research software for reviewing and refining qualitative coding. It turns raw ATLAS.ti exports into an evidence-based review workflow without replacing researcher judgment.

Althea must keep the following layers visibly and operationally distinct:

1. Source evidence
2. System suggestion
3. Researcher decision
4. Database adaptation

A generated suggestion is not a researcher decision. A researcher decision is not a database change. No adaptation or write-back occurs without explicit confirmation.

## Product design stance

Design for inspection, not persuasion.

Every screen must make clear:

- where the researcher is in the workflow;
- what evidence is shown and where it originated;
- what the system suggests, including its limitations;
- what the researcher can decide or do next; and
- whether a reviewed change has been confirmed and implemented.

The product must feel calm, methodical, precise, transparent, modest, intellectually serious, and accessible. It must not feel mystical, playful, autonomous, or overconfident.

## Governing principles

| Principle | Requirement |
|---|---|
| Evidence before assertion | Show quotation text, quotation ID, source, code, and relevant boundaries before interpretation or recommendation. |
| Provenance | Link findings, decisions, and adaptations to source files, rows, quotations, codes, evidence, rationale, and history. |
| Human authority | The researcher determines analytical validity and whether a proposed adaptation is saved. |
| Inspectability | Make passages, source references, issue records, relationships, assumptions, limitations, and history available for examination. |
| Separation of layers | Keep evidence, system assessment, recommendation, researcher assessment, and adaptation preview visibly separate. |
| Modest certainty | State uncertainty, incomplete coverage, ambiguity, conflict, and insufficient evidence explicitly. |
| Reversibility | Preserve previous values, preparation versions, decisions, and audit history. Allow reversal or superseding actions where practical. |
| Progressive disclosure | Show the essential evidence-to-decision relationship first; make deeper provenance and history available on demand. |
| Accessibility | Do not rely on colour, hover, motion, or tiny details to communicate meaning. |
| No autonomous AI framing | Do not imply that the system knows, decides, proves, completes, or independently validates analysis. |

## Workflow structure

Use the same seven-stage workflow throughout the product:

`Import -> Prepare -> Scope -> Analyse -> Review -> Decide -> Record`

The stepper remains available across the workflow and shows actual state: completed, current, upcoming, blocked, deferred, unsaved, loading, or error. Visiting a screen does not complete a stage.

| Stage | Primary purpose | Required design outcome |
|---|---|---|
| Import | Create a project and validate source files. | Required and optional files, validation, warnings, errors, recovery, and preserved data are explicit. |
| Prepare | Create a versioned `quotation_per_code.csv` review input. | Delimiter choice, raw-versus-derived distinction, issues, preview, version, and revalidation status are clear. |
| Scope | Select the analytical scope. | Scope, coverage, prerequisites, compatible modules, and selected codes are visible. |
| Analyse | Generate an evidence-grounded finding. | Evidence, interpretation, confidence or evidence strength, limitations, recommendation, and review route are distinct. |
| Review | Challenge and classify the finding. | Researcher assessment, rationale, notes, status, and review-only actions are distinct from implementation. |
| Decide | Confirm or decline a consequential adaptation. | Previous and proposed values, affected objects, evidence, rationale, reversibility, and confirmation are explicit. |
| Record | Trace decision and implementation state. | Audit record, status, history, version comparison, evidence links, and recovery path remain available. |

### Scope rules

| Scope | Selection behaviour | Compatible modules |
|---|---|---|
| Single-code analysis | Select one code and load all assigned quotations. | Internal Code Coherence; Verifying Coding; Creating Code Definitions |
| Selected multi-code analysis | Select two or more distinct codes; prevent duplicates. | Comparing Codes; Code Hierarchy Suggestions |
| Whole-dataset analysis | Use the full prepared dataset; do not select a pre-analysis subset. | Cross-Code Coding Consistency; Category / Pattern Code Generation; Relational and Process Analysis |

The selected scope and compatible functions remain visible before and during analysis.

### Single-code functionality icon assets

Use these tag-based line icons when presenting the three single-code analytical functions. Pair every icon with its visible function name; the icon does not replace the accessible label.

Each icon is a single 96 px PNG alpha mask, applied with CSS `mask` so that it takes the colour of the surrounding text: Soft White on Ink Navy, Ink Navy on light surfaces. Do not add separate light and dark files.

| Functionality | Icon |
|---|---|
| Internal Code Coherence | [internal-code-coherence.png](./Assets/icons/internal-code-coherence.png) |
| Verifying Coding | [verifying-coding.png](./Assets/icons/verifying-coding.png) |
| Creating Code Definitions | [creating-code-definitions.png](./Assets/icons/creating-code-definitions.png) |

## Data and safety rules affecting design

- Preserve original ATLAS.ti exports unchanged.
- Preserve raw field names and values exactly as exported.
- Show normalized data as derived data, never as a replacement for raw data.
- Show quotation ID, quotation text, source, code, and available provenance metadata in relevant evidence, decision, and adaptation views.
- Make blocking errors distinct from non-blocking warnings.
- Preserve accepted, resolved, and deferred issue decisions.
- A preparation rerun creates a new version; it does not erase prior versions, findings, decisions, or issue history.
- Flag dependent findings for revalidation when their preparation version is superseded.
- A later prerequisite failure must return the user to Import without deleting prepared data or prior review work.

## User, permission, and collaboration model

Althea currently supports one researcher per project. That researcher has all available permissions:

- Create projects and import source data
- Prepare and rerun data preparation
- Select scope and run analytical modules
- Review, edit, approve, reject, defer, and annotate findings
- Preview, confirm, apply, reverse where supported, and export database adaptations
- View audit history, versions, and all project records

The interface does not require role selection, permission management, user assignment, approval routing, concurrent editing, comments from other users, conflict resolution, shared workspaces, or private notes. Where provenance records a researcher identity, it refers to the sole project user.

Multi-user collaboration and permission management are deferred to a later development stage. Do not introduce UI controls, data models, or workflow assumptions for them in the current implementation.

## Core information hierarchy

Use this order wherever an analytical result is presented:

1. Scope and unit of analysis
2. Source evidence
3. System assessment
4. Interpretation
5. Confidence, rating, or evidence strength
6. Recommendation
7. Researcher assessment and decision
8. Database adaptation preview
9. Confirmation and implementation status
10. Audit and version history

Do not collapse these layers into one card, panel, status, or generic result.

## Evidence visual language

Evidence visual language is a trust contract. It distinguishes provenance—where content came from—from agency—what the researcher may do with it.

The governing rule is:

> Source evidence is inspected. Selected evidence is scoped. System interpretation is challenged. Researcher content is authored. Recommendations are evaluated. Adaptation previews are confirmed.

### Canonical content layers

| Layer | Exact label | Provenance | Permitted interaction | Visual treatment | Must not imply |
|---|---|---|---|---|---|
| Source evidence | Source evidence | Original ATLAS.ti export | Read-only; open provenance | Neutral Soft White surface, Ink Navy text, 1 px neutral border. | That evidence has been interpreted or approved. |
| Selected evidence | Selected evidence | Source evidence selected for the current analysis or review | Select, deselect, inspect | Pale blue `#E8F1F6`, Slate Blue border `#7A9BB2`, selected icon and text label. | That selection means agreement, approval, or importance beyond the current scope. |
| System interpretation | System interpretation or System assessment | System-generated analysis based on cited evidence | Inspect, challenge, compare, review | Pale lavender `#F1ECF7`, foreground `#4C3A68`, border `#B8A8D1`. | That the interpretation is a final answer or researcher decision. |
| Researcher content | Researcher assessment | Written or selected by the researcher | Edit, classify, annotate, save | Neutral white or Soft White surface, Ink Navy text, clear editable controls, no system-colour tint. | That the content was generated by the system. |
| Recommendation | Recommendation or Proposed action | System-generated proposal based on evidence and interpretation | Review, accept, reject, defer, edit where permitted | Neutral surface with a 2 px Slate Blue structural border, supporting evidence links, and explicit proposal label. | That the action is approved or already applied. |
| Adaptation preview | Database adaptation preview | Proposed consequence of an approved or reviewable decision | Compare, confirm, cancel | Before/after comparison with a strong boundary. Use warning treatment only for Confirmation required. | That opening the preview has changed the database. |

Selected evidence is a state of Source evidence, not a separate type of content. It preserves the source quotation, metadata, and provenance while adding a clear selection state.

### Required component anatomy

#### Source evidence

Every evidence block includes:

- `quotation_id`
- Exact quotation text
- Source, when available
- Associated code or code group
- Creator, date, location, and other available provenance metadata
- A provenance control such as `View source details`
- An immutable or read-only indicator where appropriate

Do not place system interpretations inside the quotation block. Keep quotations visually and structurally separate from every conclusion.

#### Selected evidence

Selection must include more than colour:

- Checkbox, selection icon, or selected marker
- Visible `Selected evidence` label
- Selected count, such as `3 of 12 quotations selected`
- Keyboard-accessible selection control
- Persistent selection state when moving between evidence and assessment

Selection must not alter quotation text or hide provenance.

#### System interpretation

Every system-generated interpretation includes:

- `System interpretation` or `System assessment` label
- Interpretation content
- Supporting evidence links
- Evidence count or coverage
- Confidence or evidence-strength label where applicable
- Known limitation or uncertainty
- Analysis version or timestamp
- `Review finding` action

Use wording such as `Evidence-linked interpretation` and `Review required`. Do not use `Final answer`, `Correct interpretation`, `The AI knows`, or `Automatic conclusion`.

The lavender treatment identifies provenance. It must not confer authority.

#### Researcher content

Every researcher-authored area includes:

- `Researcher assessment` label
- Editable classification, decision, or note
- Rationale field where a decision is required
- Author and timestamp after saving
- Review status: Draft, Under review, Approved, Rejected, or Deferred
- `Save review` action

Researcher content must not use the system-interpretation colour. Authorship must remain visible without making the researcher's decision look like automated output.

#### Recommendation

Every recommendation contains:

- `Recommendation` or `Proposed action` label
- Proposed action in plain language
- Supporting evidence links
- Relationship to the system interpretation
- Alternatives where relevant
- `Review recommendation` action
- Explicit state: Proposed, Approved, Rejected, or Deferred

Use a Slate Blue structural treatment rather than success green. A recommendation is a proposal awaiting human judgment, not a successful outcome.

#### Database adaptation preview

Every adaptation preview shows:

- `Database adaptation preview` label
- Target object
- Current value or structure
- Proposed value or structure
- Affected codes, quotations, or relationships
- Evidence and decision links
- Reversibility
- Implementation status
- `Confirm adaptation` action

Use a clear Current versus Proposed comparison. Opening a preview must never write to the database. Only explicit confirmation can initiate adaptation.

### Canonical screen order

When several layers occur on one screen, use this order:

1. Source evidence
2. Selected evidence, shown as a state within the evidence layer
3. System interpretation
4. Researcher assessment
5. Recommendation
6. Database adaptation preview

The visible chain is:

`Evidence -> Interpretation -> Researcher decision -> Proposed change -> Confirmed adaptation`

Do not place adaptation preview before evidence. Do not present a recommendation as though it comes from an invisible system process.

### Structural and state rules

- Every layer has its own heading.
- Every system-generated layer has a provenance label.
- Every recommendation has a review action.
- Every adaptation preview has a confirmation action.
- Source evidence and researcher content never share one undifferentiated card.
- Use borders, labels, spacing, icons, and headings in addition to colour.
- The evidence reader receives the greatest width in Review layouts.
- System interpretation remains visually subordinate to evidence.
- Researcher assessment is easy to act on but never styled as an authoritative system result.
- Warning amber is reserved for states such as Confirmation required, not for every proposal.
- Success green is reserved for verified outcomes such as Implemented.
- Rejected, Failed, and Deferred are always distinct states.

### Trust transition model

`Imported source evidence -> Selected evidence -> System interpretation -> Researcher assessment -> Approved / Rejected / Deferred -> Database adaptation preview -> Confirmed adaptation -> Pending / Implemented / Failed / Reversed`

Rules:

- Selection does not create approval.
- Interpretation does not create a review decision.
- Saving a review does not change the database.
- Approval does not mean implementation.
- Previewing an adaptation does not apply it.
- Only explicit confirmation can initiate database adaptation.
- Failed and pending implementations remain visible and traceable.
- A new preparation version flags dependent interpretations and recommendations for revalidation.

## Brand and visual direction

### Logo

Use the approved framed-passage symbol with the Althea wordmark. The frame represents a bounded excerpt open to inspection, not a sealed conclusion.

#### Approved asset pack

The assets below are the current visual authority for the Althea logo system.

| Asset | Approved use |
|---|---|
| [Symbol mark (SVG)](./Assets/althea-mark.svg) | Source of the framed-passage symbol: Ink Navy bracket, Slate Blue passage. Also inlined in the app. |
| [Favicon (SVG)](./Assets/favicon.svg), [32 px](./Assets/favicon-32.png), [180 px touch icon](./Assets/apple-touch-icon.png) | Browser favicon and compact application icon. |
| [Horizontal lockup](./Assets/brand/althea-logo.jpg) | Reference for documentation, screenshots, and formal communication. |
| [Symbol artwork](./Assets/brand/althea-logo-visual.jpg) | Reference for the symbol-only mark. |
| [Logo variations](./Assets/brand/althea-logo-variations.jpg) | Dark monochrome, light reverse, one-colour, and symbol-only variants. |
| [Logo overview](./Assets/brand/althea-logo-explanations-1.jpg) | Lockup and symbol-only usage reference. |
| [Approved variants](./Assets/brand/althea-logo-explanations-2.jpg) | Approved colour and favicon variants. |
| [Usage and clear-space rules](./Assets/brand/althea-logo-explanations-3.jpg) | Clear space, minimum sizes, permitted and prohibited use. |

In the app, the sidebar uses the light version of the mark on Ink Navy: Soft White bracket and a light Slate Blue passage (`#8FA5B8`), with the wordmark set in Montserrat 600.

- Use the horizontal lockup whenever space allows; use the symbol-only mark in sidebars, compact navigation, loading indicators, and favicons.
- Preserve clear space equal to the internal framed-passage unit `X` of the symbol mark on every side.
- Maintain a minimum horizontal-lockup width of 120 px or 32 mm; maintain a minimum symbol-only width of 48 px or 12 mm.
- Use the favicon at a minimum 16 px display size.
- Use the approved dark monochrome, light reverse, or one-colour variants. Preserve adequate contrast against the surrounding surface.
- Do not distort, rotate, redraw, crop, compress, or crowd the mark.

Do not use gradients, glows, neural networks, circuit paths, robot heads, chat bubbles, magic wands, sparkles, decorative badges, or generic AI imagery.

## Colour and semantic system

Brand colours establish hierarchy. Semantic colours communicate evidence type, system-generated interpretation, interaction state, and review status. Semantic colours must not become decorative dashboard treatments.

### Brand tokens

| Token | Value | Use |
|---|---:|---|
| Ink Navy | `#172536` | Primary sidebar, logo, headings, primary text, and primary actions. |
| Slate Blue | `#637C91` | Links, secondary actions, active navigation accents, restrained borders, dividers, and interaction emphasis. |
| Soft White | `#F7F8F6` | Main page canvas and document-like reading surface. |

Use Ink Navy and Slate Blue as structural brand colours. Do not use them as substitutes for warning, approval, error, or implementation status.

### Semantic tokens

| Token | Foreground | Background | Border | Use |
|---|---:|---:|---:|---|
| Success | `#1F5C45` | `#E7F2EC` | `#A9CDBA` | Valid files, successful preparation, and completed non-destructive actions. |
| Warning | `#7A4B00` | `#FFF3D6` | `#E0B85A` | Non-blocking warnings, ambiguous delimiters, and items needing review attention. |
| Error | `#8A1C1C` | `#FDE8E7` | `#E0A3A0` | Blocking validation errors, failed operations, and invalid input. |
| Focus | `#2E6F9E` | — | `#2E6F9E` | Keyboard focus ring and active-control outline on light surfaces. |
| Focus on dark | `#F7F8F6` | — | `#F7F8F6` | Keyboard focus ring for controls in the Ink Navy sidebar. |
| Selected evidence | `#234B68` | `#E8F1F6` | `#7A9BB2` | Selected quotations and evidence under inspection. |
| System interpretation | `#4C3A68` | `#F1ECF7` | `#B8A8D1` | System assessment, interpretation, confidence, limitations, and recommendation. |
| Neutral | `#44515C` | `#EEF1F2` | `#B6C0C7` | Draft, inactive, unavailable, and informational states. |

Use foreground colours for text and icons. Use background colours for restrained badges, alerts, selected content, and compact panels. Use border colours only to reinforce grouping or state.

### Review-status tokens

| Status | Foreground | Background | Border | Meaning |
|---|---:|---:|---:|---|
| Draft | `#44515C` | `#EEF1F2` | `#B6C0C7` | Work has started but has not been submitted. |
| Under review | `#7A4B00` | `#FFF3D6` | `#E0B85A` | A finding is available for researcher assessment. |
| Approved | `#1F5C45` | `#E7F2EC` | `#A9CDBA` | The researcher approved the specific proposal. |
| Rejected | `#8A1C1C` | `#FDE8E7` | `#E0A3A0` | The researcher rejected the proposal. |
| Deferred | `#3F5366` | `#E8EDF1` | `#AABAC5` | The decision is postponed and the database remains unchanged. |
| Implemented | `#155E75` | `#E6F4F7` | `#91C3CF` | An approved adaptation was applied and verified. |
| Failed | `#8A1C1C` | `#FDE8E7` | `#E0A3A0` | Implementation failed and requires attention. |
| Pending manual fallback | `#7A4B00` | `#FFF3D6` | `#E0B85A` | An approved change requires manual application. |

Approved and Implemented are separate states. Approved means the researcher accepted a proposal. Implemented means the corresponding adaptation was applied and verified.

### Colour rules

- Every status includes visible text. Add an icon, pattern, shape, weight, or positional cue where useful. Never rely on colour or icons alone.
- Selected evidence uses the pale-blue evidence treatment. System-generated interpretation uses the pale-lavender interpretation treatment.
- Researcher assessment remains on white or Soft White, separated through labels, layout, and controls rather than a competing semantic surface.
- Apply semantic colours only to status badges, compact alerts, focus rings, selected evidence, small state borders, and relevant icons.
- Do not tint entire pages, broad dashboard regions, or large content areas.
- Use a 2 px `#2E6F9E` focus ring with a 2 px offset on light surfaces. Use `#F7F8F6` focus treatment on Ink Navy surfaces.
- Validate text, controls, focus rings, selected evidence, and status combinations against the approved accessibility target once that target is defined. The formal conformance target is deferred.

### CSS colour tokens

```css
:root {
  --color-brand-ink: #172536;
  --color-brand-slate: #637C91;
  --color-brand-soft-white: #F7F8F6;
  --color-success-foreground: #1F5C45;
  --color-success-background: #E7F2EC;
  --color-success-border: #A9CDBA;
  --color-warning-foreground: #7A4B00;
  --color-warning-background: #FFF3D6;
  --color-warning-border: #E0B85A;
  --color-error-foreground: #8A1C1C;
  --color-error-background: #FDE8E7;
  --color-error-border: #E0A3A0;
  --color-focus: #2E6F9E;
  --color-focus-on-dark: #F7F8F6;
  --color-evidence-foreground: #234B68;
  --color-evidence-background: #E8F1F6;
  --color-evidence-border: #7A9BB2;
  --color-interpretation-foreground: #4C3A68;
  --color-interpretation-background: #F1ECF7;
  --color-interpretation-border: #B8A8D1;
  --color-neutral-foreground: #44515C;
  --color-neutral-background: #EEF1F2;
  --color-neutral-border: #B6C0C7;
}
```

## Typography

Althea uses one sans-serif family for everything people read, plus a monospace face for literal values:

- Montserrat for titles, headings, navigation, controls, data labels, body text, quotations, analytical notes, and instructions.
- Roboto Mono for literal technical content: identifiers, timestamps, filenames, code, and fixed-width data.

Serif typefaces are not used. One family keeps the interface consistent; hierarchy comes from size, weight, spacing, and colour rather than from a change of typeface.

### Font families and fallbacks

```css
:root {
  --font-title: "Montserrat", Arial, Helvetica, sans-serif;
  --font-body: "Montserrat", Arial, Helvetica, sans-serif;
  --font-mono: "Roboto Mono", "SFMono-Regular", Consolas,
    "Liberation Mono", monospace;
}
```

`--font-body` stays a separate token so the body face can change in one place. Use Montserrat Regular 400 as the default body weight. Do not use Roboto Mono for long-form reading. Do not use synthetic bold or italic styles.

### Type roles

| Role | Font | Weight | Guidance |
|---|---|---:|---|
| Main title | Montserrat | 600 or 700 | 36–48 px; compact, informative, and dominant. |
| Section heading | Montserrat | 600 | 24–32 px; clear hierarchy with restrained spacing. |
| Display text | Montserrat | 600 or 700 | 48–64 px; rare introductory use only. |
| Navigation and controls | Montserrat | 500 or 600 | Clear, compact, and readable at small sizes. |
| Data labels and status labels | Montserrat | 500 or 600 | 12–14 px; sentence case; never the sole carrier of essential meaning. |
| Body text | Montserrat | 400 | 15–17 px; 1.5–1.65 line height. |
| Quotation text | Montserrat | 400 | Comfortable reading measure (about 70 characters), clear boundaries, and adequate context. |
| Emphasis | Montserrat | 600 | Semantic emphasis, short labels, or brief callouts only. |
| Captions and citations | Montserrat | 400 | Smaller size and muted colour rather than italics. |
| Fine print and helper text | Montserrat | 400 or 500 | 10–13 px, muted colour; keep it short and only where it changes what the researcher does. |
| Tables and numeric data | Montserrat or Roboto Mono | 400 or 600 | Use tabular figures where values must align. |
| Code and literal values | Roboto Mono | 400 | IDs, filenames, timestamps, technical identifiers, and code. |

### Numeric typography

Use proportional numerals in normal prose. Use lining tabular numerals in tables, dashboards, dates, metrics, counts, and aligned columns. Use slashed zero only where technical clarity benefits, such as quotation IDs and fixed-width technical values.

```css
.prose, .caption { font-variant-numeric: proportional-nums; }
.data-table, .metric, .kpi, .date-value {
  font-variant-numeric: lining-nums tabular-nums;
}
.code, .identifier {
  font-variant-numeric: lining-nums tabular-nums slashed-zero;
}
```

If the export environment cannot guarantee tabular-number support, use Roboto Mono for the affected values.

### Font implementation

Self-host the WOFF2 files in `vendor/fonts`. Do not rely on locally installed fonts or font CDNs. Load these static font files (Latin subset):

- Montserrat Regular 400
- Montserrat Medium 500
- Montserrat SemiBold 600
- Montserrat Bold 700
- Roboto Mono Regular 400

Preload Montserrat Regular and Montserrat SemiBold. Use `font-display: swap` for standard web content. For PDF generation and pixel-sensitive slide captures, wait for fonts to load before rendering and embed fonts in PDFs where supported.

```js
await document.fonts.ready;
```

Use the same font files and rendering environment in development, preview, screenshots, PDF export, and slide capture. Retain licence and copyright notices for the exact self-hosted font files (`vendor/fonts/*-LICENSE.txt`).

## Global shell and layout

Use a stable global shell across all product areas:

- Ink Navy left sidebar with logo, workspace or project switcher, grouped navigation, active navigation state, and project actions.
- Quiet utility bar for project context, help, and account controls.
- Persistent seven-stage workflow stepper.
- Breadcrumb or project context, current stage, one clear page title, and one-sentence purpose.
- One dominant primary action per screen. Supporting actions are secondary, tertiary, quiet, or contextual.
- Stable maximum-width content grid and predictable alignment.
- Preserve context and warn before discarding unsaved work.

### Sidebar icon assets

The sidebar uses the same alpha-mask icons as the function cards, coloured by CSS. Do not invert or substitute them.

| Navigation item | Icon |
|---|---|
| Codebook | [codebook.png](./Assets/icons/codebook.png) |
| History | [history.png](./Assets/icons/history.png) |
| Overview (reserved) | [overview.png](./Assets/icons/overview.png) |
| Data (reserved) | [data.png](./Assets/icons/data.png) |
| Review (reserved) | [review.png](./Assets/icons/review.png) |

When a visible navigation label accompanies an icon, treat the icon as decorative for assistive technologies. In the collapsed icon rail, each icon control requires the corresponding accessible name and visible tooltip on focus or hover.

The evidence reader is the centre of gravity. Use three review columns only when appropriate: compact navigation or code list on the left, the widest evidence reader in the centre, and a visually subordinate researcher-assessment panel on the right.

## Responsive behaviour

Althea uses viewport-based breakpoints. Components respond to available content width, not device names. Do not introduce further breakpoints without documenting the content constraint that requires them.

### Breakpoint tokens

| Token | Viewport width | Layout mode |
|---|---:|---|
| xs | Less than 480 px | Narrow mobile |
| sm | 480–767 px | Mobile |
| md | 768–1023 px | Tablet |
| lg | 1024–1279 px | Compact desktop |
| xl | 1280 px and above | Full desktop |

### Sidebar

| Breakpoint | Behaviour |
|---|---|
| xl | Persistent 240–256 px sidebar with logo, workspace switcher, navigation labels, and project actions. |
| lg | Collapsed 72 px icon rail. Show tooltips and accessible labels on focus or hover. Keep active state visible through icon, background, and text alternative. |
| md | Sidebar hidden by default. Open it as a 280 px overlay drawer from a menu button. |
| sm and xs | Off-canvas navigation drawer. Close after navigation unless unsaved work requires a warning. |

Rules:

- Main content must never be compressed below its minimum readable width to keep the sidebar visible.
- At `lg`, use the symbol-only logo. At `xl`, use the full lockup.
- Drawer focus is trapped while open. Escape closes it and returns focus to its trigger.
- A drawer cannot dismiss unsaved form content without warning.
- The primary page title and current workflow stage remain visible at every breakpoint.

### Workflow stepper

| Breakpoint | Behaviour |
|---|---|
| xl | Full horizontal stepper with Import, Prepare, Scope, Analyse, Review, Decide, and Record. |
| lg | Horizontal stepper; short visible labels are permitted when full accessible names remain available. |
| md | Horizontally scrollable stepper. Keep the current stage centred or immediately visible. |
| sm | Compact stepper showing current stage and total progress, for example: `Import · Step 1 of 7`. |
| xs | Current-stage label and progress indicator. Make the full sequence available through an expandable accessible list. |

Rules:

- The stepper reflects completed work, not page visits.
- Completed, current, available, blocked, and deferred stages are distinguishable without colour alone.
- Announce the current stage programmatically.
- Do not allow the stepper to wrap into unpredictable rows.
- Mobile layouts retain access to the complete stage sequence.

### Main content width and padding

| Breakpoint | Content behaviour |
|---|---|
| xl | Maximum content width 1200–1280 px with 32 px outer page padding. |
| lg | Maximum content width 960–1120 px with 32 px outer page padding. |
| md | Single main column with 24 px page padding. |
| sm | Single main column with 16 px page padding. |
| xs | Single main column with 12 px page padding. |

Cards may stack vertically, but the evidence-to-decision hierarchy must remain unchanged. Do not create a separate mobile information architecture unless the desktop sequence cannot be preserved.

### Review workspace

| Breakpoint | Behaviour |
|---|---|
| xl | Three columns: 240–280 px navigation, flexible evidence reader, 320–360 px assessment panel. |
| lg | Two columns: 220–260 px evidence navigation and flexible evidence reader. Open researcher assessment in a right-side drawer. |
| md | One primary evidence column. Open navigation in a left drawer and assessment in a right drawer or modal panel. |
| sm and xs | One-column sequence: source evidence first, researcher assessment second. Use a sticky Open assessment action or bottom action bar. |

Rules:

- The evidence reader always receives the greatest width.
- Researcher assessment remains visually subordinate to source evidence.
- Users move between evidence and assessment without losing scroll position or unsaved notes.
- The assessment panel requires its own heading and an accessible relationship to the evidence under review.
- The review layout must never cause horizontal page scrolling.

### Tables

| Breakpoint | Behaviour |
|---|---|
| xl | Standard table with visible column headers and optional sticky header. |
| lg | Standard table with reduced cell padding; use a horizontally scrollable table region where required. |
| md | Horizontally scrollable table region with sticky header and sticky first identifying column. |
| sm | Use row cards for simple records. Keep complex analytical tables horizontally scrollable. |
| xs | Use row cards by default. Keep complex tables scrollable inside a labelled region. |

Rules:

- Never hide columns without an explicit Show more details mechanism.
- Every table has programmatic column headers.
- Only the table container may scroll horizontally; the page must not.
- Keep the first identifying column sticky where practical.
- Row-card transformations preserve information, reading order, status, and actions.
- Do not reorder data in a way that changes analytical meaning.
- Comparison tables retain both compared objects, evidence summary, score or result, boundary dimension, and decision.
- Tables remain usable at 200% zoom and in a 320 CSS-pixel viewport.

### Drawers

Use drawers for secondary material that should not permanently reduce the evidence-reader width.

| Breakpoint | Behaviour |
|---|---|
| xl | Optional right drawer, 360–440 px wide. |
| lg | Right drawer, 360–420 px wide; overlay content rather than compressing it. |
| md | Right or left drawer, 320–400 px wide, according to function. |
| sm | Full-width side drawer with at least 16 px page inset. |
| xs | Full-screen panel or bottom sheet. |

Rules:

- Drawers require a visible title, close button, accessible dialog or complementary landmark, and clear relationship to supporting content.
- Move focus into the drawer on opening and return it to the trigger on closing.
- Escape closes dismissible drawers.
- Warn before dismissing unsaved content.
- Use bottom sheets only for short, focused actions; use full-screen panels for evidence, multi-field forms, and detailed assessments.
- Do not place essential content in a drawer when it must be read before completing the primary action.

### Confirmations

| Breakpoint | Behaviour |
|---|---|
| xl, lg, md | Centred modal with 480 px maximum width. |
| sm | Full-width dialog with 16 px inset. |
| xs | Full-screen confirmation view or bottom sheet for simple confirmations. |

Every consequential confirmation must show the action being taken, affected object, previous value or relationship, proposed value or relationship, reversibility, implementation status after confirmation, and explicit primary and secondary actions.

Use action-specific labels: Confirm adaptation, Confirm write-back, Reject proposal, Defer decision, and Cancel. Do not use OK, Submit, or Continue as the sole confirmation label.

Rules:

- The modal traps focus.
- Consequential or destructive actions must not receive accidental default focus.
- Escape closes the dialog without applying the action.
- Confirmation remains separate from Save review.
- Saving a review never triggers a database adaptation.
- On mobile, the confirmation action remains visible without requiring users to scroll past explanatory content.

### Primary actions

| Breakpoint | Behaviour |
|---|---|
| xl and lg | Right-aligned in the content footer. |
| md | Right-aligned or placed in a persistent bottom action bar for long forms. |
| sm and xs | Full-width or stacked action group, with the primary action first in reading order. |

The primary action remains visible when practical but must not cover content or obscure validation messages. Secondary actions remain visibly subordinate.

### Cross-breakpoint accessibility contract

At every breakpoint:

- Apply the approved accessibility practices in this guideline. The formal accessibility conformance target is deferred.
- Preserve keyboard access and visible focus.
- Support 200% zoom without loss of content or function.
- Reflow at 400% zoom or within a 320 CSS-pixel viewport, except for inherently wide complex tables.
- Maintain a minimum 44 × 44 CSS-pixel target for interactive controls where practical.
- Never communicate state through colour alone.
- Do not rely on hover-only interaction.
- Preserve source evidence, provenance, review status, and researcher-entered content through layout changes.
- Announce drawer, modal, stepper, validation, loading, and save-state changes to assistive technologies.

## Shared component requirements

| Component | Required content | Must not imply |
|---|---|---|
| Evidence card / quotation block | Quotation ID, exact or bounded text, source, code, relevant metadata, provenance link. | A selected quotation proves an interpretation. |
| Source reference row | Source identity, quotation or row reference, available location, return path to context. | An incomplete or unresolvable source is reliable. |
| System assessment panel | Evidence summary, interpretation, rating or confidence, limitations, generated status. | A final answer, approved decision, or independent fact. |
| Researcher assessment panel | Researcher classification, rationale, notes, recommendation choice, review status, decision controls. | Acceptance is the default. |
| Recommendation block | Recommended action, evidence links, limitations, route to review. | The recommendation has been approved. |
| Adaptation preview | Target, previous value, proposed value, affected objects, evidence, rationale, confirmation requirement, reversibility. | A hidden or irreversible change has occurred. |
| Status badge | Explicit text such as Under review, Approved, Rejected, Deferred, Implemented, Failed, or Pending manual application. | Status is conveyed by colour alone. |
| Issue table | Severity, affected file or item, explanation, recommended action, resolution status. | A warning is blocking or a deferred issue has disappeared. |
| Comparison table | Code definitions, evidence summary, overlap or boundary dimensions, difference in meaning, decision. | Visual alignment proves equivalence. |
| Hierarchy diagram | Selected codes, proposed relationship, specificity evidence, editable structure, suggestion status. | The hierarchy is already part of the codebook. |
| Relationship card / process map | Type, direction, textual evidence, co-occurrence evidence, interpretation, confidence, alternatives, review status. | Co-occurrence proves causation or direction. |
| Analytical memo | Evidence, interpretation, confidence, decision, status, and identifiers as separate fields. | A memo is a final conclusion. |
| Confirmation dialog | Named target, before/after values, affected objects, evidence, rationale, reversibility, confirm and cancel actions. | A change is automatic. |

## State model

Maintain separate state dimensions. Never use one status to imply another.

| Dimension | States |
|---|---|
| Project and import | Not started; Uploading; Validating; Ready; Warning; Blocked; Prepared |
| Analysis | Not started; Queued; Analysing; Result ready; Partial; Insufficient evidence; Failed; Superseded |
| Review decision | Draft; Under review; Approved; Rejected; Deferred |
| Adaptation implementation | Not applicable; Confirmation required; Confirmed; Pending; Implemented; Failed; Pending manual fallback; Reversed; Superseded |

Rules:

- A system finding becomes Under review only after a result is available.
- Saving a review records a researcher decision and rationale; it does not implement a database change.
- Approved applies only to the reviewed proposal.
- Implemented requires verified application or confirmed manual application.
- Rejected and Deferred leave the current database unchanged.
- Failed, superseded, and manual-fallback states remain visible and traceable.
- Partial approval identifies exactly which objects were approved and which remain unapproved.

## Interface and microcopy rules

Use precise, inspectable language.

Approved language:

- Prepare data
- Review quotation
- View supporting passages
- Review interpretation
- Save review
- Preview database adaptation
- Confirm write-back
- Needs review
- Evidence is available for inspection
- Support is partial
- Uncertainty remains
- Co-occurrence suggests a possible relationship; it does not establish causation.
- This suggestion will not change the database until you confirm the adaptation.

Avoid:

- Final answer
- The AI knows
- Guaranteed insight
- Automatic coding complete
- Trust the model
- Proves
- Wording that implies certainty, hidden automation, independent authority, or pressure to accept a suggestion

Do not anthropomorphize the system. Do not frame disagreement, rejection, revision, or deferral as failure.

## Accessibility and export

- Maintain sufficient contrast for text, controls, focus indicators, disabled states, metadata, and status labels.
- Support complete keyboard navigation, logical focus order, visible focus, accessible names, and no keyboard traps.
- Keep interactive targets at least 44 px where applicable.
- Do not rely on hover for essential information.
- Support scaled text without clipping quotations, source references, controls, statuses, or relationship labels.
- Respect reduced-motion preferences. Motion must never be the sole signal for provenance, status, or reading order.
- Keep source boundaries, quotation line length, and metadata readable.
- Maintain hierarchy, provenance, evidence relationships, and review states in grayscale, one-colour, PDF, print, and academic-slide exports.
- Preserve layout geometry during loading. Do not use dark overlays over usable content.
- Empty, loading, and error states state what is absent or occurring, what remains safe, and the next available action.

## Screen definition of done

A screen is ready only when all conditions are met:

- It has one clear primary action.
- Shared shell, stepper, tokens, spacing, typography, and component variants are used consistently.
- Evidence, system assessment, recommendation, researcher assessment, and adaptation preview are visually and explicitly separate.
- Status is explicit and never communicated through colour alone.
- Provenance remains visible wherever evidence or interpretation appears.
- Loading, empty, warning, error, blocked, deferred, and recovery states preserve context.
- The screen remains legible at smaller widths and in PDF and print output.
- Keyboard navigation, visible focus, accessible names, text scaling, reduced motion, and recovery paths work.
- No visual treatment or wording implies autonomous, magical, or unquestionable AI conclusions.

## Required implementation handoff fields

Every screen, component, module, and export view must specify:

1. Screen or component name
2. Workflow stage
3. Observable researcher goal
4. Scope and prerequisites
5. Entry state and preserved context
6. Required components and placement
7. Data and provenance fields
8. System-generated versus researcher-entered content
9. One primary CTA and all secondary actions
10. Review-only versus consequential actions
11. State variants and transitions
12. Validation, error, recovery, and manual-fallback behaviour
13. Save behaviour versus database-adaptation behaviour
14. Accessibility requirements
15. Responsive and export behaviour
16. Exit condition
17. Audit events already supported by the product
18. Open questions requiring explicit validation

## Open decisions

Do not resolve these through design assumption:

- **Deferred to a later development stage:** accessibility conformance target, supported assistive technologies, test methods, and release-quality gate.
- **Deferred to a later development stage:** dark-mode token set, release scope, and semantic equivalence requirements.
- Supported source formats, malformed-export cases, and unavailable-source behaviour.
- Required export formats beyond PDF, slide decks, and print.
- **Deferred to a later development stage:** multi-user collaboration, user roles, permission management, shared workspaces, concurrent editing, approval routing, and decision visibility across users.
- Audit retention period and immutable-event requirements.
- Minimum source context required for sound researcher judgment.
- Final researcher-facing terminology for evidence, interpretation, proposition, confidence, review, and adaptation.
- ATLAS.ti write-back support and manual fallback by adaptation type.
- Claims, labels, visual patterns, and relationship types requiring domain-expert validation.

## Change log

| Date | Change |
|---|---|
| 2026-09-29 | Created living guideline from the workflow specification and approved chat decisions. |
| 2026-09-29 | Added approved typography system: Montserrat, Merriweather, and Roboto Mono. |
| 2026-09-29 | Added fixed semantic colour and review-status token system. |
| 2026-09-29 | Added fixed responsive breakpoint and accessibility contract. |
| 2026-09-29 | Added normative evidence visual language and trust-transition model. |
| 2026-09-29 | Deferred formal accessibility-target and dark-mode decisions to a later development stage. |
| 2026-09-29 | Defined the current single-researcher, full-permission user model; deferred multi-user functionality. |
| 2026-09-29 | Linked the approved logo asset pack and incorporated its usage, clear-space, and minimum-size rules. |
| 2026-09-29 | Linked approved light and dark sidebar-navigation icon assets. |
| 2026-09-30 | Linked approved light and dark assets for the three single-code functionality icons. |
| 2026-10-26 | Standardised typography on Montserrat (plus Roboto Mono for literal values); removed Merriweather and all serif faces. Renamed the document to Althea_Design_Guidelines.md. |
| 2026-10-26 | Replaced the logo and icon PNGs with an SVG mark, favicons, and single alpha-mask icons coloured by CSS; brand sheets moved to Assets/brand as references. |
