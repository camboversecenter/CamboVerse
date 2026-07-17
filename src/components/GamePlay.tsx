import { useEffect, useRef, useState } from "react";
import { gameCredential, type KhmerGame } from "../games";
import { claimCredential } from "../lib/identity";

/**
 * The playable layer for a Khmer traditional game — a focused minigame overlay
 * on top of the 3D festival scene. Win it and a "game:<id>" learning credential
 * is claimed on the Credential rail and stamped in the Heritage Passport, the
 * same learn-to-earn loop as the rest of CamboVerse.
 */
export function GamePlay({
  game,
  onClose,
  onWon,
}: {
  game: KhmerGame;
  onClose: () => void;
  onWon: () => void;
}) {
  const [won, setWon] = useState<boolean | null>(null); // null=playing
  const [claiming, setClaiming] = useState(false);
  const [earned, setEarned] = useState(false);

  async function finish(win: boolean) {
    setWon(win);
    if (win) {
      setClaiming(true);
      const ok = await claimCredential(gameCredential(game.id), `game:${game.id}:win`);
      setClaiming(false);
      if (ok) {
        setEarned(true);
        onWon();
      }
    }
  }

  return (
    <div className="gp">
      <div className="gp-card" style={{ borderColor: game.color }}>
        <div className="gp-top">
          <span className="gp-title">
            <span className="khmer">{game.khmer}</span> · {game.english}
          </span>
          <button className="gp-x" onClick={onClose} aria-label="Close game">
            ✕
          </button>
        </div>

        {won === null ? (
          game.play === "aim" ? (
            <AimGame color={game.color} onDone={finish} />
          ) : game.play === "race" ? (
            <RaceGame color={game.color} onDone={finish} />
          ) : game.play === "catch" ? (
            <CatchGame color={game.color} onDone={finish} />
          ) : (
            <TugGame color={game.color} onDone={finish} />
          )
        ) : (
          <div className="gp-result">
            <div className={won ? "gp-score win" : "gp-score"}>{won ? "🎉 You won!" : "So close!"}</div>
            <p className="gp-sub">
              {won
                ? claiming
                  ? "Saving your credential…"
                  : earned
                    ? "A game credential was added to your Heritage Passport."
                    : "Well played!"
                : "Give it another go — you'll get it."}
            </p>
            <div className="gp-actions">
              <button className="gp-again" style={{ background: game.color }} onClick={() => setWon(null)}>
                Play again
              </button>
              <button className="gp-back" onClick={onClose}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Hit the Pot (វាយក្អម) — timing ---------- */
const AIM_SWINGS = 5;
const AIM_ZONE = 15; // half-width of the hittable zone, in %
const AIM_HITS_TO_WIN = 3;

function AimGame({ color, onDone }: { color: string; onDone: (win: boolean) => void }) {
  const [pos, setPos] = useState(50);
  const [swings, setSwings] = useState(0);
  const [hits, setHits] = useState(0);
  const [flash, setFlash] = useState<"" | "hit" | "miss">("");
  const dir = useRef(1);
  const speed = useRef(1.1);
  const target = useRef(50);
  const paused = useRef(false);
  const raf = useRef<number | undefined>(undefined);

  // The pot swings; the marker (your aim) sweeps back and forth over the track.
  useEffect(() => {
    let last = 0;
    const tick = (t: number) => {
      raf.current = requestAnimationFrame(tick);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;
      if (paused.current) return;
      setPos((p) => {
        let n = p + dir.current * speed.current * (dt / 16);
        if (n >= 100) { n = 100; dir.current = -1; }
        if (n <= 0) { n = 0; dir.current = 1; }
        return n;
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const swing = () => {
    if (paused.current) return;
    paused.current = true;
    const hit = Math.abs(pos - target.current) <= AIM_ZONE;
    const nHits = hits + (hit ? 1 : 0);
    const nSwings = swings + 1;
    setFlash(hit ? "hit" : "miss");
    setHits(nHits);
    setSwings(nSwings);
    window.setTimeout(() => {
      setFlash("");
      if (nSwings >= AIM_SWINGS) {
        onDone(nHits >= AIM_HITS_TO_WIN);
        return;
      }
      // Re-hang the pot at a new spot and vary the sweep — the "spin".
      target.current = 22 + Math.random() * 56;
      speed.current = 1.0 + Math.random() * 0.9;
      dir.current = Math.random() < 0.5 ? 1 : -1;
      paused.current = false;
    }, 700);
  };

  return (
    <div className="gp-play">
      <p className="gp-instr">Swing when your aim (▲) lines up with the pot. {AIM_HITS_TO_WIN} of {AIM_SWINGS} to smash it.</p>
      <div className="gp-track">
        {/* pot zone */}
        <span
          className="gp-zone"
          style={{ left: `${target.current - AIM_ZONE}%`, width: `${AIM_ZONE * 2}%`, background: color }}
        />
        <span className="gp-pot" style={{ left: `${target.current}%` }}>🏺</span>
        {/* aim marker */}
        <span className="gp-marker" style={{ left: `${pos}%` }}>▲</span>
      </div>
      <div className={`gp-flash ${flash}`}>{flash === "hit" ? "SMACK!" : flash === "miss" ? "swish…" : ""}</div>
      <div className="gp-meta">
        <span>Swing {Math.min(swings + 1, AIM_SWINGS)} / {AIM_SWINGS}</span>
        <span>Hits {hits}</span>
      </div>
      <button className="gp-do" style={{ background: color }} onClick={swing} disabled={flash !== ""}>
        Swing! 🥢
      </button>
    </div>
  );
}

/* ---------- Sack Race (លោតបាវ) — rhythm ---------- */
const RACE_GOAL = 100;
function RaceGame({ color, onDone }: { color: string; onDone: (win: boolean) => void }) {
  const [you, setYou] = useState(0);
  const [rival, setRival] = useState(0);
  const [foot, setFoot] = useState<"L" | "R">("L");
  const [stumble, setStumble] = useState(false);
  const done = useRef(false);
  const youRef = useRef(0);
  const rivalRef = useRef(0);

  // The rival hops along at a steady clip; beat it to the line.
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (done.current) return;
      const n = rivalRef.current + 1.7 + Math.random() * 1.2;
      rivalRef.current = Math.min(RACE_GOAL, n);
      setRival(rivalRef.current);
      if (n >= RACE_GOAL) {
        done.current = true;
        if (youRef.current < RACE_GOAL) onDone(false);
      }
    }, 120);
    return () => window.clearInterval(iv);
  }, [onDone]);

  const hop = (f: "L" | "R") => {
    if (done.current || stumble) return;
    if (f !== foot) {
      // wrong foot — a stumble costs you a moment
      setStumble(true);
      window.setTimeout(() => setStumble(false), 320);
      return;
    }
    setFoot(f === "L" ? "R" : "L");
    const n = Math.min(RACE_GOAL, youRef.current + 5.5);
    youRef.current = n;
    setYou(n);
    if (n >= RACE_GOAL) {
      done.current = true;
      onDone(true);
    }
  };

  return (
    <div className="gp-play">
      <p className="gp-instr">Alternate the feet — <b>Left, Right, Left, Right</b> — to hop. Beat the rival to the line!</p>
      <div className="gp-race">
        <div className="gp-lane">
          <span className="gp-lane-name" style={{ color }}>You</span>
          <span className="gp-lane-bar"><span className="gp-lane-fill" style={{ width: `${you}%`, background: color }} /></span>
          <span className="gp-hopper" style={{ left: `calc(${you}% - 10px)` }}>{stumble ? "💫" : "🧍"}</span>
        </div>
        <div className="gp-lane">
          <span className="gp-lane-name rival">Rival</span>
          <span className="gp-lane-bar"><span className="gp-lane-fill rival" style={{ width: `${rival}%` }} /></span>
          <span className="gp-hopper" style={{ left: `calc(${rival}% - 10px)` }}>🏃</span>
        </div>
      </div>
      <div className="gp-feet">
        <button
          className={`gp-foot ${foot === "L" ? "next" : ""}`}
          onClick={() => hop("L")}
          style={foot === "L" ? { borderColor: color } : undefined}
        >
          🦵 Left
        </button>
        <button
          className={`gp-foot ${foot === "R" ? "next" : ""}`}
          onClick={() => hop("R")}
          style={foot === "R" ? { borderColor: color } : undefined}
        >
          Right 🦵
        </button>
      </div>
    </div>
  );
}

/* ---------- Tug of War (ទាញព្រ័ត្រ) — mash ---------- */
function TugGame({ color, onDone }: { color: string; onDone: (win: boolean) => void }) {
  const [marker, setMarker] = useState(50); // 100 = you win, 0 = you lose
  const done = useRef(false);
  const markerRef = useRef(50);

  // The other team pulls back steadily; only sustained pulling wins.
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (done.current) return;
      const n = markerRef.current - (1.6 + Math.random() * 1.1);
      markerRef.current = Math.max(0, n);
      setMarker(markerRef.current);
      if (n <= 0) {
        done.current = true;
        onDone(false);
      }
    }, 110);
    return () => window.clearInterval(iv);
  }, [onDone]);

  const pull = () => {
    if (done.current) return;
    const n = Math.min(100, markerRef.current + 6.5);
    markerRef.current = n;
    setMarker(n);
    if (n >= 100) {
      done.current = true;
      onDone(true);
    }
  };

  return (
    <div className="gp-play">
      <p className="gp-instr">Tap <b>Pull!</b> as fast as you can — drag the knot (🔴) past your line.</p>
      <div className="gp-tug">
        <span className="gp-tug-side left">Them</span>
        <div className="gp-tug-track">
          <span className="gp-tug-mid" />
          <span className="gp-tug-rope" style={{ background: color }} />
          <span className="gp-knot" style={{ left: `${marker}%` }}>🔴</span>
        </div>
        <span className="gp-tug-side right" style={{ color }}>You</span>
      </div>
      <button className="gp-do gp-mash" style={{ background: color }} onClick={pull}>
        Pull! 💪
      </button>
    </div>
  );
}

/* ---------- Scarf Tossing (ចោលឈូង) — catch ---------- */
const CATCH_ROUNDS = 3;
const CATCH_ZONE = 18; // Size of the valid catch zone (%)

function CatchGame({ color, onDone }: { color: string; onDone: (win: boolean) => void }) {
  const [pos, setPos] = useState(0); // 0 = thrown from far away, 100 = reaches you
  const [catches, setCatches] = useState(0);
  const [flash, setFlash] = useState<"" | "catch" | "miss" | "drop">("");
  const paused = useRef(false);
  const raf = useRef<number | undefined>(undefined);
  const speed = useRef(1.2);

  // The chhoung flies towards you (0 to 100).
  useEffect(() => {
    let last = 0;
    const tick = (t: number) => {
      raf.current = requestAnimationFrame(tick);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;
      if (paused.current) return;
      
      setPos((p) => {
        const n = p + speed.current * (dt / 16);
        if (n >= 100) {
          // You didn't tap in time, it dropped!
          paused.current = true;
          setFlash("drop");
          window.setTimeout(() => onDone(false), 1000);
          return 100;
        }
        return n;
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [onDone]);

  const attemptCatch = () => {
    if (paused.current) return;
    paused.current = true;
    // Catch zone is between 75 and 95
    const isCatch = pos >= 85 - CATCH_ZONE && pos <= 85 + CATCH_ZONE;
    
    if (isCatch) {
      setFlash("catch");
      const nCatches = catches + 1;
      setCatches(nCatches);
      window.setTimeout(() => {
        setFlash("");
        if (nCatches >= CATCH_ROUNDS) {
          onDone(true);
        } else {
          // Next round, reset and make it slightly faster
          setPos(0);
          speed.current += 0.3;
          paused.current = false;
        }
      }, 700);
    } else {
      setFlash("miss");
      window.setTimeout(() => onDone(false), 1000);
    }
  };

  return (
    <div className="gp-play">
      <p className="gp-instr">The chhoung is flying towards you! Tap <b>Catch!</b> when it enters the target zone. Catch {CATCH_ROUNDS} to win.</p>
      
      <div className="gp-track" style={{ height: "40px", position: "relative", background: "#e8e2d2", borderRadius: "20px", margin: "10px 0" }}>
        {/* The safe catching zone */}
        <span
          style={{ position: "absolute", left: `${85 - CATCH_ZONE}%`, width: `${CATCH_ZONE * 2}%`, height: "100%", background: color, opacity: 0.3, borderRadius: "20px" }}
        />
        {/* The flying chhoung */}
        <span style={{ position: "absolute", left: `calc(${pos}% - 12px)`, top: "8px", fontSize: "20px", transition: "none" }}>☄️</span>
      </div>
      
      <div className={`gp-flash ${flash}`}>{flash === "catch" ? "CAUGHT IT!" : flash === "miss" ? "Too early!" : flash === "drop" ? "Dropped!" : ""}</div>
      <div className="gp-meta">
        <span>Catches: {catches} / {CATCH_ROUNDS}</span>
      </div>
      <button className="gp-do" style={{ background: color, padding: "12px 24px", fontSize: "18px", borderRadius: "30px", color: "white", border: "none", fontWeight: "bold", width: "100%" }} onClick={attemptCatch} disabled={flash !== ""}>
        Catch! 🤲
      </button>
    </div>
  );
}
