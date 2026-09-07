import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { StandingsGraphicData, SocialGraphicFormat } from '../../types/socialGraphics';

// Layer 1 for the "Classifica" template. The background is now fully
// clean — no baked-in "SQUADRE/PG/PT" header or "SQUADRA N" placeholder
// rows, just the panel and its own thin column guide lines (pixel-
// measured: 4x5 has one at 17.3% separating position|team and one at
// 83.06% separating PG|PT; 9x16 has only the PG|PT one, at 80.74%) — so
// this layer draws the header and every row itself now, with column
// widths picked to land on those guide lines rather than guessed.
//
// left/right bound the row to the panel's own measured inner width (4x5:
// 7.9%-93.7%, 9x16: 8.3%-94.2%). Within that, posWidth/pgWidth/ptWidth are
// fixed so PG's right edge and PT's right edge line up with the guide
// lines above regardless of digit count (textAlign:'right' — the exact
// same reasoning as the number columns elsewhere in this set); teamName
// fills whatever's left as flex:1.
const LAYOUT: Record<SocialGraphicFormat, {
  left: string; right: string; headerTop: number; rowsTop: number; rowHeight: number; maxRows: number;
  posWidth: number; pgWidth: number; ptWidth: number;
}> = {
  '4x5': {
    left: '7.9%', right: '6.3%', headerTop: 4.5, rowsTop: 10.4, rowHeight: 3.93, maxRows: 20,
    posWidth: 11, pgWidth: 12, ptWidth: 11,
  },
  '9x16': {
    left: '8.3%', right: '5.8%', headerTop: 12, rowsTop: 16.9, rowHeight: 3.31, maxRows: 20,
    posWidth: 11, pgWidth: 12, ptWidth: 13.5,
  },
};

export default function StandingsLayer({ data, format }: { data: StandingsGraphicData; format: SocialGraphicFormat }) {
  const layout = LAYOUT[format];
  const rows = data.rows.slice(0, layout.maxRows);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Header — drawn once, same column widths as every data row below
          it so "PG"/"PT" land directly above their own numbers. */}
      <View style={[styles.row, { top: `${layout.headerTop}%` as DimensionValue, left: layout.left as DimensionValue, right: layout.right as DimensionValue }]}>
        <Text style={[styles.headerText, { width: `${layout.posWidth}%` as DimensionValue }]} />
        <Text style={[styles.headerText, styles.teamHeader]}>SQUADRE</Text>
        <Text style={[styles.headerText, styles.statHeader, { width: `${layout.pgWidth}%` as DimensionValue }]}>PG</Text>
        <Text style={[styles.headerText, styles.statHeader, { width: `${layout.ptWidth}%` as DimensionValue }]}>PT</Text>
      </View>

      {rows.map((row, i) => (
        <View
          key={row.position}
          style={[styles.row, { top: `${layout.rowsTop + i * layout.rowHeight}%` as DimensionValue, left: layout.left as DimensionValue, right: layout.right as DimensionValue }]}
        >
          <Text style={[styles.position, { width: `${layout.posWidth}%` as DimensionValue }]}>{row.position}</Text>
          <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">{row.teamName}</Text>
          <Text style={[styles.stat, { width: `${layout.pgWidth}%` as DimensionValue }]}>{row.played}</Text>
          <Text style={[styles.stat, styles.points, { width: `${layout.ptWidth}%` as DimensionValue }]}>{row.points}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  // Anton — matches the design's own display face used everywhere else in
  // the social graphics set. lineHeight ~1.3x fontSize (not tighter) keeps
  // Anton's ascenders/descenders from clipping, same as the other layers.
  headerText: { fontFamily: 'Anton_400Regular', fontSize: 13, lineHeight: 17, color: '#8A8A8A' },
  teamHeader: { flex: 1, marginLeft: 8 },
  statHeader: { textAlign: 'right' },
  position: { fontFamily: 'Anton_400Regular', fontSize: 16, lineHeight: 21, color: '#FFF' },
  teamName: { flex: 1, marginLeft: 8, fontFamily: 'Anton_400Regular', fontSize: 16, lineHeight: 21, color: '#FFF' },
  stat: { fontFamily: 'Anton_400Regular', fontSize: 16, lineHeight: 21, color: '#FFF', textAlign: 'right' },
  points: { color: '#A6E35C' },
});
