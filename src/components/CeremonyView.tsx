import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import {
  DEFAULT_EMBED_POLICY,
  type CeremonyTemplate, type EmbedPolicy, type MediaRef,
  type PropKind, type SceneTheme, type TimeOfDay,
} from "../ceremony";
import { Pavilion, Staging, PROP_NAME, stagingRadius } from "./CeremonyProps";
import { Scene, SceneLight, GroundDisc, THEME_INFO, TIME_LABEL } from "./CeremonyScene";
import type { Detail } from "./LabOrgans";

/**
 * One ceremony, staged.
 *
 * The screen is built around the thing that makes a Khmer ceremony a ceremony
 * and not a party: it is a **sequence**. Each moment has a name, a meaning, and
 * a set of things laid out on the ground, and stepping from one to the next
 * re-dresses the yard. That progression is the lesson — which is why the moment
 * stepper is the primary control and everything else is secondary.
 *
 * Three view modes, as everywhere in CamboVerse:
 *   - **Normal** — the ~$150-Android baseline: fewer segments, no shadows,
 *     thinner scatter.
 *   - **Ultra** — full detail for a capable device.
 *   - **VR** — WebXR, standing in the yard, and always the Ultra scene.
 *
 * The content survives all three: someone who never rotates the scene, never
 * enters VR and never changes the venue still gets the sequence, the names and
 * the meanings. Degrade the detail, never the content.
 */

function detectViewMode(): Detail {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

/**
 * Re-aim the camera when the framing changes.
 *
 * r3f reads the `camera` prop once, at canvas creation. Switching from a yard to
 * the inside of a vihear changes what needs to be in shot, and without this the
 * camera would keep whatever the first venue asked for — the same trap the Lab
 * hit teleporting from a whole body to a 15 cm organ.
 */
function FrameCamera({ dist, eye }: { dist: number; eye: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(dist * 0.42, eye, dist * 0.9);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    // Deliberately not re-run when the sheet opens or closes. Lifting the scene
    // clear of the sheet is the orbit *target*'s job; moving the camera as well
    // would yank the view out from under whoever is reading.
  }, [camera, dist, eye]);
  return null;
}

/** VR always presents the Ultra scene. */
function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const inXR = useXR((s) => s.session != null);
  useEffect(() => { if (inXR) onEnter(); }, [inXR, onEnter]);
  return null;
}

