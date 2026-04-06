import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
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

interface RugbyEvent {
  id: string;
  type: 'try' | 'conversion' | 'penalty' | 'drop_goal' | 'tackle' | 'yellow_card' | 'red_card';
  team: 'home' | 'away';
  player_id?: string;
  player_name?: string;
  points: number;
  minute?: number;
}

interface RugbyMatchModalProps {
  visible: boolean;
  onClose: () => void;
  match: any;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
  onSave: (data: any) => void;
  gameFormat?: string;
}

// Point values
const POINT_VALUES = {
  try: 5,
  conversion: 2,
  penalty: 3,
  drop_goal: 3,
  tackle: 0,
  yellow_card: 0,
  red_card: 0,
};

// Event labels
const EVENT_LABELS: Record<string, string> = {
  try: '🏉 Meta (5pt)',
  conversion: '⚽ Trasformazione (2pt)',
  penalty: '🎯 Calcio punizione (3pt)',
  drop_goal: '💫 Drop goal (3pt)',
  tackle: '🤝 Placcaggio',
  yellow_card: '🟨 Cartellino giallo',
  red_card: '🟥 Cartellino rosso',
};

export function RugbyMatchModal({
  visible,
  onClose,
  match,
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  onSave,
  gameFormat = '15v15',
}: RugbyMatchModalProps) {
  const [events, setEvents] = useState<RugbyEvent[]>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Timer duration based on format
  const halfDuration = gameFormat === '7v7' ? 7 * 60 : 40 * 60; // 7 or 40 minutes

  // Load existing match data
  useEffect(() => {
    if (match && visible) {
      const existingEvents = match.rugby_events || [];
      setEvents(existingEvents);
      calculateScores(existingEvents);
      setTimerSeconds(match.timer_seconds || 0);
      setCurrentHalf(match.current_half || 1);
    }
  }, [match, visible]);

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);

  // Calculate scores from events
  const calculateScores = (eventsList: RugbyEvent[]) => {
    let home = 0;
    let away = 0;
    eventsList.forEach(event => {
      if (event.team === 'home') {
        home += event.points;
      } else {
        away += event.points;
      }
    });
    setHomeScore(home);
    setAwayScore(away);
  };

  // Auto-save logic
  const triggerAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    setAutoSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/matches/${match.id}`, {
          rugby_events: events,
          home_goals: homeScore,
          away_goals: awayScore,
          timer_seconds: timerSeconds,
          current_half: currentHalf,
          status: 'in_progress',
        });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
        onSave({
          rugby_events: events,
          home_goals: homeScore,
          away_goals: awayScore,
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('idle');
      }
    }, 500);
  }, [events, homeScore, awayScore, timerSeconds, currentHalf, match?.id, onSave]);

  // Trigger auto-save when events change
  useEffect(() => {
    if (events.length > 0 && visible) {
      triggerAutoSave();
    }
  }, [events, visible]);

  // Add event
  const addEvent = (type: keyof typeof POINT_VALUES) => {
    if (!selectedPlayer && type !== 'tackle') {
      Alert.alert('Seleziona Giocatore', 'Seleziona un giocatore prima di registrare un evento');
      return;
    }

    const points = POINT_VALUES[type];
    const newEvent: RugbyEvent = {
      id: `event_${Date.now()}`,
      type,
      team: selectedTeam,
      player_id: selectedPlayer?.id,
      player_name: selectedPlayer?.full_name,
      points,
      minute: Math.floor(timerSeconds / 60),
    };

    setEvents(prev => [...prev, newEvent]);
    
    // Update score
    if (selectedTeam === 'home') {
      setHomeScore(prev => prev + points);
    } else {
      setAwayScore(prev => prev + points);
    }

    // Clear player selection after scoring event
    if (points > 0) {
      setSelectedPlayer(null);
    }
  };

  // Undo last event
  const undoLastEvent = () => {
    if (events.length === 0) return;
    
    const lastEvent = events[events.length - 1];
    setEvents(prev => prev.slice(0, -1));
    
    // Revert score
    if (lastEvent.team === 'home') {
      setHomeScore(prev => prev - lastEvent.points);
    } else {
      setAwayScore(prev => prev - lastEvent.points);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer status
  const getTimerStatus = () => {
    const remaining = halfDuration - timerSeconds;
    if (remaining <= 60) return 'danger';
    if (remaining <= 300) return 'warning';
    return 'normal';
  };

  // End match
  const handleEndMatch = () => {
    Alert.alert(
      'Fine Partita',
      `Terminare la partita?\n${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              await api.put(`/api/matches/${match.id}`, {
                rugby_events: events,
                home_goals: homeScore,
                away_goals: awayScore,
                status: 'completed',
              });
              onSave({
                rugby_events: events,
                home_goals: homeScore,
                away_goals: awayScore,
                status: 'completed',
              });
              onClose();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile salvare la partita');
            }
          },
        },
      ]
    );
  };

  const currentPlayers = selectedTeam === 'home' ? homePlayers : awayPlayers;
  const timerStatus = getTimerStatus();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏉 Rugby Match</Text>
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
          {/* Score Display */}
          <View style={styles.scoreSection}>
            <TouchableOpacity
              style={[styles.teamScore, selectedTeam === 'home' && styles.teamScoreSelected]}
              onPress={() => setSelectedTeam('home')}
            >
              <Text style={styles.teamName} numberOfLines={1}>{homeTeamName}</Text>
              <Text style={styles.score}>{homeScore}</Text>
            </TouchableOpacity>
            <Text style={styles.vs}>-</Text>
            <TouchableOpacity
              style={[styles.teamScore, selectedTeam === 'away' && styles.teamScoreSelected]}
              onPress={() => setSelectedTeam('away')}
            >
              <Text style={styles.teamName} numberOfLines={1}>{awayTeamName}</Text>
              <Text style={styles.score}>{awayScore}</Text>
            </TouchableOpacity>
          </View>

          {/* Timer */}
          <View style={styles.timerSection}>
            <View style={[
              styles.timerPill,
              timerStatus === 'warning' && styles.timerWarning,
              timerStatus === 'danger' && styles.timerDanger,
            ]}>
              <Text style={[
                styles.timerText,
                timerStatus !== 'normal' && styles.timerTextAlert,
              ]}>
                {formatTime(timerSeconds)} / {formatTime(halfDuration)}
              </Text>
              <Text style={styles.halfText}>Tempo {currentHalf}</Text>
            </View>
            <View style={styles.timerControls}>
              <TouchableOpacity
                style={[styles.timerBtn, timerRunning && styles.timerBtnActive]}
                onPress={() => setTimerRunning(!timerRunning)}
              >
                <Ionicons name={timerRunning ? 'pause' : 'play'} size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerBtn}
                onPress={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerBtn}
                onPress={() => {
                  if (currentHalf === 1) {
                    setCurrentHalf(2);
                    setTimerSeconds(0);
                    setTimerRunning(false);
                  }
                }}
              >
                <Text style={styles.halfBtnText}>2°T</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Player Selection */}
          <View style={styles.playerSection}>
            <Text style={styles.sectionTitle}>
              Giocatore selezionato: {selectedPlayer?.full_name || 'Nessuno'}
            </Text>
            <TouchableOpacity
              style={styles.selectPlayerBtn}
              onPress={() => setShowPlayerPicker(true)}
            >
              <Ionicons name="person" size={20} color="#FFF" />
              <Text style={styles.selectPlayerText}>
                {selectedPlayer ? 'Cambia Giocatore' : 'Seleziona Giocatore'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Point Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Registra Punti</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionTry]} onPress={() => addEvent('try')}>
                <Text style={styles.actionEmoji}>🏉</Text>
                <Text style={styles.actionText}>Meta</Text>
                <Text style={styles.actionPoints}>+5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionConversion]} onPress={() => addEvent('conversion')}>
                <Text style={styles.actionEmoji}>⚽</Text>
                <Text style={styles.actionText}>Trasform.</Text>
                <Text style={styles.actionPoints}>+2</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionPenalty]} onPress={() => addEvent('penalty')}>
                <Text style={styles.actionEmoji}>🎯</Text>
                <Text style={styles.actionText}>Punizione</Text>
                <Text style={styles.actionPoints}>+3</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionDrop]} onPress={() => addEvent('drop_goal')}>
                <Text style={styles.actionEmoji}>💫</Text>
                <Text style={styles.actionText}>Drop</Text>
                <Text style={styles.actionPoints}>+3</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Registra Statistiche</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionStat]} onPress={() => addEvent('tackle')}>
                <Text style={styles.actionEmoji}>🤝</Text>
                <Text style={styles.actionText}>Placcaggio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionYellow]} onPress={() => addEvent('yellow_card')}>
                <Text style={styles.actionEmoji}>🟨</Text>
                <Text style={styles.actionText}>Giallo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionRed]} onPress={() => addEvent('red_card')}>
                <Text style={styles.actionEmoji}>🟥</Text>
                <Text style={styles.actionText}>Rosso</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Undo Button */}
          <TouchableOpacity style={styles.undoBtn} onPress={undoLastEvent}>
            <Ionicons name="arrow-undo" size={20} color="#FF6B6B" />
            <Text style={styles.undoBtnText}>Annulla ultimo</Text>
          </TouchableOpacity>

          {/* Events List */}
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Eventi ({events.length})</Text>
            {events.slice().reverse().map((event, index) => (
              <View key={event.id} style={styles.eventItem}>
                <View style={[styles.eventTeamDot, event.team === 'home' ? styles.homeDot : styles.awayDot]} />
                <Text style={styles.eventMinute}>{event.minute}'</Text>
                <Text style={styles.eventType}>{EVENT_LABELS[event.type]}</Text>
                <Text style={styles.eventPlayer}>{event.player_name || '-'}</Text>
                {event.points > 0 && (
                  <Text style={styles.eventPoints}>+{event.points}</Text>
                )}
              </View>
            ))}
          </View>

          {/* End Match Button */}
          <TouchableOpacity style={styles.endMatchBtn} onPress={handleEndMatch}>
            <Ionicons name="flag" size={20} color="#FFF" />
            <Text style={styles.endMatchText}>Fine Partita</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Player Picker Modal */}
        <Modal visible={showPlayerPicker} animationType="slide" transparent>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Seleziona Giocatore - {selectedTeam === 'home' ? homeTeamName : awayTeamName}</Text>
                <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {currentPlayers.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.pickerItem, selectedPlayer?.id === player.id && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedPlayer(player);
                      setShowPlayerPicker(false);
                    }}
                  >
                    <Text style={styles.pickerNumber}>{player.number || '-'}</Text>
                    <Text style={styles.pickerName}>{player.full_name}</Text>
                    <Text style={styles.pickerRole}>{player.role || ''}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  autoSaveIndicator: { minWidth: 80, alignItems: 'flex-end' },
  autoSaveText: { fontSize: 12, color: '#666' },
  content: { flex: 1 },
  scoreSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#FFF', margin: 16, borderRadius: 16 },
  teamScore: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#F5F5F5' },
  teamScoreSelected: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#2D8A2E' },
  teamName: { fontSize: 14, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  score: { fontSize: 48, fontWeight: '800' },
  vs: { fontSize: 24, fontWeight: '600', marginHorizontal: 16, color: '#666' },
  timerSection: { alignItems: 'center', paddingVertical: 16 },
  timerPill: { backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  timerWarning: { backgroundColor: '#FF9800' },
  timerDanger: { backgroundColor: '#F44336' },
  timerText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  timerTextAlert: { color: '#FFF' },
  halfText: { fontSize: 12, color: '#FFF', marginTop: 4 },
  timerControls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  timerBtn: { backgroundColor: '#333', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  timerBtnActive: { backgroundColor: '#2D8A2E' },
  halfBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  playerSection: { padding: 16, backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#333' },
  selectPlayerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', padding: 12, borderRadius: 8, gap: 8 },
  selectPlayerText: { color: '#FFF', fontWeight: '600' },
  actionsSection: { padding: 16, backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, marginBottom: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '47%', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionTry: { backgroundColor: '#4CAF50' },
  actionConversion: { backgroundColor: '#2196F3' },
  actionPenalty: { backgroundColor: '#FF9800' },
  actionDrop: { backgroundColor: '#9C27B0' },
  actionStat: { backgroundColor: '#607D8B' },
  actionYellow: { backgroundColor: '#FFEB3B' },
  actionRed: { backgroundColor: '#F44336' },
  actionEmoji: { fontSize: 24, marginBottom: 4 },
  actionText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  actionPoints: { color: '#FFF', fontWeight: '800', fontSize: 16, marginTop: 4 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#FF6B6B', marginBottom: 16, gap: 8 },
  undoBtnText: { color: '#FF6B6B', fontWeight: '600' },
  eventsSection: { padding: 16, backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, marginBottom: 16 },
  eventItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8 },
  eventTeamDot: { width: 10, height: 10, borderRadius: 5 },
  homeDot: { backgroundColor: '#000' },
  awayDot: { backgroundColor: '#666' },
  eventMinute: { fontSize: 12, color: '#666', width: 30 },
  eventType: { flex: 1, fontSize: 13 },
  eventPlayer: { fontSize: 12, color: '#666' },
  eventPoints: { fontSize: 14, fontWeight: '700', color: '#2D8A2E' },
  endMatchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 16, marginHorizontal: 16, borderRadius: 12, marginBottom: 32, gap: 8 },
  endMatchText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  pickerTitle: { fontSize: 16, fontWeight: '600' },
  pickerList: { padding: 16 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: '#F5F5F5', gap: 12 },
  pickerItemSelected: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#2D8A2E' },
  pickerNumber: { width: 30, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  pickerName: { flex: 1, fontSize: 14, fontWeight: '500' },
  pickerRole: { fontSize: 12, color: '#666' },
});

export default RugbyMatchModal;
