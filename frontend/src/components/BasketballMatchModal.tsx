import React, { useState, useEffect, useRef } from 'react';
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
import { Button } from './Button';
import api from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Player {
  id: string;
  full_name: string;
  number?: number;
  role: string;
  team_id: string;
}

interface BasketballEvent {
  id?: string;
  player_id: string;
  player_name?: string;
  team_id: string;
  event_type: string;
  period: string;
  points_value?: number;
  created_at?: string;
}

interface BasketballMatchModalProps {
  visible: boolean;
  onClose: () => void;
  match: any;
  homeTeam: any;
  awayTeam: any;
  homePlayers: Player[];
  awayPlayers: Player[];
  tournamentName: string;
  gameStructure: string; // "4_quarters" or "2_halves"
  onSave: (matchData: any) => void;
}

const PERIODS_CONFIG = {
  '4_quarters': ['Q1', 'Q2', 'Q3', 'Q4', 'OT'],
  '2_halves': ['T1', 'T2', 'OT'],
};

const TIMER_OPTIONS = [
  { label: '10 min', seconds: 600 },
  { label: '12 min', seconds: 720 },
  { label: '20 min', seconds: 1200 },
  { label: '25 min', seconds: 1500 },
  { label: '40 min', seconds: 2400 },
];

const BASKETBALL_STATS = [
  { key: 'rebound', label: 'RIM', icon: 'basketball-outline' },
  { key: 'basketball_assist', label: 'AST', icon: 'people-outline' },
  { key: 'steal', label: 'RUB', icon: 'hand-left-outline' },
  { key: 'block', label: 'STP', icon: 'shield-outline' },
  { key: 'foul', label: 'FALLO', icon: 'warning-outline' },
];

