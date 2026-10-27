/** Reading record: docs/WEDDING-REFERENCES.md. Geometry is an interpretation. */
export const WEDDING_BOOKS = [
  { title: 'The Book of Khmer Marriage — Ker Nou & Nhieuk Nou', detail: 'Translated and edited by Saveros Lewitz, BEFEO 60 (1973), pp. 243–328. Historical framework; the commoner account is dated 1925.', url: 'https://www.persee.fr/doc/befeo_0336-1519_1973_num_60_1_5463' },
  { title: 'Cultural Understanding through Paintings of Southeast Asia and Korea', detail: 'SEAMEO SPAFA / APCEIU / SEAMEO, “Pithi Mangkul Kar”, printed pp. 22–25. Consulted for the house setting, popil, white threads, sword, blossoms and cloth-leading.', url: 'https://www.seameo-spafa.org/wp-content/uploads/2015/10/EIU_paintings.pdf#page=12' },
];

export const WEDDING_OBJECTS = {
  trays: { name: 'Offering trays', note: 'Food offerings replace the previous ribbon-wrapped gift boxes. Contents and number here are illustrative.' },
  betel: { name: 'Betel and areca', note: 'Betel leaves and areca nuts are shown separately, rather than represented by a generic flower mound.' },
  incense: { name: 'Incense and candles', note: 'An offering arrangement for this study. Placement should be checked with a ceremony specialist.' },
  seats: { name: 'Ceremony mats', note: 'The two cushions indicate the couple’s place. Surrounding mats indicate space for family members; people are not yet represented.' },
  water: { name: 'Water vessel', note: 'A rounded metal bowl with a separate foot and rim, beside the seating for the blessing.' },
  grooming: { name: 'Comb, scissors and mirror', note: 'Objects for the symbolic hair-cutting scene. Shapes are illustrative and are not replicas of dated artefacts.' },
  popil: { name: 'Popil and candle', note: 'A ceremonial object used with candlelight in the blessing. Its silhouette is simplified; the display support is for viewing only.' },
  thread: { name: 'White wrist threads', note: 'White thread accompanies the wrist blessing in the SEAMEO SPAFA account, printed pp. 24–25.' },
  sword: { name: 'Sheathed sword', note: 'Shown enclosed in its sheath as described in the wedding account, rather than as an exposed blade.' },
  flowers: { name: 'Areca blossoms', note: 'Branching pale blossoms for the flower blessing; these are not rose bouquets.' },
  cloth: { name: 'Bride’s trailing cloth', note: 'A cloth laid toward the doorway illustrates the closing movement. Its colour and pattern are artistic choices.' },
  meal: { name: 'Shared meal', note: 'A domestic meal display, included as context rather than a mandatory ritual.' },
} as const;
export type WeddingObject = keyof typeof WEDDING_OBJECTS;
export const WEDDING_ITEMS: Record<string, WeddingObject[]> = {
  procession: ['trays', 'betel', 'seats'],
  ancestors: ['incense', 'betel', 'trays'],
  monks: ['water', 'seats', 'trays'],
  'hair-cutting': ['grooming', 'seats'],
  candles: ['popil', 'seats'],
  'knot-tying': ['thread', 'sword', 'seats'],
  'areca-flowers': ['flowers', 'thread', 'seats'],
  'scarf-leading': ['cloth', 'seats'],
  reception: ['meal', 'trays'],
};
