import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  position?: string;
  role?: string;
}

interface CyclingStartOrderViewProps {
  homePlayers: Player[];
  awayPlayers?: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
}

// Role labels with emoji
const ROLE_LABELS: Record<string, string> = {
  'capitano': '🎖️ Capitano',
  'gregario': '🚴 Gregario',
  'scalatore': '⛰️ Scalatore',
  'velocista': '💨 Velocista',
  'cronoman': '⏱️ Cronoman',
  'passista': '🛤️ Passista',
};

export function CyclingStartOrderView({ 
  homePlayers, 
  awayPlayers = [],
  homeTeamName,
  awayTeamName,
}: CyclingStartOrderViewProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const screenWidth = Dimensions.get('window').width;
  const containerWidth = Math.min(screenWidth - 48, 380);

  // Combine all athletes
  const allAthletes = [
    ...homePlayers.map((p, idx) => ({ ...p, team: homeTeamName, startOrder: idx + 1 })),
    ...awayPlayers.map((p, idx) => ({ ...p, team: awayTeamName, startOrder: homePlayers.length + idx + 1 })),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚴 Ordine di Partenza</Text>
        <Text style={styles.headerSubtitle}>{allAthletes.length} atleti</Text>
      </View>

      {/* Road Background */}
      <View style={[styles.roadContainer, { width: containerWidth }]}>
        {/* Road markings */}
        <View style={styles.roadMarking} />
        <View style={[styles.roadMarking, { top: '25%' }]} />
        <View style={[styles.roadMarking, { top: '50%' }]} />
        <View style={[styles.roadMarking, { top: '75%' }]} />

        {/* Athletes List */}
        <View style={styles.athletesList}>
          {allAthletes.map((athlete, index) => (
            <View key={athlete.player_id || index} style={styles.athleteRow}>
              {/* Start Order Badge */}
              <View style={styles.startOrderBadge}>
                <Text style={styles.startOrderText}>{index + 1}</Text>
              </View>

              {/* Athlete Avatar */}
              <View style={styles.athleteAvatar}>
                <Text style={styles.avatarText}>
                  {getInitials(athlete.full_name)}
                </Text>
              </View>

              {/* Athlete Info */}
              <View style={styles.athleteInfo}>
                <View style={styles.athleteNameRow}>
                  {/* Bib Number */}
                  <View style={styles.bibBadge}>
                    <Text style={styles.bibText}>{athlete.number || '-'}</Text>
                  </View>
                  <Text style={styles.athleteName}>{athlete.full_name || 'Atleta'}</Text>
                </View>
                <View style={styles.athleteDetails}>
                  {athlete.team && (
                    <Text style={styles.athleteTeam}>{athlete.team}</Text>
                  )}
                  {athlete.position && ROLE_LABELS[athlete.position] && (
                    <Text style={styles.athleteRole}>
                      {ROLE_LABELS[athlete.position]}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.bibBadge}>
            <Text style={styles.bibText}>#</Text>
          </View>
          <Text style={styles.legendText}>N° Pettorale</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.startOrderBadgeSmall}>
            <Text style={styles.startOrderTextSmall}>1</Text>
          </View>
          <Text style={styles.legendText}>Ordine partenza</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  roadContainer: {
    backgroundColor: '#4A4A4A',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    minHeight: 200,
  },
  roadMarking: {
    position: 'absolute',
    left: '50%',
    width: 40,
    height: 4,
    backgroundColor: '#FFF',
    marginLeft: -20,
    opacity: 0.5,
  },
  athletesList: {
    gap: 12,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  startOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOrderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  athleteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  athleteInfo: {
    flex: 1,
  },
  athleteNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bibBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  bibText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  athleteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  athleteDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  athleteTeam: {
    fontSize: 11,
    color: '#CCC',
  },
  athleteRole: {
    fontSize: 10,
    color: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  startOrderBadgeSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOrderTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CyclingStartOrderView;
