// GoalManager Types

export type Sport = 'calcio' | 'basket' | 'padel' | 'tennis' | 'pallavolo' | 'rugby' | 'baseball' | 'nuoto' | 'ciclismo' | 'atletica';

export interface SportConfig {
  id: Sport;
  name: string;
  emoji: string;
  formats: { value: string; label: string }[];
  structures?: { value: string; label: string }[];
  roles?: { value: string; label: string }[];
  hideRoles?: boolean;
}

export const SPORTS_CONFIG: SportConfig[] = [
  {
    id: 'calcio',
    name: 'Calcio',
    emoji: '⚽',
    formats: [
      { value: '11v11', label: 'Calcio a 11' },
      { value: '8v8', label: 'Calcio a 8' },
      { value: '7v7', label: 'Calcio a 7' },
      { value: '5v5', label: 'Calcio a 5' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    roles: [
      { value: 'goalkeeper', label: 'Portiere' },
      { value: 'defender', label: 'Difensore' },
      { value: 'midfielder', label: 'Centrocampista' },
      { value: 'forward', label: 'Attaccante' },
    ],
  },
  {
    id: 'basket',
    name: 'Basket',
    emoji: '🏀',
    formats: [
      { value: '5v5', label: '5 vs 5' },
      { value: '3v3', label: '3 vs 3' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    structures: [
      { value: '4_quarters', label: '4 Quarti' },
      { value: '2_halves', label: '2 Tempi' },
    ],
    roles: [
      { value: 'playmaker', label: 'Playmaker' },
      { value: 'guardia', label: 'Guardia' },
      { value: 'ala_piccola', label: 'Ala Piccola' },
      { value: 'ala_grande', label: 'Ala Grande' },
      { value: 'centro', label: 'Centro' },
    ],
  },
  {
    id: 'padel',
    name: 'Padel',
    emoji: '🎾',
    formats: [
      { value: 'doppio', label: 'Doppio' },
      { value: 'singolo', label: 'Singolo' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    structures: [
      { value: '3_sets', label: '3 Set' },
    ],
    hideRoles: true,
  },
  {
    id: 'tennis',
    name: 'Tennis',
    emoji: '🎾',
    formats: [
      { value: 'singolo', label: 'Singolo' },
      { value: 'doppio', label: 'Doppio' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    structures: [
      { value: '3_sets', label: '3 Set' },
      { value: '5_sets', label: '5 Set' },
    ],
    hideRoles: true,
  },
  {
    id: 'pallavolo',
    name: 'Pallavolo',
    emoji: '🏐',
    formats: [
      { value: '6v6', label: '6 vs 6' },
      { value: '3v3', label: '3 vs 3' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    roles: [
      { value: 'palleggiatore', label: 'Palleggiatore' },
      { value: 'schiacciatore', label: 'Schiacciatore' },
      { value: 'opposto', label: 'Opposto' },
      { value: 'libero', label: 'Libero' },
      { value: 'centrale', label: 'Centrale' },
    ],
  },
  {
    id: 'rugby',
    name: 'Rugby',
    emoji: '🏉',
    formats: [
      { value: '15v15', label: '15 vs 15' },
      { value: '7v7', label: '7 vs 7' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    structures: [
      { value: '2_halves_40', label: '2 Tempi da 40 min' },
      { value: '2_halves_7', label: '2 Tempi da 7 min' },
    ],
    roles: [
      { value: 'pilone_sinistro', label: 'Pilone Sinistro' },
      { value: 'tallonatore', label: 'Tallonatore' },
      { value: 'pilone_destro', label: 'Pilone Destro' },
      { value: 'seconda_linea_1', label: 'Seconda Linea' },
      { value: 'seconda_linea_2', label: 'Seconda Linea' },
      { value: 'flanker_1', label: 'Flanker' },
      { value: 'flanker_2', label: 'Flanker' },
      { value: 'numero_8', label: 'Numero 8' },
      { value: 'mediano_mischia', label: 'Mediano di mischia' },
      { value: 'mediano_apertura', label: 'Mediano di apertura' },
      { value: 'ala_sinistra', label: 'Ala Sinistra' },
      { value: 'ala_destra', label: 'Ala Destra' },
      { value: 'centro_1', label: 'Centro' },
      { value: 'centro_2', label: 'Centro' },
      { value: 'estremo', label: 'Estremo' },
    ],
  },
  {
    id: 'baseball',
    name: 'Baseball',
    emoji: '⚾',
    formats: [
      { value: '9v9', label: '9 vs 9' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    roles: [
      { value: 'lanciatore', label: 'Lanciatore' },
      { value: 'ricevitore', label: 'Ricevitore' },
      { value: 'prima_base', label: 'Prima Base' },
      { value: 'seconda_base', label: 'Seconda Base' },
      { value: 'terza_base', label: 'Terza Base' },
      { value: 'interbase', label: 'Interbase' },
      { value: 'esterno', label: 'Esterno' },
    ],
  },
  {
    id: 'nuoto',
    name: 'Nuoto',
    emoji: '🏊',
    formats: [
      { value: 'individuale', label: 'Individuale' },
      { value: 'staffetta', label: 'Staffetta' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    hideRoles: true,
  },
  {
    id: 'ciclismo',
    name: 'Ciclismo',
    emoji: '🚴',
    formats: [
      { value: 'individuale', label: 'Individuale' },
      { value: 'squadre', label: 'Squadre' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    hideRoles: true,
  },
  {
    id: 'atletica',
    name: 'Atletica',
    emoji: '🏃',
    formats: [
      { value: 'individuale', label: 'Individuale' },
      { value: 'staffetta', label: 'Staffetta' },
      { value: 'custom', label: 'Personalizzato' },
    ],
    hideRoles: true,
  },
];

export const getSportConfig = (sport: Sport): SportConfig | undefined => {
  return SPORTS_CONFIG.find(s => s.id === sport);
};

export const getSportEmoji = (sport: Sport): string => {
  return SPORTS_CONFIG.find(s => s.id === sport)?.emoji || '🏆';
};

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  description?: string;
  organizer_id: string;
  sport: Sport;
  category: 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'Senior' | 'Open';
  format: 'league' | 'knockout' | 'groups_knockout' | 'mixed';
  game_format: string;
  custom_players_per_side?: number;
  game_structure?: string;
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
  // Basketball specific fields
  periods_score?: { [period: string]: { home: number; away: number } };
  home_team_fouls?: { [period: string]: number };
  away_team_fouls?: { [period: string]: number };
  current_period?: string;
  timer_seconds?: number;
  timer_running?: boolean;
  created_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  event_type: 'goal' | 'assist' | 'penalty_goal' | 'own_goal' | 'yellow_card' | 'red_card' | 'substitution_in' | 'substitution_out' | 'mvp' | 'points_1pt' | 'points_2pt' | 'points_3pt' | 'rebound' | 'basketball_assist' | 'foul' | 'steal' | 'block';
  minute?: number;
  note?: string;
  period?: string;
  points_value?: number;
  created_at: string;
}

// Basketball specific stats
export interface BasketballPlayerStats {
  player_id: string;
  points_1pt: number;
  points_2pt: number;
  points_3pt: number;
  total_points: number;
  rebounds: number;
  assists: number;
  fouls: number;
  steals: number;
  blocks: number;
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
  average_rating?: number;
}

// Formation Types
export interface FormationPlayer {
  player_id: string;
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'playmaker' | 'guardia' | 'ala_piccola' | 'ala_grande' | 'centro' | 'player';
  slot_index: number;
  player_name?: string;
  player_number?: number;
  player_photo?: string;
  player_role?: string;
  full_name?: string; // For basketball court view
  number?: number; // For basketball court view
  photo?: string; // For basketball court view
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
