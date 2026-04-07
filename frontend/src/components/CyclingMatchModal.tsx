import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface Player {
  id: string;
  full_name: string;
  number?: number;
  role?: string;
}

interface AthleteTime {
  player_id: string;
  player_name: string;
  team_id: string;
  time_seconds: number; // Total time in seconds
  time_display: string; // HH:MM:SS format
  position?: number;
  gap?: number; // Gap from leader in seconds
}

interface CyclingMatchModalProps {
  visible: boolean;
  onClose: () => void;
  match: any;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  onSave: (data: any) => void;
  stageName?: string;
}

export function CyclingMatchModal({
  visible,
  onClose,
  match,
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  onSave,
  stageName,
}: CyclingMatchModalProps) {
  const [athleteTimes, setAthleteTimes] = useState<AthleteTime[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // All athletes combined
  const allAthletes = [
    ...homePlayers.map(p => ({ ...p, team_id: homeTeamId, team_name: homeTeamName })),
    ...awayPlayers.map(p => ({ ...p, team_id: awayTeamId, team_name: awayTeamName })),
  ];

  // Load existing data
  useEffect(() => {
    if (match && visible) {
      const existingTimes = match.cycling_times || [];
      if (existingTimes.length > 0) {
        setAthleteTimes(existingTimes);
      } else {
        // Initialize with all athletes
        const initialTimes: AthleteTime[] = allAthletes.map(athlete => ({
          player_id: athlete.id,
          player_name: athlete.full_name,
          team_id: athlete.team_id,
          time_seconds: 0,
          time_display: '00:00:00',
        }));
        setAthleteTimes(initialTimes);
      }
    }
  }, [match, visible]);

  // Parse time string to seconds
  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Format seconds to time string
  const formatSecondsToTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format gap
  const formatGap = (gapSeconds: number): string => {
    if (gapSeconds === 0) return '-';
    const minutes = Math.floor(gapSeconds / 60);
    const seconds = gapSeconds % 60;
    if (minutes > 0) {
      return `+${minutes}'${seconds.toString().padStart(2, '0')}"`;
    }
    return `+${seconds}"`;
  };

  // Update athlete time
  const updateAthleteTime = (playerId: string, timeStr: string) => {
    const timeSeconds = parseTimeToSeconds(timeStr);
    setAthleteTimes(prev => {
      const updated = prev.map(at => 
        at.player_id === playerId 
          ? { ...at, time_display: timeStr, time_seconds: timeSeconds }
          : at
      );
      return calculatePositions(updated);
    });
  };

  // Calculate positions and gaps
  const calculatePositions = (times: AthleteTime[]): AthleteTime[] => {
    // Filter athletes with valid times and sort by time
    const withTimes = times.filter(t => t.time_seconds > 0);
    const withoutTimes = times.filter(t => t.time_seconds === 0);
    
    // Sort by time (ascending - fastest first)
    withTimes.sort((a, b) => a.time_seconds - b.time_seconds);
    
    // Calculate positions and gaps
    const leaderTime = withTimes[0]?.time_seconds || 0;
    const positioned = withTimes.map((t, idx) => ({
      ...t,
      position: idx + 1,
      gap: t.time_seconds - leaderTime,
    }));
    
    // Combine with athletes without times
    return [...positioned, ...withoutTimes.map(t => ({ ...t, position: undefined, gap: undefined }))];
  };

  // Auto-save logic
  const triggerAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    setAutoSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        // Calculate winner (fastest time)
        const sortedTimes = [...athleteTimes].filter(t => t.time_seconds > 0).sort((a, b) => a.time_seconds - b.time_seconds);
        const winner = sortedTimes[0];
        
        await api.put(`/api/matches/${match.id}`, {
          cycling_times: athleteTimes,
          status: 'in_progress',
          // Store winner info in home/away goals for compatibility
          home_goals: winner?.team_id === homeTeamId ? 1 : 0,
          away_goals: winner?.team_id === awayTeamId ? 1 : 0,
        });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('idle');
      }
    }, 500);
  }, [athleteTimes, match?.id, homeTeamId, awayTeamId]);

  // Trigger auto-save when times change
  useEffect(() => {
    if (athleteTimes.some(t => t.time_seconds > 0) && visible) {
      triggerAutoSave();
    }
  }, [athleteTimes, visible]);

  // End stage
  const handleEndStage = () => {
    const sortedTimes = [...athleteTimes].filter(t => t.time_seconds > 0).sort((a, b) => a.time_seconds - b.time_seconds);
    const winner = sortedTimes[0];
    
    if (!winner) {
      Alert.alert('Errore', 'Inserisci almeno un tempo per terminare la tappa');
      return;
    }

    Alert.alert(
      'Fine Tappa',
      `Terminare la tappa?\nVincitore: ${winner.player_name} (${winner.time_display})`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              await api.put(`/api/matches/${match.id}`, {
                cycling_times: athleteTimes,
                status: 'completed',
                home_goals: winner?.team_id === homeTeamId ? 1 : 0,
                away_goals: winner?.team_id === awayTeamId ? 1 : 0,
              });
              onSave({ cycling_times: athleteTimes, status: 'completed' });
              onClose();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile salvare la tappa');
            }
          },
        },
      ]
    );
  };

  // Get sorted times for display
  const sortedTimes = calculatePositions(athleteTimes);
  const rankedAthletes = sortedTimes.filter(t => t.position !== undefined);
  const unrankedAthletes = sortedTimes.filter(t => t.position === undefined);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🚴 {stageName || 'Tappa'}</Text>
            <Text style={styles.headerSubtitle}>{match?.round || 'Tappa 1'}</Text>
          </View>
          <View style={styles.autoSaveIndicator}>
            {autoSaveStatus === 'saving' && (
              <Text style={styles.autoSaveText}>Salvando...</Text>
            )}
            {autoSaveStatus === 'saved' && (
              <Text style={[styles.autoSaveText, { color: '#2D8A2E' }]}>✓ Salvato</Text>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Classifica */}
          {rankedAthletes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Classifica Tappa</Text>
              {rankedAthletes.map((athlete, idx) => (
                <View key={athlete.player_id} style={[styles.rankRow, idx === 0 && styles.rankRowWinner]}>
                  <View style={styles.rankPosition}>
                    <Text style={[styles.rankPositionText, idx === 0 && styles.rankPositionWinner]}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`}
                    </Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{athlete.player_name}</Text>
                    <Text style={styles.rankTeam}>({allAthletes.find(a => a.id === athlete.player_id)?.team_name || ''})</Text>
                  </View>
                  <View style={styles.rankTime}>
                    <Text style={[styles.rankTimeText, idx === 0 && styles.rankTimeWinner]}>{athlete.time_display}</Text>
                    {idx > 0 && (
                      <Text style={styles.rankGap}>{formatGap(athlete.gap || 0)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Inserimento Tempi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏱️ Inserisci Tempi</Text>
            <Text style={styles.sectionHint}>Formato: HH:MM:SS (es. 01:23:45)</Text>
            
            {/* Home Team */}
            <View style={styles.teamSection}>
              <Text style={styles.teamTitle}>{homeTeamName}</Text>
              {homePlayers.map(player => {
                const athleteTime = athleteTimes.find(t => t.player_id === player.id);
                return (
                  <View key={player.id} style={styles.athleteRow}>
                    <View style={styles.athleteInfo}>
                      <View style={styles.athleteNumber}>
                        <Text style={styles.athleteNumberText}>{player.number || '-'}</Text>
                      </View>
                      <Text style={styles.athleteName}>{player.full_name}</Text>
                      {player.role && <Text style={styles.athleteRole}>{player.role}</Text>}
                    </View>
                    <TextInput
                      style={styles.timeInput}
                      value={athleteTime?.time_display || '00:00:00'}
                      onChangeText={(text) => {
                        // Auto-format as user types
                        const cleaned = text.replace(/[^0-9]/g, '');
                        let formatted = cleaned;
                        if (cleaned.length >= 2) formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
                        if (cleaned.length >= 4) formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4) + ':' + cleaned.slice(4, 6);
                        updateAthleteTime(player.id, formatted.slice(0, 8));
                      }}
                      placeholder="00:00:00"
                      keyboardType="numeric"
                      maxLength={8}
                    />
                  </View>
                );
              })}
            </View>

            {/* Away Team */}
            {awayPlayers.length > 0 && (
              <View style={styles.teamSection}>
                <Text style={styles.teamTitle}>{awayTeamName}</Text>
                {awayPlayers.map(player => {
                  const athleteTime = athleteTimes.find(t => t.player_id === player.id);
                  return (
                    <View key={player.id} style={styles.athleteRow}>
                      <View style={styles.athleteInfo}>
                        <View style={styles.athleteNumber}>
                          <Text style={styles.athleteNumberText}>{player.number || '-'}</Text>
                        </View>
                        <Text style={styles.athleteName}>{player.full_name}</Text>
                        {player.role && <Text style={styles.athleteRole}>{player.role}</Text>}
                      </View>
                      <TextInput
                        style={styles.timeInput}
                        value={athleteTime?.time_display || '00:00:00'}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, '');
                          let formatted = cleaned;
                          if (cleaned.length >= 2) formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
                          if (cleaned.length >= 4) formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4) + ':' + cleaned.slice(4, 6);
                          updateAthleteTime(player.id, formatted.slice(0, 8));
                        }}
                        placeholder="00:00:00"
                        keyboardType="numeric"
                        maxLength={8}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* End Stage Button */}
          <TouchableOpacity style={styles.endBtn} onPress={handleEndStage}>
            <Ionicons name="flag" size={20} color="#FFF" />
            <Text style={styles.endBtnText}>Fine Tappa</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  closeBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  autoSaveIndicator: { minWidth: 80, alignItems: 'flex-end' },
  autoSaveText: { fontSize: 12, color: '#666' },
  content: { flex: 1 },
  section: { backgroundColor: '#FFF', margin: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionHint: { fontSize: 12, color: '#666', marginBottom: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rankRowWinner: { backgroundColor: '#FFF9E6' },
  rankPosition: { width: 40, alignItems: 'center' },
  rankPositionText: { fontSize: 16, fontWeight: '600' },
  rankPositionWinner: { fontSize: 20 },
  rankInfo: { flex: 1, marginLeft: 8 },
  rankName: { fontSize: 14, fontWeight: '600' },
  rankTeam: { fontSize: 12, color: '#666' },
  rankTime: { alignItems: 'flex-end' },
  rankTimeText: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  rankTimeWinner: { color: '#2D8A2E', fontWeight: '700' },
  rankGap: { fontSize: 12, color: '#E53935', marginTop: 2 },
  teamSection: { marginBottom: 20 },
  teamTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  athleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  athleteInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  athleteNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
  athleteNumberText: { fontSize: 12, fontWeight: '700', color: '#000' },
  athleteName: { fontSize: 14, fontWeight: '500' },
  athleteRole: { fontSize: 11, color: '#666', backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  timeInput: { width: 100, height: 40, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, textAlign: 'center', fontSize: 14, fontFamily: 'monospace', backgroundColor: '#FAFAFA' },
  endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 16, marginHorizontal: 16, borderRadius: 12, marginBottom: 32, gap: 8 },
  endBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CyclingMatchModal;
