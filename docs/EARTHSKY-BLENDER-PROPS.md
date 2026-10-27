# Earth & Sky: local Blender display pilot

Six tabletop displays now have original Blender-authored GLB replacements in
development: inner-planet orrery, Earth cross-section, day/night globe,
Earth/Moon, tilted-Earth seasons display, and exaggerated tide outline.
Room furniture, the standalone Seasons exhibit and lesson diagrams are unchanged.

## Assets and generation

Run `scripts/build-earthsky-props.py` with Blender in background mode. Optional
arguments after `--` select kinds (for example `-- seasons`). Outputs are under
`public/models/local/earthsky-*-v1*`: Normal/Ultra GLBs, editable Blender scenes,
studio-rendered PNG previews and a JSON geometry/size report. These local assets
are ignored by Git. They are original authored teaching props, not downloaded scans.

`EarthSkyBlenderProp.tsx` loads the selected tier only in development. Production,
loading and error states retain the previous procedural props. Publishing these
assets is a separate review step; no deployment was performed.

## Fidelity and limitations

- Both tiers retain the same six displays. Normal reduces segments, uses opaque
  materials and does not cast shadows; Ultra uses smoother meshes and shadows.
- Combined GLBs are approximately 0.77 MB Normal / 2.73 MB Ultra, before transport
  compression. The six props contain 89 mesh objects; this is not a phone benchmark.
- Earth coordinates are a schematic grid, not mapped continents. Lunar depressions
  are procedural, not an accurate lunar map. No photorealistic textures are included.
- Planet sizes, distances, layer thicknesses, tides and motion speeds are illustrative.
  The tabletop orrery retains four inner planets; the lesson panel remains unchanged.
- Seasons replaces the unrelated Saturn prop locally with a Sun-centred orbit and
  tilted Earth. It is a static display, not a season simulation.
- Ambient globe rotation, Moon orbit and orrery motion are restored in the viewer.
- Room lighting was brightened to reveal materials, and the initial direction now
  faces the main exhibits. Low-end Android and headset performance remain unverified.

## Checks

Blender generation/render completed; all twelve GLBs parsed using Three.js with
finite position data. All six studio renders were visually reviewed (Seasons was
corrected and regenerated). TypeScript check passed. Local browser opened the
room, switched Ultra to Normal, and opened Earth Layers with its quiz intact.
No browser errors were recorded during the initial room check. Full traversal,
all lessons, physical mobile performance and VR have not been tested.

Next realism work: verified/licensed planetary textures, better lunar relief,
educator review, then draw-call optimization and device testing. This is a first
display-mesh pass, not completion of all room objects or photorealism.
