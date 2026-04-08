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
  ActivityIndicator,
  Modal
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
  const [showTermsModal, setShowTermsModal] = useState(false);

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

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowTermsModal(true)}>
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

      {/* Terms and Privacy Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <SafeAreaView style={styles.termsModalContainer}>
          <View style={styles.termsHeader}>
            <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.termsCloseButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.termsHeaderTitle}>Termini e Privacy</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.termsContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.termsSectionTitle}>TERMINI DI SERVIZIO</Text>
            
            <Text style={styles.termsSubtitle}>1. Informazioni generali</Text>
            <Text style={styles.termsText}>
              Rival Hub è una piattaforma digitale gratuita per la gestione di tornei sportivi, fornita da Omniaweb srls. Il servizio è offerto a titolo gratuito per tutti gli utenti.
            </Text>
            
            <Text style={styles.termsSubtitle}>2. Responsabilità dell'Utente (Contenuti e Terzi)</Text>
            <Text style={styles.termsText}>
              L'utente è l'unico ed esclusivo responsabile di tutti i dati inseriti nell'app, inclusi ma non limitati a: nomi, cognomi, dati anagrafici, foto profilo e immagini di giocatori, squadre o collaboratori.
            </Text>
            <Text style={styles.termsText}>
              L'utente dichiara e garantisce di aver ottenuto il consenso preventivo e informato da parte di ogni soggetto terzo (giocatori, minori, staff) prima di caricarne i dati o le immagini sulla piattaforma.
            </Text>
            <Text style={styles.termsText}>
              Rival Hub (Omniaweb srls) non si assume alcuna responsabilità, civile o penale, per l'inserimento non autorizzato di dati personali di terzi effettuato dall'utente.
            </Text>
            
            <Text style={styles.termsSubtitle}>3. Divieti e Sospensione</Text>
            <Text style={styles.termsText}>
              È vietato l'uso dell'app per scopi illeciti o fraudolenti. In caso di segnalazioni o violazioni della privacy, il titolare si riserva il diritto di eliminare i contenuti o sospendere l'account senza preavviso.
            </Text>
            
            <Text style={styles.termsSubtitle}>4. Limitazione di responsabilità</Text>
            <Text style={styles.termsText}>
              Il titolare non garantisce la disponibilità ininterrotta del servizio e non è responsabile per eventuali perdite di dati o interruzioni tecniche.
            </Text>
            
            <Text style={styles.termsSubtitle}>5. Legge applicabile</Text>
            <Text style={styles.termsText}>
              Foro competente: Napoli. Legge Italiana.
            </Text>
            
            <Text style={styles.termsSectionTitle}>HIGHLIGHTS — FOTO E VIDEO</Text>
            
            <Text style={styles.termsSubtitle}>6. Caricamento contenuti multimediali</Text>
            <Text style={styles.termsText}>
              L'utente garantisce di essere titolare dei diritti o di avere il consenso scritto (anche dei genitori/tutori per i minori) per ogni foto o video caricato. Caricando il contenuto, l'utente manleva totalmente Rival Hub da ogni pretesa di terzi relativa alla violazione della privacy o dei diritti d'immagine.
            </Text>
            
            <Text style={styles.termsSubtitle}>7. Conservazione</Text>
            <Text style={styles.termsText}>
              I contenuti della sezione Highlights vengono eliminati automaticamente dopo 365 giorni.
            </Text>
            
            <Text style={styles.termsSectionTitle}>PRIVACY POLICY (GDPR)</Text>
            
            <Text style={styles.termsSubtitle}>8. Titolare del trattamento</Text>
            <Text style={styles.termsText}>
              Omniaweb srls — info@rivalhub.app
            </Text>
            
            <Text style={styles.termsSubtitle}>9. Dati raccolti</Text>
            <Text style={styles.termsText}>
              Email, nome, cognome dell'utente registrato; dati identificativi e immagini di terzi (giocatori/squadre) inseriti dall'utente stesso. Non vengono raccolti dati di pagamento.
            </Text>
            
            <Text style={styles.termsSubtitle}>10. Diritti dell'utente</Text>
            <Text style={styles.termsText}>
              Accesso, rettifica e cancellazione (oblio) scrivendo a info@rivalhub.app. L'utente può richiedere in ogni momento la cancellazione dei dati dei giocatori da lui inseriti.
            </Text>
            
            <Text style={styles.termsSubtitle}>11. Cookie</Text>
            <Text style={styles.termsText}>
              Solo tecnici necessari. Nessuna profilazione.
            </Text>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyFavorites: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
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
  // Terms Modal styles
  termsModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  termsCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  termsContent: {
    flex: 1,
    padding: 20,
  },
  termsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 16,
  },
  termsSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
});
