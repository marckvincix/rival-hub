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
import { useTranslation } from '../i18n';

interface MatchStatsModalProps {
  visible: boolean;
  onClose: () => void;
  match: {
    id: string;
    home_team_id: string;
    away_team_id: string;
    home_goals?: number;
    away_goals?: number;
    home_stats?: any;
    away_stats?: any;
    tennis_sets?: any[];
    currentGame?: any;
  } | null;
  getTeamName: (teamId: string) => string;
  sport?: string;
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
  sport,
}: MatchStatsModalProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);

  // Determine if racket sport or volleyball or rugby
  const isRacketSport = sport === 'tennis' || sport === 'padel';
  const isVolleyball = sport === 'pallavolo';
  const isRugby = sport === 'rugby';
  const isPadel = sport === 'padel';
  const isSetBasedSport = isRacketSport || isVolleyball;
  const isEventBasedOnMatch = isSetBasedSport || isRugby; // Sports that store events in match document

  useEffect(() => {
    if (visible && match?.id) {
      // For set-based sports and rugby, fetch the latest match data directly from the server
      if (isEventBasedOnMatch) {
        setLoading(true);
        setMatchData(null); // Reset before fetching
        api.get(`/api/matches/${match.id}`)
          .then((res) => {
            console.log('MatchStatsModal: Fetched match data for', sport, res.data);
            setMatchData(res.data);
          })
          .catch((err) => {
            console.error('Error fetching match data:', err);
            setMatchData(match); // Fallback to passed match
          })
          .finally(() => setLoading(false));
      } else {
        loadMatchEvents();
        setMatchData(match);
      }
    } else {
      setMatchData(null);
      setEvents([]);
    }
  }, [visible, match?.id, sport]);

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
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📊 {t('stats.matchStats', 'Match Statistics')}</Text>
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
          {!loading && matchData && (
            <ScrollView
              style={styles.eventsScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Tennis/Padel/Volleyball Stats from match data */}
              {isSetBasedSport ? (
                <>
                  {/* Sets Breakdown - Tennis/Padel */}
                  {isRacketSport && matchData.tennis_sets && matchData.tennis_sets.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🎾 Punteggio Set</Text>
                      {matchData.tennis_sets.map((set: any, idx: number) => (
                        <View key={idx} style={styles.setRow}>
                          <Text style={styles.setLabel}>Set {idx + 1}</Text>
                          <View style={styles.setScoreBox}>
                            <Text style={[styles.setScore, set.homeGames > set.awayGames && styles.setScoreWinner]}>
                              {set.homeGames}
                            </Text>
                            <Text style={styles.setScoreSeparator}>-</Text>
                            <Text style={[styles.setScore, set.awayGames > set.homeGames && styles.setScoreWinner]}>
                              {set.awayGames}
                            </Text>
                          </View>
                          {set.completed && (
                            <Text style={styles.setStatus}>✓</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Sets Breakdown - Volleyball */}
                  {isVolleyball && matchData.volleyball_sets && matchData.volleyball_sets.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🏐 Punteggio Set</Text>
                      {matchData.volleyball_sets.map((set: any, idx: number) => (
                        <View key={idx} style={styles.setRow}>
                          <Text style={styles.setLabel}>Set {idx + 1}</Text>
                          <View style={styles.setScoreBox}>
                            <Text style={[styles.setScore, set.homeScore > set.awayScore && styles.setScoreWinner]}>
                              {set.homeScore || 0}
                            </Text>
                            <Text style={styles.setScoreSeparator}>-</Text>
                            <Text style={[styles.setScore, set.awayScore > set.homeScore && styles.setScoreWinner]}>
                              {set.awayScore || 0}
                            </Text>
                          </View>
                          {set.completed && (
                            <Text style={styles.setStatus}>✓</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Team Stats Comparison - Tennis/Padel */}
                  {isRacketSport && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📊 {t('stats.title', 'Statistics')} {isPadel ? 'Padel' : 'Tennis'}</Text>
                    
                    {/* Stats Header */}
                    <View style={styles.statsCompareHeader}>
                      <Text style={styles.statsCompareTeam}>{getTeamName(matchData.home_team_id)}</Text>
                      <Text style={styles.statsCompareLabel}>{t('stats.stat', 'Stat')}</Text>
                      <Text style={styles.statsCompareTeam}>{getTeamName(matchData.away_team_id)}</Text>
                    </View>
                    
                    {/* Aces */}
                    <View style={styles.statsCompareRow}>
                      <Text style={styles.statsCompareValue}>{matchData.home_stats?.aces || 0}</Text>
                      <Text style={styles.statsCompareStatName}>🎯 Ace</Text>
                      <Text style={styles.statsCompareValue}>{matchData.away_stats?.aces || 0}</Text>
                    </View>
                    
                    {/* Double Faults */}
                    <View style={styles.statsCompareRow}>
                      <Text style={[styles.statsCompareValue, { color: '#EF4444' }]}>{matchData.home_stats?.doubleFaults || 0}</Text>
                      <Text style={styles.statsCompareStatName}>❌ {t('tennis.doubleFaultsShort', 'DF')}</Text>
                      <Text style={[styles.statsCompareValue, { color: '#EF4444' }]}>{matchData.away_stats?.doubleFaults || 0}</Text>
                    </View>
                    
                    {/* Winners */}
                    <View style={styles.statsCompareRow}>
                      <Text style={[styles.statsCompareValue, { color: '#10B981' }]}>{matchData.home_stats?.winners || 0}</Text>
                      <Text style={styles.statsCompareStatName}>🏆 Winners</Text>
                      <Text style={[styles.statsCompareValue, { color: '#10B981' }]}>{matchData.away_stats?.winners || 0}</Text>
                    </View>
                    
                    {/* Unforced Errors */}
                    <View style={styles.statsCompareRow}>
                      <Text style={[styles.statsCompareValue, { color: '#F59E0B' }]}>{matchData.home_stats?.unforcedErrors || 0}</Text>
                      <Text style={styles.statsCompareStatName}>⚠️ {t('tennis.unforcedErrorsShort', 'UE')}</Text>
                      <Text style={[styles.statsCompareValue, { color: '#F59E0B' }]}>{matchData.away_stats?.unforcedErrors || 0}</Text>
                    </View>
                    
                    {/* Smash Winners (Padel only) */}
                    {isPadel && (
                      <View style={styles.statsCompareRow}>
                        <Text style={[styles.statsCompareValue, { color: '#8B5CF6' }]}>{matchData.home_stats?.smashWinners || 0}</Text>
                        <Text style={styles.statsCompareStatName}>💥 Smash</Text>
                        <Text style={[styles.statsCompareValue, { color: '#8B5CF6' }]}>{matchData.away_stats?.smashWinners || 0}</Text>
                      </View>
                    )}
                  </View>
                  )}
                  
                  {/* Team Stats Comparison - Volleyball */}
                  {isVolleyball && (matchData.home_stats || matchData.away_stats) && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📊 {t('volleyball.statsTitle', 'Volleyball Statistics')}</Text>
                      
                      {/* Stats Header */}
                      <View style={styles.statsCompareHeader}>
                        <Text style={styles.statsCompareTeam}>{getTeamName(matchData.home_team_id)}</Text>
                        <Text style={styles.statsCompareLabel}>{t('stats.stat', 'Stat')}</Text>
                        <Text style={styles.statsCompareTeam}>{getTeamName(matchData.away_team_id)}</Text>
                      </View>
                      
                      {/* Points */}
                      <View style={styles.statsCompareRow}>
                        <Text style={styles.statsCompareValue}>{matchData.home_stats?.points || 0}</Text>
                        <Text style={styles.statsCompareStatName}>🏐 Punti</Text>
                        <Text style={styles.statsCompareValue}>{matchData.away_stats?.points || 0}</Text>
                      </View>
                      
                      {/* Aces */}
                      <View style={styles.statsCompareRow}>
                        <Text style={[styles.statsCompareValue, { color: '#10B981' }]}>{matchData.home_stats?.aces || 0}</Text>
                        <Text style={styles.statsCompareStatName}>🎯 Ace</Text>
                        <Text style={[styles.statsCompareValue, { color: '#10B981' }]}>{matchData.away_stats?.aces || 0}</Text>
                      </View>
                      
                      {/* Blocks */}
                      <View style={styles.statsCompareRow}>
                        <Text style={[styles.statsCompareValue, { color: '#3B82F6' }]}>{matchData.home_stats?.blocks || 0}</Text>
                        <Text style={styles.statsCompareStatName}>🧱 Muri</Text>
                        <Text style={[styles.statsCompareValue, { color: '#3B82F6' }]}>{matchData.away_stats?.blocks || 0}</Text>
                      </View>
                    </View>
                  )}
                </>
              ) : isRugby ? (
                /* Rugby Stats from match data */
                <>
                  {/* Rugby Events List */}
                  {matchData?.rugby_events && matchData.rugby_events.length > 0 ? (
                    <>
                      {/* Tries */}
                      {matchData.rugby_events.filter((e: any) => e.type === 'try').length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>🏉 Mete</Text>
                          {matchData.rugby_events.filter((e: any) => e.type === 'try').map((event: any, idx: number) => (
                            <View key={`try-${idx}`} style={styles.eventRow}>
                              <Text style={styles.eventPlayer}>
                                {event.player_name || t('common.player', 'Player')} ({event.minute}'')
                              </Text>
                              <Text style={[styles.eventTeam, { color: event.team === 'home' ? '#2D8A2E' : '#E53935' }]}>
                                ({event.team === 'home' ? getTeamName(matchData.home_team_id) : getTeamName(matchData.away_team_id)}) +5pt
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Conversions */}
                      {matchData.rugby_events.filter((e: any) => e.type === 'conversion').length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>⚽ Trasformazioni</Text>
                          {matchData.rugby_events.filter((e: any) => e.type === 'conversion').map((event: any, idx: number) => (
                            <View key={`conv-${idx}`} style={styles.eventRow}>
                              <Text style={styles.eventPlayer}>
                                {event.player_name || t('common.player', 'Player')} ({event.minute}'')
                              </Text>
                              <Text style={[styles.eventTeam, { color: event.team === 'home' ? '#2D8A2E' : '#E53935' }]}>
                                ({event.team === 'home' ? getTeamName(matchData.home_team_id) : getTeamName(matchData.away_team_id)}) +2pt
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Penalties */}
                      {matchData.rugby_events.filter((e: any) => e.type === 'penalty').length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>🎯 Calci Punizione</Text>
                          {matchData.rugby_events.filter((e: any) => e.type === 'penalty').map((event: any, idx: number) => (
                            <View key={`pen-${idx}`} style={styles.eventRow}>
                              <Text style={styles.eventPlayer}>
                                {event.player_name || t('common.player', 'Player')} ({event.minute}'')
                              </Text>
                              <Text style={[styles.eventTeam, { color: event.team === 'home' ? '#2D8A2E' : '#E53935' }]}>
                                ({event.team === 'home' ? getTeamName(matchData.home_team_id) : getTeamName(matchData.away_team_id)}) +3pt
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Drop Goals */}
                      {matchData.rugby_events.filter((e: any) => e.type === 'drop_goal').length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>💫 Drop Goals</Text>
                          {matchData.rugby_events.filter((e: any) => e.type === 'drop_goal').map((event: any, idx: number) => (
                            <View key={`drop-${idx}`} style={styles.eventRow}>
                              <Text style={styles.eventPlayer}>
                                {event.player_name || t('common.player', 'Player')} ({event.minute}'')
                              </Text>
                              <Text style={[styles.eventTeam, { color: event.team === 'home' ? '#2D8A2E' : '#E53935' }]}>
                                ({event.team === 'home' ? getTeamName(matchData.home_team_id) : getTeamName(matchData.away_team_id)}) +3pt
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Yellow/Red Cards */}
                      {matchData.rugby_events.filter((e: any) => e.type === 'yellow_card' || e.type === 'red_card').length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>🟨🟥 Cartellini</Text>
                          {matchData.rugby_events.filter((e: any) => e.type === 'yellow_card' || e.type === 'red_card').map((event: any, idx: number) => (
                            <View key={`card-${idx}`} style={styles.eventRow}>
                              <Text style={styles.eventPlayer}>
                                {event.type === 'yellow_card' ? '🟨' : '🟥'} {event.player_name || 'Giocatore'} ({event.minute}'')
                              </Text>
                              <Text style={[styles.eventTeam, { color: event.team === 'home' ? '#2D8A2E' : '#E53935' }]}>
                                ({event.team === 'home' ? getTeamName(matchData.home_team_id) : getTeamName(matchData.away_team_id)})
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Tackles */}
                      {matchData.rugby_events.filter((e: any) => e.type === 'tackle').length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>🤝 Placcaggi</Text>
                          {matchData.rugby_events.filter((e: any) => e.type === 'tackle').map((event: any, idx: number) => (
                            <View key={`tackle-${idx}`} style={styles.eventRow}>
                              <Text style={styles.eventPlayer}>
                                {event.player_name || t('common.player', 'Player')}
                              </Text>
                              <Text style={[styles.eventTeam, { color: event.team === 'home' ? '#2D8A2E' : '#E53935' }]}>
                                ({event.team === 'home' ? getTeamName(matchData.home_team_id) : getTeamName(matchData.away_team_id)})
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.noStatsContainer}>
                      <Ionicons name="document-outline" size={48} color="#CCC" />
                      <Text style={styles.noStatsText}>
                        {t('stats.noStatsAvailable', 'No statistics available')}
                      </Text>
                    </View>
                  )}
                </>
              ) : events.length === 0 ? (
                <View style={styles.noStatsContainer}>
                  <Ionicons name="document-outline" size={48} color="#CCC" />
                  <Text style={styles.noStatsText}>
                    {t('stats.noStatsAvailable', 'No statistics available')}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Basketball: Points */}
                  {isBasketball && (points3.length > 0 || points2.length > 0 || points1.length > 0) && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>🏀 {t('basketball.pointsScored', 'Points Scored')}</Text>
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
                      <Text style={styles.sectionTitle}>📊 {t('basketball.otherStats', 'Other Stats')}</Text>
                      {rebounds.map((event, idx) => (
                        <View key={`reb-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🔄 {event.player_name} ({t('basketball.reboundsShort', 'REB')})
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {steals.map((event, idx) => (
                        <View key={`stl-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🖐️ {event.player_name} ({t('basketball.stealsShort', 'STL')})
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {blocks.map((event, idx) => (
                        <View key={`blk-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            ✋ {event.player_name} ({t('basketball.blocksShort', 'BLK')})
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
                      <Text style={styles.sectionTitle}>⚽ {t('soccer.scorers', 'Scorers')}</Text>
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
                        🟨 {t('stats.yellowCards', 'Yellow Cards')}
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
                      <Text style={styles.sectionTitle}>🟥 {t('stats.redCards', 'Red Cards')}</Text>
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
                      <Text style={styles.sectionTitle}>🔄 {t('soccer.substitutions', 'Substitutions')}</Text>
                      {subsOut.map((event, idx) => (
                        <View key={`out-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🔻 {event.player_name} ({t('soccer.subOut')})
                          </Text>
                          <Text style={styles.eventTeam}>
                            ({getEventTeamName(event.team_id)})
                          </Text>
                        </View>
                      ))}
                      {subsIn.map((event, idx) => (
                        <View key={`in-${idx}`} style={styles.eventRow}>
                          <Text style={styles.eventPlayer}>
                            🔺 {event.player_name} ({t('soccer.subIn')})
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
        </View>
      </View>
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
    flexShrink: 1,
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
    flex: 1,
    maxHeight: 450,
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
  // Tennis/Padel specific styles
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 60,
  },
  setScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  setScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    minWidth: 30,
    textAlign: 'center',
  },
  setScoreWinner: {
    color: '#10B981',
  },
  setScoreSeparator: {
    fontSize: 18,
    color: '#999',
    marginHorizontal: 8,
  },
  setStatus: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 8,
  },
  statsCompareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    marginBottom: 8,
  },
  statsCompareTeam: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  statsCompareLabel: {
    width: 100,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  statsCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statsCompareValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  statsCompareStatName: {
    width: 100,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noStatsSubtext: {
    fontSize: 12,
    color: '#BBB',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
