import { mkdir, cp, copyFile } from 'node:fs/promises';

// Copy only public application assets; never publish the repository root.
await mkdir('dist/samples', { recursive: true });
await copyFile('index.html', 'dist/index.html');
for (const directory of ['src', 'vendor']) {
  await cp(directory, `dist/${directory}`, { recursive: true });
}
await mkdir('dist/Assets', { recursive: true });
for (const asset of ['Althea logo.png','Althea_favicon.png',...['Overview','Data','Codebook','Review','History'].map(name => `Icon-${name}_light.png`),...['Internal Code Coherence','Verifying Coding','Creating Code Definitions'].map(name => `Icon-${name}_dark.png`)]) {
  await copyFile(`Assets/${asset}`, `dist/Assets/${asset}`);
}
await copyFile('Training Data - Quotation Manager.xlsx', 'dist/samples/quotations.xlsx');
await copyFile('Training Data - Code Manager.xlsx', 'dist/samples/codes.xlsx');
console.log('Prepared Althea static assets and example exports.');
