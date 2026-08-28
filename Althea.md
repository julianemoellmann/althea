# Instructions

## 1. Structure of the Data Input

The training data resembles two exported spreadsheets from an ATLAS.ti project.

### 1.1 Training Data - Quotation Manager

The **“Training data - Quotation Manager”** dataset contains the following fields:

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

### 1.2 Training Data - Code Manager

The **“Training data - Code Manager”** dataset contains the following fields:

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

#### 2.1.5 Examples (expected quotation_per_code.csv rows)

- `quotation_id`: `Doc12:3`, `text`: "People often describe feeling ignored by the system.", `code`: "feelings of exclusion", `source`: "Interview 12", `coder`: "Researcher A", `created`: "2025-01-14", `note`: "Quotation was discussed during coding workshop."
- `quotation_id`: `Doc16:9`, `text`: "Healthcare access was difficult and inconsistent.", `code`: "healthcare barriers", `source`: "Interview 16", `coder`: "Researcher B", `created`: "2025-01-16", `note`: "Initial open coding; may overlap with access issues."

#### 2.1.6 Practical tips and edge cases

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

---

### 3.2 Verifying Coding

This step evaluates whether the code label and the quotations assigned to it are actually aligned. The unit of analysis is not the whole dataset, but each distinct code as it appears in the `quotation_per_code.csv` table. For each code, the researcher reviews all quotations assigned to that `code` and asks whether the quotations provide sufficient evidence for the code name and for the conceptual meaning the code is intended to capture.

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

This helps the researcher evaluate both the internal coherence of the code and the quality of the coding process.

#### 3.2.3 Evaluation questions

For each code, ask:

- Do the quotations assigned to this `code` actually support the current code label?
- Which words, phrases, or meanings in the quotations justify the code?
- Are the quotations strongly, moderately, or weakly aligned with the code?
- Does the code cover more than one underlying concept?
- Is the code too broad, too narrow, or overlapping with another code?
- Is the code definition needed, or does the code already have a clear conceptual boundary?

The researcher should compare the code label against the actual content of the quotations and decide whether the label is a good fit, a partial fit, or a misfit.

#### 3.2.4 Quotation outlier detection

Within each code, identify quotations that are conceptually different from the majority of quotations assigned to that code. This is not the same as checking whether a quotation fits the code in general; it focuses on unusual cases within an otherwise similar group.

The purpose is to detect quotations that may:

- be miscoded,
- represent a legitimate borderline case,
- indicate a rare but valid subtype,
- reveal that the code definition is too narrow or too broad,
- suggest that the code should be split or redefined.

Questions to ask

- Does this quotation share the core meaning of the code?
- Is it conceptually close to the dominant pattern or does it express a different phenomenon?
- Is it an exception that should remain under the code?
- Would the quotation fit another code better?
- Does the quotation suggest that the code definition needs revision?

Example output

> **Potential outlier**  
> **Code:** Access barriers  
> **Quotation:** "The waiting time and bureaucracy made the service feel unusable."  
> Most quotations concern concrete obstacles to obtaining services. This quotation concerns dissatisfaction with service quality rather than access itself.  
> **Possible interpretations:** miscoding, boundary case, or definition expansion.

An outlier should not automatically be treated as an error. It may instead represent a rare instance, a boundary case, or evidence that the code is broader than currently defined.

#### 3.2.5 Validity rating

Assign one of the following ratings to the code:

- **[STRONG]:** The quotations clearly and directly support the code label and its intended meaning.
- **[MODERATE]:** The quotations mostly fit the code, but some interpretation is needed or the coding is slightly inconsistent.
- **[WEAK/MISALIGNED]:** The quotations do not meaningfully support the code, or they better fit another concept.

A code can be rated as **[WEAK/MISALIGNED]** even if it has many quotations, if the quotations are not conceptually coherent or if the label is not the best fit.

#### 3.2.6 Output of the review

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

#### 3.2.7 Review table template

