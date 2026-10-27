import type { QuizQuestion } from "./physics";

// ── Planet data ──────────────────────────────────────────────

export interface Planet {
  id: string;
  name: string;
  khmer: string | null;
  radiusKm: number;
  distanceAU: number;
  periodDays: number;
  color: string;
  moons: number;
  facts: string;
}

export const PLANETS: Planet[] = [
  { id: "mercury", name: "Mercury", khmer: "ផ្កាយពុធ", radiusKm: 2440, distanceAU: 0.39, periodDays: 88, color: "#a0a0a0", moons: 0, facts: "Smallest planet. No atmosphere. Surface temperatures swing from -180C at night to 430C in the day." },
  { id: "venus", name: "Venus", khmer: "ផ្កាយសុក្រ", radiusKm: 6052, distanceAU: 0.72, periodDays: 225, color: "#e8c060", moons: 0, facts: "Hottest planet due to thick CO2 atmosphere. Rotates backwards. A day on Venus is longer than its year." },
  { id: "earth", name: "Earth", khmer: "ផែនដី", radiusKm: 6371, distanceAU: 1.0, periodDays: 365, color: "#4080d0", moons: 1, facts: "Only planet known to support life. 71% of the surface is water. Tilted 23.5 degrees, which gives us seasons." },
  { id: "mars", name: "Mars", khmer: "ផ្កាយអង្គារ", radiusKm: 3390, distanceAU: 1.52, periodDays: 687, color: "#c06030", moons: 2, facts: "The Red Planet. Has the tallest volcano in the solar system (Olympus Mons, 22 km high). Thin CO2 atmosphere." },
  { id: "jupiter", name: "Jupiter", khmer: "ផ្កាយព្រហស្បតិ៍", radiusKm: 69911, distanceAU: 5.2, periodDays: 4333, color: "#d0a060", moons: 95, facts: "Largest planet. The Great Red Spot is a storm bigger than Earth. Made mostly of hydrogen and helium gas." },
  { id: "saturn", name: "Saturn", khmer: "ផ្កាយសៅរ៍", radiusKm: 58232, distanceAU: 9.54, periodDays: 10759, color: "#e0c880", moons: 146, facts: "Famous for its rings made of ice and rock. So light it would float in water if you had a big enough bathtub." },
  { id: "uranus", name: "Uranus", khmer: null, radiusKm: 25362, distanceAU: 19.2, periodDays: 30687, color: "#80c8d8", moons: 28, facts: "Tilted 98 degrees on its side. Has faint rings. Extremely cold at -224C. Discovered in 1781." },
  { id: "neptune", name: "Neptune", khmer: null, radiusKm: 24622, distanceAU: 30.07, periodDays: 60190, color: "#3060c0", moons: 16, facts: "Farthest planet. Has the fastest winds in the solar system (2100 km/h). Deep blue colour from methane." },
];

// ── Earth layers ─────────────────────────────────────────────

export interface EarthLayer {
  name: string;
  depthKm: number;
  thicknessKm: number;
  tempC: string;
  composition: string;
  color: string;
  state: string;
}

export const EARTH_LAYERS: EarthLayer[] = [
  { name: "Crust", depthKm: 0, thicknessKm: 35, tempC: "0 - 500", composition: "Silicate rocks, granite, basalt", color: "#8a7a60", state: "Solid" },
  { name: "Upper Mantle", depthKm: 35, thicknessKm: 635, tempC: "500 - 900", composition: "Peridotite, olivine", color: "#c06830", state: "Partially molten" },
  { name: "Lower Mantle", depthKm: 670, thicknessKm: 2230, tempC: "900 - 3700", composition: "Silicate minerals under extreme pressure", color: "#d04020", state: "Solid (viscous)" },
  { name: "Outer Core", depthKm: 2900, thicknessKm: 2200, tempC: "3700 - 4300", composition: "Liquid iron and nickel", color: "#e08020", state: "Liquid" },
  { name: "Inner Core", depthKm: 5100, thicknessKm: 1270, tempC: "4300 - 5500", composition: "Solid iron and nickel", color: "#f0c040", state: "Solid" },
];

// ── Moon phases ──────────────────────────────────────────────

export interface MoonPhase {
  name: string;
  angle: number;
  illumination: number;
  description: string;
}

