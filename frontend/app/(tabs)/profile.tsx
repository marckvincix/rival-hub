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
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { Button, TermsModal, LanguageSelector } from '../../src/components';
import { favoritesApi, Favorite } from '../../src/utils/favoritesApi';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useLanguage } from '../../src/contexts/LanguageContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuthStore();
  const { expoPushToken } = useNotifications();
  const { t } = useTranslation();
  const { currentLanguage, languages } = useLanguage();
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Get current language info
  const currentLang = languages.find(l => l.code === currentLanguage);

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
      t('favorites.removeFromFavorites', 'Remove from favorites'),
      t('alerts.confirmRemoveFavorite', 'Are you sure you want to remove this item from favorites?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('alerts.remove', 'Remove'), 
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
    Alert.alert(t('alerts.logout', 'Logout'), t('alerts.logoutConfirm', 'Are you sure you want to logout?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { text: t('auth.logout', 'Logout'), style: 'destructive', onPress: async () => {
        // Don't navigate here: (tabs)/_layout.tsx already redirects to '/'
        // as soon as isAuthenticated flips to false. Also calling
        // router.replace() here races with that redirect and can leave
        // the screen blank.
        await logout();
      }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount', 'Delete Account'),
      t('profile.deleteAccountWarning', 'This will permanently delete your account and all associated data.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Don't navigate here either: (tabs)/_layout.tsx redirects once
              // isAuthenticated flips to false, same as logout.
              await deleteAccount();
            } catch (error) {
              Alert.alert(t('common.error', 'Error'), t('errors.somethingWentWrong', 'Something went wrong'));
            }
          }
        }
      ]
    );
  };

  const firstName = user?.name?.split(' ')[0] || t('common.player', 'User');

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
          <Text style={styles.title}>{t('profile.title')}</Text>
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
          <Text style={styles.userName}>{user?.name || t('common.player', 'User')}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* My Favorites Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.myFavorites', 'My Favorites')}</Text>
            <Ionicons name="star" size={20} color="#FFD700" />
          </View>
          
          {loadingFavorites ? (
            <ActivityIndicator size="small" color="#000" style={{ padding: 20 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <Ionicons name="star-outline" size={40} color="#CCC" />
              <Text style={styles.emptyFavoritesText}>{t('profile.noFavorites', 'No favorites')}</Text>
              <Text style={styles.emptyFavoritesSubtext}>{t('profile.addFavoritesHint', 'Add tournaments and teams to favorites to receive notifications')}</Text>
            </View>
          ) : (
            <>
              {/* Tournament Favorites */}
              {favorites.filter(f => f.type === 'tournament').length > 0 && (
                <View style={styles.favoritesGroup}>
                  <Text style={styles.favoritesGroupTitle}>{t('tournaments.title')}</Text>
                  {favorites.filter(f => f.type === 'tournament').map(fav => (
                    <View key={fav.id} style={styles.favoriteItem}>
                      <TouchableOpacity 
                        style={styles.favoriteInfo} 
                        onPress={() => navigateToFavorite(fav)}
                      >
                        <Ionicons name="trophy" size={20} color="#000" />
                        <View style={styles.favoriteDetails}>
                          <Text style={styles.favoriteName}>{fav.details?.name || t('profile.tournament', 'Tournament')}</Text>
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
                  <Text style={styles.favoritesGroupTitle}>{t('teams.title', 'Teams')}</Text>
                  {favorites.filter(f => f.type === 'team').map(fav => (
                    <View key={fav.id} style={styles.favoriteItem}>
                      <View style={styles.favoriteInfo}>
                        <Ionicons name="people" size={20} color="#000" />
                        <View style={styles.favoriteDetails}>
                          <Text style={styles.favoriteName}>{fav.details?.name || t('profile.team', 'Team')}</Text>
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
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="notifications-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>{t('profile.pushNotifications')}</Text>
            </View>
            <Switch
              value={globalNotifications}
              onValueChange={handleToggleGlobalNotifications}
              trackColor={{ false: '#CCC', true: '#000' }}
              thumbColor="#FFF"
            />
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageSelector(true)}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="language-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>{t('profile.language')}</Text>
            </View>
            <View style={styles.languageValue}>
              <Text style={styles.languageFlag}>{currentLang?.flag}</Text>
              <Text style={styles.languageName}>{currentLang?.nativeName}</Text>
              <Ionicons name="chevron-forward" size={20} color="#000" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="help-circle-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>{t('profile.helpSupport')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowTermsModal(true)}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="document-text-outline" size={20} color="#000" />
              </View>
              <Text style={styles.settingText}>{t('profile.termsAndPrivacy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Button title={t('auth.logout')} onPress={handleLogout} variant="outline" icon="log-out-outline" fullWidth />
        </View>

        {/* Delete Account */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={styles.deleteAccountText}>{t('profile.deleteAccount', 'Delete Account')}</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Ionicons name="football" size={24} color="#999" />
          <Text style={styles.appName}>Rival Hub</Text>
          <Text style={styles.appVersion}>{t('common.version')} 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Terms and Privacy Modal */}
      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />
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
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
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
  languageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageName: {
    fontSize: 14,
    color: '#666',
  },
});
