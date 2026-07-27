import { SITES, BUILDINGS, standaloneBuildings, buildingsOfSite } from "../buildings";

/**
 * 🏛 **Buildings** — the directory, and the only way in.
 *
 * The map carries one Buildings button; everything else is reached from here.
 * A **site** is a group of buildings you can walk between, so its card opens the
 * walkable scene. Under it, each building links straight to its own page for
 * anyone who knows what they want and does not care to walk there.
 *
 * Standalone buildings — ones that belong to no site — are listed last. They
 * have a page but no scene.
 *
 * This is a plain DOM page on purpose. It is the first thing a visitor on a
 * ~$150 Android sees after the map, and it has no business spinning up a WebGL
 * context to show a list.
 */
export function BuildingsHome({
  onBackToMap, onOpenSite, onOpenBuilding,
}: {
  onBackToMap: () => void;
  onOpenSite: (id: string) => void;
  onOpenBuilding: (id: string) => void;
}) {
  const loose = standaloneBuildings();

  return (
    <div className="bhome">
      <div className="bhome-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🏛 Buildings</span>
      </div>

      <div className="bhome-scroll">
        <header className="bhome-head">
          <span className="tag">Cambodia in three dimensions</span>
          <h1>Buildings and campuses</h1>
          <p>
            Walkable sites and the buildings on them. Every one is built
            procedurally from photographs — the massing is an informed
            approximation, not survey data.
          </p>
        </header>

        {SITES.map((site) => {
          const kids = buildingsOfSite(site.name);
          return (
            <section key={site.id} className="bhome-site">
              <button className="bhome-card" onClick={() => onOpenSite(site.id)}>
                <span className="bhome-card-kind">Walkable site</span>
                <b>{site.name}</b>
                <span className="khmer">{site.khmer}</span>
                <p>{site.blurb}</p>
                <span className="bhome-go">Enter the site →</span>
              </button>

              <h2 className="bhome-sub">
                {kids.length} building{kids.length === 1 ? "" : "s"} here
              </h2>
              <ul className="bhome-list">
                {kids.map((b) => (
                  <li key={b.id}>
                    <button onClick={() => onOpenBuilding(b.id)}>
                      <b>{b.name}</b> <span className="khmer">{b.khmer}</span>
                      <span className="bhome-line">{b.english}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {loose.length > 0 && (
          <section className="bhome-site">
            <h2 className="bhome-sub">Standing on their own</h2>
            <ul className="bhome-list">
              {loose.map((b) => (
                <li key={b.id}>
                  <button onClick={() => onOpenBuilding(b.id)}>
                    <b>{b.name}</b> <span className="khmer">{b.khmer}</span>
                    <span className="bhome-line">{b.english}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="bhome-foot">
          {BUILDINGS.length} buildings across {SITES.length} site
          {SITES.length === 1 ? "" : "s"}. Adding one is a photograph and a
          registry entry — see <code>docs/BUILDINGS.md</code>.
        </p>
      </div>
    </div>
  );
}
