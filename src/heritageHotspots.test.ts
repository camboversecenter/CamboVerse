import { describe, expect, it } from "vitest";
import { SPOTS } from "./spots";
import { HERITAGE_HOTSPOTS } from "./heritageHotspots";

describe("Blender heritage catalog", () => {
  it("retains all fourteen original destinations and adds Pre Rup", () => {
    const expected = ["angkor-wat", "bayon", "ta-prohm", "banteay-srei", "preah-vihear", "royal-palace", "wat-phnom", "sambor-prei-kuk", "koh-ker", "banteay-chhmar", "preah-khan", "beng-mealea", "phnom-kulen", "oudong", "pre-rup"];
    expect(new Set(SPOTS.map(s => s.id)).size).toBe(SPOTS.length);
    expect(SPOTS.map(s => s.id)).toEqual(expect.arrayContaining(expected));
  });
  it("maps every camera override to an existing stop", () => {
    for (const [siteId, stops] of Object.entries(HERITAGE_HOTSPOTS)) {
      const site = SPOTS.find(s => s.id === siteId);
      expect(site, siteId).toBeDefined();
      for (const [id, pose] of Object.entries(stops)) {
        expect(site?.pois?.some(p => p.id === id), `${siteId}/${id}`).toBe(true);
        expect([...pose.camera, ...pose.target].every(Number.isFinite)).toBe(true);
        expect(pose.camera).not.toEqual(pose.target);
      }
    }
  });
  it("uses matching Normal and Ultra filenames for each imported site", () => {
    for (const site of SPOTS) {
      const folder = site.id === 'pre-rup' ? 'pre-rup-refined-v2' : site.id === 'phnom-kulen' ? 'phnom-kulen-region-v3' : site.id === 'beng-mealea' ? 'beng-mealea-refined-v2' : site.id === 'preah-khan' ? 'preah-khan-refined-v2' : site.id === 'banteay-srei' ? 'banteay-srei-refined-v2' : site.id === 'ta-prohm' ? 'ta-prohm-refined-v2' : site.id === 'angkor-wat' ? 'angkor-wat-refined-v3' : site.id === 'bayon' ? 'bayon-refined-v2' : site.id === 'oudong' ? 'oudong-refined-v2' : site.id === 'royal-palace' ? 'royal-palace-refined-v2' : site.id === 'wat-phnom' ? 'wat-phnom-refined-v4' : site.id === 'preah-vihear' ? 'preah-vihear-green-v4' : site.id === 'koh-ker' ? 'koh-ker-refined-v2' : site.id === 'banteay-chhmar' ? 'banteay-chhmar-refined-v4' : site.id === 'sambor-prei-kuk' ? 'sambor-prei-kuk-refined-v2' : 'heritage-blender-v1';
      expect(site.model).toBe(`/models/local/${folder}/${site.id}-normal.glb`);
      expect(site.heritageUltraModel).toBe(`/models/local/${folder}/${site.id}-ultra.glb`);
      expect(site.pois?.length).toBeGreaterThan(0);
    }
  });
});
