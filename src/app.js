import { readExport, prepareImports, fields, requiredFields, csv } from './data.js';
import { MODULES, id, countWords, activeCodes, countsByCode, quotesFor, createProject, draftKey, emptyDraft, previewDecision, commitDecision, validateBackup } from './model.js';
import { allProjects, saveProject } from './storage.js';
import { exampleProvider } from './analysis.js';

const app = document.querySelector('#app'), modal = document.querySelector('#modal');
const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const n = value => Number(value || 0).toLocaleString();
const date = value => value ? new Date(value).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' }) : '—';
const paths = {
  overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  data:'M4 4h16v16H4zM4 9h16M9 4v16M4 14h16', review:'M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5',
  codebook:'M3 5c3-2 6-2 9 0 3-2 6-2 9 0v15c-3-2-6-2-9 0-3-2-6-2-9 0zM12 5v15',
  history:'M4 8a9 9 0 1 1-1 8M3 3v6h6M12 7v6l4 2', arrow:'M5 12h14M13 6l6 6-6 6',
  plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  folder:'M3 6V4h7l2 3h9v13H3z', close:'m6 6 12 12M6 18 18 6', settings:'M4 7h16M4 17h16M8 4v6M16 14v6',
  link:'M10 14 14 10M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l5-5a3 3 0 0 0-4-4l-2 2',
};
const icon = name => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.review}"/></svg>`;
const button = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const badge = (label, cls = '') => `<span class="badge ${cls}">${e(label)}</span>`;
const state = { project: null, projects: [], view: 'overview', imports: { quotation:null, codes:null }, prepared:null, importName:'', reviewer:'', grouped:false, warningsReviewed:false, delimiter:'', childColumn:undefined, loading:false, loadingMessage:'', error:'', saveStatus:'', importError:'', providerBusy:false, providerError:'', analysisController:null, preview:null, filterTimer:null };
let saveTimer, saveChain = Promise.resolve(), toastTimer, saveTicket = 0;
const importVersions = { quotation:0, codes:0 };
const p = () => state.project;
function toast(message) { const target = document.querySelector('#notifications'); target.textContent = message; target.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => target.classList.remove('visible'), 4500); }
function setSaveStatus(message) { state.saveStatus = message; const node = document.querySelector('#save-state'); if (node) node.textContent = message; }
function persist(immediate = false) {
  if (!p()) return;
  const ticket = ++saveTicket;
  clearTimeout(saveTimer); setSaveStatus('Saving…');
  const run = () => {
    const snapshot = structuredClone(p());
    snapshot.updatedAt = new Date().toISOString();
    saveChain = saveChain.catch(() => {}).then(() => saveProject(snapshot)).then(() => {
      const i = state.projects.findIndex(x => x.id === snapshot.id); if (i >= 0) state.projects[i] = snapshot; else state.projects.unshift(snapshot);
      if (p()?.id === snapshot.id && ticket === saveTicket) { state.error = ''; setSaveStatus('Saved on this browser'); const banner = document.querySelector('#save-error'); if (banner) banner.remove(); }
    }).catch(error => { if (p()?.id === snapshot.id && ticket === saveTicket) { state.error = `Your latest changes could not be saved. Download a project backup before closing. ${error.message || ''}`; setSaveStatus('Not saved'); render(); } });
    return saveChain;
  };
  if (immediate) return run();
  saveTimer = setTimeout(run, 450);
}
function captureScroll() {
  if (!p()) return;
  p().ui.scroll ||= {};
  for (const node of app.querySelectorAll('[data-scroll]')) p().ui.scroll[`${state.view}:${node.dataset.scroll}`] = node.scrollTop;
}
function restoreScroll() { if (p()) for (const node of app.querySelectorAll('[data-scroll]')) node.scrollTop = p().ui.scroll?.[`${state.view}:${node.dataset.scroll}`] || 0; }
function filter(key, fallback = '') { return p()?.ui.filters?.[key] ?? fallback; }
function setFilter(key, value) { if (p()) { p().ui.filters[key] = value; persist(); } }
function draft() {
  const project = p(); if (!project) return null;
  const module = project.ui.module || 'coherence';
  const codes = activeCodes(project);
  if (!codes.some(c => c.id === project.ui.codeId)) project.ui.codeId = codes[0]?.id || '';
  if (!codes.some(c => c.id === project.ui.secondCodeId)) project.ui.secondCodeId = codes.find(c => c.id !== project.ui.codeId)?.id || '';
  const ids = module === 'comparison' ? [project.ui.codeId, project.ui.secondCodeId] : [project.ui.codeId];
  const key = draftKey(module, ids);
  return project.drafts[key] ||= emptyDraft(project, module, ids);
}
function cancelAnalysis() { state.analysisController?.abort(); state.analysisController = null; state.providerBusy = false; state.providerError = ''; }
function go(view) {
  cancelAnalysis(); clearTimeout(state.filterTimer); captureScroll(); state.view = view;
  if (p()) { p().ui.view = view; persist(); }
  render(false); document.querySelector('#page-title')?.focus({ preventScroll:true });
}
function selectedCode() { return p()?.codes.find(c => c.id === p().ui.codeId); }
function codeLabel(cid) { return p()?.codes.find(c => c.id === cid)?.label || cid; }
function codeOptions(selected = '', { exclude = [], only = null } = {}) {
  return `<option value="">Choose a code…</option>` + activeCodes(p()).filter(c => !exclude.includes(c.id) && (!only || only.includes(c.id))).sort((a,b) => a.label.localeCompare(b.label)).map(c => `<option value="${e(c.id)}" ${c.id === selected ? 'selected' : ''}>${e(c.label)}</option>`).join('');
}
function field(label, name, value, { textarea = false, placeholder = '', extra = '', cls = '' } = {}) {
  return `<label class="field ${cls}"><span>${label}</span>${textarea ? `<textarea id="field-${name}" data-draft="${name}" placeholder="${e(placeholder)}" ${extra}>${e(value)}</textarea>` : `<input id="field-${name}" data-draft="${name}" value="${e(value)}" placeholder="${e(placeholder)}" ${extra}>`}</label>`;
}
function selectField(label, name, value, options) { return `<label class="field"><span>${label}</span><select id="field-${name}" data-draft="${name}">${options.map(([v,l]) => `<option value="${e(v)}" ${String(value) === String(v) ? 'selected' : ''}>${e(l)}</option>`).join('')}</select></label>`; }
function empty(title, text, action = '') { return `<div class="empty"><div class="empty-icon">${icon('folder')}</div><h3>${title}</h3><p>${text}</p>${action}</div>`; }
function pageHeader(kicker, title, description, actions = '') { return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1 id="page-title" tabindex="-1">${title}</h1><p class="muted">${description}</p></div><div class="heading-actions">${actions}</div></div>`; }
function stepper() {
  let stage = !p() ? state.prepared ? 2 : 1 : state.view === 'data' ? 2 : state.view === 'history' ? 7 : state.view === 'review' ? draft()?.stage || 3 : 3;
  const labels = ['Import','Prepare','Scope','Analyse','Review','Decide','Record'];
  return `<ol class="journey" aria-label="Review progress">${labels.map((label,i) => `<li class="${i + 1 === stage ? 'current' : i + 1 < stage ? 'done' : ''}" ${i + 1 === stage ? 'aria-current="step"' : ''}><span>${i + 1 < stage ? icon('check') : i + 1}</span>${label}</li>`).join('')}</ol>`;
}
function render(preserve = true) {
  const focused = document.activeElement, focusedId = focused?.id, selection = typeof focused?.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
  if (preserve) captureScroll();
  const names = { overview:'Overview', data:'Data', review:'Review', codebook:'Codebook', history:'History' };
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="home" aria-label="Althea overview"><span class="brand-mark">a<span>·</span></span><span>althea<small>QUALITATIVE RESEARCH</small></span></a>
    <button class="project-switch" data-action="projects" aria-label="Saved projects: ${e(p()?.name || 'Your workspace')}"><span class="project-avatar">${e((p()?.name || 'A').slice(0,1).toUpperCase())}</span><span><strong>${e(p()?.name || 'Your workspace')}</strong><small>${p() ? 'Local research project' : 'Start a new review'}</small></span><span>⌄</span></button>
    <p class="nav-label">WORKSPACE</p><nav aria-label="Workspace">${Object.entries(names).map(([key,label]) => `<button class="nav-item ${state.view === key ? 'active' : ''}" data-view="${key}" aria-label="${label}" title="${label}" ${state.view === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${label}</span>${key === 'history' && p()?.history.length ? `<small>${p().history.length}</small>` : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="local-label"><span class="status-dot"></span> Local workspace</div><p>Your research stays on this device.</p>${button(icon('plus') + ' New project', 'new-project', 'sidebar-btn')}<button class="text-button" data-action="projects">${icon('folder')} Saved projects</button></div></aside>
    <div class="workspace"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong>${names[state.view]}</strong></div><div class="topbar-right"><span class="save-state" id="save-state">${e(state.saveStatus || 'Local prototype')}</span>${p() ? button(icon('download') + '<span>Backup project</span>', 'backup', 'quiet') : ''}<button class="reviewer-avatar" data-action="reviewer" title="Reviewer settings" aria-label="Reviewer settings">${e((p()?.reviewer || state.reviewer || 'R').slice(0,1).toUpperCase())}</button></div></header>
    ${state.error ? `<div id="save-error" class="alert error">${e(state.error)} ${p() ? button('Download backup','backup','secondary') : ''}</div>` : ''}
    <main id="main" class="main ${state.view === 'review' && p() ? 'review-main' : ''}" data-scroll="main">${state.loading ? `<div class="loading"><span class="spinner"></span><h2>${e(state.loadingMessage)}</h2><p>Reading the exports on your device.</p></div>` : ({ overview:overviewView, data:dataView, review:reviewView, codebook:codebookView, history:historyView }[state.view] || overviewView)()}</main></div>`;
  restoreScroll();
  if (focusedId) { const target = document.getElementById(focusedId); if (target) { target.focus({ preventScroll:true }); if (selection && typeof target.setSelectionRange === 'function' && !['number','range','file'].includes(target.type)) target.setSelectionRange(...selection); } }
}

function overviewView() {
  if (!p()) return `${pageHeader('RESEARCH, WITH CONTEXT', 'Your review workspace', 'Bring your quotations, codes, and research decisions together.')}
    <section class="welcome-card"><div><span class="tag">START WITH YOUR EVIDENCE</span><h2>Make room for<br>a closer reading.</h2><p>Explore your coding, clarify its meaning, and keep a record of the decisions that shape your research.</p><div class="button-row">${button('Load example project ' + icon('arrow'),'load-example','primary')}${button('Import your data','import-data')}</div><p class="fine">Includes the supplied creativity and AI research exports.</p></div><div class="welcome-visual" aria-hidden="true"><div class="paper paper-back"><span>CODEBOOK</span><b>Creative process</b><div></div><div></div></div><div class="paper paper-front"><span>QUOTATION · 11:11</span><blockquote>“At least this way, I’m still staying true to my own style.”</blockquote><span class="paper-tag">Authenticity</span><small>Evidence before interpretation.</small></div></div></section>
    <div class="section-heading"><h2>A considered review, from start to finish</h2><span class="muted">Built around your judgment</span></div><div class="intro-grid">${[['data','01','Prepare your evidence','Import ATLAS.ti exports and inspect the quotation–code relationships.'],['review','02','Review in context','Read full quotations beside your assessments and code definitions.'],['history','03','Keep decisions traceable','Preview changes, confirm them, and retain the reasoning behind each one.']].map(([ico,num,title,text]) => `<article class="intro-card"><div>${icon(ico)}<span>${num}</span></div><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
    ${state.projects.length ? `<div class="section-heading"><h2>Continue a project</h2></div><div class="project-grid">${state.projects.map(projectCard).join('')}</div>` : `<p class="restore-note">Already have a backup? <button class="text-button inline" data-action="restore">Restore a project</button></p>`}`;
  const project = p(), reviewed = new Set(project.reviews.filter(r => !['Deferred','Note'].includes(r.status)).flatMap(r => r.codeIds));
  const stats = [['Quotations',project.quotations.length,'Across ' + n(project.preparation.sources) + ' sources'],['Active codes',activeCodes(project).length,'From your working codebook'],['Coding assignments',project.assignments.length,'Each links a quotation and code'],['Recorded reviews',project.reviews.length,n(project.reviews.filter(r => r.status === 'Deferred').length) + ' deferred']];
  const recent = project.history.slice(-4).reverse();
  return `${pageHeader('PROJECT OVERVIEW', e(project.name), 'Your evidence, review progress, and recent decisions in one place.', button('Continue reviewing ' + icon('arrow'),'start-review','primary'))}${stepper()}
    <div class="stats-grid">${stats.map(([label,value,sub]) => `<article class="stat"><span>${label}</span><strong>${n(value)}</strong><small>${sub}</small></article>`).join('')}</div>
    <div class="overview-columns"><section class="card review-launch"><span class="eyebrow">NEXT IN YOUR REVIEW</span><h2>Return to the evidence</h2><p>Start with a code, read its quotations, and choose the question you want to explore.</p><div class="module-launches">${Object.entries(MODULES).map(([key,m],i) => `<button class="module-launch" data-action="open-module" data-module="${key}"><span class="module-number">0${i + 1}</span><span><strong>${m.title}</strong><small>${m.question}</small></span>${icon('arrow')}</button>`).join('')}</div></section>
    <div><section class="card progress-card"><div class="section-heading"><h2>Review coverage</h2>${badge('In progress')}</div><strong class="coverage-number">${n(reviewed.size)} <span>/ ${n(activeCodes(project).length)}</span></strong><p class="muted">codes with a recorded assessment</p><progress max="${Math.max(1,activeCodes(project).length)}" value="${reviewed.size}" aria-label="Code review coverage"></progress><p class="fine">Review only what your research question needs. Every path can be completed independently.</p></section><section class="card source-card"><span class="eyebrow">SOURCE MATERIAL</span><h3>Original exports preserved</h3>${Object.entries(project.imports).map(([kind,f]) => `<div class="source-file">${icon('data')}<span>${e(f.name)}<small>${e(f.sheetName)} · ${n(f.rows.length)} source rows</small></span><button class="icon-button" data-action="download-source" data-kind="${kind}" aria-label="Download original ${kind} file">${icon('download')}</button></div>`).join('')}</section></div></div>
    <div class="section-heading"><h2>Recent decisions</h2><button class="text-button" data-view="history">View history ${icon('arrow')}</button></div>${recent.length ? `<div class="card recent-list">${recent.map(h => `<div><span class="history-marker">${icon('check')}</span><span><strong>${e(actionName(h.action))}</strong><small>${e(h.affectedCodeIds.map(codeLabel).join(' · '))}</small></span>${badge(h.status)}<time>${date(h.timestamp)}</time></div>`).join('')}</div>` : empty('Your review trail starts here', 'Assessments and confirmed changes will appear here, linked to their evidence.')}
    <div class="planned"><span class="eyebrow">PLANNED MODULES</span><p>Cross-code consistency · Hierarchy suggestions · Pattern generation · Relational and process analysis</p><span class="fine">These modules are not part of this prototype.</span></div>`;
}
function projectCard(project) { return `<button class="project-card" data-action="resume" data-id="${e(project.id)}">${icon('folder')}<strong>${e(project.name)}</strong><span>${n(project.quotations.length)} quotations · ${n(project.reviews.length)} reviews</span><small>Saved ${date(project.updatedAt)}</small>${icon('arrow')}</button>`; }

function importCard(kind, title, description) {
  const file = state.imports[kind];
  return `<section class="card import-card"><div class="section-heading"><h3>${title}</h3>${file ? badge('File read','green') : badge('Required')}</div><p class="muted">${description}</p><label class="file-drop" data-drop="${kind}">${icon(file ? 'check' : 'upload')}<strong>${file ? e(file.name) : 'Choose or drop an export'}</strong><small>${file ? `${n(file.rows.filter(r => r.some(Boolean)).length)} rows · ${e(file.sheetName)} · Change file` : 'XLSX or CSV · up to 25 MB'}</small><input type="file" id="upload-${kind}" data-file="${kind}" accept=".xlsx,.csv" aria-label="${title}"></label>
    ${file ? `<details class="mapping"><summary>Review column mapping</summary><div class="mapping-grid">${Object.entries(fields[kind]).map(([key]) => `<label class="field"><span>${e(key)} ${requiredFields[kind].includes(key) ? '<small>required</small>' : ''}</span><select data-mapping="${kind}:${key}" aria-label="${kind} ${key} column"><option value="-1">Not mapped</option>${file.headers.map((h,i) => `<option value="${i}" ${file.mapping[key] === i ? 'selected' : ''}>${e(h || 'Unnamed column ' + (i + 1))}</option>`).join('')}</select></label>`).join('')}${kind === 'codes' ? `<label class="field"><span>Child code column</span><select id="child-column"><option value="-1" ${state.prepared?.childColumn === -1 ? 'selected' : ''}>No child column</option>${file.headers.map((h,i) => `<option value="${i}" ${state.prepared?.childColumn === i ? 'selected' : ''}>${e(h || 'Unnamed column ' + (i + 1))}</option>`).join('')}</select></label>` : ''}</div><p class="fine">${Object.entries(file.metadata).map(([key,value]) => `${e(key)}: ${e(value)}`).join(' · ')}</p></details>` : ''}</section>`;
}
function recalculateImports() { state.prepared = state.imports.quotation && state.imports.codes ? prepareImports(state.imports, { delimiter:state.delimiter, childColumn:state.childColumn }) : null; state.warningsReviewed = false; state.grouped = false; }
function dataView() {
  if (p()) return preparedDataView();
  const prepared = state.prepared, blocking = prepared?.issues.filter(i => i.severity === 'error') || [], warnings = prepared?.issues.filter(i => i.severity === 'warning') || [];
  const ready = prepared && !blocking.length && state.importName.trim() && (!prepared.summary.duplicateGroups || state.grouped) && (!warnings.length || state.warningsReviewed);
  return `${pageHeader('IMPORT & PREPARE', 'Start with the original data', 'Read and validate both ATLAS.ti exports before creating your working project.', button('Load example project','load-example'))}${stepper()}
    ${state.importError ? `<div class="alert error" role="alert">${e(state.importError)}</div>` : ''}<div class="project-fields card"><label class="field"><span>Project name <small>required</small></span><input id="import-name" value="${e(state.importName)}" placeholder="e.g. Creativity and AI"></label><label class="field"><span>Reviewer name</span><input id="import-reviewer" value="${e(state.reviewer)}" placeholder="Your name"></label></div>
    <div class="import-grid">${importCard('quotation','Quotation Manager','Quotation identifiers, full text, source, and assigned codes.')}${importCard('codes','Code Manager','Code labels, hierarchy, groups, and original comments.')}</div>
    ${prepared ? `<section class="card"><div class="section-heading"><h2>Import validation</h2>${badge(blocking.length ? `${blocking.length} blocking errors` : 'Ready for your review',blocking.length ? 'red' : 'green')}</div><div class="mini-stats">${[['Quotations',prepared.summary.quotations],['Working code names',prepared.summary.codes],['Assignments',prepared.summary.assignments],['Sources',prepared.summary.sources]].map(([label,value]) => `<div><strong>${n(value)}</strong><span>${label}</span></div>`).join('')}</div>
    <div class="prep-controls"><label class="field"><span>Code delimiter</span><select id="delimiter"><option value="," ${prepared.delimiter === ',' ? 'selected' : ''}>Comma</option><option value=";" ${prepared.delimiter === ';' ? 'selected' : ''}>Semicolon</option></select></label><p class="fine">Raw values stay unchanged. Labels are matched using the imported codebook. ${n(prepared.summary.multiCode)} quotations have multiple codes.</p></div>
    ${issuesTable(prepared.issues)}${prepared.summary.duplicateGroups ? `<label class="check-row warning-check"><input type="checkbox" id="group-duplicates" ${state.grouped ? 'checked' : ''}><span>Group the ${prepared.summary.duplicateGroups} duplicate full-name groups into working codes.<small>The exports do not identify which duplicate row each quotation uses. All original rows are retained; no distinct assignments are inferred.</small></span></label>` : ''}
    ${warnings.length ? `<label class="check-row"><input type="checkbox" id="review-warnings" ${state.warningsReviewed ? 'checked' : ''}><span>I have reviewed the warnings and will retain the source records.</span></label>` : ''}
    <details class="preview-details"><summary>Preview prepared assignments</summary>${assignmentTable(prepared, prepared.assignments.slice(0,15))}<p class="fine">First 15 of ${n(prepared.assignments.length)} assignments. The full searchable table is available after preparation.</p></details><div class="section-footer"><span class="fine">${blocking.length ? 'Resolve the blocking errors to continue.' : !state.importName.trim() ? 'Enter a project name to continue.' : !ready ? 'Review and acknowledge the issues above.' : 'Ready to create a separate working project.'}</span>${button('Prepare data ' + icon('arrow'),'prepare','primary',ready ? '' : 'disabled')}</div></section>` : `<div class="notice">${icon('link')}<p>Both exports are required for this prototype. Files are read locally; preparing data never changes the originals.</p></div>`}`;
}
function issuesTable(issues) { return issues.length ? `<div class="table-wrap issue-table"><table><thead><tr><th>Issue</th><th>Location</th><th>What to review</th><th>Status</th></tr></thead><tbody>${issues.map(i => `<tr><td>${badge(i.severity === 'error' ? 'Blocking' : 'Warning',i.severity === 'error' ? 'red' : 'amber')}<strong>${e(i.type)}</strong></td><td>${e(i.file)}${i.row ? `<small>Row ${e(i.row)}</small>` : ''}</td><td>${e(i.message)}<small>${e(i.action)}</small></td><td>${e(i.status)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="success-line">${icon('check')} No validation issues found.</p>`; }
function assignmentTable(project, assignments) {
  const qs = new Map(project.quotations.map(q => [q.id,q])), cs = new Map(project.codes.map(c => [c.id,c]));
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Quotation</th><th>Text</th><th>Code</th><th>Source</th></tr></thead><tbody>${assignments.map(a => { const q = qs.get(a.quotationId), c = cs.get(a.codeId); return `<tr><td><span class="mono">${e(q.quotationId)}</span><small>Row ${q.sourceRow}</small></td><td><details><summary>${e(q.text.slice(0,140))}${q.text.length > 140 ? '…' : ''}</summary><p class="full-text">${e(q.text)}</p><small>${e(q.coder)} · ${e(q.created)}${q.note ? ' · ' + e(q.note) : ''}</small></details></td><td>${e(c.label)}</td><td>${e(q.source || 'Not provided')}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function pagination(page, total, size, key) { return `<div class="pagination"><span>${total ? n(page * size + 1) : 0}–${n(Math.min((page + 1) * size,total))} of ${n(total)}</span><div>${button('Previous','page','quiet',`data-key="${key}" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}`)}${button('Next','page','quiet',`data-key="${key}" data-page="${page + 1}" ${(page + 1) * size >= total ? 'disabled' : ''}`)}</div></div>`; }
function preparedDataView() {
  const project = p(), search = filter('dataSearch').toLowerCase(), source = filter('dataSource'), codeId = filter('dataCode'), mode = filter('dataMode','assignments');
  const matchQuotes = project.quotations.filter(q => (!source || q.source === source) && (!search || `${q.quotationId} ${q.text} ${q.note}`.toLowerCase().includes(search)));
  const ids = new Set(matchQuotes.map(q => q.id));
  let assignments = project.assignments.filter(a => ids.has(a.quotationId) && (!codeId || a.codeId === codeId));
  let quotations = codeId ? matchQuotes.filter(q => assignments.some(a => a.quotationId === q.id)) : matchQuotes;
  const total = mode === 'assignments' ? assignments.length : quotations.length, page = Math.min(Number(filter('dataPage',0)), Math.max(0,Math.ceil(total / 30) - 1));
  const sources = [...new Set(project.quotations.map(q => q.source))].sort();
  return `${pageHeader('PROJECT DATA', 'Your evidence, prepared', 'Search the working dataset. Original exports and their raw values remain preserved.', button(icon('download') + ' Export assignments','export-assignments'))}${stepper()}
    <div class="data-tabs"><button class="${mode === 'assignments' ? 'active' : ''}" data-action="data-mode" data-mode="assignments">Quotation–code assignments <span>${n(project.assignments.length)}</span></button><button class="${mode === 'quotations' ? 'active' : ''}" data-action="data-mode" data-mode="quotations">All quotations <span>${n(project.quotations.length)}</span></button></div>
    <section class="card table-card"><div class="toolbar"><label class="search">${icon('search')}<input id="data-search" data-filter="dataSearch" value="${e(filter('dataSearch'))}" placeholder="Search quotation text or ID" aria-label="Search quotations"></label><select id="data-source" data-filter="dataSource" aria-label="Filter by source"><option value="">All sources</option>${sources.map(s => `<option value="${e(s)}" ${s === source ? 'selected' : ''}>${e(s || 'No source')}</option>`).join('')}</select><select id="data-code" data-filter="dataCode" aria-label="Filter by code">${codeOptions(codeId).replace('Choose a code…','All codes')}</select></div>
    ${total ? mode === 'assignments' ? assignmentTable(project, assignments.slice(page * 30,(page + 1) * 30)) : `<div class="quotation-browse">${quotations.slice(page * 30,(page + 1) * 30).map(q => `<article><div class="quote-meta"><span class="mono">${e(q.quotationId)}</span><span>${e(q.source || 'No source')}</span></div><p class="full-text">${e(q.text)}</p><div class="chip-row">${project.assignments.filter(a => a.quotationId === q.id).map(a => `<span class="chip">${e(codeLabel(a.codeId))}</span>`).join('') || '<span class="muted">Uncoded quotation</span>'}</div><small>${e(q.coder)} · ${e(q.created)} · Source row ${q.sourceRow}</small>${q.note ? `<p>${e(q.note)}</p>` : ''}</article>`).join('')}</div>` : empty('No matching quotations','Try another search, source, or code.')}${pagination(page,total,30,'dataPage')}</section>
    <details class="card validation-record"><summary>Preparation record · ${project.preparation.issues.length} reviewed issues</summary><p class="fine">Prepared ${date(project.preparation.preparedAt)} · ${n(project.preparation.codeRows)} Code Manager rows · ${project.preparation.duplicateGroups} grouped duplicate names · ${e(project.preparation.delimiter === ',' ? 'Comma' : 'Semicolon')} code delimiter</p>${issuesTable(project.preparation.issues)}</details>`;
}

function codeList() {
  const counts = countsByCode(p()), query = filter('codeSearch').toLowerCase();
  const codes = activeCodes(p()).filter(c => !query || c.label.toLowerCase().includes(query)).sort((a,b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.label.localeCompare(b.label));
  const selected = selectedCode(), limit = Number(filter('codeLimit',60));
  return `<aside class="code-pane pane"><div class="pane-heading"><h2>Codes</h2><span>${n(codes.length)}</span></div><label class="search compact">${icon('search')}<input id="code-search" data-filter="codeSearch" value="${e(filter('codeSearch'))}" placeholder="Find a code…" aria-label="Find a code"></label><p class="list-caption">MOST QUOTATIONS FIRST</p><div class="code-items" data-scroll="codes">${selected && !codes.slice(0,limit).some(c => c.id === selected.id) ? codeListItem(selected,counts,true) : ''}${codes.slice(0,limit).map(c => codeListItem(c,counts)).join('')}${!codes.length ? '<p class="muted padded">No matching codes.</p>' : ''}${codes.length > limit ? button('Show more codes','more-codes','quiet full-width') : ''}</div><div class="pane-foot">Select a code to explore its evidence.</div></aside>`;
}
function codeListItem(code, counts, pinned = false) { return `<button class="code-item ${code.id === p().ui.codeId ? 'selected' : ''}" data-action="select-code" data-id="${code.id}" ${code.id === p().ui.codeId ? 'aria-current="true"' : ''}><span class="code-dot"></span><span>${e(code.label)}${pinned ? '<small>Current selection</small>' : ''}</span><small>${n(counts.get(code.id))}</small></button>`; }
function quoteCard(q, d) {
  const selected = d.evidenceIds.includes(q.id), classification = d.classifications[q.id] || {};
  const codes = p().assignments.filter(a => a.quotationId === q.id).map(a => codeLabel(a.codeId));
  return `<article class="quote-card ${selected ? 'chosen' : ''}"><div class="quote-meta"><span class="mono">${e(q.quotationId)}</span><span>${e(q.source || 'Source not provided')}</span><label class="evidence-toggle"><input type="checkbox" data-evidence="${q.id}" ${selected ? 'checked' : ''} aria-label="Use quotation ${e(q.quotationId)} as evidence"><span>Evidence</span></label></div><p class="quotation-text">${e(q.text)}</p><details class="quote-details"><summary>Source details & ${codes.length} assigned codes</summary><p>${e(q.coder || 'Creator not provided')} · ${e(q.created || 'Date not provided')} · Source row ${q.sourceRow}</p><div class="chip-row">${codes.map(c => `<span class="chip">${e(c)}</span>`).join('')}</div>${q.note ? `<p>${e(q.note)}</p>` : ''}</details>
    ${d.module === 'verification' ? `<div class="classification"><label class="field"><span>Quotation assessment</span><select data-classify="${q.id}"><option value="">Not assessed</option>${['Strong match','Borderline','Outlier'].map(v => `<option ${classification.rating === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="field"><span>Explanation</span><textarea id="class-note-${q.id}" data-classnote="${q.id}" placeholder="What supports this assessment?">${e(classification.note || '')}</textarea></label></div>` : ''}
    ${d.module === 'definition' ? `<label class="field representative"><span>Representative quotation</span><select data-representative="${q.id}"><option value="">Not selected as representative</option>${['Prototypical','Borderline','Atypical'].map(v => `<option ${d.representatives[q.id] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}</article>`;
}
function evidencePane(d) {
  const project = p(), code = selectedCode(), all = quotesFor(project, code.id), search = filter('evidenceSearch').toLowerCase(), type = filter('evidenceType');
  const filtered = all.filter(q => (!search || `${q.text} ${q.quotationId} ${q.source}`.toLowerCase().includes(search)) && (!type || type === 'selected' ? !type || d.evidenceIds.includes(q.id) : d.classifications[q.id]?.rating === type));
  const page = Math.min(Number(filter('evidencePage',0)),Math.max(0,Math.ceil(filtered.length / 12) - 1));
  return `<section class="evidence-pane pane"><div class="evidence-heading"><div><span class="eyebrow">${d.module === 'comparison' ? 'FIRST CODE' : 'QUOTATION EVIDENCE'}</span><h2>${e(code.label)}</h2><p>${n(all.length)} quotations ${code.parentId ? '· Child of ' + e(codeLabel(code.parentId)) : ''}</p></div>${badge(code.definition ? 'Definition available' : 'No approved definition',code.definition ? 'green' : '')}</div>
    ${d.module === 'comparison' ? `<div class="comparison-select"><label class="field"><span>Second code</span><select id="second-code">${codeOptions(project.ui.secondCodeId)}</select></label>${project.ui.secondCodeId === code.id ? '<p class="field-error">Choose two different codes to compare.</p>' : ''}</div>` : ''}
    <div class="evidence-tools"><label class="search compact">${icon('search')}<input id="evidence-search" data-filter="evidenceSearch" value="${e(filter('evidenceSearch'))}" placeholder="Search within quotations" aria-label="Search evidence"></label><select id="evidence-type" data-filter="evidenceType" aria-label="Filter evidence"><option value="">All quotations</option><option value="selected" ${type === 'selected' ? 'selected' : ''}>Selected evidence</option>${d.module === 'verification' ? ['Strong match','Borderline','Outlier'].map(t => `<option ${type === t ? 'selected' : ''}>${t}</option>`).join('') : ''}</select></div>
    <div class="evidence-body ${d.module === 'comparison' ? 'comparison-body' : ''}" data-scroll="evidence">${d.module === 'comparison' ? comparisonEvidence(d) : `<div class="definition-strip"><strong>Current definition</strong><p>${e(code.definition || code.importedComment || 'No definition yet. Read the evidence to establish the meaning of this code.')}</p>${code.boundary ? `<small>${e(code.boundary)}</small>` : ''}</div>${filtered.length ? filtered.slice(page * 12,(page + 1) * 12).map(q => quoteCard(q,d)).join('') : empty('No quotations to show','Change the filter, or select another code.')}${pagination(page,filtered.length,12,'evidencePage')}`}</div>
    <div class="pane-foot evidence-count">${icon('link')} ${d.evidenceIds.length} quotations selected as supporting evidence</div></section>`;
}
function comparisonEvidence(d) {
  return d.codeIds.map((cid,index) => {
    const code = p().codes.find(c => c.id === cid); if (!code) return '<p class="muted">Choose a second code.</p>';
    const query = filter('evidenceSearch').toLowerCase(), onlySelected = filter('evidenceType') === 'selected';
    const quotes = quotesFor(p(),cid).filter(q => (!query || `${q.text} ${q.quotationId} ${q.source}`.toLowerCase().includes(query)) && (!onlySelected || d.evidenceIds.includes(q.id)));
    const key = `comparePage${index}`, page = Math.min(Number(filter(key,0)),Math.max(0,Math.ceil(quotes.length / 8) - 1));
    return `<div class="compare-column"><div class="compare-code"><span class="eyebrow">CODE ${index + 1}</span><h3>${e(code.label)}</h3><small>${n(quotesFor(p(),cid).length)} quotations</small><p>${e(code.definition || code.importedComment || 'No approved definition')}</p>${code.boundary ? `<p>${e(code.boundary)}</p>` : ''}</div>${quotes.slice(page * 8,(page + 1) * 8).map(q => quoteCard(q,d)).join('')}${pagination(page,quotes.length,8,key)}</div>`;
  }).join('');
}
function assessmentForm(d) {
  if (d.module === 'coherence') return `${selectField('Coherence assessment','assessment',d.assessment,[['','Choose an assessment'],['Strong','Strong coherence'],['Moderate','Moderate coherence'],['Weak','Weak coherence']])}${field('Subgroup notes','subgroups',d.subgroups,{textarea:true,placeholder:'What patterns belong together? Which may be distinct?'})}${field('Recommendation','recommendation',d.recommendation,{textarea:true,placeholder:'What should happen next, and why?'})}`;
  if (d.module === 'verification') return `${selectField('Overall coding assessment','assessment',d.assessment,[['','Choose an assessment'],['Strong','Strong alignment'],['Moderate','Moderate alignment'],['Weak','Weak / misaligned']])}<p class="fine">Classify individual quotations in the evidence pane. ${Object.values(d.classifications).filter(c => c.rating).length} assessed so far.</p>${field('Recommendation','recommendation',d.recommendation,{textarea:true})}`;
  if (d.module === 'definition') return `${field('Core concept','core',d.core,{textarea:true,placeholder:'The central meaning of this code.'})}${field('Inclusion / exclusion rule','boundary',d.boundary,{textarea:true,placeholder:'Apply when… Exclude when…'})}<p class="word-count ${countWords(d.core + ' ' + d.boundary) > 50 ? 'field-error' : ''}" id="word-count">${countWords(d.core + ' ' + d.boundary)} / 50 words</p><p class="fine">Choose prototypical, borderline, and atypical quotations in the evidence pane to test the definition.</p>`;
  return `${field('Semantic overlap · 0–10','overlap',d.overlap,{extra:'type="number" min="0" max="10" step="1"'})}${field('Boundary explanation','explanation',d.explanation,{textarea:true,placeholder:'Where do the meanings overlap? What distinguishes them?'})}${field('Recommendation','recommendation',d.recommendation,{textarea:true,placeholder:'Keep separate, refine boundaries, or merge.'})}`;
}
function actionFields(d) {
  const options = [['keep',d.module === 'comparison' ? 'Keep codes separate' : 'Keep code as is'],['rename','Rename code'],['definition','Refine definition'],['subcode','Create subcode'],['split','Split code'],['merge','Merge codes'],['recode','Recode selected quotations']];
  let html = selectField('Proposed action','action',d.action,options);
  if (d.action === 'rename' || d.action === 'subcode') html += field(d.action === 'rename' ? 'New code name' : 'Subcode name','newLabel',d.newLabel);
  if (d.action === 'definition' && d.module !== 'definition') html += field('Core concept','newCore',d.newCore,{textarea:true}) + field('Inclusion / exclusion rule','newBoundary',d.newBoundary,{textarea:true}) + `<p class="fine" id="word-count">${countWords(d.newCore + ' ' + d.newBoundary)} / 50 words</p>`;
  if (d.action === 'split') html += `<label class="field"><span>First replacement code</span><input id="split-label-0" data-split-label="0" value="${e(d.splitLabels[0])}"></label><label class="field"><span>Second replacement code</span><input id="split-label-1" data-split-label="1" value="${e(d.splitLabels[1])}"></label><p class="fine">Assign quotations explicitly. Unassigned quotations retain their original code. New codes become children of the source.</p>${button('Assign quotations (' + Object.values(d.splitAssignments).filter(v => v !== '').length + ')','split-assignments','secondary full-width')}`;
  if (d.action === 'merge') html += `<label class="field"><span>${d.codeIds.length === 2 ? 'Surviving code' : 'Merge with / surviving code'}</span><select id="field-targetCodeId" data-draft="targetCodeId">${codeOptions(d.targetCodeId,{only:d.codeIds.length === 2 ? d.codeIds : null,exclude:d.codeIds.length === 2 ? [] : [d.codeIds[0]]})}</select></label>${field('Or create a new merged code','mergeNewLabel',d.mergeNewLabel,{placeholder:'Leave blank to use the surviving code'})}<p class="fine">Source codes remain in history. Their assignments move to the surviving or new code.</p>`;
  if (d.action === 'recode') html += selectField('Assignment operation','recodeMode',d.recodeMode,[['replace','Replace the current code'],['add','Add another code'],['remove','Remove the current code']]) + (d.recodeMode !== 'remove' ? `<label class="field"><span>Target code</span><select id="field-targetCodeId" data-draft="targetCodeId">${codeOptions(d.targetCodeId,{exclude:[d.codeIds[0]]})}</select></label>` : '') + `<p class="fine">Applies to the ${d.evidenceIds.length} selected evidence quotations. They must belong to the first code.</p>`;
  return html;
}
function reviewPanel(d) {
  return `<aside class="assessment-pane pane"><div class="pane-heading"><h2>Your assessment</h2>${badge(d.lastReviewId && d.stage === 7 ? 'Recorded' : 'Draft')}</div><div class="assessment-body" data-scroll="assessment"><section class="analysis-section"><div class="section-heading"><span class="eyebrow">ANALYSIS</span>${badge('Manual + examples')}</div><p class="fine">No AI backend is connected. Example findings are starting points for your own review.</p>
    ${state.providerBusy ? `<div class="button-row"><span class="spinner small"></span><span>Loading example…</span>${button('Cancel','cancel-analysis','quiet')}</div>` : button('Load example finding','analyze','secondary full-width')}${state.providerError ? `<p class="field-error" role="alert">${e(state.providerError)}</p>` : ''}
    ${d.finding ? `<div class="finding"><span class="eyebrow">EXAMPLE FINDING</span><h3>${e(d.finding.title)}</h3><p>${e(d.finding.interpretation)}</p><small>${e(d.finding.provenance)}</small>${button('Use as editable starting point','use-finding','quiet full-width')}</div>` : ''}</section><section class="assessment-section"><span class="eyebrow">RESEARCHER INTERPRETATION</span>${assessmentForm(d)}${field('Review note','note',d.note,{textarea:true,placeholder:'Additional context or uncertainty.'})}</section>
    <section class="decision-section"><span class="eyebrow">DECISION</span>${actionFields(d)}${field('Decision rationale <small>required</small>','rationale',d.rationale,{textarea:true,placeholder:'Explain your decision and how the evidence supports it.'})}<label class="field"><span>Reviewer <small>required to record</small></span><input id="reviewer-name" value="${e(p().reviewer)}" placeholder="Your name"></label><p class="fine">Preview the impact before any codebook or assignment changes are applied.</p>${button('Preview decision ' + icon('arrow'),'preview','primary full-width',d.module === 'comparison' && d.codeIds[0] === d.codeIds[1] ? 'disabled' : '')}<div class="decision-secondary">${button('Reject','reject','quiet')}${button('Defer','defer','quiet')}${button('Record note','record-note','quiet')}</div>${d.lastReviewId ? `<p class="success-line">${icon('check')} Recorded in history. Further decisions create new entries.</p>` : ''}</section></div></aside>`;
}
function reviewView() {
  if (!p()) return pageHeader('REVIEW','Review your coding','Start a project to connect your codes and evidence.') + empty('No prepared project yet','Import and prepare your exports, or use the supplied example.',button('Load example project','load-example','primary'));
  const d = draft();
  return `${pageHeader('REVIEW WORKSPACE','Read. Assess. Decide.', 'Keep the evidence and your interpretation side by side.')}${stepper()}<div class="module-tabs" role="group" aria-label="Review module">${Object.entries(MODULES).map(([key,m]) => `<button data-action="change-module" data-module="${key}" class="${d.module === key ? 'active' : ''}" aria-pressed="${d.module === key}">${m.short}</button>`).join('')}<span>${d.module === 'comparison' ? 'Selected pair' : 'Single code'}</span></div><div class="review-grid ${d.module === 'comparison' ? 'is-comparison' : ''}">${codeList()}${evidencePane(d)}${reviewPanel(d)}</div>`;
}

function codebookView() {
  if (!p()) return pageHeader('CODEBOOK','Your working codebook','Definitions, hierarchy, and evidence in one place.') + empty('No codebook yet','Prepare a project to browse its codes.',button('Import data','import-data','primary'));
  const project = p(), counts = countsByCode(project), query = filter('bookSearch').toLowerCase(), mode = filter('bookMode','all');
  const reviewedIds = new Set(project.reviews.filter(r => ['Approved','Implemented'].includes(r.status)).flatMap(r => r.codeIds));
  const matching = c => (!query || `${c.label} ${c.definition} ${c.boundary}`.toLowerCase().includes(query)) && (mode === 'all' ? c.active : mode === 'unused' ? c.active && !counts.get(c.id) : mode === 'defined' ? c.active && c.definition : mode === 'reviewed' ? c.active && reviewedIds.has(c.id) : !c.active);
  const sorted = [...project.codes].sort((a,b) => a.label.localeCompare(b.label));
  const ordered = [], visited = new Set();
  function walk(parentId, depth) { for (const c of sorted.filter(c => (c.parentId || null) === parentId)) { if (visited.has(c.id)) continue; visited.add(c.id); if (matching(c)) ordered.push({c,depth}); walk(c.id,depth + 1); } }
  walk(null,0); sorted.filter(c => !visited.has(c.id) && matching(c)).forEach(c => ordered.push({c,depth:0}));
  const page = Math.min(Number(filter('bookPage',0)),Math.max(0,Math.ceil(ordered.length / 35) - 1));
  return `${pageHeader('WORKING CODEBOOK','Meaning, structure, and context','Confirmed changes appear here. Every imported value remains recoverable from the source files.',button(icon('download') + ' Export codebook','export-codebook'))}<section class="card table-card"><div class="toolbar"><label class="search">${icon('search')}<input id="book-search" data-filter="bookSearch" value="${e(filter('bookSearch'))}" placeholder="Search names and definitions" aria-label="Search codebook"></label><select id="book-mode" data-filter="bookMode" aria-label="Filter codebook">${[['all','Active codes'],['unused','No quotations'],['defined','With definitions'],['reviewed','Reviewed'],['archived','Merged / archived']].map(([v,l]) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="fine">${n(ordered.length)} codes</span></div><div class="table-wrap"><table class="codebook-table"><thead><tr><th>Code & hierarchy</th><th>Definition & boundaries</th><th>Quotations</th><th>Review</th></tr></thead><tbody>${ordered.slice(page * 35,(page + 1) * 35).map(({c,depth}) => `<tr><td><div class="tree-label" style="padding-left:${Math.min(depth,5) * 18}px">${depth ? '<span class="branch">↳</span>' : '<span class="code-dot"></span>'}<strong>${e(c.label)}</strong></div>${c.parentId ? `<small>Parent: ${e(codeLabel(c.parentId))}</small>` : ''}<small>${c.sourceRows.length ? 'Source rows: ' + e(c.sourceRows.join(', ')) : 'Created in this workspace'}${c.mergedInto ? ' · Merged into ' + e(codeLabel(c.mergedInto)) : ''}</small></td><td>${c.definition ? `<p>${e(c.definition)}</p><small>${e(c.boundary)}</small>` : c.importedComment ? `<p>${e(c.importedComment)}</p><small>Imported comment; not an approved definition</small>` : '<span class="muted">No approved definition</span>'}</td><td class="mono">${n(counts.get(c.id))}</td><td>${c.active ? button('Review ' + icon('arrow'),'review-code','quiet',`data-id="${c.id}"`) : badge('Archived')}${reviewedIds.has(c.id) ? badge('Reviewed','green') : ''}</td></tr>`).join('')}</tbody></table></div>${!ordered.length ? empty('No matching codes','Try another search or filter.') : ''}${pagination(page,ordered.length,35,'bookPage')}</section>`;
}
function actionName(action) { return ({keep:'Keep code as is',rename:'Rename code',definition:'Refine definition',subcode:'Create subcode',split:'Split code',merge:'Merge codes',recode:'Recode quotations',reject:'Reject suggestion',defer:'Defer decision',note:'Review note'})[action] || action; }
function historyView() {
  if (!p()) return pageHeader('REVIEW HISTORY','Every decision has a context','Evidence, reasoning, and changes will appear together here.') + empty('No decisions yet','Start with a prepared project.');
  const query = filter('historySearch').toLowerCase(), status = filter('historyStatus');
  const history = p().history.filter(h => (!status || h.status === status) && (!query || `${h.rationale} ${actionName(h.action)} ${h.affectedCodeIds.map(codeLabel).join(' ')}`.toLowerCase().includes(query))).reverse();
  return `${pageHeader('REVIEW HISTORY','A record of your reasoning','Approved, rejected, and deferred decisions remain connected to their evidence.',button(icon('download') + ' Export history','export-history'))}${stepper()}<div class="toolbar history-toolbar"><label class="search">${icon('search')}<input id="history-search" data-filter="historySearch" value="${e(filter('historySearch'))}" placeholder="Search decisions, codes, or rationale" aria-label="Search history"></label><select id="history-status" data-filter="historyStatus" aria-label="Filter decisions"><option value="">All decisions</option>${['Implemented','Approved','Rejected','Deferred','Note'].map(s => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    ${history.length ? `<div class="history-list">${history.map(h => { const review = p().reviews.find(r => r.id === h.reviewId); return `<article class="card history-card"><div class="history-top"><span class="history-marker">${icon(h.status === 'Deferred' ? 'history' : 'check')}</span><div><h2>${e(actionName(h.action))}</h2><p>${e(h.affectedCodeIds.map(codeLabel).join(' · '))}</p></div>${badge(h.status,h.status === 'Implemented' ? 'green' : h.status === 'Deferred' ? 'amber' : '')}</div><p class="rationale">${e(h.rationale)}</p><div class="history-meta"><span>${e(h.reviewer)} · ${date(h.timestamp)}</span><span>${MODULES[review?.module]?.title || 'Review'} · ${h.evidenceIds.length} evidence quotations</span></div><details><summary>Evidence, assessment & change details</summary>${review ? `<div class="recorded-assessment">${review.assessment ? `<p><strong>Assessment:</strong> ${e(review.assessment)}</p>` : ''}${review.subgroups ? `<p><strong>Subgroups:</strong> ${e(review.subgroups)}</p>` : ''}${review.core ? `<p><strong>Proposed definition:</strong> ${e(review.core)} ${e(review.boundary)}</p>` : ''}${review.module === 'comparison' ? `<p><strong>Overlap:</strong> ${e(review.overlap)} / 10<br>${e(review.explanation)}</p>` : ''}${review.recommendation ? `<p><strong>Recommendation:</strong> ${e(review.recommendation)}</p>` : ''}${review.note ? `<p><strong>Note:</strong> ${e(review.note)}</p>` : ''}${review.finding ? `<p class="fine">Started from a labelled example finding.</p>` : ''}</div>` : ''}${changeDetails(h)}${h.evidenceIds.map(qid => { const q = p().quotations.find(q => q.id === qid); const classification = review?.classifications?.[qid]; return q ? `<blockquote class="history-quote"><span class="mono">${e(q.quotationId)} · ${e(q.source)}</span><p>${e(q.text)}</p>${classification?.rating ? `<small>${e(classification.rating)} — ${e(classification.note)}</small>` : ''}${review?.representatives?.[qid] ? `<small>${e(review.representatives[qid])}</small>` : ''}</blockquote>` : ''; }).join('')}</details>${h.status === 'Deferred' ? button('Reopen review','reopen-review','secondary',`data-id="${h.reviewId}"`) : ''}</article>`; }).join('')}</div>` : empty('No recorded decisions here yet','Complete a review to keep its evidence and rationale in your history.',button('Start reviewing','start-review','primary'))}`;
}
function changeDetails(change) {
  const changes = change.codeChanges || [], removed = change.removed || [], added = change.added || [];
  const codes = new Map([...(p()?.codes || []), ...(change.codes || []), ...changes.map(c => c.after)].map(c => [c.id,c]));
  const qs = new Map(p().quotations.map(q => [q.id,q]));
  return `${changes.length ? `<div class="change-table"><table><thead><tr><th>Before</th><th>After</th></tr></thead><tbody>${changes.map(({before,after}) => `<tr><td>${before ? `<strong>${e(before.label)}</strong><p>${e(before.definition)} ${e(before.boundary)}</p><small>${before.active ? 'Active' : 'Archived'}${before.parentLabel ? ' · Parent: ' + e(before.parentLabel) : ''}</small>` : '<em>New code</em>'}</td><td><strong>${e(after.label)}</strong><p>${e(after.definition)} ${e(after.boundary)}</p><small>${after.active ? 'Active' : 'Archived'}${after.parentLabel ? ' · Parent: ' + e(after.parentLabel) : ''}</small></td></tr>`).join('')}</tbody></table></div>` : '<p class="fine">No code values will change.</p>'}
    <p><strong>${n(removed.length)}</strong> assignments removed · <strong>${n(added.length)}</strong> assignments added</p>${removed.length + added.length ? `<details><summary>Inspect every affected assignment</summary><div class="table-wrap assignment-impact"><table><thead><tr><th>Operation</th><th>Quotation</th><th>Code</th></tr></thead><tbody>${[...removed.map(a => ({...a,op:'Remove'})),...added.map(a => ({...a,op:'Add'}))].map(a => `<tr><td>${a.op}</td><td>${e(qs.get(a.quotationId)?.quotationId)}</td><td>${e(codes.get(a.codeId)?.label)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
}

function openDialog(title, content, footer = '') {
  modal.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${content}</div>${footer ? `<div class="dialog-footer">${footer}</div>` : ''}`;
  if (!modal.open) modal.showModal();
}
function preview(resolution) {
  try {
    state.preview = previewDecision(p(),draft(),resolution);
    draft().stage = 6; persist(); render();
    const change = state.preview;
    openDialog(resolution === 'approve' ? 'Review the impact' : 'Record this decision', `<div class="preview-summary">${badge(actionName(change.action))}<p>${e(change.draft.rationale)}</p><small>Reviewer: ${e(p().reviewer)} · ${change.draft.evidenceIds.length} supporting quotations</small></div>${changeDetails(change)}<p class="notice-text">${resolution === 'approve' ? 'Confirming applies these changes to your local working project and records the decision. Original exports stay unchanged.' : 'This records your decision and rationale. The codebook and assignments stay unchanged.'}</p>`,button('Back to review','close-modal') + button('Confirm & record','confirm-decision','primary'));
  } catch(error) { showError(error.message); }
}
function showError(message) { toast(message); const previous = document.querySelector('.inline-review-error'); previous?.remove(); const target = document.querySelector('.decision-section'); if (target) { const node = document.createElement('p'); node.className = 'alert error inline-review-error'; node.setAttribute('role','alert'); node.textContent = message; target.prepend(node); node.scrollIntoView({block:'nearest'}); } }
function splitDialog(page = 0) {
  const d = draft(), qs = quotesFor(p(),d.codeIds[0]);
  openDialog('Assign quotations for the split', `<p>Choose a destination for each quotation you want to move. Everything else keeps its current code.</p><div class="split-list">${qs.slice(page * 15,(page + 1) * 15).map(q => `<article><span class="mono">${e(q.quotationId)}</span><p>${e(q.text)}</p><select data-split-assignment="${q.id}" aria-label="Destination for quotation ${e(q.quotationId)}"><option value="">Keep current code</option>${d.splitLabels.map((label,i) => `<option value="${i}" ${d.splitAssignments[q.id] === String(i) ? 'selected' : ''}>${e(label || 'Replacement code ' + (i + 1))}</option>`).join('')}</select></article>`).join('')}</div><div class="pagination"><span>${page * 15 + 1}–${Math.min((page + 1) * 15,qs.length)} of ${qs.length}</span><div>${button('Previous','split-page','quiet',`data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}`)}${button('Next','split-page','quiet',`data-page="${page + 1}" ${(page + 1) * 15 >= qs.length ? 'disabled' : ''}`)}</div></div>`,button('Done','close-modal','primary'));
}
function download(name, content, type = 'text/plain;charset=utf-8') { const url = URL.createObjectURL(new Blob([content],{type})); const link = document.createElement('a'); link.href = url; link.download = name; link.hidden = true; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000); }
function backup() { captureScroll(); download(`${p().name.replace(/[^a-z0-9_-]/gi,'-')}.althea.json`,JSON.stringify(p()),'application/json'); }
async function loadFile(file, kind) {
  const version = ++importVersions[kind];
  state.imports[kind] = null; state.prepared = null; state.importError = ''; render();
  try { const parsed = await readExport(new Uint8Array(await file.arrayBuffer()),file.name,kind); if (version !== importVersions[kind]) return; state.imports[kind] = parsed; recalculateImports(); }
  catch(error) { if (version !== importVersions[kind]) return; state.imports[kind] = null; state.prepared = null; state.importError = `Could not read ${file.name}: ${error.message}`; }
  render();
}
async function loadExample() {
  if (p()) await persist(true);
  state.project = null; state.view = 'data'; state.loading = true; state.loadingMessage = 'Opening the example project'; state.importError = ''; render(false);
  try {
    const files = await Promise.all([['quotation','quotations','Training Data - Quotation Manager.xlsx'],['codes','codes','Training Data - Code Manager.xlsx']].map(async ([kind,path,name]) => {
      const response = await fetch(`/samples/${path}.xlsx`); if (!response.ok) throw new Error(`The supplied ${kind} export could not be found.`);
      return [kind,await readExport(new Uint8Array(await response.arrayBuffer()),name,kind)];
    }));
    state.imports = Object.fromEntries(files); state.importName = 'Creativity & AI'; state.delimiter = ''; state.childColumn = undefined; recalculateImports();
  } catch(error) { state.importError = error.message; }
  finally { state.loading = false; render(false); }
}
async function analyze() {
  cancelAnalysis(); const d = draft();
  if (d.module === 'comparison' && d.codeIds[0] === d.codeIds[1]) { showError('Choose two different codes to compare.'); return; }
  d.stage = 4; state.providerBusy = true; state.analysisController = new AbortController(); const controller = state.analysisController;
  render();
  try {
    const finding = await exampleProvider.analyze({module:d.module,codeIds:d.codeIds,project:p(),signal:controller.signal});
    controller.signal.throwIfAborted();
    d.finding = finding; d.stage = 5;
    if (!finding) state.providerError = 'No curated finding is available for this selection. Continue with a manual assessment, or select Authenticity in the example project.';
    persist();
  } catch(error) { if (error.name !== 'AbortError') state.providerError = `The analysis provider could not complete: ${error.message}. Your manual review is still available.`; }
  finally { if (state.analysisController === controller) { state.providerBusy = false; state.analysisController = null; render(); } }
}
function restoreDialog() { openDialog('Restore a project backup', '<p>Choose an Althea JSON backup. It will be restored as a separate project so existing work is preserved.</p><label class="file-drop">' + icon('upload') + '<strong>Choose a project backup</strong><input type="file" id="backup-upload" accept=".json" aria-label="Project backup"></label>'); }
async function restoreFile(file) {
  try { if (file.size > 120 * 1024 * 1024) throw new Error('This backup exceeds the 120 MB limit.'); const restored = validateBackup(JSON.parse(await file.text())); if (p()) await persist(true); restored.id = id('project'); restored.name += ' (restored)'; restored.updatedAt = new Date().toISOString(); state.project = restored; state.view = ['overview','data','review','codebook','history'].includes(restored.ui.view) ? restored.ui.view : 'overview'; state.error = ''; modal.close(); await persist(true); render(false); toast('Project restored with originals, drafts, and history.'); } catch(error) { openDialog('Could not restore this backup',`<p class="alert error">${e(error.message)}</p>`,button('Choose another backup','restore','primary')); }
}
async function handleAction(action, node) {
  switch (action) {
    case 'home': go('overview'); break;
    case 'new-project': case 'import-data': if (p()) await persist(true); state.project = null; state.imports = {quotation:null,codes:null}; state.prepared = null; state.importName = ''; state.importError = ''; state.saveStatus = ''; state.delimiter = ''; state.childColumn = undefined; state.grouped = false; state.warningsReviewed = false; go('data'); break;
    case 'load-example': await loadExample(); break;
    case 'prepare': {
      if (state.prepared?.issues.some(i => i.severity === 'warning') && !state.warningsReviewed) throw new Error('Review the warnings before preparing.');
      state.project = createProject(state.importName,state.imports,state.prepared,state.reviewer,state.grouped); state.view = 'overview'; await persist(true); render(false); toast('Project prepared. Your original exports are preserved.'); break;
    }
    case 'projects': openDialog('Your saved projects',state.projects.length ? `<div class="project-grid">${state.projects.map(projectCard).join('')}</div>` : '<p>No saved projects yet.</p>',button('Restore backup','restore') + button('New project','new-project','primary')); break;
    case 'resume': if (p()) await persist(true); state.project = structuredClone(state.projects.find(project => project.id === node.dataset.id)); state.view = state.project.ui.view || 'overview'; state.error = ''; setSaveStatus('Saved on this browser'); modal.close(); render(false); break;
    case 'reviewer': openDialog('Reviewer settings',`<label class="field"><span>Your name</span><input id="settings-reviewer" value="${e(p()?.reviewer || state.reviewer)}" placeholder="Used in new review records"></label><p class="fine">Existing history keeps the reviewer recorded at the time.</p>`,button('Save name','save-reviewer','primary')); break;
    case 'save-reviewer': state.reviewer = document.querySelector('#settings-reviewer').value.trim(); if (p()) { p().reviewer = state.reviewer; persist(); } modal.close(); render(); break;
    case 'start-review': go('review'); break;
    case 'open-module': case 'change-module': cancelAnalysis(); p().ui.module = node.dataset.module; setFilter('evidenceType',''); setFilter('evidencePage',0); if (state.view !== 'review') go('review'); else { draft(); persist(); render(); } break;
    case 'select-code': case 'review-code': cancelAnalysis(); p().ui.codeId = node.dataset.id; setFilter('evidencePage',0); setFilter('evidenceSearch',''); setFilter('evidenceType',''); p().ui.scroll['review:evidence'] = 0; if (action === 'review-code') go('review'); else { persist(); render(false); } break;
    case 'more-codes': setFilter('codeLimit',Number(filter('codeLimit',60)) + 60); render(); break;
    case 'page': setFilter(node.dataset.key,Number(node.dataset.page)); if (node.dataset.key.startsWith('compare') || node.dataset.key === 'evidencePage') p().ui.scroll['review:evidence'] = 0; render(false); break;
    case 'data-mode': setFilter('dataMode',node.dataset.mode); setFilter('dataPage',0); render(); break;
    case 'analyze': await analyze(); break;
    case 'cancel-analysis': cancelAnalysis(); render(); break;
    case 'use-finding': { const d = draft(); Object.assign(d,structuredClone(d.finding.suggestedFields)); d.evidenceIds = [...new Set([...d.evidenceIds,...d.finding.evidenceIds])]; d.stage = 5; persist(); render(); break; }
    case 'preview': preview('approve'); break;
    case 'reject': preview('reject'); break;
    case 'defer': preview('defer'); break;
    case 'record-note': preview('note'); break;
    case 'confirm-decision': { const result = commitDecision(p(),state.preview); state.preview = null; modal.close(); await persist(true); render(); toast(`${result.status}: decision recorded in history.`); break; }
    case 'split-assignments': splitDialog(); break;
    case 'split-page': splitDialog(Number(node.dataset.page)); break;
    case 'close-modal': modal.close(); state.preview = null; render(); break;
    case 'backup': backup(); break;
    case 'restore': restoreDialog(); break;
    case 'download-source': { const file = p().imports[node.dataset.kind]; download(file.name,Uint8Array.from(atob(file.bytes),c => c.charCodeAt(0)),'application/octet-stream'); break; }
    case 'export-assignments': { const qs = new Map(p().quotations.map(q => [q.id,q])), cs = new Map(p().codes.map(c => [c.id,c])); download('quotation_per_code.csv',csv(['quotation_id','text','code','source','coder','created','note'],p().assignments.map(a => { const q = qs.get(a.quotationId), c = cs.get(a.codeId); return [q.quotationId,q.text,c.label,q.source,q.coder,q.created,[q.note,c.importedComment].filter(Boolean).join('\n')]; })),'text/csv;charset=utf-8'); break; }
    case 'export-codebook': { const counts = countsByCode(p()); download('althea_codebook.csv',csv(['code_id','code','parent','core_concept','boundary','imported_comment','groups','quotations','status','active','source_rows'],p().codes.map(c => [c.id,c.label,c.parentLabel,c.definition,c.boundary,c.importedComment,c.groups,counts.get(c.id) || 0,c.status,c.active,c.sourceRows.join('; ')])),'text/csv;charset=utf-8'); break; }
    case 'export-history': download('althea_decisions.csv',csv(['action_id','review_id','action','status','reviewer','timestamp','rationale','evidence_ids','affected_codes','code_changes','removed_assignments','added_assignments','assessment'],p().history.map(h => [h.id,h.reviewId,h.action,h.status,h.reviewer,h.timestamp,h.rationale,h.evidenceIds.join('; '),h.affectedCodeIds.join('; '),JSON.stringify(h.codeChanges),JSON.stringify(h.removed),JSON.stringify(h.added),JSON.stringify(p().reviews.find(r => r.id === h.reviewId))])),'text/csv;charset=utf-8'); break;
    case 'reopen-review': { const review = p().reviews.find(r => r.id === node.dataset.id); if (review.codeIds.some(cid => !activeCodes(p()).some(c => c.id === cid))) throw new Error('One of these codes has since been merged. Start a new review of its surviving code.'); p().ui.module = review.module; p().ui.codeId = review.codeIds[0]; p().ui.secondCodeId = review.codeIds[1] || p().ui.secondCodeId; p().drafts[draftKey(review.module,review.codeIds)] = {...structuredClone(review),stage:5,lastReviewId:review.id}; go('review'); break; }
  }
  if (modal.open && ['new-project','import-data'].includes(action)) modal.close();
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]'); if (nav) { event.preventDefault(); go(nav.dataset.view); return; }
  const node = event.target.closest('[data-action]'); if (!node || node.disabled) return;
  event.preventDefault();
  try { await handleAction(node.dataset.action,node); } catch(error) { showError(error.message); }
});
document.addEventListener('input', event => {
  const node = event.target;
  if (node.dataset.draft) { const d = draft(); d[node.dataset.draft] = node.value; d.stage = Math.max(5,Math.min(d.stage,6)); persist(); if (node.tagName === 'SELECT') render(); else if (['core','boundary','newCore','newBoundary'].includes(node.dataset.draft)) { const count = countWords(d.module === 'definition' ? d.core + ' ' + d.boundary : d.newCore + ' ' + d.newBoundary); const label = document.querySelector('#word-count'); if (label) { label.textContent = `${count} / 50 words`; label.classList.toggle('field-error',count > 50); } } }
  if (node.dataset.filter) { const key = node.dataset.filter; setFilter(key,node.value); if (key.startsWith('data')) setFilter('dataPage',0); if (key.startsWith('book')) setFilter('bookPage',0); if (key.startsWith('evidence')) { setFilter('evidencePage',0); setFilter('comparePage0',0); setFilter('comparePage1',0); } clearTimeout(state.filterTimer); state.filterTimer = setTimeout(() => render(),node.tagName === 'SELECT' ? 0 : 180); }
  if (node.id === 'import-name') { state.importName = node.value; const btn = document.querySelector('[data-action="prepare"]'); if (btn) btn.disabled = !state.importName.trim() || state.prepared.issues.some(i => i.severity === 'error') || (state.prepared.summary.duplicateGroups && !state.grouped) || (state.prepared.issues.some(i => i.severity === 'warning') && !state.warningsReviewed); }
  if (node.id === 'import-reviewer') state.reviewer = node.value;
  if (node.id === 'reviewer-name') { p().reviewer = node.value; state.reviewer = node.value; persist(); }
  if (node.dataset.classnote) { const d = draft(); d.classifications[node.dataset.classnote] ||= {}; d.classifications[node.dataset.classnote].note = node.value; persist(); }
  if (node.dataset.splitLabel !== undefined) { draft().splitLabels[Number(node.dataset.splitLabel)] = node.value; persist(); }
});
document.addEventListener('change', async event => {
  const node = event.target;
  try {
    if (node.dataset.file && node.files[0]) await loadFile(node.files[0],node.dataset.file);
    if (node.id === 'backup-upload' && node.files[0]) await restoreFile(node.files[0]);
    if (node.dataset.mapping) { const [kind,key] = node.dataset.mapping.split(':'); state.imports[kind].mapping[key] = Number(node.value); recalculateImports(); render(); }
    if (node.id === 'delimiter') { state.delimiter = node.value; recalculateImports(); render(); }
    if (node.id === 'child-column') { state.childColumn = Number(node.value); recalculateImports(); render(); }
    if (node.id === 'group-duplicates') { state.grouped = node.checked; render(); }
    if (node.id === 'review-warnings') { state.warningsReviewed = node.checked; render(); }
    if (node.dataset.evidence) { const d = draft(), qid = node.dataset.evidence; d.evidenceIds = node.checked ? [...new Set([...d.evidenceIds,qid])] : d.evidenceIds.filter(x => x !== qid); d.stage = 5; persist(); render(); }
    if (node.dataset.classify) { const d = draft(); d.classifications[node.dataset.classify] ||= {}; d.classifications[node.dataset.classify].rating = node.value; d.stage = 5; persist(); render(); }
    if (node.dataset.representative) { const d = draft(); d.representatives[node.dataset.representative] = node.value; if (node.value && !d.evidenceIds.includes(node.dataset.representative)) d.evidenceIds.push(node.dataset.representative); persist(); render(); }
    if (node.id === 'second-code') { cancelAnalysis(); p().ui.secondCodeId = node.value; persist(); render(); }
    if (node.dataset.splitAssignment) { draft().splitAssignments[node.dataset.splitAssignment] = node.value; persist(); }
  } catch(error) { toast(error.message); }
});
document.addEventListener('dragover', event => { if (event.target.closest('[data-drop]')) { event.preventDefault(); event.target.closest('[data-drop]').classList.add('dragging'); } });
document.addEventListener('dragleave', event => event.target.closest('[data-drop]')?.classList.remove('dragging'));
document.addEventListener('drop', async event => { const target = event.target.closest('[data-drop]'); if (!target) return; event.preventDefault(); target.classList.remove('dragging'); if (event.dataTransfer.files[0]) await loadFile(event.dataTransfer.files[0],target.dataset.drop); });
document.addEventListener('visibilitychange', () => { if (document.hidden && p()) { captureScroll(); persist(true); } });
window.addEventListener('beforeunload', event => { if (state.saveStatus === 'Not saved' || state.saveStatus === 'Saving…') { event.preventDefault(); event.returnValue = ''; } });
modal.addEventListener('cancel', () => { state.preview = null; });

try { state.projects = await allProjects(); if (state.projects.length) { state.project = structuredClone(state.projects[0]); state.view = state.project.ui.view || 'overview'; state.saveStatus = 'Saved on this browser'; state.reviewer = state.project.reviewer; } }
catch(error) { state.error = 'Browser storage is unavailable. You can still work and download project backups. ' + error.message; }
render(false);
