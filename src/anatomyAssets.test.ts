import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ANATOMY_ASSETS, anatomyAssetUrl } from './anatomyAssets';

describe('active anatomy assets', () => {
  it('pins the reviewed versions and includes both tiers', () => {
    expect(ANATOMY_ASSETS.skeleton).toBe('lab-skeleton-v11');
    expect(ANATOMY_ASSETS.head).toBe('lab-head-fitted-v12');
    for (const kind of Object.keys(ANATOMY_ASSETS) as (keyof typeof ANATOMY_ASSETS)[]) {
      for (const tier of ['normal', 'ultra'] as const) {
        const path = `public${anatomyAssetUrl(kind, tier)}`;
        expect(existsSync(path), path).toBe(true);
        expect(readFileSync(path).subarray(0, 4).toString()).toBe('glTF');
      }
    }
  });
});