export const MOON_PHASES: MoonPhase[] = [
  { name: "New Moon", angle: 0, illumination: 0, description: "Moon between Earth and Sun. The lit side faces away from us." },
  { name: "Waxing Crescent", angle: 45, illumination: 25, description: "A thin sliver of light appears on the right side." },
  { name: "First Quarter", angle: 90, illumination: 50, description: "Half the Moon is lit. The right half as seen from the Northern Hemisphere." },
  { name: "Waxing Gibbous", angle: 135, illumination: 75, description: "More than half is lit, growing toward full." },
  { name: "Full Moon", angle: 180, illumination: 100, description: "Earth is between Moon and Sun. We see the fully lit face." },
  { name: "Waning Gibbous", angle: 225, illumination: 75, description: "Light is shrinking. More than half still lit." },
  { name: "Last Quarter", angle: 270, illumination: 50, description: "Half lit again, but the left half this time." },
  { name: "Waning Crescent", angle: 315, illumination: 25, description: "A thin sliver on the left, heading back to new moon." },
];

// ── Seasons ──────────────────────────────────────────────────

export interface Season {
  name: string;
  month: string;
  tiltDirection: string;
  nhSeason: string;
  cambodiaSeason: string;
  description: string;
}

export const SEASONS: Season[] = [
  { name: "March Equinox", month: "March", tiltDirection: "sideways", nhSeason: "Spring", cambodiaSeason: "Hot season beginning", description: "Equal day and night everywhere. Sun is directly over the equator." },
  { name: "June Solstice", month: "June", tiltDirection: "toward sun", nhSeason: "Summer", cambodiaSeason: "Rainy season", description: "Northern Hemisphere tilts toward the Sun. Longest day in the north, shortest in the south." },
  { name: "September Equinox", month: "September", tiltDirection: "sideways", nhSeason: "Autumn", cambodiaSeason: "Peak rainy season", description: "Equal day and night again. Sun crosses back over the equator." },
  { name: "December Solstice", month: "December", tiltDirection: "away from sun", nhSeason: "Winter", cambodiaSeason: "Cool dry season", description: "Northern Hemisphere tilts away from the Sun. Shortest day in the north, longest in the south." },
];

// ── Computation functions ────────────────────────────────────

export function orbitalPosition(angleDeg: number, distance: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * distance, y: Math.sin(rad) * distance };
}

export function moonIllumination(angleDeg: number): number {
  return Math.round((1 - Math.cos((angleDeg * Math.PI) / 180)) * 50);
}

export function tideHeight(moonAngleDeg: number, pointAngleDeg: number): number {
  const diff = ((moonAngleDeg - pointAngleDeg) * Math.PI) / 180;
  return 0.5 + 0.5 * Math.cos(diff);
}

export function dayNightBoundary(rotationDeg: number): number {
  return ((rotationDeg % 360) + 360) % 360;
}

export function seasonTilt(positionIndex: number): number {
  const tilts = [0, 23.5, 0, -23.5];
  return tilts[positionIndex % 4];
}

// ── Quizzes ──────────────────────────────────────────────────

export const SOLAR_QUIZ: QuizQuestion[] = [
  { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars", "Earth"], answer: 1, why: "Mercury orbits at only 0.39 AU from the Sun, making it the closest planet." },
  { q: "Which planet is the largest in our solar system?", options: ["Saturn", "Neptune", "Jupiter", "Earth"], answer: 2, why: "Jupiter is the largest planet with a radius of about 70,000 km." },
  { q: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], answer: 1, why: "There are 8 planets. Pluto was reclassified as a dwarf planet in 2006." },
];

export const LAYERS_QUIZ: QuizQuestion[] = [
  { q: "What is the hottest layer of the Earth?", options: ["Crust", "Mantle", "Outer Core", "Inner Core"], answer: 3, why: "The inner core reaches temperatures of 4300 - 5500C, as hot as the surface of the Sun." },
  { q: "What state is the outer core?", options: ["Solid", "Liquid", "Gas", "Plasma"], answer: 1, why: "The outer core is liquid iron and nickel. Its flowing motion generates Earth's magnetic field." },
  { q: "How thick is Earth's crust?", options: ["About 3 km", "About 35 km", "About 350 km", "About 3500 km"], answer: 1, why: "Earth's crust averages about 35 km thick, thinner under oceans (5 - 10 km) and thicker under continents." },
];

export const DAYNIGHT_QUIZ: QuizQuestion[] = [
  { q: "How long does it take Earth to rotate once?", options: ["12 hours", "24 hours", "365 days", "30 days"], answer: 1, why: "Earth completes one full rotation on its axis every 24 hours, giving us one day-night cycle." },
  { q: "What causes day and night?", options: ["Earth orbiting the Sun", "Earth rotating on its axis", "The Moon blocking sunlight", "The Sun moving around Earth"], answer: 1, why: "Day and night are caused by Earth spinning on its axis. The side facing the Sun has day, the other has night." },
  { q: "When it is daytime in Cambodia, what time is it in Brazil?", options: ["Also daytime", "Nighttime", "Always sunset", "It depends on the season"], answer: 1, why: "Cambodia and Brazil are roughly on opposite sides of the Earth, so when one has day, the other has night." },
];

