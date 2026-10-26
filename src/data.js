const cleanHeader = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const cleanCode = value => String(value ?? '').replace(/^\s*○\s*/, '').trim();
export const fields = {
  quotation: { id: ['Number', 'Quotation ID', 'id', 'Reference'], text: ['Text Content', 'Quotation Content', 'text'], codes: ['Codes'], source: ['Source', 'Document'], coder: ['Creator', 'Coder'], created: ['Creation Date', 'Created'], note: ['Comment', 'Note'] },
  codes: { label: ['Code'], groundedness: ['Groundedness', 'Grounded'], groups: ['Groups'], note: ['Comment', 'Definition'], coder: ['Creator'], created: ['Creation Date'] },
};
export const requiredFields = { quotation: ['id', 'text', 'codes'], codes: ['label'] };
export function guessMapping(headers, kind) {
  return Object.fromEntries(Object.entries(fields[kind]).map(([field, aliases]) => {
    const index = aliases.map(alias => headers.findIndex(h => cleanHeader(h) === cleanHeader(alias))).find(i => i >= 0);
    return [field, index ?? -1];
  }));
}
export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0];
  const delimiter = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], value = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else value += ch;
    } else if (ch === '"') {
      if (value || closed) throw new Error('Malformed CSV: unexpected quotation mark.');
      quoted = true;
    } else if (ch === delimiter || ch === '\n' || ch === '\r') {
      row.push(value); value = ''; closed = false;
      if (ch !== delimiter) { rows.push(row); row = []; if (ch === '\r' && text[i + 1] === '\n') i++; }
    } else {
      if (closed && ch.trim()) throw new Error('Malformed CSV: unexpected text after a quoted value.');
      if (!closed) value += ch;
    }
  }
  if (quoted) throw new Error('Malformed CSV: an unclosed quoted value was found.');
  if (value || row.length || closed) { row.push(value); rows.push(row); }
  if (!rows.length) throw new Error('This file is empty.');
  if (rows.some((r, i) => i > 0 && r.some(x => x !== '') && r.length !== rows[0].length)) throw new Error('Malformed CSV: rows have different numbers of columns.');
  return rows;
}
export function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export async function readExport(bytes, name, kind) {
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('The file exceeds the 25 MB limit.');
  const extension = name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx'].includes(extension)) throw new Error('Choose a CSV or XLSX export.');
  let rows, metadata = {}, sheetName = 'CSV';
  if (extension === 'csv') rows = parseCsv(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  else {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('This is not a readable XLSX workbook.');
    let XLSX;
    try { XLSX = await import('../vendor/xlsx.mjs'); } catch { throw new Error('The spreadsheet parser could not load. Reload the app or use a CSV export.'); }
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheets = workbook.SheetNames.filter(n => n.toLowerCase() !== 'info');
    if (!sheets.length) throw new Error('No data worksheet was found.');
    sheetName = sheets.find(n => {
      const first = XLSX.utils.sheet_to_json(workbook.Sheets[n], { header: 1, defval: '' })[0] || [];
      const mapping = guessMapping(first, kind);
      return requiredFields[kind].every(f => mapping[f] >= 0);
    }) || sheets[0];
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: true });
    // Excel's visible date format can omit the time. Preserve its full stored precision.
    const dateColumns = (rows[0] || []).map((h,i) => /date|created|modified/i.test(String(h)) ? i : -1).filter(i => i >= 0);
    for (const row of rows.slice(1)) for (const column of dateColumns) if (typeof row[column] === 'number') {
      const parts = XLSX.SSF.parse_date_code(row[column]);
      if (parts) { const pad = x => String(x).padStart(2,'0'); row[column] = `${parts.y}-${pad(parts.m)}-${pad(parts.d)} ${pad(parts.H)}:${pad(parts.M)}:${pad(parts.S)}`; }
    }
    const info = workbook.SheetNames.find(n => n.toLowerCase() === 'info');
    if (info) metadata = Object.fromEntries(XLSX.utils.sheet_to_json(workbook.Sheets[info], { header: 1, defval: '' }).filter(r => r[0]).map(r => [String(r[0]).replace(/:$/, ''), String(r[1] || '')]));
  }
  if (!rows.length || !rows[0].some(Boolean)) throw new Error('No column headers were found.');
  const headers = rows[0].map(String);
  return { name, size: bytes.length, bytes: base64(bytes), sheetName, headers, rows: rows.slice(1), metadata, mapping: guessMapping(headers, kind) };
}

