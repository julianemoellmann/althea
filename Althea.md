# Instructions

## General distinction

These three concepts should remain separate throughout the tool:

| Layer | Meaning | Example |
|---|---|---|
| Functionality | What the system analyses or suggests | Compare two related codes |
| User action | What the researcher decides to do with the result | Approve a boundary refinement |
| Database adaptation | What is saved after the decision | Update the definition and retain the previous version |

An analytical suggestion is therefore not a database change. A database change occurs only after an explicit researcher action.

The tool should also distinguish between the following workflow stages:

| Stage | Purpose | Main output |
|---|---|---|
| Data input | Receive and inspect the original ATLAS.ti exports | Raw quotation and code-manager files |
| Data preparation | Validate, normalize, and structure the imported data without changing its meaning | `quotation_per_code.csv` and validation issues |
| Analysis | Examine the prepared data and generate findings or suggestions | Ratings, comparisons, definitions, and analytical memos |
| User action | Review the evidence and decide what should happen next | Approved, rejected, edited, or deferred decision |
| Database adaptation | Save an approved change while preserving the original and its history | Updated codebook, coding relationships, or review record |

Data preparation must not be confused with database adaptation. Preparation makes the imported data consistent and reviewable; adaptation changes the reviewed project data only after researcher approval.

The user journey should also be understood at two levels:

