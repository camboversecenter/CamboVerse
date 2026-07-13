# Contributing to CamboVerse

Thank you for helping build a Digital Public Good for Khmer heritage.
CamboVerse is developed in the open, and **building it is the curriculum** at
NUM — contributions are scoped as coursework, capstones, and theses, as well as
from the wider open-source community. Everyone follows the same public workflow.

Please also read [`STRATEGY.md`](./STRATEGY.md) (the founding framework) and
[`AGENTS.md`](./AGENTS.md) (fast orientation) so your contribution fits the
project's direction and hard constraints.

## Ground rules

- **Respect the v1 scope.** The v1 north star is **one temple** that opens in a
  mobile browser and runs on a ~$150 Android over 4G. Real-time multiplayer, VR,
  avatars, UGC tooling, payments, and native apps are explicitly *later phases*.
- **Mobile-first, low-bandwidth.** "Runs on a low-end Android over 4G" is a hard
  acceptance criterion. Keep bundles small; prefer streamed, compressed, LOD'd
  assets.
- **Open standards only.** glTF, WebGL/WebGPU/WebXR, open splat formats. No
  vendor lock-in — this is national infrastructure.
- **Be culturally respectful.** Heritage is represented with consent and in
  partnership with APSARA / the Ministry of Culture. Don't fabricate policy
  titles, citations, or institutional relationships — flag assumptions instead.

## Development setup

Requires Node.js 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

Before opening a pull request:

```bash
npm run typecheck  # tsc -b, must pass
npm run build      # must succeed
```

## Workflow

1. **Find or open an issue.** Look for `good first issue` labels — these are
   sized for students getting started. Comment to claim it.
2. **Branch** from `main` with a descriptive name (e.g. `feat/splat-loader`,
   `fix/orbit-controls-touch`).
3. **Make focused changes.** Match the style of the surrounding code. Keep PRs
   small and reviewable.
4. **Verify** locally: `npm run typecheck && npm run build`, and check it still
   works on a phone-sized viewport.
5. **Open a pull request** describing *what* changed and *why*, and link the
   issue. A faculty lead or maintainer will review.

## Commit messages

Write clear, imperative-mood messages: `Add glTF loader for heritage models`.
Reference issues where relevant (`Closes #12`).

## Good first contributions

- UI/UX polish for the viewer HUD and information hotspots.
- Performance work: DPR caps, LODs, texture compression, load timing.
- Documentation, Khmer/English copy (flag Khmer text for native review).
- A real glTF loader to replace the placeholder model.

## Reporting bugs & ideas

Open an issue with clear steps to reproduce (for bugs) or a short rationale (for
proposals). Screenshots and the device/browser you tested on are very helpful.

## License of contributions

By contributing, you agree that your code contributions are licensed under
[Apache-2.0](./LICENSE), and any heritage content under the archive's CC-BY
terms (see `STRATEGY.md` §4.1).
