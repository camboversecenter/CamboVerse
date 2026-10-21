#!/usr/bin/env node
// avatar.mjs — make new images of a CamboVerse province avatar with the face kept (faces are checked by eye: see ../SKILL.md).
// SPDX-License-Identifier: Apache-2.0
//
//   node tools/avatar.mjs look  <avatar-dir> "<outfit, pose and setting>" <out.jpg> [--aspect 3:4] [--keep-outfit] [--ref extra.jpg]
//   node tools/avatar.mjs edit  <avatar-dir> <in.jpg> "<the one change to make>" <out.jpg> [--aspect 3:4]
//
// <avatar-dir> is a province's avatar folder, e.g. camboverse-provinces/13-mondulkiri/avatar (holds avatar.json, face.jpg, body.jpg).
// Needs Node 18+ and GEMINI_API_KEY in the environment (never commit it). Behind an HTTP proxy run with NODE_USE_ENV_PROXY=1.
// Model: GEMINI_IMAGE_MODEL (default gemini-3.1-flash-lite-image).
import fs from "node:fs";
import path from "node:path";

const API = "https://generativelanguage.googleapis.com/v1beta";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image";

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const aspect = flag("--aspect", "3:4");
const extraRef = flag("--ref", null);
const keepOutfit = has("--keep-outfit");
const [mode, dir, ...rest] = args;
if (!mode || !dir) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 12).join("\n")); process.exit(2); }

const av = JSON.parse(fs.readFileSync(path.join(dir, "avatar.json"), "utf8"));
const img = (f) => ({ inlineData: { mimeType: "image/jpeg", data: fs.readFileSync(f).toString("base64") } });
const face = path.join(dir, av.refs.face), body = path.join(dir, av.refs.body);

async function gemini(model, body) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${API}/models/${model}:generateContent`, { method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    if (res.ok) return res.json();
    console.error(`retry ${i + 1}: HTTP ${res.status}`); await new Promise((r) => setTimeout(r, 20000));
  }
  throw new Error("model call failed 4 times");
}

async function image(parts, out) {
  for (let i = 0; i < 3; i++) {
    const j = await gemini(IMAGE_MODEL, { contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: aspect } } });
    const inl = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (inl) { fs.writeFileSync(out, Buffer.from(inl.data, "base64")); return; }
    console.error("no image returned, retrying");
  }
  throw new Error("no image after 3 tries");
}

const rules = () => `Rules: ${av.rules.join(" ")}`;

if (mode === "look") {
  const [brief, out] = rest;
  const parts = [img(face)];
  if (keepOutfit) parts.push(img(body));
  if (extraRef) parts.push(img(extraRef));
  parts.push({ text: [
    `The first reference image is the face of ${av.promptName}, a fixed fictional character. Make a photorealistic image of exactly this person: a faithful likeness with the same face.`,
    `Locked identity (never change): ${av.identity}`,
    keepOutfit ? `Her outfit is exactly the one in the second reference image: ${av.defaultOutfit}` : `Her outfit for this image (the only thing that changes): see below. Ignore any clothing in the face reference.`,
    `This image: ${brief}`,
    rules(),
  ].join("\n") });
  await image(parts, out);
  console.log("wrote", out, "— compare the face with", face, "side by side before using it");
} else if (mode === "edit") {
  const [src, change, out] = rest;
  await image([img(src), img(face), { text: `Edit the first image. Keep everything exactly the same — the same person, face (the second image is her face reference), pose, framing, background and light. Change only this: ${change}\n${rules()}` }], out);
  console.log("wrote", out, "— compare the face with", face, "side by side before using it");
} else {
  console.error(`unknown mode ${mode}`); process.exit(2);
}
