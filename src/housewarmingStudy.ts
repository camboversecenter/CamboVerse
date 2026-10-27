export const HOUSEWARMING_BOOKS = [
  { title: 'ACCU Nara — 2005 training report', detail: '“The Ceremony for Entering a New House”, printed pp. 63–64. Consulted indexed passages describe regional examples, not a nationwide rule.', url: 'https://www.nara.accu.or.jp/img/report/grouptraining/2005.pdf' },
  { title: 'Cambodian Wooden Houses, 1,500 Years of Khmer Heritage', detail: 'Darryl L. Collins and Sokol Hok, SIPAR, 2022. Angkor Database’s book review was consulted; the full book was not available.', url: 'https://angkordatabase.asia/books/cambodian-wooden-houses-1-500-years-of-khmer-heritage' },
];
export const HOUSEWARMING_OBJECTS = {
  threshold: { name: 'Stair and threshold', note: 'Explore the entrance to this raised timber house. Its dimensions and layout are illustrative, not a surveyed historic building.' },
  offerings: { name: 'Offering trays', note: 'An illustrative food arrangement. These fruits and their number are not a prescribed ritual inventory.' },
  seats: { name: 'Monks’ seating', note: 'Four places represent the Svay Rieng example in the report; this number is not a universal rule. People are not modelled.' },
  water: { name: 'Blessing water', note: 'The report describes water sprinkled on the householders. The vessel and dipper here are interpretations.' },
  post: { name: 'Central post', note: 'The achar addresses the central post in the described ceremony. Its timber form makes the relationship between house-building and household life visible.' },
  meal: { name: 'Meal setting', note: 'Some families invite the monks back for a meal the next morning in the reported example. Dishes here are illustrative.' },
} as const;
export type HousewarmingObject = keyof typeof HOUSEWARMING_OBJECTS;
export const HOUSEWARMING_ITEMS: Record<string, HousewarmingObject[]> = {
  offerings: ['threshold','offerings'],
  chanting: ['seats','water'],
  'central-post': ['post'],
  meal: ['meal'],
};
