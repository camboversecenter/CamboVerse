import {useState} from 'react';

export type SceneQuality = 'normal' | 'ultra';

/** A headset temporarily upgrades the scene without overwriting the visitor's choice. */
export function useSceneQuality(immersive: boolean, initial: () => SceneQuality) {
  const [preferred, setPreferred] = useState(initial);
  return {
    mode: immersive ? 'ultra' as const : preferred,
    toggle: () => {if (!immersive) setPreferred(value => value === 'normal' ? 'ultra' : 'normal');},
  };
}
