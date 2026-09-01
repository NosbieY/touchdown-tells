import { createServerFn } from "@tanstack/react-start";

/** Kalshi uses JAC; our data uses JAX. */
const ABBR_FIX: Record<string, string> = { JAC: "JAX" };

export interface MarketLine {
  /** Implied win probability per team abbreviation (normalized to sum 1). */
  probs: Record<string, number>;
  favorite: string;
  underdog: string;
  week: number;
}

/** Keyed by `w{week}:{ABBR}-{ABBR}` (abbreviations sorted). */
export type MarketLines = Record<string, MarketLine>;

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

/** Key used to look up a market line for a specific game. */
export function lineKey(week: number, a: string, b: string) {
  return `w${week}:${pairKey(a, b)}`;
}

/**
 * Tuesday before Week 1 of the 2026 season (Week 1 kicks off Thu Sep 10, 2026),
 * so each NFL week runs Tue -> Mon.
 */
const SEASON_START = Date.UTC(2026, 8, 8);

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Derives the regular-season week from an event ticker like KXNFLGAME-26SEP21NYGLAR. */
export function weekFromEventTicker(eventTicker: string): number | null {
  const m = /^KXNFLGAME-(\d{2})([A-Z]{3})(\d{2})/.exec(eventTicker);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]!);
  if (month < 0) return null;
  const date = Date.UTC(2000 + Number(m[1]), month, Number(m[3]));
  const week = Math.floor((date - SEASON_START) / (7 * 86_400_000)) + 1;
  return week >= 1 && week <= 18 ? week : null;
}

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  status?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  last_price_dollars?: string;
}

const num = (v?: string) => (v == null ? NaN : Number.parseFloat(v));

const BASE = "https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLGAME&limit=1000";

async function fetchAllMarkets(): Promise<KalshiMarket[]> {
  const all: KalshiMarket[] = [];
  let cursor: string | undefined;
  // Paginate across the whole series so every week Kalshi has listed is covered.
  for (let page = 0; page < 12; page++) {
    const url = cursor ? `${BASE}&cursor=${encodeURIComponent(cursor)}` : BASE;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Kalshi ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { markets?: KalshiMarket[]; cursor?: string };
    all.push(...(data.markets ?? []));
    cursor = data.cursor || undefined;
    if (!cursor || !(data.markets ?? []).length) break;
  }
  return all;
}

export const getKalshiLines = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ lines: MarketLines; weeks: number[]; fetchedAt: string; error?: string }> => {
    try {
      const markets = await fetchAllMarkets();
      const byEvent = new Map<string, { week: number; sides: { team: string; prob: number }[] }>();

      for (const m of markets) {
        const week = weekFromEventTicker(m.event_ticker);
        if (week == null) continue; // skips preseason / playoff tickers
        const raw = m.ticker.split("-").pop();
        if (!raw) continue;
        const team = ABBR_FIX[raw] ?? raw;
        const bid = num(m.yes_bid_dollars);
        const ask = num(m.yes_ask_dollars);
        const mid =
          Number.isFinite(bid) && Number.isFinite(ask) && (bid > 0 || ask > 0)
            ? (bid + ask) / 2
            : num(m.last_price_dollars);
        if (!Number.isFinite(mid) || mid <= 0) continue;
        const entry = byEvent.get(m.event_ticker) ?? { week, sides: [] };
        entry.sides.push({ team, prob: mid });
        byEvent.set(m.event_ticker, entry);
      }

      const lines: MarketLines = {};
      for (const { week, sides } of byEvent.values()) {
        if (sides.length !== 2) continue;
        const [x, y] = sides as [{ team: string; prob: number }, { team: string; prob: number }];
        const total = x.prob + y.prob;
        if (total <= 0) continue;
        const px = x.prob / total;
        const py = y.prob / total;
        lines[lineKey(week, x.team, y.team)] = {
          probs: { [x.team]: px, [y.team]: py },
          favorite: px >= py ? x.team : y.team,
          underdog: px >= py ? y.team : x.team,
          week,
        };
      }

      const weeks = [...new Set(Object.values(lines).map((l) => l.week))].sort((a, b) => a - b);
      return { lines, weeks, fetchedAt: new Date().toISOString() };
    } catch (e) {
      console.error("Kalshi fetch error", e);
      return {
        lines: {},
        weeks: [],
        fetchedAt: new Date().toISOString(),
        error: "Market data unavailable",
      };
    }
  },
);
