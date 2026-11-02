import {savedLocationAnswer,type LocationContext,type GuideSource} from './locationGuide';

/** Reject mixed-script model output; never silently delete parts of an answer. */
export function isKhmerGuideText(text:string):boolean {
  return /\p{Script=Khmer}/u.test(text) && !/[\u0e00-\u0e7f]/u.test(text)
    && [...text].every(char=>!/[\p{Letter}\p{Mark}]/u.test(char)||/\p{Script=Khmer}/u.test(char));
}

export const KHMER_GUIDE={
  name:'ពេញ',ask:'សួរ',language:'ភាសា',listen:'ស្តាប់',stop:'បញ្ឈប់',loadingVoice:'កំពុងរៀបចំសំឡេង…',
  saved:'ព័ត៌មានដែលបានរក្សាទុក',answer:'ចម្លើយពីបញ្ញាសិប្បនិម្មិត',checking:'កំពុងពិនិត្យព័ត៌មាន…',
  questionLabel:'សួរអំពីទីតាំងនេះ',placeholder:'សរសេរសំណួររបស់អ្នក…',suggested:'សំណួរណែនាំ',
  minimize:'បង្រួមមគ្គុទ្ទេសក៍',about:'អំពីពេញ · មគ្គុទ្ទេសក៍បញ្ញាសិប្បនិម្មិត',
  introduction:'សួស្តី! ខ្ញុំឈ្មោះពេញ ជាមគ្គុទ្ទេសក៍បញ្ញាសិប្បនិម្មិត។ អ្នកអាចសួរអំពីទីតាំងនេះបាន។',
  voice:'សួរដោយសំឡេង',voiceUnavailable:'មិនអាចប្រើសំឡេងបានទេ។ សូមជ្រើសរើសសំណួរ ឬវាយសំណួររបស់អ្នក។',
  narrationUnavailable:'មិនអាចអានជាសំឡេងបានទេ។ អ្នកនៅតែអាចអានចម្លើយបាន។',
  listening:'កំពុងស្តាប់… ចុចដើម្បីបញ្ឈប់',previous:'មុន',next:'បន្ទាប់',retryVoice:'សាកល្បងសំឡេងម្តងទៀត',
  another:'សួរបន្ថែម',close:'បិទមគ្គុទ្ទេសក៍',back:'ត្រឡប់ទៅព័ត៌មាន',page:'ទំព័រ',
  changeLanguage:'ចុចដើម្បីប្តូរភាសា',credit:'តួអង្គបញ្ញាសិប្បនិម្មិត · មជ្ឈមណ្ឌលខេមបូវើស',
  privacy:'សំណួរ និងអត្ថបទសម្រាប់អានត្រូវបានផ្ញើទៅសេវាបញ្ញាសិប្បនិម្មិត',
  voicePrivacy:'ការបញ្ចូលសំឡេងអាចប្រើសេវារបស់កម្មវិធីរុករក',
  disclosure:'ពេញជាតួអង្គបញ្ញាសិប្បនិម្មិតរបស់មជ្ឈមណ្ឌលខេមបូវើស។ សំឡេងបច្ចុប្បន្នជាសំឡេងសិប្បនិម្មិតដែលប្រហាក់ប្រហែល។ សំណួរ និងអត្ថបទដែលអ្នកស្នើឱ្យអានត្រូវបានផ្ញើទៅសេវាបញ្ញាសិប្បនិម្មិត។ ការបញ្ចូលសំឡេងអាចប្រើសេវាសំឡេងរបស់កម្មវិធីរុករក។',
} as const;

