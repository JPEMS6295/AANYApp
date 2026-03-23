import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import notificationService from '../src/services/notificationService';
import geofenceService from '../src/services/geofenceService';

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    
    // Initialize notifications
    notificationService.initialize();
    
    // Initialize geofencing (will only start if enabled in settings)
    geofenceService.initialize();

    // Handle notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      if (data?.type === 'incident' && data?.id) {
        router.push(`/incident/${data.id}`);
      } else if (data?.type === 'eas' && data?.id) {
        router.push(`/eas/${data.id}`);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="incident/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="eas/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
