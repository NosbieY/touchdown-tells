import { LEAGUE_AVG_SCORE, HOME_FIELD_EDGE, TEAM_MAP } from "@/data/teams";
import { SCHEDULE, type Game } from "@/data/schedule";
import { pairKey, type MarketLines } from "@/lib/kalshi.functions";

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
      : { off: TEAM_MAP[abbr]!.off, def: TEAM_MAP[abbr]!.def };
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
  const h = ratings[game.home]!;
  const a = ratings[game.away]!;
  const hfa = game.intl ? 0 : HOME_FIELD_EDGE;
  const expHome = LEAGUE_AVG_SCORE + h.off - a.def;
  const expAway = LEAGUE_AVG_SCORE + a.off - h.def;
  const margin = expHome - expAway + hfa;
  const homeProb = 1 / (1 + Math.pow(10, -margin / 16));
  const totalHome = expHome + hfa / 2;
  const totalAway = expAway - hfa / 2;

  const favorite = margin >= 0 ? game.home : game.away;
  const underdog = margin >= 0 ? game.away : game.home;

  const reasons: string[] = [];
  const offEdge = h.off - a.off;
  const defEdge = h.def - a.def;
  if (Math.abs(offEdge) >= 1)
    reasons.push(`${offEdge > 0 ? game.home : game.away} offense edge (${Math.abs(offEdge).toFixed(1)} pts)`);
  if (Math.abs(defEdge) >= 1)
    reasons.push(`${defEdge > 0 ? game.home : game.away} defense edge (${Math.abs(defEdge).toFixed(1)} pts)`);
  if (game.intl)
    reasons.push(`Neutral site — ${game.intl.city}, ${game.intl.country} (no home edge)`);
  else reasons.push(`${game.home} home field (+${HOME_FIELD_EDGE})`);
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
  const h = ratings[game.home]!;
  const a = ratings[game.away]!;
  const hfa = game.intl ? 0 : HOME_FIELD_EDGE;
  const expHome = LEAGUE_AVG_SCORE + h.off - a.def + hfa / 2;
  const expAway = LEAGUE_AVG_SCORE + a.off - h.def - hfa / 2;

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
  favorite: string;
  underdog: string;
  underdogProb: number;
  source: "market" | "model";
  note: string;
}

/**
 * Underdogs with at least ~30% win probability, ranked by probability.
 * When a Kalshi market line exists for a game, the favorite/underdog and
 * probability come from the market (the real-money consensus) rather than
 * our internal rating model, so Upset Watch never contradicts Kalshi.
 * Games with no market line fall back to the model's own prediction.
 */
export function upsetWatch(
  week: number,
  games: Game[],
  ratings: Ratings,
  market?: MarketLines,
): UpsetCandidate[] {
  const candidates: UpsetCandidate[] = [];
  for (const game of games) {
    const p = predictGame(game, ratings);
    const line = market?.[pairKey(game.home, game.away)];

    let favorite: string;
    let underdog: string;
    let underdogProb: number;
    let source: "market" | "model";

    if (line) {
      favorite = line.favorite;
      underdog = line.underdog;
      underdogProb = line.probs[underdog] ?? 1 - Math.max(...Object.values(line.probs));
      source = "market";
    } else {
      favorite = p.favorite;
      underdog = p.underdog;
      underdogProb = p.favorite === game.home ? p.awayProb : p.homeProb;
      source = "model";
    }

    if (underdogProb < 0.3) continue;

    const notes: string[] = [];
    if (game.intl) notes.push(`neutral site in ${game.intl.city}`);
    else if (underdog === game.home) notes.push("underdog at home");
    if (source === "market" && favorite !== p.favorite)
      notes.push("our model actually favors the other side");
    else if (Math.abs(p.margin) < 3) notes.push("ratings nearly even");
    const dog = ratings[underdog]!;
    const fav = ratings[favorite]!;
    if (dog.def > fav.def + 1) notes.push("underdog has the better defense");
    if (dog.off > fav.off) notes.push("underdog actually grades out better on offense");
    candidates.push({
      game,
      prediction: p,
      favorite,
      underdog,
      underdogProb,
      source,
      note: notes.length ? notes.join(" · ") : "live underdog",
    });
  }
  return candidates.sort((a, b) => b.underdogProb - a.underdogProb);
}
