import { quotesFor } from './model.js';

export const evaluationQuestions = [
  'Do the quotations support the current code label?',
  'Which words, phrases, or meanings justify the code?',
  'How strongly are the quotations aligned with the code?',
  'Does the code cover more than one underlying concept?',
  'Is the code too broad, too narrow, or overlapping?',
  'Is a definition needed to clarify the conceptual boundary?',
];

// A deliberately limited local stand-in for the asynchronous Pi provider.
// Lexical matches are illustrative signals, never semantic validation.
export const verificationProvider = {
  async analyze({ codeIds, project, signal }) {
    signal?.throwIfAborted();
    const code = project.codes.find(c => c.id === codeIds[0] && c.active);
    if (!code) throw new Error('Select an active code.');
    await new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 650);
      signal?.addEventListener('abort', abort, { once: true });
    });
    signal?.throwIfAborted();
    const quotes = quotesFor(project, code.id);
    const terms = [...new Set(code.label.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(t => t.length > 3);
    const classifications = {};
    const matched = [];
    for (const q of quotes) {
      const hits = terms.filter(t => q.text.toLowerCase().includes(t));
      if (hits.length) matched.push(q);
      classifications[q.id] = { rating: hits.length ? 'Strong match' : 'Borderline', note: hits.length ? `Simulated lexical signal: ${hits.join(', ')}. Confirm the meaning in context.` : 'No direct label-word match. This does not establish misalignment; interpret the full quotation.', origin: 'simulation' };
    }
    let evidenceIds = [...matched, ...quotes.filter(q => !matched.includes(q))].slice(0, 3).map(q => q.id);
    const ratio = quotes.length ? matched.length / quotes.length : 0;
    let assessment = !quotes.length ? '' : ratio >= .7 ? 'Strong' : ratio > 0 ? 'Moderate' : 'Weak';
    let rating = { Strong:'STRONG', Moderate:'MODERATE', Weak:'WEAK/MISALIGNED' }[assessment] || 'Insufficient evidence';
    const related = new Map();
    const qids = new Set(quotes.map(q => q.id));
    project.assignments.filter(a => qids.has(a.quotationId) && a.codeId !== code.id).forEach(a => related.set(a.codeId,(related.get(a.codeId) || 0) + 1));
    const neighbors = [...related].sort((a,b) => b[1] - a[1]).slice(0,3).map(([id,count]) => `${project.codes.find(c => c.id === id)?.label} (${count} shared quotations)`);
    const definition = code.definition || code.importedComment;
    const answers = [
      `${matched.length} of ${quotes.length} quotations contain a label word. This simulation cannot establish conceptual support.`,
      matched.length ? `Inspect the linked passages for these literal label words: ${terms.join(', ')}.` : 'No direct label-word evidence was found. Indirect meanings require researcher interpretation.',
      `Illustrative rating: ${rating}. Based only on label-word coverage; it is not a semantic validity judgment.`,
      'Multiple concepts cannot be established by this simulator. Compare the full passages for distinct meanings before deciding to split.',
      neighbors.length ? `Potential comparison candidates: ${neighbors.join('; ')}. Shared assignments do not establish semantic overlap or breadth.` : 'No co-assigned comparison candidate was found. Breadth and narrowness still require interpretation.',
      definition ? 'A definition or imported comment is available. Test its inclusion and exclusion boundaries against the evidence.' : 'No definition is available. Draft a core concept and inclusion/exclusion rules before relying on this rating.',
    ];
    const curated = [
      ['11:11','staying true to my own style','Strong match','Preserving a personal style directly supports authenticity.'],
      ['105:13','Humans will agonise','Strong match','The emphasis on human effort supports the distinction between human expression and generated content.'],
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
    }
    return { title:`Verification of ${code.label}`, origin:'simulation', provenance:'Simulated analysis · local lexical demonstration · no AI calls',
      interpretation:answers[0], evidenceIds, suggestedFields:{assessment, recommendation:'Review the cited evidence and conceptual boundary before confirming an action.'},
      rating, questions:evaluationQuestions.map((question,i) => ({question,answer:answers[i],evidenceIds})), classifications,
      coverage:quotes.length, matched:matched.length, timestamp:new Date().toISOString(), version:'verification-simulator-v1', projectRevision:project.revision,
      limitation:isCurated ? 'Three verified passages have curated example interpretations; remaining classifications use lexical demonstration rules. The full code has not received semantic AI analysis.' : 'Illustrative lexical rules cannot evaluate meaning, ambiguity, multiple concepts, or validity. A weak simulated rating is not evidence of incorrect coding. Review every proposed classification.',
    };
  },
};
