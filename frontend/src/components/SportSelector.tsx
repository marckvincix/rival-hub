import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Sport, SPORTS_CONFIG } from '../types';

interface SportSelectorProps {
  onSelectSport: (sport: Sport) => void;
  onBack: () => void;
}

export default function SportSelector({ onSelectSport, onBack }: SportSelectorProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Scegli lo sport</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {SPORTS_CONFIG.map((sport) => (
          <TouchableOpacity
            key={sport.id}
            style={styles.sportCard}
            onPress={() => onSelectSport(sport.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.sportEmoji}>{sport.emoji}</Text>
            <Text style={styles.sportName}>{sport.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  backButton: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    paddingBottom: 100,
  },
  sportCard: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  sportEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  sportName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
