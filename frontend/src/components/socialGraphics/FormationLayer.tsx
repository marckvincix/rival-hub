import React from 'react';
import { View, Text, Image, StyleSheet, DimensionValue } from 'react-native';
import { FormationGraphicData, FormationGraphicPlayer, FormationVariant, SocialGraphicFormat } from '../../types/socialGraphics';

// Grid rows top-to-bottom: forwards -> midfielders -> defenders ->
// goalkeeper, matching the real background (attack nearest the top,
// keeper nearest the roster lists at the bottom).
const ROW_ORDER: FormationGraphicPlayer['role'][] = ['forward', 'midfielder', 'defender', 'goalkeeper'];

// Measured directly off the real backgrounds (formation_bust_*.jpg /
// formation_circles_*.jpg — both share the same panel/grid layout per
// format, only the slot content differs): row y-centers for a 4-row grid
// (e.g. 4-3-3), horizontal spacing between slot centers within a row (any
// player count) stays ~15.8% in both formats since both are 1080px wide —
// only the vertical layout (rowTops/logo/module/roster) actually differs.
// slotSize is smaller than a plain-circle design would use (11%, not the
// ~14% a circle alone needs) to leave headroom for each slot's own name
// label underneath, in the same ~12.7-13% gap between row centers.
const LAYOUT: Record<SocialGraphicFormat, {
  rowTops: number[]; slotSize: number; gridWidth: number;
  slotInitialSize: number; slotNameSize: number;
  logoLeft: string; logoTop: string; logoSize: string;
  moduleRight: string; moduleTop: string; moduleSize: number;
  rosterTop: string; rosterRowHeight: number;
}> = {
  // Pixel-measured against the real backgrounds. Both "_def" revisions
  // have a much taller panel than the originals — 4x5: 2.5%-67.5% (was
  // 2.5%-60.9%); 9x16: 5.6%-69.0% (was 21.8%-62.0%, nearly double its old
  // usable height) — which is why both got noticeably bigger player
  // circles/names and a bigger, better-margined module than their
  // original, more cramped calibration.
  // All rows share one horizontal gap, computed at render time from
  // gridWidth and whichever row has the most players (see maxRowCount
  // below) — a fixed gap sized for a 4-a-side row ran a 5-a-side row (e.g.
  // 3-5-2's midfield line) past the panel's own edges, since nothing
  // scaled the spacing down as more circles needed to fit across the same
  // width. gridWidth is the panel's own pure-black width measured directly
  // (12.3%-89.4% in 4x5, 10.0%-91.4% in 9x16) minus a few points of margin
  // on each side, not the full width, so even a 5-wide row keeps clear
  // of the rounded corners.
  // The whole grid shifts down as a block for the goalkeeper's row to
  // stay evenly spaced with the other three, rather than changing that
  // last row's own gap to the others.
  // logoLeft/moduleRight are pulled in from the panel's own corners (not
  // just its straight edges) — the rounded corner cuts into the usable
  // area there. moduleTop/moduleSize give the module real margin from the
  // panel's bottom edge (not just clearing the grid above it) — it used
  // to run past that edge and read as "not really inside the black panel".
  '4x5': {
    rowTops: [6, 20.8, 35.6, 50.4],
    slotSize: 12,
    gridWidth: 71.1,
    slotInitialSize: 18, slotNameSize: 9,
    logoLeft: '9%', logoTop: '61.5%', logoSize: '9%',
    moduleRight: '17%', moduleTop: '61.5%', moduleSize: 18,
    rosterTop: '72%', rosterRowHeight: 0,
  },
  '9x16': {
    rowTops: [10, 23.5, 37, 50.5],
    slotSize: 13,
    gridWidth: 75.4,
    slotInitialSize: 20, slotNameSize: 10,
    // logoLeft/logoTop center the circle roughly on the panel's own
    // bottom-left corner (the pure-black area starts at ~10% horizontally,
    // the green border ends at ~69% vertically) so it straddles that
    // corner half in/half out, same as the original design's "sporgente"
    // logo circle — not sitting fully inside with margin like the module.
    logoLeft: '5.5%', logoTop: '66.5%', logoSize: '9%',
    moduleRight: '15%', moduleTop: '63%', moduleSize: 20,
    rosterTop: '73%', rosterRowHeight: 0,
  },
};

