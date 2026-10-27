import { PCHUM_STOPS } from './pchumBenStudy';

export type CeremonyStop={id:string;name:string;position:readonly[number,number,number];radius:number;moment:string;text:string;yaw?:number;pitch?:number};
const WEDDING_STOPS:CeremonyStop[]=[
  {id:'arrival',name:'Arriving at the bride’s home',position:[0,1.585,4],radius:1.6,moment:'procession',text:'Begin with gifts arriving at the bride’s home. Read about the offering trays, then explore the other selected moments. This is a study of objects and setting, not a complete historical reenactment.'},
  {id:'objects',name:'Wedding ritual objects',position:[1.6,1.84,1.4],radius:1.3,yaw:.8,pitch:-.5,moment:'hair-cutting',text:'Inspect the comb, scissors and mirror associated with symbolic hair cutting. Use the moment tabs to compare the popil, threads, sword and blossoms used in other rites.'},
  {id:'blessing',name:'Family blessings',position:[-1.5,1.84,-.4],radius:1.3,yaw:-1.5,pitch:-.5,moment:'knot-tying',text:'White threads represent blessings offered to the couple. The model presents objects for observation; it does not ask you to perform a ceremony or prescribe its order.'},
  {id:'home',name:'The house doorway',position:[0,2.85,-4.1],radius:1.1,yaw:Math.PI,moment:'scarf-leading',text:'The raised house provides the setting for the closing cloth-leading moment. Architecture is illustrative. You can return to the courtyard and explore any other moment.'},
];
const HOUSE_STOPS:CeremonyStop[]=[
  {id:'entrance',name:'Stair and threshold',position:[0,1.58,5.5],radius:1.5,moment:'offerings',text:'Walk up the stair into a completed timber house. This study distinguishes entering a new home from earlier construction rites.'},
  {id:'offerings',name:'Prepared interior',position:[1.6,2.88,1.6],radius:1.2,yaw:.8,pitch:-.5,moment:'offerings',text:'Explore the offerings and family space. Their arrangement is illustrative. The published regional accounts do not establish one nationwide timetable.'},
  {id:'blessing',name:'Chanting and blessing',position:[-1.1,2.88,.5],radius:1.1,yaw:1.4,pitch:-.4,moment:'chanting',text:'The seating and water vessel introduce the blessing described in the Svay Rieng account. Select each object to read its role.'},
  {id:'post',name:'Central post',position:[.9,2.85,-1.5],radius:1.1,yaw:2.1,moment:'central-post',text:'Locate the post addressed by the achar in the reported ceremony. It links the completed structure to hopes for the household. Use the meal tab to explore the optional gathering afterwards.'},
];
const NEW_YEAR_STOPS:CeremonyStop[]=[
  {id:'welcome',name:'Welcoming the year',position:[-1.7,1.6,3.3],radius:1.3,yaw:.85,pitch:-.4,moment:'welcome',text:'Families prepare their homes and offerings to welcome the New Year. Our courtyard brings several learning stations together; it is not a literal plan of one celebration.'},
  {id:'giving',name:'Generosity and pagoda visits',position:[0,1.92,-3.1],radius:1.3,pitch:-.5,moment:'generosity',text:'Learn about generosity towards elders and others, and food offerings to monks. The sala is a gathering space. These displays introduce practices that take place across homes and pagodas.'},
  {id:'sand',name:'Building sand mounds',position:[1.5,1.6,1],radius:1.1,yaw:-Math.PI/2,pitch:-.2,moment:'sand',text:'Look closely at the mound shapes and plain paper flags. Sand-mound building is a merit-making practice; arrangements and local explanations vary.'},
  {id:'water',name:'Respectful water blessings',position:[-1.6,1.6,-1.3],radius:1.1,yaw:Math.PI/2,pitch:-.4,moment:'water',text:'Observe the water vessel and dipper. This stop explains respectful bathing of Buddha images and honouring elders; the people and ritual action are not reconstructed.'},
  {id:'games',name:'Traditional games',position:[5.6,1.6,-1.8],radius:1.1,pitch:-.6,moment:'games',text:'Inspect the rope and chhoung cloth. Explore their meanings and differences in the information board. The display is an introduction, not a playable reconstruction of every game.'},
];
export function ceremonyStops(id:string):readonly CeremonyStop[]{
  if(id==='wedding')return WEDDING_STOPS;
  if(id==='housewarming')return HOUSE_STOPS;
  if(id==='khmer-new-year')return NEW_YEAR_STOPS;
  return PCHUM_STOPS;
}
export function nearestCeremonyStop(stops:readonly CeremonyStop[],x:number,y:number,z:number):CeremonyStop|null{
  let best:CeremonyStop|null=null,distance=Infinity;
  for(const s of stops){const d=Math.hypot(x-s.position[0],z-s.position[2]);if(d<s.radius&&d<distance&&Math.abs(y-s.position[1])<.8){best=s;distance=d;}}
  return best;
}
