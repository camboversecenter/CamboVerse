import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BufferGeometry, CylinderGeometry, Group, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MachineProps } from "./LabMachines";

/**
 * Chemistry for the 🔬 Learning Lab.
 *
 * The Lab's three layers turn out to be exactly the three ways chemists draw a
 * molecule, which is a lucky fit and worth stating plainly:
 *
 * | layer     | representation   | what it is honest about |
 * |-----------|------------------|-------------------------|
 * | `whole`   | space-filling    | how much room the molecule actually takes up |
 * | `cutaway` | ball-and-stick   | which atom is joined to which |
 * | `frame`   | bonds only       | the shape, with the atoms out of the way |
 *
 * None of the three is "the real one". Space-filling is closest to the volume a
 * molecule occupies and useless for seeing structure; ball-and-stick shows the
 * connections and lies about the spacing. Students should meet all three and
 * know why each exists — so the layer buttons are the lesson here, not a
 * convenience.
 *
 * Scale: **1 Å = 20 units**, so an O–H bond is about 19 units long. Atom radii
 * are the standard CPK values in the same units.
 */

export const ANGSTROM = 20;

export type Element = "H" | "C" | "N" | "O" | "Na" | "Cl";

/** CPK colours, and the two radii the representations need. */
export const ELEMENT: Record<Element, { color: string; vdw: number; ball: number; name: string }> = {
  H:  { color: "#f4f4f4", vdw: 1.20 * ANGSTROM, ball: 0.32 * ANGSTROM, name: "Hydrogen" },
  C:  { color: "#3a3a3a", vdw: 1.70 * ANGSTROM, ball: 0.55 * ANGSTROM, name: "Carbon" },
  N:  { color: "#3050f8", vdw: 1.55 * ANGSTROM, ball: 0.52 * ANGSTROM, name: "Nitrogen" },
  O:  { color: "#d9412f", vdw: 1.52 * ANGSTROM, ball: 0.52 * ANGSTROM, name: "Oxygen" },
  Na: { color: "#a86ee0", vdw: 1.16 * ANGSTROM, ball: 0.60 * ANGSTROM, name: "Sodium" },
  Cl: { color: "#3fc93f", vdw: 1.67 * ANGSTROM, ball: 0.72 * ANGSTROM, name: "Chlorine" },
};

export type Atom = { el: Element; at: [number, number, number]; id?: string };
export type Bond = [number, number];

/** A stick between two atoms, as geometry so a lattice's worth can be merged. */
function bondGeometry(a: Vector3, b: Vector3, r: number, seg: number): BufferGeometry {
  const dir = new Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new CylinderGeometry(r, r, len, seg, 1);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g.toNonIndexed();
}

/**
 * One molecule or lattice, drawn in whichever representation the layer asks for.
 *
 * `running` is thermal motion. Molecules are never still, and a student who only
 * ever sees the static ball-and-stick picture comes away believing they are —
 * so the atoms jitter about their positions rather than sitting frozen. The
 * amplitude is exaggerated; real vibration at room temperature is a few percent
 * of a bond length.
 */
