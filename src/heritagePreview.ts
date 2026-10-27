import type { Spot } from './spots';

export const HERITAGE_TRIAL = 'banteay-chhmar-v3';
export const HERITAGE_TRIAL_URL = '/models/local/banteay-chhmar-review-v3/banteay-chhmar-v3-trial.glb';

/** Explicit development-only opt-in. Never changes the production catalog. */
export function isHeritageTrial(search: string, dev: boolean, siteId: string) {
  return dev && siteId === 'banteay-chhmar'
    && new URLSearchParams(search).get('modelPreview') === HERITAGE_TRIAL;
}

export function initialHeritageSite(search: string, dev: boolean): string | null {
  if (!dev) return null;
  const params = new URLSearchParams(search);
  return params.get('site') === 'banteay-chhmar' || params.get('modelPreview') === HERITAGE_TRIAL
    ? 'banteay-chhmar' : null;
}

export function withHeritageTrial(spot: Spot): Spot {
  return {
    ...spot,
    heritageUltraModel: HERITAGE_TRIAL_URL,
    blurb: 'Temporary detailed Blender preview. Ultra loads the experimental mesh; Normal keeps the current lightweight model. Materials are simplified for this test.',
    // Separate landmarks: the trial has a different layout from the old asset.
    pois: [
      { id: 'review-angle', title: 'Face tower — three-quarter view', info: 'Review the facial depth and how the carving meets the masonry. This is an interpreted model, not a scan.', camera: [4.5, 4.5, 6.75], target: [0, 3.015, 0] },
      { id: 'review-south', title: 'South face', info: 'Inspect the brow, eyelids, nose and lips.', camera: [0, 3.375, 6.3], target: [0, 3.339, 1.35] },
      { id: 'review-east', title: 'East face', info: 'Inspect the side carving and stone seams.', camera: [6.3, 3.375, 0], target: [1.35, 3.339, 0] },
      { id: 'review-north', title: 'North face', info: 'Inspect the rear carving.', camera: [0, 3.375, -6.3], target: [0, 3.339, -1.35] },
      { id: 'review-west', title: 'West face', info: 'Inspect the fourth carving.', camera: [-3.825, 3.375, 0], target: [-1.35, 3.339, 0] },
    ],
  };
}
