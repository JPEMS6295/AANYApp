import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident, EASAlert } from '../store/incidentStore';
import { Audio } from 'expo-av';

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
  customSounds: boolean;
  vibrationEnabled: boolean;
  geofenceAlerts: boolean;
}

export interface SoundSettings {
  fire: string;
  ems: string;
  police: string;
  eas: string;
  geofence: string;
  default: string;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  incidentAlerts: true,
  easAlerts: true,
  highPriorityOnly: false,
  customSounds: true,
  vibrationEnabled: true,
  geofenceAlerts: true,
};

const defaultSoundSettings: SoundSettings = {
  fire: 'fire_alert',
  ems: 'ems_alert',
  police: 'police_alert',
  eas: 'eas_alert',
  geofence: 'proximity_alert',
  default: 'default',
};

// Sound objects for custom playback
let soundObjects: { [key: string]: Audio.Sound | null } = {};

export const notificationService = {
  settings: { ...defaultSettings },
  soundSettings: { ...defaultSoundSettings },

  async initialize(): Promise<boolean> {
    try {
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem('notification_settings');
      if (savedSettings) {
        this.settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
      }

      const savedSoundSettings = await AsyncStorage.getItem('sound_settings');
      if (savedSoundSettings) {
        this.soundSettings = { ...defaultSoundSettings, ...JSON.parse(savedSoundSettings) };
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

      // Configure Android channels with custom sounds
      if (Platform.OS === 'android') {
        // Fire incidents channel
        await Notifications.setNotificationChannelAsync('fire_incidents', {
          name: 'Fire Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#ef4444',
          sound: 'fire_alert.wav',
          enableVibrate: true,
          enableLights: true,
        });

        // EMS incidents channel
        await Notifications.setNotificationChannelAsync('ems_incidents', {
          name: 'EMS Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 300, 150, 300],
          lightColor: '#22c55e',
          sound: 'ems_alert.wav',
          enableVibrate: true,
          enableLights: true,
        });

        // Police incidents channel
        await Notifications.setNotificationChannelAsync('police_incidents', {
          name: 'Police Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 100, 200, 100, 200],
          lightColor: '#3b82f6',
          sound: 'police_alert.wav',
          enableVibrate: true,
          enableLights: true,
        });

        // EAS alerts channel (highest priority)
        await Notifications.setNotificationChannelAsync('eas_alerts', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 1000, 500, 1000],
          lightColor: '#f59e0b',
          sound: 'eas_alert.wav',
          enableVibrate: true,
          enableLights: true,
          bypassDnd: true,
        });

        // Geofence/Proximity alerts channel
        await Notifications.setNotificationChannelAsync('proximity_alerts', {
          name: 'Nearby Incident Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 125, 250],
          lightColor: '#8b5cf6',
          sound: 'proximity_alert.wav',
          enableVibrate: true,
          enableLights: true,
        });

        // General incidents channel
        await Notifications.setNotificationChannelAsync('incidents', {
          name: 'General Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6b7280',
          sound: 'default',
          enableVibrate: true,
        });
      }

      // Set up audio for iOS custom sounds
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      console.log('Notifications initialized with custom sounds');
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

  async saveSoundSettings(settings: Partial<SoundSettings>): Promise<void> {
    this.soundSettings = { ...this.soundSettings, ...settings };
    await AsyncStorage.setItem('sound_settings', JSON.stringify(this.soundSettings));
  },

  async playCustomSound(type: string): Promise<void> {
    if (!this.settings.soundEnabled || !this.settings.customSounds) return;

    try {
      // Unload previous sound if exists
      if (soundObjects[type]) {
        await soundObjects[type]?.unloadAsync();
      }

      // Play appropriate sound based on type
      // Note: In production, you would load actual sound files
      // For now, we'll use the system default with haptic feedback
      if (Platform.OS === 'ios') {
        // iOS will use the notification sound configured in the notification
        console.log(`Playing ${type} alert sound`);
      }
    } catch (error) {
      console.error('Error playing custom sound:', error);
    }
  },

  getChannelForType(type: string): string {
    switch (type?.toLowerCase()) {
      case 'fire':
        return 'fire_incidents';
      case 'ems':
        return 'ems_incidents';
      case 'police':
        return 'police_incidents';
      default:
        return 'incidents';
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
    const channel = this.getChannelForType(incident.type);

    // Play custom sound
    await this.playCustomSound(incident.type?.toLowerCase() || 'default');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeEmoji} NEW ${incident.type.toUpperCase()}${priorityLabel}`,
        body: incident.title,
        subtitle: incident.location_text || undefined,
        data: { type: 'incident', id: incident._id, incidentType: incident.type },
        sound: this.settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        vibrate: this.settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: null,
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

    // Play EAS alert sound
    await this.playCustomSound('eas');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${levelEmoji} EAS ALERT: ${alert.level?.toUpperCase() || 'ALERT'}`,
        body: alert.title,
        subtitle: alert.area || undefined,
        data: { type: 'eas', id: alert.id },
        sound: this.settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: this.settings.vibrationEnabled ? [0, 1000, 500, 1000] : undefined,
      },
      trigger: null,
    });
  },

  async notifyNearbyIncident(incident: { id: string; title: string; type: string; lat: number; lng: number }, distance: number): Promise<void> {
    if (!this.settings.enabled || !this.settings.geofenceAlerts) {
      return;
    }

    const typeEmoji = getTypeEmoji(incident.type);
    const distanceStr = formatDistance(distance);

    // Play proximity alert sound
    await this.playCustomSound('geofence');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeEmoji} Incident Nearby - ${distanceStr}`,
        body: incident.title,
        subtitle: `${incident.type.toUpperCase()} incident detected near your location`,
        data: { type: 'incident', id: incident.id, proximity: true },
        sound: this.settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        vibrate: this.settings.vibrationEnabled ? [0, 250, 125, 250] : undefined,
      },
      trigger: null,
    });
  },

  async notifyGeofenceEntry(incident: { id: string; title: string; type: string }): Promise<void> {
    if (!this.settings.enabled || !this.settings.geofenceAlerts) {
      return;
    }

    const typeEmoji = getTypeEmoji(incident.type);

    await this.playCustomSound('geofence');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeEmoji} Entering Incident Area`,
        body: incident.title,
        subtitle: `You are entering a ${incident.type.toUpperCase()} incident zone`,
        data: { type: 'incident', id: incident.id, geofence: 'entry' },
        sound: this.settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        vibrate: this.settings.vibrationEnabled ? [0, 500, 250, 500] : undefined,
      },
      trigger: null,
    });
  },

  async notifyGeofenceExit(incident: { id: string; title: string; type: string }): Promise<void> {
    if (!this.settings.enabled || !this.settings.geofenceAlerts) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `✓ Left Incident Area`,
        body: `You have left the ${incident.type} incident zone`,
        data: { type: 'incident', id: incident.id, geofence: 'exit' },
        sound: this.settings.soundEnabled ? 'default' : undefined,
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

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export default notificationService;