export default function FormationLayer({
  data,
  format,
  variant,
}: {
  data: FormationGraphicData;
  format: SocialGraphicFormat;
  variant: FormationVariant;
}) {
  const layout = LAYOUT[format];
  const byRole: Record<FormationGraphicPlayer['role'], FormationGraphicPlayer[]> = {
    goalkeeper: [], defender: [], midfielder: [], forward: [],
  };
  for (const p of data.starters) {
    (byRole[p.role] || byRole.midfielder).push(p);
  }
  const rows = ROW_ORDER.map((role) => byRole[role]).filter((r) => r.length > 0);
  // One shared gap for every row, sized so the most crowded row (5-a-side
  // for something like 3-5-2, not just the usual 3/4) still fits inside
  // gridWidth — a fixed gap tuned for 4-a-side would push a 5-a-side row's
  // outer circles past the panel's own edges instead.
  const maxRowCount = Math.max(...rows.map((r) => r.length), 1);
  const gridGapPercent = maxRowCount > 1
    ? (layout.gridWidth - maxRowCount * layout.slotSize) / (maxRowCount - 1)
    : 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Tactical grid — each row is centered as a group (full-width
          container, justifyContent center + gap) so it works for any
          player count, including a lone goalkeeper. */}
      {rows.map((rowPlayers, i) => (
        <View
          key={i}
          style={[
            styles.gridRow,
            { top: `${layout.rowTops[Math.min(i, layout.rowTops.length - 1)]}%` as DimensionValue, gap: `${gridGapPercent}%` },
          ]}
        >
          {rowPlayers.map((p, j) => (
            <PlayerSlot
              key={j}
              player={p}
              variant={variant}
              sizePercent={layout.slotSize}
              initialSize={layout.slotInitialSize}
              nameSize={layout.slotNameSize}
            />
          ))}
        </View>
      ))}

      {/* Team logo — bottom-left protruding circle */}
      <View style={[styles.teamLogoWrap, { left: layout.logoLeft as DimensionValue, top: layout.logoTop as DimensionValue, width: layout.logoSize as DimensionValue }]}>
        {data.teamLogo ? (
          <Image source={{ uri: data.teamLogo }} style={styles.teamLogo} resizeMode="cover" />
        ) : (
          <View style={[styles.teamLogo, styles.teamLogoPlaceholder]}>
            <Text style={styles.teamLogoInitial}>{data.teamName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Tactical module — bottom-right of the black panel */}
      <Text
        style={[
          styles.moduleText,
          { top: layout.moduleTop as DimensionValue, right: layout.moduleRight as DimensionValue, fontSize: layout.moduleSize, lineHeight: Math.round(layout.moduleSize * 1.3) },
        ]}
      >
        {data.module}
      </Text>

      {/* Bench only — starters' names are already on the pitch, under
          their own circle in the grid above, so a separate "TITOLARI"
          list here would just repeat them. rosterOuter's left:0/right:0 +
          alignItems:'center' centers this single block (header + lines)
          as a unit. numberOfLines caps every line at one — a long name
          truncates with an ellipsis instead of wrapping. */}
      <View style={[styles.rosterOuter, { top: layout.rosterTop as DimensionValue }]}>
        <Text style={styles.rosterHeader}>PANCHINA</Text>
        {data.bench.map((p, i) => (
          <View key={i} style={[styles.rosterLine, { marginBottom: `${layout.rosterRowHeight}%` as DimensionValue }]}>
            <Text style={styles.rosterNumber}>{p.number ?? '-'}</Text>
            <Text style={styles.rosterName} numberOfLines={1} ellipsizeMode="tail">{p.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerSlot({ player, variant, sizePercent, initialSize, nameSize }: {
  player: FormationGraphicPlayer; variant: FormationVariant; sizePercent: number;
  initialSize: number; nameSize: number;
}) {
  const showPhoto = variant === 'bust' && !!player.photo;
  // The percentage width has to live on this outer slot (sized relative to
  // gridRow, which has a real resolved width via left:0/right:0) — putting
  // it on the circle/photo directly would try to resolve against an
  // intrinsically-sized parent and not size at all.
  return (
    <View style={[styles.slot, { width: `${sizePercent}%` as DimensionValue }]}>
      {showPhoto ? (
        <Image source={{ uri: player.photo }} style={styles.slotPhoto} resizeMode="cover" />
      ) : (
        <View style={styles.slotCircle}>
          {/* Jersey number when there is one — that's what a real formation
              graphic is expected to show — falling back to the name's
              initial only for a player with no number set. */}
          <Text style={[styles.slotInitial, { fontSize: initialSize, lineHeight: Math.round(initialSize * 1.3) }]}>
            {player.number != null ? player.number : (player.name ? player.name.charAt(0).toUpperCase() : '?')}
          </Text>
        </View>
      )}
      {/* Real name under every slot, not just in the roster list below —
          same font-size-vs-line-count tradeoff as the roster list: one
          line, truncated, rather than risk overlapping the row beneath. */}
      <Text style={[styles.slotName, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.35) }]} numberOfLines={1} ellipsizeMode="tail">
        {player.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  slot: { alignItems: 'center' },
  slotCircle: { width: '100%', aspectRatio: 1, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#A6E35C', alignItems: 'center', justifyContent: 'center' },
  slotPhoto: { width: '100%', aspectRatio: 0.8, borderRadius: 8 },
  // Anton — matches the design's own display face used everywhere else in
  // the social graphics set. fontSize/lineHeight come from LAYOUT (per
  // format — 4x5's taller "_def" panel fits bigger circles/names than
  // 9x16's does) and are applied inline; ~1.3x fontSize lineHeight (not
  // tighter) keeps Anton's ascenders/descenders from clipping, same as
  // NextMatchLayer/FullTimeLayer.
  slotInitial: { fontFamily: 'Anton_400Regular', color: '#000' },
  slotName: { marginTop: 2, width: '100%', fontFamily: 'Anton_400Regular', color: '#FFF', textAlign: 'center' },
  teamLogoWrap: { position: 'absolute', aspectRatio: 1 },
  teamLogo: { width: '100%', height: '100%', borderRadius: 999 },
  teamLogoPlaceholder: { backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  teamLogoInitial: { fontFamily: 'Anton_400Regular', fontSize: 24, lineHeight: 31, color: '#000' },
  // The original design's dim grey (#8A8A8A/muted, not opaque white) —
  // "more visible" meant bigger while staying fully inside the black
  // panel, not a color change. fontSize comes from LAYOUT.moduleSize
  // (bigger in 4x5's taller "_def" panel, which now has real margin to
  // spare, than in 9x16's smaller one) and is applied inline.
  moduleText: { position: 'absolute', fontFamily: 'Anton_400Regular', color: '#8A8A8A' },
  // left:0/right:0 + alignItems:'center' centers this whole block (header
  // + each line) as a unit in the middle of the image.
  rosterOuter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  rosterHeader: { fontFamily: 'Anton_400Regular', fontSize: 11, lineHeight: 14, color: '#A6E35C', marginBottom: 3 },
  rosterLine: { flexDirection: 'row', alignItems: 'center' },
  rosterNumber: { width: 16, fontFamily: 'Anton_400Regular', fontSize: 9, lineHeight: 10, color: '#A6E35C', textAlign: 'left' },
  rosterName: { fontFamily: 'Anton_400Regular', fontSize: 8, lineHeight: 10, color: '#FFF' },
});
