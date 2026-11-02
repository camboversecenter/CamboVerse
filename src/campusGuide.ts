import {BUILDINGS,buildingById,buildingsOfSite,siteById} from './buildings';
import type {LocationContext,LocationFact} from './locationGuide';

export const CAMPUS_GUIDE_NAME_KM='មគ្គុទ្ទេសក៍បរិវេណ';
const sources=[{title:'CamboVerse · campus and building model notes'}];
const accuracy='These are model and photo-capture notes, not a surveyed map or a live campus directory. Dimensions are approximate and construction status describes the source photographs, not necessarily the campus today.';
const history='Verified construction dates, architects and a detailed history for this campus building have not been supplied. The guide can describe the features recorded in the project, but cannot confirm current opening hours, room assignments or access permissions.';
const controls='Choose Walk or Walk around to explore. Use WASD or the joystick to move, and drag to look. Hold Shift or select Run to speed up. Press Space or Jump, then press again while airborne for one extra jump. In VR, use the left stick to walk, left grip to run, right A for each jump, right stick to turn, and left Y to open or close this guide. Choose a campus landmark to move to its viewing position and open its building page.';
const fact=(question:string,keywords:string[],text:string,textKhmer:string):LocationFact=>({question,keywords,text,textKhmer,sources});

/** Resolve IDs against the same registry used by the scene, on both server and client. */
export function campusGuideContext(locationId:string):LocationContext|null {
  const site=siteById(locationId),building=buildingById(locationId);
  if(!site&&!building)return null;
  const title=building?.name??site!.name,titleKhmer=building?.khmer??site!.khmer;
  const introduction=building
    ? `This is ${title}${building.site?` at ${building.site}`:''}. ${building.english}. ${accuracy}`
    : `Explore ${title}. The model includes ${buildingsOfSite(site!.name).map(b=>b.name).join(', ')}. ${accuracy}`;
  const introductionKhmer=`នេះជា${titleKhmer}ក្នុងគំរូបីវិមាត្រ។ គំរូនេះត្រូវបានបង្កើតពីរូបថត ហើយមិនមែនជាការស្ទង់វាស់ជាក់លាក់ទេ។ អ្នកអាចសួរអំពីទីតាំងនេះ និងរបៀបដើរទស្សនា។`;
  const features=building
    ? `${building.about.join(' ')} ${building.facts.map(f=>`${f.label}: ${f.value}.`).join(' ')} ${accuracy}`
    : `The campus model includes ${buildingsOfSite(site!.name).map(b=>`${b.name}: ${b.english}`).join('; ')}. ${site!.provenance}`;
  return {experienceId:'campus',locationId,title,titleKhmer,introduction,introductionKhmer,facts:[
    fact('What is this place?',['place','looking','see','location','building','campus','where'],introduction,introductionKhmer),
    fact('What can I explore here?',['features','explore','roof','floors','use','hall','teaching','shrine','gate','pool','parking'],features,
      building?`${titleKhmer}ជាទីតាំងមួយក្នុងគំរូបរិវេណនេះ។ អ្នកអាចបង្វិលមើលគំរូ និងដើរមើលពីជ្រុងផ្សេងៗបាន។ ព័ត៌មានលម្អិតបន្ថែមមាននៅក្នុងផ្ទាំងព័ត៌មានអគារ។`
      :`ក្នុងគំរូនេះមាន${BUILDINGS.filter(b=>b.site===site!.name).map(b=>b.khmer).join(' និង')}។`),
    fact('How do I move and jump?',['move','walk','control','turn','jump','run','speed','navigate'],controls,
      'ជ្រើសរើសការដើរទស្សនា ហើយប្រើប៊ូតុងបញ្ជាចលនាដើម្បីដើរ។ អូសដើម្បីមើលជុំវិញ ហើយចុចប៊ូតុងរត់ដើម្បីបង្កើនល្បឿន។ ចុចប៊ូតុងលោត រួចចុចម្ដងទៀតនៅពេលកំពុងនៅលើអាកាស ដើម្បីលោតបន្ថែមមួយដង។'),
    fact('What is its history?',['history','built','when','architect','date','hours','access','permission'],history,
      'កាលបរិច្ឆេទសាងសង់ ឈ្មោះស្ថាបត្យករ និងប្រវត្តិលម្អិតរបស់ទីតាំងនេះ មិនទាន់មានព័ត៌មានដែលបានផ្ទៀងផ្ទាត់ក្នុងកំណត់ត្រាទេ។ កំណត់ត្រានេះក៏មិនអាចបញ្ជាក់ម៉ោងបើក ឬការអនុញ្ញាតឱ្យចូលបច្ចុប្បន្នបានដែរ។'),
  ]};
}
