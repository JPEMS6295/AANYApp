import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/constants/theme';
import notificationService, { NotificationSettings } from '../../src/services/notificationService';
import geofenceService, { GeofenceSettings } from '../../src/services/geofenceService';
import ttsService, { TTSSettings } from '../../src/services/ttsService';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, userType, logout } = useAuthStore();
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    incidentAlerts: true,
    easAlerts: true,
    highPriorityOnly: false,
    customSounds: true,
    vibrationEnabled: true,
    geofenceAlerts: true,
  });
  const [geoSettings, setGeoSettings] = useState<GeofenceSettings>({
    enabled: false,
    radiusMiles: 5,
    alertOnEntry: true,
    alertOnExit: false,
    highPriorityOnly: false,
    incidentTypes: ['fire', 'ems', 'police', 'hazmat'],
  });
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    enabled: true,
    rate: 0.95,
    pitch: 0.85,
    volume: 1.0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const notif = await notificationService.getSettings();
    setNotifSettings(notif);
    const geo = await geofenceService.getSettings();
    setGeoSettings(geo);
    const tts = await ttsService.getSettings();
    setTtsSettings(tts);
  };

  const updateNotifSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notifSettings, [key]: value };
    setNotifSettings(newSettings);
    await notificationService.saveSettings({ [key]: value });
  };

  const updateGeoSetting = async (key: keyof GeofenceSettings, value: any) => {
    const newSettings = { ...geoSettings, [key]: value };
    setGeoSettings(newSettings);
    await geofenceService.saveSettings({ [key]: value });
  };

  const updateTtsSetting = async (key: keyof TTSSettings, value: any) => {
    const newSettings = { ...ttsSettings, [key]: value };
    setTtsSettings(newSettings);
    await ttsService.saveSettings({ [key]: value });
  };

  const testTTS = async () => {
    await ttsService.speak('Ten Seventy Five, Working Fire. At 123 Main Street, Manhattan');
  };

  const handleEnableGeofencing = async (value: boolean) => {
    if (value) {
      // Initialize geofencing
      const success = await geofenceService.initialize();
      if (!success) {
        Alert.alert(
          'Permission Required',
          'Location access is required for nearby incident alerts. Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    updateGeoSetting('enabled', value);
  };

  const toggleIncidentType = (type: string) => {
    const current = geoSettings.incidentTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateGeoSetting('incidentTypes', updated);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await geofenceService.stopGeofencing();
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleClearNotifications = async () => {
    await notificationService.clearAllNotifications();
    Alert.alert('Cleared', 'All notifications have been cleared');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons
              name={userType === 'admin' ? 'shield' : 'eye'}
              size={28}
              color={Colors.dark.accent}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.user || 'User'}</Text>
            <View style={styles.userRoleBadge}>
              <Text style={styles.userRole}>
                {userType === 'admin' ? 'Dispatcher' : 'Viewer'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications" size={20} color={Colors.dark.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive alerts for new incidents</Text>
            </View>
            <Switch
              value={notifSettings.enabled}
              onValueChange={(value) => updateNotifSetting('enabled', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="musical-notes" size={20} color={Colors.dark.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Custom Alert Sounds</Text>
              <Text style={styles.settingDescription}>Different sounds per incident type</Text>
            </View>
            <Switch
              value={notifSettings.customSounds}
              onValueChange={(value) => updateNotifSetting('customSounds', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
              disabled={!notifSettings.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="volume-high" size={20} color={Colors.dark.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Sound</Text>
              <Text style={styles.settingDescription}>Play sound with notifications</Text>
            </View>
            <Switch
              value={notifSettings.soundEnabled}
              onValueChange={(value) => updateNotifSetting('soundEnabled', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
              disabled={!notifSettings.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="phone-portrait" size={20} color={Colors.dark.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate for alerts</Text>
            </View>
            <Switch
              value={notifSettings.vibrationEnabled}
              onValueChange={(value) => updateNotifSetting('vibrationEnabled', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
              disabled={!notifSettings.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="flame" size={20} color={Colors.dark.fire} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Incident Alerts</Text>
              <Text style={styles.settingDescription}>Fire, EMS, Police incidents</Text>
            </View>
            <Switch
              value={notifSettings.incidentAlerts}
              onValueChange={(value) => updateNotifSetting('incidentAlerts', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
              disabled={!notifSettings.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="warning" size={20} color={Colors.dark.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>EAS Alerts</Text>
              <Text style={styles.settingDescription}>Emergency Alert System</Text>
            </View>
            <Switch
              value={notifSettings.easAlerts}
              onValueChange={(value) => updateNotifSetting('easAlerts', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
              disabled={!notifSettings.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="alert-circle" size={20} color={Colors.dark.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>High Priority Only</Text>
              <Text style={styles.settingDescription}>Only critical/high priority alerts</Text>
            </View>
            <Switch
              value={notifSettings.highPriorityOnly}
              onValueChange={(value) => updateNotifSetting('highPriorityOnly', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
              disabled={!notifSettings.enabled}
            />
          </View>

          <TouchableOpacity style={styles.settingButton} onPress={handleClearNotifications}>
            <View style={styles.settingIcon}>
              <Ionicons name="trash-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.settingText}>Clear All Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Voice Alerts (TTS) Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Alerts (TTS)</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="mic" size={20} color={Colors.dark.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Voice Announcements</Text>
              <Text style={styles.settingDescription}>Read incident type & location aloud</Text>
            </View>
            <Switch
              value={ttsSettings.enabled}
              onValueChange={(value) => updateTtsSetting('enabled', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
            />
          </View>

          {ttsSettings.enabled && (
            <>
              <View style={styles.ttsInfoBox}>
                <Ionicons name="information-circle" size={18} color={Colors.dark.accent} />
                <Text style={styles.ttsInfoText}>
                  Voice alerts trigger for: 10-75, 10-76, 10-77, 10-60 through 10-66, ALL HANDS, and 2nd-8th Alarms
                </Text>
              </View>

              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Speech Rate</Text>
                  <Text style={styles.sliderValue}>{ttsSettings.rate.toFixed(2)}x</Text>
                </View>
                <View style={styles.sliderButtons}>
                  {[0.75, 0.85, 0.95, 1.0, 1.15].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.radiusButton,
                        ttsSettings.rate === rate && styles.radiusButtonActive,
                      ]}
                      onPress={() => updateTtsSetting('rate', rate)}
                    >
                      <Text
                        style={[
                          styles.radiusButtonText,
                          ttsSettings.rate === rate && styles.radiusButtonTextActive,
                        ]}
                      >
                        {rate}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.testTtsButton} onPress={testTTS}>
                <Ionicons name="play-circle" size={22} color={Colors.dark.text} />
                <Text style={styles.testTtsButtonText}>Test Voice Alert</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Geofencing / Location Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location-Based Alerts</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="location" size={20} color={Colors.dark.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Nearby Incident Alerts</Text>
              <Text style={styles.settingDescription}>Get alerts for incidents near you</Text>
            </View>
            <Switch
              value={geoSettings.enabled}
              onValueChange={handleEnableGeofencing}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
            />
          </View>

          {geoSettings.enabled && (
            <>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Alert Radius</Text>
                  <Text style={styles.sliderValue}>{geoSettings.radiusMiles} miles</Text>
                </View>
                <View style={styles.sliderWrapper}>
                  <Ionicons name="locate-outline" size={16} color={Colors.dark.textMuted} />
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { width: `${(geoSettings.radiusMiles / 25) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Ionicons name="globe-outline" size={16} color={Colors.dark.textMuted} />
                </View>
                <View style={styles.sliderButtons}>
                  {[1, 5, 10, 15, 25].map((miles) => (
                    <TouchableOpacity
                      key={miles}
                      style={[
                        styles.radiusButton,
                        geoSettings.radiusMiles === miles && styles.radiusButtonActive,
                      ]}
                      onPress={() => updateGeoSetting('radiusMiles', miles)}
                    >
                      <Text
                        style={[
                          styles.radiusButtonText,
                          geoSettings.radiusMiles === miles && styles.radiusButtonTextActive,
                        ]}
                      >
                        {miles}mi
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="enter-outline" size={20} color={Colors.dark.textSecondary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>Alert on Entry</Text>
                  <Text style={styles.settingDescription}>When entering incident area</Text>
                </View>
                <Switch
                  value={geoSettings.alertOnEntry}
                  onValueChange={(value) => updateGeoSetting('alertOnEntry', value)}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
                  thumbColor={Colors.dark.text}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="exit-outline" size={20} color={Colors.dark.textSecondary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>Alert on Exit</Text>
                  <Text style={styles.settingDescription}>When leaving incident area</Text>
                </View>
                <Switch
                  value={geoSettings.alertOnExit}
                  onValueChange={(value) => updateGeoSetting('alertOnExit', value)}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
                  thumbColor={Colors.dark.text}
                />
              </View>

              <View style={styles.typeSelector}>
                <Text style={styles.typeSelectorLabel}>Monitor Incident Types</Text>
                <View style={styles.typeButtons}>
                  {['fire', 'ems', 'police', 'hazmat', 'traffic', 'rescue'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        geoSettings.incidentTypes.includes(type) && styles.typeButtonActive,
                      ]}
                      onPress={() => toggleIncidentType(type)}
                    >
                      <Ionicons
                        name={getTypeIcon(type)}
                        size={16}
                        color={geoSettings.incidentTypes.includes(type) ? Colors.dark.text : Colors.dark.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          geoSettings.incidentTypes.includes(type) && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="moon-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.settingText}>Theme</Text>
            <Text style={styles.settingValue}>Dark</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.settingText}>Version</Text>
            <Text style={styles.settingValue}>4.0.0</Text>
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="document-text-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.settingText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.settingText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.dark.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Alerion Alert © 2025</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTypeIcon(type: string): any {
  switch (type) {
    case 'fire': return 'flame';
    case 'ems': return 'medkit';
    case 'police': return 'shield';
    case 'hazmat': return 'warning';
    case 'traffic': return 'car';
    case 'rescue': return 'hand-left';
    default: return 'alert-circle';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  userRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.accent,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  settingIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark.text,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  sliderContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.accent,
  },
  sliderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.dark.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 3,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  radiusButtonActive: {
    backgroundColor: Colors.dark.accent + '20',
    borderColor: Colors.dark.accent,
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  radiusButtonTextActive: {
    color: Colors.dark.accent,
  },
  typeSelector: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typeSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: Colors.dark.accent + '20',
    borderColor: Colors.dark.accent,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.dark.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.error + '15',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.error,
  },
  footerText: {
    textAlign: 'center',
    color: Colors.dark.textMuted,
    fontSize: 12,
    marginTop: 32,
  },
  ttsInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dark.accent + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.accent + '30',
  },
  ttsInfoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  testTtsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  testTtsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
});
