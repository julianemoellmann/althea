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
  const issue = (severity, type, file, row, message, action, extra = {}) => issues.push({ id: `issue-${issues.length + 1}`, severity, type, file, row, message, action, status: 'Open', ...extra });
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
    if (ids.has(rawId)) issue('warning', 'Duplicate quotation ID', quotation.name, index + 2, `${rawId} also occurs on row ${ids.get(rawId)}. Records remain separate.`, 'Inspect both source rows; internal row IDs keep them distinct.');
    ids.set(rawId, index + 2);
    const q = { id: `q${index + 2}`, quotationId: rawId, text, source: value(quotation, row, 'source'), coder: value(quotation, row, 'coder'), created: value(quotation, row, 'created'), note: value(quotation, row, 'note'), sourceRow: index + 2 };
    quotations.push(q);
    const names = splitCodes(value(quotation, row, 'codes'));
    if (!names.length) issue('warning', 'Uncoded quotation', quotation.name, index + 2, `${rawId} has no codes. It will remain available in the quotation browser.`, 'Review later or add a coding assignment.');
    for (const name of names) {
      if (!codeMap.has(name)) {
        codeMap.set(name, { id: `c${codeMap.size + 1}`, label: name, parentLabel: '', definition: '', boundary: '', importedComment: '', groups: '', sourceRows: [], status: 'Unreviewed', active: true });
        issue('warning', 'Code absent from manager', quotation.name, index + 2, `${name} occurs in quotations but not in the Code Manager.`, 'Retain it as a working code with quotation provenance.');
      }
      const c = codeMap.get(name), key = `${q.id}|${c.id}`;
      if (pairs.has(key)) { issue('warning', 'Duplicate assignment', quotation.name, index + 2, `${rawId} lists ${name} more than once.`, 'The prepared table contains this assignment once; the original row is preserved.'); continue; }
      pairs.add(key); assignments.push({ quotationId: q.id, codeId: c.id });
    }
  }
  if (!quotations.length) issue('error', 'Empty quotations', quotation.name, null, 'The export has no quotation records.', 'Import a file containing quotations.');
  if (!codeMap.size) issue('error', 'Empty codebook', codes.name, null, 'The exports have no code records.', 'Import a file containing codes.');
  const used = new Set(assignments.map(a => a.codeId));
  const unused = [...codeMap.values()].filter(c => !used.has(c.id));
  if (unused.length) issue('warning', 'Unused codes', codes.name, null, `${unused.length} codes have no quotations in this export.`, 'Retain them in the codebook; filter to “No quotations” to inspect.');
  const missingMetadata = quotations.filter(q => !q.source || !q.coder || !q.created).length;
  if (missingMetadata) issue('warning', 'Optional metadata missing', quotation.name, null, `${missingMetadata} quotations lack source, creator, or date metadata.`, 'Continue with the available evidence.');
  const allCodes = [...codeMap.values()].map(c => ({ ...c, parentId: codeMap.get(c.parentLabel)?.id || null }));
  const assignmentCounts = new Map(); assignments.forEach(a => assignmentCounts.set(a.quotationId, (assignmentCounts.get(a.quotationId) || 0) + 1));
  return { quotations, codes: allCodes, assignments, issues, delimiter, childColumn: childCol,
    summary: { quotations: quotations.length, codes: allCodes.length, codeRows: codes.rows.filter(r => r.some(Boolean)).length, sources: new Set(quotations.map(q => q.source).filter(Boolean)).size, assignments: assignments.length, multiCode: [...assignmentCounts.values()].filter(n => n > 1).length, duplicateGroups: duplicateGroups.length, unusedCodes: unused.length } };
}

export function csv(columns, rows) {
  const encode = x => { let s = String(x ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  return '\uFEFF' + [columns, ...rows].map(row => row.map(encode).join(',')).join('\r\n');
}
