import { TEMPLATES, templatesOfKind } from "../ceremony";
import { THEME_INFO } from "./CeremonyScene";

/**
 * 🎊 **Ceremonies** — the directory.
 *
 * Cambodia's calendar events are famous and few. Its **life events** are the
 * opposite: a wedding, a housewarming, an ordination, a funeral, happening
 * thousands of times a day all over the country and recorded as nothing but a
 * phone album. Both are listed here, life events first, because they are the
 * ones nobody has written down.
 *
 * Plain DOM, like the Buildings and Lab directories. A list has no business
 * starting a WebGL context, and this is the screen someone on a slow connection
 * reaches first.
 */
export function CeremonyHome({
  onBackToMap, onOpenCeremony,
}: {
  onBackToMap: () => void;
  onOpenCeremony: (id: string) => void;
}) {
  const life = templatesOfKind("life-event");
  const calendar = templatesOfKind("calendar");
  const unreviewed = TEMPLATES.filter((x) => x.needsReview).length;

  const card = (id: string) => {
    const tpl = TEMPLATES.find((x) => x.id === id)!;
    return (
      <li key={tpl.id}>
        <button onClick={() => onOpenCeremony(tpl.id)}>
          <b>{tpl.name.en}</b>
          {tpl.name.km && <span className="khmer"> {tpl.name.km}</span>}
          <span className="bhome-line">{tpl.summary.en}</span>
          <span className="cer-meta">
            {tpl.moments.length} moments
            {" · "}
            {tpl.days === 1 ? "one day" : `${tpl.days} days`}
            {" · "}
            {tpl.venues.map((v) => THEME_INFO[v].icon).join(" ")}
          </span>
          {tpl.needsReview && <span className="cer-review-chip">Awaiting cultural review</span>}
        </button>
      </li>
    );
  };

  return (
    <div className="bhome cer-home">
      <div className="bhome-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🎊 Ceremonies</span>
      </div>

      <div className="bhome-scroll">
        <header className="bhome-head">
          <span className="tag">Walk through it, moment by moment</span>
          <h1>Ceremonies</h1>
          <p>
            A Khmer ceremony is not one event but a sequence of them, each with
            its own name, its own meaning and its own place in the order. Step
            through the sequence, see what is set out at each stage, and stage it
            in the setting it actually happens in.
          </p>
        </header>

        <section className="bhome-site">
          <h2 className="bhome-sub">Life events</h2>
          <p className="cer-intro">
            The ones that happen thousands of times a day and are almost never
            written down.
          </p>
          <ul className="bhome-list">{life.map((tpl) => card(tpl.id))}</ul>
        </section>

        <section className="bhome-site">
          <h2 className="bhome-sub">The calendar</h2>
          <p className="cer-intro">
            Fixed points in the year, shared by the whole country.
          </p>
          <ul className="bhome-list">{calendar.map((tpl) => card(tpl.id))}</ul>
        </section>

        <section className="bhome-site cer-honesty">
          <h2 className="bhome-sub">What these are, and what they are not</h2>
          <p>
            <b>Descriptions awaiting review.</b> Khmer ceremonies vary by region
            and by family. The sequences here are the commonly described ones and
            the English names are descriptive rather than canonical.{" "}
            {unreviewed === TEMPLATES.length
              ? "None of them has been signed off by anyone who can speak for the tradition yet."
              : `${unreviewed} of ${TEMPLATES.length} are still waiting on review.`}
          </p>
          <p>
            Where a ritual&rsquo;s Khmer name has not been checked by a Khmer
            speaker who knows the tradition, the interface says so rather than
            showing a guess. Guessing at the name of somebody&rsquo;s own ritual
            is worse than leaving a gap.
          </p>
          <p>
            <b>Your own ceremony, later.</b> The format underneath this already
            supports a family recording their own — their photographs against the
            sequence, private by default, never located more precisely than a
            commune. <code>docs/CEREMONIES.md</code> has the whole design.
          </p>
        </section>
      </div>
    </div>
  );
}
