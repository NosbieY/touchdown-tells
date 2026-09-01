import { ADVANCED_MAP, type AdvancedMetrics } from "@/data/advanced";

export interface MetricEdge {
  label: string;
  awayValue: string;
  homeValue: string;
  /** Team abbreviation that holds the edge, or null when it's a wash. */
  edge: string | null;
  detail: string;
}

const fmt = (n: number, digits = 2) => (n > 0 ? "+" : "") + n.toFixed(digits);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function pick(away: string, home: string, awayVal: number, homeVal: number, threshold: number) {
  const diff = awayVal - homeVal;
  if (Math.abs(diff) < threshold) return null;
  return diff > 0 ? away : home;
}

export function matchupEdges(away: string, home: string): MetricEdge[] {
  const a = ADVANCED_MAP[away];
  const h = ADVANCED_MAP[home];
  if (!a || !h) return [];

  const rows: MetricEdge[] = [
    {
      label: "Offense EPA/play",
      awayValue: fmt(a.offEpa),
      homeValue: fmt(h.offEpa),
      edge: pick(away, home, a.offEpa, h.offEpa, 0.02),
      detail: `Ranked ${ord(a.offRank)} vs ${ord(h.offRank)} on offense`,
    },
    {
      label: "Defense EPA/play allowed",
      awayValue: fmt(a.defEpa),
      homeValue: fmt(h.defEpa),
      edge: pick(away, home, -a.defEpa, -h.defEpa, 0.02),
      detail: `Ranked ${ord(a.defRank)} vs ${ord(h.defRank)} on defense (lower is better)`,
    },
    {
      label: "Pass game vs pass defense",
      awayValue: `${fmt(a.offEpaPass)} vs ${fmt(h.defEpaPass)}`,
      homeValue: `${fmt(h.offEpaPass)} vs ${fmt(a.defEpaPass)}`,
      edge: pick(away, home, a.offEpaPass - h.defEpaPass, h.offEpaPass - a.defEpaPass, 0.04),
      detail: `${away} ADoT ${a.adot.toFixed(1)} · ${home} ADoT ${h.adot.toFixed(1)}`,
    },
    {
      label: "Run game vs run defense",
      awayValue: `${fmt(a.offEpaRush)} vs ${fmt(h.defEpaRush)}`,
      homeValue: `${fmt(h.offEpaRush)} vs ${fmt(a.defEpaRush)}`,
      edge: pick(away, home, a.offEpaRush - h.defEpaRush, h.offEpaRush - a.defEpaRush, 0.04),
      detail: `${a.rushYards.toLocaleString()} rush yds (${a.rushTd} TD) vs ${h.rushYards.toLocaleString()} (${h.rushTd} TD)`,
    },
    {
      label: "Success rate",
      awayValue: pct(a.offSuccess),
      homeValue: pct(h.offSuccess),
      edge: pick(away, home, a.offSuccess, h.offSuccess, 0.01),
      detail: `Defenses allow ${pct(a.defSuccess)} and ${pct(h.defSuccess)}`,
    },
    {
      label: "Turnover risk (INT%)",
      awayValue: `${pct(a.intPct)} thrown`,
      homeValue: `${pct(h.intPct)} thrown`,
      edge: pick(away, home, -a.intPct, -h.intPct, 0.002),
      detail: `Defenses force ${pct(h.intPctForced)} (${home}) and ${pct(a.intPctForced)} (${away})`,
    },
    {
      label: "Overall EPA differential",
      awayValue: fmt(a.epaDiff),
      homeValue: fmt(h.epaDiff),
      edge: pick(away, home, a.epaDiff, h.epaDiff, 0.02),
      detail: `Season-long net efficiency per play`,
    },
  ];

  return rows;
}

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

/** One-paragraph narrative explaining why the projected winner is favored. */
export function matchupSummary(
  away: string,
  home: string,
  winner: string,
  edges: MetricEdge[],
): string {
  const a: AdvancedMetrics | undefined = ADVANCED_MAP[away];
  const h: AdvancedMetrics | undefined = ADVANCED_MAP[home];
  if (!a || !h) return "No advanced metrics available for this matchup.";
  const won = edges.filter((e) => e.edge === winner);
  const lost = edges.filter((e) => e.edge && e.edge !== winner);
  const loser = winner === home ? away : home;
  const parts = [
    `${winner} wins ${won.length} of ${edges.length} advanced-metric categories${
      won.length ? `: ${won.map((e) => e.label.toLowerCase()).join(", ")}` : ""
    }.`,
  ];
  if (lost.length)
    parts.push(
      `${loser} counters with ${lost.map((e) => e.label.toLowerCase()).join(", ")}.`,
    );
  const w = winner === home ? h : a;
  parts.push(
    `${winner} grades ${ord(w.offRank)} in offensive EPA/play and ${ord(w.defRank)} defensively, with a ${fmt(w.epaDiff)} overall EPA differential.`,
  );
  return parts.join(" ");
}
