import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';

interface WelcomeTourModalProps {
  visible: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeTourModal({ visible, onStart, onSkip }: WelcomeTourModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket" size={32} color="#FFF" />
          </View>
          <Text style={styles.title}>{t('tour.welcomeTitle', 'Benvenuto in Rival Hub!')}</Text>
          <Text style={styles.desc}>
            {t('tour.welcomeDesc', 'Ti guidiamo passo passo nella creazione del tuo primo torneo: squadre, giocatori, partite e classifica.')}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onStart} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>{t('tour.start', 'Inizia il tour guidato')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipBtnText}>{t('tour.skipForNow', 'Salta, esplorerò da solo')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 6,
  },
  skipBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
