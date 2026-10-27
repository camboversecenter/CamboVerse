import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { act, createRoot, extend } from "@react-three/fiber";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { SPECIMENS, type LabLayer } from "./lab";
import { StagedExhibit } from "./components/LabExhibit";
import { LabPreviewContext } from "./components/LabPreviewContext";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
extend(THREE);

function harness() {
  const canvas = { width: 360, height: 240, style: {}, addEventListener() {}, removeEventListener() {} };
  const scene = new THREE.Scene();
  const renderer = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas,
    shadowMap: {}, xr: { addEventListener() {}, removeEventListener() {} } };
  const root = createRoot(canvas as never);
  root.configure({ gl: renderer as never, scene, frameloop: "never", size: { width: 360, height: 240, top: 0, left: 0 } });
  return { root, scene };
}

describe("Lab presentation", () => {
  it("grounds the lever at its actual base and keeps the stage fixed through layer and quality changes", async () => {
    const { root, scene } = harness();
    const specimen = SPECIMENS.find((s) => s.id === "lever")!;
    const show = async (layer: LabLayer, detail: "normal" | "ultra") => {
      await act(async () => {
        root.render(createElement(LabPreviewContext.Provider, { value: true },
          createElement(StagedExhibit, { specimen, id: specimen.id, layer, detail,
            selected: null, extracted: null, running: false, knob: 30, onPick() {} })));
      });
      scene.updateMatrixWorld(true);
    };
    try {
      await show("whole", "normal");
      const stage = scene.getObjectByName("lab-stage")!;
      const model = scene.getObjectByName("lab-specimen")!;
      expect(stage.position.y).toBe(-14.5);
      expect(stage.position.y).toBeCloseTo(new THREE.Box3().setFromObject(model, true).min.y, 5);
      await show("frame", "normal");
      expect(scene.getObjectByName("lab-stage")!.position.y).toBe(-14.5);
      await show("cutaway", "ultra");
      expect(scene.getObjectByName("lab-stage")!.position.y).toBe(-14.5);
    } finally { await act(async () => root.unmount()); }
  });

  it("adds tissue bump detail only in Ultra while retaining colour maps in Normal", async () => {
    const { root, scene } = harness();
    const specimen = SPECIMENS.find((s) => s.id === "heart")!;
    try {
      for (const detail of ["normal", "ultra"] as const) {
        await act(async () => {
          root.render(createElement(LabPreviewContext.Provider, { value: true },
            createElement(StagedExhibit, { specimen, id: specimen.id, layer: "whole", detail,
              selected: null, extracted: null, running: false, knob: 0, onPick() {} })));
        });
        const tissue: THREE.MeshStandardMaterial[] = [];
        scene.getObjectByName("lab-specimen")!.traverse((o) => {
          if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial && o.material.map) tissue.push(o.material);
        });
        expect(tissue).toHaveLength(3);
        for (const material of tissue) {
          expect(material.map!.image.width).toBe(detail === "normal" ? 64 : 128);
          expect(Boolean(material.bumpMap)).toBe(detail === "ultra");
          expect(material.type).toBe(detail === "ultra" ? "MeshPhysicalMaterial" : "MeshStandardMaterial");
        }
      }
    } finally { await act(async () => root.unmount()); }
  });

  it("ships a valid, small PNG preview for every registered exhibit", () => {
    const manifest = JSON.parse(readFileSync("public/lab/previews/manifest.json", "utf8")) as { id: string; bytes: number }[];
    expect(manifest.map((p) => p.id).sort()).toEqual(SPECIMENS.map((s) => s.id).sort());
    for (const specimen of SPECIMENS) {
      const png = readFileSync(`public/lab/previews/${specimen.id}.png`);
      expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(png.readUInt32BE(16)).toBe(360);
      expect(png.readUInt32BE(20)).toBe(240);
      expect(png.length).toBeLessThan(64 * 1024);
      expect(manifest.find((p) => p.id === specimen.id)!.bytes).toBe(png.length);
    }
  });
});
