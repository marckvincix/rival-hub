import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  position?: string;
}

interface VolleyballCourtViewProps {
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
  module?: string;
}

export function VolleyballCourtView({ 
  homePlayers, 
  awayPlayers,
  homeTeamName,
  awayTeamName,
  module = '4-2'
}: VolleyballCourtViewProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const screenWidth = Dimensions.get('window').width;
  const courtWidth = Math.min(screenWidth - 48, 320);
  const courtHeight = courtWidth * 1.4;

  // Position players in 6 zones (3 front + 3 back per team)
  const getPlayerPositions = (players: Player[], isHome: boolean) => {
    const positions = [];
    const zoneWidth = courtWidth / 3;
    const zoneHeight = courtHeight / 4;
    
    // Home team (bottom half) or Away team (top half)
    const baseY = isHome ? courtHeight / 2 : 0;
    
    // Volleyball zones - 3 front, 3 back
    const zones = isHome ? [
      // Home team - bottom half
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 1.6 }, // Back right
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 0.5 }, // Front right
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 0.5 }, // Front center
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 0.5 }, // Front left
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 1.6 }, // Back left
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 1.6 }, // Back center
    ] : [
      // Away team - top half (mirrored)
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 0.4 }, // Back left (mirrored)
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 1.5 }, // Front left
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 1.5 }, // Front center
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 1.5 }, // Front right
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 0.4 }, // Back right
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 0.4 }, // Back center
    ];

    for (let i = 0; i < Math.min(players.length, 6); i++) {
      positions.push({
        player: players[i],
        x: zones[i].x,
        y: zones[i].y,
      });
    }
    
    return positions;
  };

  const homePositions = getPlayerPositions(homePlayers, true);
  const awayPositions = getPlayerPositions(awayPlayers, false);

  return (
    <View style={styles.container}>
      {/* Away team label */}
      {awayTeamName && (
        <View style={styles.teamLabel}>
          <Text style={styles.teamLabelText}>{awayTeamName}</Text>
        </View>
      )}

      {/* Court Container with Image */}
      <View style={[styles.courtContainer, { width: courtWidth, height: courtHeight }]}>
        <ImageBackground
          source={require('../../assets/images/volleyball-court.png')}
          style={styles.courtImage}
          resizeMode="cover"
        >
          {/* Away players (top half) */}
          {awayPositions.map((pos, idx) => (
            <View
              key={`away-${idx}`}
              style={[
                styles.playerBadge,
                styles.awayPlayerBadge,
                { left: pos.x - 22, top: pos.y - 22 }
              ]}
            >
              <Text style={styles.playerInitials}>{getInitials(pos.player?.full_name)}</Text>
              {pos.player?.number && (
                <View style={styles.playerNumberBadge}>
                  <Text style={styles.playerNumberText}>{pos.player.number}</Text>
                </View>
              )}
            </View>
          ))}
          
          {/* Home players (bottom half) */}
          {homePositions.map((pos, idx) => (
            <View
              key={`home-${idx}`}
              style={[
                styles.playerBadge,
                styles.homePlayerBadge,
                { left: pos.x - 22, top: pos.y - 22 }
              ]}
            >
              <Text style={styles.playerInitials}>{getInitials(pos.player?.full_name)}</Text>
              {pos.player?.number && (
                <View style={styles.playerNumberBadge}>
                  <Text style={styles.playerNumberText}>{pos.player.number}</Text>
                </View>
              )}
            </View>
          ))}
        </ImageBackground>
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

      {/* Module indicator */}
      <View style={styles.moduleBadge}>
        <Text style={styles.moduleText}>🏐 Modulo {module}</Text>
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
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
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
  playerBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  homePlayerBadge: {
    backgroundColor: '#000',
  },
  awayPlayerBadge: {
    backgroundColor: '#555',
  },
  playerInitials: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
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
  moduleBadge: {
    marginTop: 12,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moduleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

export default VolleyballCourtView;
