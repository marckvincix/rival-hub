import { Platform } from 'react-native';

// Storage helper that works on both web and mobile
class StorageHelper {
  private memoryStorage: Record<string, string> = {};

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } else {
        // For mobile, try AsyncStorage
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.log('Storage getItem fallback to memory:', error);
    }
    return this.memoryStorage[key] || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
          return;
        }
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch (error) {
      console.log('Storage setItem fallback to memory:', error);
    }
    this.memoryStorage[key] = value;
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          return;
        }
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch (error) {
      console.log('Storage removeItem fallback to memory:', error);
    }
    delete this.memoryStorage[key];
  }
}

export const storage = new StorageHelper();
