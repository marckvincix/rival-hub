// GoalManager Types

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  plan: 'free' | 'pro' | 'club';
  plan_expiry?: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  description?: string;
  organizer_id: string;
  category: 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'Open';
  format: 'league' | 'knockout' | 'groups_knockout' | 'mixed';
  game_format: '11v11' | '8v8' | '7v7' | '6v6' | '5v5' | 'custom';
  custom_players_per_side?: number;
  status: 'draft' | 'active' | 'completed';
  start_date?: string;
  end_date?: string;
  location?: string;
  logo?: string;
  is_public: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  tournament_id: string;
  created_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  number?: number;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team_id: string;
  photo?: string;
  is_active: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  home_goals?: number;
  away_goals?: number;
  match_date?: string;
  match_time?: string;
  venue?: string;
  round: string;
  status: 'scheduled' | 'live' | 'completed';
  created_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  event_type: 'goal' | 'assist' | 'penalty_goal' | 'own_goal' | 'yellow_card' | 'red_card' | 'substitution_in' | 'substitution_out' | 'mvp';
  minute?: number;
  note?: string;
  created_at: string;
}

export interface News {
  id: string;
  tournament_id: string;
  title: string;
  content: string;
  photo?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export interface Standing {
  position: number;
  team_id: string;
  team_name: string;
  team_logo?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface Scorer {
  position: number;
  player_id: string;
  player_name: string;
  player_photo?: string;
  player_number?: number;
  team_id: string;
  team_name?: string;
  team_logo?: string;
  goals: number;
  assists: number;
  matches_played: number;
  goals_per_match: number;
}

export interface PlayerStats {
  player_id: string;
  player_name: string;
  player_photo?: string;
  player_number?: number;
  role: string;
  team_id: string;
  team_name?: string;
  team_logo?: string;
  goals: number;
  assists: number;
  penalty_goals: number;
  own_goals: number;
  yellow_cards: number;
  red_cards: number;
  mvp_awards: number;
  appearances: number;
}

// Formation Types
export interface FormationPlayer {
  player_id: string;
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  slot_index: number;
  player_name?: string;
  player_number?: number;
  player_photo?: string;
  player_role?: string;
}

export interface BenchPlayer {
  player_id: string;
  player_name?: string;
  player_number?: number;
  player_photo?: string;
  player_role?: string;
}

export interface Formation {
  id: string;
  team_id: string;
  tournament_id: string;
  module: string;
  starters: FormationPlayer[];
  bench: BenchPlayer[];
  created_at: string;
  updated_at: string;
}

// Game Format Types
export type GameFormat = '11v11' | '8v8' | '7v7' | '6v6' | '5v5' | 'custom';

export interface GameFormatOption {
  value: GameFormat;
  label: string;
  emoji: string;
  playersPerSide: number;
}

export interface TacticalModule {
  value: string;
  positions: {
    goalkeeper: number;
    defender: number;
    midfielder: number;
    forward: number;
  };
}
