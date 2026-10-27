/** Explicit reviewed versions; never select a file by modification date. */
export const ANATOMY_ASSETS = {
  skeleton: 'lab-skeleton-v11',
  head: 'lab-head-fitted-v12',
  organs: 'lab-organs-approved-v1',
  muscles: 'lab-muscles-v4',
} as const;
export function anatomyAssetUrl(kind: keyof typeof ANATOMY_ASSETS, detail: 'normal' | 'ultra') {
  return `/models/local/${ANATOMY_ASSETS[kind]}-${detail}.glb`;
}
