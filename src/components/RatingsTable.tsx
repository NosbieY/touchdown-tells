import { useState } from "react";
import { TEAMS, TEAM_MAP } from "@/data/teams";
import type { Rating, Ratings } from "@/lib/model";

interface Props {
  ratings: Ratings;
  overrides: Record<string, Rating>;
  onOverride: (abbr: string, rating: Rating | null) => void;
}

export function RatingsTable({ ratings, overrides, onOverride }: Props) {
  const [open, setOpen] = useState(false);
  const sorted = [...TEAMS].sort(
    (a, b) => ratings[b.abbr]!.off + ratings[b.abbr]!.def - (ratings[a.abbr]!.off + ratings[a.abbr]!.def),
  );

  const setField = (abbr: string, field: "off" | "def", raw: string) => {
    const val = parseFloat(raw);
    if (Number.isNaN(val)) return;
    const base = overrides[abbr] ?? { off: TEAM_MAP[abbr]!.off, def: TEAM_MAP[abbr]!.def };
    onOverride(abbr, { ...base, [field]: val });
  };

  return (
    <section className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5"
      >
        <h2 className="font-display text-2xl font-bold tracking-wide">Power Ratings</h2>
        <span className="text-sm text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="overflow-x-auto px-5 pb-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Ratings in points vs. an average team. Edit baseline values to tune the model —
            entered results adjust these automatically.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-widest text-muted-foreground uppercase">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Team</th>
                <th className="py-2 pr-2 text-right">Offense</th>
                <th className="py-2 pr-2 text-right">Defense</th>
                <th className="py-2 pr-2 text-right">Power</th>
                <th className="py-2 text-right">Baseline (edit)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const r = ratings[t.abbr];
                const base = overrides[t.abbr] ?? { off: t.off, def: t.def };
                return (
                  <tr key={t.abbr} className="border-b border-border/50">
                    <td className="py-2 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <span
                        className="mr-2 inline-block w-9 rounded px-1 text-center text-xs font-bold text-white"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.abbr}
                      </span>
                      <span className="hidden sm:inline">{t.city} {t.name}</span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {r.off >= 0 ? "+" : ""}{r.off.toFixed(1)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {r.def >= 0 ? "+" : ""}{r.def.toFixed(1)}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">
                      {(r.off + r.def).toFixed(1)}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <input
                        key={`off-${t.abbr}-${base.off}`}
                        defaultValue={base.off.toFixed(1)}
                        onBlur={(e) => setField(t.abbr, "off", e.target.value)}
                        className="w-14 rounded border border-input bg-background px-1 py-0.5 text-right text-xs tabular-nums"
                      />{" "}
                      <input
                        key={`def-${t.abbr}-${base.def}`}
                        defaultValue={base.def.toFixed(1)}
                        onBlur={(e) => setField(t.abbr, "def", e.target.value)}
                        className="w-14 rounded border border-input bg-background px-1 py-0.5 text-right text-xs tabular-nums"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