| Code | Number of quotations | Rating | Evidence from quotations | Interpretation | Recommended action |
|---|---:|---|---|---|---|
| Example code | 18 | [STRONG] | Quotations clearly mention barriers to access and trust | Code is conceptually coherent | Keep as is |
| Example code 2 | 9 | [MODERATE] | Some quotations refer to trust, others to affordability | Code may be too broad | Refine definition or create sub-code |
| Example code 3 | 4 | [WEAK/MISALIGNED] | Quotations better fit resource constraints or implementation problems | Label does not match content | Rename or re-code |

This review can be conducted manually by the researcher or discussed in a team coding session. The output should provide transparent evidence for later code-definition work and code-comparison work.

---

### 3.3 Creating Code Definitions

A code definition is a brief, explicit statement that explains what the code means and when it should be used. The definition should be grounded in the quotations assigned to the code and should be precise enough to help researchers apply the code consistently across the dataset.

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

#### 3.3.8 Integration with ATLAS.ti

This integration should be treated as a **suggestion only**. The system may propose that a final code definition be saved as a **comment** attached to a code in ATLAS.ti, but it should never apply such a change automatically. Each code definition must receive **explicit researcher approval before implementation**.

This ensures that:

- the definition is only added when the researcher has reviewed and accepted it,
- the researcher retains authority over the final wording of each code,
- the definition is permanently associated with the code only when explicitly approved,
- all team members see the same definition when coding,
- the definition is preserved when the ATLAS.ti project is exported or shared,
- future reviewers can understand the code's intended meaning.

**Process:**

1. The system proposes a candidate definition for a specific code.
2. The researcher reviews the definition against the evidence and the code boundaries.
3. If the researcher approves, the definition may be saved as a code comment in ATLAS.ti.
4. If the researcher does not approve, the system should leave the code unchanged and keep the suggested definition in the review record only.
5. The researcher can approve the definition for one code without approving suggestions for other codes.
6. In the **Comments** field, paste the final approved definition using the structure:
   ```
   [Core Concept]
   
   [Boundary / Inclusion-Exclusion Rule]
   ```
7. Save the code.

**Example comment in ATLAS.ti:**

```
The code refers to practical barriers that limit access to support or services.

Apply this code when participants describe obstacles such as cost, waiting time, transport, or administrative difficulty; do not use it for general dissatisfaction without a concrete barrier.
```

**Note:**  
The representative quotations (prototypical, borderline, atypical) can be stored in a separate codebook document or memo rather than in the ATLAS.ti comment field, because the comment field typically has limited space. The core definition should only be saved as a code comment when the researcher has explicitly approved that specific definition.

---

### 3.4 Comparing Codes

This step compares codes that appear conceptually related in order to determine whether they are distinct, overlapping, or should be revised. The comparison should be conducted only after internal coherence has been assessed, a code has been verified, and its definition has been clarified, because the purpose is to refine the codebook rather than to guess at relationships.

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

---

### 3.5 Cross-Code Coding Consistency

This step identifies quotations that are conceptually very similar but have been assigned to different codes. Unlike the code-level comparison in Section 3.4, this analysis works at the quotation level and asks whether different codes are being applied inconsistently to similar meanings.

#### 3.5.1 Purpose

The purpose is to detect whether two codes are being used inconsistently across the dataset, even when the underlying meaning of the quotations is highly similar. This helps researchers identify unclear boundaries, inconsistent coding, or code labels that are too similar.

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

---

### 3.6 Code Hierarchy Suggestions

Using the quotations and definitions, the system can suggest possible hierarchical relationships between codes. This is not a final structural decision; it is an analytical suggestion to help the researcher consider how the codebook might be organized.

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

---

### 3.7 Category / Pattern Code Generation

This step identifies broader analytical patterns that emerge when several related codes are considered together. It is conceptually distinct from the hierarchy function in Section 3.6. A hierarchy asks how codes are structurally related; a pattern code asks what higher-order meaning emerges when conceptually related codes are interpreted as a collective pattern.

#### 3.7.1 Purpose

The purpose of this step is to identify groups of existing codes that together express a broader analytical pattern, theme, process, or explanatory assertion. This is similar to second-cycle methods such as Focused Coding or Pattern Coding, where the goal is to reduce a large number of first-cycle codes into a smaller, more theoretically meaningful set.

This function helps the researcher answer questions such as:

- Which codes appear to represent the same overarching phenomenon?
- What broader pattern do these codes jointly express?
- What should this pattern be called?
- What does the category capture that the individual codes do not?
- Does the pattern primarily describe, explain, organize, or process the phenomenon?

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

This memo consolidates all analytical work on the pattern code—from identification through profiling—and provides a complete record suitable for team discussion, codebook documentation, or methodological transparency.

#### 3.6.2 Criteria for proposing a hierarchy

A hierarchy should only be suggested when:

- the codes share a common conceptual core,
- the quotations support a meaningful relationship,
- the boundaries are sufficiently clear to justify grouping,
- the distinction remains analytical rather than purely semantic.

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

#### 3.7.1 Purpose

The purpose is to identify whether selected codes may form:

- **parent–child** relationships,
- **sibling** relationships,
- **broader–narrower** relationships,
- **component-of** relationships,
- or **no hierarchical relationship**.

The system should only propose these relationships because hierarchical organization is an analytical decision that should remain open to researcher interpretation.

#### 3.7.2 Criteria for proposing a hierarchy

A hierarchy should only be suggested when:

- the codes share a common conceptual core,
- the quotations support a meaningful relationship,
- the boundaries are sufficiently clear to justify grouping,
- the distinction remains analytical rather than purely semantic.

A hierarchy should never be imposed automatically. It should be presented as a possible interpretation rather than a definitive classification.

#### 3.7.3 Example

```text
Barriers
├── Financial barriers
├── Administrative barriers
└── Transport barriers
```

This structure may be proposed when quotations and definitions suggest that these codes reflect multiple manifestations of the same broader phenomenon.

#### 3.7.4 Relationship types

- **Parent–child:** one code is a broader category and another is a more specific subtype.
- **Sibling:** multiple codes share the same parent but are distinct categories.
- **Broader–narrower:** one code encompasses the meaning of another, but the relationship is not necessarily fully hierarchical.
- **Component-of:** one code represents a part of a broader phenomenon or process.
- **No hierarchical relationship:** the codes are distinct and should remain separate.

#### 3.7.5 Suggested output

> **Suggested hierarchy**  
> **Broader code:** Barriers  
> **Possible subcodes:** Financial barriers; Administrative barriers; Transport barriers  
> **Reason:** These codes share a common theme of obstacles, but differ in their specific manifestation.

#### 3.7.6 Decision rules

- If the codes share a common conceptual core and differ mainly by manifestation, a hierarchy may be appropriate.
- If the codes are conceptually distinct or boundary conditions remain ambiguous, do not suggest a hierarchy.
- If the relationship is unclear, leave the codes as separate categories instead of forcing a structure.

This function complements the comparison and boundary analysis by helping the researcher think about how the codebook might be organized without committing to a final hierarchy too early.

---

### 3.8 Relational and Process Analysis

This step identifies possible relationships between codes and pattern codes, asking not only how they are similar or organized, but **how they are connected**: through causation, consequence, conditions, contexts, interactions, or sequences. Unlike comparison (Section 3.4) or hierarchy (Section 3.7), this analysis focuses on the logical, temporal, and causal links that may exist among phenomena in the dataset.

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

#### 3.8.4 Decision rules for proposing relationships

- Propose a relationship only if there is textual evidence (from quotations) suggesting it.
- Use code co-occurrence as a signal to investigate further, not as definitive proof.
- If multiple relationship types are plausible, list the most likely and ask the researcher to decide.
- If the relationship is unclear or not supported by evidence, mark it as "unclear" rather than forcing a connection.
- Distinguish between relationships suggested by the data and interpretations that require theoretical inference.

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

- If textual evidence clearly supports a relationship, propose it with confidence level and evidence type.
- If co-occurrence suggests a possible relationship but textual evidence is weak, label it as "requires investigation" and ask the researcher to review specific quotations.
- If the relationship is bidirectional or unclear (e.g., A causes B, or B causes A), list both possibilities and ask the researcher to determine which is supported.
- If multiple relationship types are plausible, present the most likely and note alternatives.
- If no relationship is evident, note "no clear relationship" rather than forcing a connection.
- Prioritize relationships that are explicitly stated or heavily implied in the quotations over relationships that require theoretical inference.

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

---
