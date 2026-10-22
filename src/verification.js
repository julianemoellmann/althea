import { quotesFor, countWords } from './model.js';

export const evaluationQuestions = [
  'Do the quotations support the current code label?',
  'Which words, phrases, or meanings justify the code?',
  'How strongly are the quotations aligned with the code?',
  'Does the code cover more than one underlying concept?',
  'Is the code too broad, too narrow, or overlapping?',
  'Is a definition needed to clarify the conceptual boundary?',
];
const PROVENANCE = 'Simulated analysis · local lexical demonstration · no AI calls';

function wait(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 650);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
// Label words are reduced to a short stem so that "Skepticism" also finds "skeptical".
const stems = label => [...new Set(label.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(t => t.length > 3).map(t => t.slice(0, Math.max(4, t.length - 3)));
// The lexical signals every simulated function shares: label-word matches and co-assigned codes.
function signals(project, code) {
  const quotes = quotesFor(project, code.id), terms = stems(code.label);
  const others = new Map(project.quotations.map(q => [q.id, []]));
  project.assignments.forEach(a => { if (a.codeId !== code.id) others.get(a.quotationId)?.push(a.codeId); });
  const rows = quotes.map(q => ({ q, hits: terms.filter(t => q.text.toLowerCase().includes(t)), other: others.get(q.id) || [] }));
  const related = new Map(); rows.forEach(r => r.other.forEach(cid => related.set(cid, (related.get(cid) || 0) + 1)));
  const neighbors = [...related].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cid, count]) => ({ label: project.codes.find(c => c.id === cid)?.label, count }));
  return { quotes, terms, rows, neighbors, matched: rows.filter(r => r.hits.length) };
}
// Matches are central; unmatched passages that also carry another code sit furthest from the label.
const tier = r => r.hits.length ? 0 : r.other.length ? 2 : 1;
const rate = ratio => ratio >= .7 ? 'Strong' : ratio >= .4 ? 'Moderate' : 'Weak';
function base(project, code, module, s, extra) {
  const ordered = [...s.rows].sort((a, b) => tier(a) - tier(b));
  return { title: `${extra.label} of ${code.label}`, origin: 'simulation', provenance: PROVENANCE, module,
    evidenceIds: ordered.slice(0, 3).map(r => r.q.id), coverage: s.quotes.length, matched: s.matched.length,
    timestamp: new Date().toISOString(), version: 'althea-simulator-v2', projectRevision: project.revision, ...extra };
}

