import {
  BackSide, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial, PlaneGeometry,
  PMREMGenerator, Scene, SphereGeometry, type Texture, type WebGLRenderer,
} from "three";

/**
 * A **procedural studio environment** — the single biggest realism lever
 * available to us, and it costs nothing to ship.
 *
 * Wet organic surfaces read as real almost entirely through their specular
 * highlights: the smeared reflection of a soft box is what says "this is moist"
 * rather than "this is plastic". A directional light alone cannot do that — it
 * gives one hard dot. An environment map gives the whole surface something to
 * reflect.
 *
 * The usual way to get one is to download an HDRI, which CamboVerse will not do:
 * no CDN, no external runtime assets. So this builds one in the browser — a
 * gradient dome plus a few emissive panels, rendered once through
 * `PMREMGenerator` into a pre-filtered cube map. About 15 ms on a mid phone, one
 * texture, and nothing crosses the network.
 */
export function studioEnvironment(renderer: WebGLRenderer, opts?: {
  /** Overall brightness of the rig. */
  intensity?: number;
  /** Colour high in the dome. */
  sky?: string;
  /** Colour low down — the bounce off an imaginary table. */
  ground?: string;
}): Texture {
  const intensity = opts?.intensity ?? 1;
  const scene = new Scene();

  // The dome: a big inverted sphere with a vertical gradient painted into its
  // vertex colours. Cheaper than a canvas texture and perfectly smooth.
  const dome = new SphereGeometry(60, 24, 16);
  const sky = new Color(opts?.sky ?? "#cfe0ee");
  const ground = new Color(opts?.ground ?? "#3a3f46");
  const colors: number[] = [];
  const pos = dome.attributes.position;
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) / 60 + 1) / 2;
    c.copy(ground).lerp(sky, t * t * (3 - 2 * t));
    colors.push(c.r * intensity, c.g * intensity, c.b * intensity);
  }
  dome.setAttribute("color", new Float32BufferAttribute(colors, 3));
  scene.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));

  // Soft boxes. A key high on the left, a broad fill on the right, and a strip
  // behind so a silhouette gets a rim rather than dissolving into the backdrop.
  const panel = (w: number, h: number, x: number, y: number, z: number, lum: number) => {
    const m = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(lum * intensity, lum * intensity, lum * intensity) }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(34, 34, -26, 26, 26, 3.4);   // key
  panel(46, 30, 30, 6, 18, 1.5);     // fill
  panel(40, 16, 0, 14, -34, 2.2);    // rim

  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromScene(scene, 0.06);

  // The scene is disposable; the pre-filtered texture is not.
  scene.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (mat && !Array.isArray(mat)) mat.dispose();
  });
  pmrem.dispose();
  return target.texture;
}
