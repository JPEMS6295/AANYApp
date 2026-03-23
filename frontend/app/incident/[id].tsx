import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIncidentStore, Incident } from '../../src/store/incidentStore';
import { apiClient, getMediaUrl } from '../../src/api/client';
import { Colors, getIncidentColor } from '../../src/constants/theme';
import { getIncidentIcon } from '../../src/constants/icons';
import { format } from 'date-fns';

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { incidents } = useIncidentStore();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // First check local store
    const found = incidents.find((i) => i._id === id);
    if (found) {
      setIncident(found);
      setIsLoading(false);
    } else {
      // Fetch from API if not in store
      fetchIncident();
    }
  }, [id, incidents]);

  const fetchIncident = async () => {
    try {
      const response = await apiClient.get('/api/incidents');
      const found = response.data.find((i: Incident) => i._id === id);
      if (found) {
        setIncident(found);
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.dark.textMuted} />
          <Text style={styles.errorText}>Incident not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const color = getIncidentColor(incident.type);
  const icon = getIncidentIcon(incident.type);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type & Status */}
        <View style={styles.topSection}>
          <View style={[styles.typeIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.badgeText, { color }]}>
                {incident.type.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getPriorityColor(incident.priority) + '20' }]}>
              <Text style={[styles.badgeText, { color: getPriorityColor(incident.priority) }]}>
                {incident.priority?.toUpperCase() || 'NORMAL'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(incident.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(incident.status) }]}>
                {incident.status?.toUpperCase() || 'OPEN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{incident.title}</Text>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={18} color={Colors.dark.accent} />
            <Text style={styles.cardTitle}>Location</Text>
          </View>
          <Text style={styles.locationText}>{incident.location_text || 'Unknown location'}</Text>
          {incident.lat && incident.lng && (
            <Text style={styles.coordsText}>
              {incident.lat.toFixed(6)}, {incident.lng.toFixed(6)}
            </Text>
          )}
          {incident.jurisdiction && (
            <Text style={styles.jurisdictionText}>{incident.jurisdiction}</Text>
          )}
        </View>

        {/* Notes */}
        {incident.notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={18} color={Colors.dark.accent} />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{incident.notes}</Text>
          </View>
        )}

        {/* Media */}
        {(incident.media?.length || incident.image_url || incident.audio_url || incident.video_url) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="images" size={18} color={Colors.dark.accent} />
              <Text style={styles.cardTitle}>Media</Text>
            </View>
            <View style={styles.mediaGrid}>
              {incident.image_url && (
                <View style={styles.mediaThumbnail}>
                  <Image
                    source={{ uri: getMediaUrl(incident.image_url) || '' }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                </View>
              )}
              {incident.media?.map((item, index) => (
                <View key={index} style={styles.mediaThumbnail}>
                  <Ionicons
                    name={item.kind === 'audio' ? 'musical-notes' : item.kind === 'video' ? 'videocam' : 'image'}
                    size={24}
                    color={Colors.dark.textSecondary}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Updates */}
        {incident.updates && incident.updates.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubbles" size={18} color={Colors.dark.accent} />
              <Text style={styles.cardTitle}>Updates ({incident.updates.length})</Text>
            </View>
            {incident.updates.map((update, index) => (
              <View key={update.id || index} style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateUser}>{update.user}</Text>
                  <Text style={styles.updateTime}>
                    {format(new Date(update.ts), 'MMM d, h:mm a')}
                  </Text>
                </View>
                <Text style={styles.updateText}>{update.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={18} color={Colors.dark.accent} />
            <Text style={styles.cardTitle}>Timeline</Text>
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Created</Text>
            <Text style={styles.timelineValue}>
              {format(new Date(incident.created_at), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Last Updated</Text>
            <Text style={styles.timelineValue}>
              {format(new Date(incident.updated_at), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          {incident.posted_by && (
            <View style={styles.timelineRow}>
              <Text style={styles.timelineLabel}>Posted By</Text>
              <Text style={styles.timelineValue}>{incident.posted_by}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
    case 'critical':
      return Colors.dark.error;
    case 'medium':
      return Colors.dark.warning;
    default:
      return Colors.dark.success;
  }
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'open':
    case 'active':
      return Colors.dark.success;
    case 'closed':
    case 'resolved':
      return Colors.dark.textMuted;
    default:
      return Colors.dark.accent;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginTop: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  badges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 20,
    lineHeight: 28,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  locationText: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontFamily: 'monospace',
  },
  jurisdictionText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  updateItem: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  updateUser: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.accent,
  },
  updateTime: {
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
  updateText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  timelineLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  timelineValue: {
    fontSize: 13,
    color: Colors.dark.text,
    fontWeight: '500',
  },
});
