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
    if (route === '/') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    if (route === '/tournaments') return pathname.includes('tournaments');
    if (route === '/profile') return pathname.includes('profile');
    return false;
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 16 }]}>
      {/* Dashboard Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push('/(tabs)/')}
      >
        <View style={styles.tabIconContainer}>
          <Ionicons name="grid" size={24} color="#000" />
        </View>
        <Text style={styles.tabLabel}>Dashboard</Text>
      </TouchableOpacity>

      {/* Tornei Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push('/(tabs)/tournaments')}
      >
        <View style={styles.tabIconContainer}>
          <Ionicons name="trophy-outline" size={24} color="#000" />
        </View>
        <Text style={styles.tabLabel}>Tornei</Text>
      </TouchableOpacity>

      {/* PRO Tab */}
      <TouchableOpacity
        style={styles.proTabItem}
        onPress={() => router.push('/(tabs)/profile')}
      >
        <Ionicons name="shield" size={24} color="#FFF" />
        <Text style={styles.proTabLabel}>PRO</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated) {
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
  },
  tabIconContainer: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  proTabItem: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proTabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
