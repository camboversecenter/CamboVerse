import type { Chain, GardenRecord } from "../grove/garden";

/** Details belong to this plant's signed observation, never the plot total. */
export function GroveTreeDetails({ record, chain }: { record: GardenRecord; chain: Chain }) {
  const obs = record.observation;
  return <section aria-label="Tree details">
    {record.rowId !== null && <div className="grove-row"><span>Row</span><b>{record.rowId}</b></div>}
    {record.treeNumber !== null && <div className="grove-row"><span>Tree number</span><b>{record.treeNumber}</b></div>}
    <div className="grove-row"><span>Species</span><b>{obs.species}</b></div>
    <div className="grove-row"><span>Height</span><b>{obs.measure.height_m != null ? `${obs.measure.height_m} m` : "Not recorded"}</b></div>
    <div className="grove-row"><span>Trunk diameter (DBH)</span><b>{obs.measure.dbh_cm != null ? `${obs.measure.dbh_cm} cm` : "Not recorded"}</b></div>
    <div className="grove-row"><span>Est. CO₂</span><b>≈ {obs.co2Kg} kg</b></div>
    <div className="grove-row"><span>Trust</span><b>{record.trust}/100 · {record.attestations.length ? "community-attested" : "self-claim"}</b></div>
    <div className="grove-row"><span>Recorded GPS</span><b>{obs.gps ? `${obs.gps.lat}, ${obs.gps.lng}` : "Not recorded"}</b></div>
    <div className="grove-row"><span>Observed</span><b>{obs.observedAt}</b></div>
    <div className="grove-row"><span>Device</span><code>{obs.device.slice(0, 10)}…</code></div>
    <p className="grove-note">Verified from this tree’s signed record · {record.attestations.length} attestations checked. GPS is the recorded claim. CO₂ is an estimate.</p>
    {obs.note && <p className="grove-note">{obs.note}</p>}
    <details className="grove-tree-history"><summary>Observation history ({chain.length})</summary>
      {chain.map(r => <div className="grove-row" key={r.observation.id}><span>{r.observation.observedAt}</span><b>≈ {r.observation.co2Kg} kg CO₂</b></div>)}
    </details>
  </section>;
}
