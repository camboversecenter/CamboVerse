import type { Spot } from './spots';

/** A separate local study, never the representation of the entire mountain. */
export const KULEN_WATERFALL: Spot = {
    id: "phnom-kulen-waterfall",
    name: "Kulen Waterfall Study",
    khmer: "ភ្នំគូលែន",
    province: "Siem Reap",
    blurb:
      "One waterfall-area study within Phnom Kulen. The bank route and distances are illustrative, not an on-site trail map.",
    lat: 13.566,
    lng: 104.116,
    nudge: [0.6, -1.0],
    model: "/models/local/phnom-kulen-waterfall-v3/phnom-kulen-normal.glb",
    heritageUltraModel: "/models/local/phnom-kulen-waterfall-v3/phnom-kulen-ultra.glb",
    overview: { id: 'overview', title: 'Kulen Waterfall Study', info: '', target: [0, 4, -2], camera: [27, 26, 33] },
    sceneryGroundY: -0.55,
    sceneryShadowNormalBias: 0.025,
    terrainWalking: true,
    aerial: true,
    live: true,
    pois: [
      {
        id: "waterfalls",
        title: "Phnom Kulen Waterfalls",
        info: "Broad curtains of water fall over sandstone into a forest-fringed pool. This reference-led landscape is illustrative: water flow, dimensions and distances to other landmarks are simplified, not surveyed.",
        target: [0, 3.6, -2.2],
        camera: [3, 2, 10.5],
      },
      {
        id: "forest-path",
        title: "Waterfall Bank Path",
        info: "Phnom Kulen's wooded plateau feeds rivers flowing toward the Angkor region. These bank-side steps connect the viewpoints in the digital scene only; they are not a map of an on-site trail.",
        target: [10.5, 5, -2],
        camera: [10.5, 3, 7],
      },
    ],
  };