export function Structure({
  atoms, bonds, layer, detail, running, onPick, selected, ionic = false, dim = 1,
}: {
  atoms: Atom[];
  bonds: Bond[];
  layer: MachineProps["layer"];
  detail: MachineProps["detail"];
  running: boolean;
  onPick: (id: string) => void;
  selected: string | null;
  /** An ionic lattice has no bonds to draw — the "sticks" are just neighbours. */
  ionic?: boolean;
  /** Fade the whole structure — used by reactions to cross-fade reactants out. */
  dim?: number;
}) {
  const seg = detail === "ultra" ? 24 : 12;
  const jitter = useRef<Group[]>([]);
  const t = useRef(0);

  const stick = useMemo(() => {
    if (!bonds.length) return null;
    const parts = bonds.map(([i, j]) => bondGeometry(
      new Vector3(...atoms[i].at), new Vector3(...atoms[j].at),
      ionic ? 1.1 : 2.2, detail === "ultra" ? 10 : 6,
    ));
    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    return merged;
  }, [atoms, bonds, ionic, detail]);

  useFrame((_, dt) => {
    if (!running) return;
    t.current += dt;
    jitter.current.forEach((g, i) => {
      if (!g) return;
      const p = t.current * 5 + i * 1.7;
      const a = 0.9;
      g.position.set(Math.sin(p) * a, Math.sin(p * 1.31 + 1) * a, Math.sin(p * 0.83 + 2) * a);
    });
  });

  const spaceFilling = layer === "whole";
  const showAtoms = layer !== "frame";
  const showSticks = layer !== "whole" && !!stick;

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); onPick(id);
  };
  const any = !!selected;

  return (
    <group>
      {showAtoms && atoms.map((a, i) => {
        const el = ELEMENT[a.el];
        const id = a.id ?? a.el.toLowerCase();
        const sel = selected === id;
        return (
          <group key={i} position={a.at}>
            <group ref={(g) => { if (g) jitter.current[i] = g; }}>
              <mesh onClick={pick(id)} castShadow>
                <sphereGeometry args={[spaceFilling ? el.vdw : el.ball, seg, Math.round(seg * 0.7)]} />
                <meshPhysicalMaterial
                  color={el.color}
                  roughness={0.28}
                  clearcoat={0.7}
                  clearcoatRoughness={0.2}
                  metalness={0.05}
                  emissive={sel ? "#ffd9a0" : "#000000"}
                  emissiveIntensity={sel ? 0.45 : 0}
                  transparent={(any && !sel) || dim < 1}
                  opacity={(any && !sel ? 0.34 : 1) * dim}
                  depthWrite={!(any && !sel) && dim > 0.98}
                />
              </mesh>
            </group>
          </group>
        );
      })}

      {showSticks && (
        <mesh geometry={stick!} onClick={pick(ionic ? "lattice" : "bond")} castShadow>
          <meshPhysicalMaterial
            color={ionic ? "#6d7d88" : "#b9c2c9"}
            roughness={0.4}
            metalness={0.2}
            emissive={selected === (ionic ? "lattice" : "bond") ? "#ffd9a0" : "#000000"}
            emissiveIntensity={selected === (ionic ? "lattice" : "bond") ? 0.45 : 0}
            transparent={(any && selected !== (ionic ? "lattice" : "bond")) || dim < 1}
            opacity={(any && selected !== (ionic ? "lattice" : "bond") ? 0.3 : 1) * dim}
            depthWrite={dim > 0.98}
          />
        </mesh>
      )}
    </group>
  );
}

export function Readout({ at, children }: { at: [number, number, number]; children: React.ReactNode }) {
  return (
    <Html position={at} center occlude={false} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className="lab-readout">{children}</div>
    </Html>
  );
}

/* ---------------------------------------------------------------- water --- */

/**
 * Water — bent, not straight, and that is the whole story.
 *
 * Two lone pairs on the oxygen push the hydrogens down to about 104.5°. If the
 * molecule were linear the charges would cancel, water would not be polar, and
 * essentially nothing about it — dissolving salt, surface tension, ice floating
 * — would be true. One angle carries an extraordinary amount of consequence.
 */
export function Water({ layer, detail, onPick, selected, running }: MachineProps) {
  const d = 0.96 * ANGSTROM;
  const half = (104.5 / 2) * (Math.PI / 180);
  const atoms: Atom[] = [
    { el: "O", at: [0, 0, 0], id: "oxygen" },
    { el: "H", at: [Math.sin(half) * d, Math.cos(half) * d, 0], id: "hydrogen" },
    { el: "H", at: [-Math.sin(half) * d, Math.cos(half) * d, 0], id: "hydrogen" },
  ];
  return (
    <group position={[0, -6, 0]}>
      <Structure atoms={atoms} bonds={[[0, 1], [0, 2]]} layer={layer} detail={detail}
        running={running} onPick={onPick} selected={selected} />
      {layer !== "whole" && (
        <>
          <Readout at={[0, -20, 0]}><b>104.5°</b><span>bent, not straight</span></Readout>
          <Readout at={[-30, 6, 0]}>δ−  oxygen</Readout>
          <Readout at={[30, 30, 0]}>δ+  hydrogens</Readout>
        </>
      )}
    </group>
  );
}

