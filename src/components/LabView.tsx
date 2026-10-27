import { useState } from "react";
import { SUBJECTS, SPECIMENS, specimensOfSubject, topicsOfSubject } from "../lab";

// Locally authored Blender pilots can show their actual review render in the
// developer catalog. A generated, lightweight PNG remains the portable fallback.
const LOCAL_PREVIEWS: Record<string, string> = {
  "head-anatomy": "/models/local/lab-head-enhanced-three-quarter.png",
  "humerus-study": "/models/local/humerus-study-v2-macro-preview.png",
  "bone-cutaway-study": "/models/local/humerus-study-v1-cutaway-preview.png",
  "osteon-study": "/models/local/humerus-study-v1-micro-preview.png",
  seasons: "/models/local/earthsky-seasons-v1-preview.png",
};

/**
 * 🔬 **Learning Lab** the hub, laid out by subject.
 *
 * Subjects with nothing in them yet are shown anyway, greyed. That is
 * deliberate: the Lab is a container for anything better understood by handling
 * it than by reading about it, and an empty shelf tells a contributor exactly
 * where their work would go. Hiding them would make the Lab look like an
 * anatomy viewer, which is the one thing it is not.
 *
 * Plain DOM, like the Buildings directory a list has no business starting a
 * WebGL context, and this is the screen a student on a slow connection reaches
 * first.
 */
