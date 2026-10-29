import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from './config';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Hook to manage Expo Push Tokens and notification registration.
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Push notifications are optional and unsupported in the web client.
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync()
        .then(token => {
          if (!isMounted) return;
          setExpoPushToken(token);
          if (token) syncTokenWithBackend(token).catch(() => {});
        })
        .catch(error => {
          // Never let notification setup block app launch.
          console.warn('Push notification setup skipped:', error);
        });
    }

    if (Platform.OS !== 'web') {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Received notification:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Tapped notification:', response);
      });
    }

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken };
}

async function syncTokenWithBackend(token: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  try {
    await fetch(`${APP_CONFIG.apiEndpoint}/user/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ token, platform: 'expo' })
    });
  } catch (error) {
    console.error('Failed to sync push token', error);
  }
}

async function registerForPushNotificationsAsync() {
  let token;
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
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
       projectId: Constants.expoConfig?.extra?.eas?.projectId || undefined
    })).data;
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}
