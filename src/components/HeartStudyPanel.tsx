import {useEffect, useMemo, useState} from 'react';
import {VRSurface} from './VRSurface';
import {VRPanelFrame, VRPageControls} from './VRPanel';
import {GuideNarrator, type NarrationStatus} from '../lib/guideNarrator';
import {HEART_PROMPTS, HEART_STEPS, type HeartStudy} from '../heartStudy';

export type HeartStudyAction = {id: string; label: string; run: () => void; active?: boolean};
export type HeartStudyPanelProps = {
  study: HeartStudy; actions: HeartStudyAction[]; note: string;
  onClose: () => void; onRestart: () => void; immersive?: boolean;
};

/** Both presentations receive the same actions, progress and observations. */
export function HeartStudyPanel({study, actions, note, onClose, onRestart, immersive = false}: HeartStudyPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [speech, setSpeech] = useState<NarrationStatus>('idle');
  const [page, setPage] = useState(0), [pages, setPages] = useState(1);
  const narrator = useMemo(() => new GuideNarrator(setSpeech), []);
  const title = HEART_STEPS[study.step];
  const progress = study.step === 7 ? 'Complete' : `Step ${study.step + 1} of 7`;
  const prompt = immersive && study.step === 2
    ? 'Separate the heart into pieces. Grip to move a piece, then release to leave it in the air.'
    : HEART_PROMPTS[study.step];
  const body = [prompt, study.step === 4 ? `${study.seen.length} of 2 structures explored.` : '', note, study.feedback].filter(Boolean).join('\n\n');
  useEffect(() => {narrator.stop(); setPage(0);}, [body, collapsed, narrator]);
  useEffect(() => () => narrator.dispose(), [narrator]);
  const listenLabel = speech === 'loading' || speech === 'speaking' ? 'Stop reading' : speech === 'unavailable' ? 'Voice unavailable · retry' : 'Listen';
  const listen = () => {if (speech === 'loading' || speech === 'speaking') narrator.stop(); else void narrator.start(`${title}. ${body}`);};

  if (immersive) return <group position={[1.55, 1.5, -.55]} rotation={[0, -.3, 0]}>
    {collapsed ? <VRSurface title="Heart study · reopen" width={.9} height={.16} onClick={() => setCollapsed(false)}/> : <>
      <VRPanelFrame width={1.18} height={1.65}/>
      <group position={[0,.68,0]}><VRSurface title="Heart study" variant="heading" width={1.06} height={.13}/></group>
      <group position={[0,.34,0]}><VRSurface title={title} body={body} eyebrow={progress} width={1.06} height={.52} page={page} onPages={setPages}/></group>
      <group position={[0,.025,0]}><VRPageControls page={page} pages={pages} onPage={setPage} km={false}/></group>
      {actions.map((a, i) => <group key={a.id} position={[(i % 2 ? 1 : -1) * .27, -.14 - Math.floor(i / 2) * .15, 0]}>
        <VRSurface title={a.label} width={.51} height={.13} active={a.active} onClick={a.run}/>
      </group>)}
      <group position={[-.27,-.59,0]}><VRSurface title={listenLabel} width={.51} height={.13} onClick={listen}/></group>
      <group position={[.27,-.59,0]}><VRSurface title="Restart" width={.51} height={.13} onClick={onRestart}/></group>
      <group position={[-.27,-.74,0]}><VRSurface title="Minimize" width={.51} height={.13} onClick={() => setCollapsed(true)}/></group>
      <group position={[.27,-.74,0]}><VRSurface title="End study" width={.51} height={.13} onClick={onClose}/></group>
    </>}
  </group>;

  return <section className={`bio-guide bio-ui${collapsed ? ' bio-guide--collapsed' : ''}`} aria-label="Guided heart study" onClick={e => e.stopPropagation()}>
    <div className="bio-guide-head"><b>Heart study</b><button aria-label={collapsed ? 'Expand heart study' : 'Minimize heart study'} aria-expanded={!collapsed} onClick={() => setCollapsed(v => !v)}>{collapsed ? '+' : '−'}</button></div>
    {!collapsed && <>
      <small>{progress}</small>
      <progress aria-label="Heart study progress" max={7} value={study.step}/>
      <h2>{title}</h2>
      <p aria-live="polite">{HEART_PROMPTS[study.step]}</p>
      {study.step === 4 && <small>{study.seen.length} of 2 structures explored</small>}
      {note && <p className="bio-guide-note">{note}</p>}
      {study.feedback && <p role="status">{study.feedback}</p>}
      <div className="bio-guide-actions">{actions.map(a => <button key={a.id} onClick={a.run} aria-pressed={a.active}>{a.label}</button>)}</div>
      <div className="bio-guide-footer"><button onClick={listen}>{listenLabel}</button><button onClick={onRestart}>Restart</button><button onClick={onClose}>End study</button></div>
    </>}
  </section>;
}
