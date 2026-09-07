// Layer 0 background images for the social graphics generator — one real
// design file per template × format (Metro needs literal require() paths,
// so this map can't be built dynamically). All 10 are the real, final
// artwork (frontend/assets/social-templates/).
import { SocialGraphicFormat, SocialGraphicTemplateKey } from '../types/socialGraphics';

export const SOCIAL_TEMPLATE_BACKGROUNDS: Record<SocialGraphicTemplateKey, Record<SocialGraphicFormat, any>> = {
  next_match: {
    // Clean backgrounds — no baked-in placeholder text or circles at all.
    // Layer 1 (NextMatchLayer) draws 100% of the dynamic content itself
    // now (names, logos/circles, venue info), so there's nothing left
    // underneath to cover up or align to.
    '4x5': require('../../assets/social-templates/next_match_4x5_clean.png'),
    '9x16': require('../../assets/social-templates/next_match_9x16_clean.png'),
  },
  full_time: {
    // Clean backgrounds — no baked-in "SQUADRA 1/2", score, or "NOME
    // MARCATORE" placeholders. Same real stadium photo as the old
    // full_time_4x5/9x16.jpg (confirmed pixel-diff on the untouched field
    // area), just with the text overlay removed, so FullTimeLayer draws
    // 100% of the dynamic content itself now.
    '4x5': require('../../assets/social-templates/fulltime_senzasquadra45.png'),
    '9x16': require('../../assets/social-templates/fulltime_senzasquadra916.png'),
  },
  // Clean backgrounds — no baked-in "SQUADRE/PG/PT" header or "SQUADRA N"
  // placeholder rows, just the panel and its column guide lines (position|
  // team in 4x5, PG|PT in both). Same real stadium photo as the old
  // standings_4x5/9x16.jpg (confirmed pixel-diff on the untouched panel
  // area), so StandingsLayer now draws the header and every row itself.
  standings: {
    '4x5': require('../../assets/social-templates/classifica.png'),
    '9x16': require('../../assets/social-templates/classifica_916.png'),
  },
  // Both variants share the same clean panel — no baked-in player circles,
  // team logo circle, module text, or grass-area list. FormationLayer draws
  // 100% of the dynamic content itself now (same reasoning as next_match/
  // full_time above); only what it draws inside each slot differs between
  // "bust" (a photo) and "circles" (a plain circle), so one background
  // does for both.
  // Both "_def" revisions have a much taller black panel than the
  // originals — 4x5: 2.5%-67.5% (was 2.5%-60.9%); 9x16: 5.6%-69.0% (was
  // 21.8%-62.0%, nearly doubling its usable height). FormationLayer's
  // per-format layout is calibrated against these larger panels.
  formation_bust: {
    '4x5': require('../../assets/social-templates/formazione_senzasquadra45_def.png'),
    '9x16': require('../../assets/social-templates/formazione_senzasquadra916_def.png'),
  },
  formation_circles: {
    '4x5': require('../../assets/social-templates/formazione_senzasquadra45_def.png'),
    '9x16': require('../../assets/social-templates/formazione_senzasquadra916_def.png'),
  },
};

// Native export pixel size per format — the generator renders the on-screen
// preview scaled down to fit, but always captures at this full resolution
// via react-native-view-shot's width/height options.
export const SOCIAL_GRAPHIC_EXPORT_SIZE: Record<SocialGraphicFormat, { width: number; height: number }> = {
  '4x5': { width: 1080, height: 1350 },
  '9x16': { width: 1080, height: 1920 },
};