// A deliberately limited local stand-in for the asynchronous Pi provider.
// Lexical matches are illustrative signals, never semantic validation.
export const verificationProvider = {
  async analyze({ codeIds, project, signal }) {
    signal?.throwIfAborted();
    const code = project.codes.find(c => c.id === codeIds[0] && c.active);
    if (!code) throw new Error('Select an active code.');
    await wait(signal);
    signal?.throwIfAborted();
    const s = signals(project, code), quotes = s.quotes;
    const classifications = Object.fromEntries(s.rows.map(r => [r.q.id, [
      { rating: 'Strong', note: `Simulated lexical signal: ${r.hits.join(', ')}. Confirm the meaning in context.` },
      { rating: 'Borderline', note: 'No label word, and no other code. Read the full passage to decide whether it belongs.' },
      { rating: 'Outlying', note: `No label word; also coded ${r.other.map(cid => `“${project.codes.find(c => c.id === cid)?.label}”`).join(', ')}. It may belong there instead.` },
    ][tier(r)]]));
    let evidenceIds = [...s.matched.map(r => r.q), ...quotes.filter(q => !s.matched.some(r => r.q === q))].slice(0, 3).map(q => q.id);
    const ratio = quotes.length ? s.matched.length / quotes.length : 0;
    let assessment = !quotes.length ? '' : rate(ratio);
    let rating = { Strong:'STRONG', Moderate:'MODERATE', Weak:'WEAK/MISALIGNED' }[assessment] || 'Insufficient evidence';
    const neighbors = s.neighbors.map(n => `${n.label} (${n.count} shared quotations)`);
    const definition = code.definition || code.importedComment;
    const answers = [
      `${s.matched.length} of ${quotes.length} quotations contain a label word. This simulation cannot establish conceptual support.`,
      s.matched.length ? `Inspect the linked passages for these literal label stems: ${s.terms.join(', ')}.` : 'No direct label-word evidence was found. Indirect meanings require researcher interpretation.',
      `Illustrative rating: ${rating}. Based only on label-word coverage; it is not a semantic validity judgment.`,
      'Multiple concepts cannot be established by this simulator. Compare the full passages for distinct meanings before deciding to split.',
      neighbors.length ? `Potential comparison candidates: ${neighbors.join('; ')}. Shared assignments do not establish semantic overlap or breadth.` : 'No co-assigned comparison candidate was found. Breadth and narrowness still require interpretation.',
      definition ? 'A definition or imported comment is available. Test its inclusion and exclusion boundaries against the evidence.' : 'No definition is available. Draft a core concept and inclusion/exclusion rules before relying on this rating.',
    ];
    const counts = ['Strong', 'Borderline', 'Outlying'].map(k => Object.values(classifications).filter(c => c.rating === k).length);
    let evidenceSummary = quotes.length ? `${s.matched.length} of ${quotes.length} quotations use the label's own words. ${counts[1]} have no label word and no other code; ${counts[2]} have no label word but carry another code.` : 'No quotations are assigned to this code.';
    let interpretation = !quotes.length ? 'There is no evidence to verify.' : assessment === 'Strong' ? 'The label is reflected directly in most passages.' : assessment === 'Moderate' ? 'The label fits part of the evidence; the remaining passages need a closer reading against the definition.' : 'Few passages name the concept directly. Either the label is implicit in the data or the coding drifted.';
    let confidence = !quotes.length ? 'None.' : `Low. Literal word matches only; ${counts[1] + counts[2]} passages need your reading.`;
    const outlying = s.rows.filter(r => tier(r) === 2);
    let suggestion = !quotes.length ? 'No change. Retire the code if it is no longer needed.' : assessment === 'Strong' ? 'Keep the code as it is.' : `Refine the definition${outlying.length ? `, and check whether ${outlying.length === 1 ? outlying[0].q.quotationId + ' belongs' : outlying.length + ' outlying quotations belong'} under ${outlying.length === 1 ? 'its other code' : 'their other codes'}` : ''}.`;
    let action = !quotes.length ? 'keep' : assessment === 'Strong' ? 'keep' : 'definition';
    const curated = [
      ['11:11','staying true to my own style','Strong','Preserving a personal style directly supports authenticity.'],
      ['105:13','Humans will agonise','Strong','The emphasis on human effort supports the distinction between human expression and generated content.'],
      ['103:25','administrative tasks','Borderline','Administrative writing may concern efficiency or professional communication; inspect whether preserving personal voice is central.'],
    ].map(([qid,text,rating,note]) => ({q:quotes.find(q => q.quotationId === qid && q.text.includes(text)),rating,note}));
    const isCurated = code.label === 'Authenticity' && curated.every(item => item.q);
    if (isCurated) {
      evidenceIds = curated.map(item => item.q.id);
      assessment = 'Moderate'; rating = 'MODERATE';
      curated.forEach(({q,rating,note}) => { classifications[q.id] = {rating,note,origin:'curated simulation'}; });
      answers.splice(0,6,
        'The example passages support personal style and human expression. The professional-writing example makes the boundary less clear.',
        'Quotation 11:11 explicitly refers to staying true to a personal style; 105:13 emphasizes human effort. Read the linked passages in full.',
        'MODERATE: the curated examples support the label, but the administrative-writing case needs interpretation. This is not a validated rating of the complete code.',
        'Personal style, human contribution, and professional voice may form distinct dimensions. Check the full quotation set before proposing subcodes.',
        'The boundary with communication and efficiency may be too broad in 103:25. Co-assigned codes are candidates for comparison, not proof of overlap.',
        definition ? 'Test the existing definition against personal style, human effort, and professional writing; clarify when communication belongs here.' : 'Define the core as preserving personal voice or human contribution, with explicit rules for professional-writing cases.');
      evidenceSummary = answers[1]; interpretation = answers[0]; confidence = 'Medium. Three curated passages; the rest use lexical rules.'; suggestion = 'Refine the definition so professional communication has an explicit rule.'; action = 'definition';
    }
    return { ...base(project, code, 'verification', s, { label: 'Verification' }), evidenceIds,
      interpretation, evidenceSummary, confidence, suggestion,
      suggestedFields:{assessment, recommendation:suggestion, action},
      rating, questions:evaluationQuestions.map((question,i) => ({question,answer:answers[i],evidenceIds})), classifications,
      version:'verification-simulator-v2',
      limitation:isCurated ? 'Three verified passages have curated example interpretations; remaining classifications use lexical demonstration rules. The full code has not received semantic AI analysis.' : 'Illustrative lexical rules cannot evaluate meaning, ambiguity, multiple concepts, or validity. A weak simulated rating is not evidence of incorrect coding. Review every proposed classification.',
    };
  },
};