export const KHMER_LANGUAGE_NAMES:Record<string,string>={en:'អង់គ្លេស',km:'ខ្មែរ',fr:'បារាំង',zh:'ចិន'};
const titles:Record<string,string>={
  'wat-phnom':'វត្តភ្នំ','naga-staircase':'ជណ្ដើរនាគ','flower-clock':'នាឡិកាផ្កា',
  'naga-balustrade':'បង្កាន់ដៃនាគ','guardian-lion':'រូបសំណាកតោ','central-stupa':'ព្រះចេតិយ',
  'main-vihara':'ព្រះវិហារ','city-overlook':'ទិដ្ឋភាពរាជធានី',
};
export function khmerGuideTitle(context:LocationContext){return titles[context.objectId??context.locationId]??'ទីតាំងនេះ';}
export function khmerObjectTitle(id:string){return titles[id]??'ព័ត៌មាន';}
export function khmerSourceTitle(source?:GuideSource){
  return source?.url?.includes('cambodiamuseum.info')?'សារមន្ទីរជាតិកម្ពុជា · ប្រវត្តិវត្តភ្នំ':'កំណត់ត្រាទីតាំងរបស់មជ្ឈមណ្ឌលខេមបូវើស';
}

const questions:Record<string,string>={
  'Tell me about the history':'សូមប្រាប់អំពីប្រវត្តិ',
  'Tell me about Wat Phnom history':'សូមប្រាប់អំពីប្រវត្តិវត្តភ្នំ',
  'What am I looking at?':'តើខ្ញុំកំពុងមើលអ្វី?',
  'What is the flower clock?':'តើនាឡិកាផ្កាជាអ្វី?',
  'Why are some areas blurry?':'ហេតុអ្វីបានជាតំបន់ខ្លះមិនច្បាស់?',
  'How do I explore?':'តើខ្ញុំអាចដើរទស្សនាដូចម្តេច?',
  'Tell me about Naga balustrade':'សូមប្រាប់អំពីបង្កាន់ដៃនាគ',
  'Tell me about Guardian lion':'សូមប្រាប់អំពីរូបសំណាកតោ',
};
export function khmerGuideQuestion(question:string){return questions[question]??'សូមប្រាប់អំពីទីតាំងនេះ';}

const history='តាមរឿងព្រេង វត្តភ្នំត្រូវបានបង្កើតឡើងនៅឆ្នាំ១៣៧២ ហើយទាក់ទងនឹងការរកឃើញព្រះពុទ្ធរូបដោយលោកយាយពេញ។ សារមន្ទីរជាតិកម្ពុជាកត់ត្រាថា ព្រះវិហារត្រូវបានសាងសង់ឡើងវិញជាច្រើនដង រួមទាំងនៅឆ្នាំ១៩២៦។ រឿងព្រេងនេះមិនបញ្ជាក់ពីកាលបរិច្ឆេទសាងសង់វត្ថុដែលអ្នកកំពុងមើលទេ។';
const naga='រូបនាគនេះជាបង្កាន់ដៃនៅក្បែរជណ្ដើរវត្តភ្នំ។ អ្នកអាចមើលរាងកាយកោងរបស់នាគតាមជណ្ដើររហូតដល់ក្បាលនាគ។ កាលបរិច្ឆេទសាងសង់ និងការពន្យល់អំពីនិមិត្តរូបរបស់វា មិនទាន់មានព័ត៌មានដែលបានផ្ទៀងផ្ទាត់នៅក្នុងកំណត់ត្រានេះទេ។';
const lion='រូបសំណាកតោនេះឈរនៅក្បែរផ្លូវឡើងទៅព្រះវិហារ។ សូមសង្កេតក្បាល ជើងមុខ និងជើងទម្ររបស់វា។ កាលបរិច្ឆេទសាងសង់ និងឈ្មោះសិល្បកររបស់រូបសំណាកនេះ មិនទាន់មានព័ត៌មានដែលបានផ្ទៀងផ្ទាត់ទេ។';
const missing='រូបភាពបីវិមាត្រនេះមិនទាន់ពេញលេញទេ ជាពិសេសនៅផ្នែកខាងក្រោយ និងចំហៀង។ រូបថតបន្ថែមដែលច្បាស់ និងមានផ្នែកត្រួតគ្នា អាចជួយកែលម្អការសាងសង់រូបភាពបីវិមាត្រនៅពេលក្រោយបាន។';
const unknown='ខ្ញុំមិនទាន់មានព័ត៌មានដែលបានផ្ទៀងផ្ទាត់សម្រាប់សំណួរនេះនៅក្នុងកំណត់ត្រាទីតាំងទេ។ សូមជ្រើសរើសសំណួរណែនាំ ឬសួរអំពីវត្ថុនៅទីនេះ។';

