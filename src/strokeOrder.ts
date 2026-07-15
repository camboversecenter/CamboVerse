/**
 * Stroke-order data for Khmer letters — each letter as an ordered list of
 * strokes, each stroke a median polyline ([x, y] points, in the same 0..100 box
 * as src/glyphPaths.ts) tracing the pen's path. The classroom animates the
 * strokes in sequence (numbered) over a faint outline of the letter.
 *
 * ⚠️ COMMUNITY DRAFT. The numeral strokes below are a first pass: the *shapes*
 * are traced from the font, but the *order and direction* need verification by
 * Khmer educators, and the consonants and vowels are not authored yet. Please
 * help — see TODO.md ("true stroke order") and scripts/author-stroke-order.mjs.
 *
 * Letters without an entry here fall back to the write-on outline animation.
 */
export type Stroke = [number, number][];

export interface StrokeData {
  /** Ordered strokes (pen medians). */
  strokes: Stroke[];
  /** true = reviewed/verified by a Khmer educator; false = community draft. */
  verified: boolean;
}

export const STROKE_ORDER: Record<string, StrokeData> = {
  // Numerals ០–៩ — draft (shapes traced from Noto Sans Khmer; order to verify).
  "០": { verified: false, strokes: [[[47, 13], [33, 19], [27, 37], [27, 62], [33, 82], [47, 88], [61, 82], [67, 62], [67, 37], [61, 19], [47, 13]]] },
  "១": { verified: false, strokes: [[[44, 18], [30, 26], [30, 42], [42, 50], [56, 44], [56, 28], [44, 18]], [[48, 48], [47, 74], [44, 85], [30, 84]]] },
  "២": { verified: false, strokes: [[[32, 62], [30, 76], [42, 85], [56, 80], [58, 66], [46, 60]], [[52, 64], [56, 44], [54, 34], [62, 32], [66, 42], [72, 34], [70, 48]]] },
  "៣": { verified: false, strokes: [[[28, 85], [28, 42], [34, 34], [42, 42], [42, 64]], [[42, 42], [50, 34], [60, 34], [70, 42], [70, 85]]] },
  "៤": { verified: false, strokes: [[[30, 82], [30, 42], [36, 32], [46, 36], [46, 52]], [[50, 52], [64, 50], [70, 60], [64, 72], [54, 68]]] },
  "៥": { verified: false, strokes: [[[46, 20], [32, 28], [30, 44], [42, 52], [54, 46], [52, 32], [42, 26]], [[50, 48], [58, 40], [62, 58], [58, 78], [42, 86], [30, 82]]] },
  "៦": { verified: false, strokes: [[[31, 20], [31, 54], [33, 72], [46, 84], [60, 76], [62, 60], [50, 53], [38, 57]]] },
  "៧": { verified: false, strokes: [[[30, 82], [30, 42], [36, 34], [44, 42], [44, 80]], [[44, 42], [52, 34], [66, 36], [70, 48], [70, 60], [64, 72]]] },
  "៨": { verified: false, strokes: [[[46, 26], [32, 32], [30, 46], [42, 52], [52, 44], [50, 30], [40, 27]], [[34, 52], [48, 86], [62, 54], [66, 72]]] },
  "៩": { verified: false, strokes: [[[32, 34], [52, 32], [68, 34], [56, 48], [40, 52], [36, 66], [48, 80], [66, 74]]] },
};