/* -------------------------------------------------------------- methane --- */

/**
 * Methane — the tetrahedron, and the reason carbon builds everything.
 *
 * Four bonds pushing as far apart as they can get in three dimensions land at
 * 109.5°, which is a shape you cannot draw honestly on paper. This is the single
 * clearest case in school chemistry for a model you can turn around.
 */
export function Methane({ layer, detail, onPick, selected, running }: MachineProps) {
  const d = 1.09 * ANGSTROM;
  const k = d / Math.sqrt(3);
  const atoms: Atom[] = [
    { el: "C", at: [0, 0, 0], id: "carbon" },
    { el: "H", at: [k, k, k], id: "hydrogen" },
    { el: "H", at: [-k, -k, k], id: "hydrogen" },
    { el: "H", at: [-k, k, -k], id: "hydrogen" },
    { el: "H", at: [k, -k, -k], id: "hydrogen" },
  ];
  return (
    <group>
      <Structure atoms={atoms} bonds={[[0, 1], [0, 2], [0, 3], [0, 4]]} layer={layer}
        detail={detail} running={running} onPick={onPick} selected={selected} />
      {layer !== "whole" && (
        <Readout at={[0, -30, 0]}>
          <b>109.5° — a tetrahedron</b>
          <span>four bonds as far apart as three dimensions allow</span>
        </Readout>
      )}
    </group>
  );
}

/* ----------------------------------------------------------------- salt --- */

/**
 * Table salt — and the point that there is **no such thing as an NaCl molecule**.
 *
 * A grain of salt is one enormous repeating lattice of alternating ions. "NaCl"
 * is a ratio, not a particle. It is one of the commonest misconceptions in
 * school chemistry, and it survives entirely because the formula looks like a
 * molecule when written down. Building the lattice out and letting a student
 * count neighbours is the cure.
 */
export function SaltCrystal({ layer, detail, onPick, selected, running, knob }: MachineProps) {
  const n = Math.max(2, Math.min(5, Math.round(knob)));
  const a = 2.82 * ANGSTROM;                      // Na–Cl nearest-neighbour distance

  const { atoms, bonds } = useMemo(() => {
    const list: Atom[] = [];
    const idx = new Map<string, number>();
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          const sodium = (x + y + z) % 2 === 0;
          idx.set(`${x},${y},${z}`, list.length);
          list.push({
            el: sodium ? "Na" : "Cl",
            at: [(x - (n - 1) / 2) * a, (y - (n - 1) / 2) * a, (z - (n - 1) / 2) * a],
            id: sodium ? "sodium" : "chloride",
          });
        }
      }
    }
    const links: Bond[] = [];
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          const from = idx.get(`${x},${y},${z}`)!;
          for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
            const to = idx.get(`${x + dx},${y + dy},${z + dz}`);
            if (to !== undefined) links.push([from, to]);
          }
        }
      }
    }
    return { atoms: list, bonds: links };
  }, [n, a]);

  return (
    <group>
      <Structure atoms={atoms} bonds={bonds} layer={layer} detail={detail} running={running}
        onPick={onPick} selected={selected} ionic />
      <Readout at={[0, -(n * a) / 2 - 22, 0]}>
        <b>{atoms.length} ions — and not one molecule</b>
        <span>every sodium has six chlorides around it, and the other way round</span>
      </Readout>
    </group>
  );
}

/* --------------------------------------------------------------- carbon --- */

/**
 * Diamond and graphite, side by side.
 *
 * The same atom, twice, and the properties could not be further apart: the
 * hardest natural substance and something soft enough to write with. Nothing
 * about the atoms differs. Only the arrangement does.
 *
 * Showing them together is the whole exhibit. Separately they are two structures
 * to memorise; together they are an argument about why structure matters.
 */
