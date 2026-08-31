import { AlertTriangle } from "lucide-react";
import { TEAM_MAP } from "@/data/teams";
import type { UpsetCandidate } from "@/lib/model";

export function UpsetWatch({ upsets }: { upsets: UpsetCandidate[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-chart-4" />
        <h2 className="font-display text-2xl font-bold tracking-wide">Upset Watch</h2>
      </div>

      {upsets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No live underdogs this week — every favorite has at least a 70% chance.
        </p>
      ) : (
        <div className="space-y-3">
          {upsets.map((u, i) => {
            const dog = TEAM_MAP[u.prediction.underdog];
            const fav = TEAM_MAP[u.prediction.favorite];
            return (
              <div
                key={u.game.id}
                className={`rounded-lg border p-4 ${
                  i === 0
                    ? "border-chart-4/50 bg-chart-4/10"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {i === 0 && (
                    <span className="rounded-full bg-chart-4 px-2 py-0.5 text-[11px] font-bold text-black uppercase">
                      Upset alert
                    </span>
                  )}
                  <span className="font-display text-lg font-bold tracking-wide">
                    <span style={{ color: dog.color }} className="brightness-150">
                      {u.prediction.underdog}
                    </span>{" "}
                    over{" "}
                    <span style={{ color: fav.color }} className="brightness-150">
                      {u.prediction.favorite}
                    </span>
                  </span>
                  <span className="ml-auto font-display text-2xl font-bold tabular-nums text-chart-4">
                    {(u.underdogProb * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-chart-4"
                    style={{ width: `${u.underdogProb * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {dog.city} {dog.name} · {u.note} · projected{" "}
                  {u.prediction.projAway.toFixed(0)}–{u.prediction.projHome.toFixed(0)}{" "}
                  {u.game.home === u.prediction.underdog ? "(home dog)" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
