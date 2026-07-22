import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, WOOD } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/angrut.glb");
const b = createBuilder();

// bamboo trap body
b.cyl(0.2, 0.6, 1.2, 16, 0, 0.6, 0, WOOD);

b.build(OUT, { scale: 1.5 });
