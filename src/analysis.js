/** Provider contract: analyze({module, codeIds, project, signal}) -> Promise<finding|null>.
 * Findings contain title, interpretation, evidenceIds, suggestedFields, and provenance.
 * The UI owns decisions. Providers never mutate the project or apply codebook changes.
 */
export const exampleProvider = {
  async analyze({ module, codeIds, project, signal }) {
    signal?.throwIfAborted();
    const code = project.codes.find(c => c.id === codeIds[0]);
    if (!code || !['Authenticity', 'Creativity', 'Collaboration'].includes(code.label)) return null;
    const related = new Set(project.assignments.filter(a => a.codeId === code.id).map(a => a.quotationId));
    const texts = project.quotations.filter(q => related.has(q.id));
    // Curated examples are recognized by quotation content, not by an arbitrary uploaded code label.
    const authentic = texts.find(q => q.quotationId === '11:11' && q.text.includes('staying true to my own style'));
    if (!authentic || code.label !== 'Authenticity') return null;
    const evidence = [authentic, texts.find(q => q.quotationId === '105:13' && q.text.includes('Humans will agonise')), texts.find(q => q.quotationId === '103:25' && q.text.includes('administrative tasks'))].filter(Boolean);
    const examples = {
      coherence: { title: 'Personal voice across different creative contexts', interpretation: 'These examples connect authenticity with preserving personal style and human expression. Professional communication introduces a different context worth checking against the wider quotation set.', suggestedFields: { assessment: 'Moderate', subgroups: 'Personal style; human expression; professional voice', recommendation: 'Clarify the boundary before deciding whether subcodes are needed.' } },
      verification: { title: 'Inspect the boundary between voice and communication', interpretation: 'The statement about staying true to a personal style directly supports the label. The administrative-writing example needs a closer reading: it may concern authenticity, professional communication, or both.', suggestedFields: { assessment: 'Moderate', recommendation: 'Review borderline uses alongside the full quotation and its other codes.' } },
      definition: { title: 'A starting definition to test against the evidence', interpretation: 'This draft centers on personal expression. Test it against the complete quotation set before approving the wording.', suggestedFields: { core: 'Authenticity concerns preserving a recognizably personal voice, style, or human contribution in creative work.', boundary: 'Include reflections on staying true to oneself or recognizing human expression; exclude technical efficiency or professional communication without a connection to personal voice.', action: 'definition' } },
      comparison: { title: 'Compare personal voice with the second code', interpretation: 'Use the authenticity quotations as one side of the comparison. Inspect the second code’s evidence and write the boundary yourself; no overlap score has been inferred.', suggestedFields: {} },
    };
    signal?.throwIfAborted();
    return { ...examples[module], evidenceIds: evidence.map(q => q.id), provenance: 'Curated example — not generated analysis', origin: 'example' };
  },
};