export function prepareImports(imports, options = {}) {
  const { quotation, codes } = imports;
  const issues = [];
  const issue = (severity, type, file, row, message, action, extra = {}) => issues.push({ id: `issue-${issues.length + 1}`, severity, type, file, row, message, action, status: 'Open', where: row ? `Row ${row}` : '', ...extra });
  for (const [kind, file] of Object.entries({ quotation, codes })) {
    if (!file) { issue('error', 'Missing file', kind, null, `Add the ${kind === 'codes' ? 'Code' : 'Quotation'} Manager export.`, 'Upload the required export.'); continue; }
    for (const field of requiredFields[kind]) if (!(file.mapping[field] >= 0) || file.mapping[field] >= file.headers.length) issue('error', 'Missing column', file.name, 1, `Map the required ${field} column.`, 'Choose a column in the mapping controls.');
    const mapped = Object.values(file.mapping).filter(i => i >= 0);
    if (new Set(mapped).size !== mapped.length) issue('error', 'Conflicting mapping', file.name, 1, 'A column is mapped to multiple fields.', 'Choose distinct columns.');
  }
  if (issues.length) return { issues, quotations: [], codes: [], assignments: [], summary: {}, delimiter: options.delimiter || ',' };
  const value = (file, row, field) => file.mapping[field] >= 0 ? String(row[file.mapping[field]] ?? '') : '';
  const codeMap = new Map(); let parent = '';
  const labelCol = codes.mapping.label;
  const childCol = options.childColumn !== undefined ? Number(options.childColumn) : (codes.headers[labelCol + 1] === '' ? labelCol + 1 : -1);
  for (const [index, row] of codes.rows.entries()) {
    if (!row.some(v => String(v ?? '').trim())) continue;
    const primary = cleanCode(row[labelCol]);
    const child = childCol >= 0 ? cleanCode(row[childCol]) : '';
    if (primary) parent = primary;
    if (!primary && !child) { issue('warning', 'Missing code label', codes.name, index + 2, 'A Code Manager row has no label.', 'Correct the source file or retain it as an unused source row.'); continue; }
    if (!primary && !parent) { issue('error', 'Missing parent', codes.name, index + 2, `The child code “${child}” has no parent.`, 'Correct the hierarchy or choose a different child column.'); continue; }
    const label = primary || `${parent}: ${child}`;
    if (!codeMap.has(label)) codeMap.set(label, { id: `c${codeMap.size + 1}`, label, parentLabel: primary ? '' : parent, definition: '', boundary: '', importedComment: value(codes, row, 'note'), groups: value(codes, row, 'groups'), sourceRows: [], status: 'Unreviewed', active: true });
    codeMap.get(label).sourceRows.push(index + 2);
  }
  const duplicateGroups = [...codeMap.values()].filter(c => c.sourceRows.length > 1);
  duplicateGroups.forEach(c => issue('warning', 'Duplicate code name', codes.name, c.sourceRows.join(', '), `${c.label} appears in ${c.sourceRows.length} source rows.`, 'Explicitly group these matching labels to use one working code; all source rows remain preserved.', { codeLabel: c.label, needsGrouping: true }));
  const quotations = [], assignments = [], ids = new Map(), pairs = new Set();
  const rawCodes = quotation.rows.map(r => value(quotation, r, 'codes'));
  const delimiter = options.delimiter || (rawCodes.some(v => v.includes(',')) ? ',' : rawCodes.some(v => v.includes(';')) ? ';' : ',');
  const labels = [...codeMap.keys()].sort((a, b) => b.length - a.length);
  function splitCodes(text) {
    const result = []; let rest = text.trim();
    while (rest) {
      const known = labels.find(label => rest === label || rest.startsWith(label + delimiter) || rest.startsWith(label + ' ' + delimiter));
      if (known) { result.push(known); rest = rest.slice(known.length).trim(); if (rest.startsWith(delimiter)) rest = rest.slice(1).trim(); }
      else { const at = rest.indexOf(delimiter); result.push((at < 0 ? rest : rest.slice(0, at)).trim()); rest = at < 0 ? '' : rest.slice(at + 1).trim(); }
    }
    return result.filter(Boolean);
  }
  if (!options.delimiter && rawCodes.some(v => v.includes(';')) && rawCodes.some(v => v.includes(','))) issue('warning', 'Check code delimiter', quotation.name, null, 'Both commas and semicolons occur in code fields.', 'Review the delimiter selection and preview before preparing data.');
  for (const [index, row] of quotation.rows.entries()) {
    if (!row.some(v => String(v ?? '').trim())) continue;
    const rawId = value(quotation, row, 'id'), text = value(quotation, row, 'text');
    if (!rawId.trim()) issue('error', 'Missing quotation ID', quotation.name, index + 2, 'A quotation has no identifier.', 'Correct this row in the source export and import it again.');
    if (!text.trim()) issue('error', 'Missing quotation text', quotation.name, index + 2, `Quotation ${rawId || index + 2} has no text.`, 'Correct the source export and import it again.');
    if (ids.has(rawId)) issue('warning', 'Duplicate quotation ID', quotation.name, index + 2, `${rawId} also occurs on row ${ids.get(rawId)}. Records remain separate.`, 'Inspect both source rows; internal row IDs keep them distinct.', { where: rawId });
    ids.set(rawId, index + 2);
    const q = { id: `q${index + 2}`, quotationId: rawId, text, source: value(quotation, row, 'source'), coder: value(quotation, row, 'coder'), created: value(quotation, row, 'created'), note: value(quotation, row, 'note'), sourceRow: index + 2 };
    quotations.push(q);
    const names = splitCodes(value(quotation, row, 'codes'));
    if (!names.length) issue('warning', 'Blank Codes field', quotation.name, index + 2, `${rawId} has no codes.`, 'Keep the quotations for later review; no code row is created.', { where: rawId });
    for (const name of names) {
      if (!codeMap.has(name)) {
        codeMap.set(name, { id: `c${codeMap.size + 1}`, label: name, parentLabel: '', definition: '', boundary: '', importedComment: '', groups: '', sourceRows: [], status: 'Unreviewed', active: true });
        issue('warning', 'Code absent from Code Manager', quotation.name, index + 2, `${name} occurs in quotations but not in the Code Manager.`, 'Confirm the label, or add the code to the Code Manager export.', { where: `Code “${name}”` });
      }
      const c = codeMap.get(name), key = `${q.id}|${c.id}`;
      if (pairs.has(key)) { issue('warning', 'Duplicate quotation–code pair', quotation.name, index + 2, `${rawId} lists ${name} more than once.`, 'Flagged, not merged. Check whether the code was assigned twice.', { where: rawId }); continue; }
      pairs.add(key); assignments.push({ quotationId: q.id, codeId: c.id });
    }
  }
  if (!quotations.length) issue('error', 'Empty quotations', quotation.name, null, 'The export has no quotation records.', 'Import a file containing quotations.');
  if (!codeMap.size) issue('error', 'Empty codebook', codes.name, null, 'The exports have no code records.', 'Import a file containing codes.');
  const used = new Set(assignments.map(a => a.codeId));
  const unused = [...codeMap.values()].filter(c => !used.has(c.id));
  unused.forEach(c => issue('warning', 'Code unused', codes.name, c.sourceRows.join(', ') || null, `${c.label} has no quotations in this export.`, 'No quotations assigned. Nothing to review; the code stays in the codebook.', { where: `Code “${c.label}”` }));
  // Groundedness is ATLAS.ti's own assignment count, so a mismatch means the two exports are out of step.
  if (codes.mapping.groundedness >= 0) {
    const counts = new Map(); assignments.forEach(a => counts.set(a.codeId, (counts.get(a.codeId) || 0) + 1));
    for (const [index, row] of codes.rows.entries()) {
      const label = cleanCode(row[labelCol]), grounded = row[codes.mapping.groundedness], c = codeMap.get(label);
      if (c && c.sourceRows.length === 1 && grounded !== '' && Number.isFinite(Number(grounded)) && Number(grounded) !== (counts.get(c.id) || 0)) issue('warning', 'Groundedness differs', codes.name, index + 2, `${label}: Code Manager reports ${Number(grounded)} quotations, the Quotation Manager has ${counts.get(c.id) || 0}.`, 'Check that both exports come from the same ATLAS.ti project state.', { where: `Code “${label}”` });
    }
  }
  const missingMetadata = quotations.filter(q => !q.source || !q.coder || !q.created).length;
  if (missingMetadata) issue('warning', 'Missing metadata', quotation.name, null, `${missingMetadata} quotations lack source, creator, or date metadata.`, 'Continue with the available evidence.', { where: `${missingMetadata} quotations` });
  const allCodes = [...codeMap.values()].map(c => ({ ...c, parentId: codeMap.get(c.parentLabel)?.id || null }));
  const assignmentCounts = new Map(); assignments.forEach(a => assignmentCounts.set(a.quotationId, (assignmentCounts.get(a.quotationId) || 0) + 1));
  return { quotations, codes: allCodes, assignments, issues, delimiter, childColumn: childCol,
    summary: { quotations: quotations.length, codes: allCodes.length, codeRows: codes.rows.filter(r => r.some(Boolean)).length, sources: new Set(quotations.map(q => q.source).filter(Boolean)).size, assignments: assignments.length, multiCode: [...assignmentCounts.values()].filter(n => n > 1).length, duplicateGroups: duplicateGroups.length, unusedCodes: unused.length } };
}

