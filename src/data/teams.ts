export interface Team {
  abbr: string;
  name: string;
  city: string;
  color: string;
  /** Points scored above/below league average vs an average defense */
  off: number;
  /** Points prevented above/below league average (positive = good defense) */
  def: number;
}

export const LEAGUE_AVG_SCORE = 22.5;
export const HOME_FIELD_EDGE = 2;

export const TEAMS: Team[] = [
  { abbr: "BUF", name: "Bills", city: "Buffalo", color: "#00338d", off: 4.5, def: 2.5 },
  { abbr: "KC", name: "Chiefs", city: "Kansas City", color: "#e31837", off: 4.0, def: 2.0 },
  { abbr: "BAL", name: "Ravens", city: "Baltimore", color: "#241773", off: 4.0, def: 2.5 },
  { abbr: "PHI", name: "Eagles", city: "Philadelphia", color: "#004c54", off: 3.5, def: 2.0 },
  { abbr: "DET", name: "Lions", city: "Detroit", color: "#0076b6", off: 3.5, def: 1.5 },
  { abbr: "SF", name: "49ers", city: "San Francisco", color: "#aa0000", off: 3.0, def: 2.0 },
  { abbr: "CIN", name: "Bengals", city: "Cincinnati", color: "#fb4f14", off: 3.0, def: -0.5 },
  { abbr: "GB", name: "Packers", city: "Green Bay", color: "#203731", off: 2.5, def: 1.5 },
  { abbr: "LAR", name: "Rams", city: "Los Angeles", color: "#003594", off: 2.5, def: 1.0 },
  { abbr: "WAS", name: "Commanders", city: "Washington", color: "#5a1414", off: 2.5, def: 0.5 },
  { abbr: "MIN", name: "Vikings", city: "Minnesota", color: "#4f2683", off: 2.0, def: 1.0 },
  { abbr: "LAC", name: "Chargers", city: "Los Angeles", color: "#0080c6", off: 2.0, def: 1.5 },
  { abbr: "DEN", name: "Broncos", city: "Denver", color: "#fb4f14", off: 1.5, def: 2.5 },
  { abbr: "HOU", name: "Texans", city: "Houston", color: "#03202f", off: 1.5, def: 1.5 },
  { abbr: "TB", name: "Buccaneers", city: "Tampa Bay", color: "#d50a0a", off: 1.5, def: 0.5 },
  { abbr: "SEA", name: "Seahawks", city: "Seattle", color: "#002244", off: 1.5, def: 1.0 },
  { abbr: "MIA", name: "Dolphins", city: "Miami", color: "#008e97", off: 1.5, def: -0.5 },
  { abbr: "PIT", name: "Steelers", city: "Pittsburgh", color: "#ffb612", off: 1.0, def: 2.0 },
  { abbr: "DAL", name: "Cowboys", city: "Dallas", color: "#003594", off: 1.0, def: -0.5 },
  { abbr: "ATL", name: "Falcons", city: "Atlanta", color: "#a71930", off: 0.5, def: 0.0 },
  { abbr: "CHI", name: "Bears", city: "Chicago", color: "#0b162a", off: 0.5, def: 0.5 },
  { abbr: "IND", name: "Colts", city: "Indianapolis", color: "#002c5f", off: 0.5, def: -0.5 },
  { abbr: "NE", name: "Patriots", city: "New England", color: "#002244", off: 0.0, def: 0.5 },
  { abbr: "JAX", name: "Jaguars", city: "Jacksonville", color: "#006778", off: 0.0, def: -0.5 },
  { abbr: "ARI", name: "Cardinals", city: "Arizona", color: "#97233f", off: -0.5, def: -0.5 },
  { abbr: "LV", name: "Raiders", city: "Las Vegas", color: "#000000", off: -1.0, def: -1.0 },
  { abbr: "NO", name: "Saints", city: "New Orleans", color: "#d3bc8d", off: -1.5, def: -1.0 },
  { abbr: "NYJ", name: "Jets", city: "New York", color: "#125740", off: -1.5, def: -0.5 },
  { abbr: "TEN", name: "Titans", city: "Tennessee", color: "#0c2340", off: -2.0, def: -1.5 },
  { abbr: "CLE", name: "Browns", city: "Cleveland", color: "#311d00", off: -2.0, def: -0.5 },
  { abbr: "CAR", name: "Panthers", city: "Carolina", color: "#0085ca", off: -2.5, def: -2.0 },
  { abbr: "NYG", name: "Giants", city: "New York", color: "#0b2265", off: -2.5, def: -1.5 },
];

export const TEAM_MAP: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.abbr, t]),
);
