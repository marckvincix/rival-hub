import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useTranslation } from '../i18n';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  photo?: string;
  position?: string;
}

interface TennisCourtViewProps {
  format: 'singles' | 'doubles';
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
}

export function TennisCourtView({ 
  format, 
  homePlayers, 
  awayPlayers,
  homeTeamName,
  awayTeamName 
}: TennisCourtViewProps) {
  const { t } = useTranslation();
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const courtWidth = Dimensions.get('window').width - 64;
  const courtHeight = courtWidth * 1.2; // Aspect ratio of tennis court

  return (
    <View style={styles.container}>
      {/* Away team label */}
      {awayTeamName && (
        <View style={styles.teamLabel}>
          <Text style={styles.teamLabelText}>{awayTeamName}</Text>
        </View>
      )}

      {/* Tennis Court Container */}
      <View style={[styles.courtContainer, { width: courtWidth, height: courtHeight }]}>
        {/* Tennis Court Image */}
        <Image
          source={require('../../assets/images/tennis-court.png')}
          style={[styles.courtImage, { width: courtWidth, height: courtHeight }]}
          resizeMode="contain"
        />
        
        {/* Players Overlay */}
        <View style={styles.playersOverlay}>
          {/* Away players - top of court */}
          <View style={styles.awayPlayersRow}>
            {awayPlayers.slice(0, format === 'singles' ? 1 : 2).map((player, idx) => (
              <View key={idx} style={styles.playerBadge}>
                <Text style={styles.playerInitials}>{getInitials(player?.full_name)}</Text>
              </View>
            ))}
            {awayPlayers.length === 0 && format === 'singles' && (
              <View style={[styles.playerBadge, styles.playerBadgeEmpty]}>
                <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
              </View>
            )}
            {awayPlayers.length === 0 && format === 'doubles' && (
              <>
                <View style={[styles.playerBadge, styles.playerBadgeEmpty]}>
                  <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                </View>
                <View style={[styles.playerBadge, styles.playerBadgeEmpty]}>
                  <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                </View>
              </>
            )}
          </View>
          
          {/* Home players - bottom of court */}
          <View style={styles.homePlayersRow}>
            {homePlayers.slice(0, format === 'singles' ? 1 : 2).map((player, idx) => (
              <View key={idx} style={[styles.playerBadge, styles.playerBadgeHome]}>
                <Text style={styles.playerInitials}>{getInitials(player?.full_name)}</Text>
              </View>
            ))}
            {homePlayers.length === 0 && format === 'singles' && (
              <View style={[styles.playerBadge, styles.playerBadgeHomeEmpty]}>
                <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
              </View>
            )}
            {homePlayers.length === 0 && format === 'doubles' && (
              <>
                <View style={[styles.playerBadge, styles.playerBadgeHomeEmpty]}>
                  <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                </View>
                <View style={[styles.playerBadge, styles.playerBadgeHomeEmpty]}>
                  <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Home team label */}
      <View style={styles.teamLabel}>
        <Text style={styles.teamLabelText}>{homeTeamName || 'Casa'}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#000' }]} />
          <Text style={styles.legendText}>Casa</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#555' }]} />
          <Text style={styles.legendText}>Ospite</Text>
        </View>
      </View>

      {/* Format indicator */}
      <View style={styles.formatBadge}>
        <Text style={styles.formatText}>
          🎾 {format === 'singles' ? t('tennis.singles') : t('tennis.doubles')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  courtContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  courtImage: {
    borderRadius: 12,
  },
  teamLabel: {
    paddingVertical: 8,
  },
  teamLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  playersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 30,
  },
  awayPlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 20,
  },
  homePlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 20,
  },
  playerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    // Shadow for visibility on green court
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playerBadgeHome: {
    backgroundColor: '#000',
  },
  playerBadgeEmpty: {
    backgroundColor: 'rgba(85, 85, 85, 0.5)',
    borderStyle: 'dashed',
  },
  playerBadgeHomeEmpty: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderStyle: 'dashed',
  },
  playerInitials: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  playerInitialsEmpty: {
    opacity: 0.7,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  formatBadge: {
    marginTop: 12,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

export default TennisCourtView;
