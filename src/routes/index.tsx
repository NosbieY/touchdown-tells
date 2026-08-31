import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { WEEKS, gamesForWeek, byeTeams } from "@/data/schedule";
import { TEAM_MAP } from "@/data/teams";
import {
  predictGame,
  ratingsEnteringWeek,
  finalRatings,
  upsetWatch,
  type Result,
} from "@/lib/model";
import { usePredictorStore } from "@/lib/store";
import { GameCard } from "@/components/GameCard";
import { UpsetWatch } from "@/components/UpsetWatch";
import { RatingsTable } from "@/components/RatingsTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NFL Win Predictor — 2026-27 Weekly Picks" },
      {
        name: "description",
        content:
          "Week-by-week NFL 2026-27 win predictions driven by offensive and defensive ratings, with upset alerts and adaptive Elo-style updates as results come in.",
      },
      { property: "og:title", content: "NFL Win Predictor — 2026-27 Weekly Picks" },
      {
        property: "og:description",
        content:
          "Predicted winners, win probabilities, projected scores and upset alerts for every week of the 2026-27 NFL season.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [week, setWeek] = useState(1);
  const { results, setResults, overrides, setOverrides, reset, ready } = usePredictorStore();

  const ratings = useMemo(
    () => (ready ? ratingsEnteringWeek(week, results, overrides) : null),
    [ready, week, results, overrides],
  );
  const games = useMemo(() => gamesForWeek(week), [week]);
  const upsets = useMemo(
    () => (ratings ? upsetWatch(week, games, ratings) : []),
    [ratings, week, games],
  );
  const tableRatings = useMemo(
    () => (ready ? finalRatings(results, overrides) : null),
    [ready, results, overrides],
  );

  const saveResult = (gameId: string, result: Result) =>
    setResults((prev) => ({ ...prev, [gameId]: result }));
  const clearResult = (gameId: string) =>
    setResults((prev) => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });

  const resultCount = Object.keys(results).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-5">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-wide uppercase">
              NFL Win Predictor
            </h1>
            <p className="text-sm text-muted-foreground">
              2026-27 season · offense/defense ratings model · adapts as results come in
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {resultCount > 0 && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                {resultCount} result{resultCount === 1 ? "" : "s"} entered
              </span>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset model
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <nav className="flex flex-wrap gap-1.5">
          {WEEKS.map((w) => {
            const played = gamesForWeek(w).some((g) => results[g.id]);
            return (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`relative rounded-md px-3 py-1.5 font-display text-sm font-semibold tracking-wide ${
                  w === week
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                W{w}
                {played && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-chart-2" />
                )}
              </button>
            );
          })}
        </nav>

        {ratings && (
          <>
            <UpsetWatch upsets={upsets} />

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-bold tracking-wide">
                  Week {week} Picks
                </h2>
                {byeTeams(week).length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Bye: {byeTeams(week).join(", ")}
                  </span>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {games.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    prediction={predictGame(g, ratings)}
                    result={results[g.id]}
                    onSaveResult={saveResult}
                    onClearResult={clearResult}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {tableRatings && (
          <RatingsTable
            ratings={tableRatings}
            overrides={overrides}
            onOverride={(abbr, rating) =>
              setOverrides((prev) => {
                const next = { ...prev };
                if (rating) next[abbr] = rating;
                else delete next[abbr];
                return next;
              })
            }
          />
        )}

        <footer className="pb-8 text-xs text-muted-foreground">
          Projections use team offensive/defensive ratings (points vs. average) plus home-field
          edge. Win probability = logistic curve on the expected margin. Enter final scores and
          ratings update Elo-style before later weeks are re-predicted. Schedule and baseline
          ratings are curated estimates — edit them in Power Ratings as official data lands.
        </footer>
      </main>
    </div>
  );
}
