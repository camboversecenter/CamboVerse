/**
 * Khmer traditional games (ល្បែងប្រជាប្រិយខ្មែរ) — the play of Cambodian
 * festivals, above all Choul Chnam Thmey (Khmer New Year), when villages gather
 * to play together. Each game here comes with a small playable version so a
 * visitor can learn it by doing, and earn a Heritage Passport credential.
 *
 * This is a starting set — see TODO.md ("Grow the Khmer Traditional Games") for
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
  /** A little more — meaning / cultural note. */
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
    how: "A blindfolded player is turned around, then swings a long stick to smash a clay pot hung from a pole — steered only by the shouts of the crowd. Time your swing to land the hit.",
    desc: "Vay Kaom turns everyone into a caller — half the fun is the crowd yelling directions, true and false, as the blindfolded player flails at the swinging pot.",
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
    how: "Climb into a rice sack and hop to the finish line without falling. Tap left–right–left–right in rhythm to hop; first across the line wins.",
    desc: "A simple, joyful race run at fairs across Cambodia — the rice sack (បាវ) that carries the harvest becomes the finish-line challenge.",
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
    how: "Two teams pull a rope; drag the centre marker past your line to win. Tap to pull — keep the pressure on, because the other side never stops.",
    desc: "More than a game — Teanh Prot is an age-old ritual played to mark the turning of the seasons, its outcome once believed to help call the coming rains.",
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
    how: "A rolled-up krama (the chhoung) is tossed back and forth between two lines of players. If you drop it, your team pays a penalty—usually having to sing a song or dance! Tap exactly when the chhoung is in the catch zone to grab it.",
    desc: "A joyous courtship game played during Khmer New Year. It brings young people together with singing, dancing, and teasing as the chhoung flies between the teams.",
    play: "catch",
    color: "#d9662f",
  },
];

export function gameById(id: string): KhmerGame | undefined {
  return KHMER_GAMES.find((g) => g.id === id);
}

/** The learning credential earned by winning a game (e.g. "game:vay-kaom"). */
export const gameCredential = (id: string) => `game:${id}`;