export function Carbon({ layer, detail, onPick, selected, running }: MachineProps) {
  const dia = 1.54 * ANGSTROM;
  const gra = 1.42 * ANGSTROM;
  const gap = 3.35 * ANGSTROM;

  // Diamond: a carbon at the centre of a tetrahedron of carbons, each of which
  // is the centre of another. Two shells is enough to read as a network.
  const diamond = useMemo(() => {
    const k = dia / Math.sqrt(3);
    const dirs: [number, number, number][] = [[k, k, k], [-k, -k, k], [-k, k, -k], [k, -k, -k]];
    const list: Atom[] = [{ el: "C", at: [0, 0, 0], id: "diamond" }];
    const links: Bond[] = [];
    dirs.forEach((d) => {
      const i = list.length;
      list.push({ el: "C", at: d, id: "diamond" });
      links.push([0, i]);
      // second shell, mirrored so the network reads as continuing
      dirs.filter((e) => e !== d).forEach((e) => {
        const j = list.length;
        list.push({ el: "C", at: [d[0] - e[0], d[1] - e[1], d[2] - e[2]], id: "diamond" });
        links.push([i, j]);
      });
    });
    return { atoms: list, bonds: links };
  }, [dia]);

  // Graphite: a real honeycomb, built from graphene's two sublattices rather
  // than from separate rings. The first attempt drew loose hexagons that did not
  // share edges, which is exactly the wrong picture — the strength within a
  // sheet comes from it being one continuous net.
  const graphite = useMemo(() => {
    const list: Atom[] = [];
    const links: Bond[] = [];
    const key = new Map<string, number>();
    const a1: [number, number] = [1.5 * gra, 0.866 * gra];
    const a2: [number, number] = [1.5 * gra, -0.866 * gra];

    const add = (x: number, y: number, z: number) => {
      const k = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
      const found = key.get(k);
      if (found !== undefined) return found;
      key.set(k, list.length);
      list.push({ el: "C", id: "graphite", at: [x, y, z] });
      return list.length - 1;
    };

    for (let sheet = 0; sheet < 3; sheet++) {
      const y = (sheet - 1) * gap;
      // real graphite offsets alternate sheets; that stagger is why they stack
      const shift = sheet % 2 ? gra : 0;
      const cell = (i: number, j: number): [number, number] =>
        [i * a1[0] + j * a2[0] + shift, i * a1[1] + j * a2[1]];
      for (let i = 0; i <= 1; i++) {
        for (let j = 0; j <= 1; j++) {
          const [cx, cz] = cell(i, j);
          const b = add(cx + gra, y, cz);
          for (const [di, dj] of [[0, 0], [1, 0], [0, 1]] as const) {
            const [nx, nz] = cell(i + di, j + dj);
            links.push([b, add(nx, y, nz)]);
          }
        }
      }
    }
    // centre the patch on its own middle, so it sits where it is placed
    const mid = list.reduce((m, a) => [m[0] + a.at[0], m[1], m[2] + a.at[2]] as [number, number, number],
      [0, 0, 0] as [number, number, number]);
    const cx = mid[0] / list.length;
    const cz = mid[2] / list.length;
    for (const a of list) a.at = [a.at[0] - cx, a.at[1], a.at[2] - cz];
    return { atoms: list, bonds: links };
  }, [gra, gap]);

  const pos = 58;
  return (
    <group>
      <group position={[-pos, 0, 0]}>
        <Structure atoms={diamond.atoms} bonds={diamond.bonds} layer={layer} detail={detail}
          running={running} onPick={onPick} selected={selected} />
        {/* one word each: at this separation a two-line caption on each side
            simply overlaps the other one */}
        <Readout at={[0, -78, 0]}><b>Diamond</b></Readout>
      </group>
      <group position={[pos, 0, 0]}>
        <Structure atoms={graphite.atoms} bonds={graphite.bonds} layer={layer} detail={detail}
          running={running} onPick={onPick} selected={selected} />
        <Readout at={[0, -78, 0]}><b>Graphite</b></Readout>
      </group>
      <Readout at={[0, 104, 0]}>
        <b>Both are pure carbon</b>
        <span>four bonds braced in 3D · three bonds in sheets that slide</span>
      </Readout>
    </group>
  );
}