export const MOON_QUIZ: QuizQuestion[] = [
  { q: "How long is one lunar cycle (new moon to new moon)?", options: ["7 days", "14 days", "29.5 days", "365 days"], answer: 2, why: "The lunar cycle is about 29.5 days, which is why months are roughly 30 days long." },
  { q: "What causes moon phases?", options: ["Earth's shadow on the Moon", "The Moon changing shape", "The angle between Sun, Moon and Earth", "Clouds covering the Moon"], answer: 2, why: "Moon phases are caused by the changing angle. We see different amounts of the sunlit side as the Moon orbits." },
  { q: "During a full moon, where is the Moon relative to Earth and Sun?", options: ["Between Earth and Sun", "Behind the Sun", "On the opposite side of Earth from the Sun", "Next to the Sun"], answer: 2, why: "During a full moon, Earth is between the Sun and Moon, so we see the Moon's fully lit face." },
];

export const SEASONS_QUIZ: QuizQuestion[] = [
  { q: "What causes the seasons?", options: ["Earth's distance from the Sun", "Earth's axial tilt (23.5 degrees)", "The Moon's gravity", "Solar flares"], answer: 1, why: "Seasons are caused by Earth's 23.5 degree axial tilt, not distance. The tilt changes how directly sunlight hits each hemisphere." },
  { q: "When it is summer in Europe, what season is it in Australia?", options: ["Summer", "Winter", "Spring", "The same season"], answer: 1, why: "The hemispheres have opposite seasons. When the Northern Hemisphere tilts toward the Sun, the Southern Hemisphere tilts away." },
  { q: "Why does Cambodia not have strong winter/summer seasons?", options: ["It is too small", "It is near the equator", "It has too much water", "The Moon protects it"], answer: 1, why: "Cambodia is near the equator (about 12 degrees N), so the tilt effect is small. It has wet/dry seasons instead of hot/cold." },
];

export const TIDES_QUIZ: QuizQuestion[] = [
  { q: "What mainly causes ocean tides?", options: ["Wind", "Earth's rotation", "The Moon's gravity", "Underwater volcanoes"], answer: 2, why: "Tides are mainly caused by the Moon's gravitational pull on Earth's oceans, creating bulges of water." },
  { q: "How many high tides occur in most places each day?", options: ["1", "2", "3", "4"], answer: 1, why: "Most places get 2 high tides per day: one on the side facing the Moon and one on the opposite side." },
  { q: "What is a spring tide?", options: ["A tide that happens in spring", "An extra-high tide when Sun and Moon align", "A tide caused by rivers", "A very low tide"], answer: 1, why: "Spring tides happen when the Sun and Moon are aligned (new or full moon), combining their gravitational pull for higher tides." },
];

// ── Achievements ─────────────────────────────────────────────

export interface EarthSkyAchievementCtx {
  stationsVisited: Set<string>;
  quizzesPassed: Set<string>;
  quizzesPerfect: Set<string>;
  totalInteractions: number;
}

export interface EarthSkyAchievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  check: (ctx: EarthSkyAchievementCtx) => boolean;
}

export const EARTHSKY_ACHIEVEMENTS: EarthSkyAchievement[] = [
  { id: "first-star", icon: "⭐", name: "First Star", description: "Visit your first station", check: (c) => c.stationsVisited.size >= 1 },
  { id: "explorer", icon: "🔭", name: "Space Explorer", description: "Visit all 6 stations", check: (c) => c.stationsVisited.size >= 6 },
  { id: "quiz-star", icon: "🌟", name: "Quiz Star", description: "Pass any quiz", check: (c) => c.quizzesPassed.size >= 1 },
  { id: "astronomer", icon: "🪐", name: "Astronomer", description: "Pass all 6 quizzes", check: (c) => c.quizzesPassed.size >= 6 },
  { id: "perfectionist", icon: "💫", name: "Perfectionist", description: "Get a perfect score on any quiz", check: (c) => c.quizzesPerfect.size >= 1 },
  { id: "scientist", icon: "🧑‍🚀", name: "Space Scientist", description: "Interact with 20 things", check: (c) => c.totalInteractions >= 20 },
];

export const ALL_STATION_IDS = ["solar-system", "earth-layers", "day-night", "moon-phases", "seasons", "tides"] as const;
