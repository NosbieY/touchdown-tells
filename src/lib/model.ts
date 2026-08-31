import { LEAGUE_AVG_SCORE, HOME_FIELD_EDGE, TEAM_MAP } from "@/data/teams";
import { SCHEDULE, type Game } from "@/data/schedule";

export interface Rating {
  off: number;
  def: number;
}

export type Ratings = Record<string, Rating>;

export interface Result {
  homeScore: number;
  awayScore: number;
}

export type Results = Record<string, Result>;

export function baselineRatings(overrides: Record<string, Rating> = {}): Ratings {
  const r: Ratings = {};
  for (const abbr of Object.keys(TEAM_MAP)) {
    const o = overrides[abbr];
    r[abbr] = o
      ? { off: o.off, def: o.def }
      : { off: TEAM_MAP[abbr].off, def: TEAM_MAP[abbr].def };
  }
  return r;
}

export interface Prediction {
  homeProb: number;
  awayProb: number;
  margin: number; // expected home margin
  projHome: number;
  projAway: number;
  favorite: string;
  underdog: string;
  reasons: string[];
}

export function predictGame(game: Game, ratings: Ratings): Prediction {
  const h = ratings[game.home];
  const a = ratings[game.away];
  const expHome = LEAGUE_AVG_SCORE + h.off - a.def;
  const expAway = LEAGUE_AVG_SCORE + a.off - h.def;
  const margin = expHome - expAway + HOME_FIELD_EDGE;
  const homeProb = 1 / (1 + Math.pow(10, -margin / 16));
  const totalHome = expHome + HOME_FIELD_EDGE / 2;
  const totalAway = expAway - HOME_FIELD_EDGE / 2;

  const favorite = margin >= 0 ? game.home : game.away;
  const underdog = margin >= 0 ? game.away : game.home;

  const reasons: string[] = [];
  const offEdge = h.off - a.off;
  const defEdge = h.def - a.def;
  if (Math.abs(offEdge) >= 1)
    reasons.push(`${offEdge > 0 ? game.home : game.away} offense edge (${Math.abs(offEdge).toFixed(1)} pts)`);
  if (Math.abs(defEdge) >= 1)
    reasons.push(`${defEdge > 0 ? game.home : game.away} defense edge (${Math.abs(defEdge).toFixed(1)} pts)`);
  reasons.push(`${game.home} home field (+${HOME_FIELD_EDGE})`);
  if (Math.abs(margin) < 3) reasons.push("Near pick'em — ratings almost even");

  return {
    homeProb,
    awayProb: 1 - homeProb,
    margin,
    projHome: Math.max(3, totalHome),
    projAway: Math.max(3, totalAway),
    favorite,
    underdog,
    reasons,
  };
}

const K = 0.35;

/** Elo-style update: shift each unit toward what actually happened. */
export function applyResult(ratings: Ratings, game: Game, result: Result): void {
  const h = ratings[game.home];
  const a = ratings[game.away];
  const expHome = LEAGUE_AVG_SCORE + h.off - a.def + HOME_FIELD_EDGE / 2;
  const expAway = LEAGUE_AVG_SCORE + a.off - h.def - HOME_FIELD_EDGE / 2;

  const homeScoringResidual = result.homeScore - expHome;
  const awayScoringResidual = result.awayScore - expAway;

  h.off += (K * homeScoringResidual) / 10;
  a.def -= (K * homeScoringResidual) / 10;
  a.off += (K * awayScoringResidual) / 10;
  h.def -= (K * awayScoringResidual) / 10;
}

/** Ratings as they stand entering `week`, after replaying earlier results. */
export function ratingsEnteringWeek(
  week: number,
  results: Results,
  overrides: Record<string, Rating> = {},
): Ratings {
  const ratings = baselineRatings(overrides);
  for (const game of SCHEDULE) {
    if (game.week >= week) break;
    const res = results[game.id];
    if (res) applyResult(ratings, game, res);
  }
  return ratings;
}

/** Ratings after all entered results (through week 18). */
export function finalRatings(
  results: Results,
  overrides: Record<string, Rating> = {},
): Ratings {
  return ratingsEnteringWeek(19, results, overrides);
}

export interface UpsetCandidate {
  game: Game;
  prediction: Prediction;
  underdogProb: number;
  note: string;
}

/** Underdogs with at least ~30% win probability, ranked by probability. */
export function upsetWatch(week: number, games: Game[], ratings: Ratings): UpsetCandidate[] {
  const candidates: UpsetCandidate[] = [];
  for (const game of games) {
    const p = predictGame(game, ratings);
    const underdogProb = p.favorite === game.home ? p.awayProb : p.homeProb;
    if (underdogProb < 0.3) continue;

    const notes: string[] = [];
    if (p.underdog === game.home) notes.push("underdog at home");
    if (Math.abs(p.margin) < 3) notes.push("ratings nearly even");
    const dog = ratings[p.underdog];
    const fav = ratings[p.favorite];
    if (dog.def > fav.def + 1) notes.push("underdog has the better defense");
    if (dog.off > fav.off) notes.push("underdog actually grades out better on offense");
    candidates.push({
      game,
      prediction: p,
      underdogProb,
      note: notes.length ? notes.join(" · ") : "live underdog",
    });
  }
  return candidates.sort((a, b) => b.underdogProb - a.underdogProb);
}
