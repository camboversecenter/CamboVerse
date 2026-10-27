import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Bundle project TSX for Node; dependencies stay shared so React has one dispatcher.
const outfile = resolve("node_modules/.cache/camboverse/lab-previews.mjs");
await build({ entryPoints: ["scripts/lab-previews.tsx"], bundle: true, platform: "node",
  format: "esm", packages: "external", jsx: "automatic", outfile,
  // Preview generation includes local-only exhibits, but renders their light
  // schematic stand-ins instead of requesting browser-only GLB assets in Node.
  define: { "import.meta.env.DEV": "true", "import.meta.env.MODE": '"test"' } });
await import(pathToFileURL(outfile).href);
