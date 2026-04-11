import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageBackground } from 'react-native';
import { useTranslation } from '../i18n';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  photo?: string;
  position?: string;
}

interface PadelCourtViewProps {
  format: 'singles' | 'doubles';
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
}

export function PadelCourtView({ 
  format, 
  homePlayers, 
  awayPlayers,
  homeTeamName,
  awayTeamName 
}: PadelCourtViewProps) {
  const { t } = useTranslation();
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const screenWidth = Dimensions.get('window').width;
  const courtWidth = Math.min(screenWidth - 48, 340);
  const courtHeight = courtWidth * 1.3;

  return (
    <View style={styles.container}>
      {/* Away team label */}
      {awayTeamName && (
        <View style={styles.teamLabel}>
          <Text style={styles.teamLabelText}>{awayTeamName}</Text>
        </View>
      )}

      {/* Padel Court Container with Image */}
      <View style={[styles.courtContainer, { width: courtWidth, height: courtHeight }]}>
        <ImageBackground
          source={require('../../assets/images/padel-court.png')}
          style={styles.courtImage}
          resizeMode="cover"
        >
          {/* Players Overlay */}
          <View style={styles.playersOverlay}>
            {/* Away players - top of court */}
            <View style={styles.awayPlayersRow}>
              {format === 'doubles' ? (
                <>
                  {awayPlayers[0] ? (
                    <View style={styles.playerBadge}>
                      <Text style={styles.playerInitials}>{getInitials(awayPlayers[0]?.full_name)}</Text>
                      {awayPlayers[0]?.number && (
                        <View style={styles.playerNumberBadge}>
                          <Text style={styles.playerNumberText}>{awayPlayers[0].number}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.playerBadge, styles.playerBadgeEmpty]}>
                      <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                    </View>
                  )}
                  {awayPlayers[1] ? (
                    <View style={styles.playerBadge}>
                      <Text style={styles.playerInitials}>{getInitials(awayPlayers[1]?.full_name)}</Text>
                      {awayPlayers[1]?.number && (
                        <View style={styles.playerNumberBadge}>
                          <Text style={styles.playerNumberText}>{awayPlayers[1].number}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.playerBadge, styles.playerBadgeEmpty]}>
                      <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                    </View>
                  )}
                </>
              ) : (
                awayPlayers[0] ? (
                  <View style={styles.playerBadge}>
                    <Text style={styles.playerInitials}>{getInitials(awayPlayers[0]?.full_name)}</Text>
                    {awayPlayers[0]?.number && (
                      <View style={styles.playerNumberBadge}>
                        <Text style={styles.playerNumberText}>{awayPlayers[0].number}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.playerBadge, styles.playerBadgeEmpty]}>
                    <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                  </View>
                )
              )}
            </View>
            
            {/* Home players - bottom of court */}
            <View style={styles.homePlayersRow}>
              {format === 'doubles' ? (
                <>
                  {homePlayers[0] ? (
                    <View style={[styles.playerBadge, styles.playerBadgeHome]}>
                      <Text style={styles.playerInitials}>{getInitials(homePlayers[0]?.full_name)}</Text>
                      {homePlayers[0]?.number && (
                        <View style={styles.playerNumberBadge}>
                          <Text style={styles.playerNumberText}>{homePlayers[0].number}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.playerBadge, styles.playerBadgeHomeEmpty]}>
                      <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                    </View>
                  )}
                  {homePlayers[1] ? (
                    <View style={[styles.playerBadge, styles.playerBadgeHome]}>
                      <Text style={styles.playerInitials}>{getInitials(homePlayers[1]?.full_name)}</Text>
                      {homePlayers[1]?.number && (
                        <View style={styles.playerNumberBadge}>
                          <Text style={styles.playerNumberText}>{homePlayers[1].number}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.playerBadge, styles.playerBadgeHomeEmpty]}>
                      <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                    </View>
                  )}
                </>
              ) : (
                homePlayers[0] ? (
                  <View style={[styles.playerBadge, styles.playerBadgeHome]}>
                    <Text style={styles.playerInitials}>{getInitials(homePlayers[0]?.full_name)}</Text>
                    {homePlayers[0]?.number && (
                      <View style={styles.playerNumberBadge}>
                        <Text style={styles.playerNumberText}>{homePlayers[0].number}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.playerBadge, styles.playerBadgeHomeEmpty]}>
                    <Text style={[styles.playerInitials, styles.playerInitialsEmpty]}>?</Text>
                  </View>
                )
              )}
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Home team label */}
      <View style={styles.teamLabel}>
        <Text style={styles.teamLabelText}>{homeTeamName || t('matches.home', 'Home')}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#000' }]} />
          <Text style={styles.legendText}>{t('matches.home', 'Home')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#555' }]} />
          <Text style={styles.legendText}>{t('matches.away', 'Away')}</Text>
        </View>
      </View>

      {/* Format indicator */}
      <View style={styles.formatBadge}>
        <Text style={styles.formatText}>
          🎾 Padel {format === 'singles' ? t('tennis.singles') : t('tennis.doubles')}
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
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1B6CA8',
  },
  courtImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    paddingVertical: 40,
  },
  awayPlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    marginTop: 30,
  },
  homePlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    marginBottom: 30,
  },
  playerBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    position: 'relative',
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
  playerNumberBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
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

export default PadelCourtView;
