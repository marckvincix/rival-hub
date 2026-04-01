import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface MatchStatsModalProps {
  visible: boolean;
  onClose: () => void;
  match: {
    id: string;
    home_team_id: string;
    away_team_id: string;
    home_goals?: number;
    away_goals?: number;
  } | null;
  getTeamName: (teamId: string) => string;
}

interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  event_type: string;
  player_name?: string;
  minute?: number;
  note?: string;
}

export function MatchStatsModal({
  visible,
  onClose,
  match,
  getTeamName,
}: MatchStatsModalProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && match) {
      loadMatchEvents();
    }
  }, [visible, match?.id]);

  const loadMatchEvents = async () => {
    if (!match) return;
    setLoading(true);
    setEvents([]);
    try {
      const response = await api.get(`/api/matches/${match.id}/events`);
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading match stats:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  // Soccer events
  const goals = events.filter((e) => e.event_type === 'goal');
  const assists = events.filter((e) => e.event_type === 'assist');
  const yellowCards = events.filter((e) => e.event_type === 'yellow_card');
  const redCards = events.filter((e) => e.event_type === 'red_card');
  const subsOut = events.filter((e) => e.event_type === 'substitution_out');
  const subsIn = events.filter((e) => e.event_type === 'substitution_in');
  const hasSubs = subsOut.length > 0 || subsIn.length > 0;

  // Basketball events
  const points3 = events.filter((e) => e.event_type === 'points_3pt');
  const points2 = events.filter((e) => e.event_type === 'points_2pt');
  const points1 = events.filter((e) => e.event_type === 'points_1pt');
  const basketballAssists = events.filter((e) => e.event_type === 'basketball_assist');
  const rebounds = events.filter((e) => e.event_type === 'rebound');
  const steals = events.filter((e) => e.event_type === 'steal');
  const blocks = events.filter((e) => e.event_type === 'block');
  const turnovers = events.filter((e) => e.event_type === 'turnover');
  const fouls = events.filter((e) => e.event_type === 'foul');
  const isBasketball = points3.length > 0 || points2.length > 0 || points1.length > 0 || basketballAssists.length > 0;

  // Calculate LIVE score from events
  // Soccer: count goals
  // Basketball: sum points (3pt = 3, 2pt = 2, 1pt = 1)
  let homeGoals = 0;
  let awayGoals = 0;
  
  if (isBasketball) {
    // Basketball scoring
    events.forEach((e) => {
      let pts = 0;
      if (e.event_type === 'points_3pt') pts = 3;
      else if (e.event_type === 'points_2pt') pts = 2;
      else if (e.event_type === 'points_1pt') pts = 1;
      
      if (pts > 0) {
        if (e.team_id === match.home_team_id) homeGoals += pts;
        else awayGoals += pts;
      }
    });
  } else {
    // Soccer scoring
    goals.forEach((e) => {
      if (e.team_id === match.home_team_id) homeGoals++;
      else awayGoals++;
    });
  }
  
  // Use calculated live score if events exist, otherwise fallback to match data
  const displayHomeScore = events.length > 0 ? homeGoals : (match.home_goals ?? 0);
  const displayAwayScore = events.length > 0 ? awayGoals : (match.away_goals ?? 0);

  const getEventTeamName = (teamId: string) => {
    return teamId === match.home_team_id
      ? getTeamName(match.home_team_id)
      : getTeamName(match.away_team_id);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📊 Statistiche Partita</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Result */}
          <View style={styles.resultBox}>
            <Text style={styles.teamName}>
              {getTeamName(match.home_team_id)}
            </Text>
            <View style={styles.scoreBox}>
              <Text style={styles.score}>
                {displayHomeScore} - {displayAwayScore}
              </Text>
            </View>
            <Text style={styles.teamName}>
              {getTeamName(match.away_team_id)}
            </Text>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.loadingText}>Caricamento statistiche...</Text>
            </View>
          )}

          {/* Events */}
          {!loading && (
            <ScrollView
              style={styles.eventsScroll}
              showsVerticalScrollIndicator={false}
            >
              {events.length === 0 ? (
                <View style={styles.noStatsContainer}>
                  <Ionicons name="document-outline" size={48} color="#CCC" />
                  <Text style={styles.noStatsText}>
                    Nessuna statistica disponibile
                  </Text>
                </View>
              ) : (
                <>
                  {/* Basketball: Points */}
                  {isBasketball && (points3.length > 0 || points2.length > 0 || points1.length > 0) && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🏀 Punti Segnati</Text>
                      {points3.map((event, idx) => (
                        <View key={`3pt-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🎯 {event.player_name} (+3pt)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {points2.map((event, idx) => (
                        <View key={`2pt-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🏀 {event.player_name} (+2pt)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {points1.map((event, idx) => (
                        <View key={`1pt-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            ⚪ {event.player_name} (+1pt TL)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Basketball: Assists */}
                  {isBasketball && basketballAssists.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🅰️ Assist</Text>
                      {basketballAssists.map((event, idx) => (
                        <View key={idx} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            {event.player_name}
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Basketball: Other stats */}
                  {isBasketball && (rebounds.length > 0 || steals.length > 0 || blocks.length > 0) && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📊 Altre Statistiche</Text>
                      {rebounds.map((event, idx) => (
                        <View key={`reb-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🔄 {event.player_name} (Rimbalzo)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {steals.map((event, idx) => (
                        <View key={`stl-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🖐️ {event.player_name} (Palla Rubata)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {blocks.map((event, idx) => (
                        <View key={`blk-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            ✋ {event.player_name} (Stoppata)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Basketball: Fouls */}
                  {isBasketball && fouls.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>⚠️ Falli</Text>
                      {fouls.map((event, idx) => (
                        <View key={idx} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            {event.player_name}
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Soccer: Goals */}
                  {!isBasketball && goals.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>⚽ Marcatori</Text>
                      {goals.map((event, idx) => (
                        <View key={idx} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            {event.player_name}
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Soccer: Assists */}
                  {!isBasketball && assists.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🅰️ Assist</Text>
                      {assists.map((event, idx) => (
                        <View key={idx} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            {event.player_name}
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Yellow Cards (both sports) */}
                  {yellowCards.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        🟨 Cartellini Gialli
                      </Text>
                      {yellowCards.map((event, idx) => (
                        <View key={idx} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            {event.player_name}
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Red Cards (both sports) */}
                  {redCards.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🟥 Cartellini Rossi</Text>
                      {redCards.map((event, idx) => (
                        <View key={idx} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            {event.player_name}
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Substitutions */}
                  {hasSubs && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🔄 Sostituzioni</Text>
                      {subsOut.map((event, idx) => (
                        <View key={`out-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🔻 {event.player_name} (esce)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {subsIn.map((event, idx) => (
                        <View key={`in-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🔺 {event.player_name} (entra)
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  scoreBox: {
    paddingHorizontal: 16,
  },
  score: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  eventsScroll: {
    maxHeight: 350,
  },
  noStatsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noStatsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventPlayer: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  eventTeam: {
    fontSize: 12,
    color: '#666',
  },
});
