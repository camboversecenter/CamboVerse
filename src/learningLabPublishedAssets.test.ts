import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Record = { file: string; bytes: number; sha256: string };
const root = 'public/models/learning-lab/';
const manifest = JSON.parse(readFileSync(`${root}manifest.json`, 'utf8')) as { version: number; assets: Record[] };

describe('published Learning Lab assets', () => {
  it('keeps each reviewed runtime export intact and self-contained', () => {
    expect(manifest.version).toBe(1);
    expect(manifest.assets).toHaveLength(46);
    for (const asset of manifest.assets) {
      expect(asset.file).toMatch(/^[a-z0-9-]+\.(?:glb|png)$/);
      const bytes = readFileSync(`${root}${asset.file}`);
      expect(bytes.length, asset.file).toBe(asset.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), asset.file).toBe(asset.sha256);
      if (!asset.file.endsWith('.glb')) continue;
      expect(bytes.toString('ascii', 0, 4), asset.file).toBe('glTF');
      expect(bytes.readUInt32LE(8), asset.file).toBe(bytes.length);
      const jsonLength = bytes.readUInt32LE(12);
      const json = bytes.toString('utf8', 20, 20 + jsonLength);
      expect(json, asset.file).not.toMatch(/(?:[A-Z]:[\\/]|file:\/\/|[\w.-]+@[\w.-]+\.[A-Za-z]{2,})/i);
      const gltf = JSON.parse(json) as {
        buffers?: { uri?: string }[]; images?: { uri?: string }[];
      };
      expect(gltf.buffers?.every(buffer => !buffer.uri) ?? true, asset.file).toBe(true);
      expect(gltf.images?.every(image => !image.uri) ?? true, asset.file).toBe(true);
    }
  });

  it('provides the same subject matter in Normal and Ultra', () => {
    const names = new Set(manifest.assets.map(asset => asset.file));
    for (const file of names) {
      if (!file.endsWith('-normal.glb')) continue;
      expect(names.has(file.replace('-normal.glb', '-ultra.glb')), file).toBe(true);
    }
    expect(names.has('biology-room-v1.glb')).toBe(true);
  });
});
