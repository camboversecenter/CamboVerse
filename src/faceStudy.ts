import type { LabPart } from './lab';
export const FACE_PARTS: LabPart[] = [
  {id:'eye-left',name:'Left eye',khmer:'',layer:'whole',at:[3,77,8],blurb:'The eye detects light. This exterior assembly shows the sclera, iris and pupil. Use the separate Eye exhibit for internal layers.'},
  {id:'eye-right',name:'Right eye',khmer:'',layer:'whole',at:[-3,77,8],blurb:'The two eyes provide slightly different views. The brain combines them to support depth perception.'},
  {id:'ear-left',name:'Left outer ear',khmer:'',layer:'whole',at:[8,74,0],blurb:'The outer ear helps collect sound. This removable surface region does not include the ear canal, middle ear or inner ear.'},
  {id:'ear-right',name:'Right outer ear',khmer:'',layer:'whole',at:[-8,74,0],blurb:'The outer ear helps collect sound. This is an illustrative surface region, not a surgical dissection.'},
  {id:'nose',name:'External nose',khmer:'',layer:'whole',at:[0,73,10],blurb:'The external nose surrounds the nostril openings. Internal nasal passages are not included in this surface study.'},
  {id:'mouth',name:'Lips and mouth region',khmer:'',layer:'whole',at:[0,68,9],blurb:'The lips form the external boundary of the mouth. This surface patch does not contain teeth, tongue or the oral cavity.'},
];
export const isFacePart=(id:string|null|undefined)=>FACE_PARTS.some(p=>p.id===id);
