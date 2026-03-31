import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components';
import { favoritesApi, Favorite } from '../../src/utils/favoritesApi';
import { useNotifications } from '../../src/hooks/useNotifications';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { expoPushToken } = useNotifications();
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadNotificationSettings();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const data = await favoritesApi.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.log('Error loading favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await favoritesApi.getNotificationSettings();
      setGlobalNotifications(settings.notifications_enabled);
    } catch (error) {
      console.log('Error loading notification settings:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    await loadNotificationSettings();
    setRefreshing(false);
  }, []);

  const handleToggleGlobalNotifications = async (value: boolean) => {
    setGlobalNotifications(value);
    try {
      await favoritesApi.updateNotificationSettings(value);
    } catch (error) {
      console.log('Error updating notification settings:', error);
      setGlobalNotifications(!value);
    }
  };

  const handleToggleFavoriteNotifications = async (favoriteId: string, currentValue: boolean) => {
    // Optimistic update
    setFavorites(prev => prev.map(f => 
      f.id === favoriteId ? { ...f, notifications_enabled: !currentValue } : f
    ));
    
    try {
      await favoritesApi.updateFavoriteNotifications(favoriteId, !currentValue);
    } catch (error) {
      console.log('Error updating favorite notifications:', error);
      // Revert on error
      setFavorites(prev => prev.map(f => 
        f.id === favoriteId ? { ...f, notifications_enabled: currentValue } : f
      ));
    }
  };

  const handleRemoveFavorite = async (type: 'tournament' | 'team', referenceId: string) => {
    Alert.alert(
      'Rimuovi dai preferiti',
      'Sei sicuro di voler rimuovere questo elemento dai preferiti?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Rimuovi', 
          style: 'destructive',
          onPress: async () => {
            try {
              await favoritesApi.removeFavorite(type, referenceId);
              setFavorites(prev => prev.filter(f => !(f.type === type && f.reference_id === referenceId)));
            } catch (error) {
              console.log('Error removing favorite:', error);
            }
          }
        }
      ]
    );
  };

  const navigateToFavorite = (favorite: Favorite) => {
    if (favorite.type === 'tournament' && favorite.details?.slug) {
      router.push(`/tournament/${favorite.details.slug}`);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/');
      }}
    ]);
  };

  const getPlanFeatures = () => {
    switch (user?.plan) {
      case 'pro': return ['Tornei illimitati', 'Squadre illimitate', 'Statistiche complete', 'Collaboratori', 'Categorie per età', 'Export PDF', 'Senza pubblicità', 'Senza branding'];
      default: return ['1 torneo attivo', 'Max 8 squadre', 'Statistiche base', 'Branding Rival Hub'];
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Utente';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profilo</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'Utente'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.planBadge}>
            <Ionicons name={user?.plan === 'pro' ? 'star' : 'person'} size={16} color="#FFF" />
            <Text style={styles.planBadgeText}>{user?.plan?.toUpperCase() || 'FREE'}</Text>
          </View>
        </View>

        {/* My Favorites Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>I miei Preferiti</Text>
            <Ionicons name="star" size={20} color="#FFD700" />
          </View>
          
          {loadingFavorites ? (
            <ActivityIndicator size="small" color="#000" style={{ padding: 20 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <Ionicons name="star-outline" size={40} color="#CCC" />
              <Text style={styles.emptyFavoritesText}>Nessun preferito</Text>
              <Text style={styles.emptyFavoritesSubtext}>Aggiungi tornei e squadre ai preferiti per ricevere notifiche</Text>
            </View>
          ) : (
            <>
              {/* Tournament Favorites */}
              {favorites.filter(f => f.type === 'tournament').length > 0 && (
                <View style={styles.favoritesGroup}>
                  <Text style={styles.favoritesGroupTitle}>Tornei</Text>
                  {favorites.filter(f => f.type === 'tournament').map(fav => (
                    <View key={fav.id} style={styles.favoriteItem}>
                      <TouchableOpacity 
                        style={styles.favoriteInfo} 
                        onPress={() => navigateToFavorite(fav)}
                      >
                        <Ionicons name="trophy" size={20} color="#000" />
                        <View style={styles.favoriteDetails}>
                          <Text style={styles.favoriteName}>{fav.details?.name || 'Torneo'}</Text>
                          <Text style={styles.favoriteSubtext}>{fav.details?.category} • {fav.details?.location}</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.favoriteActions}>
                        <Switch
                          value={fav.notifications_enabled}
                          onValueChange={() => handleToggleFavoriteNotifications(fav.id, fav.notifications_enabled)}
                          trackColor={{ false: '#CCC', true: '#000' }}
                          thumbColor="#FFF"
                        />
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => handleRemoveFavorite(fav.type, fav.reference_id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Team Favorites */}
              {favorites.filter(f => f.type === 'team').length > 0 && (
                <View style={styles.favoritesGroup}>
                  <Text style={styles.favoritesGroupTitle}>Squadre</Text>
                  {favorites.filter(f => f.type === 'team').map(fav => (
                    <View key={fav.id} style={styles.favoriteItem}>
                      <View style={styles.favoriteInfo}>
                        <Ionicons name="people" size={20} color="#000" />
                        <View style={styles.favoriteDetails}>
                          <Text style={styles.favoriteName}>{fav.details?.name || 'Squadra'}</Text>
                          <Text style={styles.favoriteSubtext}>{fav.details?.tournament_name || ''}</Text>
                        </View>
                      </View>
                      <View style={styles.favoriteActions}>
                        <Switch
                          value={fav.notifications_enabled}
                          onValueChange={() => handleToggleFavoriteNotifications(fav.id, fav.notifications_enabled)}
                          trackColor={{ false: '#CCC', true: '#000' }}
                          thumbColor="#FFF"
                        />
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => handleRemoveFavorite(fav.type, fav.reference_id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Current Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Il tuo Piano</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{user?.plan?.toUpperCase() || 'FREE'}</Text>
              {user?.plan !== 'pro' && (
                <View style={styles.upgradeBadge}>
                  <Text style={styles.upgradeText}>Upgrade</Text>
                </View>
              )}
            </View>
            <View style={styles.planFeatures}>
              {getPlanFeatures().map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={18} color="#000" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Upgrade Options */}
        {user?.plan === 'free' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Passa a Pro</Text>
            
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeHeader}>
                <View style={styles.upgradeIconContainer}>
                  <Ionicons name="star" size={24} color="#FFF" />
                </View>
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeName}>Piano PRO</Text>
                  <Text style={styles.upgradePrice}>€39.99/anno</Text>
                </View>
              </View>
              <Text style={styles.upgradeDesc}>Tornei e squadre illimitate, statistiche complete, collaboratori, categorie per età, export PDF, senza pubblicità</Text>
              <Button title="Scegli Pro" onPress={() => Alert.alert('Stripe', 'Pagamento in modalità test')} fullWidth />
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="notifications-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>Notifiche Push</Text>
            </View>
            <Switch
              value={globalNotifications}
              onValueChange={handleToggleGlobalNotifications}
              trackColor={{ false: '#CCC', true: '#000' }}
              thumbColor="#FFF"
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="help-circle-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>Supporto</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="document-text-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>Termini e Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Button title="Esci" onPress={handleLogout} variant="outline" icon="log-out-outline" fullWidth />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Ionicons name="football" size={24} color="#999" />
          <Text style={styles.appName}>Rival Hub</Text>
          <Text style={styles.appVersion}>Versione 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  userCard: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  upgradeBadge: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  upgradeCard: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  upgradePrice: {
    fontSize: 14,
    color: '#666',
  },
  upgradeDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 140,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 8,
  },
  appVersion: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // Favorites styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyFavorites: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 2,
    borderColor: '#EEE',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  emptyFavoritesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyFavoritesSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  favoritesGroup: {
    marginBottom: 16,
  },
  favoritesGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  favoriteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favoriteDetails: {
    marginLeft: 12,
    flex: 1,
  },
  favoriteName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  favoriteSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  favoriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    padding: 8,
  },
});
