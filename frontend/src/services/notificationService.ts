import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident, EASAlert } from '../store/incidentStore';
import { getIncidentIcon } from '../constants/icons';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const SOUND_ENABLED_KEY = 'sound_enabled';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  incidentAlerts: boolean;
  easAlerts: boolean;
  highPriorityOnly: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  incidentAlerts: true,
  easAlerts: true,
  highPriorityOnly: false,
};

export const notificationService = {
  settings: { ...defaultSettings },

  async initialize(): Promise<boolean> {
    try {
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem('notification_settings');
      if (savedSettings) {
        this.settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
      }

      // Request permissions
      if (!Device.isDevice) {
        console.log('Notifications require a physical device');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('incidents', {
          name: 'Incident Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#ef4444',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('eas', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#f59e0b',
          sound: 'default',
        });
      }

      console.log('Notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  },

  async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
  },

  async getSettings(): Promise<NotificationSettings> {
    try {
      const saved = await AsyncStorage.getItem('notification_settings');
      if (saved) {
        this.settings = { ...defaultSettings, ...JSON.parse(saved) };
      }
      return this.settings;
    } catch {
      return defaultSettings;
    }
  },

  async notifyNewIncident(incident: Incident): Promise<void> {
    if (!this.settings.enabled || !this.settings.incidentAlerts) {
      return;
    }

    // Check priority filter
    if (this.settings.highPriorityOnly) {
      const priority = incident.priority?.toLowerCase();
      if (priority !== 'high' && priority !== 'critical') {
        return;
      }
    }

    const typeEmoji = getTypeEmoji(incident.type);
    const priorityLabel = incident.priority ? ` [${incident.priority.toUpperCase()}]` : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeEmoji} NEW ${incident.type.toUpperCase()}${priorityLabel}`,
        body: incident.title,
        subtitle: incident.location_text || undefined,
        data: { type: 'incident', id: incident._id },
        sound: this.settings.soundEnabled ? 'default' : undefined,
        badge: 1,
      },
      trigger: null, // Show immediately
    });
  },

  async notifyIncidentUpdate(incident: Incident): Promise<void> {
    if (!this.settings.enabled || !this.settings.incidentAlerts) {
      return;
    }

    const typeEmoji = getTypeEmoji(incident.type);
    const latestUpdate = incident.updates?.[0];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeEmoji} ${incident.type.toUpperCase()} Updated`,
        body: latestUpdate?.text || incident.title,
        subtitle: incident.location_text || undefined,
        data: { type: 'incident', id: incident._id },
        sound: this.settings.soundEnabled ? 'default' : undefined,
      },
      trigger: null,
    });
  },

  async notifyNewEAS(alert: EASAlert): Promise<void> {
    if (!this.settings.enabled || !this.settings.easAlerts) {
      return;
    }

    const levelEmoji = getLevelEmoji(alert.level);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${levelEmoji} EAS ALERT: ${alert.level?.toUpperCase() || 'ALERT'}`,
        body: alert.title,
        subtitle: alert.area || undefined,
        data: { type: 'eas', id: alert.id },
        sound: this.settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  },

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  },

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await this.clearBadge();
  },
};

function getTypeEmoji(type: string): string {
  switch (type?.toLowerCase()) {
    case 'fire':
      return '🔥';
    case 'ems':
      return '🚑';
    case 'police':
      return '🚔';
    case 'traffic':
      return '🚗';
    case 'hazmat':
      return '☢️';
    case 'rescue':
      return '🆘';
    default:
      return '⚠️';
  }
}

function getLevelEmoji(level: string): string {
  switch (level?.toLowerCase()) {
    case 'extreme':
      return '🚨';
    case 'severe':
      return '⚠️';
    case 'moderate':
      return '📢';
    case 'minor':
      return 'ℹ️';
    default:
      return '📣';
  }
}

export default notificationService;
