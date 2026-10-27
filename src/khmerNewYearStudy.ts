export const NEW_YEAR_BOOKS = [
  {title:'Khmer New Year · National Museum of Cambodia',detail:'Museum description of Maha Sangkran and family observance.',url:'https://nmc.gov.kh/index.php/khmer-new-year'},
  {title:'Traditional Khmer New Year · National Radio of Cambodia',detail:'14 April 2026 account of the three days, sand mounds, water blessings and folk games. Indexed article text consulted.',url:'https://rnk.gov.kh/article/66127'},
  {title:'Tugging rituals and games · Ministry of Culture and Fine Arts',detail:'21 April 2026 account of the recreational and ritual meanings of tugging. Local practices vary.',url:'https://mcfa.gov.kh/world-heritage/tug-of-war/'},
];
export const NEW_YEAR_OBJECTS = {
  welcome:{name:'Welcome offerings',note:'Fruit and prepared offerings mark welcoming the year. This display introduces a home custom in a shared learning courtyard; quantities and decoration are artistic choices.'},
  generosity:{name:'Food and generosity',note:'Giving to elders and people in need, and food offerings to monks, are related forms of generosity. They are not interchangeable rituals.'},
  sand:{name:'Sand mounds',note:'Sand mounds are built at pagodas as a merit-making practice. Our central mound and four smaller mounds illustrate one arrangement, not a rule for every pagoda.'},
  water:{name:'Water bowl and dipper',note:'Fragrant water is associated with respectfully bathing Buddha images and honouring elders. This object display does not reproduce the rite or treat it as a water fight.'},
  games:{name:'Tugging rope and chhoung cloth',note:'A rope represents tugging; the knotted cloth represents chhoung, a throwing-and-catching game. These are two different activities. Tugging can also have ritual meaning; rules and songs vary.'},
} as const;
export type NewYearObject=keyof typeof NEW_YEAR_OBJECTS;
export const NEW_YEAR_ITEMS:Record<string,NewYearObject[]>={
  welcome:['welcome'],generosity:['generosity'],sand:['sand'],water:['water'],games:['games'],
};
export const newYearAsset=(detail:'normal'|'ultra')=>`/models/local/khmer-new-year-v1/khmer-new-year-${detail}.glb?v=1`;