export function LabView({
  onBackToMap, onOpenSpecimen, onOpenChemistry, onOpenBiology, onOpenPhysics, onOpenEarthSky,
}: {
  onBackToMap: () => void;
  onOpenSpecimen: (id: string) => void;
  onOpenChemistry?: () => void;
  onOpenBiology?: () => void;
  onOpenPhysics?: () => void;
  onOpenEarthSky?: () => void;
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const matchingSpecimens = search
    ? SPECIMENS.filter((s) => [s.name, s.english, s.topic, s.khmer].some((value) => value?.toLocaleLowerCase().includes(search)))
    : SPECIMENS.filter((s) => !s.parentOf);
  const ready = SUBJECTS.filter((s) => specimensOfSubject(s.id).length > 0);
  const planned = SUBJECTS.filter((s) => specimensOfSubject(s.id).length === 0);
  const rooms = [
    { name: "Biology & Anatomy", icon: "🫀", hint: "Study the body and take organs to the tray", open: onOpenBiology },
    { name: "Chemistry", icon: "🧪", hint: "Combine reagents and observe reactions", open: onOpenChemistry },
    { name: "Physics", icon: "⚙️", hint: "Test machines, motion and energy", open: onOpenPhysics },
    { name: "Earth & Sky", icon: "🌏", hint: "Explore planets and Earth systems", open: onOpenEarthSky },
  ].filter((room) => room.open);

  return (
    <div className="bhome lab-home">
      <div className="bhome-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🔬 Learning Lab</span>
      </div>

      <div className="bhome-scroll">
        <header className="bhome-head">
          <span className="tag">Learn by turning it around</span>
          <h1>Learning Lab</h1>
          <p>
            Anything that is easier to understand in your hands than on a page  
            an organ, a machine, a molecule, a monsoon. Turn it around, take it
            apart layer by layer, and test yourself. The lab combines code-built
            teaching models with openly licensed model pilots, with a lightweight
            Normal mode for ordinary phones.
          </p>
        </header>
        <p className="artifact-hint">VR headsets: open a room and choose Enter VR. Meta Quest Browser needs an HTTPS link, or a USB-forwarded localhost connection.</p>
        <section className="lab-room-chooser" aria-labelledby="lab-rooms-heading">
          <h2 id="lab-rooms-heading">Choose a room</h2>
          <div className="lab-room-grid">
            {rooms.map((room) => <button key={room.name} onClick={room.open} className="lab-room-card">
              <span className="lab-room-card-icon" aria-hidden="true">{room.icon}</span>
              <span><b>{room.name}</b><small>{room.hint}</small></span>
              <span aria-hidden="true">→</span>
            </button>)}
          </div>
        </section>
        <section className="lab-exhibit-search" aria-label="Find an exhibit">
          <label htmlFor="lab-exhibit-query">Or find a 3D exhibit</label>
          <input id="lab-exhibit-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or topic" />
          {search && <span role="status">{matchingSpecimens.length} {matchingSpecimens.length === 1 ? "result" : "results"}</span>}
        </section>
        {ready.filter((subject) => matchingSpecimens.some((s) => s.subject === subject.id)).map((subject) => (
          <section key={subject.id} className="bhome-site">
            <div className="lab-subject">
              <span className="lab-subject-icon" aria-hidden="true">{subject.icon}</span>
              <div>
                <b>{subject.name}</b>
                {subject.khmer && <span className="khmer"> {subject.khmer}</span>}
                <p>{subject.blurb}</p>
              </div>
            </div>

            {topicsOfSubject(subject.id).filter((topic) => matchingSpecimens.some((s) => s.subject === subject.id && s.topic === topic)).map((topic) => (
              <div key={topic}>
                <h2 className="bhome-sub">{topic}</h2>
                <ul className="bhome-list lab-exhibits">
                  {matchingSpecimens
                    .filter((s) => s.subject === subject.id)
                    .filter((s) => s.topic === topic)
                    .map((s) => (
                      <li key={s.id}>
                        <button onClick={() => onOpenSpecimen(s.id)}>
                          <span className="lab-preview">
                            <img src={import.meta.env.DEV && LOCAL_PREVIEWS[s.id] || `/lab/previews/${s.id}.png`}
                              onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `/lab/previews/${s.id}.png`; }}
                              alt="" width={360} height={240} loading="lazy" decoding="async" />
                            <span className="lab-preview-action">Explore in 3D ↗</span>
                          </span>
                          <span className="lab-card-copy">
                          <b>{s.name}</b> {s.khmer && <span className="khmer">{s.khmer}</span>}
                          <span className="bhome-line">{s.english}</span>
                          <span className="lab-count">
                            {s.parts.length} parts · {s.quiz.length} questions
                          </span>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        {search && matchingSpecimens.length === 0 && <p className="lab-search-empty">No exhibit matches yet. Try an organ, machine, molecule or topic.</p>}
        {!search && planned.map((s) => (
          <section key={s.id} className="bhome-site">
            <div className="lab-subject">
              <span className="lab-subject-icon" aria-hidden="true">{s.icon}</span>
              <div>
                <b>{s.name}</b>
                {s.khmer && <span className="khmer"> {s.khmer}</span>}
                <p>{s.blurb}</p>
              </div>
            </div>
            {s.id !== "chemistry" && s.id !== "biology" && s.id !== "physics" && s.id !== "earth" && (
              <p className="lab-invite">
                Nothing here yet. An exhibit is a data entry and one model
                function <code>docs/LAB.md</code> walks through both.
              </p>
            )}
          </section>
        ))}

        <section className="bhome-site lab-honesty">
          <h2 className="bhome-sub">What these models are</h2>
          <p>
            <b>Schematic teaching models.</b> Structure, proportion and behaviour
            follow the standard account of the thing, but nothing here is a
            measurement, a scan or survey data, and none of it is accurate enough
            for anything professional.
          </p>
          <p>
            Where a Khmer term has not been checked by a Khmer-speaking reviewer,
            the interface says so rather than showing a guess. A wrong technical
            term in a teaching tool is worse than a missing one those gaps are
            a contribution waiting to happen, listed in <code>docs/LAB.md</code>.
          </p>
          <p className="lab-tally">
            {SPECIMENS.length} exhibits · {ready.length} of {SUBJECTS.length} subjects open
          </p>
        </section>
      </div>
    </div>
  );
}
