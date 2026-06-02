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
  team_order: number | null;
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

export interface Framework {
  id: number;
  name: string;
  source: string | null;
  version: string | null;
  description: string | null;
  section_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FrameworkSection {
  id: number;
  framework_id: number;
  parent_id: number | null;
  title: string;
  content: string | null;
  order_index: number;
  children?: FrameworkSection[];
  created_at: string;
  updated_at: string;
}

export interface FrameworkWithSections extends Framework {
  sections: FrameworkSection[];
}

export interface Activity {
  id: number;
  title: string;
  summary: string;
  description: string;
  activity_type: string | null;
  duration_minutes: number | null;
  field_setup: string | null;
  coaching_points: string | null;
  flexibility_notes: string | null;
  image_id: number | null;
  image_url: string | null;
  video_url: string | null;
  video_type: 'youtube' | 'vimeo' | 'upload' | null;
  tag_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityFrameworkTag {
  id: number;
  activity_id: number;
  framework_id: number;
  framework_name: string;
  phase_section_id: number | null;
  phase_title: string | null;
  principle_section_id: number | null;
  principle_title: string | null;
  sub_principle_section_id: number | null;
  sub_principle_title: string | null;
  created_at: string;
}

export interface ActivityReference {
  id: number;
  activity_id: number;
  url: string;
  label: string | null;
  order_index: number;
  created_at: string;
}

export interface ActivityProgression {
  id: number;
  activity_id: number;
  progression_activity_id: number;
  progression_title: string;
  progression_summary: string;
  created_at: string;
}

export interface ActivityDetail extends Activity {
  tags: ActivityFrameworkTag[];
  references: ActivityReference[];
  progressions: ActivityProgression[];
}

export interface ActivityImportResult {
  activity: Activity;
  warnings: string[];
}

export interface UploadedImage {
  id: number;
  filename: string;
  url: string;
}

export type GamePhase =
  | 'Attacking'
  | 'Attacking to Defending Transition'
  | 'Defending'
  | 'Defending to Attacking Transition'
  | 'Other';

export interface SessionPlan {
  id: number;
  title: string;
  game_phase: GamePhase;
  overall_objective: string;
  main_principle: string;
  sub_principle_1: string | null;
  sub_principle_2: string | null;
  activity_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SessionActivity {
  id: number;
  order_index: number;
  activity: Activity;
}

export interface SessionPlanDetail extends SessionPlan {
  activities: SessionActivity[];
}

export interface SquadTeam {
  id: number;
  name: string;
  description?: string | null;
  source_team_id?: number | null;
  is_active: boolean;
  season_label?: string | null;
  player_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SquadPlayer {
  id: number;
  squad_team_id: number;
  source_player_id?: number | null;
  name: string;
  primary_position?: string | null;
  secondary_position?: string | null;
  jersey_number?: string | null;
  depth_order: number;
  status: 'active' | 'inactive' | 'injured';
  created_at: string;
  updated_at: string;
}

export interface Formation {
  id: number;
  squad_team_id: number;
  name: string;
  formation_code: string;
  is_default: boolean;
  slots?: FormationSlot[];
  created_at: string;
  updated_at: string;
}

export interface FormationSlot {
  id: number;
  formation_id: number;
  squad_player_id?: number | null;
  slot_label: string;
  role: 'starter' | 'first_sub';
  x_pct: number;
  y_pct: number;
  player_name?: string | null;
  jersey_number?: string | null;
  primary_position?: string | null;
  player_status?: string | null;
}

export interface FormationTemplateSlot {
  id: number;
  formation_template_id: number;
  slot_label: string;
  role: 'starter' | 'first_sub';
  x_pct: number;
  y_pct: number;
}

export interface FormationTemplate {
  id: number;
  name: string;
  is_builtin: boolean;
  slot_count?: number;
  slots?: FormationTemplateSlot[];
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'attended' | 'excused' | 'unexcused';
export type EvaluationStatus = 'not_started' | 'in_progress' | 'complete';
export type EvalMark = 'top' | 'bottom';

export interface PeriodizationPlan {
  id?: number;
  squad_team_id: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledSessionSummary {
  id: number;
  date: string;
  title: string;
  game_phase: GamePhase;
  overall_objective: string;
  evaluation_status: EvaluationStatus;
  created_at: string;
  updated_at: string;
}

export interface ScheduledSessionActivity {
  id: number;
  scheduled_session_id: number;
  source_activity_id: number | null;
  order_index: number;
  title: string;
  summary: string | null;
  description: string | null;
  activity_type: string | null;
  duration_minutes: number | null;
  field_setup: string | null;
  coaching_points: string | null;
  flexibility_notes: string | null;
  image_id: number | null;
  video_url: string | null;
  video_type: 'youtube' | 'vimeo' | 'upload' | null;
  rating: number | null;
  notes: string | null;
}

export interface ScheduledSessionPlayer {
  id: number;
  scheduled_session_id: number;
  squad_player_id: number | null;
  name: string;
  is_guest: number;
  attendance: AttendanceStatus | null;
  eval_mark: EvalMark | null;
  created_at: string;
}

export interface ScheduledSession extends ScheduledSessionSummary {
  squad_team_id: number;
  source_session_id: number | null;
  main_principle: string | null;
  sub_principle_1: string | null;
  sub_principle_2: string | null;
  overall_rating: number | null;
  evaluation_notes: string | null;
  activities: ScheduledSessionActivity[];
  players: ScheduledSessionPlayer[];
}
