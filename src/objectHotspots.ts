/** Object notes and reviewed image-space annotations for the local previews.
 * Coordinates identify photographed features, not surveyed geometry. */
export type ObjectInfo = {
  id: string; title: string; text: string;
  source: {title:string;url?:string};
};
export type ObjectAnchor = { id:string; position:[number,number,number] };
export type PanoramaObjectAnchor = { id:string; u:number; v:number };

const capture = {title:'CamboVerse · supplied staircase photographs'};
const room = {title:'Your meeting-room panoramas · visible features'};
export const OBJECT_INFO: Record<string,ObjectInfo> = {
  'naga-balustrade': {id:'naga-balustrade',title:'Naga balustrade',source:capture,
    text:'The serpent-shaped naga sculpture forms the railing beside this staircase at Wat Phnom. Follow its curved body along the steps toward the multi-headed end. These notes describe the photographed sculpture; its exact date and a reviewed explanation of its symbolism are not yet recorded.'},
  'guardian-lion': {id:'guardian-lion',title:'Guardian lion',source:capture,
    text:'This lion sculpture stands beside the approach to the temple. Notice its raised head, front paws, and pedestal. The capture shows several guardian sculptures along the stairs. A verified date and artist for this particular sculpture have not been provided.'},
  'room-screen': {id:'room-screen',title:'Meeting-room screen',source:room,
    text:'This is the large wall-mounted display at the front of the meeting room, above the marble-patterned wall panel. The screen is dark in the supplied photo. Its model, technical specifications, and installation date have not been provided.'},
  'room-tables': {id:'room-tables',title:'Meeting tables',source:room,
    text:'The white meeting tables form a U-shaped arrangement with chairs around them. Look across the open centre toward the display and around the seating edges. These notes describe the photographed layout; the room capacity and booking arrangements are not recorded.'},
  'room-entrance': {id:'room-entrance',title:'Glass-door entrance',source:room,
    text:'The glass doors connect the meeting room with the covered corridor. Their white frames and tall panes make the entrance easy to recognise. This marker identifies the entrance shown in the photo; it does not provide current opening hours or access permission.'},
};

export const STAIRCASE_OBJECT_ANCHORS: ObjectAnchor[] = [
  {id:'naga-balustrade',position:[-0.65,1.0,-0.9]},
  {id:'guardian-lion',position:[0.02,2.1,-3.05]},
];

// Screen and tabletop centres are individually annotated in each raw panorama.
// Entrance markers are added only where the doorway is clearly identifiable.
const roomAnchors: Record<string, [number,number,number,number,number?,number?]> = {
  '050':[.693,.477,.685,.55,.20,.50],
  '051':[-1,0,.085,.57], '052':[-1,0,.28,.56],
  '053':[-1,0,.12,.58], '054':[-1,0,.27,.56],
  '055':[-1,0,.30,.58], '056':[.08,.43,.18,.56],
  '057':[.06,.37,.42,.55], '058':[.04,.39,.50,.57],
  '059':[.86,.40,.55,.60], '060':[.91,.47,.61,.61],
  '061':[.85,.46,.62,.59], '062':[.92,.47,.68,.61],
  '063':[.91,.47,.73,.59,.48,.48],
  '064':[.25,.44,.30,.56,.76,.50],
  '065':[.40,.44,.39,.58,.78,.48],
  '066':[.28,.41,.28,.60], '067':[.59,.43,.78,.68,.13,.47],
  '068':[.67,.47,.86,.67], '069':[.58,.45,.70,.67],
  '070':[.56,.41,.78,.66], '071':[.51,.44,.87,.65,.05,.48],
  '072':[.49,.42,.65,.65], '073':[.42,.40,.08,.64],
  '074':[.14,.45,.28,.67], '075':[.17,.45,.35,.65], '076':[.17,.45,.27,.62],
};

export function roomObjectAnchors(id:string): PanoramaObjectAnchor[] {
  const a=roomAnchors[id]; if(!a)return [];
  const anchors=[{id:'room-tables',u:a[2],v:a[3]}];
  if(a[0]>=0)anchors.unshift({id:'room-screen',u:a[0],v:a[1]});
  if(a[4]!==undefined&&a[5]!==undefined)anchors.push({id:'room-entrance',u:a[4],v:a[5]});
  return anchors;
}

export function objectInfoFor(experienceId:string,locationId:string,objectId:string): ObjectInfo|null {
  const ids=experienceId==='staircase-3dgs'&&locationId==='naga-staircase'
    ? STAIRCASE_OBJECT_ANCHORS.map(a=>a.id)
    : experienceId==='room-360' ? roomObjectAnchors(locationId).map(a=>a.id) : [];
  return ids.includes(objectId)?OBJECT_INFO[objectId]??null:null;
}
