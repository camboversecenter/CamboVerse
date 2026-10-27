import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { createRoot, extend, act } from "@react-three/fiber";
import * as THREE from "three";
import { SPECIMENS } from "../src/lab";
import { TheSpecimen } from "../src/components/LabExhibit";
import { LabPreviewContext } from "../src/components/LabPreviewContext";

// This is an offline CPU renderer, not browser automation. The actual React
// exhibit tree constructs the meshes; a z-buffer projects them to static PNGs.
// No WebGL contexts or model downloads are needed when browsing the directory.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
extend(THREE);
const width = 360, height = 240;

function png(rgb: Uint8Array) {
  const crc = (bytes: Uint8Array) => {
    let value = 0xffffffff;
    for (const byte of bytes) {
      value ^= byte;
      for (let b = 0; b < 8; b++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const name = Buffer.from(type), body = Buffer.concat([name, data]);
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  const scanlines = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) scanlines.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)), chunk("IEND", new Uint8Array())]);
}

function render(scene: THREE.Scene) {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene, true);
  if (bounds.isEmpty()) throw new Error("Empty exhibit");
  const centre = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z);
  const camera = new THREE.OrthographicCamera(-1.5, 1.5, 1, -1, 0.01, extent * 20);
  camera.position.copy(centre).add(new THREE.Vector3(0.48, 0.25, 1).normalize().multiplyScalar(extent * 4));
  camera.lookAt(centre); camera.updateMatrixWorld(true);
  const viewBounds = bounds.clone().applyMatrix4(camera.matrixWorldInverse);
  const half = Math.max((viewBounds.max.y - viewBounds.min.y) / 2,
    (viewBounds.max.x - viewBounds.min.x) / 3) * 1.14;
  camera.left = -half * 1.5; camera.right = half * 1.5;
  camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();

  const rgb = new Uint8Array(width * height * 3);
  const depth = new Float64Array(width * height).fill(Infinity);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const glow = Math.max(0, 1 - Math.hypot((x - width * 0.48) / width, (y - height * 0.4) / height));
    const shadow = Math.exp(-(((x - width / 2) / (width * 0.28)) ** 2) - ((y - height * 0.91) / 9) ** 2) * 15;
    const i = (y * width + x) * 3;
    rgb.set([23 + glow * 15 - shadow, 37 + glow * 20 - shadow, 45 + glow * 23 - shadow], i);
  }
  const light = new THREE.Vector3(-0.5, 0.8, 1).normalize();
  const view = camera.position.clone().sub(centre).normalize();
  const halfLight = light.clone().add(view).normalize();
  let triangles = 0;
  const draw = (mesh: THREE.Mesh, world: THREE.Matrix4, tint = new THREE.Color("white")) => {
    const geometry = mesh.geometry;
    const pos = geometry.attributes.position, norm = geometry.attributes.normal;
    if (!pos || !norm) return;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(world);
    const clip = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(world);
    const projected: { x: number; y: number; z: number; n: THREE.Vector3 }[] = [];
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(clip);
      projected.push({ x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, z: p.z,
        n: new THREE.Vector3().fromBufferAttribute(norm, i).applyMatrix3(normalMatrix).normalize() });
    }
    const index = geometry.index;
    const count = index?.count ?? pos.count;
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    for (const group of groups) {
      const material = (Array.isArray(mesh.material) ? mesh.material[group.materialIndex ?? 0] : mesh.material) as THREE.MeshStandardMaterial;
      if (!material || !material.visible || material.opacity < 0.3) continue;
      const base = (material.color ?? new THREE.Color("white")).clone().multiply(tint);
      const roughness = material.roughness ?? 0.6;
      for (let i = group.start; i < Math.min(group.start + group.count, count); i += 3) {
        const a = projected[index ? index.getX(i) : i];
        const b = projected[index ? index.getX(i + 1) : i + 1];
        const c = projected[index ? index.getX(i + 2) : i + 2];
        if (!a || !b || !c) continue;
        const area = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(area) < 0.001) continue;
        triangles++;
        const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), x1 = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
        const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), y1 = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const wa = ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) / area;
          const wb = ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) / area;
          const wc = 1 - wa - wb;
          if (wa < 0 || wb < 0 || wc < 0) continue;
          const z = wa * a.z + wb * b.z + wc * c.z, pixel = y * width + x;
          if (z >= depth[pixel]) continue;
          depth[pixel] = z;
          const n = a.n.clone().multiplyScalar(wa).addScaledVector(b.n, wb).addScaledVector(c.n, wc).normalize();
          const illumination = 0.35 + Math.max(0, n.dot(light)) * 0.85 + (n.y + 1) * 0.12;
          const specular = Math.max(0, n.dot(halfLight)) ** (12 + (1 - roughness) * 70) * (1 - roughness) * 0.4;
          const colour = base.clone().multiplyScalar(illumination).addScalar(specular).convertLinearToSRGB();
          rgb.set([Math.min(255, colour.r * 255), Math.min(255, colour.g * 255), Math.min(255, colour.b * 255)], pixel * 3);
        }
      }
    }
  };
  scene.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.InstancedMesh) {
      for (let i = 0; i < object.count; i++) {
        const matrix = new THREE.Matrix4(), tint = new THREE.Color("white");
        object.getMatrixAt(i, matrix);
        if (object.instanceColor) object.getColorAt(i, tint);
        draw(object, object.matrixWorld.clone().multiply(matrix), tint);
      }
    } else draw(object, object.matrixWorld);
  });
  if (!triangles || !depth.some(Number.isFinite)) throw new Error("Exhibit did not rasterize");
  return { image: png(rgb), minY: bounds.min.y, triangles };
}

await mkdir("public/lab/previews", { recursive: true });
const manifest = [];
for (const specimen of SPECIMENS) {
  const canvas = { width, height, style: {}, addEventListener() {}, removeEventListener() {} };
  const scene = new THREE.Scene();
  const renderer = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas,
    shadowMap: {}, xr: { addEventListener() {}, removeEventListener() {} } };
  const root = createRoot(canvas as never);
  root.configure({ gl: renderer as never, scene, frameloop: "never", size: { width, height, top: 0, left: 0 } });
  let store: ReturnType<typeof root.render>;
  await act(async () => {
    store = root.render(<LabPreviewContext.Provider value={true}>
      <TheSpecimen id={specimen.id} organOf={specimen.organOf} detail="normal" layer="whole"
        selected={null} extracted={null} running={false} knob={specimen.knob?.value ?? 0} onPick={() => {}} />
    </LabPreviewContext.Provider>);
  });
  // Populate instanced meshes and initial mechanism poses through their existing frame hooks.
  await act(async () => { store!.getState().advance(0, false); });
  const result = render(scene);
  await writeFile(`public/lab/previews/${specimen.id}.png`, result.image);
  manifest.push({ id: specimen.id, bytes: result.image.length, minY: result.minY, triangles: result.triangles });
  await act(async () => root.unmount());
}
await writeFile("public/lab/previews/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Rendered ${manifest.length} model previews (${Math.round(manifest.reduce((n, p) => n + p.bytes, 0) / 1024)} KiB total).`);
