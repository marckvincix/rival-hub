import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ImageBackground } from 'react-native';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  position?: string;
}

interface RugbyCourtViewProps {
  module: string;
  homePlayers: Player[];
  awayPlayers?: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
  gameFormat?: string;
}

// Position coordinates for 15v15 rugby
const RUGBY_15_POSITIONS: Record<string, { top: string; left: string }> = {
  // Front row
  'pilone_sinistro': { top: '85%', left: '35%' },
  'tallonatore': { top: '85%', left: '50%' },
  'pilone_destro': { top: '85%', left: '65%' },
  // Second row
  'seconda_linea_1': { top: '75%', left: '40%' },
  'seconda_linea_2': { top: '75%', left: '60%' },
  // Back row
  'flanker_1': { top: '65%', left: '30%' },
  'numero_8': { top: '65%', left: '50%' },
  'flanker_2': { top: '65%', left: '70%' },
  // Half backs
  'mediano_mischia': { top: '55%', left: '40%' },
  'mediano_apertura': { top: '55%', left: '60%' },
  // Three-quarters
  'centro_1': { top: '45%', left: '35%' },
  'centro_2': { top: '45%', left: '65%' },
  'ala_sinistra': { top: '35%', left: '20%' },
  'ala_destra': { top: '35%', left: '80%' },
  // Full back
  'estremo': { top: '25%', left: '50%' },
};

// Position coordinates for 7v7 rugby
const RUGBY_7_POSITIONS: Record<string, { top: string; left: string }> = {
  // Front row
  'pilone_sinistro': { top: '80%', left: '35%' },
  'tallonatore': { top: '80%', left: '50%' },
  'pilone_destro': { top: '80%', left: '65%' },
  // Half backs
  'mediano_mischia': { top: '60%', left: '40%' },
  'mediano_apertura': { top: '60%', left: '60%' },
  // Backs
  'centro': { top: '40%', left: '50%' },
  'estremo': { top: '25%', left: '50%' },
};

// Role abbreviations
const ROLE_ABBREV: Record<string, string> = {
  'pilone_sinistro': 'PS',
  'tallonatore': 'TL',
  'pilone_destro': 'PD',
  'seconda_linea_1': 'SL',
  'seconda_linea_2': 'SL',
  'flanker_1': 'FL',
  'flanker_2': 'FL',
  'numero_8': 'N8',
  'mediano_mischia': 'MM',
  'mediano_apertura': 'MA',
  'centro_1': 'CE',
  'centro_2': 'CE',
  'ala_sinistra': 'AL',
  'ala_destra': 'AL',
  'estremo': 'ES',
  'centro': 'CE',
};

export function RugbyCourtView({ 
  module, 
  homePlayers, 
  awayPlayers = [],
  homeTeamName,
  awayTeamName,
  gameFormat = '15v15'
}: RugbyCourtViewProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const screenWidth = Dimensions.get('window').width;
  const courtWidth = Math.min(screenWidth - 48, 340);
  const courtHeight = courtWidth * 1.2;

  const is7v7 = gameFormat === '7v7';
  const positions = is7v7 ? RUGBY_7_POSITIONS : RUGBY_15_POSITIONS;

  const getPlayerPosition = (player: Player, index: number) => {
    const positionKeys = Object.keys(positions);
    const posKey = player.position || positionKeys[index % positionKeys.length];
    return positions[posKey] || positions[positionKeys[index % positionKeys.length]];
  };

  return (
    <View style={styles.container}>
      {/* Away team label */}
      {awayTeamName && (
        <View style={styles.teamLabel}>
          <Text style={styles.teamLabelText}>{awayTeamName}</Text>
        </View>
      )}

      {/* Rugby Field Container */}
      <View style={[styles.courtContainer, { width: courtWidth, height: courtHeight }]}>
        <ImageBackground
          source={require('../../assets/images/rugby-field.png')}
          style={styles.courtImage}
          resizeMode="cover"
        >
          {/* Players Overlay */}
          <View style={styles.playersOverlay}>
            {/* Home Players */}
            {homePlayers.map((player, index) => {
              const pos = getPlayerPosition(player, index);
              const roleAbbrev = ROLE_ABBREV[player.position || ''] || (player.number?.toString() || '?');
              
              return (
                <View
                  key={`home-${index}`}
                  style={[
                    styles.playerBadge,
                    styles.playerBadgeHome,
                    { top: pos.top, left: pos.left },
                  ]}
                >
                  <Text style={styles.playerInitials}>
                    {player.number || getInitials(player.full_name)}
                  </Text>
                  {player.full_name && (
                    <View style={styles.playerNameTag}>
                      <Text style={styles.playerNameText} numberOfLines={1}>
                        {player.full_name.split(' ')[0]}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Away Players (for match view) */}
            {awayPlayers.map((player, index) => {
              const pos = getPlayerPosition(player, index);
              // Mirror positions for away team
              const mirroredTop = `${100 - parseFloat(pos.top)}%`;
              
              return (
                <View
                  key={`away-${index}`}
                  style={[
                    styles.playerBadge,
                    styles.playerBadgeAway,
                    { top: mirroredTop, left: pos.left },
                  ]}
                >
                  <Text style={styles.playerInitials}>
                    {player.number || getInitials(player.full_name)}
                  </Text>
                </View>
              );
            })}
          </View>
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
        {awayPlayers.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#666' }]} />
            <Text style={styles.legendText}>Ospite</Text>
          </View>
        )}
      </View>

      {/* Format indicator */}
      <View style={styles.formatBadge}>
        <Text style={styles.formatText}>
          🏉 Rugby {gameFormat} - {module}
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
  },
  playerBadge: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  playerBadgeHome: {
    backgroundColor: '#000',
  },
  playerBadgeAway: {
    backgroundColor: '#666',
  },
  playerInitials: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playerNameTag: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 60,
  },
  playerNameText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '500',
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

export default RugbyCourtView;
