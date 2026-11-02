/** Reviewed context for the two local guide previews. No image uploads or
 * inferred room history. The server resolves these IDs itself. */
import { objectInfoFor } from './objectHotspots';
export type GuideExperience = 'wat-phnom' | 'staircase-3dgs' | 'clock-3dgs' | 'room-360';
export type GuideSource = { title: string; url?: string };
export type LocationFact = { question: string; keywords: string[]; text: string; sources: GuideSource[] };
export type LocationContext = {
  experienceId: GuideExperience; locationId: string; title: string;
  objectId?: string;
  introduction: string; facts: LocationFact[];
};

const museum: GuideSource = {
  title: 'National Museum of Cambodia · Wat Phnom history',
  url: 'https://cambodiamuseum.info/en_information_visitors/streetscapes.html',
};
const capture: GuideSource = { title: 'CamboVerse · current staircase capture notes' };
const room: GuideSource = { title: 'Your meeting-room photo tour · visible features and capture notes' };
const roomTitles = [
  'Room entrance', 'Wooden wall · 1', 'Side aisle · 1', 'Wooden wall · 2',
  'Side aisle · 2', 'Side aisle · 3', 'Side aisle · 4', 'Screen corner · 1',
  'In front of the screen', 'Screen corner · 2', 'Window aisle · 1',
  'Window aisle · 2', 'Window aisle · 3', 'Window aisle · 4', 'Entrance corner',
  'Entrance aisle', 'Beside the tables · 1', 'Beside the tables · 2',
  'Beside the tables · 3', 'Beside the tables · 4', 'Table corner · 1',
  'Inside the tables · 1', 'Inside the tables · 2', 'Table corner · 2',
  'Inside the tables · 3', 'Inside the tables · 4', 'Inside the tables · 5',
];

function baseLocationGuideContext(experienceId: string, locationId: string): LocationContext | null {
  if(experienceId==='wat-phnom'&&locationId==='wat-phnom'){
    const staircase=baseLocationGuideContext('staircase-3dgs','naga-staircase')!;
    return {...staircase,experienceId:'wat-phnom',locationId:'wat-phnom',title:'Wat Phnom',
      introduction:'Welcome to Wat Phnom in Phnom Penh. Ask about the site and the photographed staircase.',
      facts:staircase.facts.slice(0,2)};
  }
  if(experienceId==='wat-phnom'){
    const details:Record<string,{title:string;description:string}>={
      'central-stupa':{title:'The Great Stupa',description:'This is an illustrative view of the Great Stupa at Wat Phnom. The model is simplified; detailed historical claims about this monument have not yet been verified in these guide notes.'},
      'main-vihara':{title:'The Vihara',description:'This is an illustrative view of the vihara, the sanctuary hall at Wat Phnom. The model is simplified; detailed historical claims about the hall have not yet been verified in these guide notes.'},
      'city-overlook':{title:'City Overlook',description:'This illustrative viewpoint looks out from Wat Phnom toward Phnom Penh. The surrounding landscape and skyline are simplified.'},
    };
    const detail=details[locationId];
    if(detail){
      const history=baseLocationGuideContext('staircase-3dgs','naga-staircase')!.facts[0];
      return {experienceId:'wat-phnom',locationId,title:`Wat Phnom · ${detail.title}`,
        introduction:detail.description,facts:[
          {question:'What am I looking at?',keywords:['looking','see','view','location','place','building','stupa','vihara','overlook'],text:detail.description,sources:[{title:'CamboVerse · illustrative Wat Phnom model notes'}]},
          {...history,text:'Wat Phnom’s traditional founding is dated to 1372 and linked to Daun Penh’s discovery of Buddha images. The National Museum of Cambodia records that the vihara was rebuilt several times, including in 1926. This founding story does not establish when this particular feature was built.'},
        ]};
    }
  }
  if (experienceId === 'clock-3dgs' && locationId === 'flower-clock') return {
    experienceId, locationId, title: 'Wat Phnom · Flower Clock',
    introduction: 'You are exploring the photographed flower clock near Wat Phnom in Phnom Penh. Ask about the clock, the site, or this capture.',
    facts: [
      {question:'What is the flower clock?',keywords:['clock','flower','face','hands','looking','see','feature'],text:'The capture shows a large clock face set into greenery near Wat Phnom. Its visible numerals and hands form the clock display. Verified details of this particular clock’s installation, designer and current operation have not been provided.',sources:[{title:'CamboVerse · flower clock capture notes'}]},
      {question:'Tell me about Wat Phnom history',keywords:['history','historic','built','when','old','date','founded'],text:'Wat Phnom’s traditional founding is dated to 1372 and linked to Daun Penh’s discovery of Buddha images. The National Museum of Cambodia records that the vihara was rebuilt several times, including in 1926. This founding story does not date the flower clock.',sources:[museum]},
      {question:'Why are some areas blurry?',keywords:['blur','blurry','missing','capture','scan','photo','quality'],text:'The clock is a reconstructed photo capture. Some views and surfaces are incomplete or blurred; clearer, overlapping photographs may help a future reconstruction.',sources:[{title:'CamboVerse · flower clock capture notes'}]},
      {question:'How do I explore?',keywords:['move','walk','explore','control','turn','navigate'],text:'Walk around the outside of the clock and turn to look at it from different angles. In VR, use the left stick to move and the right stick to turn.',sources:[{title:'CamboVerse · flower clock capture notes'}]},
    ],
  };
  if (experienceId === 'staircase-3dgs' && locationId === 'naga-staircase') return {
    experienceId, locationId, title: 'Wat Phnom · Naga Staircase',
    introduction: 'You are exploring the photographed staircase at Wat Phnom in Phnom Penh. Ask me about the site’s history, the staircase, or this capture.',
    facts: [
      { question: 'Tell me about the history', keywords: ['history','historic','built','when','old','date','1372','founded'],
        text: 'Wat Phnom’s traditional founding is dated to 1372 and linked to Daun Penh’s discovery of Buddha images. The National Museum of Cambodia records that the vihara was rebuilt several times, including in 1926. The founding story concerns the site; it does not date the staircase you see here.', sources: [museum] },
      { question: 'What am I looking at?', keywords: ['looking','see','staircase','stairs','naga','lion','statue','sculpture','where','location','rail','serpent','symbol'],
        text: 'This is the Naga Staircase capture at Wat Phnom. Serpent-shaped naga balustrades border the steps, with guardian sculptures along the approach. These notes identify the photographed features; a reviewed explanation of their religious symbolism and exact construction dates has not been added yet.', sources: [capture] },
      { question: 'Why are some areas blurry?', keywords: ['blur','blurry','missing','rear','behind','back','crop','clean','mess','gap','quality'],
        text: 'This 3D capture is incomplete, especially toward the rear and sides. Clean view crops distracting fragments, while Full scan shows the original export. Both allow 360° turning. Clearer missing views need better reconstruction or additional overlapping photographs.', sources: [capture] },
      { question: 'How do I explore?', keywords: ['move','walk','explore','control','turn','jump','next','navigate'],
        text: 'Drag to look around in any direction. Use the joystick or WASD to walk along the captured staircase, and Space or Jump for a short jump. Temple model returns to the wider authored scene; Inspect capture opens the outside view.', sources: [capture] },
    ],
  };
  const number = Number(locationId);
  if (experienceId !== 'room-360' || !/^0[5-7]\d$/.test(locationId) || number < 50 || number > 76) return null;
  const title = roomTitles[number-50];
  const area = number >= 66 ? 'the tables and office chairs'
    : number >= 60 && number <= 63 ? 'the windows and blinds'
    : number >= 57 && number <= 59 ? 'the large wall-mounted display'
    : number === 50 || number === 64 || number === 65 ? 'the room’s entrance and glass doors'
    : number === 51 || number === 53 ? 'the wooden wall and nearby seating'
    : 'a side aisle beside the meeting tables';
  return {
    experienceId: 'room-360', locationId, title: `Meeting room · ${title}`,
    introduction: `Your location is “${title}”, one of 27 photographed positions in this meeting-room tour. Here you can explore ${area}.`,
    facts: [
      { question: 'What is at this spot?', keywords: ['spot','where','location','looking','see','room','feature','table','chair','screen','window','door','wall','display'],
        text: `This photo spot, “${title}”, gives a view of ${area}. The room photos show white meeting tables, office chairs, a large display, and glass doors and windows.`, sources: [room] },
      { question: 'What is the room’s history?', keywords: ['history','historic','built','when','old','date','architect','founded','owner','institution'],
        text: 'A verified construction date, architect, and history for this meeting room have not been provided. The tour currently documents its visible features and photographed locations.', sources: [room] },
      { question: 'How do I move to another spot?', keywords: ['move','walk','explore','control','turn','next','navigate','arrow','zoom'],
        text: 'Drag to look around 360°. Tap an arrow in the room or open the locations list to change your photographed position. Pinch or scroll to zoom. This tour uses 27 linked panoramic photos, so movement is between those photographed spots.', sources: [room] },
    ],
  };
}

