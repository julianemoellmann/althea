// Runs one Pi analysis against the supplied example exports, without the browser.
// Usage: node scripts/try-pi.mjs [verification|coherence|definition] [code label]
import { readFile } from 'node:fs/promises';
import { readExport, prepareImports } from '../src/data.js';
import { createProject } from '../src/model.js';
import { piPayload } from '../src/pi-provider.js';
import { analyzeWithPi, piStatus } from '../agent/pi-analyst.mjs';

const [module = 'verification', label = 'Skepticism'] = process.argv.slice(2);
const load = async (file, kind) => readExport(new Uint8Array(await readFile(new URL(`../${file}`, import.meta.url))), file, kind);
const imports = { quotation: await load('Example Data - Quotation Manager.xlsx', 'quotation'), codes: await load('Example Data - Code Manager.xlsx', 'codes') };
const project = createProject('Pi trial', imports, prepareImports(imports), 'Pi trial', true);
const code = project.codes.find(c => c.label === label);
if (!code) throw new Error(`No code "${label}". Codes: ${project.codes.map(c => c.label).join(', ')}`);
console.error('Pi status:', await piStatus());
const started = Date.now();
const finding = await analyzeWithPi({ module, payload: piPayload(project, [code.id]), onEvent: e => console.error(`  tool: ${e.name}`) });
console.log(JSON.stringify(finding, null, 2));
console.error(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
