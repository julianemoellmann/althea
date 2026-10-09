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

#### 3.1.7 Mockup: Internal Code Coherence review

```text
(5) Internal Code Coherence
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Single code                              |
| Function: Internal Code Coherence               |
|                                                  |
| Code                                             |
| [Access barriers                         v]      |
| 42 quotations | Current status: Needs review     |
|                                                  |
| Evidence from quotation set                     |
| Recurring subgroups detected:                   |
| [Financial] [Administrative] [Transport]        |
|                                                  |
| Representative quotations                        |
| "I could not afford the treatment..."           |
| "The paperwork made it impossible..."           |
| "The clinic was too far away..."                |
|                                                  |
| System assessment                               |
| MODERATE COHERENCE                              |
| Related manifestations are present, but the code |
| may contain distinct subtypes.                   |
|                                                  |
| Suggested action                                |
| [Keep and clarify] [Create subcodes] [Rename]   |
| [Review quotations] [Defer]                     |
|                                                  |
| [Back to functions]       [Save assessment]     |
+--------------------------------------------------+
```

The mockup should make clear that the system proposes an interpretation, while the researcher chooses the final action. The **Save assessment** action records the review; it does not itself write changes back to ATLAS.ti. Approved adaptations follow [Section 4](#4-user-actions-and-database-adaptations).

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

#### 3.3.9 Mockup: Creating Code Definitions

```text
(5) Create or revise a code definition
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Single code                              |
| Function: Creating Code Definitions             |
|                                                  |
| Code                                             |
| [Access barriers                         v]      |
| 42 quotations | Existing definition: None        |
|                                                  |
| Evidence summary                                |
| Core pattern: Obstacles to obtaining services    |
| Related codes: Service gaps, Financial burden    |
|                                                  |
| Draft definition                                |
| Core Concept:                                    |
| [Practical barriers that limit access to        |
|  support or services.________________________]  |
|                                                  |
| Boundary Rules:                                  |
| [Use for concrete obstacles such as cost,       |
|  waiting time, transport, or administration;    |
|  exclude general dissatisfaction._____________] |
|                                                  |
| Definition checks                                |
| [x] Core concept is present                      |
| [x] Inclusion rule is clear                      |
| [x] Exclusion rule is clear                      |
| [!] Review borderline quotation                  |
|                                                  |
| Representative evidence                         |
| Prototypical | Borderline | Atypical            |
|                                                  |
| [Reject] [Defer] [Save draft] [Approve]          |
|                                                  |
| Approved text can be sent to ATLAS.ti only      |
| through the confirmed write-back process.       |
+--------------------------------------------------+
```

The screen should keep the evidence and generated definition visibly separate. **Approve** records the researcher's decision and makes the definition eligible for the write-back process; it does not write to ATLAS.ti without the separate confirmation described in [Section 4.7](#47-atlasti-integration-and-write-back).

---

### 3.4 Comparing Codes

This step compares codes that appear conceptually related in order to determine whether they are distinct, overlapping, or should be revised. The comparison should be conducted only after internal coherence has been assessed, a code has been verified, and its definition has been clarified, because the purpose is to refine the codebook rather than to guess at relationships.

This functionality operates on a selected pair or group of codes. It is a code-level comparison, not a dataset-wide consistency check; possible inconsistent application across individual quotations is handled in [Cross-Code Coding Consistency](#35-cross-code-coding-consistency).

#### 3.4.1 Purpose

The purpose of this step is to identify:

- codes that are conceptually very close,
- codes that appear similar but differ in meaning or application,
- codes that are too broad and should be split,
- codes that should be merged or organized hierarchically,
- codes that are still distinct but require boundary clarification.

#### 3.4.2 Comparison criteria

For each relevant pair of codes, compare:

- the **code labels**,
- the **code definitions**,
- the **quotations assigned to each code**,
- the **boundary rules** defined for each code,
- the **degree of conceptual overlap** between the two codes.

A comparison should focus on semantic similarity, not on frequency alone. A code may be frequent without being conceptually close to another code.

#### 3.4.3 Semantic overlap score

For each relevant pair of codes, assign a **Semantic Overlap Score** from `0` to `10`.

Use the following interpretation:

- `0`: No meaningful semantic overlap
- `2`: Minimal overlap, mostly unrelated
- `4`: Some overlap, but clearly distinct concepts
- `6`: Substantial conceptual overlap with important differences in application
- `8`: Highly similar, likely requires refinement or consolidation
- `10`: Nearly identical in meaning and application

The score is a structured aid for discussion, not an automatic decision rule. It should always be accompanied by a written explanation of the overlap and the boundary dimension that separates the codes.

#### 3.4.4 Questions to guide comparison

For each code pair, ask:

- Where do the codes overlap?
- How do their meanings differ?
- Do their quotations support the same underlying concept or different aspects of it?
- Are the boundary rules different enough to keep the codes separate?
- Would a researcher reasonably confuse the two codes in practice?
- Should the codes remain separate, be refined, be merged, or be arranged hierarchically?

#### 3.4.5 Boundary dimension analysis

Rather than reporting only a semantic overlap score, identify the main dimension that separates two similar codes. This makes the comparison more actionable and helps refine the code definitions.

Possible dimensions include:

- **actor**
- **object**
- **cause**
- **consequence**
- **process**
- **context**
- **level of analysis**
- **temporal stage**
- **intensity**
- **perspective**

For each pair of codes, ask: What is the main axis on which they differ?

**Example:**

**Access barriers** vs. **Service gaps**

**Shared concept:** Difficulty obtaining adequate support.

**Boundary:** `Access barriers` concerns obstacles experienced when trying to obtain available services. `Service gaps` concerns the absence or inadequacy of the services themselves.

This produces a more actionable explanation than a raw overlap score and supports more precise code definitions.

#### 3.4.6 Decision categories

After scoring and comparing, classify the code pair as one of the following:

- **Keep separate:** the codes are conceptually distinct and the boundary is clear.
- **Refine boundaries:** the codes overlap but should remain separate with clearer definitions.
- **Merge:** the codes are nearly identical in meaning and can be consolidated.
- **Create hierarchy:** one code is a sub-category or component of the other.
- **Review further:** the relationship is unclear and requires team discussion.

The decision should be based on the definitions, quotations, and boundary explanation rather than on the overlap score alone.

#### 3.4.7 Comparison table template

| Code 1 | Definition 1 | Code 2 | Definition 2 | Semantic Overlap Score | Overlap | Boundary dimension | Decision |
|---|---|---|---|---:|---|---|---|
| Access barriers | Obstacles that prevent participants from obtaining support or services | Service gaps | Problems in the availability or quality of care and support | 8 | Both describe obstacles to support, but one emphasizes access and the other emphasizes system-level inadequacy | cause / service availability | Refine boundaries or create hierarchy |
| Trust in providers | Confidence in caregivers and institutions | Provider communication | Quality of dialogue and information exchange | 4 | Shared social interaction context, but different conceptual focus | perspective / interaction quality | Keep separate |
| Resource constraints | Lack of time, money, or capacity | Financial burden | Economic hardship affecting participation or care | 9 | Almost identical in many cases | consequence / economic impact | Merge or revise one code |

#### 3.4.8 Output of the comparison step

For each comparison, record:

- the two codes being compared,
- the overlap score,
- the overlap and difference in meaning,
- a statement on the boundary difference,
- the final decision.

This makes the comparison process transparent and allows the codebook to be revised in a traceable and defensible way.

#### Functionality-specific workflow

- **Scope:** Selected pair or group of codes.
- **User question:** Are two codes distinct, overlapping, or candidates for consolidation?
- **Input and evidence:** A selected pair of codes, their definitions, quotations, boundary rules, and relevant code relationships.
- **User actions:** Select the pair, compare meanings and evidence, identify the boundary dimension, assign an overlap score, and choose a decision category.
- **System output:** Comparison summary, overlap score, boundary explanation, and decision recommendation.
- **Possible adaptation:** Keep separate, refine boundaries, merge, or create a hierarchy after researcher approval. See [Section 4](#4-user-actions-and-database-adaptations).

#### 3.4.9 Mockup: Comparing Codes

```text
(5) Compare codes
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Selected pair of codes                   |
| Function: Comparing Codes                        |
|                                                  |
| Code 1                                           |
| [Access barriers                         v]      |
| Definition: Obstacles to obtaining services     |
| 42 quotations                                   |
|                                                  |
| Code 2                                           |
| [Service gaps                            v]      |
| Definition: Absence or inadequacy of services   |
| 27 quotations                                   |
|                                                  |
| Shared evidence                                 |
| Both concern difficulties obtaining support.     |
|                                                  |
| Main boundary dimension                          |
| [Service availability / access obstacle   v]    |
|                                                  |
| Semantic overlap score                          |
| [ 8 / 10 ]                                      |
|                                                  |
| Decision                                         |
| ( ) Keep separate  ( ) Refine boundaries        |
| ( ) Merge           ( ) Create hierarchy        |
|                                                  |
| Boundary explanation                             |
| [Access barriers concern obstacles to available  |
|  services; Service gaps concern missing or      |
|  inadequate services._________________________] |
|                                                  |
| [Back to functions]       [Save comparison]     |
+--------------------------------------------------+
```

The comparison screen should show both code definitions and enough quotation evidence to support the boundary explanation. **Save comparison** records the score and decision; it does not merge, rename, or restructure codes automatically. Approved adaptations follow [Section 4](#4-user-actions-and-database-adaptations).

---

### 3.5 Cross-Code Coding Consistency

This step identifies quotations that are conceptually very similar but have been assigned to different codes. Unlike the code-level comparison in Section 3.4, this analysis works at the quotation level and asks whether different codes are being applied inconsistently to similar meanings.

The functionality operates across the whole quotation-per-code dataset. It generates candidate quotation pairs or groups for researcher review; similarity is an alert, not proof that the coding is wrong.

#### 3.5.1 Purpose

The purpose is to detect whether two codes are being used inconsistently across the dataset, even when the underlying meaning of the quotations is highly similar. This helps researchers identify unclear boundaries, inconsistent coding, or code labels that are too similar.

The unit of review is a comparable quotation or quotation group together with its assigned code, not the code pair in isolation. The researcher must confirm whether the distinction is meaningful before any coding change is proposed.

#### 3.5.2 Questions to ask

- Do two quotations express the same underlying concept but receive different codes?
- Are the codes meaningfully different, or are the distinctions not consistently supported by the data?
- Are the boundaries between the codes clear enough to be applied consistently?
- Does the difference between the codes reflect a meaningful conceptual distinction, or is it simply a coding inconsistency?

#### 3.5.3 Example of a coding consistency alert

- "I couldn't afford the treatment." → `Financial barriers`
- "The treatment was simply too expensive." → `Access barriers`

Although the quotations are highly similar, they may have been assigned to different codes. In such a case, the system should flag the issue and ask whether the distinction is intentional and supported by the code boundaries.

#### 3.5.4 Suggested output

> **Potential cross-code inconsistency**  
> **Quotation 1:** "I couldn't afford the treatment." → `Financial barriers`  
> **Quotation 2:** "The treatment was simply too expensive." → `Access barriers`  
> These quotations express highly similar meanings but have different codes. Check whether this difference is intentional and supported by the code boundaries.

This does not require uncoded data because the relevant quotations already exist in the coded dataset. The goal is not to assume that one code is wrong, but to surface possible boundary problems for researcher review.

#### 3.5.5 Decision rules

- If the distinction is clearly justified by the code definitions, keep the codes separate.
- If the distinction is weak or inconsistent, revisit the code boundaries.
- If the meanings are effectively the same, consider merging or renaming the codes.
- If the quotations reflect two legitimate subtypes, clarify the distinction in the definitions and create subcodes if needed.

This function complements the code-level comparison by checking whether comparable meanings are being split across multiple codes.

#### Functionality-specific workflow

- **Scope:** Whole dataset.
- **User question:** Are similar meanings being coded inconsistently across the dataset?
- **Input and evidence:** The complete quotation-per-code dataset and comparable quotation-code assignments across all codes.
- **User actions:** Review flagged quotation pairs or groups, compare their assigned codes and boundaries, confirm or question the distinction, and choose a corrective action.
- **System output:** Consistency alert, evidence comparison, coding-drift summary, and recommendation.
- **Possible adaptation:** Preserve the distinction, clarify boundaries, normalize assignments, rename, merge, or investigate further. Any assignment change follows [Section 4](#4-user-actions-and-database-adaptations).

#### 3.5.6 Mockup: Cross-Code Coding Consistency review

```text
(5) Cross-Code Coding Consistency
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Whole dataset                             |
| Function: Cross-Code Coding Consistency         |
|                                                  |
| Dataset coverage                                 |
| All codes and quotation assignments              |
| 73 comparable quotation assignments              |
|                                                  |
| Candidate consistency alerts                     |
| [1 of 12]  Similarity: High                     |
|                                                  |
| Quotation A                                      |
| "I couldn't afford the treatment."              |
| Assigned code: Financial barriers                |
|                                                  |
| Quotation B                                      |
| "The treatment was simply too expensive."       |
| Assigned code: Access barriers                  |
|                                                  |
| Researcher assessment                            |
| ( ) Meaningfully different                       |
| ( ) Possible inconsistent coding                 |
| ( ) Legitimate subtype                           |
| ( ) Insufficient evidence                        |
|                                                  |
| Suggested next action                            |
| [Keep distinction] [Clarify boundary]            |
| [Normalize coding] [Review later]                |
|                                                  |
| [Previous] [Next alert]       [Save assessment] |
+--------------------------------------------------+
```

The screen should show why the pair was flagged and allow the researcher to inspect the full quotations and code definitions before deciding. **Normalize coding** should create a proposal for review, not immediately change quotation-code assignments. Approved changes follow [Section 4](#4-user-actions-and-database-adaptations).

---

### 3.6 Code Hierarchy Suggestions

Using the quotations and definitions, the system can suggest possible hierarchical relationships between codes. This is not a final structural decision; it is an analytical suggestion to help the researcher consider how the codebook might be organized.

This functionality operates on a selected group of codes and concerns structural organization. It should not be used to represent causal or temporal relationships, which belong to [Relational and Process Analysis](#38-relational-and-process-analysis), or to create a broader analytical pattern, which belongs to [Category / Pattern Code Generation](#37-category-pattern-code-generation).

#### 3.6.1 Purpose

The purpose is to identify whether selected codes may form:

- **parent–child** relationships,
- **sibling** relationships,
- **broader–narrower** relationships,
- **component-of** relationships,
- or **no hierarchical relationship**.

The system should only propose these relationships because hierarchical organization is an analytical decision that should remain open to researcher interpretation.

#### 3.6.2 Criteria for proposing a hierarchy

A hierarchy should only be suggested when:

- the codes share a common conceptual core,
- the quotations support a meaningful relationship,
- the boundaries are sufficiently clear to justify grouping,
- the distinction remains analytical rather than purely semantic.

The system should also check that the proposed parent code is sufficiently broad, the proposed child codes are more specific, and the suggested siblings are comparable at the same analytical level. A shared topic alone is not enough to justify a hierarchy.

A hierarchy should never be imposed automatically. It should be presented as a possible interpretation rather than a definitive classification.

#### 3.6.3 Example

```text
Barriers
├── Financial barriers
├── Administrative barriers
└── Transport barriers
```

This structure may be proposed when quotations and definitions suggest that these codes reflect multiple manifestations of the same broader phenomenon.

#### 3.6.4 Relationship types

- **Parent–child:** one code is a broader category and another is a more specific subtype.
- **Sibling:** multiple codes share the same parent but are distinct categories.
- **Broader–narrower:** one code encompasses the meaning of another, but the relationship is not necessarily fully hierarchical.
- **Component-of:** one code represents a part of a broader phenomenon or process.
- **No hierarchical relationship:** the codes are distinct and should remain separate.

#### 3.6.5 Suggested output

> **Suggested hierarchy**  
> **Broader code:** Barriers  
> **Possible subcodes:** Financial barriers; Administrative barriers; Transport barriers  
> **Reason:** These codes share a common theme of obstacles, but differ in their specific manifestation.

#### 3.6.6 Decision rules

- If the codes share a common conceptual core and differ mainly by manifestation, a hierarchy may be appropriate.
- If the codes are conceptually distinct or boundary conditions remain ambiguous, do not suggest a hierarchy.
- If the relationship is unclear, leave the codes as separate categories instead of forcing a structure.

This function complements the comparison and boundary analysis by helping the researcher think about how the codebook might be organized without committing to a final hierarchy too early.

#### Functionality-specific workflow

- **Scope:** Selected group of codes.
- **User question:** Should selected codes be organized as parent, child, sibling, or unrelated categories?
- **Input and evidence:** One code or a group of related codes, their definitions, quotations, and existing code structure.
- **User actions:** Select related codes, compare their specificity and conceptual core, review the proposed relationship, edit it if needed, and approve, reject, or defer it.
- **System output:** Hierarchy proposal, relationship type, structural explanation, and review status.
- **Possible adaptation:** Create, revise, or remove parent-child or sibling relationships after explicit approval. See [Section 4](#4-user-actions-and-database-adaptations).

#### 3.6.7 Mockup: Code Hierarchy Suggestions

```text
(5) Review code hierarchy suggestion
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Selected group of codes                  |
| Function: Code Hierarchy Suggestions            |
|                                                  |
| Selected codes                                   |
| [Financial barriers] [Administrative barriers]  |
| [Transport barriers]                            |
|                                                  |
| Proposed hierarchy                              |
| Barriers                                        |
|   +-- Financial barriers                        |
|   +-- Administrative barriers                   |
|   +-- Transport barriers                        |
|                                                  |
| Evidence and rationale                          |
| Shared core: Obstacles to obtaining services     |
| Specificity: Child codes describe mechanisms    |
| Evidence: 42 quotations across the selected set |
|                                                  |
| Relationship type                               |
| [Parent-child / sibling structure        v]     |
|                                                  |
| Researcher assessment                           |
| ( ) Accept  ( ) Edit proposal  ( ) Reject       |
| ( ) Defer for discussion                        |
|                                                  |
| [Back to functions]       [Save assessment]     |
+--------------------------------------------------+
```

The researcher should be able to edit the proposed parent, child, or sibling relationships before saving the assessment. **Save assessment** records the proposal and decision; it does not change the code structure automatically. Approved structural changes follow [Section 4](#4-user-actions-and-database-adaptations).

---

### 3.7 Category / Pattern Code Generation

This step identifies broader analytical patterns that emerge when several related codes are considered together. It is conceptually distinct from the hierarchy function in Section 3.6. A hierarchy asks how codes are structurally related; a pattern code asks what higher-order meaning emerges when conceptually related codes are interpreted as a collective pattern.

This functionality operates on a selected group of codes and their associated quotations. It proposes a higher-order analytical category; it does not automatically create a parent code, establish a causal relationship, or replace the contributing codes.

#### 3.7.1 Purpose

The purpose of this step is to identify groups of existing codes that together express a broader analytical pattern, theme, process, or explanatory assertion. This is similar to second-cycle methods such as Focused Coding or Pattern Coding, where the goal is to reduce a large number of first-cycle codes into a smaller, more theoretically meaningful set.

This function helps the researcher answer questions such as:

- Which codes appear to represent the same overarching phenomenon?
- What broader pattern do these codes jointly express?
- What should this pattern be called?
- What does the category capture that the individual codes do not?
- Does the pattern primarily describe, explain, organize, or process the phenomenon?

The proposed pattern should add an analytical insight that is not already captured by the individual codes. A group of codes that merely shares a topic is not sufficient; the codes should support a meaningful collective interpretation.

#### 3.7.2 Questions to ask for each candidate pattern

For each group of conceptually related codes, ask:

- What shared conceptual pattern connects these codes?
- What broader category or pattern code would best describe them?
- Which codes support the pattern and which do not?
- What new analytical insight emerges only when these codes are viewed together?
- Does the proposed pattern reflect a descriptive, thematic, processual, explanatory, or relational idea?
- Is the category strong enough to justify a name, or is the grouping still too tentative?

#### 3.7.3 Pattern types

A proposed category or pattern may be primarily:

- **Descriptive:** it names the phenomenon as it appears in the data.
- **Thematic:** it identifies a broader subject or topic shared by several codes.
- **Processual:** it captures a sequence, trajectory, or temporal progression.
- **Explanatory:** it names the mechanism or causal logic behind the data.
- **Relational:** it describes how different elements are connected, compared, or positioned in relation to one another.

The system should not force all categories into one type; instead, the researcher should evaluate which dimension best characterizes the emerging pattern.

#### 3.7.4 Decision rules

- If a group of codes shares a common conceptual pattern, propose a broader category.
- If the group seems only structurally related but not analytically meaningful, do not suggest a pattern code.
- If the grouping is meaningful but the pattern is still unclear, present it as a tentative category for review rather than a final code.
- If the category captures a new level of interpretation beyond the individual codes, keep it as a candidate pattern code.
- If the codes are too different to justify a single category, keep them separate and note the reason.

Keep the proposed pattern provisional until the researcher has reviewed the supporting quotations, category profile, and distinction between the pattern and its contributing codes.

#### 3.7.5 Category Profiling

Once a pattern code has been proposed, the next analytical step is to profile the category by identifying its internal properties and the dimensions along which the phenomenon varies. This deepens understanding of what forms the category takes and helps clarify its scope and boundaries.

Category Profiling asks: **What forms does this phenomenon take, and along what dimensions does it vary?**

The goal is to map the conceptual terrain of the category by identifying:

- **Properties:** characteristic attributes or features of the phenomenon.
- **Dimensions:** ranges or variations within each property.

This analysis answers questions such as:

- What are the key attributes or aspects that define this category?
- What variations or subtypes exist within the category?
- How do quotations and codes distribute across these dimensions?
- Does the category need to be refined, split, or expanded based on these patterns?

Distinction from boundary dimension analysis: This differs from the boundary-dimension analysis in Section 3.4, which compares **two codes** and asks what dimension separates them (e.g., actor vs. object, cause vs. consequence). Category Profiling works **within a single category** and asks: along what dimensions does this one phenomenon vary?

Suggested process for each proposed pattern code:

1. Review the included codes and their quotations.
2. Identify key properties or dimensions that distinguish instances within the category.
3. For each property, map the observed range or spectrum of variation.
4. Ask whether the category is homogeneous or whether the dimensions reveal important subtypes or variations.
5. Document whether the category should remain unified or be revised.

Example: Category Profiling table

**Category: Access barriers**

| Property | Observed dimensions | Interpretation |
|---|---|---|
| Type of barrier | Financial ↔ Administrative ↔ Physical | Different mechanisms create access difficulty |
| Severity | Minor inconvenience ↔ Complete prevention | Range from manageable to insurmountable obstacles |
| Duration | Temporary ↔ Persistent | Some barriers are one-time events; others are structural |
| Location | Individual ↔ Organizational ↔ System-level | Barriers operate at different levels of the system |

This table shows how instances of the category vary, making the category's scope and internal structure explicit.

Decision rules for profiling:

- If a proposed pattern code shows variation across only one dimension, the category may still be coherent; document that dimension clearly.
- If the category shows variation across multiple independent dimensions, ask whether it captures a unitary phenomenon or whether it should be split.
- If certain dimensions are poorly represented (few or no quotations), note whether this reflects the data or gaps in the coding.
- If the profiling reveals that the category is actually heterogeneous, consider whether it should be split into separate pattern codes or remain as one broader category with documented internal variation.
- Use the profile to clarify the category definition and boundaries for later coding and review.

#### 3.7.6 Consolidated output format: Analytical memo

Once the pattern code has been identified and profiled, document the complete analysis in a consolidated analytical memo that brings together all the information from pattern identification and category profiling. This memo serves as the definitive record of the analytical work and provides all essential information for researcher review.

```text
ANALYTICAL MEMO: Pattern Code Generation

Pattern code: DIFFICULTIES ACCESSING CARE
Date: [Date]
Analyst: [Name]
Status: Under review

─────────────────────────────────────────────

CODES INCLUDED IN THIS PATTERN

- Financial barriers
- Transportation barriers
- Administrative barriers
- Waiting time

─────────────────────────────────────────────

SHARED CONCEPTUAL PATTERN

Each code represents a distinct mechanism through which participants encounter
difficulty obtaining otherwise relevant services. The unifying insight is that
these are not isolated problems but expressions of a systemic challenge:
accessing care requires navigating multiple overlapping obstacles.

─────────────────────────────────────────────

ANALYTICAL CONTRIBUTION

What this pattern code adds beyond individual codes:

The pattern captures the broader lived experience of access difficulty as a
structural constraint on help-seeking, rather than treating barriers as separate
problems. It emphasizes that barriers operate systemically and cumulatively,
which has implications for intervention and policy.

─────────────────────────────────────────────

CATEGORY PROFILING: INTERNAL DIMENSIONS

| Property | Observed dimensions | Interpretation |
|---|---|---|
| Type of barrier | Financial ↔ Administrative ↔ Physical | Different mechanisms create access difficulty |
| Severity | Minor inconvenience ↔ Complete prevention | Range from manageable to insurmountable obstacles |
| Duration | Temporary ↔ Persistent | Some barriers are one-time events; others are structural |
| Location | Individual ↔ Organizational ↔ System-level | Barriers operate at different levels of the system |

Coherence assessment: The category shows coherence across all dimensions.
The codes represent related but distinct manifestations of a unitary phenomenon.
No evidence suggests the category should be split or revised.

─────────────────────────────────────────────

SUPPORTING EVIDENCE

Representative quotations:
- "I could not afford the treatment." (Financial barrier)
- "The clinic was too far away to reach by public transport." (Transportation barrier)
- "I had to wait months before anyone could help me." (Waiting time)

Pattern type: Descriptive / Explanatory

Evidence strength: Strong
(Multiple quotations across codes support the pattern; the codes reflect
distinct but conceptually related manifestations of the same phenomenon.)

```

This memo consolidates pattern identification and category profiling into a record suitable for team discussion, codebook documentation, or methodological transparency.

#### Functionality-specific workflow

- **Scope:** Selected group of codes, with evidence from their associated quotations.
- **User question:** Do several related codes express a broader analytical pattern or category?
- **Input and evidence:** A selected group of codes, their quotations, definitions, recurring patterns, and category profile.
- **User actions:** Select the code group, identify the shared pattern, assess whether it adds analytical meaning, draft a category name and definition, profile its dimensions, and approve or reject the proposal.
- **System output:** Candidate pattern code, category profile, supporting quotations, analytical memo, and review status.
- **Possible adaptation:** Create or revise a category/pattern code and link its contributing codes after researcher approval. See [Section 4](#4-user-actions-and-database-adaptations).

#### 3.7.7 Mockup: Category / Pattern Code Generation

```text
(5) Generate a category or pattern code
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Selected group of codes                  |
| Function: Category / Pattern Code Generation    |
|                                                  |
| Contributing codes                              |
| [Financial barriers] [Transport barriers]       |
| [Administrative barriers] [Waiting time]         |
|                                                  |
| Shared evidence                                 |
| 4 codes | 63 quotations | 3 recurring mechanisms |
|                                                  |
| Candidate pattern                               |
| Name: [Difficulties accessing care___________]  |
| Type: [Descriptive / Explanatory          v]    |
|                                                  |
| Shared conceptual pattern                       |
| [These codes describe distinct obstacles that   |
|  jointly shape access to care._______________]  |
|                                                  |
| Category profile                                |
| Property        Dimensions                      |
| Barrier type    Financial / administrative       |
| Severity        Manageable / preventing          |
|                                                  |
| Researcher assessment                           |
| ( ) Approve  ( ) Edit  ( ) Reject  ( ) Defer    |
|                                                  |
| [Back to functions]       [Save pattern review] |
+--------------------------------------------------+
```

The screen should show which codes support the candidate pattern and what new interpretation the pattern adds. **Save pattern review** records a candidate category and profile; it does not automatically create a new code or alter the contributing codes. Approved adaptations follow [Section 4](#4-user-actions-and-database-adaptations).

---

### 3.8 Relational and Process Analysis

This step identifies possible relationships between codes and pattern codes, asking not only how they are similar or organized, but **how they are connected**: through causation, consequence, conditions, contexts, interactions, or sequences. Unlike comparison (Section 3.4) or hierarchy (Section 3.7), this analysis focuses on the logical, temporal, and causal links that may exist among phenomena in the dataset.

This functionality operates on selected codes or pattern codes and uses quotation-level and broader dataset evidence. It proposes relationships for researcher review; it must not turn co-occurrence or model-generated interpretation into an automatic causal claim.

#### 3.8.1 Purpose

The purpose is to identify and propose possible relationships such as:

- **A causes/contributes to B:** one code may precipitate or lead to another.
- **A occurs under condition B:** the phenomenon in A happens only or primarily when condition B is present.
- **A leads to consequence B:** the outcome or result of A is reflected in B.
- **A enables/inhibits B:** one code may facilitate or prevent the other.
- **A precedes/follows B:** temporal or sequential relationship.
- **A is a strategy for dealing with B:** A may represent a coping mechanism, adaptation, or response to B.
- **A occurs in context B:** the phenomenon in A is situated within or occurs against the backdrop of B.
- **A and B interact:** the two phenomena influence or affect each other reciprocally.
- **Relationship unclear:** the relationship cannot be determined from available evidence.

This analysis helps move the codebook from a static categorical structure to a dynamic understanding of how phenomena relate to one another.

#### 3.8.2 Distinction from comparison and hierarchy

- **Comparison (Section 3.4)** asks: Are these codes similar or different?
- **Hierarchy (Section 3.7)** asks: How are these codes structurally organized?
- **Relational Analysis (Section 3.8)** asks: How do these phenomena connect, interact, and influence each other?

#### 3.8.3 Evidence sources

A proposed relationship should be grounded in at least one of the following:

**Quotation-level evidence:**
- The quotation explicitly describes a relationship (e.g., "Because of the financial barriers, I gave up trying to access care").
- A single quotation is assigned to both codes, suggesting co-occurrence of the phenomena.

**Pattern-level evidence:**
- Multiple quotations across the two codes suggest a consistent relationship.
- The definitions or examples in the codes hint at a possible connection.

**Co-occurrence analysis:**
- The system analyzes which codes are frequently assigned to the same quotation (using the quotation_id field in quotation_per_code.csv).
- Co-occurrence alone does not prove a relationship, but it provides a signal that the two codes may be connected and warrant investigation.

The system should distinguish three evidence levels: **textual evidence** stated or strongly implied in quotations, **co-occurrence evidence** showing that codes appear together, and **analytical interpretation** concerning direction, mechanism, or causality. These levels should not be presented as equivalent.

#### 3.8.4 Evidence requirements for proposed relationships

Every proposed relationship should identify the supporting quotations or code assignments, the evidence type, the proposed direction, and the distinction between what is observed and what is inferred. If the evidence is insufficient, the system should present the relationship as a tentative lead rather than a conclusion.

#### 3.8.5 Suggested output format

```text
Possible relationship

Code/Pattern A: Administrative barriers
Code/Pattern B: Disengagement from services

Relationship type: CONTRIBUTES TO

Textual evidence:
Several quotations describe repeated administrative difficulties followed by
participants abandoning attempts to obtain support:
- "After calling three times and getting no answers, I just gave up."
- "The paperwork was so complicated that I stopped trying."

Co-occurrence evidence:
Administrative barriers and disengagement codes appear together in 6 quotations
(co-occurrence rate: 15% of all disengagement quotations).

Interpretation:
The coded material suggests that administrative barriers may contribute to
service disengagement, likely through a process of repeated frustration and
loss of hope.

Confidence: Moderate
Evidence strength: Multiple quotations support the interpretation.
Status: Researcher review required.
```

#### 3.8.6 Co-occurrence analysis as supplementary evidence

The system can analyze code co-occurrence patterns by examining which codes are assigned to the same quotation in the quotation_per_code.csv table.

**Interpretation guidelines:**

- High co-occurrence (e.g., > 20% of quotations) suggests the codes may describe related or simultaneous phenomena, but does not establish causation or direction.
- Low co-occurrence does not rule out a relationship; some relationships are sequential rather than simultaneous.
- Repeated co-occurrence in combination with explicit textual evidence strengthens the case for a proposed relationship.
- Do not propose a relationship based on co-occurrence alone; co-occurrence is a signal to investigate further, not evidence itself.

**Example:** If "financial barriers" and "treatment delay" appear together in 18 out of 45 quotations, the system might note: "These codes co-occur in 40% of cases. Review quotations to determine whether financial barriers cause delays, whether delays worsen financial difficulty, or whether both respond to a third factor."

#### 3.8.7 Process and temporal analysis

For phenomena that unfold over time, ask:

- Does A typically occur before B?
- Does B follow A as a consequence or response?
- Is the sequence necessary (A must occur before B) or typical (A often precedes B)?
- Are there alternative sequences or feedback loops?

**Example output:**

```text
Temporal sequence

Sequence: Financial difficulty → Treatment delay → Service disengagement

Evidence:
Quotations describe a progression: participants first encounter cost barriers,
then wait or postpone treatment, then eventually stop seeking services.

Alternative pathways:
Some quotations suggest that service disengagement can occur without financial
barriers, indicating multiple paths to the same outcome.

Status: Provisional; researcher to confirm whether the sequence reflects
the data or an analytical interpretation.
```

#### 3.8.8 Suggested output table for multiple relationships

| Code A | Code B | Relationship | Evidence type | Confidence | Status |
|---|---|---|---|---|---|
| Financial barriers | Treatment delay | CONTRIBUTES TO | Quotation-level explicit | Moderate | Review required |
| Treatment delay | Service disengagement | LEADS TO | Multiple quotations + sequence | High | Review required |
| Administrative barriers | Financial difficulty | INTERACTS | Co-occurrence + unclear direction | Low | Requires investigation |
| Family support | Treatment adherence | ENABLES | Pattern-level evidence | Moderate | Review required |
| Stigma | Help-seeking behavior | INHIBITS | Quotation-level explicit | High | Review required |

#### 3.8.9 Decision rules

- Propose a relationship only when the supporting evidence is identified and linked to quotations or code assignments.
- Treat co-occurrence as a signal for investigation, never as proof of causation or direction.
- If direction is uncertain, present the plausible alternatives and mark the relationship as provisional.
- Distinguish observed sequence from inferred causality.
- If no relationship is sufficiently supported, record **No clear relationship** rather than forcing a connection.
- The researcher must approve, qualify, reject, or defer every proposed relationship.

#### 3.8.10 Consolidated output format: Analytical memo

For each proposed relationship, document the complete analysis in a consolidated analytical memo that consolidates evidence from multiple sources (textual, co-occurrence, temporal) and provides all essential information for researcher review and decision-making.

```text
ANALYTICAL MEMO: Relational and Process Analysis

Relationship ID: [ID number or date]
Date: [Date]
Analyst: [Name]
Status: Under review

─────────────────────────────────────────────

CODES/PATTERNS BEING COMPARED

Code A: Administrative barriers
Code B: Disengagement from services

─────────────────────────────────────────────

PROPOSED RELATIONSHIP

Relationship type: CONTRIBUTES TO

Direction: Administrative barriers → Disengagement from services

Theoretical basis: Repeated institutional barriers may lead to loss of hope
and abandonment of help-seeking efforts.

─────────────────────────────────────────────

TEXTUAL EVIDENCE

Representative quotations supporting this relationship:
- "After calling three times and getting no answers, I just gave up."
- "The paperwork was so complicated that I stopped trying."
- "When nothing works, you eventually stop trying to access services."

Evidence type: Quotation-level explicit
Number of supporting quotations: 3
Quality of evidence: Multiple quotations describe the progression from barriers
to disengagement.

─────────────────────────────────────────────

CO-OCCURRENCE ANALYSIS

Code co-occurrence in dataset:
Administrative barriers and disengagement codes appear together in 6 quotations.
Co-occurrence rate: 15% of all disengagement quotations

Interpretation: Moderate co-occurrence suggests potential link but does not
confirm causation. Co-occurrence is consistent with but does not prove the
proposed temporal/causal relationship.

─────────────────────────────────────────────

TEMPORAL OR PROCESS EVIDENCE

Sequence observed in quotations:
Administrative difficulty → Repeated attempts → Frustration → Abandonment

Directionality: Unidirectional (A → B supported; B → A not evident)
Alternative pathways: Disengagement can occur without administrative barriers,
suggesting multiple routes to the same outcome.

─────────────────────────────────────────────

CONFIDENCE ASSESSMENT

Overall confidence: Moderate

Reasoning:
- Textual evidence is explicit and consistent (3 supporting quotations)
- Co-occurrence rate is moderate (15%)
- Temporal sequence is observed but not causality proven
- Alternative explanations possible but less supported by data

Confidence level: MODERATE

This memo consolidates all evidence sources (textual, co-occurrence, temporal) and provides a complete record suitable for team discussion and codebook refinement decisions. For multiple relationships, generate one memo per pair or create a summary table (see 3.8.8) to track relationships across the codebook.

#### Functionality-specific workflow

- **Scope:** Selected codes or pattern codes, with quotation-level and dataset-level evidence.
- **User question:** How are selected codes connected through sequence, context, causation, consequence, or interaction?
- **Input and evidence:** Selected codes or pattern codes, quotations, code co-occurrence, temporal or process evidence, and relevant context.
- **User actions:** Review the evidence, identify possible relationship types and direction, distinguish textual evidence from interpretation, assess confidence, and approve, qualify, reject, or defer the relationship.
- **System output:** Relationship summary or process map, supporting quotations, co-occurrence information, confidence assessment, and analytical memo.
- **Possible adaptation:** Save an approved relationship with its direction, evidence, confidence, and status. The system must not treat co-occurrence alone as proof of causation.

#### 3.8.11 Mockup: Relational and Process Analysis

```text
(5) Review a proposed relationship
+--------------------------------------------------+
| Project: Access Study             Step 5 of 7    |
+--------------------------------------------------+
| Scope: Selected codes or patterns               |
| Function: Relational and Process Analysis       |
|                                                  |
| Code / pattern A                                |
| [Administrative barriers                 v]     |
|                                                  |
| Code / pattern B                                |
| [Service disengagement                  v]      |
|                                                  |
| Proposed relationship                           |
| Type: [Contributes to                      v]   |
| Direction: Administrative barriers ->           |
|           Service disengagement                  |
|                                                  |
| Textual evidence                                |
| "The paperwork was so complicated that I       |
|  stopped trying."                               |
|                                                  |
| Co-occurrence evidence                          |
| 6 shared quotations | 15% of disengagement set  |
| Note: Co-occurrence does not establish causation |
|                                                  |
| Interpretation                                  |
| Repeated administrative barriers may contribute |
| to disengagement through frustration.            |
|                                                  |
| Confidence: [Moderate                     v]    |
| Status: Provisional - review required            |
|                                                  |
| [Approve] [Qualify] [Reject] [Defer]             |
| [Back to functions]       [Save assessment]     |
+--------------------------------------------------+
```

The screen should keep observed evidence, co-occurrence, and interpretation visibly separate. **Approve** saves the reviewed relationship and makes it eligible for any supported database or memo adaptation; it does not imply that the data proves causation.

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

### 4.7 ATLAS.ti Integration and Write-back

Direct integration with ATLAS.ti concerns only approved database adaptations. Analytical findings, proposed definitions, recoding suggestions, hierarchy proposals, and relationships must remain in Althea's review record until the researcher explicitly confirms a change.

#### 4.7.1 Supported write-back targets

Depending on the approved user action and the available ATLAS.ti integration, Althea may prepare changes to:

- a code label,
- a code comment containing an approved definition,
- a code's parent-child or group relationship,
- a quotation-code assignment,
- a new, merged, split, or pattern code,
- an approved analytical relationship or memo, where the ATLAS.ti project structure supports it.

The exact target and operation should be shown to the researcher before anything is written back. A review record or internal Althea adaptation may be created even when a particular ATLAS.ti target is not supported.

#### 4.7.2 Write-back process

1. The system creates a proposed ATLAS.ti change from an approved user action.
2. The researcher reviews the target object, proposed value, affected quotations or codes, and supporting evidence.
3. The system shows a preview of the change, including the previous value where applicable.
4. The researcher explicitly confirms or cancels the write-back.
5. If confirmed, the system applies the change or generates an export/instruction for manual application when direct integration is unavailable.
6. The system verifies the result when possible and records the implementation status.
7. The audit trail stores the ATLAS.ti project or export reference, change details, researcher, timestamp, and any response or error.

#### 4.7.3 Approved code-definition write-back

For an approved code definition, the system may prepare the following comment for the ATLAS.ti code:

```text
[Core Concept]

[Boundary / Inclusion-Exclusion Rule]
```

Example:

```text
The code refers to practical barriers that limit access to support or services.

Apply this code when participants describe obstacles such as cost, waiting time, transport, or administrative difficulty; do not use it for general dissatisfaction without a concrete barrier.
```

The definition is written to the ATLAS.ti comment field only after the researcher has approved that specific wording. Representative quotations should normally remain in a separate codebook document, memo, or Althea review record because the comment field may have limited space.

#### 4.7.4 Write-back safeguards

- **Explicit confirmation:** no change is written to ATLAS.ti automatically.
- **Target clarity:** the researcher sees exactly which code, quotation assignment, relationship, or comment will change.
- **Previous-value preservation:** the previous value is retained in Althea's version history before write-back.
- **Raw-data preservation:** the original ATLAS.ti export is never overwritten.
- **Partial approval:** one proposed change can be confirmed without confirming other changes.
- **Failure handling:** if write-back fails or cannot be performed, the approved adaptation remains recorded in Althea with a pending or failed status and an explanation.
- **Manual fallback:** when direct integration is unavailable, Althea provides a structured export or step-by-step instruction for applying the approved change manually.

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
1 Import -> 2 Prepare -> 3 Scope -> 4 Analyse -> 5 Review -> 6 Decide -> 7 Record
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

**Mockup of screens:**

```text
(1) Project start and data import
+--------------------------------------------------+
| ALTHEA                                  New project |
+--------------------------------------------------+
| Start a new review                               |
|                                                  |
| [Project name________________________]            |
|                                                  |
| Quotation Manager                                |
| [ Upload file ]   No file selected               |
|                                                  |
| Code Manager                                     |
| [ Upload file ]   No file selected               |
|                                                  |
|              [Create project - disabled]        |
+--------------------------------------------------+
```

After each file is uploaded, its validation status replaces **No file selected**. The user can then inspect successful uploads, missing-column warnings, or invalid-file errors before continuing.

#### Step 2: Prepare the quotation-per-code data

The system creates the normalized quotation-per-code overview described in [Section 2: Data Preparation](#2-data-preparation). The user can inspect, search, filter, and sort the prepared data by code, source, quotation ID, reviewer status, or coherence level.

**User intent:** Work with a consistent review unit in which every code–quotation relationship is visible.

**Expected feedback:**

- each valid quotation-code relationship is represented,
- multi-code quotations are expanded,
- duplicate and invalid entries are flagged,
- the original imported data remains preserved.

**Mockup of screens:**

```text
(2) Import validation and data preparation
+--------------------------------------------------+
| Project: Access Study             Step 2 of 7    |
+--------------------------------------------------+
| Import summary                                   |
|                                                  |
| Quotations                         1,248         |
| Codes                                  86        |
| Multi-code quotations                  312       |
| Validation issues                         7      |
|                                                  |
| [View warnings]   [Preview data]                |
|                                                  |
| Data preparation                                |
| Code delimiter detected: comma                  |
| Output: quotation_per_code.csv                  |
|                                                  |
| [Prepare data]                                  |
+--------------------------------------------------+
```

#### Step 3: Select the analysis scope

Once preparation is complete, the user first selects the level at which the analysis should operate. The scope determines what the user selects next and which functionalities are available.

**Mockup of screen:**

```text
(3) Select the analysis scope
+--------------------------------------------------+
| Project: Access Study             Step 3 of 7    |
+--------------------------------------------------+
| Review workspace                                 |
|                                                  |
| What would you like to examine?                 |
|                                                  |
| ( ) Single code                                 |
|     Review one code and all its quotations       |
|                                                  |
| ( ) Selected pair or group                       |
|     Compare or organize several related codes    |
|                                                  |
| ( ) Whole dataset                                |
|     Find patterns across all code uses           |
|                                                  |
| [Back to preparation] [Continue]                 |
+--------------------------------------------------+
```

The user can return to data preparation without losing the prepared dataset or existing review decisions.

#### Step 4: Choose a functional review path

After selecting the scope, the user chooses a compatible analytical function. The available modules are defined in [Section 3: Functionalities of the Tool](#3-functionalities-of-the-tool). The normalized data remains available in the selected module, so the user does not need to repeat the import or preparation steps.

**Mockup of screen:**

```text
(4) Choose a functional review path
+--------------------------------------------------+
| Project: Access Study             Step 4 of 7    |
+--------------------------------------------------+
| Review workspace                                 |
| Scope: Single code                               |
|                                                  |
| Selected code                                    |
| [Access barriers                         v]      |
| 42 quotations | No approved definition           |
|                                                  |
| Available review functions                      |
|                                                  |
| ( ) Internal Code Coherence                      |
|     Do these quotations form one conceptual group?|
|                                                  |
| ( ) Verifying Coding                             |
|     Do the quotations support the code label?    |
|                                                  |
| ( ) Creating Code Definitions                    |
|     What belongs inside this code?               |
|                                                  |
| [Change analysis scope]                          |
|                                                  |
| [Back]                  [Continue to review]     |
+--------------------------------------------------+
```

For the **Selected pair or group** scope, the user selects the codes individually from the available database codes. The interface should provide two code drop-down menus, one for each side of the comparison, rather than offering predefined pairs or groups:

```text
| Scope: Selected pair or group                    |
|                                                  |
| First code       [Access barriers             v] |
| Second code      [Practical support           v] |
|                                                  |
| Available review functions                      |
|                                                  |
| ( ) Comparing Code Structure                     |
|     How do these codes differ in meaning?       |
|                                                  |
| ( ) Hierarchy Review                             |
|     Should these codes be grouped or separated? |
|                                                  |
| ( ) Overlap Resolution                           |
|     Which quotations fit one code better?       |
```

Both menus use the current database code list and must contain distinct selections. If the user selects the same code in both menus, Althea should show an inline validation message such as **Choose two different codes to compare** and keep **Continue to review** disabled until the selections differ. The selected codes and their metadata should remain visible before the user chooses a review function.

Only functionalities compatible with the selected scope should be shown. For example, **Single code** displays Internal Code Coherence, Verifying Coding, and Creating Code Definitions. A selected pair or group displays comparison and hierarchy functions, while **Whole dataset** displays consistency, pattern, and relational functions. The whole-dataset scope does not offer a code-cluster selector.

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
