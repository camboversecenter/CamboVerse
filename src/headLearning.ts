export type HeadLearning = {
  summary: string; location: string; function: string;
  subparts: string[]; limitations: string;
  references: { title: string; url: string }[];
};

export const HEAD_LEARNING: Record<string, HeadLearning> = {
  eyes: {
    summary: 'The eyes focus light onto the retina, where sensory cells produce signals that travel to the brain through the optic nerves.',
    location: 'The two eyes sit in the bony sockets (orbits) at the front of the skull.',
    function: 'The cornea and lens focus incoming light. The retina converts it into electrical signals; the brain interprets these signals as vision.',
    subparts: [
      'Cornea: transparent front surface that bends incoming light.',
      'Iris and pupil: the iris controls the size of the pupil, the opening admitting light.',
      'Lens: helps focus light onto the retina.',
      'Retina: light-sensitive lining containing photoreceptors.',
      'Optic nerve: carries visual signals toward the brain.',
    ],
    limitations: 'The paired-eye model shows simplified shells and internal structures. It does not simulate vision, focusing or retinal cells. Some internal parts require a cutaway to see. Use the separate Eye exhibit for further study.',
    references: [{title:'National Eye Institute — How the eyes work',url:'https://www.nei.nih.gov/eye-health-information/healthy-vision/how-eyes-work'}],
  },
  ears: {
    summary: 'The ears turn sound vibrations into nerve signals. Structures in the inner ear also help the body sense movement and maintain balance.',
    location: 'The outer ears are on the sides of the head. The middle and inner ears lie within the skull’s temporal bones.',
    function: 'Sound travels along the ear canal to the eardrum. Three small bones transmit vibrations to the fluid-filled cochlea, where sensory hair cells generate signals carried to the brain.',
    subparts: [
      'Pinna and ear canal: collect and guide sound toward the eardrum.',
      'Eardrum and ossicles: the membrane and malleus, incus and stapes transmit vibrations.',
      'Cochlea: contains the sensory structures used for hearing.',
      'Vestibule and semicircular canals: contribute to sensing head position and movement.',
      'Auditory (Eustachian) tube: connects the middle ear with the upper throat and helps equalize pressure.',
    ],
    limitations: 'The room shows both ears; extraction focuses on the right ear for closer study. Small structures are simplified and thickened for visibility; the cochlear spiral is illustrative. Hair cells, fluid motion and the complete nerve pathways are not modeled.',
    references: [{title:'NIDCD — How do we hear?',url:'https://www.nidcd.nih.gov/health/how-do-we-hear'}, {title:'NIDCD — Balance disorders',url:'https://www.nidcd.nih.gov/health/balance-disorders'}],
  },
  nose: {
    summary: 'The nasal passages help warm, moisten and filter inhaled air. Sensory cells high in the nasal cavity detect odor molecules.',
    location: 'The nasal cavity lies behind the external nose, above the mouth, and opens toward the throat.',
    function: 'Air passes over moist lining inside the nose. Odor molecules stimulate olfactory sensory neurons, which send signals to the brain. Smell also contributes to the flavour of food.',
    subparts: [
      'Septum: divides the nasal cavity into right and left passages.',
      'Turbinates (conchae): curved shelves covered with lining that increase contact between air and the nasal surfaces.',
      'Nasal lining: helps condition air and trap particles.',
      'Olfactory region: a small sensory area high inside the nasal cavity.',
    ],
    limitations: 'This is an open internal teaching view, not a realistic external nose. Walls and shelves are simplified. Sinuses, microscopic cilia and complete olfactory nerve pathways are not represented.',
    references: [{title:'NIDCD — How smell works',url:'https://www.nidcd.nih.gov/health/smell-disorders'}, {title:'OpenStax — Organs of the respiratory system',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system'}],
  },
  mouth: {
    summary: 'The mouth prepares food for swallowing and begins digestion. The tongue helps move food, supports taste and works with other structures to form speech.',
    location: 'The oral cavity is below the nasal cavity, between the jaws, and opens into the throat at the back.',
    function: 'The tongue moves food and mixes it with saliva. Taste buds in the tongue and other areas of the mouth and throat detect taste qualities; smell also contributes to flavour.',
    subparts: [
      'Tongue: muscular structure involved in moving food, swallowing and speech.',
      'Hard and soft palate: form the roof of the mouth; the soft palate helps close the passage toward the nose during swallowing.',
      'Uvula: the small projection hanging from the soft palate.',
      'Salivary glands: the paired parotid, submandibular and sublingual glands produce saliva.',
      'Ducts: carry saliva into the mouth. Saliva moistens food and supports digestion and oral health.',
    ],
    limitations: 'This open cutaway groups the tongue, palate, partial cheek walls and major glands for study. Extracted-mouth teeth and gums can be shown or hidden. The 32 illustrative adult crowns do not include roots or internal dental tissues. Duct paths and tissue shapes are simplified; taste buds and swallowing motion are not modeled. The body view uses the skeleton’s teeth.',
    references: [{title:'NIDCR — Saliva and salivary glands',url:'https://www.nidcr.nih.gov/health-info/saliva-salivary-gland-disorders'}, {title:'NIDCD — How taste works',url:'https://www.nidcd.nih.gov/health/taste-disorders'}, {title:'OpenStax — Mouth, pharynx and esophagus',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-3-the-mouth-pharynx-and-esophagus'}],
  },
};
