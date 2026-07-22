import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, WOOD, DARK_SAND } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/chapei.glb");
const b = createBuilder();

// body 
b.cyl(0.4, 0.4, 0.15, 16, 0, 0.4, 0, WOOD, [Math.PI/2, 0, 0]);
// neck
b.box(0.08, 1.6, 0.04, 0, 1.3, 0, DARK_SAND);
// tuning pegs
b.box(0.2, 0.04, 0.04, 0, 2.0, 0, WOOD);

b.build(OUT, { scale: 1.2 });