| Journey level | Purpose | Where it is described |
|---|---|---|
| Core user journey | Describes how the user moves through Althea from data input to a documented decision | [Section 5: Core User Journey](#5-core-user-journey) |
| Functionality-specific workflow | Describes how the user works inside one selected analytical module | [Section 3: Functionalities of the Tool](#3-functionalities-of-the-tool) and the module-specific references in Section 5 |

The user does not need to complete every functionality in a fixed order. The core journey provides the overall path, while each functionality provides a focused workflow that ends in a user action. Any resulting database change follows the approval and adaptation process in [Section 4: User Actions and Database Adaptations](#4-user-actions-and-database-adaptations).

## 1. Structure of the Data Input

The training data resembles two exported spreadsheets from an ATLAS.ti project.

### 1.1 Data - Quotation Manager

The **“Data - Quotation Manager”** dataset contains the following fields:

- **Number:** `[Document number]:[Paragraph number]`
- **Reference:** `[Reference number]`
- **Name**
- **Text content:** Text content of the quotation
- **Source**
- **Codes:** All codes assigned to the quotation, separated by `,`
- **Number of codes**
- **Comment**
- **Start position**
- **End position**
- **Extent**
- **Creator**
- **Creation Date**
- **Modifier**
- **Modification Date**

### 1.2 Data - Code Manager

The **“Data - Code Manager”** dataset contains the following fields:

- **Code**
- **Groundedness**
- **Density**
- **Groups**
- **Number of Groups**
- **Comment**
- **Creator**
- **Creation Date**
- **Modifier**
- **Modification Date**

---

## 2. Data Preparation

### 2.1 Create a Quotation-per-Code Overview

#### 2.1.1 Purpose
Produce a normalized, reviewable table where each row is a single (code, quotation) pair. This table is the canonical input for all alignment, comparison, and verification steps. This table should serve as the basis for the tool functionalities described below.

#### 2.1.2 Inputs
Spreadsheets (from ATLAS.ti exports). 
- **“Training data - Quotation Manager”** with at least: Number/id, Text content/text, Codes (all assigned codes in one cell).
- **“Training data - Code Manager”**(Optional) with Code, Groundedness, Density, Groups, Definition fields.

#### 2.1.3 Desired output
One CSV: quotation_per_code.csv — one row per code–quotation pair with these columns:
- quotation_id: **“Training data - Quotation Manager”** - **Number:** (or **Reference:** if used as the stable quotation identifier)
- text: **“Training data - Quotation Manager”** - **Text content:** (quotation exactly as exported; raw variant)
- code: **“Training data - Quotation Manager”** **Codes** synchronized with **“Training data - Code Manager”** **Code** (code exactly as exported; raw variant)
- source: **“Training data - Quotation Manager”** **Source** of quotation
- coder: **“Training data - Quotation Manager”** **Creator**
- created: **“Training data - Quotation Manager”** **Creation Date**
- note: **“Training data - Quotation Manager”** **Comment** and **“Training data - Code Manager”** **Comment** (raw variant)

#### 2.1.4 Step‑by‑step procedure
1. Check whether the required spreadsheets are available: **“Training data - Quotation Manager”** and, if needed, **“Training data - Code Manager”**.
2. Normalize the file format: ensure UTF‑8 encoding, correct CSV quoting, and identify the code delimiter used in the exported `Codes` field (` , ` or ` ; `). Document the chosen delimiter before processing.
3. Split multi‑code cells: for each quotation row, separate the `Codes` field into individual code labels. Remove leading and trailing spaces, and ignore empty items.
4. Create one row per (quotation, code): for each split code, create one row with `quotation_id`, `text`, `code`, `source`, `coder`, `created`, and `note`.
5. Preserve raw values: keep the exact exported code names and exact quotation text in the raw output, even if later steps normalize them for comparison.
6. Perform basic validation checks: confirm that every quotation has a valid `quotation_id`, that text is present, and that code entries are not empty. Flag rows with missing values before moving to later analysis.
7. Save the result as `quotation_per_code.csv` in UTF‑8. This table becomes the canonical input for the tool's later alignment and comparison steps.

#### 2.1.5 Validation warnings and errors

The system should distinguish between blocking errors and non-blocking warnings.

**Blocking errors** prevent the user from continuing:

- missing required input file,
- unsupported file format,
- missing required columns,
- unreadable or malformed file,
- missing quotation identifier,
- missing quotation text.

**Non-blocking warnings** allow the user to continue after review:

- blank `Codes` field,
- duplicate quotation-code pair,
- duplicate quotation identifier,
- quotation assigned to multiple codes,
- code present in the quotation export but absent from the Code Manager,
- code present in the Code Manager but unused,
- ambiguous code delimiter,
- missing optional metadata such as comments, dates, or source.

Each issue should include:

- issue type,
- severity,
- affected file,
- affected row or quotation ID where available,
- explanation,
- recommended action,
- resolution status.

The user should be able to inspect all issues before selecting **Prepare data**. The original imported files must remain unchanged regardless of whether an issue is accepted, resolved, or deferred.

#### 2.1.6 Examples (expected quotation_per_code.csv rows)

- `quotation_id`: `Doc12:3`, `text`: "People often describe feeling ignored by the system.", `code`: "feelings of exclusion", `source`: "Interview 12", `coder`: "Researcher A", `created`: "2025-01-14", `note`: "Quotation was discussed during coding workshop."
- `quotation_id`: `Doc16:9`, `text`: "Healthcare access was difficult and inconsistent.", `code`: "healthcare barriers", `source`: "Interview 16", `coder`: "Researcher B", `created`: "2025-01-16", `note`: "Initial open coding; may overlap with access issues."

#### 2.1.7 Practical tips and edge cases

- Keep the raw export values untouched in `quotation_per_code.csv` so that later review can trace changes back to the original ATLAS.ti export.
- If a quotation contains several codes, the row should be repeated for each code so that every code–quotation pair remains visible
- If a code contains commas or semicolons inside its name, the preprocessing must be adjusted so that the delimiter is not confused with a code label.
- If a quotation is assigned to the same code more than once within a single row, remove duplicates before creating the final table.
- If the export uses missing or blank `Codes`, keep the quotation for later review but do not create a code row unless a valid code is present.
- If the `Reference` field is used as the quotation identifier instead of `Number`, keep this consistent across the entire file and document the choice.
- If the dataset contains comments or coder notes in both the quotation export and code manager, store them in the `note` column but keep the original wording unchanged for traceability.
- For very large datasets, check whether the raw export contains repeated quotations or duplicate codes before generating the final table; duplicates should be flagged rather than silently merged.

---

## 3. Functionalities of the Tool

### 3.0 Analytical scope

Each functionality should state the level at which it operates. The scope determines what the user selects before starting the analysis and what evidence the system examines.

| Scope | Meaning | User selects | Functionalities |
|---|---|---|---|
| Single-code analysis | Examines one code and all quotations assigned to it | One code | Internal Code Coherence; Verifying Coding; Creating Code Definitions |
| Selected multi-code analysis | Examines a chosen pair or group of related codes | Two or more codes, usually selected by the user | Comparing Codes; Code Hierarchy Suggestions |
| Whole-dataset analysis | Looks for patterns, inconsistencies, or relationships across the complete quotation-per-code dataset | The whole dataset | Cross-Code Coding Consistency; Category / Pattern Code Generation; Relational and Process Analysis |

The third scope always operates across the complete quotation-per-code dataset. The user does not select a subset at this scope; the system uses all available codes and quotation-code assignments to identify recurring patterns, co-occurrences, or inconsistencies. The selected scope should always be visible before the analysis starts.

### 3.1 Internal Code Coherence

This step evaluates whether the quotations assigned to a code form a coherent conceptual group. While quotation-level verification asks whether a single quotation fits the code, this analysis asks whether the full set of quotations assigned to the code actually belong together as one meaningful category.

#### 3.1.1 Purpose

The purpose is to determine whether a code is:

- conceptually stable,
- internally consistent,
- sufficiently specific,
- in need of sub-coding, renaming, or re-grouping.

This step helps identify codes that may appear valid at the individual quotation level but are conceptually fragmented when viewed as a whole.

#### 3.1.2 Questions to ask for each code

- Do the quotations share a common conceptual core?
- Are there identifiable subgroups of quotations within the code?
- Are those subgroups variations of the same concept or genuinely different concepts?
- Does the current code name adequately represent all quotations?
- Is the code too broad, too heterogeneous, or conceptually fragmented?

#### 3.1.3 Assessment categories

Assign one of the following ratings to the code:

- **[STRONG COHERENCE]:** The quotations clearly belong to one concept.
- **[MODERATE COHERENCE]:** The quotations share a common theme, but different subtypes are present.
- **[WEAK COHERENCE]:** The quotations reflect more than one underlying concept or the code is conceptually fragmented.

#### 3.1.4 Suggested output

| Code | Coherence assessment | Subgroup patterns | Interpretation | Suggested action |
|---|---|---|---|---|
| Access barriers | Moderate | Financial, administrative, transport | Related but distinct manifestations | Keep with clearer definition or create subcodes |
| Trust in providers | Strong | Limited variation | Coherent central concept | Keep as is |
| Health system problems | Weak | Service access, waiting times, staff behavior | Multiple concepts in one code | Split or rename |

#### 3.1.5 Decision rules

- If a code contains several recurring but distinct subthemes, create subcodes.
- If the code name is too broad and subsumes different concepts, rename or split the code.
- If the quotations share a common core but differ in manifestations, keep the code but clarify the definition.
- If the quotations are not conceptually connected, the code should be re-coded or retired.

This analysis should be conducted before final code definitions are locked in, because it helps decide whether the code should remain a single category or be separated into more conceptually stable units.

#### 3.1.6 Functionality-specific workflow

- **Scope:** Single code.
- **User question:** Do the quotations assigned to one code share a common conceptual core?
- **Input and evidence:** One selected code, all associated quotations, and relevant code metadata. The unit of analysis is the set of quotations assigned to the code, not an individual quotation in isolation.
- **User actions:** Select the code, review the quotation set, identify recurring subgroups, assess whether the subgroups share a conceptual core, and record a coherence assessment.
- **System output:** Coherence rating, subgroup summary, representative evidence, interpretation, and recommendation.
- **Possible adaptation:** Keep, refine, rename, split, merge, or retire the code. Apply the approved change through [Section 4](#4-user-actions-and-database-adaptations).

The system should distinguish between **evidence** from the quotations and the **interpretation** of that evidence. A subgroup is not automatically a reason to split the code; the researcher must decide whether it represents a legitimate subtype or a genuinely different concept.

---

### 3.2 Verifying Coding

This step evaluates whether the code label and the quotations assigned to it are actually aligned. The unit of analysis is not the whole dataset, but each distinct code as it appears in the `quotation_per_code.csv` table. For each code, the researcher reviews all quotations assigned to that `code` and asks whether the quotations provide sufficient evidence for the code name and for the conceptual meaning the code is intended to capture.

Unlike [Internal Code Coherence](#31-internal-code-coherence), which asks whether the quotation set forms a coherent group, Verifying Coding asks whether the quotation set actually supports the current code label and its intended meaning.

#### 3.2.1 Purpose

The purpose of this step is to determine whether a code is:

- supported by clear evidence in the quotations,
- semantically coherent across its assigned quotations,
- distinct from other related codes,
- in need of refinement, re-naming, nesting, or re-coding.

The goal is not simply to check whether the code is used often, but whether the quotations justify the current label and meaning.

#### 3.2.2 Review unit

For each unique `code`:

- collect all rows in `quotation_per_code.csv` where `code` matches that label,
- read the associated `text` values,
- inspect the `source`, `coder`, `created`, and `note` columns when relevant,
- decide whether the code is systematically supported or whether the code label is too broad, too narrow, or conceptually inconsistent.

This provides the evidence base for evaluating the code label, borderline cases, and possible recoding decisions.

#### 3.2.3 Evaluation questions

For each code, ask:

- Do the quotations assigned to this `code` actually support the current code label?
- Which words, phrases, or meanings in the quotations justify the code?
- Are the quotations strongly, moderately, or weakly aligned with the code?
- Does the code cover more than one underlying concept?
- Is the code too broad, too narrow, or overlapping with another code?
- Is the code definition needed, or does the code already have a clear conceptual boundary?

The researcher should compare the code label against the actual content of the quotations and decide whether the label is a good fit, a partial fit, or a misfit.

#### 3.2.4 Validity rating

Assign one of the following ratings to the code:

- **[STRONG]:** The quotations clearly and directly support the code label and its intended meaning.
- **[MODERATE]:** The quotations mostly fit the code, but some interpretation is needed or the coding is slightly inconsistent.
- **[WEAK/MISALIGNED]:** The quotations do not meaningfully support the code, or they better fit another concept.

A code can be rated as **[WEAK/MISALIGNED]** even if it has many quotations, if the quotations are not conceptually coherent or if the label is not the best fit.

#### 3.2.5 Output of the review

For each reviewed code, document:

- the code label,
- a brief justification based on the quotations,
- the rating,
- the main issue, if there is one,
- the recommended action.

Possible actions include:

- Re-code the quotation: suggest another code from the dataset that fits better.
- Refine the code definition: revise the conceptual and boundary description.
- Rename the code: if the label is too vague, imprecise, or misleading.
- Create a sub-code: if the code covers multiple distinct concepts.
- Merge with a related code: if the code overlaps substantially with another code.
- Keep the code as is: if the quotations clearly and consistently support it.

| Code | Number of quotations | Rating | Evidence from quotations | Interpretation | Recommended action |
|---|---:|---|---|---|---|
| Example code | 18 | [STRONG] | Quotations clearly mention barriers to access and trust | Code is conceptually coherent | Keep as is |
| Example code 2 | 9 | [MODERATE] | Some quotations refer to trust, others to affordability | Code may be too broad | Refine definition or create sub-code |
| Example code 3 | 4 | [WEAK/MISALIGNED] | Quotations better fit resource constraints or implementation problems | Label does not match content | Rename or re-code |

This review can be conducted manually by the researcher or discussed in a team coding session. Its output can inform later code-definition and code-comparison work, but it should remain a separate review record.

#### Functionality-specific workflow

- **Scope:** Single code.
- **User question:** Do the quotations assigned to a code support its label and intended meaning?
- **Input and evidence:** One selected code, its quotations, code definition or comment, notes, and possible outliers.
- **User actions:** Review the evidence, classify quotations as strong, borderline, or outlying, assess validity, and select a recommendation.
- **System output:** Evidence summary, validity rating, outlier list, and recommended action.
- **Possible adaptation:** Keep the code, recode quotations, refine the definition, rename, split, merge, or defer the decision. See [Section 4](#4-user-actions-and-database-adaptations).

The evidence view should allow the researcher to inspect the full quotation, source, current code, and review note before classifying a quotation. **Save review** records the assessment; it does not automatically recode quotations or change the codebook. Approved changes follow [Section 4](#4-user-actions-and-database-adaptations).

---

### 3.3 Creating Code Definitions

A code definition is a brief, explicit statement that explains what the code means and when it should be used. The definition should be grounded in the quotations assigned to the code and should be precise enough to help researchers apply the code consistently across the dataset.

This functionality turns the evidence from [Internal Code Coherence](#31-internal-code-coherence) and [Verifying Coding](#32-verifying-coding) into a concise, reusable coding rule. It drafts a definition; it does not decide the final wording or write it back to ATLAS.ti automatically.

#### 3.3.1 Purpose

A strong code definition helps the research team:

- maintain consistency in coding across time and across researchers,
- distinguish similar codes from one another,
- reduce drift in code meaning,
- support later comparison and refinement of the codebook.

The code definition should be built from the evidence reviewed in Sections 3.1 and 3.2, not from intuition alone.

#### 3.3.2 Structure of a code definition

Each code definition should include two parts:

1. **Core Concept**  
   A brief sentence explaining the central idea or phenomenon captured by the code.

2. **Boundary / Inclusion-Exclusion Rule**  
   A brief sentence clarifying what should and should not be included in the code, especially in relation to closely related codes.

The full definition should stay within a maximum of 50 words.

#### 3.3.3 Definition review process

For each code, determine whether a definition already exists and assess whether it is adequate.

##### If a definition exists

Review whether the definition:

- aligns with the quotations assigned to the code,
- is supported by the evidence from the coding-verification step,
- contains both required elements:
  - Core Concept
  - Boundary / Inclusion-Exclusion Rule
- is concise and clear enough for consistent use,
- is no longer than 50 words.

If necessary, revise the definition to better match the evidence and reduce ambiguity.

##### If no definition exists

Use the quotations assigned to the code to write a new definition with the following structure:

**Core Concept:**  
`[One sentence describing the central meaning of the code]`

**Boundary Rules:**  
`[One sentence describing when the code applies and when it should not be used]`

After drafting or revising the definition, test it against representative, borderline, and atypical quotations. A definition is ready for approval only when it explains the central pattern and gives the researcher a usable inclusion and exclusion rule.

#### 3.3.4 Criteria for a good definition

A code definition is strong when it:

- reflects the actual content of the quotations,
- is specific enough to distinguish it from adjacent codes,
- is narrow enough to avoid over-inclusion,
- is broad enough to cover the main pattern in the data,
- can be applied consistently by different researchers.

A weak definition is often too vague, too broad, or too similar to another code's meaning.

#### 3.3.5 Examples of strong and weak definitions

**Strong definition example**  
**Core Concept:** The code refers to practical barriers that limit access to support or services.

**Boundary Rules:** Apply this code when participants describe obstacles such as cost, waiting time, transport, or administrative difficulty; do not use it for general dissatisfaction without a concrete barrier.

**Weak definition example**  
**Core Concept:** The code is about problems in healthcare.

**Boundary Rules:** Use it when things are bad.

The weak version is too broad and does not help researchers decide when the code should be applied.

#### 3.3.6 Output of the definition step

For each code, store:

- the code label,
- the final definition,
- the quotations that informed the definition,
- any adjustment made because the original definition was weak or inconsistent.

This helps the research team maintain a transparent and traceable codebook.

#### 3.3.7 Representative quotation selection

For each code, identify three useful types of quotations that support the definition and clarify the code boundary:

- **Prototypical quotation:** strongly represents the central meaning of the code.
- **Borderline quotation:** fits the code but sits close to an inclusion/exclusion boundary.
- **Atypical quotation:** unusual compared with most applications but still potentially valid.

These quotations should be stored together with the code definition because they help researchers understand what the code usually looks like, where the boundary is, and which cases may require a later revision.

The purpose of selecting representative quotations is to make the definition concrete and transparent. It supports researchers in:

- explaining the core meaning of the code,
- clarifying where the code should and should not be applied,
- identifying edge cases that may require a boundary revision,
- reducing drift in interpretation across coding sessions.

Example output:

| Code | Quotation type | Quotation excerpt | Why it matters |
|---|---|---|---|
| Access barriers | Prototypical | "I could not get the service because I had no transport." | Clear example of the central meaning |
| Access barriers | Borderline | "The service was available, but it was difficult and frustrating to navigate." | Near the boundary between access and service quality |
| Access barriers | Atypical | "I eventually received help, but only after repeated referrals." | Unusual but still relevant to the broader access issue |

These examples provide the evidence base for a strong definition and make the code's meaning easier to discuss and compare across researchers.

#### 3.3.8 ATLAS.ti write-back reference

The possible transfer of an approved definition or other reviewed change back into ATLAS.ti is governed by [Section 4.7: ATLAS.ti Integration and Write-back](#47-atlasti-integration-and-write-back). This functionality only generates a candidate change; it does not apply the change automatically.

#### Functionality-specific workflow

- **Scope:** Single code.
- **User question:** What does this code mean, and where are its boundaries?
- **Input and evidence:** One selected code, its quotations, existing definition or comment, and representative quotations.
- **User actions:** Review the evidence, identify the core concept, draft or edit the definition, test it against representative quotations, and approve, edit, reject, or defer it.
- **System output:** Candidate definition, boundary rule, representative quotations, quality checks, and approval status.
- **Possible adaptation:** Submit the approved definition to the ATLAS.ti write-back process described in [Section 4.7](#47-atlasti-integration-and-write-back). An unapproved definition remains only in the review record.

The definition review should record the previous definition, the proposed definition, the researcher's decision, and the rationale. The definition remains a suggestion until the researcher approves the exact wording.

---

## 4. User Actions and Database Adaptations

The functionalities in Section 3 generate analytical findings, ratings, and suggestions. They do not automatically change the researcher's coding database. The researcher remains responsible for deciding whether a suggestion should be accepted, rejected, or kept for later discussion.

This section defines the actions available to the researcher and the corresponding adaptations to the project's codebook, quotation assignments, and analytical records.

### 4.1 Review and approval workflow

Every suggestion that could change the codebook or coding data should follow this workflow:

1. The system generates a finding or suggestion and links it to the supporting quotations, codes, or relationships.
2. The researcher reviews the evidence and selects an action.
3. The researcher may approve, reject, edit, or defer the suggestion.
4. If approved, the system creates a proposed database adaptation for confirmation.
5. After confirmation, the adaptation is saved and added to the audit trail.
6. The original value and the reasoning behind the change remain available for later review.

The default status of every generated suggestion should be **Under review**. Other possible statuses are **Approved**, **Rejected**, **Deferred**, and **Implemented**.

### 4.2 Available user actions

| User action | When it is used | Database adaptation |
|---|---|---|
| Keep code as is | The code is coherent and well supported | Record the decision and review status; do not change the code |
| Rename code | The current label is vague, misleading, or too broad | Save the new label and preserve the previous label |
| Refine definition | The code needs clearer meaning or boundaries | Save a revised definition, inclusion rule, and exclusion rule |
| Create subcode | A code contains recurring, meaningful subgroups | Create new child codes and record their parent code |
| Merge codes | Two codes have nearly identical meaning and application | Create a merged code or designate a surviving code; preserve source-code history |
| Split code | One code contains distinct concepts that should be separated | Create replacement codes and propose reassignment of affected quotations |
| Recode quotation | A quotation is misaligned, borderline, or better suited to another code | Add, remove, or replace a quotation-code relationship |
| Add or remove hierarchy | The code structure needs a parent-child or sibling relationship | Create, change, or remove a code relationship |
| Approve relationship | A proposed causal, temporal, or process relationship is supported | Save the relationship, evidence, confidence, and approval status |
| Reject suggestion | The evidence does not justify the proposed change | Keep the current database unchanged and record the rejection reason |
| Defer decision | More discussion or evidence is needed | Keep the suggestion pending without changing the current database |
| Add review note | The researcher wants to document reasoning or uncertainty | Save a note linked to the relevant code, quotation, or suggestion |

### 4.3 Database objects affected by user actions

User actions may affect the following objects:

- **Code:** label, definition, comment, status, and metadata.
- **Quotation-code assignment:** the relationship between a quotation and a code.
- **Code relationship:** parent-child, sibling, broader-narrower, component-of, or relational connection.
- **Analytical suggestion:** the generated finding, evidence, recommendation, and review status.
- **Review decision:** the researcher's chosen action, rationale, identity, and timestamp.
- **Version history:** the previous and new values associated with an approved change.

The raw imported data should remain unchanged. Adaptations should be stored as reviewed project data or as a new export/version so that the original ATLAS.ti export can always be recovered.

### 4.4 Mapping functionalities to user actions

| Functionality | Possible researcher actions | Possible database adaptations |
|---|---|---|
| Internal Code Coherence | Keep, refine, split, rename, or retire a code | Update code status or definition; create subcodes; preserve affected-code history |
| Verifying Coding | Keep, recode, flag as borderline, or reject the suggestion | Add or remove quotation-code assignments; save evidence and rationale |
| Creating Code Definitions | Approve, edit, reject, or defer a definition | Submit the approved definition to the [ATLAS.ti write-back process](#47-atlasti-integration-and-write-back) |
| Comparing Codes | Keep separate, refine boundaries, merge, or create hierarchy | Update definitions, code relationships, or merge history |
| Cross-Code Coding Consistency | Confirm distinction, normalize coding, or investigate further | Update quotation-code assignments or boundary rules |
| Code Hierarchy Suggestions | Approve, edit, reject, or defer a hierarchy | Create or revise parent-child and sibling relationships |
| Category / Pattern Code Generation | Approve, rename, revise, or reject a category | Create a category or pattern code and link its contributing codes |
| Relational and Process Analysis | Approve, qualify, reject, or defer a relationship | Save a reviewed relationship with evidence, direction, confidence, and status |

### 4.5 Audit trail and version history

Every approved or rejected action should produce an audit record containing:

- action ID,
- project ID,
- affected object and object ID,
- action type,
- previous value or relationship,
- proposed or new value,
- supporting suggestion or evidence IDs,
- researcher decision,
- decision rationale,
- researcher identity,
- date and time,
- implementation status.

For changes to quotation-code assignments, the audit record should also include the quotation ID and the code before and after the change. For merges and splits, it should identify all source and resulting codes.

The system should support the following principles:

- **Explicit approval:** no analytical suggestion changes the database without researcher confirmation.
- **Reversibility:** approved changes can be reviewed and, where possible, undone or superseded by a later version.
- **Traceability:** every change can be connected to its evidence and decision.
- **Raw-data preservation:** imported source data is never overwritten.
- **Partial approval:** the researcher can approve one suggestion without approving other suggestions.
- **Human interpretation:** the system may recommend changes, but the researcher determines their analytical validity.

### 4.6 Example of a complete adaptation

The system identifies that `Access barriers` contains two recurring subgroups: financial and administrative barriers.

1. **Functionality:** Internal Code Coherence detects the subgroups and recommends splitting the code.
2. **User action:** The researcher reviews the quotations, approves the split, and edits the proposed labels.
3. **Database adaptation:** The system creates `Financial barriers` and `Administrative barriers` as child codes and proposes new assignments for the affected quotations.
4. **Confirmation:** The researcher approves or adjusts each quotation reassignment.
5. **Audit record:** The system stores the original code, new codes, affected quotations, evidence, researcher, timestamp, and rationale.

The same pattern applies to smaller changes, such as approving a revised definition or rejecting a suggested relationship.

## 5. Core User Journey

### 5.1 Purpose

Althea is a qualitative coding review tool that helps researchers assess whether codes are conceptually coherent, supported by quotations, and in need of refinement. The journey connects the imported data, analytical functionalities, researcher decisions, and reviewed database adaptations described in Sections 1–4.

The primary user is a qualitative researcher, analyst, or code reviewer working with interview or document data. The user's main objective is to review coding quality, detect weak or misaligned codes, and make informed, traceable decisions about code refinement.

### 5.2 User goals

The user wants to:

1. Import the required ATLAS.ti exports and confirm that they are valid.
2. See a clear overview of quotations assigned to each code.
3. Evaluate whether a code is conceptually strong, moderate, or weak.
4. Identify quotations that do not fit well with the rest of a code.
5. Decide how to address weak, overlapping, or fragmented codes.
6. Keep a traceable record of review decisions and database adaptations.

### 5.3 Overall Navigation

The overall navigation should make the user's progress through Althea visible without forcing every functionality into a fixed sequence.

```text
1 Import -> 2 Prepare -> 3 Scope -> 4 Review
```

The navigation should support the following principles:

- **Visible progress:** Show the current stage and the stages that remain.
- **Flexible movement:** Allow the user to return to earlier stages without losing review decisions or prepared data.
- **Context preservation:** Keep the selected project, code, quotations, findings, and pending decisions available when the user navigates between stages.
- **Clear transition:** Distinguish between an analytical suggestion, a researcher decision, and a confirmed database adaptation.
- **Safe forward movement:** Do not mark a stage complete until its required validation, review, or confirmation has been completed.
- **Recoverable decisions:** Preserve rejected, deferred, and approved decisions in the review record.

The stage navigation should be available throughout the core journey, while functionality-specific workflows open within the **Analyse** stage. The decision and database-adaptation controls described in [Section 4](#4-user-actions-and-database-adaptations) become available after the user has reviewed a finding.

### 5.4 Mandatory journey

#### Step 1: Start a project and import data

The user creates a project and uploads:

- the quotation export from ATLAS.ti,
- the code manager export from ATLAS.ti.

The system checks file presence and required columns, validates the input, and provides an import summary showing total quotations, total codes, quotations with multiple codes, and detected issues. The detailed input structure and validation requirements are defined in [Section 1: Structure of the Data Input](#1-structure-of-the-data-input).

**User intent:** Confirm that the imported data is valid before beginning the review.

**Expected feedback:**

- upload status,
- data preview,
- missing or invalid rows,
- confirmation that the project can proceed.

The **Create project** action remains disabled until the project name is entered and both required files have passed validation.

After each file is uploaded, its validation status replaces **No file selected**. The user can then inspect successful uploads, missing-column warnings, or invalid-file errors before continuing.

#### Step 2: Prepare the quotation-per-code data

The system creates the normalized quotation-per-code overview described in [Section 2: Data Preparation](#2-data-preparation). The user can inspect, search, filter, and sort the prepared data by code, source, quotation ID, reviewer status, or coherence level.

**User intent:** Work with a consistent review unit in which every code–quotation relationship is visible.

**Expected feedback:**

- each valid quotation-code relationship is represented,
- multi-code quotations are expanded,
- duplicate and invalid entries are flagged,
- the original imported data remains preserved.

#### Step 3: Select the analysis scope

Once preparation is complete, the user first selects the level at which the analysis should operate. The scope determines what the user selects next and which functionalities are available.

The user can return to data preparation without losing the prepared dataset or existing review decisions.

#### Step 4: Choose a functional review path

After selecting the scope, the user chooses a compatible analytical function. The available modules are defined in [Section 3: Functionalities of the Tool](#3-functionalities-of-the-tool). The normalized data remains available in the selected module, so the user does not need to repeat the import or preparation steps.

Only functionalities compatible with the selected scope should be shown. For example, **Single code** displays Internal Code Coherence, Verifying Coding, and Creating Code Definitions.

#### Step 5: Review evidence and produce a finding

The selected functionality presents the relevant quotations, code metadata, definitions, relationships, and other evidence. The user reviews the material and evaluates the system's finding or suggestion.

The module-specific analytical procedures and outputs are defined in [Section 3](#3-functionalities-of-the-tool). The system should distinguish clearly between evidence, interpretation, confidence, and recommendation.

#### Step 6: Resolve the finding

After reviewing the evidence, the user chooses an action such as:

- keep the code as is,
- rename the code,
- refine its definition or boundary,
- create a subcode,
- split or merge codes,
- recode one or more quotations,
- create or revise a hierarchy,
- approve a proposed relationship,
- reject the suggestion,
- defer the decision,
- add a review note.

These actions and their database effects are defined in [Section 4: User Actions and Database Adaptations](#4-user-actions-and-database-adaptations). No suggestion changes the database automatically.

#### Step 7: Confirm and record the adaptation

If the user approves a change, the system presents the proposed database adaptation for confirmation. After confirmation, it saves the change, preserves the previous value or relationship, and records the evidence, rationale, researcher, timestamp, and implementation status in the audit trail described in [Section 4.5](#45-audit-trail-and-version-history).

### 5.5 User actions and system responses

| Stage | User action | System response |
|---|---|---|
| 1 | Create a project and upload both files | Validate file presence and required columns; show import summary |
| 2 | Start data preparation | Generate the quotation-per-code overview and flag validation issues |
| 3 | Select analysis scope | Show compatible scope options and preserve the prepared data |
| 4 | Choose a review function | Open compatible analytical modules with prepared data in context |
| 5 | Review evidence | Show quotations, code information, findings, and uncertainty |
| 6 | Resolve the finding | Record the user's decision and rationale |
| 7 | Confirm an approved adaptation | Apply the reviewed change and create an audit record |

### 5.6 Final resolution rule

Every completed analytical path should end in a documented resolution. A resolution may change the reviewed project data, leave it unchanged, or defer the decision. The current database must remain unchanged when the user rejects or defers a suggestion.

### 5.7 Success criteria for the first prototype

The first prototype is successful when the user can:

- upload both required files successfully,
- complete data preparation without manual correction,
- review the quotation-per-code dataset,
- choose an analytical function,
- assess at least one code for coherence and evidence,
- decide whether the code should be kept, renamed, split, merged, or recoded,
- see the decision and its rationale in a clear review trail.

### 5.8 Product framing

> Althea helps researchers review and refine qualitative coding by turning raw ATLAS.ti exports into a structured, evidence-based review workflow.
