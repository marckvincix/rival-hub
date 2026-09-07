import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

// Standard crest gallery for a team that doesn't have its own logo — sport
// agnostic (a shield shape + a generic icon), so it works the same for
// calcio, basket, padel, tennis, pallavolo, rugby, etc. Selecting one
// renders it offscreen and captures it as a real image (via ViewShot),
// so the result is stored in Team.logo exactly like an uploaded photo —
// every place that already renders a team's logo (formation grids, social
// graphics, standings, TeamLogo) keeps working unchanged, with no need to
// know a logo might be a "preset" rather than a real upload.
const CREST_PRESETS: { id: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'star_navy', color: '#1E3A8A', icon: 'star' },
  { id: 'flash_red', color: '#B91C1C', icon: 'flash' },
  { id: 'flame_orange', color: '#C2410C', icon: 'flame' },
  { id: 'shield_green', color: '#166534', icon: 'shield' },
  { id: 'paw_brown', color: '#78350F', icon: 'paw' },
  { id: 'diamond_purple', color: '#6D28D9', icon: 'diamond' },
  { id: 'ribbon_pink', color: '#BE185D', icon: 'ribbon' },
  { id: 'trophy_gold', color: '#A16207', icon: 'trophy' },
  { id: 'rocket_blue', color: '#1D4ED8', icon: 'rocket' },
  { id: 'skull_black', color: '#1F2937', icon: 'skull' },
  { id: 'planet_teal', color: '#0F766E', icon: 'planet' },
  { id: 'thunderstorm_slate', color: '#334155', icon: 'thunderstorm' },
  { id: 'leaf_lime', color: '#4D7C0F', icon: 'leaf' },
  { id: 'eye_indigo', color: '#3730A3', icon: 'eye' },
  { id: 'moon_maroon', color: '#7F1D1D', icon: 'moon' },
  { id: 'sunny_amber', color: '#B45309', icon: 'sunny' },
];

// Shield outline, normalized to a 100×120 viewBox.
const SHIELD_PATH = 'M50,2 L92,18 C92,70 74,104 50,118 C26,104 8,70 8,18 Z';

function Crest({ color, icon, size = 72 }: { color: string; icon: keyof typeof Ionicons.glyphMap; size?: number }) {
  // Solid white square behind the shield (not transparent): every place
  // that renders Team.logo crops it into a circle with plain
  // `resizeMode="cover"` and nothing guaranteed behind it — a transparent
  // PNG would let whatever background is there (a stadium photo, in the
  // social graphics templates) show through the shield's corners.
  return (
    <View style={{ width: size, height: size * 1.2, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={StyleSheet.absoluteFill}>
        <Path d={SHIELD_PATH} fill={color} stroke="#FFF" strokeWidth={3} />
        <Circle cx={50} cy={50} r={34} fill="rgba(255,255,255,0.14)" />
      </Svg>
      <Ionicons name={icon} size={size * 0.42} color="#FFF" style={{ marginTop: -size * 0.08 }} />
    </View>
  );
}

export default function TeamCrestPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (dataUri: string) => void;
}) {
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const shotRefs = useRef<Record<string, ViewShot | null>>({});

  const handlePick = async (id: string) => {
    const ref = shotRefs.current[id];
    if (!ref?.capture) return;
    setCapturingId(id);
    try {
      const uri = await ref.capture();
      onSelect(uri);
      onClose();
    } catch (error) {
      console.error('Crest capture error:', error);
    } finally {
      setCapturingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Scegli uno stemma</Text>
          <Text style={styles.hint}>Uno stemma standard da assegnare alla squadra, se non ne hai uno tuo.</Text>
          <ScrollView contentContainerStyle={styles.grid} style={{ maxHeight: 360 }}>
            {CREST_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={styles.cell}
                onPress={() => handlePick(preset.id)}
                disabled={capturingId !== null}
              >
                <ViewShot
                  ref={(r) => { shotRefs.current[preset.id] = r; }}
                  options={{ format: 'png', quality: 1, width: 256, height: 307 }}
                >
                  <Crest color={preset.color} icon={preset.icon} />
                </ViewShot>
                {capturingId === preset.id && <View style={styles.cellLoadingOverlay} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={styles.cancel}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 420 },
  title: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 4 },
  hint: { fontSize: 13, color: '#666', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: { width: 72, alignItems: 'center', justifyContent: 'center' },
  cellLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)' },
  cancel: { fontSize: 14, color: '#666', fontWeight: '600' },
});
