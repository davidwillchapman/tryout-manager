export interface Group {
  id: number;
  name: string;
  description: string | null;
  team_count?: number;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  group_id: number;
  group_name: string | null;
  player_count?: number;
  created_at: string;
}

export interface Player {
  id: number;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  prior_team: string | null;
  prior_team_division: string | null;
  notes: string | null;
  group_id: number | null;
  team_id: number | null;
  group_name: string | null;
  team_name: string | null;
  created_at: string;
}

export interface PositionBreakdown {
  primary: Record<string, number>;
  secondary: Record<string, number>;
  combined: Record<string, number>;
}

export interface LeagueSeason {
  id: number;
  name: string;
  year: number;
  description: string | null;
  source_url: string | null;
  division_count?: number;
  created_at: string;
}

export interface LeagueDivision {
  id: number;
  season_id: number;
  name: string;
  age_group: string | null;
  gender: string | null;
  division: string | null;
  source_url: string | null;
  team_count?: number;
  created_at: string;
}

export interface LeagueStanding {
  id: number;
  division_id: number;
  team_name: string;
  points: number;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  goals_for: number;
  goals_against: number;
  finish_place: number | null;
  created_at: string;
}

export interface ImportSummary {
  divisions_found: number;
  teams_imported: number;
  errors: string[];
}
