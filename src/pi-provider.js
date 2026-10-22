/** Browser side of the Pi adapter. Same contract as the simulated providers:
 * analyze({module, codeIds, project, signal}) -> Promise<finding>. The project is sent as a read-only copy
 * to the local server, which runs the pi agent (agent/pi-analyst.mjs). Nothing here mutates the project.
 */
export function piPayload(project, codeIds) {
  const code = project.codes.find(c => c.id === codeIds[0] && c.active);
  if (!code) throw new Error('Select an active code.');
  const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
  return {
    code: pick(code, ['id', 'label', 'parentLabel', 'definition', 'boundary', 'importedComment']),
    codes: project.codes.filter(c => c.active).map(c => pick(c, ['id', 'label', 'definition', 'importedComment'])),
    quotations: project.quotations.map(q => pick(q, ['id', 'quotationId', 'text', 'source'])),
    assignments: project.assignments.map(a => pick(a, ['quotationId', 'codeId'])),
  };
}

// The researcher's Pi settings belong to this browser, like a preference; each finding records what it used.
const SETTINGS_KEY = 'althea-pi-settings';
export function piSettings() {
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); return { model: s?.model || '', thinking: s?.thinking || '', instructions: s?.instructions || '' }; }
  catch { return { model: '', thinking: '', instructions: '' }; }
}
export function savePiSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true; } catch { return false; }
}

export async function piAvailable() {
  // A 404 means the server predates Pi support (or is a static build), not that pi is missing.
  try { const r = await fetch('/api/pi/status'); return r.ok ? await r.json() : { available: false, reason: r.status === 404 ? 'this Althea server has no Pi support. Restart it with npm start' : `the server answered ${r.status}` }; }
  catch { return { available: false, reason: 'the Althea server could not be reached' }; }
}

export const piProvider = {
  async analyze({ module, codeIds, project, signal }) {
    signal?.throwIfAborted();
    const response = await fetch('/api/analyze', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module, payload: piPayload(project, codeIds), options: piSettings() }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Pi request failed (${response.status})`);
    return { ...body.finding, projectRevision: project.revision };
  },
};
