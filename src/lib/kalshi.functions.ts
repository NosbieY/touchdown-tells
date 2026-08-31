import { createServerFn } from "@tanstack/react-start";

/** Kalshi uses JAC; our data uses JAX. */
const ABBR_FIX: Record<string, string> = { JAC: "JAX" };

export interface MarketLine {
  /** Implied win probability per team abbreviation (normalized to sum 1). */
  probs: Record<string, number>;
  favorite: string;
  underdog: string;
}

/** Keyed by the two team abbreviations sorted and joined with "-". */
export type MarketLines = Record<string, MarketLine>;

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  last_price_dollars?: string;
}

const num = (v?: string) => (v == null ? NaN : Number.parseFloat(v));

export const getKalshiLines = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ lines: MarketLines; fetchedAt: string; error?: string }> => {
    try {
      const res = await fetch(
        "https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLGAME&limit=1000&status=open",
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) {
        const body = await res.text();
        console.error(`Kalshi request failed [${res.status}]: ${body}`);
        return { lines: {}, fetchedAt: new Date().toISOString(), error: `Kalshi ${res.status}` };
      }
      const data = (await res.json()) as { markets?: KalshiMarket[] };
      const byEvent = new Map<string, { team: string; prob: number }[]>();

      for (const m of data.markets ?? []) {
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
        const arr = byEvent.get(m.event_ticker) ?? [];
        arr.push({ team, prob: mid });
        byEvent.set(m.event_ticker, arr);
      }

      const lines: MarketLines = {};
      for (const sides of byEvent.values()) {
        if (sides.length !== 2) continue;
        const [x, y] = sides as [{ team: string; prob: number }, { team: string; prob: number }];
        const total = x.prob + y.prob;
        if (total <= 0) continue;
        const px = x.prob / total;
        const py = y.prob / total;
        lines[pairKey(x.team, y.team)] = {
          probs: { [x.team]: px, [y.team]: py },
          favorite: px >= py ? x.team : y.team,
          underdog: px >= py ? y.team : x.team,
        };
      }

      return { lines, fetchedAt: new Date().toISOString() };
    } catch (e) {
      console.error("Kalshi fetch error", e);
      return {
        lines: {},
        fetchedAt: new Date().toISOString(),
        error: "Market data unavailable",
      };
    }
  },
);