// Coherence: do the passages share one core? Co-assigned codes stand in for possible subgroups.
export const coherenceProvider = {
  async analyze({ codeIds, project, signal }) {
    signal?.throwIfAborted();
    const code = project.codes.find(c => c.id === codeIds[0] && c.active);
    if (!code) throw new Error('Select an active code.');
    await wait(signal); signal?.throwIfAborted();
    const s = signals(project, code), quotes = s.quotes;
    const classifications = Object.fromEntries(s.rows.map(r => [r.q.id, [
      { rating: 'Core', note: `Uses the label's own words (${r.hits.join(', ')}).` },
      { rating: 'Peripheral', note: 'Coded only here, without the label words. Check that it shares the same core.' },
      { rating: 'Outlying', note: `Also coded ${r.other.map(cid => `“${project.codes.find(c => c.id === cid)?.label}”`).join(', ')}, without the label words.` },
    ][tier(r)]]));
    const core = s.matched.length, outlying = s.rows.filter(r => tier(r) === 2).length;
    const assessment = quotes.length ? rate((quotes.length - outlying) / quotes.length) : '';
    const subgroups = s.neighbors.map(n => `${n.label} (${n.count})`).join('; ');
    const suggestion = !quotes.length ? 'No change.' : assessment === 'Strong' ? 'Keep the code as it is.' : assessment === 'Moderate' ? 'Refine the definition so the outlying passages have a clear rule.' : `Consider splitting the code${subgroups ? ` along ${subgroups}` : ''}.`;
    return { ...base(project, code, 'coherence', s, { label: 'Coherence' }),
      rating: assessment ? assessment.toUpperCase() : 'Insufficient evidence',
      evidenceSummary: quotes.length ? `${core} of ${quotes.length} quotations name the concept directly; ${outlying} sit with another code and do not.` : 'No quotations are assigned to this code.',
      interpretation: !quotes.length ? 'There is nothing to compare.' : subgroups ? `Possible subgroups follow the co-assigned codes: ${subgroups}.` : 'No co-assigned codes suggest a subgroup.',
      confidence: quotes.length ? 'Low. Shared codes and literal words only; read the passages to confirm a shared core.' : 'None.',
      suggestion, classifications,
      suggestedFields: { assessment, subgroups, recommendation: suggestion, action: !quotes.length || assessment === 'Strong' ? 'keep' : assessment === 'Moderate' ? 'definition' : 'split' },
      limitation: 'Co-assignment and literal word matches cannot show whether passages share a concept. Treat the subgroups as leads.' };
  },
};

// Definitions: a template draft plus prototypical, borderline and atypical examples to test it against.
export const definitionProvider = {
  async analyze({ codeIds, project, signal }) {
    signal?.throwIfAborted();
    const code = project.codes.find(c => c.id === codeIds[0] && c.active);
    if (!code) throw new Error('Select an active code.');
    await wait(signal); signal?.throwIfAborted();
    const s = signals(project, code), quotes = s.quotes, label = code.label.toLowerCase();
    const classifications = Object.fromEntries(s.rows.map(r => [r.q.id, [
      { rating: 'Prototypical', note: 'Names the concept directly. A candidate example for the definition.' },
      { rating: 'Borderline', note: 'Coded only here, without the label words. Test the boundary rule against it.' },
      { rating: 'Atypical', note: 'Also carries another code. Useful for the exclusion rule.' },
    ][tier(r)]]));
    const neighbor = s.neighbors[0]?.label;
    const core = `Passages in which participants discuss ${label} as the focus of what they describe.`;
    const boundary = `Apply when ${label} is central to the passage. Do not apply when it is mentioned only in passing${neighbor ? `, or when “${neighbor}” describes the passage better` : ''}.`;
    return { ...base(project, code, 'definition', s, { label: 'Definition draft' }),
      rating: `${countWords(core + ' ' + boundary)} of 50 words`,
      evidenceSummary: quotes.length ? `${s.matched.length} prototypical, ${s.rows.filter(r => tier(r) === 1).length} borderline and ${s.rows.filter(r => tier(r) === 2).length} atypical quotations.` : 'No quotations are assigned to this code.',
      interpretation: code.importedComment ? `The Code Manager comment reads “${code.importedComment}”. The draft below is a template, not a reading of the passages.` : 'There is no Code Manager comment. The draft below is a template, not a reading of the passages.',
      confidence: 'Low. A template draft; rewrite it in your own words.',
      suggestion: 'Add a definition with a core concept and a boundary rule.', classifications,
      suggestedFields: { core, boundary, action: 'definition', recommendation: 'Add the definition once it holds for the prototypical and borderline examples.' },
      limitation: 'The draft is generated from the label and co-assigned codes only. It has not read the passages.' };
  },
};

export const simulationProviders = { verification: verificationProvider, coherence: coherenceProvider, definition: definitionProvider };