/* ------------------------------------------------------------- molecules --- */

export type MoleculeSpec = { formula: string; atoms: Atom[]; bonds: Bond[] };

const A = ANGSTROM;
const tetra = (d: number) => {
  const k = d / Math.sqrt(3);
  return [[k, k, k], [-k, -k, k], [-k, k, -k], [k, -k, -k]] as [number, number, number][];
};

/**
 * The molecules the reactions are made of, at real bond lengths and angles.
 *
 * Kept here rather than in each reaction so that water is the same water
 * wherever it turns up — as a product of burning methane, as a product of
 * neutralisation, and as its own exhibit.
 */
export const MOLECULE: Record<string, MoleculeSpec> = {
  H2O: {
    formula: "H₂O",
    atoms: [
      { el: "O", at: [0, 0, 0], id: "oxygen" },
      { el: "H", at: [Math.sin(0.912) * 0.96 * A, Math.cos(0.912) * 0.96 * A, 0], id: "hydrogen" },
      { el: "H", at: [-Math.sin(0.912) * 0.96 * A, Math.cos(0.912) * 0.96 * A, 0], id: "hydrogen" },
    ],
    bonds: [[0, 1], [0, 2]],
  },
  CH4: {
    formula: "CH₄",
    atoms: [
      { el: "C", at: [0, 0, 0], id: "carbon" },
      ...tetra(1.09 * A).map((at) => ({ el: "H" as const, at, id: "hydrogen" })),
    ],
    bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
  },
  O2: {
    formula: "O₂",
    atoms: [
      { el: "O", at: [-0.605 * A, 0, 0], id: "oxygen" },
      { el: "O", at: [0.605 * A, 0, 0], id: "oxygen" },
    ],
    bonds: [[0, 1]],
  },
  H2: {
    formula: "H₂",
    atoms: [
      { el: "H", at: [-0.37 * A, 0, 0], id: "hydrogen" },
      { el: "H", at: [0.37 * A, 0, 0], id: "hydrogen" },
    ],
    bonds: [[0, 1]],
  },
  CO2: {
    formula: "CO₂",
    atoms: [
      { el: "C", at: [0, 0, 0], id: "carbon" },
      { el: "O", at: [-1.16 * A, 0, 0], id: "oxygen" },
      { el: "O", at: [1.16 * A, 0, 0], id: "oxygen" },
    ],
    bonds: [[0, 1], [0, 2]],
  },
  HCl: {
    formula: "HCl",
    atoms: [
      { el: "H", at: [-0.635 * A, 0, 0], id: "hydrogen" },
      { el: "Cl", at: [0.635 * A, 0, 0], id: "chlorine" },
    ],
    bonds: [[0, 1]],
  },
  NaOH: {
    formula: "NaOH",
    atoms: [
      { el: "Na", at: [-1.2 * A, 0, 0], id: "sodium" },
      { el: "O", at: [0.3 * A, 0, 0], id: "oxygen" },
      { el: "H", at: [0.9 * A, 0.55 * A, 0], id: "hydrogen" },
    ],
    bonds: [[0, 1], [1, 2]],
  },
  // The products of neutralisation are ions in solution, not an NaCl molecule.
  // Drawing them apart is the honest picture and reinforces the salt exhibit.
  NaIon: { formula: "Na⁺", atoms: [{ el: "Na", at: [0, 0, 0], id: "sodium" }], bonds: [] },
  ClIon: { formula: "Cl⁻", atoms: [{ el: "Cl", at: [0, 0, 0], id: "chloride" }], bonds: [] },
};
