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

export default function SettingsScreen() {
  const router = useRouter();
  const { user, userType, logout } = useAuthStore();
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    incidentAlerts: true,
    easAlerts: true,
    highPriorityOnly: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await notificationService.getSettings();
    setNotifSettings(settings);
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notifSettings, [key]: value };
    setNotifSettings(newSettings);
    await notificationService.saveSettings({ [key]: value });
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
              onValueChange={(value) => updateSetting('enabled', value)}
              trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
              thumbColor={Colors.dark.text}
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
              onValueChange={(value) => updateSetting('soundEnabled', value)}
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
              onValueChange={(value) => updateSetting('incidentAlerts', value)}
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
              onValueChange={(value) => updateSetting('easAlerts', value)}
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
              onValueChange={(value) => updateSetting('highPriorityOnly', value)}
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

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="moon-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.settingText}>Theme</Text>
            <Text style={styles.settingValue}>Dark</Text>
          </TouchableOpacity>
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
});
