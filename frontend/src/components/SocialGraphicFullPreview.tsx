import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ImageSourcePropType } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import NextMatchLayer from './socialGraphics/NextMatchLayer';
import FullTimeLayer from './socialGraphics/FullTimeLayer';
import FormationLayer from './socialGraphics/FormationLayer';
import { SOCIAL_TEMPLATE_BACKGROUNDS } from '../utils/socialGraphicsAssets';
import { NextMatchGraphicData, FullTimeGraphicData, FormationGraphicData } from '../types/socialGraphics';
import { GREEN_GRADIENT } from './FullPagePaywall';

// Same technique as SocialGraphicPreviewCard's thumbnail, just scaled up to
// a bigger box instead of down to a tiny one: Layer components use fixed
// px font sizes calibrated for REFERENCE_WIDTH, so image + overlay are
// both rendered at that size first and THEN scaled together as one unit —
// guarantees the overlay always lines up with the photo underneath,
// instead of rendering each at a different effective size and hoping the
// percentages happen to agree.
const REFERENCE_WIDTH = 360;
const REFERENCE_HEIGHT = REFERENCE_WIDTH * 1.25; // 4:5

const PREVIEW_WIDTH = 340;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.25;
const SCALE = PREVIEW_WIDTH / REFERENCE_WIDTH;
const TRANSLATE_X = -(REFERENCE_WIDTH * (1 - SCALE)) / 2;
const TRANSLATE_Y = -(REFERENCE_HEIGHT * (1 - SCALE)) / 2;

type Props =
  | { template: 'next_match'; data: NextMatchGraphicData }
  | { template: 'full_time'; data: FullTimeGraphicData }
  | { template: 'formation'; data: FormationGraphicData };

// A bigger, "look before you unlock" preview shown when tapping a locked
// SocialGraphicPreviewCard — same real Layer 0/1 as the actual generator
// (real player names, scores, team names), only blurred on the bottom
// half so the top stays fully legible: enough to sell the design without
// handing over a usable image.
export function SocialGraphicFullPreview(props: Props & {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const { visible, onClose, onUnlock } = props;

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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color="#000" />
          </TouchableOpacity>

          <View style={styles.previewClip}>
            <View style={styles.previewInner}>
              <Image source={background} style={{ width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT }} resizeMode="cover" />
              {renderOverlay()}
            </View>
            {/* Only the bottom half is blurred — the top stays sharp with
                real players/data so people actually see what they'd get.
                Drawn outside previewInner so the blur itself isn't scaled
                (a scaled blur radius would look inconsistent). */}
            {/* Blur temporarily disabled while calibrating the layout —
                re-enable once the positioning is finalized. */}
            {false && <BlurView intensity={18} tint="dark" style={styles.bottomBlur} />}
          </View>

          <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock} activeOpacity={0.85}>
            <LinearGradient colors={GREEN_GRADIENT} style={styles.unlockBtnGradient}>
              <Ionicons name="lock-open-outline" size={17} color="#000" />
              <Text style={styles.unlockBtnText}>SBLOCCA ABBONAMENTO</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: PREVIEW_WIDTH, alignItems: 'center' },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewClip: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewInner: {
    width: REFERENCE_WIDTH,
    height: REFERENCE_HEIGHT,
    transform: [
      { translateX: TRANSLATE_X },
      { translateY: TRANSLATE_Y },
      { scale: SCALE },
    ],
  },
  bottomBlur: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  unlockBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  unlockBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  unlockBtnText: { fontFamily: 'Anton_400Regular', fontSize: 14, color: '#000', letterSpacing: 0.5 },
});