export function locationGuideContext(experienceId:string,locationId:string,objectId?:string): LocationContext|null {
  const context=baseLocationGuideContext(experienceId,locationId);
  if(!context||!objectId)return context;
  const object=objectInfoFor(experienceId,locationId,objectId);
  if(!object)return null;
  return {...context,objectId,title:`${context.title} · ${object.title}`,introduction:object.text,
    facts:[{question:`Tell me about ${object.title}`,keywords:['object','this','that',...object.title.toLowerCase().split(/\W+/)],text:object.text,sources:[object.source]},...context.facts]};
}

/** Honest offline preview: saved answers only, with no invented free-form reply. */
export function savedLocationAnswer(context: LocationContext, question = ''): { text: string; sources: GuideSource[] } {
  const q = question.toLowerCase().normalize('NFKC');
  if (!q.trim()) return { text: context.introduction, sources: [] };
  // Historical questions must not fall through to a generic room description.
  const history = context.facts.find(f => f.keywords.includes('history'))!;
  if (/\b(history|historic|built|construction|architect|founded|date|owner|institution)\b|how old|what year/.test(q)) {
    if(context.objectId) return {text:context.facts[0].text,sources:context.facts[0].sources};
    return { text: history.text, sources: history.sources };
  }
  const words: string[] = Array.from(q.match(/[a-z0-9]+/g) ?? []);
  const scored = context.facts.map(f => ({ fact: f, score: f.keywords.reduce((n,k)=>n+Number(words.includes(k)),0) }));
  scored.sort((a,b)=>b.score-a.score);
  if (scored[0].score > 0) return { text: scored[0].fact.text, sources: scored[0].fact.sources };
  return { text: 'I don’t have a verified answer to that in this location’s saved notes yet. Try one of the suggested questions, or ask about the features at this spot.', sources: [] };
}
