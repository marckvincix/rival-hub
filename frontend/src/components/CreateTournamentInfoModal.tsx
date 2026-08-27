import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';

interface CreateTournamentInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

// Highlights Plus isn't mentioned here at all: it's offered separately via
// its own paywall right after registration (see (auth)/register.tsx), where
// real per-store prices are always available. This modal is purely about
// what creating a tournament gets you.
export function CreateTournamentInfoModal({ visible, onClose, onContinue }: CreateTournamentInfoModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const FEATURES = [
    { icon: 'trophy-outline' as const, title: t('home.featureTournaments', 'Tournament Management'), desc: t('home.featureTournamentsDesc', 'Create and manage tournaments of any sport') },
    { icon: 'people-outline' as const, title: t('home.featureTeams', 'Teams'), desc: t('home.featureTeamsDesc', 'Organize rosters and statistics') },
    { icon: 'stats-chart-outline' as const, title: t('home.featureStandings', 'Standings'), desc: t('home.featureStandingsDesc', 'Real-time standings and results') },
    { icon: 'newspaper-outline' as const, title: t('home.featureNews', 'News'), desc: t('home.featureNewsDesc', 'Publish updates') },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={28} color="#FFF" />
            </View>
            <Text style={styles.title}>{t('createTournamentModal.title', 'Crea il tuo torneo')}</Text>
            <Text style={styles.subtitle}>
              {t('createTournamentModal.subtitle', 'Calcio, basket, padel, tennis, pallavolo, rugby e altro ancora')}
            </Text>

            <View style={styles.featuresList}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureRow}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name={f.icon} size={24} color="#000" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.continueButton} onPress={onContinue} activeOpacity={0.8}>
              <Text style={styles.continueButtonText}>{t('common.continue', 'Continua')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  scroll: {
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  featuresList: {
    gap: 18,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 19,
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
