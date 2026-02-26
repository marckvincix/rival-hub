import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 16 }]}>
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

      {/* PRO Tab */}
      <TouchableOpacity
        style={[styles.tabItem, isActive('profile') && styles.tabItemActive]}
        onPress={() => router.push('/(tabs)/profile')}
      >
        <Ionicons name="shield" size={24} color="#000" />
        <Text style={styles.tabLabel}>PRO</Text>
      </TouchableOpacity>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: '#F0F0F0',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
});
