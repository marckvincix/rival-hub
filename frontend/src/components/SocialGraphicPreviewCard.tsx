import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import NextMatchLayer from './socialGraphics/NextMatchLayer';
import FullTimeLayer from './socialGraphics/FullTimeLayer';
import FormationLayer from './socialGraphics/FormationLayer';
import { SOCIAL_TEMPLATE_BACKGROUNDS } from '../utils/socialGraphicsAssets';
import { NextMatchGraphicData, FullTimeGraphicData, FormationGraphicData } from '../types/socialGraphics';

// Same 4x5 reference width SocialGraphicsGenerator.tsx renders its own
// preview at — Layer components use fixed px font sizes calibrated for
// this width, so the thumbnail below renders at this size and is then
// shrunk with a scale transform (not a smaller container), which scales
// text/logos/spacing together correctly instead of overflowing/misaligning.
const REFERENCE_WIDTH = 360;
const REFERENCE_HEIGHT = REFERENCE_WIDTH * 1.25; // 4:5

const THUMB_WIDTH = 132;
const THUMB_HEIGHT = THUMB_WIDTH * 1.25;
const SCALE = THUMB_WIDTH / REFERENCE_WIDTH;
// Compensates the transform's default center origin so the scaled content
// still lines up with the thumbnail's top-left corner.
const TRANSLATE_X = -(REFERENCE_WIDTH * (1 - SCALE)) / 2;
const TRANSLATE_Y = -(REFERENCE_HEIGHT * (1 - SCALE)) / 2;

type CardProps =
  | { template: 'next_match'; data: NextMatchGraphicData }
  | { template: 'full_time'; data: FullTimeGraphicData }
  | { template: 'formation'; data: FormationGraphicData };

export function SocialGraphicPreviewCard(props: CardProps & {
  title: string;
  subtitle: string;
  locked: boolean;
  onPress: () => void;
}) {
  const { title, subtitle, locked, onPress } = props;

  const backgroundKey = props.template === 'formation' ? 'formation_circles' : props.template;
  const background: ImageSourcePropType = SOCIAL_TEMPLATE_BACKGROUNDS[backgroundKey]['4x5'];

  const renderOverlay = () => {
    switch (props.template) {
      case 'next_match':
        return <NextMatchLayer data={props.data} format="4x5" />;
      case 'full_time':
        return <FullTimeLayer data={props.data} format="4x5" />;
      case 'formation':
        return <FormationLayer data={props.data} format="4x5" variant="circles" />;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.thumbClip}>
        <View style={styles.thumbInner}>
          {/* Explicit width/height, not absoluteFill — on these require()'d
              JPGs, absoluteFill made RN misjudge the source size and
              "cover" zoomed in drastically instead of fitting it. */}
          <Image source={background} style={{ width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT }} resizeMode="cover" />
          {renderOverlay()}
        </View>

        {locked && (
          <>
            {/* Light enough that the graphic's quality is still visible —
                a teaser should sell the subscription, not just say "no". */}
            <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={16} color="#FFF" />
            </View>
          </>
        )}
      </View>

      <View style={styles.captionRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={styles.cta}>{locked ? 'Sblocca' : 'Apri'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: THUMB_WIDTH },
  thumbClip: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  thumbInner: {
    width: REFERENCE_WIDTH,
    height: REFERENCE_HEIGHT,
    transform: [
      { translateX: TRANSLATE_X },
      { translateY: TRANSLATE_Y },
      { scale: SCALE },
    ],
  },
  lockBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -14,
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, gap: 4 },
  title: { fontSize: 12, fontWeight: '700', color: '#000' },
  subtitle: { fontSize: 10.5, color: '#666', marginTop: 1 },
  cta: { fontSize: 11, fontWeight: '700', color: '#166534' },
});
