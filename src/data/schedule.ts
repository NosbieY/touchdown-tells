import { TEAMS } from "./teams";

export interface Game {
  id: string;
  week: number;
  home: string;
  away: string;
}

const N = 32;
const ROUNDS = 18;
const BYE_WEEKS = [5, 6, 7, 8, 9, 10, 11, 12]; // 4 teams off each week
const GAMES_ON_BYE_WEEK = 2; // games removed per bye week

/**
 * Builds a structurally valid 18-week slate: circle-method round robin
 * (no repeat matchups), one bye per team in weeks 5-12, balanced home/away.
 * Deterministic via seeded shuffle so the app renders the same schedule
 * on every load.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RawGame {
  a: number;
  b: number;
}

function circleRounds(): RawGame[][] {
  const fixed = 0;
  const rest = Array.from({ length: N - 1 }, (_, i) => i + 1);
  const rounds: RawGame[][] = [];
  for (let r = 0; r < ROUNDS; r++) {
    const rot = rest.map((_, i) => rest[(i + r) % rest.length]);
    const games: RawGame[] = [{ a: fixed, b: rot[0] }];
    for (let i = 1; i <= (N - 2) / 2; i++) {
      games.push({ a: rot[i], b: rot[rot.length - i] });
    }
    rounds.push(games);
  }
  return rounds;
}

/** Pick bye games with backtracking so every team gets exactly one bye. */
function assignByes(rounds: RawGame[][], seed: number): Set<string> {
  const rand = mulberry32(seed);
  const removed = new Set<string>();
  const byed = new Set<number>();
  const key = (w: number, g: RawGame) => `${w}:${g.a}-${g.b}`;

  const ok = (weekIdx: number): boolean => {
    if (weekIdx === BYE_WEEKS.length) return byed.size === N;
    const week = BYE_WEEKS[weekIdx] - 1;
    const candidates = rounds[week].filter((g) => !byed.has(g.a) && !byed.has(g.b));
    const shuffled = [...candidates].sort(() => rand() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const g1 = shuffled[i];
        const g2 = shuffled[j];
        const teams = [g1.a, g1.b, g2.a, g2.b];
        if (new Set(teams).size !== 4) continue;
        teams.forEach((t) => byed.add(t));
        removed.add(key(week, g1));
        removed.add(key(week, g2));
        if (ok(weekIdx + 1)) return true;
        teams.forEach((t) => byed.delete(t));
        removed.delete(key(week, g1));
        removed.delete(key(week, g2));
      }
    }
    return false;
  };

  if (!ok(0)) throw new Error("bye assignment failed");
  return removed;
}

function buildSchedule(): Game[] {
  const games: Game[] = [];
  const removed = assignByes(circleRounds(), 20260904);
  const rounds = circleRounds();
  const homeCount = new Array(N).fill(0);
  const abbr = TEAMS.map((t) => t.abbr);

  for (let w = 0; w < ROUNDS; w++) {
    for (const g of rounds[w]) {
      const k = `${w}:${g.a}-${g.b}`;
      if (removed.has(k)) continue;
      // Home team = the one with fewer home games so far (ties: lower index).
      const homeIdx =
        homeCount[g.a] === homeCount[g.b]
          ? g.a
          : homeCount[g.a] < homeCount[g.b]
            ? g.a
            : g.b;
      const awayIdx = homeIdx === g.a ? g.b : g.a;
      homeCount[homeIdx]++;
      games.push({
        id: `w${w + 1}-${abbr[awayIdx]}@${abbr[homeIdx]}`,
        week: w + 1,
        home: abbr[homeIdx],
        away: abbr[awayIdx],
      });
    }
  }

  // Sanity checks — throw loudly at build time if the slate is invalid.
  const played = new Map<string, number>();
  const seenPairs = new Set<string>();
  for (const g of games) {
    played.set(g.home, (played.get(g.home) ?? 0) + 1);
    played.set(g.away, (played.get(g.away) ?? 0) + 1);
    const pair = [g.home, g.away].sort().join("-");
    if (seenPairs.has(pair)) throw new Error(`repeat matchup ${pair}`);
    seenPairs.add(pair);
  }
  for (const t of TEAMS) {
    if (played.get(t.abbr) !== 17)
      throw new Error(`${t.abbr} has ${played.get(t.abbr)} games`);
  }
  return games;
}

export const SCHEDULE: Game[] = buildSchedule();
export const WEEKS = Array.from({ length: ROUNDS }, (_, i) => i + 1);

export function gamesForWeek(week: number): Game[] {
  return SCHEDULE.filter((g) => g.week === week);
}

export function byeTeams(week: number): string[] {
  const playing = new Set(gamesForWeek(week).flatMap((g) => [g.home, g.away]));
  return TEAMS.filter((t) => !playing.has(t.abbr)).map((t) => t.abbr);
}
