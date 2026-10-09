import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readExport, prepareImports, guessMapping, parseCsv, csv } from '../src/data.js';
import { createProject, emptyDraft, previewDecision, commitDecision, validateBackup, quotesFor, countWords } from '../src/model.js';
import { exampleProvider } from '../src/analysis.js';

const file = (name, headers, rows, kind) => ({name,headers,rows,mapping:guessMapping(headers,kind),bytes:'c291cmNl',metadata:{},sheetName:'Sheet1'});
function imports() { return {
  quotation:file('quotations.csv',['Number','Text Content','Codes','Source','Creator','Creation Date'],[
    ['1:1','My own voice is recognizable.','Voice, Expression','Interview 1','Researcher','2026-08-13'],
    ['1:2','I keep my style.','Voice','Interview 1','Researcher','2026-08-13'],
    ['2:1','The tool helps me experiment.','Expression','Interview 2','Researcher','2026-08-14'],
  ],'quotation'),
  codes:file('codes.csv',['Code','','Groundedness','Comment'],[['○ Voice','',2,'Original voice note'],['','○ Style',0,''],['○ Expression','',2,'']],'codes'),
}; }
function project() { const source = imports(); return createProject('Test project',source,prepareImports(source),'Test reviewer',true); }
function draft(p, module='coherence', ids=['c1']) { return {...emptyDraft(p,module,ids),assessment:'Moderate',overlap:4,rationale:'The selected quotations support this decision.',evidenceIds:['q2']}; }
const bytes = text => new TextEncoder().encode(text);

