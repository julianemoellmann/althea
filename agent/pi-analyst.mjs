/** Server-side Pi adapter. Runs one isolated pi agent session per analysis and returns a finding in the
 * same shape as the simulated providers. The agent sees a read-only slice of the project through tools and
 * reports through a single structured `submit_finding` tool; it can never change the project.
 * Requires the pi SDK: a project install of `@earendil-works/pi-coding-agent`, ALTHEA_PI_SDK, or the pi on PATH.
 */
import { createRequire } from 'node:module';
import { existsSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { evaluationQuestions } from '../src/verification.js';
import { ACTIONS } from '../src/model.js';

const RATINGS = { verification: ['Strong', 'Borderline', 'Outlying'], coherence: ['Core', 'Peripheral', 'Outlying'], definition: ['Prototypical', 'Borderline', 'Atypical'] };
const TASKS = {
  verification: 'Verify whether the quotations support the code. Answer each evaluation question, rate the overall alignment, and classify every quotation as Strong, Borderline or Outlying.',
  coherence: 'Assess internal coherence: do the quotations share one conceptual core, or do they form distinct subgroups? Classify every quotation as Core, Peripheral or Outlying and name any subgroups.',
  definition: 'Draft a code definition (a core concept and an inclusion/exclusion boundary rule, together at most 50 words) grounded in the quotations. Classify every quotation as Prototypical, Borderline or Atypical for testing the draft.',
};
const SYSTEM = `You support a qualitative researcher reviewing an ATLAS.ti codebook. You propose evidence-linked interpretations; the researcher decides.
Rules:
- Ground every claim in the quotations. Each quotation is listed as [internal ID] (ATLAS.ti ID). In prose, cite the ATLAS.ti ID (for example "11:11"); use the internal ID (for example "q12") only in evidenceIds and classifications.
- Never claim to know, prove or validate. State uncertainty plainly and say what needs the researcher's reading.
- Use the tools to read other codes or search the corpus when a comparison would change your assessment.
- Finish by calling submit_finding exactly once. Do not write a final answer outside that tool.`;

const PACKAGE = '@earendil-works/pi-coding-agent';
// Prefer an explicit path, then a project install, then the global install that provides `pi` on PATH.
function sdkManifest() {
  if (process.env.ALTHEA_PI_SDK) return path.join(process.env.ALTHEA_PI_SDK, 'package.json');
  try { return createRequire(import.meta.url).resolve(`${PACKAGE}/package.json`); } catch {}
  for (const dir of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    // npm global layouts: <prefix>/node_modules on Windows, <prefix>/lib/node_modules elsewhere.
    for (const root of [path.join(dir, 'node_modules'), path.join(dir, '..', 'lib', 'node_modules')]) {
      const manifest = path.join(root, PACKAGE, 'package.json');
      if (existsSync(manifest)) return realpathSync(manifest);
    }
  }
  throw new Error('The pi SDK was not found. Install pi, or set ALTHEA_PI_SDK.');
}

let pi;
// The SDK is optional: Althea runs without it, and the endpoint reports Pi as unavailable.
export async function loadPi() {
  if (pi) return pi;
  const manifest = sdkManifest();
  const fromSdk = createRequire(manifest);
  const sdk = await import(pathToFileURL(path.join(path.dirname(manifest), 'dist/index.js')).href);
  // typebox ships with the SDK; resolve it from there so Althea has no direct dependency.
  const { Type } = await import(pathToFileURL(fromSdk.resolve('typebox')).href);
  return (pi = { sdk, Type });
}

let runtime;
export async function modelRuntime() { return (runtime ||= await (await loadPi()).sdk.ModelRuntime.create()); }

export const THINKING = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
const MAX_INSTRUCTIONS = 4000;
const modelName = model => `${model.provider}/${model.id}`;

// The server default: ALTHEA_PI_MODEL (pi's CLI syntax, "provider/model[:thinking]"), else pi's own default.
function defaults(sdk, models) {
  const settings = sdk.SettingsManager.create(process.cwd());
  const env = process.env.ALTHEA_PI_MODEL && sdk.resolveCliModel({ cliModel: process.env.ALTHEA_PI_MODEL, modelRuntime: models });
  return { model: env?.model ? modelName(env.model) : [settings.getDefaultProvider(), settings.getDefaultModel()].filter(Boolean).join('/'), thinking: env?.thinkingLevel || settings.getDefaultThinkingLevel() || '' };
}
// Everything the settings dialog needs: whether Pi can run, which models are logged in, and the built-in instructions.
export async function piStatus() {
  try {
    const { sdk } = await loadPi(), models = await modelRuntime();
    const available = await models.getAvailable();
    const { model, thinking } = defaults(sdk, models);
    return { available: available.length > 0, model: model || 'pi default', thinking, thinkingLevels: THINKING, instructions: SYSTEM, maxInstructions: MAX_INSTRUCTIONS,
      models: available.map(m => ({ id: modelName(m), name: m.name || m.id, reasoning: !!m.reasoning })).sort((a, b) => a.id.localeCompare(b.id)) };
  } catch (error) { return { available: false, reason: error.message }; }
}

const text = value => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 1) }], details: {} });
const quoteLine = (q, labels) => `[${q.id}] (${q.quotationId}${labels.length ? `; also coded: ${labels.join(', ')}` : ''}) ${q.text}`;

