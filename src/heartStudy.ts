import type {BiologyState} from './biologyRoomState';

export type HeartStudy = {step: number; seen: number[]; feedback: string};
export const newHeartStudy = (): HeartStudy => ({step: 0, seen: [], feedback: ''});
export const HEART_STEPS = [
  'Reveal the organs', 'Find the heart', 'Separate the floating heart',
  'Inspect a section', 'Explore two structures', 'Check your understanding',
  'Return the heart', 'Study complete',
] as const;
export const HEART_PROMPTS = [
  'Choose Organs only for a clear view inside the body.',
  'Select the heart on the body, or use Take heart below.',
  'Separate the heart into pieces. Select or move a piece to inspect it.',
  'Rotate the pieces, then choose Open section to reassemble and inspect the heart. This is an illustrative model.',
  'Select two different labels and read their roles. You can rotate or grip the heart to look around it.',
  'Which chamber pumps blood into the aorta?',
  'Correct: the left ventricle pumps blood into the aorta. Return the heart to finish.',
  'You inspected a section, explored two structures and identified the chamber that pumps into the aorta.',
] as const;
export type HeartObservation = BiologyState & {separated: boolean; section: boolean; pin: number | null};


/** Observe actual room state; interface buttons cannot skip learning steps. */
export function observeHeartStudy(s: HeartStudy, room: HeartObservation): HeartStudy {
  if (s.step === 7) return s;
  if (s.step === 6 && room.taken === null && room.selected === 'heart') return {...s, step: 7};
  // A different specimen or layer cannot inherit the heart's learning progress.
  if (s.step >= 2 && room.taken !== 'heart') return {...newHeartStudy(), step: room.layer === 'cutaway' ? 1 : 0};
  if (s.step === 0 && room.layer === 'cutaway') return {...s, step: 1};
  if (s.step === 1 && room.taken === 'heart') return {...s, step: 2};
  if (s.step === 2 && room.separated) return {...s, step: 3};
  if (s.step === 3 && room.section) return {...s, step: 4};
  if (s.step === 4 && room.pin !== null && room.pin >= 0 && room.pin < 4 && !s.seen.includes(room.pin)) {
    const seen = [...s.seen, room.pin];
    return {...s, seen, step: seen.length >= 2 ? 5 : 4};
  }
  return s;
}

export function answerHeartStudy(s: HeartStudy, answer: 'left-ventricle' | 'right-atrium'): HeartStudy {
  if (s.step !== 5) return s;
  return answer === 'left-ventricle' ? {...s, step: 6, feedback: ''} : {
    ...s, feedback: 'Try again. The right atrium receives blood returning from the body. Look for the chamber that pumps into the aorta.',
  };
}
