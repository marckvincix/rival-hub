import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '../utils/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Register token with backend
        registerTokenWithBackend(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      handleNotificationResponse(data, router);
    });

    return () => {
      // Use .remove() method on the subscription object (modern expo-notifications API)
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.log('Error getting push token: no EAS projectId configured');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenData.data;
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

async function registerTokenWithBackend(token: string) {
  try {
    const deviceType = Platform.OS;
    await api.post('/api/push-tokens', { token, device_type: deviceType });
    console.log('Push token registered with backend');
  } catch (error) {
    console.log('Error registering push token:', error);
  }
}

async function handleNotificationResponse(data: any, router: ReturnType<typeof useRouter>) {
  if (!data) return;

  try {
    let tournamentId: string | undefined = data.tournament_id;

    // Team/match-only payloads (goal, team_match_scheduled, team_match_ended, ...)
    // don't carry tournament_id directly: resolve it via the match first.
    if (!tournamentId && data.match_id) {
      const matchRes = await api.get(`/api/matches/${data.match_id}`);
      tournamentId = matchRes.data?.tournament_id;
    }

    if (!tournamentId) {
      console.log('Notification tap: no tournament to navigate to', data);
      return;
    }

    const tournamentRes = await api.get(`/api/tournaments/${tournamentId}`);
    const slug = tournamentRes.data?.slug;
    if (slug) {
      router.push(`/tournament/${slug}`);
    }
  } catch (error) {
    console.log('Error navigating from notification:', error);
  }
}

export async function scheduleLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Immediate
  });
}
