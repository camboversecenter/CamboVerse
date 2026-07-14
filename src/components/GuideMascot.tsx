/**
 * Kiri — the monkey tour guide. Original CC-BY artwork (so it's DPG-clean),
 * drawn as an inline SVG and animated purely with CSS, so it's tiny and smooth
 * on a cheap phone. He wears a Cambodian *krama* scarf. Three states:
 *   - "idle"     gentle bob + occasional blink
 *   - "talking"  mouth chatters (synced to the guide speaking)
 *   - "pointing" one arm raises, for "look over there"
 */
export type MascotState = "idle" | "talking" | "pointing";

export function GuideMascot({
  state = "idle",
  size = 96,
  title = "Kiri, your guide",
}: {
  state?: MascotState;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      className={`mascot mascot-${state}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <pattern id="krama" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#c0392b" />
          <rect width="4" height="4" fill="#ffffff" opacity="0.85" />
          <rect x="4" y="4" width="4" height="4" fill="#ffffff" opacity="0.85" />
        </pattern>
      </defs>

      {/* Tail */}
      <path
        d="M84 96 q26 6 22 -20 q-3 -16 -16 -12"
        fill="none"
        stroke="#7a5a3c"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Body */}
      <ellipse cx="60" cy="92" rx="26" ry="22" fill="#8a6a4a" />
      <ellipse cx="60" cy="96" rx="16" ry="14" fill="#e8d3ad" />

      {/* Krama scarf around the neck */}
      <path d="M40 74 q20 12 40 0 l-3 9 q-17 9 -34 0 z" fill="url(#krama)" />

      {/* Pointing arm (raised when pointing, resting otherwise) */}
      <g className="mascot-arm">
        <path
          d="M83 84 q16 -4 20 -20"
          fill="none"
          stroke="#8a6a4a"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="104" cy="62" r="5.5" fill="#e8d3ad" />
      </g>
      {/* Resting arm */}
      <path
        d="M37 84 q-12 6 -12 18"
        fill="none"
        stroke="#8a6a4a"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Head group (bobs) */}
      <g className="mascot-head">
        {/* Ears */}
        <circle className="mascot-ear" cx="26" cy="44" r="12" fill="#8a6a4a" />
        <circle cx="26" cy="44" r="6" fill="#d9a679" />
        <circle className="mascot-ear" cx="94" cy="44" r="12" fill="#8a6a4a" />
        <circle cx="94" cy="44" r="6" fill="#d9a679" />

        {/* Head + face */}
        <circle cx="60" cy="46" r="30" fill="#8a6a4a" />
        <path d="M38 52 q22 26 44 0 q-4 -22 -22 -22 q-18 0 -22 22 z" fill="#e8d3ad" />

        {/* Eyes (blink via scaleY) */}
        <g className="mascot-eyes">
          <circle cx="50" cy="42" r="6.5" fill="#ffffff" />
          <circle cx="70" cy="42" r="6.5" fill="#ffffff" />
          <circle cx="51" cy="43" r="3.4" fill="#2e2016" />
          <circle cx="71" cy="43" r="3.4" fill="#2e2016" />
          <circle cx="52.4" cy="41.6" r="1.1" fill="#ffffff" />
          <circle cx="72.4" cy="41.6" r="1.1" fill="#ffffff" />
        </g>

        {/* Brows */}
        <path d="M44 33 q6 -4 12 -1" stroke="#5f452c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M64 32 q6 -3 12 1" stroke="#5f452c" strokeWidth="2.4" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="60" cy="54" rx="3.4" ry="2.3" fill="#7a5a3c" />

        {/* Mouth — chatters when talking */}
        <ellipse className="mascot-mouth" cx="60" cy="62" rx="7" ry="3" fill="#7a3b2e" />
      </g>
    </svg>
  );
}