test('actual exports reconcile and preserve original bytes and hierarchy', async () => {
  const qBytes = new Uint8Array(await readFile(new URL('../Training Data - Quotation Manager.xlsx',import.meta.url)));
  const cBytes = new Uint8Array(await readFile(new URL('../Training Data - Code Manager.xlsx',import.meta.url)));
  const quotation = await readExport(qBytes,'Quotation Manager.xlsx','quotation');
  const codes = await readExport(cBytes,'Code Manager.xlsx','codes');
  const result = prepareImports({quotation,codes});
  assert.deepEqual(result.summary,{quotations:1905,codes:2934,codeRows:2970,sources:124,assignments:6834,multiCode:1905,duplicateGroups:13,unusedCodes:370});
  assert.equal(result.issues.filter(i => i.needsGrouping).length,13);
  assert.equal(result.issues.filter(i => i.severity === 'error' || i.type === 'Code absent from manager').length,0);
  assert.equal(Buffer.from(quotation.bytes,'base64').compare(qBytes),0);
  assert.equal(result.quotations[0].created,'2026-08-13 12:19:20');
  assert.equal(quotation.metadata.Project,'Training Data');
  const child = result.codes.find(c => c.label === 'Adaptability (2): Control in decision-making');
  assert.equal(result.codes.find(c => c.id === child.parentId).label,'Adaptability (2)');
  assert.throws(() => createProject('Sample',{quotation,codes},result,'Reviewer',false),/group/);
  const p = createProject('Sample',{quotation,codes},result,'Reviewer',true);
  assert.equal(validateBackup(JSON.parse(JSON.stringify(p))).quotations.length,1905);
  const authenticity = p.codes.find(c => c.label === 'Authenticity');
  for (const module of ['coherence','verification','definition','comparison']) {
    const finding = await exampleProvider.analyze({module,codeIds:[authenticity.id],project:p});
    assert.equal(finding.origin,'example');
    assert.equal(finding.evidenceIds.length,3);
    assert(finding.evidenceIds.every(qid => quotesFor(p,authenticity.id).some(q => q.id === qid)));
    if (module === 'definition') assert(countWords(finding.suggestedFields.core + ' ' + finding.suggestedFields.boundary) <= 50);
  }
});
test('CSV handles quoted commas, escaped quotes, CRLF, multiline text, and semicolon files', () => {
  assert.deepEqual(parseCsv('A,B\r\n1,"line one\nline ""two"", more"\r\n'),[['A','B'],['1','line one\nline "two", more']]);
  assert.deepEqual(parseCsv('A;B\n1;two'),[['A','B'],['1','two']]);
  assert.throws(() => parseCsv('A,B\n1,"unfinished'),/unclosed/);
  assert.throws(() => parseCsv('A,B\n1,"bad"tail'),/unexpected text/);
  assert.throws(() => parseCsv('A,B\n1'),/different numbers/);
});
test('unreadable, oversized, and unsupported inputs fail instead of validating', async () => {
  await assert.rejects(readExport(bytes('not a workbook'),'bad.xlsx','quotation'),/readable XLSX/);
  await assert.rejects(readExport(bytes('Number,Text Content,Codes\n1,"bad'),'bad.csv','quotation'),/unclosed/);
  await assert.rejects(readExport(bytes('hello'),'bad.xls','quotation'),/CSV or XLSX/);
  await assert.rejects(readExport(new Uint8Array(25*1024*1024+1),'big.xlsx','quotation'),/25 MB/);
});
test('missing files, columns, identifiers, and text block preparation', () => {
  assert(prepareImports({quotation:null,codes:null}).issues.every(i => i.severity === 'error'));
  const input = imports(); input.quotation.mapping.id = -1;
  let result = prepareImports(input); assert(result.issues.some(i => i.type === 'Missing column'));
  input.quotation.mapping.id = 0; input.quotation.rows[0][0] = ''; input.quotation.rows[1][1] = '';
  result = prepareImports(input);
  assert(result.issues.some(i => i.type === 'Missing quotation ID'));
  assert(result.issues.some(i => i.type === 'Missing quotation text'));
  assert.throws(() => createProject('Test',input,result,'Reviewer',true),/blocking/);
});
test('duplicate labels require explicit grouping and retain source rows', () => {
  const input = imports(); input.codes.rows.push(['○ Voice','',1,'Another note']);
  const result = prepareImports(input);
  assert.equal(result.summary.duplicateGroups,1);
  assert.deepEqual(result.codes[0].sourceRows,[2,5]);
  assert.throws(() => createProject('Test',input,result,'Reviewer',false),/Confirm/);
  const p = createProject('Test',input,result,'Reviewer',true);
  assert.equal(p.imports.codes.rows[3][3],'Another note');
});
test('uncoded quotations and duplicate quotation identifiers stay separate', () => {
  const input = imports(); input.quotation.rows[1][0] = '1:1'; input.quotation.rows[2][2] = '';
  const result = prepareImports(input);
  assert.equal(result.quotations.length,3);
  assert.equal(new Set(result.quotations.map(q => q.id)).size,3);
  assert(result.issues.some(i => i.type === 'Duplicate quotation ID'));
  assert(result.issues.some(i => i.type === 'Uncoded quotation'));
});
test('duplicate assignments deduplicate per row and known delimiter-bearing labels stay intact', () => {
  const input = imports(); input.quotation.rows[0][2] = 'Voice, Voice, Art, music'; input.codes.rows.push(['○ Art, music','',1,'']);
  const result = prepareImports(input);
  assert.equal(result.assignments.filter(a => a.quotationId === 'q2').length,2);
  assert(result.issues.some(i => i.type === 'Duplicate assignment'));
  assert(!result.issues.some(i => i.type === 'Code absent from manager'));
});
test('preview is side effect free and commit records exact rename with unchanged originals', () => {
  const p = project(), original = JSON.stringify(p), d = {...draft(p),action:'rename',newLabel:'Personal voice'};
  const preview = previewDecision(p,d);
  assert.equal(JSON.stringify(p),original);
  assert.equal(preview.codeChanges[0].before.label,'Voice');
  assert.equal(preview.codeChanges[0].after.label,'Personal voice');
  const originals = JSON.stringify([p.imports,p.original]);
  commitDecision(p,preview);
  assert.equal(p.codes[0].label,'Personal voice');
  assert.equal(p.codes[1].parentLabel,'Personal voice');
  assert.equal(JSON.stringify([p.imports,p.original]),originals);
  assert.equal(p.history[0].reviewer,'Test reviewer');
  assert.equal(p.history[0].status,'Implemented');
  assert.throws(() => commitDecision(p,preview),/changed after/);
});
test('keep, reject, defer, and note record without altering working coding', () => {
  for (const resolution of ['approve','reject','defer','note']) {
    const p = project(), before = JSON.stringify([p.codes,p.assignments]);
    commitDecision(p,previewDecision(p,draft(p),resolution));
    assert.equal(JSON.stringify([p.codes,p.assignments]),before);
    assert.equal(p.history.length,1);
    assert.equal(p.reviews.length,1);
  }
});
test('all four modules can complete and invalid evidence, reviewer, or rationale is rejected', () => {
  for (const module of ['coherence','verification','definition','comparison']) {
    const p = project(); const ids = module === 'comparison' ? ['c1','c3'] : ['c1'];
    const d = {...draft(p,module,ids),core:'Personal creative voice.',boundary:'Include personal style; exclude efficiency alone.',explanation:'Voice concerns identity, expression concerns the act of creation.',action:module === 'definition' ? 'definition' : 'keep'};
    commitDecision(p,previewDecision(p,d));
    assert.equal(p.reviews[0].module,module);
  }
  const p = project();
  assert.throws(() => previewDecision(p,{...draft(p),evidenceIds:['q4']}),/no longer belongs/);
  assert.throws(() => previewDecision(p,{...draft(p),rationale:''}),/rationale/);
  p.reviewer = ''; assert.throws(() => previewDecision(p,draft(p)),/reviewer/);
});
test('definition requires both parts and enforces the word limit', () => {
  const p = project();
  const d = {...draft(p,'definition'),action:'definition',core:'One '.repeat(51),boundary:'Exclude technical tasks.'};
  assert.throws(() => previewDecision(p,d),/50 words/);
  d.core = ''; assert.throws(() => previewDecision(p,d),/both/);
});
test('comparison requires distinct codes and a meaningful boundary record', () => {
  const p = project();
  assert.throws(() => previewDecision(p,draft(p,'comparison',['c1','c1'])),/different/);
  assert.throws(() => previewDecision(p,draft(p,'comparison',['c1','c3'])),/boundary/);
  assert.throws(() => previewDecision(p,{...draft(p,'comparison',['c1','c3']),explanation:'The concepts are distinct.',overlap:''}),/overlap score/);
});
test('subcodes do not move any quotations without a recoding decision', () => {
  const p = project(), before = JSON.stringify(p.assignments);
  commitDecision(p,previewDecision(p,{...draft(p),action:'subcode',newLabel:'A new subtype'}));
  assert.equal(p.codes.at(-1).parentId,'c1');
  assert.equal(JSON.stringify(p.assignments),before);
});
test('split moves only explicitly selected quotations and preserves unassigned ones', () => {
  const p = project(), d = {...draft(p),action:'split',splitLabels:['Style focus','Identity focus'],splitAssignments:{q2:'0'}};
  const preview = previewDecision(p,d);
  assert.equal(preview.removed.length,1); assert.equal(preview.added.length,1);
  commitDecision(p,preview);
  assert(p.assignments.some(a => a.quotationId === 'q3' && a.codeId === 'c1'));
  assert(p.assignments.some(a => a.quotationId === 'q2' && a.codeId === p.codes.find(c => c.label === 'Style focus').id));
  assert(!p.assignments.some(a => a.quotationId === 'q2' && a.codeId === 'c1'));
  assert.equal(p.codes[0].active,true);
});
test('split refuses implicit or invalid assignments and duplicate replacement names', () => {
  const p = project(), d = {...draft(p),action:'split',splitLabels:['New one','New two'],splitAssignments:{}};
  assert.throws(() => previewDecision(p,d),/Explicitly/);
  d.splitAssignments = {q4:'0'}; assert.throws(() => previewDecision(p,d),/no longer belongs/);
  d.splitAssignments = {q2:'2'}; assert.throws(() => previewDecision(p,d),/valid replacement/);
  d.splitLabels = ['Voice','New two']; assert.throws(() => previewDecision(p,d),/already exists/);
});
test('merge retains source history, reparents children, and deduplicates overlap', () => {
  const p = project(), d = {...draft(p,'comparison',['c1','c3']),action:'merge',targetCodeId:'c3',explanation:'The team decided the conceptual boundary is not useful.'};
  commitDecision(p,previewDecision(p,d));
  assert.equal(p.codes[0].active,false);
  assert.equal(p.codes[0].mergedInto,'c3');
  assert.equal(p.codes[1].parentId,'c3');
  assert.equal(p.assignments.length,3);
  assert(p.assignments.every(a => a.codeId === 'c3'));
  assert.equal(validateBackup(p),p);
});
test('merge into a new code archives both originals', () => {
  const p = project(), d = {...draft(p,'comparison',['c1','c3']),action:'merge',mergeNewLabel:'Creative voice',explanation:'Both codes capture one reviewed concept.'};
  commitDecision(p,previewDecision(p,d));
  assert(!p.codes.find(c => c.id === 'c1').active);
  assert(!p.codes.find(c => c.id === 'c3').active);
  assert(p.assignments.every(a => a.codeId === p.codes.at(-1).id));
});
test('merging a parent into its child cannot create a hierarchy cycle', () => {
  const p = project(), d = {...draft(p,'comparison',['c1','c2']),action:'merge',targetCodeId:'c2',explanation:'Narrow the parent to the child concept.'};
  commitDecision(p,previewDecision(p,d));
  assert.equal(p.codes[1].parentId,null);
  assert.equal(validateBackup(p),p);
});
test('merging a parent into a grandchild does not create an indirect cycle', () => {
  const p = project();
  p.codes.push({...structuredClone(p.codes[1]),id:'c4',label:'Detailed style',parentId:'c2'});
  commitDecision(p,previewDecision(p,{...draft(p,'comparison',['c1','c4']),action:'merge',targetCodeId:'c4',explanation:'Use the most specific surviving code.'}));
  assert.equal(p.codes.find(c => c.id === 'c4').parentId,null);
  assert.equal(validateBackup(p),p);
});
test('recoding add, remove, and replace affects only the selected evidence', () => {
  for (const mode of ['add','remove','replace']) {
    const p = project(), d = {...draft(p),action:'recode',targetCodeId:'c2',recodeMode:mode};
    commitDecision(p,previewDecision(p,d));
    assert.equal(p.assignments.some(a => a.codeId === 'c1' && a.quotationId === 'q2'),mode === 'add');
    assert.equal(p.assignments.some(a => a.codeId === 'c2' && a.quotationId === 'q2'),mode !== 'remove');
    assert(p.assignments.some(a => a.codeId === 'c1' && a.quotationId === 'q3'));
    assert(p.assignments.some(a => a.codeId === 'c3' && a.quotationId === 'q2'));
  }
});
test('project backup roundtrip retains drafts, decisions, source bytes, and evidence links', () => {
  const p = project(), d = draft(p,'verification');
  d.classifications.q2 = {rating:'Strong match',note:'Explicit personal voice.'};
  commitDecision(p,previewDecision(p,d));
  p.ui.filters.codeSearch = 'voice'; p.ui.scroll['review:evidence'] = 220;
  const restored = validateBackup(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(restored,p);
  const bad = structuredClone(p); bad.assignments[0].quotationId = 'unknown'; assert.throws(() => validateBackup(bad),/broken/);
  const cycle = structuredClone(p); cycle.codes[0].parentId = 'c2'; assert.throws(() => validateBackup(cycle),/cycle/);
  const brokenDraft = structuredClone(p); Object.values(brokenDraft.drafts)[0].classifications = null; assert.throws(() => validateBackup(brokenDraft),/invalid review draft/);
  const brokenHistory = structuredClone(p); brokenHistory.history[0].affectedCodeIds = null; assert.throws(() => validateBackup(brokenHistory),/invalid history/);
  const missingSource = structuredClone(p); delete missingSource.imports.quotation.bytes; assert.throws(() => validateBackup(missingSource),/source file/);
});
test('export quoting preserves multiline text and neutralizes spreadsheet formulas', () => {
  const output = csv(['text','code'],[['hello,\n"world"','=HYPERLINK("bad")']]);
  const parsed = parseCsv(output);
  assert.equal(parsed[1][0],'hello,\n"world"');
  assert.equal(parsed[1][1],"'=HYPERLINK(\"bad\")");
});
test('example provider has no generic fabricated findings and respects cancellation', async () => {
  assert.equal(await exampleProvider.analyze({module:'coherence',codeIds:['c1'],project:project()}),null);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(exampleProvider.analyze({module:'coherence',codeIds:['c1'],project:project(),signal:controller.signal}),{name:'AbortError'});
});
