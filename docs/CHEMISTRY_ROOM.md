# Chemistry room pilot

Entry: Learning Lab → Enter the Chemistry room. Existing standalone specimen
access is unchanged. Water and salt viewer links return to the room through the
normal back action. Opening a standalone viewer unmounts the room, so the tray
currently resets on return.

One local room shell with a reaction bench and two specimen stations. Accessible
DOM buttons mirror clickable benches. The water lesson supports 0–4 H2 and 0–2 O2,
prediction, react/replay, pause, four stage buttons, timeline scrubbing, atom
selection and explicit leftover counts. Atom identities persist during a schematic
rearrangement. This is NOT an elementary mechanism, kinetic simulation or a recipe.

`chemistryBench.ts` computes molecule counts, stable atom IDs, before/after bonds
and positions independently of React or input hardware. Its tests enumerate every
supported tray and check conservation. The scene reads a shared progress ref;
React's progress display updates at approximately 10 Hz rather than every frame.

Normal uses reduced sphere detail/DPR, no shadows or transmission. Ultra increases
geometry detail and enables shadows. All learning content remains available in
Normal. No downloads of external models are required.

## Not yet complete

- Headset entry, Ultra-on-VR, controller UI and teleportation: not enabled. The UI
  explicitly identifies this as a phone/desktop pilot. Do not describe it as VR ready.
- Target low-end Android/4G and headset acceptance testing.
- Decorative lab equipment, additional reactions and other subject rooms.
- Drag-and-drop (buttons and keyboard work instead), persistent tray state,
  and shareable deep links to the new room.

Verification: `npm run typecheck`; `npx vitest run src/chemistryBench.test.ts`.
