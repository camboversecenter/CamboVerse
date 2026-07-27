import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Procedural surfaces for the NUM International Campus — paving, facades,
 * window bands, ribbed metal roofing, the running track, and signage lettering.
 * All drawn on a canvas at runtime: no image files, no CDN, nothing to download
 * (the self-contained rule), and cached so each is built once per page.
 */
const cache = new Map<string, CanvasTexture>();

function tex(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 16;
  cache.set(key, t);
  return t;
}

function rand(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Grey stone plaza paving, laid in courses like the campus forecourt.
 *
 * `repeat` is how many times the 512-px tile-set (8 courses of slabs) wraps
 * across the surface. Size it with `metresRepeat` from groundTexture so one
 * repeat covers about 8 m, giving ~1 m slabs: repeating much tighter puts
 * several slabs inside one screen pixel at distance and the paving shimmers.
 */
export function paveTexture(repeat = 12): Texture {
  return tex(`pave:${repeat}`, 512, (ctx, s) => {
    const r = rand(3);
    ctx.fillStyle = "#b9b7b2";
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const h = s / rows;
    for (let y = 0; y < rows; y++) {
      const offset = (y % 2) * h * 0.5;
      for (let x = -1; x < rows + 1; x++) {
        const px = x * h + offset;
        const g = 168 + r() * 42;
        ctx.fillStyle = `rgb(${g | 0},${(g - 2) | 0},${(g - 6) | 0})`;
        ctx.fillRect(px + 1, y * h + 1, h - 2, h - 2);
      }
    }
    // joints + a little wear
    ctx.strokeStyle = "rgba(120,118,112,0.55)";
    ctx.lineWidth = 1.5;
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * h); ctx.lineTo(s, y * h); ctx.stroke();
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${90 + r() * 90 | 0},${90 + r() * 90 | 0},${88 + r() * 88 | 0},0.14)`;
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
  }, [repeat, repeat]);
}

/** Poured concrete / asphalt roadway. Same rule: about 8 m per repeat. */
export function roadTexture(repeat = 10): Texture {
  return tex(`road:${repeat}`, 256, (ctx, s) => {
    const r = rand(11);
    ctx.fillStyle = "#8d8d88";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = 110 + r() * 70;
      ctx.fillStyle = `rgba(${v | 0},${v | 0},${(v - 4) | 0},0.5)`;
      ctx.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
    }
  }, [repeat, repeat]);
}

/** The red athletics track, with lane lines running along it. */
export function trackTexture(repeat = 1): Texture {
  return tex(`track:${repeat}`, 256, (ctx, s) => {
    const r = rand(5);
    ctx.fillStyle = "#b0503a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 3000; i++) {
      const v = 150 + r() * 60;
      ctx.fillStyle = `rgba(${v | 0},${(v * 0.5) | 0},${(v * 0.4) | 0},0.25)`;
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      const x = (i / 6) * s;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
    }
  }, [repeat, repeat]);
}

/**
 * A storey of the academic block: white wall with a band of windows, the way
 * the campus buildings read from across the field.
 */
export function facadeTexture(floors = 4, bays = 16): Texture {
  return tex(`facade:${floors}:${bays}`, 512, (ctx, s) => {
    ctx.fillStyle = "#f2f0ea";
    ctx.fillRect(0, 0, s, s);
    const fh = s / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * fh;
      // floor slab band
      ctx.fillStyle = "#e6e3da";
      ctx.fillRect(0, y + fh * 0.86, s, fh * 0.14);
      // window band
      const bw = s / bays;
      for (let b = 0; b < bays; b++) {
        const x = b * bw;
        ctx.fillStyle = "#40566b";
        ctx.fillRect(x + bw * 0.18, y + fh * 0.24, bw * 0.64, fh * 0.5);
        // glazing highlight
        ctx.fillStyle = "rgba(200,225,245,0.45)";
        ctx.fillRect(x + bw * 0.18, y + fh * 0.24, bw * 0.64, fh * 0.16);
        // mullion
        ctx.fillStyle = "#f2f0ea";
        ctx.fillRect(x + bw * 0.48, y + fh * 0.24, bw * 0.04, fh * 0.5);
      }
    }
  }, [1, 1]);
}

/** Specific layout for 7-bay teaching block (5 classrooms + 2 stairwells) */
export function roomFacadeTexture(floors = 3, rooms = 7, type: "front" | "back" = "front"): Texture {
  const key = `roomFacade:${floors}:${rooms}:${type}`;
  const hit = cache.get(key);
  return tex(key, 1024, (ctx, s) => { // increased resolution to 1024 for sharper details
    ctx.fillStyle = "#f2f0ea";
    ctx.fillRect(0, 0, s, s);
    const fh = s / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * fh;
      // floor slab band
      ctx.fillStyle = "#e6e3da";
      ctx.fillRect(0, y + fh * 0.86, s, fh * 0.14);
      
      const rw = s / rooms;
      for (let r = 0; r < rooms; r++) {
        const x = r * rw;
        
        if (r === 0 || r === rooms - 1) {
          // Louvered ends (stairwells)
          // Draw a block with horizontal louver lines
          ctx.fillStyle = "#8a96a3";
          ctx.fillRect(x + rw * 0.1, y + fh * 0.1, rw * 0.8, fh * 0.7);
          ctx.fillStyle = "#707f8e";
          for (let ly = y + fh * 0.1; ly < y + fh * 0.8; ly += 4) {
            ctx.fillRect(x + rw * 0.1, ly, rw * 0.8, 1.5);
          }
        } else {
          // Classrooms
          if (type === "front") {
            // Front: Wide bank of 4 windows with small louvers above
            // Louvers above
            ctx.fillStyle = "#8a96a3";
            ctx.fillRect(x + rw * 0.1, y + fh * 0.15, rw * 0.8, fh * 0.1);
            ctx.fillStyle = "#707f8e";
            for (let ly = y + fh * 0.15; ly < y + fh * 0.25; ly += 3) {
              ctx.fillRect(x + rw * 0.1, ly, rw * 0.8, 1);
            }
            // 4 Window panes
            const pw = (rw * 0.8 - (3 * rw * 0.04)) / 4; // pane width, with spacing
            for (let p = 0; p < 4; p++) {
              const px = x + rw * 0.1 + p * (pw + rw * 0.04);
              ctx.fillStyle = "#40566b";
              ctx.fillRect(px, y + fh * 0.3, pw, fh * 0.5);
              // Glass highlight
              ctx.fillStyle = "rgba(200,225,245,0.45)";
              ctx.fillRect(px, y + fh * 0.3, pw, fh * 0.16);
            }
          } else {
            // Back: 2 windows
            ctx.fillStyle = "#40566b";
            ctx.fillRect(x + rw * 0.15, y + fh * 0.24, rw * 0.3, fh * 0.5);
            ctx.fillStyle = "rgba(200,225,245,0.45)";
            ctx.fillRect(x + rw * 0.15, y + fh * 0.24, rw * 0.3, fh * 0.16);
            
            ctx.fillStyle = "#40566b";
            ctx.fillRect(x + rw * 0.55, y + fh * 0.24, rw * 0.3, fh * 0.5);
            ctx.fillStyle = "rgba(200,225,245,0.45)";
            ctx.fillRect(x + rw * 0.55, y + fh * 0.24, rw * 0.3, fh * 0.16);
          }
        }
      }
    }
  }, [1, 1]);
}

/** The great hall's full-height glazing: tall mullions over dark glass. */
export function glazingTexture(bays = 18): Texture {
  return tex(`glaze:${bays}`, 512, (ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, "#8fa6b4");
    grad.addColorStop(0.45, "#5d7484");
    grad.addColorStop(1, "#43555f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    // soft reflections
    const r = rand(17);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(226,240,250,${0.05 + r() * 0.09})`;
      ctx.fillRect(0, r() * s, s, 4 + r() * 26);
    }
    const bw = s / bays;
    ctx.fillStyle = "#eceae4";
    for (let b = 0; b <= bays; b++) ctx.fillRect(b * bw - 2, 0, 4, s);
    ctx.fillRect(0, 0, s, 5);
    ctx.fillRect(0, s - 5, s, 5);
  }, [1, 1]);
}

