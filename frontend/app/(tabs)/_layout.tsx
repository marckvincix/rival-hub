import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useEffect } from 'react';

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === 'dashboard') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    if (route === 'tournaments') return pathname.includes('tournaments');
    if (route === 'profile') return pathname.includes('profile');
    return false;
  };

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBar}>
        {/* Dashboard Tab */}
        <TouchableOpacity
          style={[styles.tabItem, isActive('dashboard') && styles.tabItemActive]}
          onPress={() => router.push('/(tabs)/')}
        >
          <Ionicons name="grid" size={24} color="#000" />
          <Text style={styles.tabLabel}>Dashboard</Text>
        </TouchableOpacity>

        {/* Tornei Tab */}
        <TouchableOpacity
          style={[styles.tabItem, isActive('tournaments') && styles.tabItemActive]}
          onPress={() => router.push('/(tabs)/tournaments')}
        >
          <Ionicons name="trophy-outline" size={24} color="#000" />
          <Text style={styles.tabLabel}>Tornei</Text>
        </TouchableOpacity>

        {/* PRO Tab - Always black background */}
        <TouchableOpacity
          style={[styles.tabItem, styles.tabItemPro]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="shield" size={24} color="#FFF" />
          <Text style={styles.tabLabelPro}>PRO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Use setTimeout to avoid the maximum update depth error
      setTimeout(() => {
        router.replace('/');
      }, 0);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="tournaments" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: '#F0F0F0',
  },
  tabItemPro: {
    backgroundColor: '#000',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginTop: 6,
  },
  tabLabelPro: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 6,
  },
});
