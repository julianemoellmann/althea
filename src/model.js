export const MODULES = {
  coherence: { title: 'Internal Code Coherence', short: 'Coherence', scope: 'single', question: 'Do the quotations share one conceptual core?', classes: ['Core', 'Peripheral', 'Outlying'], ratings: ['Strong', 'Moderate', 'Weak'] },
  verification: { title: 'Verifying Coding', short: 'Verification', scope: 'single', question: 'Do the quotations support the label and its intended meaning?', classes: ['Strong', 'Borderline', 'Outlying'], ratings: ['Strong', 'Moderate', 'Weak'] },
  definition: { title: 'Creating Code Definitions', short: 'Definition', scope: 'single', question: 'Draft a core concept and a boundary rule, 50 words at most.', classes: ['Prototypical', 'Borderline', 'Atypical'], ratings: [] },
  comparison: { title: 'Comparing Codes', short: 'Comparison', scope: 'multi', question: 'Where do these codes overlap, and how do they differ?', classes: [], ratings: [] },
};
export const SCOPES = {
  single: { title: 'Single code', description: 'One code and all quotations assigned to it.', available: true, functions: ['Internal Code Coherence', 'Verifying Coding', 'Creating Code Definitions'] },
  multi: { title: 'Selected multi-code', description: 'A chosen pair or group of related codes.', available: false, functions: ['Comparing Codes', 'Code Hierarchy Suggestions'] },
  dataset: { title: 'Whole dataset', description: 'Patterns across the full quotation-per-code table.', available: false, functions: ['Cross-Code Coding Consistency', 'Category / Pattern Code Generation', 'Relational and Process Analysis'] },
};
export const ACTIONS = { keep: 'Keep code as is', rename: 'Rename code', definition: 'Refine definition', subcode: 'Create subcode', retire: 'Retire code', split: 'Split code', merge: 'Merge codes', recode: 'Recode quotation', borderline: 'Flag as borderline' };
// Suggestion lifecycle: every finding starts Under review; approve (after confirmation), reject and defer
// resolve it; a deferred suggestion can be reopened. Applying a change is part of approving, not a status.
export const STATUSES = ['Under review', 'Approved', 'Deferred', 'Rejected'];
const TRANSITIONS = { 'Under review': ['Under review', 'Approved', 'Deferred', 'Rejected'], Deferred: ['Under review'], Approved: [], Rejected: [] };
export function normalStatus(status) { return status === 'Implemented' ? 'Approved' : status; }
export function canTransition(from, to) { return (TRANSITIONS[normalStatus(from) || 'Under review'] || []).includes(to); }
export function statusLabel(record) {
  const status = normalStatus(record?.status ?? record?.reviewStatus);
  return status === 'Approved' && ['Applied', 'Implemented'].includes(record.implementationStatus) ? 'Approved and applied' : status || 'Not reviewed';
}
export const id = prefix => `${prefix}-${crypto.randomUUID()}`;
export const countWords = text => String(text || '').trim().split(/\s+/u).filter(Boolean).length;
export const activeCodes = project => project?.codes.filter(c => c.active) || [];
export function countsByCode(project) {
  const counts = new Map(); project.assignments.forEach(a => counts.set(a.codeId, (counts.get(a.codeId) || 0) + 1)); return counts;
}
export function quotesFor(project, codeId) {
  const ids = new Set(project.assignments.filter(a => a.codeId === codeId).map(a => a.quotationId));
  return project.quotations.filter(q => ids.has(q.id));
}
export function createProject(name, imports, prepared, reviewer, grouped) {
  if (!name.trim()) throw new Error('Enter a project name.');
  if (prepared.issues.some(i => i.severity === 'error')) throw new Error('Resolve blocking errors before preparing data.');
  if (prepared.summary.duplicateGroups && !grouped) throw new Error('Confirm how duplicate code labels should be grouped.');
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: id('project'), name: name.trim(), reviewer: reviewer.trim(), createdAt: now, updatedAt: now, revision: 0,
    imports: structuredClone(imports), preparation: { ...structuredClone(prepared.summary), delimiter: prepared.delimiter, childColumn: prepared.childColumn, prepared: false, preparedAt: null, groupedDuplicateLabels: grouped, issues: structuredClone(prepared.issues), issueStatus: Object.fromEntries(prepared.issues.filter(i => i.needsGrouping).map(i => [`${i.type}|${i.file}`, 'Resolved'])) },
    quotations: structuredClone(prepared.quotations), codes: structuredClone(prepared.codes), assignments: structuredClone(prepared.assignments),
    original: { codes: structuredClone(prepared.codes), assignments: structuredClone(prepared.assignments) }, reviews: [], history: [], drafts: {}, ui: { view: 'prepare', scope: 'single', module: 'verification', codeId: prepared.codes.find(c => c.label === 'Authenticity')?.id || prepared.codes[0]?.id || '', secondCodeId: prepared.codes.find(c => c.label === 'Creative expression')?.id || prepared.codes[1]?.id || '', filters: {}, scroll: {} } };
}
// Step 2: the researcher has inspected the issues; the quotation-per-code table becomes the working data.
export function prepareProject(project) {
  assert(!project.preparation.issues.some(i => i.severity === 'error'), 'Resolve blocking errors before preparing data.');
  project.preparation.prepared = true; project.preparation.preparedAt = new Date().toISOString(); project.updatedAt = project.preparation.preparedAt;
  return project;
}
export const isPrepared = project => !!project && project.preparation.prepared !== false;
export function draftKey(module, codeIds) { return `${module}:${codeIds.join('|')}`; }
export function emptyDraft(project, module, codeIds) {
  const code = project.codes.find(c => c.id === codeIds[0]);
  return { module, codeIds, assessment: '', subgroups: '', recommendation: '', core: code?.definition || '', boundary: code?.boundary || '', overlap: '', explanation: '', evidenceIds: [], classifications: {}, representatives: {}, note: '', rationale: '', action: 'keep', newLabel: '', newCore: '', newBoundary: '', targetCodeId: '', mergeNewLabel: '', splitLabels: ['',''], splitAssignments: {}, recodeMode: 'replace', quotationChanges: {}, finding: null, stage: 3 };
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function codeIn(project, codeId) { const c = project.codes.find(c => c.id === codeId && c.active); assert(c, 'The selected code is unavailable. Choose an active code.'); return c; }
function newCode(project, label, parentId = null) {
  label = label.trim(); assert(label, 'Enter a code name.');
  assert(!project.codes.some(c => c.active && c.label === label), `An active code named “${label}” already exists.`);
  const code = { id: id('c'), label, parentId, parentLabel: project.codes.find(c => c.id === parentId)?.label || '', definition: '', boundary: '', importedComment: '', groups: '', sourceRows: [], status: 'Reviewed', active: true };
  project.codes.push(code); return code;
}
// Deferring postpones a decision, so it needs no reason; every decision that settles something does.
function validateDraft(project, draft, resolution = 'approve') {
  assert(MODULES[draft.module], 'Choose a review module.');
  assert(draft.codeIds?.length === (draft.module === 'comparison' ? 2 : 1), 'Choose the required codes.');
  draft.codeIds.forEach(cid => codeIn(project, cid));
  assert(new Set(draft.codeIds).size === draft.codeIds.length, 'Choose two different codes to compare.');
  assert(project.reviewer.trim(), 'Enter a reviewer name before recording a decision.');
  assert(resolution === 'defer' || draft.rationale.trim(), 'Add a rationale for this decision.');
  const relevant = new Set(project.assignments.filter(a => draft.codeIds.includes(a.codeId)).map(a => a.quotationId));
  assert(draft.evidenceIds.every(qid => relevant.has(qid)), 'Some selected evidence no longer belongs to these codes. Refresh the review.');
}
export function previewDecision(project, draft, resolution = 'approve') {
  validateDraft(project, draft, resolution);
  assert(['approve', 'reject', 'defer', 'note'].includes(resolution), 'Choose a supported decision.');
  const target = { approve: 'Approved', reject: 'Rejected', defer: 'Deferred' }[resolution];
  assert(!target || !draft.reviewStatus || canTransition(draft.reviewStatus, target), `A suggestion that is ${normalStatus(draft.reviewStatus)} cannot become ${target}. Reopen it or run a new analysis.`);
  if (resolution === 'approve') {
    assert(draft.evidenceIds.length > 0 || !quotesFor(project, draft.codeIds[0]).length, 'Select at least one supporting quotation.');
    if (draft.module === 'coherence') assert(draft.assessment, 'Choose a coherence assessment.');
    if (draft.module === 'verification') assert(draft.assessment, 'Choose an overall coding assessment.');
    if (draft.module === 'definition') {
      assert(draft.core.trim() && draft.boundary.trim(), 'Enter both the core concept and boundary rule.');
      assert(countWords(draft.core + ' ' + draft.boundary) <= 50, 'The definition must be 50 words or fewer.');
    }
    if (draft.module === 'comparison') { assert(draft.explanation.trim(), 'Explain the boundary between the two codes.'); assert(String(draft.overlap).trim() !== '' && Number.isFinite(Number(draft.overlap)) && draft.overlap >= 0 && draft.overlap <= 10, 'Enter your overlap score from 0 to 10.'); }
  }
  const next = structuredClone(project), source = codeIn(next, draft.codeIds[0]);
  const affected = new Set(draft.codeIds), action = resolution === 'approve' ? draft.action : resolution;
  if (resolution === 'approve') {
    assert(Object.hasOwn(ACTIONS, action), 'Choose a supported change.');
    // Quotation-level changes come first so that code-level actions (merge, split) carry their result along.
    const changes = Object.entries(draft.quotationChanges || {}).filter(([, change]) => change?.include);
    const created = new Map();
    for (const [qid, change] of changes) {
      const assignment = next.assignments.find(a => a.quotationId === qid && a.codeId === source.id);
      assert(assignment, 'A quotation change refers to a quotation that no longer belongs to this code.');
      if (change.op === 'flag') assignment.flag = 'borderline';
      else if (change.op === 'remove') next.assignments = next.assignments.filter(a => a !== assignment);
      else if (change.op === 'recode') {
        const recodeTarget = codeIn(next, change.targetCodeId); assert(recodeTarget.id !== source.id, 'Choose a different target code.');
        assignment.codeId = recodeTarget.id; delete assignment.flag; affected.add(recodeTarget.id);
      } else if (change.op === 'newcode') {
        // Quotations given the same new name share one new code.
        const label = String(change.label || '').trim(); assert(label, 'Enter a name for the new code.');
        if (!created.has(label)) created.set(label, newCode(next, label));
        assignment.codeId = created.get(label).id; delete assignment.flag; affected.add(created.get(label).id);
      } else assert(false, 'Choose a supported quotation change.');
    }
    switch (action) {
      case 'rename': {
        const label = draft.newLabel.trim(); assert(label, 'Enter the revised code name.');
        assert(!next.codes.some(c => c.active && c.id !== source.id && c.label === label), 'That code name is already in use.');
        source.label = label; break;
      }
      case 'definition': {
        const core = draft.module === 'definition' ? draft.core.trim() : draft.newCore.trim();
        const boundary = draft.module === 'definition' ? draft.boundary.trim() : draft.newBoundary.trim();
        assert(core && boundary, 'Enter the core concept and inclusion/exclusion rule.');
        assert(countWords(core + ' ' + boundary) <= 50, 'The definition must be 50 words or fewer.');
        source.definition = core; source.boundary = boundary; break;
      }
      case 'subcode': {
        const child = newCode(next, draft.newLabel, source.id); affected.add(child.id); break;
      }
      case 'split': {
        const children = draft.splitLabels.map(label => newCode(next, label, source.id));
        children.forEach(c => affected.add(c.id));
        const moves = Object.entries(draft.splitAssignments).filter(([, destination]) => destination !== '' && destination != null);
        assert(moves.length, 'Explicitly assign at least one quotation to a replacement code.');
        for (const [qid, destination] of moves) {
          assert(destination === '0' || destination === '1', 'Choose a valid replacement code.');
          const assignment = next.assignments.find(a => a.quotationId === qid && a.codeId === source.id);
          assert(assignment, 'A quotation chosen for splitting no longer belongs to this code.');
          assignment.codeId = children[Number(destination)].id;
        }
        break;
      }
      case 'merge': {
        const sources = draft.codeIds.length === 2 ? draft.codeIds : [source.id, draft.targetCodeId];
        assert(new Set(sources).size === 2, 'Choose two different codes to merge.');
        sources.forEach(cid => codeIn(next, cid));
        const survivor = draft.mergeNewLabel.trim() ? newCode(next, draft.mergeNewLabel) : codeIn(next, draft.targetCodeId);
        assert(draft.mergeNewLabel.trim() || sources.includes(survivor.id), 'Choose one of the source codes to survive, or enter a new name.');
        affected.add(survivor.id); sources.forEach(cid => affected.add(cid));
        // A surviving descendant must not become its own ancestor, even across several levels.
        let ancestor = survivor.parentId;
        while (ancestor) {
          if (sources.includes(ancestor)) { survivor.parentId = null; break; }
          ancestor = next.codes.find(c => c.id === ancestor)?.parentId;
        }
        for (const c of next.codes) {
          if (sources.includes(c.id) && c.id !== survivor.id) { c.active = false; c.mergedInto = survivor.id; }
          if (sources.includes(c.parentId) && c.id !== survivor.id) c.parentId = survivor.id;
        }
        next.assignments.forEach(a => { if (sources.includes(a.codeId)) a.codeId = survivor.id; });
        break;
      }
      case 'retire': {
        source.active = false; source.retired = true;
        next.assignments = next.assignments.filter(a => a.codeId !== source.id);
        for (const c of next.codes) if (c.parentId === source.id) { c.parentId = source.parentId || null; affected.add(c.id); }
        break;
      }
      case 'borderline':
        assert(changes.some(([, change]) => change.op === 'flag'), 'Select at least one quotation to flag as borderline.');
        break;
      case 'recode': {
        if (changes.some(([, change]) => ['recode','newcode'].includes(change.op))) break;
        assert(draft.evidenceIds.length, 'Select the quotations to recode.');
        assert(['replace', 'add', 'remove'].includes(draft.recodeMode), 'Choose add, replace, or remove.');
        const target = draft.recodeMode === 'remove' ? null : codeIn(next, draft.targetCodeId);
        assert(!target || target.id !== source.id, 'Choose a different target code.');
        if (target) affected.add(target.id);
        for (const qid of draft.evidenceIds) {
          assert(next.assignments.some(a => a.codeId === source.id && a.quotationId === qid), 'Recode evidence must currently belong to the first selected code.');
          if (draft.recodeMode !== 'add') next.assignments = next.assignments.filter(a => !(a.quotationId === qid && a.codeId === source.id));
          if (target) next.assignments.push({ quotationId: qid, codeId: target.id });
        }
        break;
      }
    }
    if (action !== 'keep') for (const c of next.codes) if (affected.has(c.id)) c.status = c.retired ? 'Retired' : 'Reviewed';
    const dedup = new Set(); next.assignments = next.assignments.filter(a => { const key = `${a.quotationId}|${a.codeId}`; if (dedup.has(key)) return false; dedup.add(key); return true; });
    for (const c of next.codes) c.parentLabel = next.codes.find(p => p.id === c.parentId)?.label || '';
  }
  const beforeMap = new Map(project.codes.map(c => [c.id, c]));
  const codeChanges = next.codes.filter(c => JSON.stringify(beforeMap.get(c.id)) !== JSON.stringify(c)).map(c => ({ before: beforeMap.get(c.id) || null, after: c }));
  const beforePairs = new Set(project.assignments.map(a => `${a.quotationId}|${a.codeId}`));
  const afterPairs = new Set(next.assignments.map(a => `${a.quotationId}|${a.codeId}`));
  const removed = project.assignments.filter(a => !afterPairs.has(`${a.quotationId}|${a.codeId}`));
  const added = next.assignments.filter(a => !beforePairs.has(`${a.quotationId}|${a.codeId}`));
  const beforeFlags = new Set(project.assignments.filter(a => a.flag).map(a => `${a.quotationId}|${a.codeId}`));
  const flagged = next.assignments.filter(a => a.flag && !beforeFlags.has(`${a.quotationId}|${a.codeId}`) && beforePairs.has(`${a.quotationId}|${a.codeId}`)).map(a => ({ quotationId: a.quotationId, codeId: a.codeId, flag: a.flag }));
  return { projectId: project.id, revision: project.revision, action, resolution, codeChanges, removed, added, flagged, codes: next.codes, assignments: next.assignments, draft: structuredClone(draft), affectedCodeIds: [...affected] };
}
export function commitDecision(project, preview) {
  assert(preview.projectId === project.id && preview.revision === project.revision, 'The project changed after this preview. Review the impact again.');
  const now = new Date().toISOString(), reviewId = id('review');
  const flagged = preview.flagged || [];
  const hasChanges = preview.codeChanges.length || preview.added.length || preview.removed.length || flagged.length;
  const status = { approve: 'Approved', reject: 'Rejected', defer: 'Deferred', note: 'Note' }[preview.resolution];
  const implementationStatus = preview.resolution === 'approve' && hasChanges ? 'Applied' : 'Not applicable';
  project.codes = structuredClone(preview.codes); project.assignments = structuredClone(preview.assignments);
  project.reviews.push({ id: reviewId, ...structuredClone(preview.draft), status, reviewStatus: status, implementationStatus, action: preview.action, reviewer: project.reviewer, recordedAt: now, ...(implementationStatus === 'Applied' ? { appliedAt: now } : {}) });
  project.history.push({ id: id('action'), projectId: project.id, reviewId, action: preview.action, status, implementationStatus, reviewer: project.reviewer, timestamp: now, rationale: preview.draft.rationale, evidenceIds: [...preview.draft.evidenceIds], affectedCodeIds: preview.affectedCodeIds, codeChanges: structuredClone(preview.codeChanges), removed: structuredClone(preview.removed), added: structuredClone(preview.added), flagged: structuredClone(flagged) });
  project.revision++; project.updatedAt = now;
  const key = draftKey(preview.draft.module, preview.draft.codeIds);
  project.drafts[key] = { ...structuredClone(preview.draft), stage: 7, reviewStatus: status === 'Note' ? preview.draft.reviewStatus || 'Under review' : status, implementationStatus, lastReviewId: reviewId, resolvedAt: now };
  return project.history.at(-1);
}
// Deferred -> Under review. The original evidence, finding and rationale come back with it.
export function reopenSuggestion(project, key) {
  const d = project.drafts[key]; assert(d, 'This suggestion is no longer available.');
  assert(normalStatus(d.reviewStatus) === 'Deferred', 'Only deferred suggestions can be reopened.');
  d.codeIds.forEach(cid => codeIn(project, cid));
  const now = new Date().toISOString();
  d.reviewStatus = 'Under review'; d.stage = 5;
  project.history.push({ id: id('action'), projectId: project.id, reviewId: d.lastReviewId, action: 'reopen', status: 'Under review', reviewer: project.reviewer, timestamp: now, rationale: 'Deferred suggestion reopened for review.', evidenceIds: [...d.evidenceIds], affectedCodeIds: [...d.codeIds], codeChanges: [], removed: [], added: [] });
  project.updatedAt = now;
  return d;
}
export function deferredSuggestions(project) {
  return Object.entries(project?.drafts || {}).filter(([, d]) => normalStatus(d.reviewStatus) === 'Deferred').map(([key, d]) => ({ key, ...d }));
}
export function saveReview(project, draft) {
  validateDraft(project, draft);
  const now = new Date().toISOString(), reviewId = id('review');
  // Saving an assessment is deliberately independent of applying its proposed action.
  const review = { ...structuredClone(draft), id:reviewId, status:'Under review', reviewStatus:'Under review', implementationStatus:'Not applicable', reviewer:project.reviewer, recordedAt:now };
  project.reviews.push(review);
  project.history.push({ id:id('action'), projectId:project.id, reviewId, action:'review', status:'Under review', reviewer:project.reviewer, timestamp:now, rationale:draft.rationale, evidenceIds:[...draft.evidenceIds], affectedCodeIds:[...draft.codeIds], codeChanges:[], removed:[], added:[] });
  project.drafts[draftKey(draft.module,draft.codeIds)] = { ...structuredClone(draft), lastReviewId:reviewId, reviewStatus:'Under review', stage:5 };
  project.updatedAt = now;
  return review;
}
// A single quotation moved to another code is applied as soon as the researcher saves it. It is recorded as its own
// approved decision with the previous assignment kept, and leaves the code's open suggestion as it is.
export function moveQuotation(project, draft, quotationId, { choice, targetCodeId = '', newLabel = '' }) {
  assert(project.reviewer.trim(), 'Enter a reviewer name before recording a decision.');
  assert(['existing','new'].includes(choice), 'Choose another code for this quotation.');
  const source = codeIn(project, draft.codeIds[0]);
  const assignment = project.assignments.find(a => a.quotationId === quotationId && a.codeId === source.id);
  assert(assignment, 'This quotation no longer belongs to this code.');
  const beforeCodes = new Map(project.codes.map(c => [c.id, structuredClone(c)])), beforeAssignment = structuredClone(assignment);
  const target = choice === 'existing' ? codeIn(project, targetCodeId) : newCode(project, newLabel);
  assert(target.id !== source.id, 'Choose a different code.');
  const alreadyThere = project.assignments.some(a => a.quotationId === quotationId && a.codeId === target.id);
  if (alreadyThere) project.assignments = project.assignments.filter(a => a !== assignment);
  else { assignment.codeId = target.id; delete assignment.flag; }
  const now = new Date().toISOString(), reviewId = id('review'), change = choice === 'existing' ? { op:'recode', targetCodeId:target.id, include:true } : { op:'newcode', label:target.label, include:true };
  const codeChanges = project.codes.filter(c => JSON.stringify(beforeCodes.get(c.id)) !== JSON.stringify(c)).map(c => ({ before:beforeCodes.get(c.id) || null, after:structuredClone(c) }));
  const rationale = `Quotation moved from “${source.label}” to ${choice === 'new' ? 'the new code ' : ''}“${target.label}” during ${MODULES[draft.module].title}.`;
  project.reviews.push({ ...structuredClone(draft), id:reviewId, action:'recode', evidenceIds:[quotationId], quotationChanges:{ [quotationId]:change }, rationale, status:'Approved', reviewStatus:'Approved', implementationStatus:'Applied', appliedAt:now, reviewer:project.reviewer, recordedAt:now, scope:'quotation' });
  project.history.push({ id:id('action'), projectId:project.id, reviewId, action:'move', status:'Approved', implementationStatus:'Applied', reviewer:project.reviewer, timestamp:now, rationale, evidenceIds:[quotationId], affectedCodeIds:[source.id, target.id], codeChanges, removed:[beforeAssignment], added:alreadyThere ? [] : [{ quotationId, codeId:target.id }] });
  project.revision++; project.updatedAt = now;
  return { target, alreadyThere };
}
export function validateBackup(value) {
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const strings = (x, keys) => keys.every(key => typeof x?.[key] === 'string');
  assert(value?.schemaVersion === 1 && typeof value.id === 'string' && typeof value.name === 'string', 'This is not an Althea v1 project backup.');
  assert(typeof value.reviewer === 'string' && Number.isInteger(value.revision) && value.revision >= 0, 'The project metadata is invalid.');
  for (const key of ['codes','quotations','assignments','reviews','history']) assert(Array.isArray(value[key]), `The backup is missing ${key}.`);
  assert(value.original && Array.isArray(value.original.codes) && Array.isArray(value.original.assignments), 'The original project snapshot is missing.');
  assert(object(value.imports) && object(value.preparation) && object(value.ui) && object(value.drafts) && object(value.ui.filters) && object(value.ui.scroll), 'The backup is missing source files or workspace state.');
  assert(Array.isArray(value.preparation.issues), 'The preparation record is missing.');
  for (const kind of ['quotation','codes']) {
    const file = value.imports[kind];
    assert(strings(file,['name','bytes','sheetName']) && file.bytes.length > 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.bytes), 'An original source file is missing or invalid.');
    assert(Array.isArray(file.rows) && file.rows.every(Array.isArray) && Array.isArray(file.headers) && object(file.mapping), 'An imported source table is invalid.');
  }
  const qs = new Set(value.quotations.map(q => q.id)), cs = new Set(value.codes.map(c => c.id));
  assert(qs.size === value.quotations.length && cs.size === value.codes.length, 'The backup contains duplicate internal IDs.');
  value.quotations.forEach(q => assert(strings(q,['id','text','quotationId','source','coder','created','note']) && Number.isInteger(q.sourceRow), 'Invalid quotation in backup.'));
  value.codes.forEach(c => { assert(strings(c,['id','label','definition','boundary','importedComment','groups','status']) && Array.isArray(c.sourceRows) && typeof c.active === 'boolean' && (!c.parentId || cs.has(c.parentId)), 'Invalid code or parent in backup.'); const seen = new Set([c.id]); let parent = c.parentId; while (parent) { assert(!seen.has(parent), 'The backup has a hierarchy cycle.'); seen.add(parent); parent = value.codes.find(p => p.id === parent)?.parentId; } });
  value.assignments.forEach(a => assert(qs.has(a.quotationId) && value.codes.some(c => c.id === a.codeId && c.active) && (a.flag === undefined || a.flag === 'borderline'), 'The backup contains a broken coding assignment.'));
  function validFinding(f) {
    return object(f) && strings(f,['title','interpretation','provenance']) && object(f.suggestedFields)
      && Array.isArray(f.evidenceIds) && f.evidenceIds.every(qid => qs.has(qid))
      && (!f.questions || Array.isArray(f.questions) && f.questions.every(q => strings(q,['question','answer'])))
      && (!f.classifications || object(f.classifications) && Object.entries(f.classifications).every(([qid,c]) => qs.has(qid) && strings(c,['rating','note'])));
  }
  for (const d of [...Object.values(value.drafts),...value.reviews]) {
    assert(!d.finding || validFinding(d.finding), 'The backup contains an invalid analysis result.');
    assert(!d.analysisHistory || Array.isArray(d.analysisHistory) && d.analysisHistory.every(validFinding), 'The backup contains invalid analysis history.');
  }
  function validDraft(draft) {
    return object(draft) && MODULES[draft.module] && strings(draft,['assessment','subgroups','recommendation','core','boundary','explanation','note','rationale','action','newLabel','newCore','newBoundary','targetCodeId','mergeNewLabel','recodeMode']) && Array.isArray(draft.codeIds) && draft.codeIds.every(cid => cid === '' || cs.has(cid)) && Array.isArray(draft.evidenceIds) && draft.evidenceIds.every(qid => qs.has(qid)) && object(draft.classifications) && Object.values(draft.classifications).every(object) && object(draft.representatives) && object(draft.splitAssignments) && (draft.quotationChanges === undefined || object(draft.quotationChanges) && Object.entries(draft.quotationChanges).every(([qid, c]) => qs.has(qid) && object(c) && ['flag','remove','recode','newcode'].includes(c.op))) && Array.isArray(draft.splitLabels) && draft.splitLabels.length === 2 && draft.splitLabels.every(s => typeof s === 'string') && (!draft.finding || (strings(draft.finding,['title','interpretation','provenance']) && object(draft.finding.suggestedFields) && Array.isArray(draft.finding.evidenceIds) && draft.finding.evidenceIds.every(qid => qs.has(qid))));
  }
  for (const draft of Object.values(value.drafts)) assert(validDraft(draft), 'The backup contains an invalid review draft.');
  for (const review of value.reviews) assert(validDraft(review) && strings(review,['id','status','reviewer','recordedAt']), 'The backup contains an invalid recorded review.');
  for (const h of value.history) assert(strings(h,['id','reviewId','action','status','reviewer','timestamp','rationale']) && value.reviews.some(r => r.id === h.reviewId) && Array.isArray(h.evidenceIds) && h.evidenceIds.every(qid => qs.has(qid)) && Array.isArray(h.affectedCodeIds) && h.affectedCodeIds.every(cid => cs.has(cid)) && Array.isArray(h.codeChanges) && h.codeChanges.every(c => object(c.after) && typeof c.after.id === 'string') && Array.isArray(h.removed) && Array.isArray(h.added) && [...h.removed,...h.added].every(a => qs.has(a.quotationId) && cs.has(a.codeId)), 'The backup contains an invalid history entry.');
  return value;
}
