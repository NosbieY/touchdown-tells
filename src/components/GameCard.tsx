import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { matchupEdges, matchupSummary } from "@/lib/matchup";
import { TEAM_MAP } from "@/data/teams";
import type { Game } from "@/data/schedule";
import type { Prediction, Result } from "@/lib/model";
import type { MarketLine } from "@/lib/kalshi.functions";

interface Props {
  game: Game;
  prediction: Prediction;
  result?: Result | undefined;
  market?: MarketLine | undefined;
  onSaveResult: (gameId: string, result: Result) => void;
  onClearResult: (gameId: string) => void;
}

function TeamRow({
  abbr,
  score,
  prob,
  bold,
}: {
  abbr: string;
  score: string;
  prob: number;
  bold: boolean;
}) {
  const team = TEAM_MAP[abbr]!;
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-11 shrink-0 items-center justify-center rounded-md font-display text-sm font-bold tracking-wide text-white"
        style={{ backgroundColor: team.color }}
      >
        {abbr}
      </span>
      <span
        className={`flex-1 truncate font-display text-lg tracking-wide ${
          bold ? "font-bold text-foreground" : "text-muted-foreground"
        }`}
      >
        {team.city} {team.name}
      </span>
      <span className="w-12 text-right font-display text-2xl font-bold tabular-nums">
        {score}
      </span>
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
        {(prob * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export function GameCard({ game, prediction, result, market, onSaveResult, onClearResult }: Props) {
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(result ? String(result.homeScore) : "");
  const [awayScore, setAwayScore] = useState(result ? String(result.awayScore) : "");

  const homeWin = prediction.homeProb >= 0.5;
  const favProb = Math.max(prediction.homeProb, prediction.awayProb);

  const save = () => {
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) return;
    onSaveResult(game.id, { homeScore: h, awayScore: a });
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {game.away} @ {game.home}
          {game.intl && (
            <span className="ml-2 rounded-full bg-chart-2/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-chart-2 normal-case">
              {game.intl.city}, {game.intl.country}
            </span>
          )}
        </span>

        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            favProb >= 0.7
              ? "bg-primary/15 text-primary"
              : favProb >= 0.58
                ? "bg-accent text-accent-foreground"
                : "bg-chart-4/15 text-chart-4"
          }`}
        >
          {favProb >= 0.58
            ? `${prediction.favorite} by ${Math.abs(prediction.margin).toFixed(1)}`
            : "Toss-up"}
        </span>
      </div>

      <div className="space-y-2">
        <TeamRow
          abbr={game.away}
          score={prediction.projAway.toFixed(1)}
          prob={prediction.awayProb}
          bold={!homeWin}
        />
        <TeamRow
          abbr={game.home}
          score={prediction.projHome.toFixed(1)}
          prob={prediction.homeProb}
          bold={homeWin}
        />
      </div>

      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full"
          style={{
            width: `${prediction.awayProb * 100}%`,
            backgroundColor: TEAM_MAP[game.away]!.color,
          }}
        />
        <div
          className="h-full flex-1"
          style={{ backgroundColor: TEAM_MAP[game.home]!.color }}
        />
      </div>

      {market && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-2 text-xs">
          <span className="font-semibold tracking-widest text-muted-foreground uppercase">
            Kalshi
          </span>
          <span className="font-display text-sm font-bold tracking-wide">
            {market.favorite} favorite
          </span>
          <span className="text-muted-foreground">
            {market.underdog} dog
          </span>
          <span className="ml-auto tabular-nums">
            {game.away} {((market.probs[game.away] ?? 0) * 100).toFixed(0)}% ·{" "}
            {game.home} {((market.probs[game.home] ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {prediction.reasons.join(" · ")}
      </p>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 flex w-full items-center justify-between rounded-md bg-secondary/60 px-3 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-secondary"
      >
        Why {winner} wins — deep dive
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-border p-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {matchupSummary(game.away, game.home, winner, edges)}
          </p>
          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-xs">
            <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Metric
            </span>
            <span className="text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {game.away}
            </span>
            <span className="text-right text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {game.home}
            </span>
            {edges.map((e) => (
              <div key={e.label} className="col-span-3 grid grid-cols-[1fr_auto_auto] gap-x-3">
                <div>
                  <div className="font-medium text-foreground">{e.label}</div>
                  <div className="text-[11px] text-muted-foreground">{e.detail}</div>
                </div>
                <span
                  className={`tabular-nums ${
                    e.edge === game.away ? "font-bold text-chart-2" : "text-muted-foreground"
                  }`}
                >
                  {e.awayValue}
                </span>
                <span
                  className={`tabular-nums ${
                    e.edge === game.home ? "font-bold text-chart-2" : "text-muted-foreground"
                  }`}
                >
                  {e.homeValue}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Source: 2025 regular-season advanced team metrics (EPA per play, success rate,
            situational splits).
          </p>
        </div>
      )}

      {result && !editing ? (
        <div className="mt-3 flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
          <span>
            Final: <strong className="tabular-nums">{game.away} {result.awayScore} — {result.homeScore} {game.home}</strong>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Edit
            </button>
            <button
              onClick={() => onClearResult(game.id)}
              className="text-xs font-medium text-destructive hover:opacity-80"
            >
              Clear
            </button>
          </div>
        </div>
      ) : editing ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder={game.away}
            inputMode="numeric"
            className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums"
          />
          <span className="text-xs text-muted-foreground">@</span>
          <input
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder={game.home}
            inputMode="numeric"
            className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums"
          />
          <button
            onClick={save}
            className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setHomeScore("");
            setAwayScore("");
            setEditing(true);
          }}
          className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          + Enter final score
        </button>
      )}
    </div>
  );
}
