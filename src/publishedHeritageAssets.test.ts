import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'meshoptimizer';
import { SPOTS } from './spots';
import { KULEN_WATERFALL } from './kulenWaterfall';

type Record = { file: string; bytes: number; sha256: string; sourceSha256: string };
const root = 'public/models/heritage/';
const manifest = JSON.parse(readFileSync(`${root}manifest.json`, 'utf8')) as { version: number; assets: Record[] };

describe('published Blender tourism models', () => {
  it('contains only the reviewed paired exports and covers every public scene', () => {
    expect(manifest.version).toBe(1);
    expect(manifest.assets).toHaveLength(30);
    const names = new Set(manifest.assets.map(asset => asset.file));
    expect(names.size).toBe(30);
    for (const site of [...SPOTS, KULEN_WATERFALL]) {
      for (const url of [site.model, site.heritageUltraModel]) {
        expect(url, site.id).toContain('/models/heritage/');
        if (site.id === 'wat-phnom') continue; // Already published in the prior release.
        expect(names.has(url!.replace('/models/heritage/', '')), `${site.id}: ${url}`).toBe(true);
      }
    }
    for (const name of names) if (name.endsWith('-normal.glb'))
      expect(names.has(name.replace('-normal.glb', '-ultra.glb')), name).toBe(true);
  });

  it('pins self-contained GLB bytes within the static host limit', () => {
    for (const asset of manifest.assets) {
      expect(asset.file).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+\.(?:glb)$/);
      const bytes = readFileSync(`${root}${asset.file}`);
      expect(bytes.length, asset.file).toBe(asset.bytes);
      expect(bytes.length, asset.file).toBeLessThanOrEqual(25 * 1024 * 1024);
      expect(createHash('sha256').update(bytes).digest('hex'), asset.file).toBe(asset.sha256);
      expect(bytes.toString('ascii', 0, 4), asset.file).toBe('glTF');
      expect(bytes.readUInt32LE(8), asset.file).toBe(bytes.length);
      const length = bytes.readUInt32LE(12);
      const jsonText = bytes.toString('utf8', 20, 20 + length);
      expect(jsonText, asset.file).not.toMatch(/(?:[A-Z]:[\\/]|file:\/\/|[\w.-]+@[\w.-]+\.[A-Za-z]{2,})/i);
      const json = JSON.parse(jsonText) as { buffers?: { uri?: string }[]; images?: { uri?: string }[] };
      expect(json.buffers?.every(buffer => !buffer.uri), asset.file).toBe(true);
      expect(json.images?.every(image => !image.uri) ?? true, asset.file).toBe(true);
    }
  });

  it('repacked Sambor Ultra decodes and matches the local source when available', async () => {
    const folder = 'sambor-prei-kuk-refined-v2/sambor-prei-kuk-ultra.glb';
    const published = readFileSync(`${root}${folder}`);
    const sourcePath = `public/models/local/${folder}`;
    const source = existsSync(sourcePath) ? readFileSync(sourcePath) : null;
    expect(manifest.assets.find(asset => asset.file === folder)?.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    if (source) expect(createHash('sha256').update(source).digest('hex')).toBe(manifest.assets.find(asset => asset.file === folder)?.sourceSha256);
    await MeshoptDecoder.ready;
    const decode = (file: Buffer) => {
      const length = file.readUInt32LE(12);
      const json = JSON.parse(file.toString('utf8', 20, 20 + length));
      const bin = file.subarray(28 + length);
      return json.bufferViews.map((view: { extensions?: { EXT_meshopt_compression?: { byteOffset: number; byteLength: number; byteStride: number; count: number; mode: string; filter?: string } } }) => {
        const ext = view.extensions?.EXT_meshopt_compression;
        if (!ext) return null;
        const bytes = new Uint8Array(ext.count * ext.byteStride);
        MeshoptDecoder.decodeGltfBuffer(bytes, ext.count, ext.byteStride, bin.subarray(ext.byteOffset, ext.byteOffset + ext.byteLength), ext.mode, ext.filter);
        return Buffer.from(bytes);
      });
    };
    const releasedViews = decode(published);
    expect(releasedViews.length).toBeGreaterThan(0);
    if (!source) return;
    const originalViews = decode(source);
    expect(releasedViews.length).toBe(originalViews.length);
    for (let i = 0; i < originalViews.length; i++)
      expect(releasedViews[i]?.equals(originalViews[i]!), `bufferView ${i}`).toBe(true);
  });
});
