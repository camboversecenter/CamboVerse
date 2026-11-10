import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

// Only the reviewed, original Blender illustrations used by the public map.
// Source scenes, reference photos and real 3DGS captures remain local.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, 'public', 'models', 'local');
const published = join(root, 'public', 'models', 'heritage');
export const models = [
  ['angkor-wat-refined-v3', 'angkor-wat'],
  ['bayon-refined-v2', 'bayon'],
  ['ta-prohm-refined-v2', 'ta-prohm'],
  ['banteay-srei-refined-v2', 'banteay-srei'],
  ['preah-vihear-green-v4', 'preah-vihear'],
  ['royal-palace-refined-v2', 'royal-palace'],
  ['sambor-prei-kuk-refined-v2', 'sambor-prei-kuk'],
  ['koh-ker-refined-v2', 'koh-ker'],
  ['banteay-chhmar-refined-v4', 'banteay-chhmar'],
  ['preah-khan-refined-v2', 'preah-khan'],
  ['beng-mealea-refined-v2', 'beng-mealea'],
  ['phnom-kulen-region-v3', 'phnom-kulen'],
  ['pre-rup-refined-v2', 'pre-rup'],
  ['oudong-refined-v2', 'oudong'],
  ['phnom-kulen-waterfall-v3', 'phnom-kulen'],
];
const limit = 25 * 1024 * 1024;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const pad = bytes => (bytes.length + 3) & ~3;

function glbJson(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length)
    throw new Error('Invalid glTF 2 GLB');
  const length = bytes.readUInt32LE(12);
  if (bytes.toString('ascii', 16, 20) !== 'JSON' || bytes.toString('ascii', 24 + length, 28 + length) !== 'BIN\0')
    throw new Error('Unexpected GLB chunk layout');
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  if (json.buffers?.some(buffer => buffer.uri) || json.images?.some(image => image.uri))
    throw new Error('External GLB resources are not approved');
  return { json, bin: bytes.subarray(28 + length) };
}

// The Sambor Ultra export exceeds the host's 25 MiB per-file limit. Re-encode
// meshopt attribute streams at level 3, retaining their filters and proving
// each decoded bufferView is byte-for-byte identical to the source.
async function repackLosslessly(bytes) {
  const { json, bin } = glbJson(bytes);
  if (!json.bufferViews?.every(view => view.extensions?.EXT_meshopt_compression))
    throw new Error('Expected an all-meshopt Sambor export');
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const chunks = [];
  let offset = 0;
  for (const view of json.bufferViews) {
    const ext = view.extensions.EXT_meshopt_compression;
    const original = bin.subarray(ext.byteOffset, ext.byteOffset + ext.byteLength);
    const raw = new Uint8Array(ext.count * ext.byteStride);
    MeshoptDecoder.decodeGltfBuffer(raw, ext.count, ext.byteStride, original, ext.mode);
    const candidate = ext.mode === 'ATTRIBUTES'
      ? MeshoptEncoder.encodeVertexBufferLevel(raw, ext.count, ext.byteStride, 3)
      : original;
    const encoded = candidate.length < original.length ? candidate : original;
    const before = new Uint8Array(raw.length);
    const after = new Uint8Array(raw.length);
    MeshoptDecoder.decodeGltfBuffer(before, ext.count, ext.byteStride, original, ext.mode, ext.filter);
    MeshoptDecoder.decodeGltfBuffer(after, ext.count, ext.byteStride, encoded, ext.mode, ext.filter);
    if (!Buffer.from(before).equals(Buffer.from(after))) throw new Error('Meshopt repack changed decoded geometry');
    ext.byteOffset = offset;
    ext.byteLength = encoded.length;
    chunks.push(Buffer.from(encoded), Buffer.alloc(pad(encoded) - encoded.length));
    offset += pad(encoded);
  }
  json.buffers[0].byteLength = offset;
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonPad = pad(jsonBytes);
  const output = Buffer.alloc(12 + 8 + jsonPad + 8 + offset);
  output.write('glTF', 0, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonPad, 12);
  output.write('JSON', 16, 'ascii');
  jsonBytes.copy(output, 20);
  output.fill(0x20, 20 + jsonBytes.length, 20 + jsonPad);
  output.writeUInt32LE(offset, 20 + jsonPad);
  output.write('BIN\0', 24 + jsonPad, 'ascii');
  Buffer.concat(chunks).copy(output, 28 + jsonPad);
  glbJson(output);
  return output;
}

if (process.argv.includes('--copy')) {
  const records = [];
  for (const [folder, name] of models) {
    for (const detail of ['normal', 'ultra']) {
      const file = `${name}-${detail}.glb`;
      const source = join(local, folder, file);
      if (!existsSync(source)) throw new Error(`Missing reviewed export: ${folder}/${file}`);
      const original = readFileSync(source);
      glbJson(original);
      const bytes = folder === 'sambor-prei-kuk-refined-v2' && detail === 'ultra'
        ? await repackLosslessly(original) : original;
      if (bytes.length > limit) throw new Error(`${folder}/${file} exceeds the 25 MiB static asset limit`);
      const destination = join(published, folder, file);
      mkdirSync(dirname(destination), { recursive: true });
      if (bytes === original) copyFileSync(source, destination);
      else writeFileSync(destination, bytes);
      records.push({ file: `${folder}/${file}`, bytes: bytes.length, sha256: digest(bytes), sourceSha256: digest(original) });
    }
  }
  writeFileSync(join(published, 'manifest.json'), `${JSON.stringify({ version: 1, assets: records }, null, 2)}\n`);
  console.log(`Published ${records.length} reviewed heritage GLBs (${(records.reduce((n, item) => n + item.bytes, 0) / 1048576).toFixed(1)} MiB).`);
} else {
  console.error('Use --copy to stage the reviewed Blender exports.');
  process.exitCode = 2;
}
