/**
 * public/models/angkor-wat.glb — the authored Angkor Wat glTF, from the shared
 * composition (scripts/models/angkor.mjs): the elongated galleried enclosure
 * with a causeway and the five-tower quincunx. Run: node scripts/generate-angkor.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";
import { composeAngkor, ANGKOR_SCALE } from "./models/angkor.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/angkor-wat.glb");
const b = createBuilder();
composeAngkor(b);
b.build(OUT, { scale: ANGKOR_SCALE });
