import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident } from '../store/incidentStore';
import notificationService from './notificationService';

const GEOFENCE_TASK_NAME = 'ALERION_GEOFENCE_TASK';
const LOCATION_TASK_NAME = 'ALERION_LOCATION_TASK';
const GEOFENCE_SETTINGS_KEY = 'geofence_settings';
const MONITORED_INCIDENTS_KEY = 'monitored_incidents';

export interface GeofenceSettings {
  enabled: boolean;
  radiusMiles: number; // Default radius in miles
  alertOnEntry: boolean;
  alertOnExit: boolean;
  highPriorityOnly: boolean;
  incidentTypes: string[]; // Which incident types to monitor
}

const defaultSettings: GeofenceSettings = {
  enabled: false,
  radiusMiles: 5,
  alertOnEntry: true,
  alertOnExit: false,
  highPriorityOnly: false,
  incidentTypes: ['fire', 'ems', 'police', 'hazmat'],
};

interface MonitoredIncident {
  id: string;
  title: string;
  type: string;
  lat: number;
  lng: number;
  radius: number;
}

// Define the geofence task
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }

  if (data) {
    const { eventType, region } = data;
    const settings = await geofenceService.getSettings();
    
    // Get incident details from stored data
    const monitoredIncidents = await geofenceService.getMonitoredIncidents();
    const incident = monitoredIncidents.find(i => i.id === region.identifier);
    
    if (!incident) return;

    if (eventType === Location.GeofencingEventType.Enter && settings.alertOnEntry) {
      await notificationService.notifyGeofenceEntry(incident);
    } else if (eventType === Location.GeofencingEventType.Exit && settings.alertOnExit) {
      await notificationService.notifyGeofenceExit(incident);
    }
  }
});

// Define background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      await geofenceService.checkProximityToIncidents(location.coords);
    }
  }
});

export const geofenceService = {
  settings: { ...defaultSettings },
  userLocation: null as Location.LocationObject | null,

  async initialize(): Promise<boolean> {
    try {
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem(GEOFENCE_SETTINGS_KEY);
      if (savedSettings) {
        this.settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
      }

      // Request location permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission not granted');
        return false;
      }

      // Request background location permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission not granted');
        // Can still work with foreground-only
      }

      // Get current location
      this.userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (this.settings.enabled) {
        await this.startGeofencing();
      }

      console.log('Geofence service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing geofence service:', error);
      return false;
    }
  },

  async saveSettings(settings: Partial<GeofenceSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await AsyncStorage.setItem(GEOFENCE_SETTINGS_KEY, JSON.stringify(this.settings));

    if (this.settings.enabled) {
      await this.startGeofencing();
    } else {
      await this.stopGeofencing();
    }
  },

  async getSettings(): Promise<GeofenceSettings> {
    try {
      const saved = await AsyncStorage.getItem(GEOFENCE_SETTINGS_KEY);
      if (saved) {
        this.settings = { ...defaultSettings, ...JSON.parse(saved) };
      }
      return this.settings;
    } catch {
      return defaultSettings;
    }
  },

  async getCurrentLocation(): Promise<Location.LocationObjectCoords | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      this.userLocation = location;
      return location.coords;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  },

  async startGeofencing(): Promise<void> {
    try {
      // Start background location updates
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 100, // Update every 100 meters
          deferredUpdatesInterval: 60000, // Or every minute
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Alerion Alert',
            notificationBody: 'Monitoring nearby incidents',
            notificationColor: '#3b82f6',
          },
        });
      }
      console.log('Geofencing started');
    } catch (error) {
      console.error('Error starting geofencing:', error);
    }
  },

  async stopGeofencing(): Promise<void> {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Stop all geofences
      const hasGeofencing = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
      if (hasGeofencing) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      }

      console.log('Geofencing stopped');
    } catch (error) {
      console.error('Error stopping geofencing:', error);
    }
  },

  async updateGeofencesForIncidents(incidents: Incident[]): Promise<void> {
    if (!this.settings.enabled) return;

    try {
      // Filter incidents based on settings
      let filteredIncidents = incidents.filter(i => 
        i.lat && i.lng && 
        this.settings.incidentTypes.includes(i.type?.toLowerCase())
      );

      if (this.settings.highPriorityOnly) {
        filteredIncidents = filteredIncidents.filter(i => 
          ['high', 'critical'].includes(i.priority?.toLowerCase())
        );
      }

      // Convert radius from miles to meters
      const radiusMeters = this.settings.radiusMiles * 1609.34;

      // Create geofence regions
      const regions: Location.LocationRegion[] = filteredIncidents.slice(0, 20).map(incident => ({
        identifier: incident._id,
        latitude: incident.lat,
        longitude: incident.lng,
        radius: radiusMeters,
        notifyOnEnter: this.settings.alertOnEntry,
        notifyOnExit: this.settings.alertOnExit,
      }));

      // Store incident details for later use in notifications
      const monitoredIncidents: MonitoredIncident[] = filteredIncidents.slice(0, 20).map(i => ({
        id: i._id,
        title: i.title,
        type: i.type,
        lat: i.lat,
        lng: i.lng,
        radius: radiusMeters,
      }));
      await this.saveMonitoredIncidents(monitoredIncidents);

      // Start geofencing with new regions
      if (regions.length > 0) {
        const hasGeofencing = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
        if (hasGeofencing) {
          await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        }
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
        console.log(`Monitoring ${regions.length} incident geofences`);
      }
    } catch (error) {
      console.error('Error updating geofences:', error);
    }
  },

  async checkProximityToIncidents(coords: Location.LocationObjectCoords): Promise<void> {
    if (!this.settings.enabled) return;

    const monitoredIncidents = await this.getMonitoredIncidents();
    const radiusMeters = this.settings.radiusMiles * 1609.34;

    for (const incident of monitoredIncidents) {
      const distance = this.calculateDistance(
        coords.latitude,
        coords.longitude,
        incident.lat,
        incident.lng
      );

      if (distance <= radiusMeters) {
        // Check if we've already notified about this incident recently
        const notifiedKey = `notified_${incident.id}`;
        const lastNotified = await AsyncStorage.getItem(notifiedKey);
        const now = Date.now();

        if (!lastNotified || now - parseInt(lastNotified) > 30 * 60 * 1000) { // 30 min cooldown
          await notificationService.notifyNearbyIncident(incident, distance);
          await AsyncStorage.setItem(notifiedKey, now.toString());
        }
      }
    }
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  async saveMonitoredIncidents(incidents: MonitoredIncident[]): Promise<void> {
    await AsyncStorage.setItem(MONITORED_INCIDENTS_KEY, JSON.stringify(incidents));
  },

  async getMonitoredIncidents(): Promise<MonitoredIncident[]> {
    try {
      const saved = await AsyncStorage.getItem(MONITORED_INCIDENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  getDistanceString(meters: number): string {
    const miles = meters / 1609.34;
    if (miles < 0.1) {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  },
};

export default geofenceService;
