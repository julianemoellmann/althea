import { readExport, prepareImports, groupIssues, ISSUE_HELP, requiredFields, csv, workbook } from './data.js';
import { MODULES, SCOPES, ACTIONS, STATUSES, id, countWords, activeCodes, countsByCode, quotesFor, createProject, prepareProject, isPrepared, draftKey, emptyDraft, previewDecision, commitDecision, saveReview, moveQuotation, uncodeQuotation, reopenSuggestion, deferredSuggestions, normalStatus, statusLabel, validateBackup, finalQuotationSheets, finalCodebookSheets } from './model.js';
import { allProjects, saveProject, deleteProject, deleteAllProjects, storageWorks } from './storage.js';
import { exampleProvider } from './analysis.js';
import { simulationProviders } from './verification.js';
import { piProvider, piAvailable, piSettings, savePiSettings } from './pi-provider.js';
import { ORIENTATIONS, ORIENTATION_HELP } from './orientations.js';

const app = document.querySelector('#app'), modal = document.querySelector('#modal');
const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const n = value => Number(value || 0).toLocaleString();
const date = value => value ? new Date(value).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' }) : '—';
const plural = (count, word, many = word + 's') => `${n(count)} ${count === 1 ? word : many}`;
const paths = {
  overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  data:'M4 4h16v16H4zM4 9h16M9 4v16M4 14h16', review:'M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5',
  codebook:'M3 5c3-2 6-2 9 0 3-2 6-2 9 0v15c-3-2-6-2-9 0-3-2-6-2-9 0zM12 5v15',
  history:'M4 8a9 9 0 1 1-1 8M3 3v6h6M12 7v6l4 2', arrow:'M5 12h14M13 6l6 6-6 6', back:'M19 12H5M11 6l-6 6 6 6',
  plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  folder:'M3 6V4h7l2 3h9v13H3z', chevron:'m6 9 6 6 6-6', close:'m6 6 12 12M6 18 18 6', settings:'M4 7h16M4 17h16M8 4v6M16 14v6',
  link:'M10 14 14 10M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l5-5a3 3 0 0 0-4-4l-2 2',
};
const icon = name => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.review}"/></svg>`;
const button = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const badge = (label, cls = '') => `<span class="badge ${cls}" data-status="${e(label)}">${e(label)}</span>`;
const MODULE_ICONS = { coherence:'Internal Code Coherence', verification:'Verifying Coding', definition:'Creating Code Definitions' };
// The icons are alpha masks, so they take the colour of the surrounding text on light and dark surfaces.
const assetIcon = name => `<span class="asset-icon" style="--icon:url('/Assets/icons/${name.toLowerCase().replaceAll(' ','-')}.png')" aria-hidden="true"></span>`;
// The Althea mark (Assets/althea-mark.svg) inline, so the sidebar can show the light version.
const LOGO = '<svg class="brand-logo" viewBox="0 0 48 48" aria-hidden="true"><path class="mark-bracket" d="M4 4.5h12.7v3.3H7.7v31.9h9V43H4z"/><path class="mark-box" d="M23.3 10.5H45v26.3H23.3v-3.6H26v.9h15.3V13.2H26v1.3h-2.7zM11.7 17h20v3.2h-20zM11.7 22.5h26.5v3.2H11.7zM11.7 28h20v3.2h-20z"/></svg>';
const STAGES = [['import','Import'],['prepare','Prepare'],['scope','Scope'],['review','Review']];
const RECORDS = [['codebook','Codebook'],['history','History']];
const VIEWS = ['import','prepare','scope','review','confirm','codebook','history'];
const state = { quoteError:null, project: null, projects: [], view: 'import', imports: { quotation:null, codes:null }, prepared:null, importName:'', reviewer:'', grouped:false, delimiter:'', childColumn:undefined, loading:false, loadingMessage:'', error:'', saveStatus:'', importErrors:{}, providerBusy:false, providerError:'', analysisController:null, filterTimer:null, pi:{ available:false } };
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
  for (const node of document.querySelectorAll('[data-scroll]')) p().ui.scroll[`${state.view}:${node.dataset.scroll}`] = node.scrollTop;
}
function restoreScroll() { if (p()) for (const node of app.querySelectorAll('[data-scroll]')) node.scrollTop = p().ui.scroll?.[`${state.view}:${node.dataset.scroll}`] || 0; }
function filter(key, fallback = '') { return p()?.ui.filters?.[key] ?? fallback; }
function setFilter(key, value) { if (p()) { p().ui.filters[key] = value; persist(); } }
// The prototype implements the single-code scope only, so every draft concerns one code.
function draft() {
  const project = p(); if (!project) return null;
  if (!['coherence','verification','definition'].includes(project.ui.module)) project.ui.module = 'verification';
  const codes = activeCodes(project);
  if (!codes.some(c => c.id === project.ui.codeId)) project.ui.codeId = codes[0]?.id || '';
  const ids = [project.ui.codeId], key = draftKey(project.ui.module, ids);
  const d = project.drafts[key] ||= emptyDraft(project, project.ui.module, ids);
  // Moves saved before they were applied on save become unsaved edits, so one Save applies them.
  for (const [qid, x] of Object.entries(d.quotationDecisions || {})) if (x.choice !== 'keep') { (d.quotationDrafts ||= {})[qid] ||= { rating:d.classifications[qid]?.rating || '', ...x }; delete d.quotationDecisions[qid]; }
  return d;
}
function cancelAnalysis() { state.analysisController?.abort(); state.analysisController = null; state.providerBusy = false; state.providerError = ''; }
// Each stage needs the one before it; the researcher can always go back without losing work.
function blockedReason(view) {
  if (view === 'import') return '';
  if (!p()) return 'Create a project first.';
  if (['scope','review','confirm'].includes(view) && !isPrepared(p())) return 'Prepare the data first.';
  return '';
}
function go(view) {
  const reason = blockedReason(view); if (reason) { toast(reason); return; }
  cancelAnalysis(); clearTimeout(state.filterTimer); captureScroll(); state.view = view; if (modal.open) modal.close();
  if (p()) { p().ui.view = view; persist(); }
  render(false); window.scrollTo(0, 0); document.querySelector('#page-title')?.focus({ preventScroll:true });
}
function selectedCode() { return p()?.codes.find(c => c.id === p().ui.codeId); }
function codeLabel(cid) { return p()?.codes.find(c => c.id === cid)?.label || cid; }
function codeOptions(selected = '', { exclude = [], only = null, placeholder = 'Choose a code…' } = {}) {
  return `<option value="">${placeholder}</option>` + activeCodes(p()).filter(c => !exclude.includes(c.id) && (!only || only.includes(c.id))).sort((a,b) => a.label.localeCompare(b.label)).map(c => `<option value="${e(c.id)}" ${c.id === selected ? 'selected' : ''}>${e(c.label)}</option>`).join('');
}
function field(label, name, value, { textarea = false, placeholder = '', extra = '', cls = '' } = {}) {
  return `<label class="field ${cls}"><span>${label}</span>${textarea ? `<textarea id="field-${name}" data-draft="${name}" placeholder="${e(placeholder)}" ${extra}>${e(value)}</textarea>` : `<input id="field-${name}" data-draft="${name}" value="${e(value)}" placeholder="${e(placeholder)}" ${extra}>`}</label>`;
}
function selectField(label, name, value, options) { return `<label class="field"><span>${label}</span><select id="field-${name}" data-draft="${name}">${options.map(([v,l]) => `<option value="${e(v)}" ${String(value) === String(v) ? 'selected' : ''}>${e(l)}</option>`).join('')}</select></label>`; }
function empty(title, text, action = '') { return `<div class="empty"><div class="empty-icon">${icon('folder')}</div><h3>${title}</h3><p>${text}</p>${action}</div>`; }
function pageHeader(kicker, title, description, actions = '') { return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1 id="page-title" tabindex="-1">${title}</h1><p class="muted">${description}</p></div><div class="heading-actions">${actions}</div></div>`; }
function fileLabel(file) { return file === p()?.imports.codes.name || file === state.imports.codes?.name || file === 'codes' ? 'Code Manager' : 'Quotation Manager'; }
function reason(text) { return text?.trim() ? `<p class="rationale">${e(text)}</p>` : '<p class="rationale muted">No reason given.</p>'; }
function statusBadge(label) { return badge(label, label === 'Approved and applied' ? 'green' : ''); }
// The status a code shows elsewhere comes from its most recent suggestion.
function codeStatus(codeId) {
  const drafts = Object.values(p()?.drafts || {}).filter(d => d.codeIds[0] === codeId && d.reviewStatus);
  const latest = drafts.sort((a,b) => String(b.resolvedAt || b.finding?.timestamp || '').localeCompare(String(a.resolvedAt || a.finding?.timestamp || '')))[0];
  return latest ? statusLabel(latest) : 'Not reviewed';
}
function openSuggestion(d) { p().ui.module = d.module; p().ui.codeId = d.codeIds[0]; }

function render(preserve = true) {
  const focused = document.activeElement, focusedId = focused?.id, selection = typeof focused?.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
  if (preserve) captureScroll();
  const current = state.view === 'confirm' ? 'review' : state.view;
  const deferred = p() ? deferredSuggestions(p()).length : 0;
  const navItem = ([key,label], i) => { const reason = blockedReason(key); return `<button class="nav-item ${current === key ? 'active' : ''}" data-view="${key}" aria-label="${i !== undefined ? `Step ${i + 1}: ` : ''}${label}${reason ? ` (${reason})` : ''}" title="${reason || label}" ${current === key ? 'aria-current="page"' : ''} ${reason ? 'disabled' : ''}>${i !== undefined ? `<b class="stage-num">${i + 1}</b>` : assetIcon(label)}<span>${label}</span>${key === 'history' && deferred ? `<small>${deferred}</small>` : ''}</button>`; };
  const title = [...STAGES,...RECORDS].find(([key]) => key === current)?.[1];
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="home" aria-label="Althea: start or switch project">${LOGO}<span class="brand-word">Althea</span></a>
    <button class="project-switch" data-action="projects" title="${e(p()?.name || 'New project')}" aria-label="Saved projects: ${e(p()?.name || 'New project')}"><span class="project-avatar">${e((p()?.name || 'N').slice(0,1).toUpperCase())}</span><span><strong>${e(p()?.name || 'New project')}</strong></span><span class="switch-chevron">${icon('chevron')}</span></button>
    <p class="nav-label">WORKFLOW</p><nav aria-label="Workflow stages">${STAGES.map(navItem).join('')}</nav>
    <p class="nav-label">PROJECT RECORD</p><nav aria-label="Project record">${RECORDS.map(item => navItem(item)).join('')}</nav>
    <div class="sidebar-bottom"><div class="local-label"><span class="status-dot"></span> Local workspace</div><p>Your research stays on this device. Nothing is written back to ATLAS.ti.</p>${button(icon('plus') + ' New project', 'new-project', 'sidebar-btn')}<button class="text-button" data-action="projects">${icon('folder')} Saved projects</button></div></aside>
    <div class="workspace"><header class="topbar">${button("Menu","open-navigation","quiet menu-trigger")}<div class="breadcrumb">${e(p()?.name || 'New project')} <span>/</span> <strong>${e(title)}</strong></div><div class="topbar-right">${deferred ? `<button class="deferred-chip" data-action="show-deferred">${plural(deferred,'deferred decision')}</button>` : ''}<span class="save-state" id="save-state">${e(state.saveStatus || 'Local prototype')}</span>${p() ? button(icon('download') + '<span>Backup project</span>', 'backup', 'quiet', 'aria-label="Backup project"') : ''}<button class="reviewer-avatar" data-action="reviewer" title="Settings · Researcher: ${e(p()?.reviewer || state.reviewer || 'not set')}" aria-label="Settings">${e((p()?.reviewer || state.reviewer || 'R').slice(0,1).toUpperCase())}</button></div></header>
    ${state.error ? `<div id="save-error" class="alert error">${e(state.error)} ${p() ? button('Download backup','backup','secondary') : ''}</div>` : ''}
    <main id="main" class="main" data-scroll="main">${state.loading ? `<div class="loading"><span class="spinner"></span><h2>${e(state.loadingMessage)}</h2><p>Reading the exports on your device.</p></div>` : ({ import:importView, prepare:prepareView, scope:scopeView, review:reviewView, confirm:confirmView, codebook:codebookView, history:historyView }[state.view] || importView)()}</main></div>`;
  restoreScroll();
  if (focusedId) { const target = (modal.open ? modal : document).querySelector('#' + CSS.escape(focusedId)); if (target) { target.focus({ preventScroll:true }); if (selection && typeof target.setSelectionRange === 'function' && !['number','range','file','checkbox','radio'].includes(target.type)) target.setSelectionRange(...selection); } }
}

