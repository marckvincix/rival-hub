import React, { useState } from 'react';
import { View, Text, StyleSheet, DimensionValue, LayoutChangeEvent } from 'react-native';
import { FullTimeGraphicData, SocialGraphicFormat } from '../../types/socialGraphics';

// Layer 1 for the "Full Time" template — score row centered (team name |
// score | team name), scorer columns underneath. Both backgrounds are now
// fully clean (no baked-in "SQUADRA 1/2", score, or "NOME MARCATORE"
// placeholders) — same real stadium photo as the old full_time_4x5/9x16.jpg,
// just with the text overlay removed, so the % positions below carry over
// unchanged from that original calibration.
//
// Unlike NextMatchLayer, a long team name here truncates (numberOfLines +
// ellipsis) instead of wrapping onto more lines — this row is much
// narrower per name (shared with the score and the other team), so
// wrapping would either overlap the scorers row below it or force the
// whole block down by several lines for a single long name. A one-line
// team name plus a scorer's full name underneath truncated to fit reads
// fine; three-plus wrapped lines here would not.
const LAYOUT: Record<SocialGraphicFormat, { scoreTop: number; scorersTop: number }> = {
  '4x5': { scoreTop: 44, scorersTop: 55.7 },
  '9x16': { scoreTop: 31.8, scorersTop: 41.9 },
};

export default function FullTimeLayer({ data, format }: { data: FullTimeGraphicData; format: SocialGraphicFormat }) {
  const layout = LAYOUT[format];
  // The scorers row uses the same [column | spacer | column] shape as the
  // score row above it, with the spacer's width matched to the score's own
  // measured width — that's what keeps each scorer list sitting directly
  // under its own team name instead of at a fixed %-based indent that
  // happens to line up only for one particular score's digit count.
  const [scoreWidth, setScoreWidth] = useState(90);

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.scoreRow, { top: `${layout.scoreTop}%` as DimensionValue }]}>
        {/* Fixed fontSize always. A long name truncates with an ellipsis
            instead of wrapping — see the note above on why this layer
            (unlike NextMatchLayer) truncates rather than growing taller. */}
        <Text style={[styles.teamName, styles.teamNameLeft]} numberOfLines={1} ellipsizeMode="tail">{data.homeTeamName}</Text>
        <Text
          style={styles.score}
          onLayout={(e: LayoutChangeEvent) => setScoreWidth(e.nativeEvent.layout.width)}
        >
          {data.homeGoals} - {data.awayGoals}
        </Text>
        <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1} ellipsizeMode="tail">{data.awayTeamName}</Text>
      </View>

      <View style={[styles.scorersRow, { top: `${layout.scorersTop}%` as DimensionValue }]}>
        <View style={[styles.scorersColumn, styles.scorersColumnLeft]}>
          {data.homeScorers.map((name, i) => (
            <Text key={i} style={styles.scorerLine} numberOfLines={1}>{name}</Text>
          ))}
        </View>
        {/* Invisible spacer, exactly as wide as the score above — keeps
            both columns anchored under their own team name (both now
            aligned toward the score, same as the name above them) rather
            than under the whole row. */}
        <View style={{ width: scoreWidth }} />
        <View style={[styles.scorersColumn, styles.scorersColumnRight]}>
          {data.awayScorers.map((name, i) => (
            <Text key={i} style={styles.scorerLine} numberOfLines={1}>{name}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRow: { position: 'absolute', left: '4%', right: '4%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Anton — matches the design's own display face (FULL TIME headline).
  // lineHeight ~1.3x fontSize on every one of these (not the ~1.15-1.2x
  // that would look tighter) — the same margin NextMatchLayer's teamName
  // needed to stop Anton's ascenders/descenders from clipping.
  // textAlign centers each name inside its own half by default, but a
  // short name ("Milan") and a long truncated one then sit at different
  // distances from the score — anchoring both toward the score instead
  // keeps that gap the same length regardless of either name's length.
  teamName: { flex: 1, fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 26, color: '#FFF' },
  teamNameLeft: { textAlign: 'right' },
  teamNameRight: { textAlign: 'left' },
  score: { fontFamily: 'Anton_400Regular', fontSize: 44, lineHeight: 58, color: '#A6E35C', marginHorizontal: 10 },
  scorersRow: { position: 'absolute', left: '4%', right: '4%', flexDirection: 'row' },
  // Same toward-the-score anchoring as the team names above, so each
  // scorer list still sits directly under its own name.
  scorersColumn: { flex: 1 },
  scorersColumnLeft: { alignItems: 'flex-end' },
  scorersColumnRight: { alignItems: 'flex-start' },
  scorerLine: { fontFamily: 'Anton_400Regular', fontSize: 15, lineHeight: 20, color: '#FFF', marginBottom: 6 },
});
