import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Vite copies every file in public/, including locally ignored capture data.
// Publish only public assets already reviewed and tracked in this repository.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const clientDir = join(root, 'dist', 'client');
const dryRun = process.argv.includes('--dry-run');
if (!existsSync(clientDir)) throw new Error('Build dist/client before pruning deployment assets.');

const tracked = new Set(
  execFileSync('git', ['ls-files', '-z', '--', 'public'], { cwd: root })
    .toString('utf8').split('\0').filter(Boolean).map(path => path.replaceAll('\\', '/')),
);
let removed = 0;
let bytes = 0;
const visit = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const builtPath = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected build symlink: ${relative(root, builtPath)}`);
    if (entry.isDirectory()) { visit(builtPath); continue; }
    if (!entry.isFile()) continue;
    const rel = relative(clientDir, builtPath);
    const sourcePath = join(publicDir, rel);
    if (!existsSync(sourcePath)) continue; // Vite-generated asset, not a public/ copy.
    if (lstatSync(sourcePath).isSymbolicLink()) throw new Error(`Unexpected public symlink: ${rel}`);
    if (tracked.has(`public/${rel.split(sep).join('/')}`)) continue;
    removed++;
    bytes += lstatSync(builtPath).size;
    if (!dryRun) rmSync(builtPath);
  }
};
visit(clientDir);
console.log(`${dryRun ? 'Would exclude' : 'Excluded'} ${removed} untracked public files (${(bytes / 1048576).toFixed(1)} MiB) from the deploy package.`);
