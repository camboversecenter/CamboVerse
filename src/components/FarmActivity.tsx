import { FARM_ACTIVITIES, farmStageDone, farmWaterReady, type FarmJourney } from '../farmJourney';

/** DOM equivalents keep every field activity reachable by keyboard and touch. */
export function FarmActivity({ journey, onTask, onWater }: {
  journey: FarmJourney; onTask: (task: number) => void; onWater: (value: number) => void;
}) {
  const activity = FARM_ACTIVITIES[journey.stageId];
  const completed = journey.tasks[journey.stageId] ?? [];
  const done = farmStageDone(journey, journey.stageId);
  return <section className="farm-activity" aria-label="Current farm activity">
    <p>{activity.instruction}</p>
    {journey.stageId === 'water' && <div className="farm-water-control">
      <label htmlFor="farm-water">Practice gate: {journey.water} / 100</label>
      <input id="farm-water" type="range" min="0" max="100" step="5" value={journey.water}
        disabled={done} onChange={e => onWater(Number(e.target.value))} />
      <span>{farmWaterReady(journey.water) ? 'Within the practice band (40–60)' : journey.water < 40 ? 'Open the gate further' : 'Close the gate a little'}</span>
      <small>Illustrative game scale—not a water-depth or farming recommendation.</small>
    </div>}
    <div className="farm-task-grid">
      {activity.labels.map((label, task) => <button key={task} type="button"
        className={completed.includes(task) ? 'complete' : ''}
        disabled={done || completed.includes(task) || (journey.stageId === 'water' && !farmWaterReady(journey.water))}
        onClick={() => onTask(task)} aria-label={`${label}${completed.includes(task) ? ', completed' : ''}`}>
        <span aria-hidden="true">{completed.includes(task) ? '✓' : journey.stageId === 'thresh' ? (activity.valid.includes(task) ? '🌾' : '🍂') : task + 1}</span>
        {label}
      </button>)}
    </div>
    <div className="farm-task-progress">
      <progress value={completed.length} max={activity.valid.length} aria-label="Activity progress" />
      <span>{completed.length} / {activity.valid.length} complete</span>
    </div>
  </section>;
}