export function BasketballMatchModal({
  visible,
  onClose,
  match,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  tournamentName,
  gameStructure,
  onSave,
}: BasketballMatchModalProps) {
  const periods = PERIODS_CONFIG[gameStructure as keyof typeof PERIODS_CONFIG] || PERIODS_CONFIG['4_quarters'];
  
  // State
  const [currentPeriod, setCurrentPeriod] = useState(periods[0]);
  const [periodsScore, setPeriodsScore] = useState<{ [key: string]: { home: number; away: number } }>(() => {
    const initial: { [key: string]: { home: number; away: number } } = {};
    periods.forEach(p => { initial[p] = { home: 0, away: 0 }; });
    return match?.periods_score || initial;
  });
  const [homeTeamFouls, setHomeTeamFouls] = useState<{ [key: string]: number }>(() => {
    const initial: { [key: string]: number } = {};
    periods.forEach(p => { initial[p] = 0; });
    return match?.home_team_fouls || initial;
  });
  const [awayTeamFouls, setAwayTeamFouls] = useState<{ [key: string]: number }>(() => {
    const initial: { [key: string]: number } = {};
    periods.forEach(p => { initial[p] = 0; });
    return match?.away_team_fouls || initial;
  });
  const [events, setEvents] = useState<BasketballEvent[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: { [stat: string]: number } }>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(match?.timer_seconds || 600);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedTimerOption, setSelectedTimerOption] = useState(600);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [autoSaveInitialized, setAutoSaveInitialized] = useState(false);

  // Calculate total scores
  const homeTotal = Object.values(periodsScore).reduce((sum, p) => sum + (p?.home || 0), 0);
  const awayTotal = Object.values(periodsScore).reduce((sum, p) => sum + (p?.away || 0), 0);

  // Auto-save effect (debounced 500ms)
  useEffect(() => {
    if (!visible || !match?.id || !autoSaveInitialized) return;
    
    const timeoutId = setTimeout(() => {
      triggerAutoSave();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [events, periodsScore, homeTeamFouls, awayTeamFouls, autoSaveInitialized]);

  // Trigger auto-save
  const triggerAutoSave = async () => {
    if (!match?.id || saving) return;
    
    try {
      setSaving(true);
      const eventsToSave = events.map(e => ({
        player_id: e.player_id,
        team_id: e.team_id,
        event_type: e.event_type,
        period: e.period,
        points_value: e.points_value,
      }));
      
      await api.post(`/api/matches/${match.id}/events/batch`, {
        events: eventsToSave,
        ratings: {},
        home_goals: homeTotal,
        away_goals: awayTotal,
        periods_score: periodsScore,
        home_team_fouls: homeTeamFouls,
        away_team_fouls: awayTeamFouls,
      });
      
      // Update match status to in_progress
      await api.put(`/api/matches/${match.id}`, {
        status: 'in_progress',
        current_period: currentPeriod,
        timer_seconds: timerSeconds,
        home_goals: homeTotal,
        away_goals: awayTotal,
        periods_score: periodsScore,
      });
      
      console.log('Basketball auto-save completed');
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Load existing events
  useEffect(() => {
    if (visible && match?.id) {
      loadMatchEvents();
    } else {
      // Reset when modal closes
      setAutoSaveInitialized(false);
    }
  }, [visible, match?.id]);

  // Timer effect
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const loadMatchEvents = async () => {
    try {
      const response = await api.get(`/api/matches/${match.id}/events`);
      const basketballEvents = response.data.filter((e: any) => 
        ['points_1pt', 'points_2pt', 'points_3pt', 'rebound', 'basketball_assist', 'foul', 'steal', 'block'].includes(e.event_type)
      );
      setEvents(basketballEvents);
      
      // Rebuild player stats from events
      const stats: { [playerId: string]: { [stat: string]: number } } = {};
      basketballEvents.forEach((e: BasketballEvent) => {
        if (!stats[e.player_id]) {
          stats[e.player_id] = { points_1pt: 0, points_2pt: 0, points_3pt: 0, rebound: 0, basketball_assist: 0, foul: 0, steal: 0, block: 0 };
        }
        if (e.event_type in stats[e.player_id]) {
          stats[e.player_id][e.event_type]++;
        }
      });
      setPlayerStats(stats);
      
      // Initialize auto-save after loading
      setTimeout(() => setAutoSaveInitialized(true), 100);
    } catch (error) {
      console.error('Error loading events:', error);
      setTimeout(() => setAutoSaveInitialized(true), 100);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timerSeconds <= 30) return '#EF4444';
    if (timerSeconds <= 120) return '#F59E0B';
    return '#000';
  };

  const addPoints = (points: 1 | 2 | 3) => {
    if (!selectedPlayer) {
      Alert.alert('Seleziona Giocatore', 'Seleziona un giocatore prima di registrare punti');
      return;
    }

    const eventType = `points_${points}pt` as 'points_1pt' | 'points_2pt' | 'points_3pt';
    const teamId = selectedTeam === 'home' ? homeTeam.id : awayTeam.id;
    
    // Add event
    const newEvent: BasketballEvent = {
      player_id: selectedPlayer.id,
      player_name: selectedPlayer.full_name,
      team_id: teamId,
      event_type: eventType,
      period: currentPeriod,
      points_value: points,
    };
    setEvents([...events, newEvent]);
    
    // Update period score
    const newPeriodsScore = { ...periodsScore };
    if (!newPeriodsScore[currentPeriod]) {
      newPeriodsScore[currentPeriod] = { home: 0, away: 0 };
    }
    if (selectedTeam === 'home') {
      newPeriodsScore[currentPeriod].home += points;
    } else {
      newPeriodsScore[currentPeriod].away += points;
    }
    setPeriodsScore(newPeriodsScore);
    
    // Update player stats
    const newStats = { ...playerStats };
    if (!newStats[selectedPlayer.id]) {
      newStats[selectedPlayer.id] = { points_1pt: 0, points_2pt: 0, points_3pt: 0, rebound: 0, basketball_assist: 0, foul: 0, steal: 0, block: 0 };
    }
    newStats[selectedPlayer.id][eventType]++;
    setPlayerStats(newStats);
  };

  const addStat = (statKey: string) => {
    if (!selectedPlayer) {
      Alert.alert('Seleziona Giocatore', 'Seleziona un giocatore prima di registrare statistiche');
      return;
    }

    const teamId = selectedTeam === 'home' ? homeTeam.id : awayTeam.id;
    
    // Add event
    const newEvent: BasketballEvent = {
      player_id: selectedPlayer.id,
      player_name: selectedPlayer.full_name,
      team_id: teamId,
      event_type: statKey,
      period: currentPeriod,
    };
    setEvents([...events, newEvent]);
    
    // Update player stats
    const newStats = { ...playerStats };
    if (!newStats[selectedPlayer.id]) {
      newStats[selectedPlayer.id] = { points_1pt: 0, points_2pt: 0, points_3pt: 0, rebound: 0, basketball_assist: 0, foul: 0, steal: 0, block: 0 };
    }
    newStats[selectedPlayer.id][statKey]++;
    setPlayerStats(newStats);
    
    // If foul, update team fouls
    if (statKey === 'foul') {
      if (selectedTeam === 'home') {
        const newFouls = { ...homeTeamFouls };
        newFouls[currentPeriod] = (newFouls[currentPeriod] || 0) + 1;
        setHomeTeamFouls(newFouls);
        
        // Alert at 5 personal fouls
        const playerFouls = (newStats[selectedPlayer.id]?.foul || 0);
        if (playerFouls === 5) {
          Alert.alert('⚠️ 5° Fallo', `${selectedPlayer.full_name} ha commesso il 5° fallo!`);
        }
        
        // Alert at 7 team fouls
        if (newFouls[currentPeriod] === 7) {
          Alert.alert('⚠️ Bonus', `${homeTeam.name} ha raggiunto il 7° fallo nel ${currentPeriod}!`);
        }
      } else {
        const newFouls = { ...awayTeamFouls };
        newFouls[currentPeriod] = (newFouls[currentPeriod] || 0) + 1;
        setAwayTeamFouls(newFouls);
        
        const playerFouls = (newStats[selectedPlayer.id]?.foul || 0);
        if (playerFouls === 5) {
          Alert.alert('⚠️ 5° Fallo', `${selectedPlayer.full_name} ha commesso il 5° fallo!`);
        }
        
        if (newFouls[currentPeriod] === 7) {
          Alert.alert('⚠️ Bonus', `${awayTeam.name} ha raggiunto il 7° fallo nel ${currentPeriod}!`);
        }
      }
    }
  };

  const undoLastEvent = () => {
    if (events.length === 0) return;
    
    const lastEvent = events[events.length - 1];
    const newEvents = events.slice(0, -1);
    setEvents(newEvents);
    
    // Reverse the effect
    if (lastEvent.event_type.startsWith('points_')) {
      const points = parseInt(lastEvent.event_type.replace('points_', '').replace('pt', ''));
      const newPeriodsScore = { ...periodsScore };
      const isHome = lastEvent.team_id === homeTeam.id;
      if (isHome) {
        newPeriodsScore[lastEvent.period].home -= points;
      } else {
        newPeriodsScore[lastEvent.period].away -= points;
      }
      setPeriodsScore(newPeriodsScore);
    }
    
    // Update player stats
    const newStats = { ...playerStats };
    if (newStats[lastEvent.player_id] && newStats[lastEvent.player_id][lastEvent.event_type]) {
      newStats[lastEvent.player_id][lastEvent.event_type]--;
    }
    setPlayerStats(newStats);
    
    // Reverse foul count if applicable
    if (lastEvent.event_type === 'foul') {
      const isHome = lastEvent.team_id === homeTeam.id;
      if (isHome) {
        const newFouls = { ...homeTeamFouls };
        newFouls[lastEvent.period] = Math.max(0, (newFouls[lastEvent.period] || 0) - 1);
        setHomeTeamFouls(newFouls);
      } else {
        const newFouls = { ...awayTeamFouls };
        newFouls[lastEvent.period] = Math.max(0, (newFouls[lastEvent.period] || 0) - 1);
        setAwayTeamFouls(newFouls);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare events for API
      const eventsToSave = events.map(e => ({
        player_id: e.player_id,
        team_id: e.team_id,
        event_type: e.event_type,
        period: e.period,
        points_value: e.points_value,
      }));
      
      await api.post(`/api/matches/${match.id}/events/batch`, {
        events: eventsToSave,
        ratings: {},
        home_goals: homeTotal,
        away_goals: awayTotal,
        periods_score: periodsScore,
        home_team_fouls: homeTeamFouls,
        away_team_fouls: awayTeamFouls,
      });
      
      // Update match status to live if needed
      if (match.status === 'scheduled') {
        await api.put(`/api/matches/${match.id}`, {
          status: 'live',
          current_period: currentPeriod,
          timer_seconds: timerSeconds,
        });
      }
      
      Alert.alert('Salvato', 'Dati partita salvati con successo');
      onSave({
        ...match,
        home_goals: homeTotal,
        away_goals: awayTotal,
        periods_score: periodsScore,
      });
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Errore', 'Impossibile salvare i dati');
    } finally {
      setSaving(false);
    }
  };

  const handleEndMatch = () => {
    Alert.alert(
      'Fine Partita',
      `Confermi di voler terminare la partita?\n\n${homeTeam.name} ${homeTotal} - ${awayTotal} ${awayTeam.name}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const eventsToSave = events.map(e => ({
                player_id: e.player_id,
                team_id: e.team_id,
                event_type: e.event_type,
                period: e.period,
                points_value: e.points_value,
              }));
              
              await api.post(`/api/matches/${match.id}/events/batch`, {
                events: eventsToSave,
                ratings: {},
                home_goals: homeTotal,
                away_goals: awayTotal,
                periods_score: periodsScore,
                home_team_fouls: homeTeamFouls,
                away_team_fouls: awayTeamFouls,
              });
              
              await api.put(`/api/matches/${match.id}`, { status: 'completed' });
              
              Alert.alert('Partita Terminata', 'I risultati sono stati salvati');
              onSave({
                ...match,
                status: 'completed',
                home_goals: homeTotal,
                away_goals: awayTotal,
              });
              onClose();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile terminare la partita');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const getPlayerPoints = (playerId: string) => {
    const stats = playerStats[playerId];
    if (!stats) return 0;
    return (stats.points_1pt || 0) + (stats.points_2pt || 0) * 2 + (stats.points_3pt || 0) * 3;
  };

  const currentPlayers = selectedTeam === 'home' ? homePlayers : awayPlayers;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.tournamentName}>{tournamentName}</Text>
            <Text style={styles.matchRound}>{match?.round}</Text>
          </View>
          <View style={styles.autoSaveIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.autoSaveText}>Salvataggio automatico</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Score Header */}
          <View style={styles.scoreHeader}>
            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={1}>{homeTeam?.name}</Text>
              <Text style={styles.totalScore}>{homeTotal}</Text>
              <Text style={styles.teamFouls}>Falli: {homeTeamFouls[currentPeriod] || 0}</Text>
            </View>
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
              <View style={[styles.statusBadge, match?.status === 'live' && styles.statusLive]}>
                <Text style={styles.statusText}>{match?.status === 'live' ? 'LIVE' : match?.status === 'completed' ? 'FINE' : 'PROG.'}</Text>
              </View>
            </View>
            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={1}>{awayTeam?.name}</Text>
              <Text style={styles.totalScore}>{awayTotal}</Text>
              <Text style={styles.teamFouls}>Falli: {awayTeamFouls[currentPeriod] || 0}</Text>
            </View>
          </View>

          {/* Period Tabs */}
          <View style={styles.periodTabs}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodTab, currentPeriod === period && styles.periodTabActive]}
                onPress={() => setCurrentPeriod(period)}
              >
                <Text style={[styles.periodTabText, currentPeriod === period && styles.periodTabTextActive]}>
                  {period}
                </Text>
                <Text style={[styles.periodScore, currentPeriod === period && styles.periodScoreActive]}>
                  {periodsScore[period]?.home || 0}-{periodsScore[period]?.away || 0}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timer */}
          <View style={styles.timerSection}>
            <Text style={[styles.timerDisplay, { color: getTimerColor() }]}>{formatTime(timerSeconds)}</Text>
            <View style={styles.timerControls}>
              <TouchableOpacity
                style={[styles.timerButton, timerRunning && styles.timerButtonActive]}
                onPress={() => setTimerRunning(!timerRunning)}
              >
                <Ionicons name={timerRunning ? 'pause' : 'play'} size={20} color={timerRunning ? '#FFF' : '#000'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerButton}
                onPress={() => {
                  setTimerRunning(false);
                  setTimerSeconds(selectedTimerOption);
                }}
              >
                <Ionicons name="refresh" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timerOptions}>
              {TIMER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.seconds}
                  style={[styles.timerOption, selectedTimerOption === opt.seconds && styles.timerOptionActive]}
                  onPress={() => {
                    setSelectedTimerOption(opt.seconds);
                    if (!timerRunning) setTimerSeconds(opt.seconds);
                  }}
                >
                  <Text style={[styles.timerOptionText, selectedTimerOption === opt.seconds && styles.timerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Team Selection */}
          <View style={styles.teamSelection}>
            <TouchableOpacity
              style={[styles.teamSelectButton, selectedTeam === 'home' && styles.teamSelectActive]}
              onPress={() => { setSelectedTeam('home'); setSelectedPlayer(null); }}
            >
              <Text style={[styles.teamSelectText, selectedTeam === 'home' && styles.teamSelectTextActive]}>
                {homeTeam?.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.teamSelectButton, selectedTeam === 'away' && styles.teamSelectActive]}
              onPress={() => { setSelectedTeam('away'); setSelectedPlayer(null); }}
            >
              <Text style={[styles.teamSelectText, selectedTeam === 'away' && styles.teamSelectTextActive]}>
                {awayTeam?.name}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Player Selection */}
          <View style={styles.playersGrid}>
            {currentPlayers.map((player) => {
              const points = getPlayerPoints(player.id);
              const fouls = playerStats[player.id]?.foul || 0;
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerCard, selectedPlayer?.id === player.id && styles.playerCardSelected]}
                  onPress={() => setSelectedPlayer(player)}
                >
                  <Text style={styles.playerNumber}>#{player.number || '?'}</Text>
                  <Text style={styles.playerName} numberOfLines={1}>{player.full_name}</Text>
                  <View style={styles.playerStatsRow}>
                    <Text style={styles.playerPoints}>{points} pts</Text>
                    {fouls >= 4 && <Text style={[styles.playerFouls, fouls >= 5 && styles.playerFouledOut]}>{fouls}F</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Points Registration */}
          <View style={styles.pointsSection}>
            <Text style={styles.sectionTitle}>Registra Punti</Text>
            <View style={styles.pointsButtons}>
              <TouchableOpacity style={styles.pointButton1} onPress={() => addPoints(1)}>
                <Text style={styles.pointButtonText}>+1</Text>
                <Text style={styles.pointButtonLabel}>T.Libero</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pointButton2} onPress={() => addPoints(2)}>
                <Text style={styles.pointButtonText}>+2</Text>
                <Text style={styles.pointButtonLabel}>Canestro</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pointButton3} onPress={() => addPoints(3)}>
                <Text style={styles.pointButtonText}>+3</Text>
                <Text style={styles.pointButtonLabel}>Tripla</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Other Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Altre Statistiche</Text>
            <View style={styles.statsButtons}>
              {BASKETBALL_STATS.map((stat) => (
                <TouchableOpacity
                  key={stat.key}
                  style={[styles.statButton, stat.key === 'foul' && styles.statButtonFoul]}
                  onPress={() => addStat(stat.key)}
                >
                  <Ionicons name={stat.icon as any} size={20} color={stat.key === 'foul' ? '#FFF' : '#000'} />
                  <Text style={[styles.statButtonText, stat.key === 'foul' && styles.statButtonTextFoul]}>
                    {stat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Undo Button */}
          <TouchableOpacity style={styles.undoButton} onPress={undoLastEvent} disabled={events.length === 0}>
            <Ionicons name="arrow-undo" size={20} color={events.length > 0 ? '#000' : '#999'} />
            <Text style={[styles.undoButtonText, events.length === 0 && styles.undoButtonTextDisabled]}>
              Annulla Ultimo ({events.length})
            </Text>
          </TouchableOpacity>

          {/* End Match Button */}
          {match?.status !== 'completed' && (
            <TouchableOpacity style={styles.endMatchButton} onPress={handleEndMatch}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.endMatchButtonText}>Fine Partita</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  tournamentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  matchRound: {
    fontSize: 12,
    color: '#999',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoSaveText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  totalScore: {
    fontSize: 48,
    fontWeight: '800',
    color: '#000',
  },
  teamFouls: {
    fontSize: 12,
    color: '#666',
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  statusLive: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  periodTabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  periodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  periodTabActive: {
    backgroundColor: '#000',
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  periodTabTextActive: {
    color: '#FFF',
  },
  periodScore: {
    fontSize: 12,
    color: '#666',
  },
  periodScoreActive: {
    color: '#FFF',
  },
  timerSection: {
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timerButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#000',
  },
  timerOptions: {
    marginTop: 12,
  },
  timerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 16,
    marginRight: 8,
  },
  timerOptionActive: {
    backgroundColor: '#000',
  },
  timerOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  timerOptionTextActive: {
    color: '#FFF',
  },
  teamSelection: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  teamSelectButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
  },
  teamSelectActive: {
    backgroundColor: '#000',
  },
  teamSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  teamSelectTextActive: {
    color: '#FFF',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  playerCard: {
    width: (SCREEN_WIDTH - 32) / 3 - 8,
    margin: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  playerCardSelected: {
    borderColor: '#000',
    borderWidth: 2,
    backgroundColor: '#F5F5F5',
  },
  playerNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  playerName: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  playerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  playerPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  playerFouls: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  playerFouledOut: {
    color: '#EF4444',
  },
  pointsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  pointsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pointButton1: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    alignItems: 'center',
  },
  pointButton2: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
  },
  pointButton3: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    alignItems: 'center',
  },
  pointButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  pointButtonLabel: {
    fontSize: 10,
    color: '#FFF',
    marginTop: 2,
  },
  statsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    gap: 4,
  },
  statButtonFoul: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  statButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  statButtonTextFoul: {
    color: '#FFF',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    gap: 8,
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  undoButtonTextDisabled: {
    color: '#999',
  },
  endMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
    gap: 8,
  },
  endMatchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default BasketballMatchModal;