/** payload: { code, codes, quotations, assignments } — a read-only copy of the project sent by the browser.
 * options: { model: "provider/id", thinking, instructions } from the researcher's settings; each is optional. */
export async function analyzeWithPi({ module, payload, options = {}, signal, model: override, onEvent = () => {} }) {
  if (!TASKS[module]) throw new Error(`Pi does not support the ${module} function.`);
  const instructions = String(options.instructions || '').trim();
  if (instructions.length > MAX_INSTRUCTIONS) throw new Error(`Keep the instructions under ${MAX_INSTRUCTIONS} characters.`);
  if (options.thinking && !THINKING.includes(options.thinking)) throw new Error(`Unknown thinking level "${options.thinking}".`);
  const { sdk, Type } = await loadPi(), models = await modelRuntime();
  const { code, codes, quotations, assignments } = payload;
  const label = id => codes.find(c => c.id === id)?.label;
  const codesOf = new Map(quotations.map(q => [q.id, []]));
  assignments.forEach(a => codesOf.get(a.quotationId)?.push(a.codeId));
  const own = quotations.filter(q => codesOf.get(q.id)?.includes(code.id));
  const others = q => codesOf.get(q.id).filter(id => id !== code.id).map(label);
  const ownIds = new Set(own.map(q => q.id));

  let submitted;
  const rating = Type.Union(RATINGS[module].map(r => Type.Literal(r)));
  const tools = [
    sdk.defineTool({ name: 'list_codes', label: 'List codes', description: 'List every code in the codebook with its definition and number of quotations.',
      parameters: Type.Object({}),
      execute: async () => text(codes.map(c => ({ label: c.label, definition: c.definition || c.importedComment || '', quotations: assignments.filter(a => a.codeId === c.id).length }))) }),
    sdk.defineTool({ name: 'get_code_quotations', label: 'Read code', description: 'Read all quotations assigned to another code, by its exact label.',
      parameters: Type.Object({ label: Type.String() }),
      execute: async (_id, { label: wanted }) => {
        const other = codes.find(c => c.label.toLowerCase() === wanted.toLowerCase());
        if (!other) return text(`No code is labelled "${wanted}".`);
        return text(quotations.filter(q => codesOf.get(q.id).includes(other.id)).map(q => quoteLine(q, [])).join('\n') || 'No quotations.');
      } }),
    sdk.defineTool({ name: 'search_quotations', label: 'Search', description: 'Case-insensitive text search across all quotations in the project, coded or not.',
      parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number()) }),
      execute: async (_id, { query, limit = 20 }) => text(quotations.filter(q => q.text.toLowerCase().includes(query.toLowerCase())).slice(0, limit).map(q => quoteLine(q, codesOf.get(q.id).map(label))).join('\n') || 'No matches.') }),
    sdk.defineTool({ name: 'submit_finding', label: 'Submit finding', description: 'Submit the finding for the researcher. Call exactly once, at the end.',
      parameters: Type.Object({
        title: Type.String({ description: 'Short heading for the finding.' }),
        assessment: Type.Union([Type.Literal('Strong'), Type.Literal('Moderate'), Type.Literal('Weak')], { description: 'Overall alignment or coherence.' }),
        evidenceSummary: Type.String(), interpretation: Type.String(),
        confidence: Type.String({ description: 'Level and reason, e.g. "Medium. Two passages are ambiguous."' }),
        suggestion: Type.String({ description: 'What the researcher might do next.' }),
        action: Type.Union(Object.keys(ACTIONS).map(k => Type.Literal(k))),
        evidenceIds: Type.Array(Type.String(), { description: 'Up to three quotation IDs that best illustrate the finding.' }),
        classifications: Type.Array(Type.Object({ id: Type.String(), rating, note: Type.String() }), { description: 'One entry per quotation of this code.' }),
        ...(module === 'verification' && { answers: Type.Array(Type.String(), { description: `Answers, in order, to: ${evaluationQuestions.join(' | ')}` }) }),
        ...(module === 'coherence' && { subgroups: Type.String({ description: 'Semicolon-separated subgroup names, or empty.' }) }),
        ...(module === 'definition' && { core: Type.String(), boundary: Type.String() }),
        limitation: Type.String({ description: 'What this analysis could not establish.' }),
      }),
      execute: async (_id, params) => { submitted = params; return text('Recorded. Stop now.'); } }),
  ];

  const resourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: sdk.createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }), getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }), getAgentsFiles: () => ({ agentsFiles: [] }),
    // The researcher's instructions add to the built-in rules; they cannot remove the submit_finding contract.
    getSystemPrompt: () => instructions ? `${SYSTEM}\n\nThe researcher's additional instructions:\n${instructions}` : SYSTEM, getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [],
    extendResources: () => {}, reload: async () => {},
  };
  const wanted = options.model || process.env.ALTHEA_PI_MODEL;
  const chosen = wanted && sdk.resolveCliModel({ cliModel: wanted, modelRuntime: models });
  if (chosen?.error) throw new Error(chosen.error);
  if (chosen && !chosen.model) throw new Error(`The model "${wanted}" is not available in pi.`);
  const thinkingLevel = options.thinking || chosen?.thinkingLevel || undefined;
  // The researcher's pi settings supply the default model; extensions and skills stay off via the loader above.
  const settingsManager = sdk.SettingsManager.create(process.cwd());
  settingsManager.applyOverrides({ compaction: { enabled: false }, retry: { enabled: true, maxRetries: 2 } });
  const { session } = await sdk.createAgentSession({
    model: override || chosen?.model, ...(thinkingLevel && { thinkingLevel }), modelRuntime: models, resourceLoader, customTools: tools, tools: tools.map(t => t.name),
    sessionManager: sdk.SessionManager.inMemory(), settingsManager,
  });
  const abort = () => session.abort();
  signal?.addEventListener('abort', abort, { once: true });
  session.subscribe(event => { if (event.type === 'tool_execution_start') onEvent({ type: 'tool', name: event.toolName }); });
  try {
    signal?.throwIfAborted();
    const definition = [code.definition, code.boundary].filter(Boolean).join(' ') || code.importedComment || 'none';
    await session.prompt(`${TASKS[module]}

Code: "${code.label}"${code.parentLabel ? ` (subcode of "${code.parentLabel}")` : ''}
Current definition or Code Manager comment: ${definition}
Quotations (${own.length}):
${own.map(q => quoteLine(q, others(q))).join('\n') || 'None.'}`);
    signal?.throwIfAborted();
    if (!submitted) throw new Error(session.agent.state.errorMessage || 'The agent finished without submitting a finding.');
    const model = session.model ? modelName(session.model) : 'pi';
    // What produced the finding travels with it, so History shows the model and instructions behind each decision.
    return { ...toFinding(module, code, own, submitted, model, ownIds), thinking: session.thinkingLevel, ...(instructions && { instructions }) };
  } finally { signal?.removeEventListener('abort', abort); session.dispose(); }
}

