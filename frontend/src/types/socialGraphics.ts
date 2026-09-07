// "Grafiche Social" — export tournament data (next match, full time result,
// standings, formation) as branded social-media graphics. See
// SocialGraphicsGenerator for the layered Layer 0 (background image) /
// Layer 1 (absolute-positioned data) architecture this all plugs into.

// '4x5' (1080×1350, feed post) and '9x16' (1080×1920, Stories/Reels) — the
// two real template artwork ratios provided, both natively supported
// rather than stretching/cropping one into the other.
export type SocialGraphicFormat = '4x5' | '9x16';

// "formation" has two independent background variants the organizer picks
// between (see FormationVariantPicker) — everything else has just one.
export type SocialGraphicTemplateKey =
  | 'next_match'
  | 'full_time'
  | 'standings'
  | 'formation_bust'
  | 'formation_circles';

export type FormationVariant = 'bust' | 'circles';

export interface NextMatchGraphicData {
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  venueName?: string;
  venueAddress?: string;
  dateTimeLabel: string; // already formatted, e.g. "Sab 12 Set • 18:30"
}

export interface FullTimeGraphicData {
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  homeScorers: string[];
  awayScorers: string[];
}

export interface StandingsGraphicRow {
  position: number;
  teamName: string;
  played: number;
  points: number;
}

export interface StandingsGraphicData {
  rows: StandingsGraphicRow[];
}

export interface FormationGraphicPlayer {
  number?: number;
  name: string;
  // Raw role key (matches Player['role']), NOT a translated label — used to
  // group starters into the tactical grid's rows by module. FormationLayer
  // translates it for display in the grass-area list itself.
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  photo?: string; // only rendered in the "bust" variant
}

export interface FormationBenchPlayer {
  number?: number;
  name: string;
}

export interface FormationGraphicData {
  teamName: string;
  teamLogo?: string;
  module: string; // e.g. "4-3-3"
  starters: FormationGraphicPlayer[]; // ordered goalkeeper -> forwards
  bench: FormationBenchPlayer[];
}
