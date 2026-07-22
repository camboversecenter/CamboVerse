import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, WOOD, DARK_SAND } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/tbaal.glb");
const b = createBuilder();

// mortar
b.cyl(0.4, 0.45, 0.6, 16, 1.0, 0.3, 0, WOOD);
// pestle
b.cyl(0.08, 0.08, 0.9, 8, 1.0, 1.1, 0, DARK_SAND);
// lever arm
b.box(2.4, 0.1, 0.15, 0, 0.5, 0, WOOD);
// pivot stand
b.box(0.2, 0.6, 0.25, -0.5, 0.3, 0, WOOD);

b.build(OUT, { scale: 1 });
