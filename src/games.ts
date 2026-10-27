/**
 * Khmer traditional games (ល្បែងប្រជាប្រិយខ្មែរ) the play of Cambodian
 * festivals, above all Choul Chnam Thmey (Khmer New Year), when villages gather
 * to play together. Each game here comes with a small playable version so a
 * visitor can learn it by doing, and earn a Heritage Passport credential.
 *
 * This is a starting set see TODO.md ("Grow the Khmer Traditional Games") for
 * the many more the community can add.
 */
export type GamePlay = "aim" | "race" | "tug" | "catch";

export interface KhmerGame {
  id: string;
  /** Romanised name. */
  name: string;
  /** Khmer script. */
  khmer: string;
  /** English name. */
  english: string;
  /** Who plays. */
  players: string;
  /** When it's traditionally played. */
  occasion: string;
  /** How to play (short). */
  how: string;
  /** A little more meaning / cultural note. */
  desc: string;
  /** Which minigame drives it. */
  play: GamePlay;
  /** Accent colour. */
  color: string;
}

export const KHMER_GAMES: KhmerGame[] = [
  {
    id: "vay-kaom",
    name: "Vay Kaom",
    khmer: "វាយក្អម",
    english: "Hit the Pot",
    players: "Turns, with a cheering crowd",
    occasion: "Khmer New Year",
    how: "Players take turns trying to strike a suspended clay pot while blindfolded. The surrounding crowd calls out directions and cheers them on.",
    desc: "The shared anticipation and the crowd's guidance are central to this festival game. Our visible timing challenge is a solo interpretation of aiming and coordination.",
    play: "aim",
    color: "#e0a92f",
  },
  {
    id: "loat-bao",
    name: "Loat Bao",
    khmer: "លោតបាវ",
    english: "Sack Race",
    players: "Two or more racers",
    occasion: "Festivals & school fairs",
    how: "Racers hold a sack around their legs and hop towards a finish line. In the physical game, both feet stay inside the sack. Alternating the digital buttons is our simplified coordination challenge.",
    desc: "A simple, joyful race run at fairs across Cambodia the rice sack (បាវ) that carries the harvest becomes the finish-line challenge.",
    play: "race",
    color: "#2f8ae0",
  },
  {
    id: "teanh-prot",
    name: "Teanh Prot",
    khmer: "ទាញព្រ័ត្រ",
    english: "Tug of War",
    players: "Two teams",
    occasion: "Khmer New Year",
    how: "Two teams hold opposite ends of a rope and coordinate their pulling. The opposing team or a rope marker must cross the agreed line to decide the winner.",
    desc: "In Cambodia, Teanh Prot has recreational and ritual forms associated with New Year and community ceremonies. Meanings and local practices vary; the digital rhythm challenge focuses on pulling together.",
    play: "tug",
    color: "#4c8a3f",
  },
  {
    id: "chol-chhoung",
    name: "Chol Chhoung",
    khmer: "ចោលឈូង",
    english: "Scarf Tossing",
    players: "Two facing teams (often boys vs girls)",
    occasion: "Khmer New Year",
    how: "Two facing groups toss a knotted scarf, the chhoung. Catching, returning the scarf, songs and playful exchanges are part of the group game, with rules varying between communities.",
    desc: "Chol Chhoung brings people together during Khmer New Year through movement, singing and social exchange. Here, five incoming throws provide a short solo catching challenge.",
    play: "catch",
    color: "#d9662f",
  },
];

export function gameById(id: string): KhmerGame | undefined {
  return KHMER_GAMES.find((g) => g.id === id);
}

/** The learning credential earned by winning a game (e.g. "game:vay-kaom"). */
export const gameCredential = (id: string) => `game:${id}`;
