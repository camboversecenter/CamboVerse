import { SPECIMENS, type LabLayer } from './lab';

export type BiologyLayer = LabLayer | 'combined' | 'muscles';
export type BiologyState = { layer: BiologyLayer; selected: string | null; taken: string | null };
export const initialBiologyState: BiologyState = { layer: 'combined', selected: null, taken: null };
export const biologyParts = SPECIMENS.find(s => s.id === 'human-body')!.parts.filter(p => p.layer !== 'whole');
const parts = biologyParts;
export const canTakeBiologyPart = (id: string | null) => parts.some(p => p.id === id && p.layer === 'cutaway');
// Local Blender head pack shares the skeleton's centimetre frame.
export const isFittedHeadPart = (id: string) => ['eyes', 'ears', 'nose', 'mouth'].includes(id);
export function showBiologyOrgan(layer: BiologyLayer, id: string, taken: string | null) {
  if (taken === id) return true;
  return layer === 'cutaway' || layer === 'combined';
}
export type BiologyAction = { type: 'select'; id: string } | { type: 'layer'; layer: BiologyLayer } | { type: 'take' } | { type: 'reset' };

/** Single selected/taken structure. Changing context always returns the old organ. */
export function biologyTransition(state: BiologyState, action: BiologyAction): BiologyState {
  if (action.type === 'reset') return initialBiologyState;
  if (action.type === 'layer') return { layer: action.layer === 'whole' ? 'combined' : action.layer, selected: null, taken: null };
  if (action.type === 'select') {
    if (action.id === 'muscles') return { layer: 'muscles', selected: 'muscles', taken: null };
    const part = parts.find(p => p.id === action.id);
    const layer = state.layer === 'combined' && part?.layer !== 'whole' ? 'combined' : part?.layer;
    return part && layer ? { layer, selected: part.id, taken: state.taken === part.id ? part.id : null } : state;
  }
  const part = parts.find(p => p.id === state.selected);
  return part && canTakeBiologyPart(part.id) ? { ...state, taken: state.taken ? null : part.id } : state;
}