// ---- Step 1 · Import -------------------------------------------------------------------------
function createReady() {
  const prepared = state.prepared;
  if (!state.imports.quotation || !state.imports.codes) return 'Upload both exports to continue.';
  if (prepared.issues.some(i => i.severity === 'error')) return 'Fix the blocking errors and upload the file again.';
  if (!state.importName.trim()) return 'Enter a project name to continue.';
  if (prepared.summary.duplicateGroups && !state.grouped) return 'Confirm how duplicate code names are grouped.';
  return '';
}
function fileCard(kind) {
  const file = state.imports[kind], title = kind === 'codes' ? 'Code Manager export' : 'Quotation Manager export', error = state.importErrors[kind];
  const issues = file && state.prepared ? state.prepared.issues.filter(i => i.file === file.name || i.file === kind) : [];
  const blocking = issues.filter(i => i.severity === 'error'), warnings = issues.filter(i => i.severity === 'warning');
  const status = error ? badge('Blocking error','red') : !file ? badge('No file selected') : blocking.length ? badge(`Blocking error · ${blocking.length}`,'red') : !state.prepared ? badge('File read') : badge(warnings.length ? `Valid · ${plural(warnings.length,'warning')}` : 'Valid','green');
  const required = file ? requiredFields[kind].map(f => file.mapping[f] >= 0 ? file.headers[file.mapping[f]] : null) : [];
  const rows = file ? file.rows.filter(r => r.some(Boolean)).length : 0;
  const info = error ? e(error) : !file ? (kind === 'codes' ? 'Code labels, hierarchy and comments. XLSX or CSV, up to 25 MB.' : 'Quotation IDs, full text, source and assigned codes. XLSX or CSV, up to 25 MB.')
    : required.every(Boolean) ? `Required column${required.length > 1 ? 's' : ''} found: ${required.map(e).join(', ')}. ${plural(rows, kind === 'codes' ? 'code row' : 'quotation')} read.${!state.prepared ? ' Waiting for the other export.' : ''}`
    : `Required column missing: ${requiredFields[kind].filter((f,i) => !required[i]).join(', ')}. Correct the export in ATLAS.ti and upload it again.`;
  return `<section class="card file-card ${blocking.length || error ? 'has-error' : ''}" data-drop="${kind}"><div class="file-card-top"><h2>${title}</h2>${status}</div>
    <div class="file-row"><span class="mono">${file ? e(file.name) : 'No file selected'}</span><label class="btn secondary file-button">${file ? 'Replace file' : icon('upload') + ' Choose file'}<input type="file" id="upload-${kind}" data-file="${kind}" accept=".xlsx,.csv" aria-label="${title}"></label></div>
    <p class="fine">${info}</p>${fileIssues(issues)}
    </section>`;
}
// Blocking errors and warnings are listed where the file is shown, grouped as on the Prepare screen.
function fileIssues(issues) {
  return issues.length ? `<ul class="file-issues">${groupIssues(issues).map(g => `<li class="${g.severity === 'error' ? 'is-error' : 'is-warning'}">${badge(g.severity === 'error' ? 'Blocking' : 'Warning',g.severity === 'error' ? 'red' : 'amber')}<span><strong>${e(g.type)}${g.count > 1 ? ` · ${n(g.count)} occurrences` : ''}</strong>${g.where.length ? `<span class="issue-where">${whereList(g)}</span>` : g.messages.length === 1 ? `<span>${e(g.messages[0])}</span>` : ''}${ISSUE_HELP[g.type] ? `<span class="issue-help">${e(ISSUE_HELP[g.type])}</span>` : ''}<span class="fine"><strong>What to do:</strong> ${e(g.action)}</span></span></li>`).join('')}</ul>` : '';
}
function importSummary(summary, issues) {
  const blocking = issues.filter(i => i.severity === 'error').length, warnings = issues.length - blocking;
  return `<section class="card"><p class="eyebrow">IMPORT SUMMARY</p><div class="summary-grid">${[['Quotations',summary.quotations],['Codes',summary.codes],['Quotations with multiple codes',summary.multiCode]].map(([label,value]) => `<div><strong>${value === undefined ? '—' : n(value)}</strong><span>${label}</span></div>`).join('')}<div><strong class="${warnings && !blocking ? 'warn-number' : blocking ? 'error-number' : ''}">${n(blocking + warnings)}</strong><span>Issues: ${n(blocking)} blocking, ${plural(warnings,'warning')}</span></div></div></section>`;
}
function importView() {
  if (p()) {
    const project = p();
    return `${pageHeader('STEP 1 · IMPORT', e(project.name), `Created ${date(project.createdAt)}${project.reviewer ? ' by ' + e(project.reviewer) : ''}. The original exports are kept unchanged inside the project.`, `<button class="btn primary" data-view="prepare">Continue to prepare ${icon('arrow')}</button>`)}
      <div class="split-layout"><div class="stack">${Object.entries(project.imports).map(([kind,f]) => `<section class="card file-card"><div class="file-card-top"><h2>${kind === 'codes' ? 'Code Manager export' : 'Quotation Manager export'}</h2>${badge('Imported','green')}</div><div class="file-row"><span class="mono">${e(f.name)}</span><button class="btn secondary" data-action="download-source" data-kind="${kind}">${icon('download')} Download original</button></div><p class="fine">${e(f.sheetName)} · ${n(f.rows.length)} source rows${f.metadata.Project ? ' · ATLAS.ti project “' + e(f.metadata.Project) + '”' : ''}</p>${fileIssues(project.preparation.issues.filter(i => i.file === f.name || i.file === kind))}</section>`).join('')}
      <div class="notice">${icon('link')}<p>To import corrected exports, start a new project. This one keeps its data, reviews and history.</p>${button(icon('plus') + ' New project','new-project')}</div></div>
      <aside class="stack">${importSummary(project.preparation, project.preparation.issues)}${savedProjects()}</aside></div>`;
  }
  const prepared = state.prepared, reason = createReady();
  const q = state.imports.quotation;
  return `${pageHeader('STEP 1 · IMPORT', 'Start a project', 'Upload the two ATLAS.ti exports. Althea checks them before anything else happens, and never changes the original files.', button('Load example project','load-example'))}
    <div class="split-layout"><form class="stack" onsubmit="return false"><div class="card name-fields"><label class="field"><span>Project name <small>required</small></span><input id="import-name" value="${e(state.importName)}" placeholder="e.g. Creativity and AI"></label><label class="field"><span>Your name</span><input id="import-reviewer" value="${e(state.reviewer)}" placeholder="Recorded with each decision"></label></div>
      ${fileCard('quotation')}${fileCard('codes')}
      ${prepared?.summary.duplicateGroups ? `<label class="check-row warning-check"><input type="checkbox" id="group-duplicates" ${state.grouped ? 'checked' : ''}><span>Group the ${prepared.summary.duplicateGroups} duplicate code names into working codes.<small>The exports do not say which duplicate row each quotation uses. All original rows are kept; no distinct assignments are inferred.</small></span></label>` : ''}
      <div class="create-row">${button('Create project','create-project','primary',reason ? 'disabled' : '')}<p class="fine" id="create-reason">${reason || 'Available because a name is entered and both files passed validation.'}</p></div></form>
      <aside class="stack">${importSummary(prepared?.summary || {}, prepared?.issues || [])}
      ${q ? `<section class="card"><p class="eyebrow">DATA PREVIEW · QUOTATION MANAGER</p><div class="table-wrap"><table class="data-table compact-table"><thead><tr><th>${e(q.headers[q.mapping.id] || 'Number')}</th><th>${e(q.headers[q.mapping.text] || 'Text')}</th><th>${e(q.headers[q.mapping.codes] || 'Codes')}</th></tr></thead><tbody>${q.rows.filter(r => r.some(Boolean)).slice(0,3).map(r => `<tr><td class="mono">${e(r[q.mapping.id])}</td><td>${e(String(r[q.mapping.text] ?? '').slice(0,110))}${String(r[q.mapping.text] ?? '').length > 110 ? '…' : ''}</td><td>${e(r[q.mapping.codes]) || '<span class="muted">Blank</span>'}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
      ${savedProjects()}</aside></div>`;
}
function savedProjects() {
  const others = state.projects.filter(x => x.id !== p()?.id);
  return others.length ? `<section class="card"><p class="eyebrow">CONTINUE A PROJECT</p><div class="project-list">${others.slice(0,5).map(projectCard).join('')}</div>${button('Restore a backup','restore','quiet')}</section>` : `<p class="restore-note">Already have a backup? <button class="text-button inline" data-action="restore">Restore a project</button></p>`;
}
function projectCard(project) { return `<button class="project-card" data-action="resume" data-id="${e(project.id)}">${icon('folder')}<strong>${e(project.name)}</strong><span>${n(project.quotations.length)} quotations · ${n(project.reviews.length)} decisions</span><small>Saved ${date(project.updatedAt)}</small>${icon('arrow')}</button>`; }
function recalculateImports() { state.prepared = state.imports.quotation && state.imports.codes ? prepareImports(state.imports, { delimiter:state.delimiter, childColumn:state.childColumn }) : null; state.grouped = false; }

// ---- Step 2 · Prepare ------------------------------------------------------------------------
const ISSUE_STATUSES = ['Open','Accepted','Resolved','Deferred'];
function issueRows() {
  const statuses = p().preparation.issueStatus ||= {};
  return groupIssues(p().preparation.issues).map(g => ({ ...g, status: g.severity === 'error' ? 'Blocking' : statuses[g.key] || 'Open' }));
}
function prepareView() {
  const project = p(), prepared = isPrepared(project), groups = issueRows();
  const blocking = groups.filter(g => g.severity === 'error').length, open = groups.filter(g => g.status === 'Open').length;
  return `${pageHeader('STEP 2 · PREPARE', 'Prepare data', 'One row per code–quotation pair. Values are kept exactly as exported.', prepared ? `<button class="btn primary" data-view="scope">Continue to scope ${icon('arrow')}</button>` : button('Prepare data ' + icon('arrow'),'prepare-data','primary',blocking ? 'disabled' : ''))}
    ${prepared ? `<div class="banner success"><div><strong>Prepared ${plural(project.assignments.length,'row')} from ${plural(project.quotations.length,'quotation')}.</strong><p>Saved as quotation_per_code.csv in this project. The raw exports are unchanged.</p></div>${button(icon('download') + ' quotation_per_code.csv','export-assignments','secondary')}</div>`
      : `<div class="banner"><div><strong>Inspect each issue, then prepare the data.</strong><p>Set each warning to Accepted, Resolved or Deferred as you review it. Warnings do not block preparation; blocking errors do.</p></div></div>`}
    <section class="card"><div class="section-heading"><h2>Validation issues</h2><span class="fine">${n(blocking)} blocking · ${plural(groups.length - blocking,'warning')} · ${n(open)} open</span></div>
    ${groups.length ? `<div class="table-wrap issue-table"><table><thead><tr><th>Issue</th><th>File</th><th>Where</th><th>Recommended action</th><th>Status</th></tr></thead><tbody>${groups.map(g => `<tr><td><strong>${e(g.type)}</strong>${g.count > 1 ? `<small>${n(g.count)} occurrences</small>` : ''}${ISSUE_HELP[g.type] ? `<p class="issue-help">${e(ISSUE_HELP[g.type])}</p>` : ''}</td><td>${fileLabel(g.file)}</td><td>${whereList(g)}</td><td>${e(g.action)}</td><td>${g.severity === 'error' ? badge('Blocking','red') : `<select class="status-select" data-issue="${e(g.key)}" data-status="${e(g.status)}" aria-label="Status of ${e(g.type)}">${ISSUE_STATUSES.map(s => `<option ${s === g.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`}</td></tr>`).join('')}</tbody></table></div>${open ? `<div class="section-footer"><span class="fine">${plural(open,'issue')} still open.</span>${button('Accept all open warnings','accept-issues','quiet')}</div>` : ''}` : `<p class="success-line">${icon('check')} No validation issues found.</p>`}</section>
    ${preparedTable()}
    <details class="card validation-record"><summary>Preparation record · version ${project.preparation.version || 1}</summary><p class="fine">${prepared ? 'Prepared ' + date(project.preparation.preparedAt) : 'Not prepared yet'} · ${n(project.preparation.codeRows)} Code Manager rows · ${project.preparation.duplicateGroups} grouped duplicate names · ${e(project.preparation.delimiter === ';' ? 'Semicolon' : 'Comma')} code delimiter</p>${button('Revalidate original exports','revalidate','secondary')}<p class="fine">Creates a new preparation record and keeps working changes and earlier versions. Findings made before it should be analysed again.</p></details>`;
}
function whereList(g) {
  if (!g.where.length) return '<span class="muted">Whole file</span>';
  const shown = g.where.slice(0,6).map(e).join(', ');
  return g.where.length > 6 ? `<details class="where"><summary>${shown}, and ${n(g.where.length - 6)} more</summary><p>${g.where.map(e).join(', ')}</p></details>` : shown;
}
function preparedTable() {
  const project = p(), search = filter('prepSearch').toLowerCase(), sort = filter('prepSort','code'), codeId = filter('prepCode'), status = filter('prepStatus');
  const qs = new Map(project.quotations.map(q => [q.id,q])), cs = new Map(project.codes.map(c => [c.id,c]));
  const statuses = new Map(project.codes.map(c => [c.id,codeStatus(c.id)]));
  let rows = project.assignments.map(a => ({ a, q:qs.get(a.quotationId), c:cs.get(a.codeId), status:statuses.get(a.codeId) }))
    .filter(r => (!codeId || r.c.id === codeId) && (!status || r.status === status) && (!search || `${r.q.quotationId} ${r.q.text} ${r.c.label} ${r.q.source}`.toLowerCase().includes(search)));
  const collator = new Intl.Collator(undefined, { numeric:true, sensitivity:'base' });
  const keys = { code:r => r.c.label, source:r => r.q.source, quotation:r => r.q.quotationId, status:r => r.status };
  rows.sort((x,y) => collator.compare(keys[sort](x),keys[sort](y)) || collator.compare(x.q.quotationId,y.q.quotationId));
  const page = Math.min(Number(filter('prepPage',0)),Math.max(0,Math.ceil(rows.length / 25) - 1));
  const multi = project.assignments.length - new Set(project.assignments.map(a => a.quotationId)).size;
  return `<section class="card table-card"><div class="section-heading"><h2>Quotation-per-code overview</h2>${isPrepared(project) ? '' : badge('Preview')}</div>
    <div class="toolbar"><label class="search">${icon('search')}<input id="prep-search" data-filter="prepSearch" value="${e(filter('prepSearch'))}" placeholder="Code, source, quotation ID or text" aria-label="Search prepared rows"></label>
    <label class="inline-field"><span>Code</span><select id="prep-code" data-filter="prepCode">${codeOptions(codeId,{placeholder:'All codes'})}</select></label>
    <label class="inline-field"><span>Review status</span><select id="prep-status" data-filter="prepStatus"><option value="">All</option>${['Not reviewed',...STATUSES,'Approved and applied'].map(s => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label class="inline-field"><span>Sort by</span><select id="prep-sort" data-filter="prepSort">${[['code','Code'],['source','Source'],['quotation','Quotation ID'],['status','Review status']].map(([v,l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    ${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>quotation_id</th><th>text</th><th>code</th><th>source</th><th>coder</th><th>created</th><th>review status</th></tr></thead><tbody>${rows.slice(page * 25,(page + 1) * 25).map(({a,q,c,status}) => `<tr><td class="mono">${e(q.quotationId)}</td><td><details><summary>${e(q.text.slice(0,120))}${q.text.length > 120 ? '…' : ''}</summary><p class="full-text">${e(q.text)}</p>${q.note ? `<small>${e(q.note)}</small>` : ''}</details></td><td>${e(c.label)}${a.flag ? ' ' + badge('Borderline','amber') : ''}</td><td>${e(q.source || '—')}</td><td>${e(q.coder || '—')}</td><td class="nowrap">${e(String(q.created).slice(0,10) || '—')}</td><td>${statusBadge(status)}</td></tr>`).join('')}</tbody></table></div>` : empty('No matching rows','Try another search or filter.')}
    ${pagination(page,rows.length,25,'prepPage')}<p class="fine">${multi ? `${plural(multi,'extra row')} come from quotations that carry more than one code: such a quotation appears once per code.` : 'Each quotation carries a single code.'}</p></section>`;
}
function pagination(page, total, size, key) { return total > size ? `<div class="pagination"><span>${total ? n(page * size + 1) : 0}–${n(Math.min((page + 1) * size,total))} of ${n(total)}</span><div>${button('Previous','page','quiet',`data-key="${key}" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}`)}${button('Next','page','quiet',`data-key="${key}" data-page="${page + 1}" ${(page + 1) * size >= total ? 'disabled' : ''}`)}</div></div>` : ''; }

// ---- Step 3 · Scope --------------------------------------------------------------------------
function scopeView() {
  const project = p(), d = draft(), code = selectedCode(), counts = countsByCode(project);
  const codes = activeCodes(project).sort((a,b) => a.label.localeCompare(b.label));
  const status = statusLabel(d);
  return `${pageHeader('STEP 3 · SCOPE', 'What do you want to examine?', 'Choose one scope, then a function. The prepared data stays as it is.')}
    <fieldset class="scope-set"><legend>Scope</legend><div class="scope-grid">${Object.entries(SCOPES).map(([key,s]) => `<label class="scope-card ${s.available ? '' : 'disabled'} ${key === 'single' ? 'selected' : ''}"><span class="scope-top"><input type="radio" name="scope" value="${key}" ${key === 'single' ? 'checked' : ''} ${s.available ? '' : 'disabled'}><strong>${s.title}</strong>${s.available ? '' : '<small>Not available yet</small>'}</span><span class="fine">${s.description}</span><span class="scope-functions">${s.functions.join('<br>')}</span></label>`).join('')}</div></fieldset>
    <div class="split-layout scope-layout"><fieldset class="function-set"><legend>Function</legend>${Object.entries(MODULES).filter(([,m]) => m.scope === 'single').map(([key,m]) => `<label class="function-card ${d.module === key ? 'selected' : ''}"><input type="radio" name="fn" value="${key}" ${d.module === key ? 'checked' : ''}>${assetIcon(MODULE_ICONS[key])}<span><strong>${m.title}</strong><span class="fine">${m.question}</span></span></label>`).join('')}</fieldset>
    <section class="card code-pick"><label class="field"><span>Code</span><select id="scope-code">${codes.map(c => `<option value="${e(c.id)}" ${c.id === code?.id ? 'selected' : ''}>${e(c.label)} · ${plural(counts.get(c.id) || 0,'quotation')}</option>`).join('')}</select></label>
      <p class="code-status">${statusBadge(status === 'Not reviewed' && d.finding ? 'Under review' : status)} <span>${status === 'Not reviewed' ? `Not reviewed yet with ${e(MODULES[d.module].title)}.` : `${e(MODULES[d.module].title)} · ${e(ACTIONS[d.action] || '')}`}</span></p>
      <p class="fine">${code?.definition ? `<strong>Definition.</strong> ${e(code.definition)} ${e(code.boundary)}` : code?.importedComment ? `Code Manager comment: “${e(code.importedComment)}”` : 'No Code Manager comment and no definition yet.'}</p>
      <button class="btn primary" data-view="review" ${code ? '' : 'disabled'}>Open review ${icon('arrow')}</button></section></div>
    ${deferredList()}`;
}
function deferredList() {
  const deferred = deferredSuggestions(p());
  return deferred.length ? `<section class="card"><div class="section-heading"><h2>Deferred decisions</h2>${badge(String(deferred.length),'')}</div><div class="suggestion-list">${deferred.map(d => suggestionItem(d,d.key)).join('')}</div></section>` : '';
}

// ---- Step 4 · Review -------------------------------------------------------------------------
function classCounts(d, quotes) {
  const classes = MODULES[d.module].classes;
  return classes.map(c => [c, quotes.filter(q => d.classifications[q.id]?.rating === c).length]).filter(([,count]) => count);
}
// Edits to a quotation stay pending until the researcher saves them; only saved choices count.
function quotationState(d, qid) {
  const saved = { rating:d.classifications[qid]?.rating || '', choice:d.quotationDecisions?.[qid]?.choice || 'keep', targetCodeId:d.quotationDecisions?.[qid]?.targetCodeId || '', newLabel:d.quotationDecisions?.[qid]?.newLabel || '' };
  const pending = d.quotationDrafts?.[qid];
  return { saved, current:pending ? { ...saved, ...pending } : saved, dirty:!!pending };
}
function editQuotation(d, qid, patch) {
  const { saved, current } = quotationState(d, qid), next = { ...current, ...patch };
  d.quotationDrafts ||= {};
  // Values typed under an option that is no longer chosen do not count as a change.
  const norm = x => [x.rating, x.choice, x.choice === 'existing' ? x.targetCodeId : '', x.choice === 'new' ? x.newLabel.trim() : ''].join('|');
  if (norm(saved) === norm(next)) delete d.quotationDrafts[qid]; else d.quotationDrafts[qid] = next;
  if (state.quoteError?.qid === qid) state.quoteError = null;
}
function saveQuotation(d, qid) {
  const { saved, current } = quotationState(d, qid), q = p().quotations.find(x => x.id === qid);
  if (current.choice === 'existing' && !current.targetCodeId) throw new Error(`Choose the existing code for quotation ${q.quotationId}.`);
  if (current.choice === 'new') {
    const label = current.newLabel.trim();
    if (!label) throw new Error(`Enter a name for the new code for quotation ${q.quotationId}.`);
    if (activeCodes(p()).some(c => c.label === label)) throw new Error(`“${label}” already exists. Choose “Change to an existing code” instead.`);
  }
  if (current.rating !== saved.rating) d.classifications[qid] = { rating:current.rating, note:'', origin:'researcher' };
  if (!d.reviewStatus) d.reviewStatus = 'Under review';
  if (current.choice === 'uncode') {
    const { removed } = uncodeQuotation(p(), d, qid);
    delete d.quotationDecisions?.[qid]; delete d.quotationDrafts?.[qid];
    (d.movedOut ||= []).push({ quotationId:qid, codeId:'', uncoded:true, at:new Date().toISOString() });
    return `${q.quotationId} uncoded: ${plural(removed.length,'assignment')} removed and the quotation taken out of the dataset. Recorded in the history.`;
  }
  // Moving a quotation is applied straight away and recorded on its own; the code's suggestion stays open.
  if (current.choice !== 'keep') {
    const { target, alreadyThere } = moveQuotation(p(), d, qid, { choice:current.choice, targetCodeId:current.targetCodeId, newLabel:current.newLabel.trim() });
    delete d.quotationDecisions?.[qid]; delete d.quotationDrafts?.[qid];
    (d.movedOut ||= []).push({ quotationId:qid, codeId:target.id, at:new Date().toISOString() });
    return `${q.quotationId} moved to “${target.label}”${alreadyThere ? ', where it was already coded' : ''}. Recorded in the history.`;
  }
  (d.quotationDecisions ||= {})[qid] = { choice:'keep', targetCodeId:'', newLabel:'' };
  delete d.quotationDrafts?.[qid]; (d.quotationSavedAt ||= {})[qid] = new Date().toISOString();
  return '';
}
function unsavedQuotations(d) { return Object.keys(d.quotationDrafts || {}).map(qid => p().quotations.find(q => q.id === qid)?.quotationId).filter(Boolean); }
function quoteCard(q, d) {
  const { current, dirty } = quotationState(d, q.id), classification = d.classifications[q.id] || {}, code = selectedCode();
  const others = p().assignments.filter(a => a.quotationId === q.id && a.codeId !== code.id).map(a => codeLabel(a.codeId));
  const flag = p().assignments.find(a => a.quotationId === q.id && a.codeId === code.id)?.flag;
  const locked = ['Approved','Rejected'].includes(normalStatus(d.reviewStatus));
  // Althea's reading comes from the finding itself, so it stays visible after the researcher reclassifies.
  const reading = d.finding?.classifications?.[q.id], cited = d.finding?.evidenceIds?.includes(q.id);
  const choices = [['keep',`Keep “${code.label}”`],['existing','Change to an existing code'],['new','Create a new code'],['uncode','Uncode quotation']];
  const picker = value => value === 'existing' && current.choice === 'existing' ? `<select class="choice-picker" data-qtarget="${q.id}" aria-label="Existing code for quotation ${e(q.quotationId)}">${codeOptions(current.targetCodeId,{exclude:[code.id]})}</select>`
    : value === 'new' && current.choice === 'new' ? `<input class="choice-picker" id="qnew-${q.id}" data-qnewlabel="${q.id}" value="${e(current.newLabel)}" placeholder="Name of the new code" aria-label="New code for quotation ${e(q.quotationId)}">`
    : value === 'uncode' && current.choice === 'uncode' ? `<p class="choice-picker fine">For text that should not have been coded, such as an interviewer's turn. Removes ${others.length ? `its ${others.length + 1} codes` : 'its code'} and takes the quotation out of the working dataset.</p>` : '';
  const savedAt = d.quotationSavedAt?.[q.id], error = state.quoteError?.qid === q.id ? state.quoteError.message : '';
  return `<article id="quote-${q.id}" tabindex="-1" class="quote-card evidence-card ${current.rating ? 'rated-' + e(current.rating.toLowerCase()) : ''} ${current.choice !== 'keep' ? 'is-moving' : ''} ${dirty ? 'is-dirty' : ''}"><div class="evidence-main"><p class="quote-meta"><span class="mono">${e(q.quotationId)}</span> · ${e(q.source || 'Source not provided')} · ${e(q.coder || 'Coder not provided')}${cited ? ' ' + badge('Cited in finding','cited') : ''}${flag ? ' ' + badge('Flagged borderline','amber') : ''}</p>
    <p class="quotation-text">“${e(q.text)}”</p>${reading ? `<div class="althea-reading"><span class="eyebrow">Althea AI on this quotation</span><p><strong>${e(reading.rating)}.</strong> ${e(reading.note)}</p>${current.rating && current.rating !== reading.rating ? `<p class="fine">You classified it as ${e(current.rating)}.</p>` : ''}</div>` : ''}${q.note ? `<p class="evidence-note">Note: ${e(q.note)}</p>` : ''}${others.length ? `<div class="chip-row">${others.map(c => `<span class="chip">Also: ${e(c)}</span>`).join('')}</div>` : ''}</div>
    <div class="evidence-controls"><label class="field classify"><span>Your classification${dirty || classification.origin === 'researcher' || !current.rating ? '' : ' <small>as Althea AI suggests</small>'}</span><select data-classify="${q.id}" ${locked ? 'disabled' : ''}><option value="">Not classified</option>${MODULES[d.module].classes.map(v => `<option ${current.rating === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <fieldset class="quote-decision" ${locked ? 'disabled' : ''}><legend>Code for this quotation</legend>${choices.map(([value,label]) => `<label class="choice"><input type="radio" name="qd-${q.id}" value="${value}" data-qdecision="${q.id}" ${current.choice === value ? 'checked' : ''}><span>${e(label)}</span></label>${picker(value)}`).join('')}</fieldset>
    ${locked ? '' : `<div class="quote-save">${error ? `<p class="field-error" role="alert">${e(error)}</p>` : ''}<span class="save-note" data-save-note="${q.id}">${dirty ? 'Unsaved changes' : savedAt ? 'Saved ' + date(savedAt) : ''}</span>${dirty && current.choice === 'uncode' ? `<span class="fine">Saving uncodes this quotation now${others.length ? `, also from ${others.map(c => `“${e(c)}”`).join(', ')}` : ''}. The originals and the history keep it.</span>` : dirty && current.choice !== 'keep' ? `<span class="fine">Saving moves this quotation out of “${e(code.label)}” now. The move is kept in the history.</span>` : ''}<div class="button-row">${button('Save changes','save-quotation','primary',`data-id="${q.id}" ${dirty ? '' : 'disabled'}`)}${dirty ? button('Discard','discard-quotation','quiet',`data-id="${q.id}"`) : ''}</div></div>`}</div></article>`;
}
function evidenceSection(d) {
  const code = selectedCode(), all = quotesFor(p(), code.id), search = filter('evidenceSearch').toLowerCase(), cls = filter('evidenceClass');
  const shown = all.filter(q => (!search || `${q.text} ${q.quotationId} ${q.source}`.toLowerCase().includes(search)) && (!cls || (d.classifications[q.id]?.rating || '') === (cls === '-' ? '' : cls)));
  const limit = filter('evidenceAll') ? shown.length : 8, counts = classCounts(d, all);
  const moving = d.movedOut?.length || 0, unsaved = unsavedQuotations(d).length;
  return `<div class="stack"><div class="column-heading"><h2>Reviewing the quotations</h2></div><section class="card evidence-section"><div class="section-heading"><span class="fine">${counts.length ? counts.map(([c,k]) => `${n(k)} ${c.toLowerCase()}`).join(' · ') : plural(all.length,'quotation') + ' · not classified yet'}</span>${moving || unsaved ? `<span class="fine">${moving ? `<strong>${plural(moving,'quotation')}</strong> moved to another code` : ''}${moving && unsaved ? ' · ' : ''}${unsaved ? `<strong class="unsaved">${n(unsaved)} unsaved</strong>` : ''}</span>` : ''}</div>
    <div class="toolbar"><label class="search compact">${icon('search')}<input id="evidence-search" data-filter="evidenceSearch" value="${e(filter('evidenceSearch'))}" placeholder="Search within quotations" aria-label="Search evidence"></label><select id="evidence-class" data-filter="evidenceClass" aria-label="Filter by classification"><option value="">All classifications</option>${MODULES[d.module].classes.map(c => `<option ${c === cls ? 'selected' : ''}>${c}</option>`).join('')}<option value="-" ${cls === '-' ? 'selected' : ''}>Not classified</option></select></div>
    ${shown.length ? `<div class="evidence-list">${shown.slice(0,limit).map(q => quoteCard(q,d)).join('')}</div>` : empty('No quotations to show', all.length ? 'Change the search or filter.' : 'This code has no quotations assigned.')}
    ${d.movedOut?.length ? `<div class="moved-list"><p class="eyebrow">Moved or uncoded during this review</p><ul>${d.movedOut.map(m => `<li><span class="mono">${e(p().quotations.find(q => q.id === m.quotationId)?.quotationId)}</span> → ${m.uncoded ? 'uncoded, out of the dataset' : e(codeLabel(m.codeId))} <span class="fine">· ${date(m.at)}</span></li>`).join('')}</ul></div>` : ''}
    <div class="section-footer"><span class="fine">Showing ${n(Math.min(limit,shown.length))} of ${plural(all.length,'quotation')}.</span><div class="button-row">${shown.length > limit ? button(`Show all ${n(shown.length)}`,'show-all-evidence','quiet') : ''}${['Approved','Rejected'].includes(normalStatus(d.reviewStatus)) ? '' : button('Save review','save-review','secondary')}</div></div></section></div>`;
}
function findingCard(d) {
  const f = d.finding;
  if (state.providerBusy) return `<section class="card finding-card"><h2>Althea AI’s finding</h2><div role="status" class="button-row"><span class="spinner small"></span><span>Analysing ${e(selectedCode().label)}…${state.pi.available ? ' This usually takes a minute or two: Althea AI analyses, then explains its finding.' : ''}</span>${button('Cancel','cancel-analysis','quiet')}</div></section>`;
  // Offered only after Pi could not run, so a lexical demonstration is always a deliberate choice.
  const simulateOffer = state.providerError && !state.pi.available ? `<p class="fine">To try the workflow without Althea AI, ${button('run the lexical simulation','simulate','quiet')} instead. It matches words only and is labelled as a simulation.</p>` : '';
  if (!f) return `<section class="card finding-card"><h2>Althea AI’s finding</h2>${button('Run ' + e(MODULES[d.module].title),'analyze','primary full-width')}${state.providerError ? `<p class="field-error" role="alert">${e(state.providerError)}</p>` : ''}${simulateOffer}</section>`;
  const stale = f.projectRevision !== undefined && (f.projectRevision !== p().revision || (f.preparationVersion || 1) !== (p().preparation.version || 1));
  const row = (label, text) => text ? `<div class="finding-row"><dt>${label}</dt><dd>${e(text)}</dd></div>` : '';
  return `<section class="card finding-card finding"><div class="section-heading"><h2>${f.origin === 'simulation' ? 'Simulated finding' : 'Althea AI’s finding'}</h2>${f.rating ? `<span class="rating">${e(f.rating)}</span>` : ''}</div>
    <p class="finding-scope">About all ${plural(f.coverage ?? quotesFor(p(),d.codeIds[0]).length,'quotation')} of “${e(selectedCode().label)}” taken together. Althea AI’s reading of each quotation is on its card.</p>
    <dl>${row('Evidence',f.evidenceSummary)}${row('Interpretation',f.interpretation)}${row('Confidence',f.confidence)}${row('Suggestion',f.suggestion || f.suggestedFields?.recommendation)}</dl>
    ${f.evidenceIds.length ? `<div class="evidence-links"><span class="fine">Cited quotations:</span>${f.evidenceIds.map(qid => button(e(p().quotations.find(q => q.id === qid)?.quotationId),'show-evidence','quiet',`data-id="${qid}"`)).join('')}</div>` : ''}
    ${stale ? '<p class="alert warning">The project changed after this analysis. Run it again before relying on it.</p>' : ''}
    ${state.providerError ? `<p class="alert error" role="alert">${e(state.providerError)} The finding below is from the previous run.</p>${simulateOffer}` : ''}
    ${f.origin !== 'pi' && f.origin ? '<p class="alert warning">This finding is from the lexical simulation, not Althea AI. Analyse again for Althea AI’s reading.</p>' : ''}
    ${f.justification ? justificationDetails(f.justification) : ''}
    ${piSettings().showTrace && f.trace ? traceDetails(f.trace) : ''}
    <details><summary>How this was produced</summary>${f.questions ? f.questions.map((q,i) => `<p><strong>${i+1}. ${e(q.question)}</strong><br>${e(q.answer)}</p>`).join('') : ''}${f.limitation ? `<p><strong>Limitation:</strong> ${e(f.limitation)}</p>` : ''}<p class="fine">${e(f.provenance)}${f.timestamp ? ' · ' + date(f.timestamp) : ''}</p>${d.analysisHistory?.length ? `<p class="fine">${plural(d.analysisHistory.length,'earlier run')} kept with this suggestion.</p>` : ''}</details>
    ${['Approved','Rejected'].includes(normalStatus(d.reviewStatus)) ? '' : button('Analyse again','analyze','quiet')}</section>`;
}
// Pi's own account of the finding, asked for in the same session. It is a self-explanation, so it is labelled as one.
function justificationDetails(j) {
  const part = (label, text) => text?.trim() ? `<div class="finding-row"><dt>${label}</dt><dd>${e(text)}</dd></div>` : '';
  return `<details class="justification"><summary>Why Althea AI reached this finding</summary><p class="fine">Althea AI wrote this in the same session, after submitting the finding, from what it had read there. It is the model’s explanation of its finding, not a record of its internal reasoning: check it against the quotations.</p><dl>${part('How it reached the finding',j.reasoning)}${part('Readings it set aside',j.alternatives)}${part('Least certain about',j.uncertainty)}</dl></details>`;
}
// The agent's reasoning and tool use for one run, shown only when the researcher turns it on in Settings.
function traceDetails(trace) {
  const thought = trace.filter(t => t.kind === 'thinking'), shared = thought.filter(t => !t.redacted).length;
  const note = shared ? '' : thought.length ? ' The model reasoned, but its provider did not share the reasoning text, so only its tool use is shown. Models whose providers share reasoning show it here.' : ' No reasoning was returned for this run: raise Thinking in Settings, or the provider may not share it.';
  const step = t => t.kind === 'thinking' ? `<li class="trace-thinking"><span class="eyebrow">Reasoning</span>${t.redacted ? '<p class="fine">Not shared by the model provider.</p>' : `<p>${e(t.text)}</p>`}</li>`
    : t.kind === 'text' ? `<li class="trace-text"><span class="eyebrow">Note</span><p>${e(t.text)}</p></li>`
    : t.kind === 'tool' ? `<li class="trace-tool"><span class="eyebrow">${({ submit_finding:'Submitted the finding', explain_finding:'Explained the finding' })[t.name] || `Used ${e(t.name)}`}</span>${t.text && t.text !== '{}' ? `<code>${e(t.text)}</code>` : ''}</li>`
    : `<li class="trace-result"><details><summary>${t.error ? 'Tool error' : 'Result'} · ${e(t.name)}</summary><p class="full-text">${e(t.text)}</p></details></li>`;
  return `<details class="trace"><summary>Reasoning trace · ${plural(trace.length,'step')}</summary><p class="fine">What the model reported while it worked: its reasoning and the tools it used, in order. Providers often summarise or withhold reasoning, so this shows how the reading was reached, not proof that it holds.${note}</p><ol class="trace-steps">${trace.map(step).join('')}</ol></details>`;
}
function actionFields(d) {
  let html = selectField('Action','action',d.action,Object.entries(ACTIONS).filter(([key]) => key !== 'recode' || d.action === 'recode'));
  if (d.action === 'rename' || d.action === 'subcode') html += field(d.action === 'rename' ? 'New code name' : 'Subcode name','newLabel',d.newLabel);
  if (d.action === 'definition' && d.module !== 'definition') html += field('Core concept','newCore',d.newCore,{textarea:true}) + field('Boundary rule','newBoundary',d.newBoundary,{textarea:true,placeholder:'Apply when… Do not apply when…'}) + `<p class="fine word-count" id="word-count">${countWords(d.newCore + ' ' + d.newBoundary)} of 50 words</p>`;
  if (d.action === 'split') html += `<label class="field"><span>First new code</span><input id="split-label-0" data-split-label="0" value="${e(d.splitLabels[0])}"></label><label class="field"><span>Second new code</span><input id="split-label-1" data-split-label="1" value="${e(d.splitLabels[1])}"></label><p class="fine">The new codes become children of this one. Quotations you do not assign keep their current code.</p>${button('Assign quotations (' + Object.values(d.splitAssignments).filter(v => v !== '').length + ')','split-assignments','secondary full-width')}`;
  if (d.action === 'merge') html += `<label class="field"><span>Merge with</span><select id="field-targetCodeId" data-draft="targetCodeId">${codeOptions(d.targetCodeId,{exclude:[d.codeIds[0]]})}</select></label>${field('Name of the merged code','mergeNewLabel',d.mergeNewLabel,{placeholder:'Leave blank to keep the code above'})}<p class="fine">Both codes stay in the history. Their quotations move to the surviving code.</p>`;
  if (d.action === 'recode') html += `<p class="fine">Only the quotations change: each one you set to another code on the left moves there. The code itself stays as it is.</p>`;
  if (d.action === 'borderline') html += `<p class="fine">Flags the quotations you classified as ${e(MODULES[d.module].classes[1]).toLowerCase()}. The assignments stay.</p>`;
  if (d.action === 'retire') html += `<p class="fine">The code leaves the working codebook and its ${plural(quotesFor(p(),d.codeIds[0]).length,'assignment')} are removed. Quotations keep their other codes. The code and its assignments stay in the history.</p>`;
  return html;
}
function decisionForm(d) {
  const status = normalStatus(d.reviewStatus), m = MODULES[d.module];
  if (status === 'Approved' || status === 'Rejected') return `<section class="card decision-card"><h2>Decision</h2><p>${statusBadge(statusLabel(d))} ${e(ACTIONS[d.action] || '')}${d.resolvedAt ? ' · ' + date(d.resolvedAt) : ''}</p>${reason(d.rationale)}<p class="fine">${status === 'Approved' ? 'The change is saved to the project; the previous values are kept in the history.' : 'The project data was not changed. The rejection and its reason are kept in the history.'} To review this code again, run a new analysis.</p>${button('Start a new analysis','analyze','secondary full-width')}</section>`;
  if (status === 'Deferred') return `<section class="card decision-card"><h2>Decision</h2><p>${badge('Deferred')} ${e(ACTIONS[d.action] || '')}${d.resolvedAt ? ' · ' + date(d.resolvedAt) : ''}</p>${reason(d.rationale)}<p class="fine">The data is unchanged. Reopen the suggestion to continue with the original evidence.</p>${button('Reopen','reopen','primary full-width',`data-key="${e(draftKey(d.module,d.codeIds))}"`)}</section>`;
  return `<form class="card decision-card decision-section" onsubmit="return false"><h2>Your decision on the code</h2>
    ${m.ratings.length ? selectField(d.module === 'coherence' ? 'Your coherence rating' : 'Your validity rating','assessment',d.assessment,[['','Not rated'],...m.ratings.map(r => [r,r === 'Weak' && d.module === 'verification' ? 'Weak / misaligned' : r])]) : ''}
    ${d.module === 'coherence' ? field('Subgroups','subgroups',d.subgroups,{textarea:true,placeholder:'Which patterns belong together? Which may be distinct?'}) : ''}
    ${d.module === 'definition' ? `${field('Core concept','core',d.core,{textarea:true,placeholder:'The central meaning of this code.'})}${field('Boundary rule','boundary',d.boundary,{textarea:true,placeholder:'Apply when… Do not apply when…'})}<p class="word-count fine ${countWords(d.core + ' ' + d.boundary) > 50 ? 'field-error' : ''}" id="word-count">${countWords(d.core + ' ' + d.boundary)} of 50 words</p>` : ''}
    ${actionFields(d)}
    ${d.editing ? field('Suggestion, as you edited it','recommendation',d.recommendation,{textarea:true}) : ''}
    ${field('Rationale <small>optional</small>','rationale',d.rationale,{textarea:true,placeholder:'Why this decision, and how the evidence supports it. Recorded in the history.'})}
    <div class="decision-buttons">${button('Approve','approve','primary')}${d.editing ? '' : button('Edit suggestion','edit-suggestion','secondary')}${button('Defer','defer','secondary')}${button('Reject','reject','secondary')}</div>
    </form>`;
}
function reviewView() {
  const project = p(), d = draft(), code = selectedCode(), m = MODULES[d.module];
  if (!code) return pageHeader('STEP 4 · REVIEW','Review','No active code is available.') + empty('Nothing to review','Choose a code in Scope.',`<button class="btn primary" data-view="scope">Choose scope</button>`);
  const quotes = quotesFor(project, code.id), status = d.reviewStatus ? statusLabel(d) : d.finding ? 'Under review' : 'Not analysed';
  return `<div class="page-heading review-heading"><div><p class="eyebrow">Single code · ${e(m.title)}</p><h1 id="page-title" tabindex="-1">${e(code.label)}</h1><p class="muted">${plural(quotes.length,'quotation')} · ${code.definition ? `Definition: “${e(code.definition)}”` : code.importedComment ? `Code Manager comment: “${e(code.importedComment)}”` : 'No Code Manager comment'}</p></div><div class="heading-actions">${statusBadge(status)}<button class="btn quiet" data-view="scope">${icon('back')} Change scope</button></div></div>
    <div class="review-layout">${evidenceSection(d)}<aside class="stack decision-column"><div class="column-heading"><h2>Reviewing the code</h2></div>${findingCard(d)}${decisionForm(d)}</aside></div>`;
}

// Quotation changes come from the researcher's choice for each quotation. Borderline flags are added only
// when the researcher chooses that action, for the quotations they classified as borderline.
function buildQuotationChanges(d) {
  const classes = MODULES[d.module].classes, code = selectedCode(), next = {};
  if (d.action === 'split') return next;
  const existing = new Set(activeCodes(p()).map(c => c.label));
  for (const q of quotesFor(p(), code.id)) {
    const decision = d.quotationDecisions?.[q.id], rating = d.classifications[q.id]?.rating;
    let change = null;
    if (decision?.choice === 'existing') {
      if (!decision.targetCodeId) throw new Error(`Choose the existing code for quotation ${q.quotationId}.`);
      change = { op:'recode', targetCodeId:decision.targetCodeId };
    } else if (decision?.choice === 'new') {
      const label = String(decision.newLabel || '').trim();
      if (!label) throw new Error(`Enter a name for the new code for quotation ${q.quotationId}.`);
      if (existing.has(label)) throw new Error(`“${label}” already exists. Choose “Change to an existing code” for quotation ${q.quotationId}.`);
      change = { op:'newcode', label };
    } else if (rating === classes[1] && d.action === 'borderline') change = { op:'flag' };
    if (!change) continue;
    const previous = d.quotationChanges?.[q.id];
    const same = previous && previous.op === change.op && previous.targetCodeId === change.targetCodeId && previous.label === change.label;
    next[q.id] = { ...change, include: same ? previous.include : true };
  }
  if (d.action === 'recode' && !Object.values(next).some(c => ['recode','newcode'].includes(c.op))) throw new Error('Set at least one quotation to “Change to an existing code” or “Create a new code”.');
  return next;
}
function decisionReady(d) {
  const unsaved = unsavedQuotations(d);
  if (unsaved.length) throw new Error(`Save or discard your changes to quotation${unsaved.length > 1 ? 's' : ''} ${unsaved.join(', ')} first.`);
  d.evidenceIds = quotesFor(p(), d.codeIds[0]).map(q => q.id);
}

// ---- Step 4 · Confirm adaptation -------------------------------------------------------------
function confirmView() {
  const d = draft(), code = selectedCode(), m = MODULES[d.module];
  let preview;
  try { preview = previewDecision(p(), d, 'approve'); }
  catch (error) { return `${pageHeader(`${e(code?.label)} · ${e(m.title)}`,'Confirm the change','')}<p class="alert error" role="alert">${e(error.message)}</p><button class="btn secondary" data-view="review">${icon('back')} Back to review</button>`; }
  const before = code, after = preview.codes.find(c => c.id === code.id);
  const changes = Object.entries(d.quotationChanges || {}), included = changes.filter(([,c]) => c.include).length;
  const parts = [];
  let main = '';
  if (d.action === 'definition') {
    const core = d.module === 'definition' ? d.core : d.newCore, boundary = d.module === 'definition' ? d.boundary : d.newBoundary;
    parts.push('the definition');
    main = `<section class="card"><h2>Definition</h2><div class="compare-grid"><div class="previous"><p class="eyebrow">Previous · kept in history</p><p>${before.definition ? `${e(before.definition)} ${e(before.boundary)}` : before.importedComment ? `${e(before.importedComment)} <small class="muted">(Code Manager comment)</small>` : '<span class="muted">No definition</span>'}</p></div><div class="next"><div class="section-heading"><p class="eyebrow">New</p><span class="fine">${countWords(core + ' ' + boundary)} of 50 words</span></div><p><strong>Core concept.</strong> ${e(core)}</p><p><strong>Boundary rule.</strong> ${e(boundary)}</p></div></div></section>`;
  } else if (d.action === 'rename') {
    parts.push('the new name');
    main = `<section class="card"><h2>Code name</h2><div class="compare-grid"><div class="previous"><p class="eyebrow">Previous · kept in history</p><p>${e(before.label)}</p></div><div class="next"><p class="eyebrow">New</p><p><strong>${e(after.label)}</strong></p></div></div></section>`;
  } else if (['subcode','split','merge','retire'].includes(d.action)) {
    parts.push(plural(preview.codeChanges.length,'codebook change'));
    main = `<section class="card"><h2>Codebook</h2>${changeDetails(preview)}</section>`;
  } else main = `<section class="card"><h2>Codebook</h2><p class="fine">${d.action === 'keep' ? 'The code stays as it is.' : 'The code itself does not change.'}</p></section>`;
  const newCodes = [...new Set(changes.filter(([,c]) => c.include && c.op === 'newcode').map(([,c]) => c.label.trim()))];
  if (newCodes.length) parts.push(plural(newCodes.length,'new code'));
  if (included) parts.push(plural(included,'quotation change'));
  const describe = (qid, c) => {
    const others = p().assignments.filter(a => a.quotationId === qid && a.codeId !== code.id).map(a => `“${codeLabel(a.codeId)}”`);
    if (c.op === 'flag') return 'Flag as borderline. Assignment stays.';
    if (c.op === 'recode') return `Move from “${e(code.label)}” to “${e(codeLabel(c.targetCodeId))}”.`;
    if (c.op === 'newcode') return `Move from “${e(code.label)}” to the new code “${e(c.label)}”.`;
    return `Remove from ${e(code.label)}. ${others.length ? `It keeps its existing code${others.length > 1 ? 's' : ''}, ${e(others.join(', '))}.` : 'It has no other code and would become uncoded.'}`;
  };
  return `${pageHeader(`${e(code.label)} · ${e(m.title)} · ${e(ACTIONS[d.action])}`,'Confirm the change','This is what will be saved to the project. The ATLAS.ti exports stay untouched, and the previous values are kept.')}
    <div class="split-layout confirm-layout"><form class="stack" onsubmit="return false">${main}
      <section class="card"><h2>Quotation changes</h2>${newCodes.length ? `<p class="fine">Creates ${plural(newCodes.length,'new code')}: ${newCodes.map(l => `“${e(l)}”`).join(', ')}. ${newCodes.length > 1 ? 'They join' : 'It joins'} the codebook at the top level.</p>` : ''}${changes.length ? `<div class="change-list">${changes.map(([qid,c]) => { const q = p().quotations.find(x => x.id === qid); return `<label class="change-item ${c.include ? '' : 'excluded'}"><input type="checkbox" data-qchange="${qid}" ${c.include ? 'checked' : ''} ><span><span><span class="mono">${e(q.quotationId)}</span> · ${describe(qid,c)}</span><span class="change-quote">“${e(q.text)}”${c.include ? '' : ' <em>Not selected: stays as it is.</em>'}</span></span></label>`; }).join('')}</div>` : `<p class="fine">No quotation changes.${d.movedOut?.length ? ` ${plural(d.movedOut.length,'quotation')} already moved during the review ${d.movedOut.length > 1 ? 'are' : 'is'} recorded in the history.` : ''}</p>`}</section>
      <section class="card"><h2>Rationale</h2>${reason(d.rationale)}<p class="fine">Evidence linked: ${plural(d.evidenceIds.length,'quotation')}${d.assessment ? `, ${d.module === 'coherence' ? 'coherence' : 'validity'} rating ${e(d.assessment)}` : ''}. Researcher: ${e(p().reviewer)}.</p></section>
      <div class="create-row">${button('Confirm and save','confirm-save','primary')}<button class="btn secondary" data-view="review">${icon('back')} Back to review</button><p class="fine">${parts.length ? `Saves ${parts.join(' and ')}.` : 'Records the decision; no data changes.'} The suggestion becomes Approved.</p></div></form>
      <aside class="card decision-history"><h2>Decision history</h2><div class="suggestion-list">${suggestionItem(d,draftKey(d.module,d.codeIds),true)}${Object.entries(p().drafts).filter(([key,x]) => key !== draftKey(d.module,d.codeIds) && x.reviewStatus).sort(([,a],[,b]) => String(b.resolvedAt || '').localeCompare(String(a.resolvedAt || ''))).slice(0,8).map(([key,x]) => suggestionItem(x,key)).join('')}</div><button class="text-button" data-view="history">Full history ${icon('arrow')}</button></aside></div>`;
}
function suggestionItem(d, key, current = false) {
  const review = p().reviews.find(r => r.id === d.lastReviewId), status = current ? 'Under review' : statusLabel(d);
  return `<div class="suggestion ${current ? 'current' : ''}"><div class="suggestion-top"><strong>${e(codeLabel(d.codeIds[0]))}</strong>${statusBadge(status)}</div><p class="fine">${e(ACTIONS[d.action] || 'Review')} · ${current ? 'waiting for your confirmation' : `${e(MODULES[d.module]?.title)}${d.assessment ? ', ' + e(d.assessment) : ''}`}</p>
    ${current ? '' : `<div class="suggestion-foot"><span class="fine">${review ? `${e(review.reviewer)} · ${date(d.resolvedAt || review.recordedAt)}` : 'Not recorded yet'}</span>${normalStatus(d.reviewStatus) === 'Deferred' ? button('Reopen','reopen','quiet',`data-key="${e(key)}"`) : button('Open','open-suggestion','quiet',`data-key="${e(key)}"`)}</div>`}</div>`;
}

// ---- Codebook and history --------------------------------------------------------------------
function codebookView() {
  const project = p(), counts = countsByCode(project), query = filter('bookSearch').toLowerCase(), mode = filter('bookMode','all');
  const matching = c => (!query || `${c.label} ${c.definition} ${c.boundary}`.toLowerCase().includes(query)) && (mode === 'all' ? c.active : mode === 'unused' ? c.active && !counts.get(c.id) : mode === 'defined' ? c.active && c.definition : mode === 'reviewed' ? c.active && codeStatus(c.id) !== 'Not reviewed' : !c.active);
  const sorted = [...project.codes].sort((a,b) => a.label.localeCompare(b.label));
  const ordered = [], visited = new Set();
  function walk(parentId, depth) { for (const c of sorted.filter(c => (c.parentId || null) === parentId)) { if (visited.has(c.id)) continue; visited.add(c.id); if (matching(c)) ordered.push({c,depth}); walk(c.id,depth + 1); } }
  walk(null,0); sorted.filter(c => !visited.has(c.id) && matching(c)).forEach(c => ordered.push({c,depth:0}));
  const page = Math.min(Number(filter('bookPage',0)),Math.max(0,Math.ceil(ordered.length / 35) - 1));
  const flagged = new Map(); project.assignments.filter(a => a.flag).forEach(a => flagged.set(a.codeId,(flagged.get(a.codeId) || 0) + 1));
  return `${pageHeader('PROJECT RECORD','Working codebook','Confirmed changes appear here. Every imported value remains recoverable from the source files.',button(icon('download') + ' Export final files','export-files'))}<section class="card table-card"><div class="toolbar"><label class="search">${icon('search')}<input id="book-search" data-filter="bookSearch" value="${e(filter('bookSearch'))}" placeholder="Search names and definitions" aria-label="Search codebook"></label><select id="book-mode" data-filter="bookMode" aria-label="Filter codebook">${[['all','Active codes'],['unused','No quotations'],['defined','With definitions'],['reviewed','Reviewed'],['archived','Merged, retired or archived']].map(([v,l]) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="fine">${plural(ordered.length,'code')}</span></div><div class="table-wrap"><table class="codebook-table"><thead><tr><th>Code & hierarchy</th><th>Definition & boundaries</th><th>Quotations</th><th>Review</th></tr></thead><tbody>${ordered.slice(page * 35,(page + 1) * 35).map(({c,depth}) => `<tr><td><div class="tree-label" style="padding-left:${Math.min(depth,5) * 18}px">${depth ? '<span class="branch">↳</span>' : '<span class="code-dot"></span>'}<strong>${e(c.label)}</strong></div>${c.parentId ? `<small>Parent: ${e(codeLabel(c.parentId))}</small>` : ''}<small>${c.sourceRows.length ? 'Source rows: ' + e(c.sourceRows.join(', ')) : 'Created in this workspace'}${c.mergedInto ? ' · Merged into ' + e(codeLabel(c.mergedInto)) : ''}${c.retired ? ' · Retired' : ''}</small></td><td>${c.definition ? `<p>${e(c.definition)}</p><small>${e(c.boundary)}</small>` : c.importedComment ? `<p>${e(c.importedComment)}</p><small>Imported comment; not an approved definition</small>` : '<span class="muted">No approved definition</span>'}</td><td class="mono">${n(counts.get(c.id))}${flagged.get(c.id) ? `<small>${n(flagged.get(c.id))} borderline</small>` : ''}</td><td>${c.active ? `<span class="status-cell">${statusBadge(codeStatus(c.id))}${button('Review ' + icon('arrow'),'review-code','quiet',`data-id="${c.id}"`)}</span>` : badge(c.retired ? 'Retired' : 'Archived')}</td></tr>`).join('')}</tbody></table></div>${!ordered.length ? empty('No matching codes','Try another search or filter.') : ''}${pagination(page,ordered.length,35,'bookPage')}</section>`;
}
function actionName(action) { return ({move:'Moved quotation',uncode:'Uncoded quotation',review:'Saved review',reopen:'Reopened',reject:'Rejected suggestion',defer:'Deferred decision',note:'Review note',...ACTIONS})[action] || action; }
function historyView() {
  const query = filter('historySearch').toLowerCase(), status = filter('historyStatus');
  const history = p().history.filter(h => (!status || normalStatus(h.status) === status) && (!query || `${h.rationale} ${actionName(h.action)} ${h.affectedCodeIds.map(codeLabel).join(' ')}`.toLowerCase().includes(query))).reverse();
  return `${pageHeader('PROJECT RECORD','Decision history','Approved, rejected and deferred decisions stay connected to their evidence, rationale, researcher and time.',button(icon('download') + ' Export history','export-history'))}${deferredList()}<div class="toolbar history-toolbar"><label class="search">${icon('search')}<input id="history-search" data-filter="historySearch" value="${e(filter('historySearch'))}" placeholder="Search decisions, codes, or rationale" aria-label="Search history"></label><select id="history-status" data-filter="historyStatus" aria-label="Filter decisions"><option value="">All decisions</option>${STATUSES.map(s => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    ${history.length ? `<div class="history-list">${history.map(h => { const review = p().reviews.find(r => r.id === h.reviewId); const label = statusLabel(h); const key = review ? draftKey(review.module,review.codeIds) : ''; const live = p().drafts[key]; return `<article class="card history-card"><div class="history-top"><span class="history-marker">${icon(h.status === 'Deferred' ? 'history' : 'check')}</span><div><h2>${e(actionName(h.action))}</h2><p>${e(h.affectedCodeIds.map(codeLabel).join(' · '))}</p></div>${statusBadge(label)}</div>${reason(h.rationale)}<div class="history-meta"><span>${e(h.reviewer)} · ${date(h.timestamp)}</span><span>${MODULES[review?.module]?.title || 'Review'} · ${plural(h.evidenceIds.length,'evidence quotation')}</span></div><details><summary>Evidence, assessment & change details</summary>${review ? `<div class="recorded-assessment">${review.assessment ? `<p><strong>Rating:</strong> ${e(review.assessment)}</p>` : ''}${review.subgroups ? `<p><strong>Subgroups:</strong> ${e(review.subgroups)}</p>` : ''}${review.core ? `<p><strong>Definition:</strong> ${e(review.core)} ${e(review.boundary)}</p>` : ''}${review.recommendation ? `<p><strong>Suggestion:</strong> ${e(review.recommendation)}</p>` : ''}${review.finding?.interpretation ? `<p><strong>Finding:</strong> ${e(review.finding.interpretation)} <small>${e(review.finding.provenance)}</small></p>` : ''}${review.finding?.justification?.reasoning ? `<p><strong>Althea AI’s justification:</strong> ${e(review.finding.justification.reasoning)}</p>` : ''}</div>` : ''}${changeDetails(h)}</details>${live && normalStatus(live.reviewStatus) === 'Deferred' && live.lastReviewId === h.reviewId ? button('Reopen','reopen','secondary',`data-key="${e(key)}"`) : ''}</article>`; }).join('')}</div>` : empty('No recorded decisions here yet','Complete a review to keep its evidence and rationale in your history.',p() && isPrepared(p()) ? `<button class="btn primary" data-view="scope">Choose what to review</button>` : '')}`;
}
function changeDetails(change) {
  const changes = change.codeChanges || [], removed = change.removed || [], added = change.added || [], flagged = change.flagged || [];
  const codes = new Map([...(p()?.codes || []), ...(change.codes || []), ...changes.map(c => c.after)].map(c => [c.id,c]));
  const qs = new Map(p().quotations.map(q => [q.id,q]));
  return `${changes.length ? `<div class="change-table table-wrap"><table><thead><tr><th>Previous</th><th>New</th></tr></thead><tbody>${changes.map(({before,after}) => `<tr><td>${before ? `<strong>${e(before.label)}</strong><p>${e(before.definition)} ${e(before.boundary)}</p><small>${before.active ? 'Active' : 'Archived'}${before.parentLabel ? ' · Parent: ' + e(before.parentLabel) : ''}</small>` : '<em>New code</em>'}</td><td><strong>${e(after.label)}</strong><p>${e(after.definition)} ${e(after.boundary)}</p><small>${after.active ? 'Active' : after.retired ? 'Retired' : 'Archived'}${after.parentLabel ? ' · Parent: ' + e(after.parentLabel) : ''}</small></td></tr>`).join('')}</tbody></table></div>` : '<p class="fine">No code values change.</p>'}
    <p class="fine"><strong>${n(removed.length)}</strong> assignments removed · <strong>${n(added.length)}</strong> added · <strong>${n(flagged.length)}</strong> flagged as borderline</p>${removed.length + added.length + flagged.length ? `<details><summary>Every affected assignment</summary><div class="table-wrap assignment-impact"><table><thead><tr><th>Operation</th><th>Quotation</th><th>Code</th></tr></thead><tbody>${[...removed.map(a => ({...a,op:'Remove'})),...added.map(a => ({...a,op:'Add'})),...flagged.map(a => ({...a,op:'Flag borderline'}))].map(a => `<tr><td>${a.op}</td><td>${e(qs.get(a.quotationId)?.quotationId)}</td><td>${e(codes.get(a.codeId)?.label)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
}

// ---- Dialogs, files and analysis -------------------------------------------------------------
function openDialog(title, content, footer = '') {
  modal.className = '';
  modal.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${content}</div>${footer ? `<div class="dialog-footer">${footer}</div>` : ''}`;
  if (!modal.open) modal.showModal();
}
function showError(message) { toast(message); document.querySelector('.inline-review-error')?.remove(); const target = (modal.open ? modal : document).querySelector('.decision-section'); if (target) { const node = document.createElement('p'); node.className = 'alert error inline-review-error'; node.setAttribute('role','alert'); node.textContent = message; target.prepend(node); node.scrollIntoView({block:'nearest'}); } }
function splitDialog(page = 0) {
  const d = draft(), qs = quotesFor(p(),d.codeIds[0]);
  openDialog('Assign quotations for the split', `<p>Choose a destination for each quotation you want to move. Everything else keeps its current code.</p><div class="split-list">${qs.slice(page * 15,(page + 1) * 15).map(q => `<article><span class="mono">${e(q.quotationId)}</span><p>${e(q.text)}</p><select data-split-assignment="${q.id}" aria-label="Destination for quotation ${e(q.quotationId)}"><option value="">Keep current code</option>${d.splitLabels.map((label,i) => `<option value="${i}" ${d.splitAssignments[q.id] === String(i) ? 'selected' : ''}>${e(label || 'New code ' + (i + 1))}</option>`).join('')}</select></article>`).join('')}</div><div class="pagination"><span>${page * 15 + 1}–${Math.min((page + 1) * 15,qs.length)} of ${qs.length}</span><div>${button('Previous','split-page','quiet',`data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}`)}${button('Next','split-page','quiet',`data-page="${page + 1}" ${(page + 1) * 15 >= qs.length ? 'disabled' : ''}`)}</div></div>`,button('Done','close-modal','primary'));
}
function download(name, content, type = 'text/plain;charset=utf-8') { const url = URL.createObjectURL(new Blob([content],{type})); const link = document.createElement('a'); link.href = url; link.download = name; link.hidden = true; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000); }
function backup() { captureScroll(); download(`${p().name.replace(/[^a-z0-9_-]/gi,'-')}.althea.json`,JSON.stringify(p()),'application/json'); }
function resetImport() { state.project = null; state.imports = {quotation:null,codes:null}; state.prepared = null; state.importName = ''; state.importErrors = {}; state.saveStatus = ''; state.delimiter = ''; state.childColumn = undefined; state.grouped = false; }
async function loadFile(file, kind) {
  const version = ++importVersions[kind];
  state.imports[kind] = null; state.prepared = null; state.importErrors[kind] = ''; render();
  try { const parsed = await readExport(new Uint8Array(await file.arrayBuffer()),file.name,kind); if (version !== importVersions[kind]) return; state.imports[kind] = parsed; recalculateImports(); }
  catch(error) { if (version !== importVersions[kind]) return; state.imports[kind] = null; state.prepared = null; state.importErrors[kind] = `Could not read ${file.name}: ${error.message}`; }
  render();
}
async function loadExample() {
  if (p()) await persist(true);
  resetImport(); state.view = 'import'; state.loading = true; state.loadingMessage = 'Opening the example exports'; render(false);
  try {
    const files = await Promise.all([['quotation','quotations','Example Data - Quotation Manager.xlsx'],['codes','codes','Example Data - Code Manager.xlsx']].map(async ([kind,path,name]) => {
      const response = await fetch(`/samples/${path}.xlsx`); if (!response.ok) throw new Error(`The supplied ${kind} export could not be found.`);
      return [kind,await readExport(new Uint8Array(await response.arrayBuffer()),name,kind)];
    }));
    state.imports = Object.fromEntries(files); state.importName = state.imports.quotation.metadata.Project || 'Example data'; recalculateImports();
  } catch(error) { state.importErrors.quotation = error.message; }
  finally { state.loading = false; render(false); }
}
// A new finding opens a new suggestion: it starts Under review and pre-fills only what the researcher has not touched.
async function analyze(simulate = false) {
  cancelAnalysis(); const d = draft();
  state.providerBusy = true; state.analysisController = new AbortController(); const controller = state.analysisController;
  render();
  try {
    const args = {module:d.module,codeIds:d.codeIds,project:p(),signal:controller.signal};
    // Pi does the analysis. Each run checks it afresh, and the labelled simulation runs only when the researcher asks for it.
    if (!simulate) { state.pi = await piAvailable(); controller.signal.throwIfAborted(); }
    if (!simulate && !state.pi.available) throw new Error(`Althea AI is not available${state.pi.reason ? ` (${state.pi.reason})` : ''}`);
    const finding = simulate ? (d.module !== 'verification' && await exampleProvider.analyze(args)) || await simulationProviders[d.module].analyze(args) : await piProvider.analyze(args);
    controller.signal.throwIfAborted();
    const resolved = ['Approved','Rejected'].includes(normalStatus(d.reviewStatus));
    if (d.finding) (d.analysisHistory ||= []).push(structuredClone(d.finding));
    finding.preparationVersion = p().preparation.version || 1;
    d.finding = finding; d.stage = 5; d.reviewStatus = 'Under review'; d.editing = false;
    if (resolved) Object.assign(d, { decisionTouched:false, rationale:'', quotationChanges:{}, quotationDecisions:{}, quotationDrafts:{}, quotationSavedAt:{}, movedOut:[], classifications:{}, resolvedAt:undefined, implementationStatus:undefined });
    for (const [qid,c] of Object.entries(finding.classifications || {})) if (d.classifications[qid]?.origin !== 'researcher') d.classifications[qid] = { ...c, origin:'system' };
    if (!d.decisionTouched) for (const key of ['assessment','subgroups','action','core','boundary']) if (finding.suggestedFields?.[key] !== undefined) d[key] = finding.suggestedFields[key];
    if (!d.decisionTouched && finding.suggestedFields?.action === 'definition' && d.module !== 'definition') { d.newCore ||= selectedCode().definition; d.newBoundary ||= selectedCode().boundary; }
    d.recommendation = finding.suggestion || finding.suggestedFields?.recommendation || '';
    persist();
  } catch(error) { if (error.name !== 'AbortError') state.providerError = `The analysis could not complete: ${error.message.replace(/\.$/, '')}. You can still classify and decide manually.`; }
  finally { if (state.analysisController === controller) { state.providerBusy = false; state.analysisController = null; render(); } }
}
// Settings: the researcher's name, how Pi analyses, and starting afresh on this browser.
// Orientations a researcher can load: the built-in examples, other projects' orientations, and the older per-browser text.
function orientationSources(s) {
  return [...ORIENTATIONS.map(o => ({ key:`example:${o.key}`, group:'Examples', label:o.title, text:o.text })),
    ...state.projects.filter(x => x.id !== p()?.id && x.orientation?.trim()).map(x => ({ key:`project:${x.id}`, group:'Your other projects', label:x.name, text:x.orientation })),
    ...(s.instructions?.trim() ? [{ key:'browser', group:'Earlier settings', label:'Instructions saved in this browser', text:s.instructions }] : [])];
}
function orientationPicker(s) {
  const groups = Map.groupBy(orientationSources(s), o => o.group);
  return `<label class="field"><span>Load an existing orientation</span><select id="orientation-preset"><option value="">Choose one to load…</option>${[...groups].map(([group, list]) => `<optgroup label="${e(group)}">${list.map(o => `<option value="${e(o.key)}">${e(o.label)}</option>`).join('')}</optgroup>`).join('')}</select><small>Loads it into the field below, where you can adapt it before saving.</small></label>`;
}
function savingHelp() {
  return `<p class="fine">Althea saves every change automatically in this browser’s storage, on this computer only. Nothing is sent to a server or written back to ATLAS.ti.</p>
    <p class="fine"><strong>Backup project</strong> (top bar) downloads one <span class="mono">.althea.json</span> file with everything: the original exports, prepared data, codebook, reviews, findings, history and the methodological orientation. Keep it somewhere safe. It contains your quotations, so treat it like the interview data.</p>
    <p class="fine"><strong>On another computer</strong>, start Althea and choose <strong>Restore a backup</strong>. No database, ATLAS.ti project or original spreadsheets are needed there. Althea AI needs pi installed and logged in on that computer for new analyses, and the model and trace settings are chosen again because they belong to the browser.</p>
    <p class="fine"><strong>Export final files</strong> (Codebook) gives the reviewed quotation list and codebook as spreadsheets. They are for reading and reporting: ATLAS.ti cannot import them back.</p>`;
}
async function settingsDialog(focus = '') {
  state.pi = await piAvailable();
  // The default model's provider is listed first, since it is the one pi is logged in to.
  const s = piSettings(), pi = state.pi, first = pi.model?.split('/')[0];
  const providers = [...Map.groupBy(pi.models || [], m => m.id.split('/')[0])].sort(([a], [b]) => (b === first) - (a === first));
  const options = (list, value) => list.map(([v,l]) => `<option value="${e(v)}" ${v === value ? 'selected' : ''}>${e(l)}</option>`).join('');
  const analysis = pi.available ? `
    <label class="field"><span>Model</span><select id="settings-model"><option value="">Default model (${e(pi.model)})</option>${providers.map(([provider, models]) => `<optgroup label="${e(provider)}">${options(models.map(m => [m.id, m.name]), s.model)}</optgroup>`).join('')}</select><small>Only models pi has credentials for are listed. Log in to more providers with pi’s /login.</small></label>
    <label class="field"><span>Thinking</span><select id="settings-thinking"><option value="">Model default${pi.thinking ? ` (${e(pi.thinking)})` : ''}</option>${options(pi.thinkingLevels.map(t => [t, t]), s.thinking)}</select><small>More thinking can give closer readings but takes longer. Ignored by models without reasoning.</small></label>
    <label class="check-row"><input type="checkbox" id="settings-trace" ${s.showTrace ? 'checked' : ''}><span>Show Althea AI’s reasoning trace with each finding<small>The model’s reasoning and the tools it used while coding, for interpretability. Traces are recorded either way.</small></span></label>
    <details><summary>Althea AI’s built-in instructions</summary><p class="fine full-text">${e(pi.instructions)}</p></details>`
    : `<p class="alert warning">Althea AI is not available${pi.reason ? `: ${e(pi.reason)}` : ''}. Analyses use the labelled simulation. Install pi and log in with /login, then restart Althea.</p>`;
  openDialog('Settings', `<section class="settings-section"><h3>Researcher</h3><label class="field"><span>Your name</span><input id="settings-reviewer" value="${e(p()?.reviewer || state.reviewer)}" placeholder="Recorded with each decision"></label></section>
    <section class="settings-section"><h3>Althea AI</h3>${analysis}</section>
    <section class="settings-section" id="orientation"><h3>Methodological orientation</h3>${p() ? `${orientationPicker(s)}<label class="field"><span>Orientation for “${e(p().name)}”</span><small>${e(ORIENTATION_HELP)}</small><textarea id="settings-orientation" maxlength="10000" rows="8" placeholder="Empty: Althea AI uses only its built-in instructions. Write your own, or load an existing orientation above.">${e(p().orientation || '')}</textarea><small>Saved with this project and its backups, added to Althea AI’s built-in instructions for every analysis, and recorded with each finding.</small></label>` : '<p class="fine">Open or create a project to set its methodological orientation.</p>'}</section>
    <section class="settings-section"><h3>Saving and moving your work</h3>${savingHelp()}</section>
    <section class="settings-section"><h3>System check</h3><p class="fine">Checks that the server, browser storage, spreadsheet reader, Althea AI and your model are working.${lastCheck() ? ` Last passed ${date(lastCheck())}.` : ''}</p>${button('Run system check','system-check','secondary')}</section>
    <section class="settings-section"><h3>Start afresh</h3><p class="fine">Delete every project saved on this browser, with its reviews and history. Your Althea AI settings stay. Download a backup first if you may need a project again.</p>${button('Delete all projects…','reset-data','danger')}</section>`,
    button('Cancel','close-modal','quiet') + button('Save settings','save-settings','primary'));
  if (focus) { modal.querySelector('#' + focus)?.scrollIntoView({ block:'start' }); modal.querySelector('#settings-orientation')?.focus({ preventScroll:true }); }
}
// System check: runs on first launch and from Settings, so problems show before a project depends on them.
const CHECK_KEY = 'althea-system-check';
function lastCheck() { try { return localStorage.getItem(CHECK_KEY) || ''; } catch { return ''; } }
async function systemCheck() {
  const rows = [], token = Symbol();
  state.checkToken = token;
  openDialog('System check', '<p class="fine">Althea checks that everything it needs works on this computer. The model test sends one short prompt to your model provider.</p><ul class="check-list" id="check-list"></ul>', button('Run again','system-check','quiet') + button('Done','close-modal','primary'));
  const draw = () => { const list = modal.querySelector('#check-list'); if (list && state.checkToken === token) list.innerHTML = rows.map(r => `<li class="check-${r.state}"><span class="check-icon">${r.state === 'ok' ? icon('check') : r.state === 'fail' ? icon('close') : '<span class="spinner small"></span>'}</span><span><strong>${e(r.label)}</strong><span class="fine">${e(r.detail || 'Checking…')}</span>${r.state === 'fail' && r.fix ? `<span class="fine check-fix">${e(r.fix)}</span>` : ''}</span></li>`).join(''); };
  const set = (id, label, patch = {}) => { const row = rows.find(r => r.id === id); if (row) Object.assign(row, patch); else rows.push({ id, label, state:'run', ...patch }); draw(); };
  const check = async (id, label, run, fix) => { set(id, label); try { set(id, label, { state:'ok', detail:await run() }); return true; } catch (error) { set(id, label, { state:'fail', detail:error.message, fix }); return false; } };
  await check('storage', 'Browser storage', async () => { await storageWorks(); localStorage.setItem(CHECK_KEY + '-test', '1'); localStorage.removeItem(CHECK_KEY + '-test'); return 'Projects and settings can be saved in this browser.'; }, 'Allow site data for this address and avoid private windows, or your work is lost when the tab closes.');
  await check('reader', 'Spreadsheet reader', async () => { await import('../vendor/xlsx.mjs'); const r = await fetch('/samples/quotations.xlsx', { method:'HEAD' }).catch(() => ({ ok:false })); if (!r.ok) throw new Error('The example exports could not be loaded.'); return 'XLSX and CSV exports can be read; the example project is available.'; }, 'Check that the Althea server is running, then reload the page.');
  let server = [];
  const reached = await check('server', 'Althea server', async () => {
    const r = await fetch('/api/checkup').catch(() => { throw new Error('The Althea server could not be reached.'); });
    if (r.status === 404) throw new Error('This Althea server is out of date.');
    if (!r.ok) throw new Error(`The server answered ${r.status}.`);
    server = (await r.json()).checks; return 'Running on this computer.';
  }, 'Start Althea again with npm start in the project folder.');
  for (const c of server) set(c.id, c.label, { state:c.ok ? 'ok' : 'fail', detail:c.detail, fix:c.fix });
  const loggedIn = reached && server.find(c => c.id === 'login')?.ok;
  const model = loggedIn ? await check('model', 'Model test', async () => {
    const s = piSettings(), r = await fetch('/api/checkup/model', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ options:{ model:s.model, thinking:s.thinking } }) });
    const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.error || `The model test failed (${r.status}).`);
    return `${body.model} replied in ${(body.ms / 1000).toFixed(1)} s.`;
  }, 'Choose another model in Settings, or log in again with pi’s /login.') : (set('model', 'Model test', { state:'fail', detail:'Skipped: Althea AI is not ready.', fix:'Fix the checks above, then run the check again.' }), false);
  if (state.checkToken !== token) return;
  const passed = rows.every(r => r.state === 'ok');
  if (passed) { try { localStorage.setItem(CHECK_KEY, new Date().toISOString()); } catch {} }
  const list = modal.querySelector('#check-list');
  if (list) list.insertAdjacentHTML('afterend', passed ? '<p class="success-line">' + icon('check') + ' Everything works. You can start a project.</p>' : `<p class="alert ${model === false && rows.filter(r => r.state === 'fail').every(r => ['model','sdk','login'].includes(r.id)) ? 'warning' : 'error'}">Some checks failed. Follow the hints above, then run the check again.${rows.some(r => r.state === 'fail' && ['model','sdk','login'].includes(r.id)) ? ' Without Althea AI you can still import, prepare and review manually.' : ''}</p>`);
}
// Shown once after a project is created, since the orientation should be settled before the first analysis.
function orientationPrompt() {
  p().ui.orientationAsked = true; persist();
  openDialog('Set a methodological orientation?', `<p>Althea AI can follow the methodological assumptions of your study, for example your epistemology, ontology and how evidence and alternative readings should be treated.</p><p class="fine">${e(ORIENTATION_HELP)}</p><p class="fine">You can start from an example, such as a constructivist orientation, and change it any time in Settings.</p>`,
    button('Not now','close-modal','quiet') + button('Set orientation','open-orientation','primary'));
}
function exportDialog() {
  const rows = [['download-quotations','Quotation list','XLSX','Every quotation still in the dataset with its final codes, plus the quotations you uncoded on a separate sheet.'],
    ['download-codebook','Codebook','XLSX','Active codes with definitions, boundaries and quotation counts, plus retired and merged codes.'],
    ['export-history','Decision history','CSV','Every decision with its evidence, rationale, researcher and time.'],
    ['export-assignments','Quotation per code','CSV','One row per code–quotation pair, as on the Prepare screen.']];
  openDialog('Export final files', `<p class="fine">The files reflect the working project now. The original exports stay unchanged. ATLAS.ti cannot import these files back; use the decision history to apply changes there.</p><div class="export-list">${rows.map(([action,title,type,text]) => `<div class="export-row"><span><strong>${title}</strong> <small class="mono">${type}</small><span class="fine">${text}</span></span>${button(icon('download') + ' Download',action,'secondary')}</div>`).join('')}</div>`, button('Done','close-modal','primary'));
}
function restoreDialog() { openDialog('Restore a project backup', '<p>Choose an Althea JSON backup. It will be restored as a separate project so existing work is preserved.</p><label class="file-drop">' + icon('upload') + '<strong>Choose a project backup</strong><input type="file" id="backup-upload" accept=".json" aria-label="Project backup"></label>'); }
function viewFor(project) { const view = { overview:'scope', data:'prepare' }[project.ui.view] || project.ui.view; return VIEWS.includes(view) && !(['scope','review','confirm'].includes(view) && !isPrepared(project)) ? view : isPrepared(project) ? 'scope' : 'prepare'; }
async function restoreFile(file) {
  try { if (file.size > 120 * 1024 * 1024) throw new Error('This backup exceeds the 120 MB limit.'); const restored = validateBackup(JSON.parse(await file.text())); if (p()) await persist(true); restored.id = id('project'); restored.name += ' (restored)'; restored.updatedAt = new Date().toISOString(); state.project = restored; state.view = viewFor(restored); state.error = ''; modal.close(); await persist(true); render(false); toast('Project restored with originals, drafts, and history.'); } catch(error) { openDialog('Could not restore this backup',`<p class="alert error">${e(error.message)}</p>`,button('Choose another backup','restore','primary')); }
}
async function decide(resolution) {
  const d = draft(); decisionReady(d);
  const result = commitDecision(p(),previewDecision(p(),d,resolution));
  await persist(true); render();
  toast(resolution === 'defer' ? 'Deferred. The data is unchanged; reopen it from the deferred list.' : `${result.status}. The data is unchanged and the decision is kept in the history.`);
}
async function handleAction(action, node) {
  switch (action) {
    case 'home': go(p() ? viewFor(p()) : 'import'); break;
    case 'new-project': if (p()) await persist(true); resetImport(); go('import'); break;
    case 'load-example': await loadExample(); break;
    case 'create-project': {
      const reason = createReady(); if (reason) throw new Error(reason);
      state.project = createProject(state.importName,state.imports,state.prepared,state.reviewer,state.grouped); state.view = 'prepare'; state.project.ui.view = 'prepare';
      await persist(true); render(false); toast('Project created. Inspect the issues, then prepare the data.'); if (!state.project.orientation) orientationPrompt(); break;
    }
    case 'prepare-data': prepareProject(p()); await persist(true); render(); toast('Data prepared. The raw exports are unchanged.'); break;
    case 'accept-issues': for (const g of issueRows()) if (g.status === 'Open') p().preparation.issueStatus[g.key] = 'Accepted'; persist(); render(); break;
    case 'revalidate': {
      const project = p();
      const prepared = prepareImports(project.imports,{delimiter:project.preparation.delimiter,childColumn:project.preparation.childColumn});
      if (prepared.issues.some(i => i.severity === 'error')) throw new Error('Revalidation found blocking errors. Original exports and prior prepared work are retained. Start a new import to correct the source files.');
      const { issueStatus = {}, ...previous } = project.preparation;
      (project.preparationVersions ||= []).push(structuredClone(previous));
      project.preparation = {...project.preparation, ...prepared.summary, version:(project.preparation.version || 1)+1, preparedAt:new Date().toISOString(), issues:prepared.issues, issueStatus};
      await persist(true); render(); toast('New preparation version recorded. Working changes kept; analyse earlier findings again.'); break;
    }
    case 'projects': openDialog('Your saved projects',state.projects.length ? `<div class="project-list">${state.projects.map(project => `<div class="project-row">${projectCard(project)}${button('Delete','delete-project','danger',`data-id="${e(project.id)}" aria-label="Delete project ${e(project.name)}"`)}</div>`).join('')}</div>` : '<p>No saved projects yet.</p>',button('Restore backup','restore') + button('New project','new-project','primary')); break;
    case 'resume': if (p()) await persist(true); state.project = structuredClone(state.projects.find(project => project.id === node.dataset.id)); state.view = viewFor(state.project); state.reviewer = state.project.reviewer; state.error = ''; setSaveStatus('Saved on this browser'); modal.close(); render(false); break;
    case 'reviewer': await settingsDialog(); break;
    case 'open-orientation': await settingsDialog('orientation'); break;
    case 'system-check': await systemCheck(); break;
    case 'export-files': exportDialog(); break;
    case 'download-quotations': download(`${p().name.replace(/[^a-z0-9_-]/gi,'-')}_quotations.xlsx`,await workbook(finalQuotationSheets(p())),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); break;
    case 'download-codebook': download(`${p().name.replace(/[^a-z0-9_-]/gi,'-')}_codebook.xlsx`,await workbook(finalCodebookSheets(p())),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); break;
    case 'save-settings': {
      state.reviewer = document.querySelector('#settings-reviewer').value.trim(); if (p()) { p().reviewer = state.reviewer; persist(); }
      const value = selector => document.querySelector(selector)?.value ?? '';
      const orientation = document.querySelector('#settings-orientation'); if (p() && orientation) { p().orientation = orientation.value.trim(); persist(); }
      const saved = !state.pi.available || savePiSettings({ model:value('#settings-model'), thinking:value('#settings-thinking'), showTrace:!!document.querySelector('#settings-trace')?.checked });
      modal.close(); render(); toast(saved ? 'Settings saved.' : 'Your name is saved, but this browser blocked saving the Althea AI settings.'); break;
    }
    case 'delete-project': {
      const project = state.projects.find(x => x.id === node.dataset.id); if (!project) break;
      openDialog('Delete this project?', `<p>This permanently deletes “${e(project.name)}” from this browser: ${plural(project.quotations.length,'quotation')}, ${plural(project.reviews.length,'decision')}, its originals and history. It cannot be undone.</p><p class="fine">${project.id === p()?.id ? 'This is the project you have open. ' : ''}Download a backup first if you may need it again. Backups you already downloaded are not affected.</p>`,
        button('Keep project','projects','quiet') + button('Delete project','confirm-delete-project','danger',`data-id="${e(project.id)}"`)); break;
    }
    case 'confirm-delete-project': {
      const id = node.dataset.id, open = id === p()?.id, name = state.projects.find(x => x.id === id)?.name || 'The project';
      // Deleting the open project: stop its pending saves first, so it is not written back.
      if (open) { cancelAnalysis(); state.project = null; clearTimeout(saveTimer); await saveChain.catch(() => {}); }
      await deleteProject(id);
      state.projects = state.projects.filter(x => x.id !== id);
      modal.close();
      if (open) { resetImport(); go('import'); } else render();
      toast(`“${name}” was deleted.`); break;
    }
    case 'reset-data': openDialog('Delete all projects?', `<p>This permanently deletes ${plural(state.projects.length,'saved project')} on this browser, including originals, reviews and history. It cannot be undone.</p><p class="fine">Project backups you downloaded are not affected and can be restored later.</p>`, button('Keep my projects','reviewer','quiet') + button(`Delete ${plural(state.projects.length,'project')}`,'confirm-reset','danger')); break;
    case 'confirm-reset':
      // Stop pending and future saves first, so nothing is written back after the store is cleared.
      cancelAnalysis(); state.project = null; clearTimeout(saveTimer); await saveChain.catch(() => {});
      await deleteAllProjects(); location.reload(); break;
    case 'show-deferred': setFilter('historyStatus','Deferred'); go('history'); break;
    case 'review-code': p().ui.codeId = node.dataset.id; go('review'); break;
    case 'page': setFilter(node.dataset.key,Number(node.dataset.page)); render(false); break;
    case 'show-all-evidence': setFilter('evidenceAll',true); render(); break;
    case 'show-evidence': { const qid = node.dataset.id; setFilter('evidenceSearch',''); setFilter('evidenceClass',''); setFilter('evidenceAll',true); render(); const target = document.getElementById(`quote-${qid}`); target?.scrollIntoView({block:'center'}); target?.focus({preventScroll:true}); break; }
    case 'analyze': await analyze(); break;
    case 'simulate': await analyze(true); break;
    case 'cancel-analysis': cancelAnalysis(); render(); break;
    case 'save-quotation': { const d = draft(), qid = node.dataset.id; let message = ''; try { message = saveQuotation(d, qid); state.quoteError = null; } catch (error) { state.quoteError = { qid, message:error.message }; } await persist(true); render(); if (message) toast(message); break; }
    case 'discard-quotation': { const d = draft(); delete d.quotationDrafts?.[node.dataset.id]; state.quoteError = null; persist(); render(); break; }
    case 'save-review': { const d = draft(); decisionReady(d); saveReview(p(),d); await persist(true); render(); toast('Review saved. The project data is unchanged.'); break; }
    case 'edit-suggestion': { const d = draft(); d.editing = true; d.recommendation ||= d.finding?.suggestion || ''; persist(); render(); document.querySelector('#field-recommendation')?.focus(); break; }
    case 'approve': { const d = draft(); decisionReady(d); d.quotationChanges = buildQuotationChanges(d); previewDecision(p(),d,'approve'); persist(); go('confirm'); break; }
    case 'reject': await decide('reject'); break;
    case 'defer': await decide('defer'); break;
    case 'confirm-save': {
      const d = draft(), preview = previewDecision(p(),d,'approve'); commitDecision(p(),preview);
      await persist(true); go('review');
      toast(`Approved${preview.codeChanges.length || preview.removed.length || preview.added.length || preview.flagged.length ? ' and applied' : ''}. The previous values are kept in the history.`); break;
    }
    case 'reopen': { const d = reopenSuggestion(p(),node.dataset.key); openSuggestion(d); go('review'); toast('Reopened with its original evidence. It is under review again.'); break; }
    case 'open-suggestion': openSuggestion(p().drafts[node.dataset.key]); go('review'); break;
    case 'split-assignments': splitDialog(); break;
    case 'split-page': splitDialog(Number(node.dataset.page)); break;
    case 'close-modal': captureScroll(); modal.close(); render(); break;
    case 'open-navigation': openDialog('Workspace',document.querySelector('.sidebar').innerHTML); modal.classList.add('navigation-dialog'); break;
    case 'backup': backup(); toast('Backup downloaded. Restore it with “Restore a backup” here or on another computer.'); break;
    case 'restore': restoreDialog(); break;
    case 'download-source': { const file = p().imports[node.dataset.kind]; download(file.name,Uint8Array.from(atob(file.bytes),c => c.charCodeAt(0)),'application/octet-stream'); break; }
    case 'export-assignments': { const qs = new Map(p().quotations.map(q => [q.id,q])), cs = new Map(p().codes.map(c => [c.id,c])); download('quotation_per_code.csv',csv(['quotation_id','text','code','source','coder','created','note','flag','review_status'],p().assignments.map(a => { const q = qs.get(a.quotationId), c = cs.get(a.codeId); return [q.quotationId,q.text,c.label,q.source,q.coder,q.created,[q.note,c.importedComment].filter(Boolean).join('\n'),a.flag || '',codeStatus(c.id)]; })),'text/csv;charset=utf-8'); break; }
    case 'export-codebook': { const counts = countsByCode(p()); download('althea_codebook.csv',csv(['code_id','code','parent','core_concept','boundary','imported_comment','groups','quotations','status','active','source_rows'],p().codes.map(c => [c.id,c.label,c.parentLabel,c.definition,c.boundary,c.importedComment,c.groups,counts.get(c.id) || 0,c.status,c.active,c.sourceRows.join('; ')])),'text/csv;charset=utf-8'); break; }
    case 'export-history': download('althea_decisions.csv',csv(['action_id','review_id','action','status','implementation','researcher','timestamp','rationale','evidence_ids','affected_codes','code_changes','removed_assignments','added_assignments','flagged_assignments','assessment'],p().history.map(h => [h.id,h.reviewId,h.action,normalStatus(h.status),h.implementationStatus || '',h.reviewer,h.timestamp,h.rationale,h.evidenceIds.join('; '),h.affectedCodeIds.join('; '),JSON.stringify(h.codeChanges),JSON.stringify(h.removed),JSON.stringify(h.added),JSON.stringify(h.flagged || []),JSON.stringify(p().reviews.find(r => r.id === h.reviewId))])),'text/csv;charset=utf-8'); break;
  }
  if (modal.open && ['new-project','resume'].includes(action)) modal.close();
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]'); if (nav) { event.preventDefault(); if (!nav.disabled) go(nav.dataset.view); return; }
  const node = event.target.closest('[data-action]'); if (!node || node.disabled) return;
  event.preventDefault();
  try { await handleAction(node.dataset.action,node); } catch(error) { showError(error.message); }
});
document.addEventListener('input', event => {
  const node = event.target;
  if (node.dataset.draft) { const d = draft(); d[node.dataset.draft] = node.value; d.decisionTouched = true; persist(); if (node.tagName === 'SELECT') render(); else if (['core','boundary','newCore','newBoundary'].includes(node.dataset.draft)) { const count = countWords(d.module === 'definition' ? d.core + ' ' + d.boundary : d.newCore + ' ' + d.newBoundary); const label = document.querySelector('#word-count'); if (label) { label.textContent = `${count} of 50 words`; label.classList.toggle('field-error',count > 50); } } }
  if (node.dataset.filter) { const key = node.dataset.filter; setFilter(key,node.value); if (key.startsWith('prep')) setFilter('prepPage',0); if (key.startsWith('book')) setFilter('bookPage',0); clearTimeout(state.filterTimer); state.filterTimer = setTimeout(() => render(),node.tagName === 'SELECT' ? 0 : 180); }
  if (node.id === 'import-name') { state.importName = node.value; const reason = createReady(); const btn = document.querySelector('[data-action="create-project"]'); if (btn) btn.disabled = !!reason; const note = document.querySelector('#create-reason'); if (note) note.textContent = reason || 'Available because a name is entered and both files passed validation.'; }
  if (node.id === 'import-reviewer') state.reviewer = node.value;
  if (node.dataset.qnewlabel) { const d = draft(), qid = node.dataset.qnewlabel; editQuotation(d, qid, { newLabel:node.value }); persist(); const dirty = !!d.quotationDrafts[qid], card = document.getElementById(`quote-${qid}`); card?.classList.toggle('is-dirty', dirty); const save = card?.querySelector('[data-action="save-quotation"]'); if (save) save.disabled = !dirty; const note = card?.querySelector('[data-save-note]'); if (note && dirty) note.textContent = 'Unsaved changes'; }
  if (node.dataset.splitLabel !== undefined) { draft().splitLabels[Number(node.dataset.splitLabel)] = node.value; persist(); }
});
document.addEventListener('change', async event => {
  const node = event.target;
  try {
    if (node.dataset.file && node.files[0]) await loadFile(node.files[0],node.dataset.file);
    if (node.id === 'backup-upload' && node.files[0]) await restoreFile(node.files[0]);
    if (node.id === 'group-duplicates') { state.grouped = node.checked; render(); }
    if (node.id === 'orientation-preset' && node.value) {
      const source = orientationSources(piSettings()).find(o => o.key === node.value), field = document.querySelector('#settings-orientation');
      if (source && (!field.value.trim() || confirm(`Replace the text in the field with “${source.label}”?`))) { field.value = source.text; field.focus(); toast(`Loaded “${source.label}”. Adapt it, then save the settings.`); }
      node.value = '';
    }
    if (node.dataset.issue) { p().preparation.issueStatus[node.dataset.issue] = node.value; persist(); render(); }
    if (node.name === 'fn') { cancelAnalysis(); p().ui.module = node.value; persist(); render(); }
    if (node.id === 'scope-code') { cancelAnalysis(); p().ui.codeId = node.value; setFilter('evidenceSearch',''); setFilter('evidenceClass',''); setFilter('evidenceAll',false); render(); }
    if (node.dataset.classify) { editQuotation(draft(), node.dataset.classify, { rating:node.value }); persist(); render(); }
    if (node.dataset.qdecision) { const d = draft(), qid = node.dataset.qdecision, { current } = quotationState(d, qid); const otherCode = p().assignments.find(a => a.quotationId === qid && a.codeId !== d.codeIds[0])?.codeId || ''; editQuotation(d, qid, { choice:node.value, targetCodeId:current.targetCodeId || (node.value === 'existing' ? otherCode : '') }); persist(); render(); document.querySelector(node.value === 'new' ? `#qnew-${CSS.escape(qid)}` : `[data-qtarget="${qid}"]`)?.focus(); }
    if (node.dataset.qtarget) { editQuotation(draft(), node.dataset.qtarget, { targetCodeId:node.value }); persist(); render(); }
    if (node.dataset.qchange) { const d = draft(); d.quotationChanges[node.dataset.qchange].include = node.checked; persist(); render(); }
    if (node.dataset.splitAssignment) { draft().splitAssignments[node.dataset.splitAssignment] = node.value; persist(); }
  } catch(error) { toast(error.message); }
});
document.addEventListener('dragover', event => { if (event.target.closest('[data-drop]')) { event.preventDefault(); event.target.closest('[data-drop]').classList.add('dragging'); } });
document.addEventListener('dragleave', event => event.target.closest('[data-drop]')?.classList.remove('dragging'));
document.addEventListener('drop', async event => { const target = event.target.closest('[data-drop]'); if (!target) return; event.preventDefault(); target.classList.remove('dragging'); if (event.dataTransfer.files[0]) await loadFile(event.dataTransfer.files[0],target.dataset.drop); });
document.addEventListener('visibilitychange', () => { if (document.hidden && p()) { captureScroll(); persist(true); } });
window.addEventListener('beforeunload', event => { if (state.saveStatus === 'Not saved' || state.saveStatus === 'Saving…') { event.preventDefault(); event.returnValue = ''; } });

try { state.projects = await allProjects(); if (state.projects.length) { state.project = structuredClone(state.projects[0]); state.view = viewFor(state.project); state.saveStatus = 'Saved on this browser'; state.reviewer = state.project.reviewer; } }
catch(error) { state.error = 'Browser storage is unavailable. You can still work and download project backups. ' + error.message; }
render(false);
piAvailable().then(status => { state.pi = status; });
// A fresh install (no projects, never passed) runs the system check straight away.
if (!state.projects.length && !lastCheck()) systemCheck();
