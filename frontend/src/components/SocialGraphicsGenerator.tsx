import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, Alert, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { Button } from './Button';
import NextMatchLayer from './socialGraphics/NextMatchLayer';
import FullTimeLayer from './socialGraphics/FullTimeLayer';
import StandingsLayer from './socialGraphics/StandingsLayer';
import FormationLayer from './socialGraphics/FormationLayer';
import { SOCIAL_TEMPLATE_BACKGROUNDS, SOCIAL_GRAPHIC_EXPORT_SIZE } from '../utils/socialGraphicsAssets';
import {
  SocialGraphicFormat,
  FormationVariant,
  NextMatchGraphicData,
  FullTimeGraphicData,
  StandingsGraphicData,
  FormationGraphicData,
} from '../types/socialGraphics';

type Props =
  | { visible: boolean; onClose: () => void; template: 'next_match'; data: NextMatchGraphicData }
  | { visible: boolean; onClose: () => void; template: 'full_time'; data: FullTimeGraphicData }
  | { visible: boolean; onClose: () => void; template: 'standings'; data: StandingsGraphicData }
  | { visible: boolean; onClose: () => void; template: 'formation'; data: FormationGraphicData };

const TEMPLATE_TITLES: Record<Props['template'], string> = {
  next_match: 'Prossima Partita',
  full_time: 'Risultato Finale',
  standings: 'Classifica',
  formation: 'Formazione',
};

// "Grafiche Social" generator — a single component reused by all four
// templates. Layer 0 (background) is a plain <Image>, Layer 1 is one of
// the template-specific overlay components above, both live inside a
// ViewShot so "Scarica" captures exactly what's on screen (scaled up to
// the template's full export resolution) as one flattened image.
export default function SocialGraphicsGenerator(props: Props) {
  const { visible, onClose, template } = props;
  const { width: windowWidth } = useWindowDimensions();

  const [format, setFormat] = useState<SocialGraphicFormat>('4x5');
  const [formationVariant, setFormationVariant] = useState<FormationVariant>('circles');
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const shotRef = useRef<ViewShot>(null);

  const backgroundKey = template === 'formation' ? (formationVariant === 'bust' ? 'formation_bust' : 'formation_circles') : template;
  const background = SOCIAL_TEMPLATE_BACKGROUNDS[backgroundKey][format];
  const exportSize = SOCIAL_GRAPHIC_EXPORT_SIZE[format];

  // Preview scaled down to fit the modal, captured at full exportSize
  // regardless of this on-screen size (see ViewShot's options below).
  const previewWidth = Math.min(windowWidth - 48, 360);
  const previewHeight = previewWidth * (exportSize.height / exportSize.width);

  const handleDownload = async () => {
    if (!shotRef.current?.capture) return;
    setDownloading(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(
          'Permesso Foto necessario',
          "Per salvare la grafica, consenti l'accesso alle foto a Rival Hub nelle impostazioni del telefono."
        );
        return;
      }
      const uri = await shotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Fatto', 'Grafica salvata nella libreria foto.');
    } catch (error) {
      console.error('Social graphic capture/save error:', error);
      Alert.alert('Errore', 'Impossibile generare la grafica. Riprova.');
    } finally {
      setDownloading(false);
    }
  };

  const renderOverlay = () => {
    switch (props.template) {
      case 'next_match':
        return <NextMatchLayer data={props.data} format={format} />;
      case 'full_time':
        return <FullTimeLayer data={props.data} format={format} />;
      case 'standings':
        return <StandingsLayer data={props.data} format={format} />;
      case 'formation':
        return <FormationLayer data={props.data} format={format} variant={formationVariant} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{TEMPLATE_TITLES[template]}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Format toggle — plain tabs, not a dropdown */}
        <View style={styles.formatTabs}>
          {(['4x5', '9x16'] as SocialGraphicFormat[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.formatTab, format === f && styles.formatTabActive]}
              onPress={() => setFormat(f)}
            >
              <Ionicons name={f === '4x5' ? 'square-outline' : 'phone-portrait-outline'} size={16} color={format === f ? '#FFF' : '#000'} />
              <Text style={[styles.formatTabText, format === f && styles.formatTabTextActive]}>
                {f === '4x5' ? 'Post (4:5)' : 'Storia (9:16)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {template === 'formation' && (
          <TouchableOpacity style={styles.variantPill} onPress={() => setVariantPickerOpen(true)}>
            <Ionicons name="options-outline" size={16} color="#000" />
            <Text style={styles.variantPillText}>
              Stile: {formationVariant === 'bust' ? 'Foto giocatori' : 'Solo numeri'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        )}

        <View style={styles.previewWrap}>
          <ViewShot
            ref={shotRef}
            options={{ format: 'jpg', quality: 0.92, width: exportSize.width, height: exportSize.height }}
            style={{ width: previewWidth, height: previewHeight }}
          >
            {/* Explicit width/height, not absoluteFill — on this specific
                image (a large require()'d JPG with no layout-time intrinsic
                size hint), absoluteFill made RN misjudge the source size
                and "cover" zoomed in drastically instead of fitting it. */}
            <Image source={background} style={{ width: previewWidth, height: previewHeight }} resizeMode="cover" />
            {renderOverlay()}
          </ViewShot>
        </View>

        <View style={styles.footer}>
          <Button title="Scarica" icon="download-outline" onPress={handleDownload} loading={downloading} fullWidth />
        </View>
      </View>

      {/* Formation style picker — centered modal popup, not a dropdown */}
      <Modal visible={variantPickerOpen} transparent animationType="fade" onRequestClose={() => setVariantPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Stile formazione</Text>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => { setFormationVariant('circles'); setVariantPickerOpen(false); }}
            >
              <Ionicons name={formationVariant === 'circles' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#000" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.pickerRowTitle}>Solo numeri</Text>
                <Text style={styles.pickerRowHint}>Usa le foto già impostate sui giocatori, o cerchi vuoti se non ne hanno.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => { setFormationVariant('bust'); setVariantPickerOpen(false); }}
            >
              <Ionicons name={formationVariant === 'bust' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#000" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.pickerRowTitle}>Foto giocatori (mezzo busto)</Text>
                <Text style={styles.pickerRowHint}>Carica una foto per ogni titolare al momento della grafica.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVariantPickerOpen(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={styles.pickerCancel}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 16 : 24, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#000' },
  closeBtn: { padding: 4 },
  formatTabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  formatTab: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#000', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14 },
  formatTabActive: { backgroundColor: '#000' },
  formatTabText: { fontSize: 13, fontWeight: '700', color: '#000' },
  formatTabTextActive: { color: '#FFF' },
  variantPill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  variantPillText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#000' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F2' },
  footer: { padding: 20 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380 },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 12 },
  pickerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
  pickerRowTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  pickerRowHint: { fontSize: 12, color: '#666', marginTop: 2 },
  pickerCancel: { fontSize: 14, color: '#666', fontWeight: '600' },
});