export function CeremonyView({
  template, onBack,
}: {
  template: CeremonyTemplate;
  onBack: () => void;
}) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [detail, setDetail] = useState<Detail>(detectViewMode);
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<SceneTheme>(template.venues[0]);
  const [season] = useState<"dry" | "wet">("dry");
  const [venueOpen, setVenueOpen] = useState(false);
  const [info, setInfo] = useState(true);
  const [focus, setFocus] = useState<PropKind | null>(null);
  const [embedPolicy] = useState<EmbedPolicy>(DEFAULT_EMBED_POLICY);

  // Reset to the first moment when the ceremony changes, otherwise opening a
  // three-moment ceremony after a seven-moment one lands on nothing.
  useEffect(() => {
    setStep(0);
    setTheme(template.venues[0]);
    setFocus(null);
  }, [template.id, template.venues]);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const moment = template.moments[Math.min(step, template.moments.length - 1)];
  const staging = moment?.staging ?? [];

  // A moment's own time of day wins over the venue's: Pchum Ben's first moment
  // is before dawn and its second is in the morning, and rendering both at the
  // same hour throws away the point of the sequence.
  const time: TimeOfDay = moment?.timeOfDay ?? "morning";

  const indoors = theme === "hall" || theme === "temple-interior";
  /**
   * A marquee is put up **at a house**, and nowhere else.
   *
   * The first version raised one over anything that was not indoors, which stood
   * a pink wedding marquee over Pchum Ben on pagoda ground — a setting that has
   * a sala and trees and needs no marquee at all. Getting this wrong is worse
   * than leaving the yard bare: it says the wrong thing about the ceremony.
   */
  const pavilion = (theme === "home-yard" || theme === "garden")
    && !staging.some((p) => p.kind === "pavilion");

  /**
   * The shot: a guest standing at the edge of the mat.
   *
   * **Eye height is under the marquee's eave, and that is not a style choice.**
   * The canopy is opaque, so a camera looking down from above it frames a nice
   * pink roof and none of the ceremony — which is everything the screen exists
   * to show. Standing height puts you under the eave, looking in.
   */
  const { dist, eye, visibleH } = useMemo(() => {
    // Frame off the *horizontal* field of view. On a portrait phone it is barely
    // 29° against the 50° vertical, so sizing off height alone hangs the staging
    // off the sides of the screen — the same trap the Lab hit.
    const aspect = Math.min(2.2, Math.max(0.45, window.innerWidth / window.innerHeight));
    const halfV = Math.tan((50 * Math.PI) / 360);
    const halfH = Math.atan(halfV * aspect);
    // What has to be in shot is the **staging**, not the marquee. Framing wide
    // enough to hold an 8 m canopy put seven candles four pixels tall at the
    // bottom of the screen; being under the marquee with it cropped by the top
    // of the frame is both closer to how it looks from a mat and the only way
    // the small things stay legible.
    // A floor under the close-ups: three trays alone frame so tightly that the
    // pagoda behind them leaves the shot, and then "brought to the pagoda"
    // is a caption with nothing to point at.
    const reach = Math.max(stagingRadius(staging), 1.9);
    const d = Math.min(indoors ? 15 : 18, Math.max(5, (reach * 1.15) / Math.tan(halfH)));
    return {
      dist: d,
      // Crouched by the mat for a close moment, standing for a wide one — and
      // never above the marquee's 2.75 m eave, or the canopy hides everything.
      eye: Math.min(2.45, Math.max(1.15, d * 0.2)),
      visibleH: 2 * d * halfV,
    };
  }, [staging, indoors]);

  // The orbit target lands at the centre of the viewport, so aiming *low* lifts
  // the staging into the clear band above an open sheet. Aiming high pushes it
  // down behind it — the same mistake the building pages made, in the same
  // direction, which is why it is spelled out here too. The lift is a fraction
  // of the *frame* rather than of the objects, so a moment staged with candles
  // is not shifted by the same amount as one staged with a marquee.
  const aim = info ? Math.max(0.12, 0.9 - visibleH * 0.12) : 1.0;

  const media: MediaRef[] = [];

  return (
    <div className="lab cer">
      <Canvas
        dpr={detail === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [dist * 0.42, eye, dist * 0.9], fov: 50, near: 0.25, far: 320 }}
        gl={{ antialias: detail === "ultra", powerPreference: "high-performance" }}
        shadows={detail === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <XR store={store}>
          <SceneLight time={time} detail={detail} />
          <FrameCamera dist={dist} eye={eye} />
          <Scene theme={theme} detail={detail} season={season} />
          <GroundDisc time={time} />
          {pavilion && <Pavilion detail={detail} />}
          <Staging staging={staging} detail={detail} highlight={focus} />

          {/* Standing height, at the edge of the mat rather than in the middle
              of it: in VR you are a guest at this, not the couple. */}
          <XROrigin position={[0, 0, 5.5]} />
          <VrImpliesUltra onEnter={() => setDetail("ultra")} />
          <OrbitControls
            enablePan={false}
            minDistance={4}
            maxDistance={indoors ? 26 : 46}
            maxPolarAngle={Math.PI * 0.495}
            enableDamping
            dampingFactor={0.08}
            target={[0, aim, 0]}
          />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>← Ceremonies</button>
        <span className="cls-title">🎊 {template.name.en}</span>
        <button
          className="grove-quality"
          onClick={() => setDetail((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full 3D scene"
        >
          {detail === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setDetail("ultra"); store.enterVR(); }}>
            🥽 VR
          </button>
        )}
      </div>

      {/* The venue picker. Deliberately prominent, and deliberately not a list of
          buildings: the whole point is that this ceremony has a setting rather
          than an address. */}
      <div className="cer-venue">
        <button className="cer-venue-btn" onClick={() => setVenueOpen((v) => !v)}>
          {THEME_INFO[theme].icon} {THEME_INFO[theme].label}
          <span className="cer-venue-time">{TIME_LABEL[time]}</span>
        </button>
        {venueOpen && (
          <div className="cer-venue-menu">
            <p className="cer-venue-hint">
              Where it is held. Most Khmer ceremonies are not in a building at
              all, so these are settings rather than addresses.
            </p>
            {template.venues.map((v) => (
              <button
                key={v}
                className={v === theme ? "cer-venue-opt on" : "cer-venue-opt"}
                onClick={() => { setTheme(v); setVenueOpen(false); }}
              >
                <b>{THEME_INFO[v].icon} {THEME_INFO[v].label}</b>
                <span>{THEME_INFO[v].note}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!info && (
        <button className="bld-show" onClick={() => setInfo(true)}>
          ℹ️ Show the ceremony
        </button>
      )}

      <div className={`cer-panel${info ? "" : " bld-panel--hidden"}`} aria-hidden={!info}>
        <div className="cer-steps" role="tablist" aria-label="Moments">
          {template.moments.map((m, i) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={i === step}
              className={i === step ? "cer-step on" : i < step ? "cer-step done" : "cer-step"}
              onClick={() => { setStep(i); setFocus(null); }}
              title={m.name.en}
            >
              {i + 1}
            </button>
          ))}
          <button className="bld-hide" onClick={() => setInfo(false)} aria-label="Hide the notes">
            ✕
          </button>
        </div>

        {moment && (
          <>
            <div className="cer-head">
              <b>{moment.name.en}</b>
              {moment.name.km
                ? <span className="khmer">{moment.name.km}</span>
                : <span className="lab-needkm" title="No Khmer name has been verified yet">
                    Khmer name needed
                  </span>}
              {moment.optional && <span className="cer-optional">varies by family</span>}
            </div>

            <div className="bld-sub">
              Moment {step + 1} of {template.moments.length}
              {template.days > 1 && moment.day ? ` · day ${moment.day}` : ""}
              {moment.timeOfDay ? ` · ${TIME_LABEL[moment.timeOfDay].toLowerCase()}` : ""}
            </div>

            <p className="bld-about">{moment.meaning.en}</p>

            {staging.length > 0 && (
              <div className="cer-props">
                <span className="cer-props-label">Set out for this:</span>
                {staging.map((p) => (
                  <button
                    key={p.kind}
                    className={focus === p.kind ? "lab-chip on" : "lab-chip"}
                    onClick={() => setFocus((f) => (f === p.kind ? null : p.kind))}
                  >
                    {PROP_NAME[p.kind]}
                    {p.count && p.count > 1 ? ` ×${p.count}` : ""}
                  </button>
                ))}
              </div>
            )}

            <MediaStrip media={media} policy={embedPolicy} />

            <div className="cer-nav">
              <button
                className="cer-prev"
                disabled={step === 0}
                onClick={() => { setStep((s) => Math.max(0, s - 1)); setFocus(null); }}
              >
                ← Before
              </button>
              <button
                className="cer-next"
                disabled={step >= template.moments.length - 1}
                onClick={() => { setStep((s) => Math.min(template.moments.length - 1, s + 1)); setFocus(null); }}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === 0 && template.about.map((p) => (
          <p key={p.en.slice(0, 24)} className="cer-about">{p.en}</p>
        ))}

        {template.whenDescribed && (
          <p className="cer-when">🗓 {template.whenDescribed.en}</p>
        )}

        {template.needsReview && (
          <p className="cer-review">
            <b>Awaiting cultural review.</b> This sequence is the commonly
            described one, not an authored account. Names, order and meanings are
            all still open to correction by someone who can speak for the
            tradition.
          </p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- media --- */

/**
 * A family's own photographs and video, when there are any.
 *
 * Templates carry none — they are the sequence, not anybody's event — so this
 * renders an explanation instead of an empty rail. The interesting case is the
 * third kind of media, and it is the reason this component exists at all:
 *
 * **An embed means the viewer's device contacts that company.** Families already
 * keep their wedding videos on YouTube and their albums on Facebook, and telling
 * them to re-upload is unrealistic, so embeds are supported — but they load a
 * locally stored poster frame and go no further until someone taps. Nothing
 * reaches a third party because a page was opened.
 */
function MediaStrip({ media, policy }: { media: MediaRef[]; policy: EmbedPolicy }) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  if (media.length === 0) {
    return (
      <p className="cer-media-empty">
        📷 A family&rsquo;s own photographs go here, against the moment they
        belong to. Video kept on another service shows as a still until you tap
        it, so opening this page never contacts anyone.
      </p>
    );
  }

  return (
    <div className="cer-media">
      {media.map((m, i) => {
        if (m.kind === "local" || m.kind === "url") {
          return (
            <figure key={i} className="cer-shot">
              <div className="cer-shot-img" />
              {m.caption && <figcaption>{m.caption.en}</figcaption>}
            </figure>
          );
        }
        const key = `${m.provider}:${m.ref}`;
        const open = policy === "auto" || loaded.has(key);
        return (
          <figure key={i} className="cer-shot cer-embed">
            <div className="cer-shot-img" />
            {policy === "never" ? (
              <figcaption>Video on {m.provider} — not loaded here</figcaption>
            ) : open ? (
              <figcaption>Playing from {m.provider}</figcaption>
            ) : (
              <button
                className="cer-embed-play"
                onClick={() => setLoaded((s) => new Set(s).add(key))}
              >
                ▶ Play from {m.provider}
                <span>This contacts {m.provider}</span>
              </button>
            )}
          </figure>
        );
      })}
    </div>
  );
}
