export const PCHUM_BEN_BOOKS = [
  { title: 'Enthroned Buddha · Cambodia, 1923', detail: 'The Metropolitan Museum of Art, 2013.247a–h. Reference for the earth-touching right hand and tiered throne; our sculpture is an interpretation, not a replica.', url: 'https://www.metmuseum.org/art/collection/search/78429' },
  { title: 'Caring for the Dead Ritually in Cambodia', detail: 'John Clifford Holt, Southeast Asian Studies 1(1), 2012. Fieldwork account; offering photographs 3 and 5 inspected for modelling.', url: 'https://englishkyoto-seas.org/2015/12/vol-1-no-1-john-clifford-holt/' },
  { title: 'Annual Ceremonies Honor Ancestors and Wandering Spirits', detail: 'VOA Khmer, 29 September 2015. Reporting on pre-dawn visits, offerings and remembrance.', url: 'https://khmer.voanews.com/a/annual-ceremonies-honor-ancestors-and-wandering-spirits/2984026.html' },
];
export const PCHUM_BEN_OBJECTS = {
  buddha: { name: 'Buddha image in the vihear', note: 'The vihear is the pagoda’s principal worship hall. This seated image has the right hand reaching down in the earth-touching gesture. It stays on its altar; select it to learn, not to move it. The sculpture and hall are illustrative, not a reconstruction of Preah Vihear temple.' },
  rice: { name: 'Rice offering tray', note: 'Small rice portions on a metal tray. Shape and quantity here are illustrative.' },
  leaf: { name: 'Banana-leaf cone', note: 'A folded leaf form informed by photograph 5 in Holt’s article.' },
  flags: { name: 'White paper flag', note: 'A simplified silhouette informed by photograph 3. No sacred lettering is invented.' },
  incense: { name: 'Incense and candles', note: 'Select to inspect the bowl and candle holders. No prayer or burning ritual is simulated.' },
  receptacle: { name: 'Rice receptacle', note: 'Some pagodas use designated containers; others do not practise bay ben. Follow the local pagoda’s guidance.' },
  alms: { name: 'Monks’ food bowls', note: 'This display distinguishes food offered to monks from the pre-dawn rice distribution.' },
  food: { name: 'Food trays', note: 'Illustrative dishes, not a required menu or quantity.' },
  seating: { name: 'Seating area', note: 'Places indicate the learning scene’s layout. Participants and chanting are not reconstructed.' },
} as const;
export type PchumBenObject = keyof typeof PCHUM_BEN_OBJECTS;
export const PCHUM_BEN_ITEMS: Record<string,PchumBenObject[]> = {
  'before-dawn':['rice','leaf','flags','incense'],
  'bay-ben':['rice','flags','receptacle'],
  offering:['alms','food','seating'],
  dedication:['incense','seating'],
  'ben-thom':['alms','food','incense','seating'],
};
export const pchumBenAsset = (detail:'normal'|'ultra') => `/models/local/pchum-ben-v2/pchum-ben-${detail}.glb?v=2.1`;

export const PCHUM_STOPS = [
  { id:'welcome', name:'Pagoda courtyard', position:[0,1.575,4.3], radius:1.8, moment:'before-dawn', text:'Enter at your own pace. The open sala ahead is a gathering and offering space. The enclosed vihear beyond it contains the Buddha image. This is an illustrative pagoda, not a named historic site.' },
  { id:'offerings', name:'Preparing offerings', position:[1.7,1.86,1.8], radius:1.5, moment:'before-dawn', text:'Approach the trays to learn about rice portions, folded banana leaves and paper flags. Practices differ between pagodas. The ceremony tabs explain selected moments; they are not a compulsory order of actions.' },
  { id:'community', name:'Food and remembrance', position:[-1.35,1.86,-1.3], radius:1.5, moment:'offering', text:'Families offer food to monks and remember deceased relatives. Food offered to monks is distinct from pre-dawn bay ben. Use the object buttons below to inspect the bowls and seating arrangement.' },
  { id:'vihear', name:'Inside the vihear', position:[0,2.19,-7.1], radius:1.5, moment:'dedication', text:'The Buddha image is placed on a raised altar. In a real pagoda, follow local guidance on footwear, dress and respectful behaviour. Here you can observe the image and read its meaning without moving sacred objects.' },
] as const;
export type PchumStop = typeof PCHUM_STOPS[number];
export function nearestPchumStop(x:number,y:number,z:number):PchumStop|null {
  let best:PchumStop|null=null, distance=Infinity;
  for(const stop of PCHUM_STOPS) {
    const d=Math.hypot(x-stop.position[0],z-stop.position[2]);
    if(d<stop.radius && d<distance && Math.abs(y-stop.position[1])<.8){best=stop;distance=d;}
  }
  return best;
}