// sheets: [[name, rows]], each row an array of plain values. Cells are written as values, never as formulas.
export async function workbook(sheets) {
  const XLSX = await import('../vendor/xlsx.mjs'), book = XLSX.utils.book_new();
  for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' });
}
export function csv(columns, rows) {
  const encode = x => { let s = String(x ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  return '\uFEFF' + [columns, ...rows].map(row => row.map(encode).join(',')).join('\r\n');
}

// What each issue means for the analysis, in the researcher's terms. Blocking errors stop the import;
// warnings let it continue, and their consequence is stated so the researcher can decide.
export const ISSUE_HELP = {
  'Missing file': 'Althea needs both exports: quotations carry the coded text, and the Code Manager supplies the codebook.',
  'Missing column': 'A column Althea relies on could not be found. Without it, quotations or codes cannot be read correctly.',
  'Conflicting mapping': 'The same column is used for two different fields, so one of them would be read wrongly.',
  'Missing parent': 'A child code appears before any parent code, so its place in the hierarchy is unknown.',
  'Missing quotation ID': 'Without an ID, decisions about this quotation cannot be traced back to ATLAS.ti.',
  'Missing quotation text': 'A quotation without text cannot be read or used as evidence.',
  'Empty quotations': 'The export contains no quotations, so there is nothing to review.',
  'Empty codebook': 'Neither export contains any codes, so there is nothing to review.',
  'Blank Codes field': 'These quotations were exported without any code. They stay in the project but do not appear in any code’s evidence, so no review function will look at them.',
  'Check code delimiter': 'Commas and semicolons both appear in the Codes column. If the wrong one is used, code names can be split in the wrong place.',
  'Code absent from Code Manager': 'A code is used in the quotations but missing from the codebook export. It may be a typo, a renamed code, or an export taken at a different time.',
  'Code unused': 'The code is in the codebook but no quotation uses it, so there is no evidence to review. It may be new, or obsolete.',
  'Duplicate code name': 'The same code name appears on several Code Manager rows. Althea cannot tell which row each quotation refers to, so they are treated as one code.',
  'Duplicate quotation ID': 'Two rows share a quotation ID. Both are kept as separate quotations, but references by ID may be ambiguous.',
  'Duplicate quotation–code pair': 'The same code is listed twice on one quotation. Althea counts it once, so code counts may differ slightly from the raw export.',
  'Groundedness differs': 'ATLAS.ti’s own count of quotations for this code does not match the quotation export. The two files may come from different moments in the project.',
  'Missing code label': 'A Code Manager row has no name, so it cannot be matched to any quotation.',
  'Missing metadata': 'Source, coder or date is missing for some quotations. The text can still be reviewed, but less context is shown alongside it.',
};
// Issues of one type in one file are reviewed together, as the researcher sees them.
export function groupIssues(issues) {
  const groups = new Map();
  for (const i of issues) {
    const key = `${i.type}|${i.file}`;
    if (!groups.has(key)) groups.set(key, { key, type: i.type, file: i.file, severity: i.severity, action: i.action, where: [], messages: [], count: 0 });
    const g = groups.get(key); g.count++; if (i.where) g.where.push(i.where); g.messages.push(i.message);
  }
  return [...groups.values()].sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1));
}