/** A small Khmer fallback grounded in the same saved notes; draft translations
 * require native editorial review, but are never replaced by English or Thai. */
export function savedKhmerLocationAnswer(context:LocationContext,question=''):{text:string;sources:GuideSource[]} {
  let query=question;
  const original=Object.entries(questions).find(([,translated])=>translated===query)?.[0];
  if(original)query=original;
  else if(/ប្រវត្តិ|សាងសង់|ឆ្នាំ/.test(query))query='history';
  else if(/មិនច្បាស់|ព្រិល/.test(query))query='blurry';
  else if(/ដើរ|ទស្សនា/.test(query))query='explore';
  else if(/អ្វី|នាគ|តោ|នាឡិកា/.test(query))query='What am I looking at?';
  const saved=savedLocationAnswer(context,query);
  const fact=context.facts.find(item=>item.text===saved.text);
  if(!fact)return {text:question.trim()?unknown:KHMER_GUIDE.introduction,sources:[]};
  if(context.objectId&&fact===context.facts[0])return {text:context.objectId==='guardian-lion'?lion:naga,sources:fact.sources};
  let text=unknown;
  if(fact.keywords.includes('history'))text=history;
  else if(fact.question==='Why are some areas blurry?')text=missing;
  else if(fact.question==='How do I explore?')text='អូសដើម្បីមើលជុំវិញ ហើយប្រើប៊ូតុងបញ្ជាចលនា ដើម្បីដើរទស្សនា។ នៅពេលប្រើឧបករណ៍ការពិតនិម្មិត ប្រើដងបញ្ជាខាងឆ្វេងដើម្បីដើរ និងដងបញ្ជាខាងស្ដាំដើម្បីបង្វិលទិស។';
  else if(context.locationId==='flower-clock')text='រូបភាពនេះបង្ហាញនាឡិកាធំមួយនៅក្នុងសួនបៃតងក្បែរវត្តភ្នំ។ អ្នកអាចមើលលេខ និងទ្រនិចលើផ្ទៃនាឡិកា។ កាលបរិច្ឆេទដំឡើង អ្នករចនា និងស្ថានភាពដំណើរការបច្ចុប្បន្នរបស់នាឡិកា មិនទាន់មានព័ត៌មានដែលបានផ្ទៀងផ្ទាត់ទេ។';
  else if(context.locationId==='naga-staircase'||context.locationId==='wat-phnom')text='នេះជារូបភាពបីវិមាត្រនៃជណ្ដើរនាគនៅវត្តភ្នំ។ បង្កាន់ដៃនាគអមសងខាងជណ្ដើរ ហើយមានរូបសំណាកនៅតាមផ្លូវឡើង។ កំណត់ត្រានេះមិនទាន់មានការពន្យល់ដែលបានផ្ទៀងផ្ទាត់អំពីនិមិត្តរូប និងកាលបរិច្ឆេទសាងសង់របស់វាទេ។';
  else if(['central-stupa','main-vihara','city-overlook'].includes(context.locationId))text=`នេះជាគំរូបីវិមាត្រសម្រាប់បង្ហាញ${khmerGuideTitle(context)}នៅវត្តភ្នំ។ គំរូនេះត្រូវបានសម្រួល ហើយមិនមែនជាការស្ទង់វាស់ជាក់លាក់ទេ។ ព័ត៌មានប្រវត្តិសាស្ត្រលម្អិតអំពីទីតាំងនេះ មិនទាន់មានការផ្ទៀងផ្ទាត់នៅក្នុងកំណត់ត្រាទេ។`;
  return {text,sources:text===unknown?[]:fact.sources};
}
