import { createContext } from 'react';
export const MouthTeethContext = createContext(false);
export function showStudyDentition(isDentition: boolean, taken: boolean, enabled: boolean) {
  return !isDentition || (taken && enabled);
}
