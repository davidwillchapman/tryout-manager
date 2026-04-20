export interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  group_id: number;
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
  created_at: string;
}

export interface BreakdownResponse {
  primary: Record<string, number>;
  secondary: Record<string, number>;
  combined: Record<string, number>;
}
