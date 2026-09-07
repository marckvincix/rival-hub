import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, DimensionValue, NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
import { NextMatchGraphicData, SocialGraphicFormat } from '../../types/socialGraphics';

// Layer 1 for the "Next Match" template — logos/text left column, info
// block bottom-left. Both backgrounds are now fully clean (no baked-in
// "SQUADRA 1/2", venue placeholder, or circles) — this layer draws 100%
// of the dynamic content itself, including the team logo circles, so
// there's nothing left underneath to cover up or align to.
//
// row1Top/row2Top/infoTop are calibrated for the common case where every
// team name fits on one line. teamName never shrinks or truncates, so a
// name too long instead wraps onto a second line (see TeamRow) — when
// that happens, row2 and/or the info block need to be pushed down by
// exactly one extra line's height, or the wrapped second line overlaps
// the block below it. referenceHeight is this format's fixed rendering
// frame (Layer 0/1 are always drawn at 360px wide — see the reference-
// width+scale pattern in SocialGraphicPreviewCard etc. — at 4:5 or 9:16),
// needed to convert TEAM_NAME_LINE_HEIGHT (a px value) into the same %
// units as the top values it's added to.
const LAYOUT: Record<SocialGraphicFormat, {
  circleLeft: string; circleSize: string; textLeft: string;
  row1Top: number; row2Top: number; infoTop: number; referenceHeight: number;
}> = {
  // Shifted up ~12pts from the short-name calibration — that version left
  // just enough headroom below the info block for zero wrapped lines, so a
  // single wrapped line (a long team name) already pushed the info block
  // into the footer. Same relative gaps between row1/row2/info, just the
  // whole block moved up to leave real margin for that case.
  '4x5': { circleLeft: '9.1%', circleSize: '10.4%', textLeft: '22.7%', row1Top: 37.5, row2Top: 49.4, infoTop: 63, referenceHeight: 450 },
  '9x16': { circleLeft: '10.6%', circleSize: '9.3%', textLeft: '26.9%', row1Top: 36.6, row2Top: 43.8, infoTop: 71, referenceHeight: 640 },
};

// Must match styles.teamName.lineHeight below.
const TEAM_NAME_LINE_HEIGHT = 46;
// Layer 0/1 are always drawn at this fixed width (see the reference-width+
// scale pattern mentioned above) — needed to turn circleSize (a %) into an
// absolute px size, for centering the circle against the first text line.
const REFERENCE_WIDTH = 360;

export default function NextMatchLayer({ data, format }: { data: NextMatchGraphicData; format: SocialGraphicFormat }) {
  const layout = LAYOUT[format];
  // Actual rendered line count per name, measured via onTextLayout rather
  // than guessed from character counts — Anton is a condensed display
  // face, so a character-count heuristic would be a poor stand-in for how
  // it actually wraps. Both default to 1 (the pre-measurement guess),
  // which matches the original fixed layout exactly, so short names (the
  // overwhelming majority) render with zero extra work or shift.
  const [homeLines, setHomeLines] = useState(1);
  const [awayLines, setAwayLines] = useState(1);

  const extraPercent = (lines: number) => ((Math.max(lines, 1) - 1) * TEAM_NAME_LINE_HEIGHT / layout.referenceHeight) * 100;

  const row2Top = layout.row2Top + extraPercent(homeLines);
  const infoTop = layout.infoTop + extraPercent(homeLines) + extraPercent(awayLines);

  return (
    <View style={StyleSheet.absoluteFill}>
      <TeamRow name={data.homeTeamName} logo={data.homeTeamLogo} top={`${layout.row1Top}%` as DimensionValue} layout={layout} onLines={setHomeLines} />
      <TeamRow name={data.awayTeamName} logo={data.awayTeamLogo} top={`${row2Top}%` as DimensionValue} layout={layout} onLines={setAwayLines} />

      <View style={[styles.infoBlock, { left: layout.textLeft as DimensionValue, top: `${infoTop}%` as DimensionValue }]}>
        {data.venueName ? <Text style={styles.infoLine} numberOfLines={1}>{data.venueName}</Text> : null}
        {data.venueAddress ? <Text style={styles.infoLine} numberOfLines={1}>{data.venueAddress}</Text> : null}
        <Text style={styles.infoLine} numberOfLines={1}>{data.dateTimeLabel}</Text>
      </View>
    </View>
  );
}

function TeamRow({ name, logo, top, layout, onLines }: { name: string; logo?: string; top: DimensionValue; layout: typeof LAYOUT['4x5']; onLines: (count: number) => void }) {
  // The row aligns to flex-start (not center) so a wrapped 2nd/3rd line
  // extends downward below the circle instead of pulling the circle down
  // to the middle of the whole wrapped block — the circle must always line
  // up with the name's first line, exactly like it does for a short name.
  // circleMarginTop re-centers the circle against just that first line
  // (its own height rarely matches the text lineHeight exactly).
  const circleSizePx = (parseFloat(layout.circleSize) / 100) * REFERENCE_WIDTH;
  const circleMarginTop = (TEAM_NAME_LINE_HEIGHT - circleSizePx) / 2;

  return (
    <View style={[styles.teamRow, { top, left: layout.circleLeft as DimensionValue }]}>
      {logo ? (
        <Image source={{ uri: logo }} style={[styles.logo, { width: layout.circleSize as DimensionValue, marginTop: circleMarginTop }]} resizeMode="cover" />
      ) : (
        <View style={[styles.logoPlaceholder, { width: layout.circleSize as DimensionValue, marginTop: circleMarginTop }]}>
          <Text style={styles.logoInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      {/* Fixed fontSize always, and the full name always — no truncation,
          no shrinking to fit. A long name wraps onto a second line instead
          (no numberOfLines cap) rather than ever being cut short; onTextLayout
          reports how many lines it actually took so the layout above can
          push everything below down by exactly that much. */}
      <Text
        style={styles.teamName}
        onTextLayout={(e: NativeSyntheticEvent<TextLayoutEventData>) => onLines(e.nativeEvent.lines.length)}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // right: 3% (not 6%) — gives longer team names more room before they'd
  // need to truncate, since the font size itself never shrinks to fit.
  // (left comes from the circleLeft prop passed inline where this is used.)
  teamRow: { position: 'absolute', right: '3%', flexDirection: 'row', alignItems: 'flex-start' },
  // Drawn entirely by this layer now (no circle baked into the background
  // to sit on top of) — the green ring matches the same accent used
  // elsewhere in the social graphics (FormationLayer's player slots).
  logo: { aspectRatio: 1, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#A6E35C' },
  logoPlaceholder: { aspectRatio: 1, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#A6E35C', alignItems: 'center', justifyContent: 'center' },
  // lineHeight == fontSize clips ascenders/descenders (tails of "l", dot of
  // "i") — a small amount of headroom (~1.15x) keeps the glyph fully
  // visible while still centering it much tighter than the font's own
  // (much taller) default line box.
  logoInitial: { fontFamily: 'Anton_400Regular', fontSize: 22, lineHeight: 28, color: '#000' },
  // Anton — matches the design's own display face (NEXT MATCH headline).
  teamName: { marginLeft: 14, fontFamily: 'Anton_400Regular', fontSize: 36, lineHeight: 46, color: '#FFF', flexShrink: 1 },
  infoBlock: { position: 'absolute', right: '6%', alignItems: 'flex-start' },
  infoLine: { fontFamily: 'Anton_400Regular', fontSize: 17, color: '#FFF', marginBottom: 1 },
});
