import { useEffect, useState } from "react";
import { myCredentials, type Credential } from "../lib/identity";
import { SPOTS } from "../spots";
import { ERAS } from "../history";
import { KHMER_GROUPS } from "../khmer";

/**
 * The Heritage Passport — a visitor's collection of the learning credentials
 * they've earned across Cambodia's sites and ages. It reads the Credential rail
 * (no account needed to look; a passive visitor simply has an empty passport)
 * and turns each `history:<site>:<era>` credential into a "stamp".
 *
 * This closes the learn-to-earn loop: earn a credential in "Back in Time",
 * then see it collected here — non-monetary, and portable across the ecosystem.
 */
interface Stamp {
  key: string;
  title: string;
  khmer?: string;
  where: string;
  when: string;
  mood: string;
}

function toStamp(c: Credential): Stamp {
  const parts = c.achievement.split(":");
  const when = c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : "";
  if (parts[0] === "history") {
    const spot = SPOTS.find((s) => s.id === parts[1]);
    const era = ERAS.find((e) => e.id === parts[2]);
    if (era) {
      return {
        key: c.id,
        title: era.name,
        khmer: era.khmer,
        where: spot ? `at ${spot.name}` : "",
        when,
        mood: era.mood,
      };
    }
  }
  if (parts[0] === "alphabet") {
    const g = KHMER_GROUPS.find((x) => x.id === parts[1]);
    return {
      key: c.id,
      title: g ? `${g.title} quiz` : "Alphabet quiz",
      khmer: g?.khmer,
      where: "Khmer alphabet",
      when,
      mood: "#4c8a3f",
    };
  }
  // Any other achievement (e.g. an ecosystem app's) renders generically.
  return { key: c.id, title: c.achievement, where: "", when, mood: "#c8912e" };
}

export function Passport({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [creds, setCreds] = useState<Credential[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      const list = await myCredentials();
      if (live) {
        setCreds(list);
        setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const stamps = creds.map(toStamp);
  // Progress: how many of the ages this visitor has learned somewhere.
  const erasLearned = new Set(
    creds.map((c) => c.achievement.split(":")).filter((p) => p[0] === "history").map((p) => p[2]),
  );

  return (
    <div className="passport">
      <div className="pp-top">
        <span className="pp-title">🛂 Heritage Passport</span>
        <button className="pp-close" onClick={onClose} aria-label="Close passport">
          ✕
        </button>
      </div>

      <div className="pp-panel">
        {loading ? (
          <p className="pp-empty">Opening your passport…</p>
        ) : stamps.length === 0 ? (
          <div className="pp-empty">
            <p className="pp-empty-big">Your passport is waiting for its first stamp.</p>
            <p>
              Enter a site, open <b>⏳ Back in Time</b>, and pass an era's short quiz to earn a
              learning credential. Each one is stamped here — free, and yours to keep.
            </p>
          </div>
        ) : (
          <>
            <div className="pp-summary">
              <b>{stamps.length}</b> {stamps.length === 1 ? "stamp" : "stamps"} · {erasLearned.size} of{" "}
              {ERAS.length} ages learned
            </div>
            <div className="pp-progress" aria-hidden="true">
              {ERAS.map((e) => (
                <span
                  key={e.id}
                  className={erasLearned.has(e.id) ? "pp-dot on" : "pp-dot"}
                  style={erasLearned.has(e.id) ? { background: e.mood, borderColor: e.mood } : undefined}
                  title={e.name}
                />
              ))}
            </div>
            <ul className="pp-stamps">
              {stamps.map((s) => (
                <li key={s.key} className="pp-stamp" style={{ borderColor: s.mood }}>
                  <span className="pp-seal" style={{ borderColor: s.mood, color: s.mood }}>
                    ✦
                  </span>
                  <span className="pp-body">
                    <span className="pp-stamp-title">
                      {s.title} {s.khmer && <span className="khmer">{s.khmer}</span>}
                    </span>
                    <span className="pp-stamp-sub">
                      {s.where}
                      {s.where && s.when ? " · " : ""}
                      {s.when}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="pp-foot">
          Learning credentials are non‑monetary and portable — they travel with your CamboVerse
          identity across the ecosystem.
        </p>
      </div>
    </div>
  );
}
