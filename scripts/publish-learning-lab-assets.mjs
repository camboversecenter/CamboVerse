import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reviewed runtime exports only. Sources, scans, captures and Blender files stay local.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'models', 'local');
const target = join(root, 'public', 'models', 'learning-lab');
const pairs = [
  'lab-skeleton-v11', 'lab-head-fitted-v12', 'lab-organs-approved-v1',
  'lab-muscles-v4', 'lab-body-face-v2', 'lab-eye', 'lab-head-reviewed',
  'lab-head-muscles-v2', 'lab-head-internal-v2', 'lab-heart', 'lab-lungs',
  'humerus-study-v2-macro', 'humerus-study-v1-cutaway', 'humerus-study-v1-micro',
  ...['orrery', 'layers', 'globe', 'moon', 'seasons', 'tides'].map(kind => `earthsky-${kind}-v1`),
];
const previews = [
  'lab-head-enhanced-three-quarter.png',
  'humerus-study-v2-macro-preview.png',
  'humerus-study-v1-cutaway-preview.png',
  'humerus-study-v1-micro-preview.png',
  'earthsky-seasons-v1-preview.png',
];
const names = ['biology-room-v1.glb', ...pairs.flatMap(name => [`${name}-normal.glb`, `${name}-ultra.glb`]), ...previews];

if (!process.argv.includes('--copy')) {
  console.error('Use --copy to stage the reviewed Learning Lab exports.');
  process.exitCode = 2;
} else {
  mkdirSync(target, { recursive: true });
  const records = [];
  for (const name of names) {
    const from = join(source, name);
    if (!existsSync(from)) throw new Error(`Missing local export: ${name}`);
    const bytes = readFileSync(from);
    if (name.endsWith('.glb') && bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error(`Invalid GLB: ${name}`);
    if (bytes.length > 25 * 1024 * 1024) throw new Error(`Too large for edge asset: ${name}`);
    copyFileSync(from, join(target, name));
    records.push({ file: name, bytes: statSync(join(target, name)).size, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  writeFileSync(join(target, 'manifest.json'), `${JSON.stringify({ version: 1, assets: records }, null, 2)}\n`);
  console.log(`Staged ${records.length} reviewed Learning Lab runtime assets (${(records.reduce((n, item) => n + item.bytes, 0) / 1048576).toFixed(1)} MiB).`);
}
