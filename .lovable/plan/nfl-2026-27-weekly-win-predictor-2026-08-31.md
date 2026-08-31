# NFL 2026-27 Weekly Win Predictor

A single-page app that shows, week by week, who is most likely to win each game based on team offensive and defensive metrics — with ratings that adapt as you enter actual results.

## What you get

- **Week selector** (Weeks 1-18) with every matchup for that week.
- **Per-game card**: predicted winner, win probability, projected score, and a short "why" (e.g. offense edge, defensive edge, home field).
- **Upset Watch**: a section for the selected week highlighting the underdog most likely to win — every game whose underdog has at least ~30% win probability, ranked by probability, with the top pick flagged as the "upset alert" and a note on what drives it (e.g. close ratings, home field for the dog, strong defensive matchup).
- **Result entry**: type in the final score of a played game; the model updates both teams' ratings before the next week's picks.
- **Ratings table**: current offensive rating, defensive rating, and overall power rating for all 32 teams, editable so you can tune the baseline.
- Everything you enter is saved in your browser, with a reset button to return to the baseline.

## The model

Each team carries two ratings expressed in points per game vs. an average opponent:

1. **Offense rating** and **defense rating**, seeded from a curated baseline of recent-season efficiency (points per drive, yards per play, turnover rate, red-zone conversion).
2. **Matchup margin** = (Home offense − Away defense) − (Away offense − Home defense) + home-field advantage (~2 points).
3. **Win probability** = logistic curve on that margin (calibrated so a 7-point favorite sits near 70%).
4. **Projected score** built from league-average scoring plus each side's half of the margin.
5. **Adaptive update (Elo-style)**: when you enter a final score, each team's offense and defense rating shifts toward what actually happened, scaled by a K-factor and by how surprising the result was. Later weeks are then re-predicted with the updated ratings.

## Data

- The 2026-27 schedule and the baseline team metrics are curated and embedded in the app — no accounts, keys, or external services.
- Note on accuracy: the official 2026-27 schedule may not be fully released, so any unreleased weeks are built from a plausible, structurally valid slate (each team 17 games, correct bye weeks). Both the schedule and the ratings are editable in the app, so you can swap in the official matchups when they drop.

## Design

Dark broadcast-style scoreboard aesthetic: condensed display type for team names and scores, team color accents, probability shown as a horizontal bar between the two teams, cards in a tight grid. No generic dashboard look.

## Technical notes

- TanStack Start, single `/` route plus a small set of components.
- `src/data/teams.ts` (baseline offensive/defensive metrics, colors, abbreviations) and `src/data/schedule.ts` (18 weeks of matchups).
- `src/lib/model.ts` — pure functions: `predictGame`, `winProbability`, `projectScore`, `applyResult` (rating update). Unit-testable, no side effects.
- State in a `useLocalStorage`-backed store: entered results + rating overrides; predictions derived on render by replaying results in week order over the baseline ratings.
- No backend needed; if you later want shared/cross-device data we can add Lovable Cloud.