/** Ribbed metal roofing — the campus's signature red roofs. */
export function roofTexture(color = "#b23a34", ribs = 40, repeat: [number, number] = [1, 1]): Texture {
  return tex(`roof:${color}:${ribs}:${repeat.join("x")}`, 256, (ctx, s) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, s, s);
    const w = s / ribs;
    for (let i = 0; i < ribs; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(i * w, 0, w * 0.32, s);
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.fillRect(i * w + w * 0.72, 0, w * 0.28, s);
    }
  }, repeat);
}

/**
 * Signage lettering drawn to a transparent texture — used for the entrance
 * monument and building name boards. Text is baked at runtime, so no font file
 * is downloaded and it stays crisp on the plane it's mapped to.
 */
export function signTexture(
  line1: string, line2 = "", opts: { fg?: string; sub?: string; bg?: string } = {},
): Texture {
  const key = `sign:${line1}|${line2}|${opts.fg}|${opts.sub}|${opts.bg}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 1024;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.clearRect(0, 0, W, H);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (line2) {
    ctx.fillStyle = opts.fg ?? "#d8b24a";
    ctx.font = "800 108px Georgia, 'Times New Roman', serif";
    ctx.fillText(line1, W / 2, H * 0.36);
    ctx.fillStyle = opts.sub ?? "#f0efe9";
    ctx.font = "600 52px Georgia, 'Times New Roman', serif";
    ctx.fillText(line2, W / 2, H * 0.74);
  } else {
    ctx.fillStyle = opts.fg ?? "#d8b24a";
    ctx.font = "800 128px Georgia, 'Times New Roman', serif";
    ctx.fillText(line1, W / 2, H / 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 16;
  cache.set(key, t);
  return t;
}

/** A clipped hedge: dense small-leaf foliage. */
export function hedgeTexture(): Texture {
  return tex("hedge", 128, (ctx, s) => {
    const r = rand(23);
    ctx.fillStyle = "#3f7a33";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      const v = r();
      ctx.fillStyle = v > 0.5 ? "rgba(110,170,80,0.55)" : "rgba(40,88,34,0.55)";
      ctx.beginPath();
      ctx.arc(r() * s, r() * s, 1 + r() * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [3, 1]);
}
