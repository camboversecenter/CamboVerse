import { SUBJECTS, SPECIMENS, specimensOfSubject, topicsOfSubject } from "../lab";

/**
 * 🔬 **Learning Lab** — the hub, laid out by subject.
 *
 * Subjects with nothing in them yet are shown anyway, greyed. That is
 * deliberate: the Lab is a container for anything better understood by handling
 * it than by reading about it, and an empty shelf tells a contributor exactly
 * where their work would go. Hiding them would make the Lab look like an
 * anatomy viewer, which is the one thing it is not.
 *
 * Plain DOM, like the Buildings directory — a list has no business starting a
 * WebGL context, and this is the screen a student on a slow connection reaches
 * first.
 */
export function LabView({
  onBackToMap, onOpenSpecimen,
}: {
  onBackToMap: () => void;
  onOpenSpecimen: (id: string) => void;
}) {
  const ready = SUBJECTS.filter((s) => specimensOfSubject(s.id).length > 0);
  const planned = SUBJECTS.filter((s) => specimensOfSubject(s.id).length === 0);

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
            Anything that is easier to understand in your hands than on a page —
            an organ, a machine, a molecule, a monsoon. Turn it around, take it
            apart layer by layer, and test yourself. Every model is built in code
            rather than downloaded, so it opens on an ordinary phone and anyone
            is free to reuse it.
          </p>
        </header>

        {ready.map((subject) => (
          <section key={subject.id} className="bhome-site">
            <div className="lab-subject">
              <span className="lab-subject-icon" aria-hidden="true">{subject.icon}</span>
              <div>
                <b>{subject.name}</b>
                {subject.khmer && <span className="khmer"> {subject.khmer}</span>}
                <p>{subject.blurb}</p>
              </div>
            </div>

            {topicsOfSubject(subject.id).map((topic) => (
              <div key={topic}>
                <h2 className="bhome-sub">{topic}</h2>
                <ul className="bhome-list">
                  {specimensOfSubject(subject.id)
                    .filter((s) => s.topic === topic)
                    .map((s) => (
                      <li key={s.id}>
                        <button onClick={() => onOpenSpecimen(s.id)}>
                          <b>{s.name}</b> {s.khmer && <span className="khmer">{s.khmer}</span>}
                          <span className="bhome-line">{s.english}</span>
                          <span className="lab-count">
                            {s.parts.length} parts · {s.quiz.length} questions
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        {planned.length > 0 && (
          <section className="bhome-site">
            <h2 className="bhome-sub">Shelves waiting to be filled</h2>
            <ul className="lab-planned">
              {planned.map((s) => (
                <li key={s.id}>
                  <span className="lab-subject-icon" aria-hidden="true">{s.icon}</span>
                  <div>
                    <b>{s.name}</b>
                    {s.khmer && <span className="khmer"> {s.khmer}</span>}
                    <p>{s.blurb}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="lab-invite">
              Nothing here yet. An exhibit is a data entry and one model
              function — <code>docs/LAB.md</code> walks through both.
            </p>
          </section>
        )}

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
            term in a teaching tool is worse than a missing one — those gaps are
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
