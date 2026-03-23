import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident } from '../store/incidentStore';
import notificationService from './notificationService';

const GEOFENCE_SETTINGS_KEY = 'geofence_settings';
const MONITORED_INCIDENTS_KEY = 'monitored_incidents';

export interface GeofenceSettings {
  enabled: boolean;
  radiusMiles: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  highPriorityOnly: boolean;
  incidentTypes: string[];
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

let locationSubscription: Location.LocationSubscription | null = null;
let lastCheckedIncidents: Map<string, number> = new Map();

export const geofenceService = {
  settings: { ...defaultSettings },
  userLocation: null as Location.LocationObjectCoords | null,

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

      // Get current location
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        this.userLocation = location.coords;
      } catch (e) {
        console.log('Could not get initial location');
      }

      if (this.settings.enabled) {
        await this.startLocationMonitoring();
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
      await this.startLocationMonitoring();
    } else {
      await this.stopLocationMonitoring();
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
      this.userLocation = location.coords;
      return location.coords;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  },

  async startLocationMonitoring(): Promise<void> {
    try {
      // Stop existing subscription
      await this.stopLocationMonitoring();

      // Start watching location (foreground only in Expo Go)
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 100, // Update every 100 meters
          timeInterval: 30000, // Or every 30 seconds
        },
        (location) => {
          this.userLocation = location.coords;
          this.checkProximityToIncidents(location.coords);
        }
      );
      
      console.log('Location monitoring started');
    } catch (error) {
      console.error('Error starting location monitoring:', error);
    }
  },

  async stopLocationMonitoring(): Promise<void> {
    try {
      if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
      }
      console.log('Location monitoring stopped');
    } catch (error) {
      console.error('Error stopping location monitoring:', error);
    }
  },

  // Alias for backward compatibility
  async stopGeofencing(): Promise<void> {
    await this.stopLocationMonitoring();
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

      // Store incident details for proximity checking
      const monitoredIncidents: MonitoredIncident[] = filteredIncidents.slice(0, 20).map(i => ({
        id: i._id,
        title: i.title,
        type: i.type,
        lat: i.lat,
        lng: i.lng,
        radius: radiusMeters,
      }));
      await this.saveMonitoredIncidents(monitoredIncidents);

      console.log(`Monitoring ${monitoredIncidents.length} incidents for proximity`);
    } catch (error) {
      console.error('Error updating monitored incidents:', error);
    }
  },

  async checkProximityToIncidents(coords: Location.LocationObjectCoords): Promise<void> {
    if (!this.settings.enabled) return;

    const monitoredIncidents = await this.getMonitoredIncidents();
    const radiusMeters = this.settings.radiusMiles * 1609.34;
    const now = Date.now();
    const COOLDOWN_MS = 30 * 60 * 1000; // 30 minute cooldown

    for (const incident of monitoredIncidents) {
      const distance = this.calculateDistance(
        coords.latitude,
        coords.longitude,
        incident.lat,
        incident.lng
      );

      if (distance <= radiusMeters) {
        // Check cooldown
        const lastNotified = lastCheckedIncidents.get(incident.id) || 0;
        
        if (now - lastNotified > COOLDOWN_MS) {
          await notificationService.notifyNearbyIncident(incident, distance);
          lastCheckedIncidents.set(incident.id, now);
        }
      }
    }
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
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