// Map the agent's report onto the provider contract and drop anything that cites quotations outside the code.
function toFinding(module, code, own, f, model, ownIds) {
  const evidenceIds = f.evidenceIds.filter(id => ownIds.has(id)).slice(0, 3);
  const classifications = Object.fromEntries(f.classifications.filter(c => ownIds.has(c.id)).map(c => [c.id, { rating: c.rating, note: c.note }]));
  const missing = own.length - Object.keys(classifications).length;
  const label = { verification: 'Verification', coherence: 'Coherence', definition: 'Definition draft' }[module];
  return {
    title: f.title || `${label} of ${code.label}`, module, origin: 'pi', version: 'althea-pi-v1', model,
    provenance: `AI-generated interpretation · Pi agent (${model}) · review required`,
    timestamp: new Date().toISOString(), coverage: own.length, evidenceIds, classifications,
    rating: module === 'definition' ? `${String(`${f.core || ''} ${f.boundary || ''}`).trim().split(/\s+/u).filter(Boolean).length} of 50 words` : f.assessment.toUpperCase(),
    evidenceSummary: f.evidenceSummary, interpretation: f.interpretation, confidence: f.confidence, suggestion: f.suggestion,
    ...(module === 'verification' && { questions: evaluationQuestions.map((question, i) => ({ question, answer: f.answers?.[i] || '', evidenceIds })) }),
    suggestedFields: { assessment: f.assessment, recommendation: f.suggestion, action: f.action,
      ...(module === 'coherence' && { subgroups: f.subgroups || '' }), ...(module === 'definition' && { core: f.core, boundary: f.boundary }) },
    limitation: `${f.limitation}${missing > 0 ? ` ${missing} quotation${missing === 1 ? ' was' : 's were'} not classified by the agent.` : ''}`,
  };
}
