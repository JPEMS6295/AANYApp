import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIncidentStore, Incident } from '../../src/store/incidentStore';
import { Colors, getIncidentColor } from '../../src/constants/theme';
import { getIncidentIcon } from '../../src/constants/icons';
import { format } from 'date-fns';

export default function FeedScreen() {
  const router = useRouter();
  const { incidents, isLoading, fetchIncidents } = useIncidentStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIncidents();
    setRefreshing(false);
  }, []);

  const handleIncidentPress = (incident: Incident) => {
    router.push(`/incident/${incident._id}`);
  };

  const renderIncident = ({ item }: { item: Incident }) => {
    const color = getIncidentColor(item.type);
    const icon = getIncidentIcon(item.type);
    const timeAgo = formatTimeAgo(item.created_at);

    return (
      <TouchableOpacity
        style={styles.incidentCard}
        onPress={() => handleIncidentPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.incidentIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.incidentContent}>
          <View style={styles.incidentHeader}>
            <Text style={[styles.incidentType, { color }]}>{item.type.toUpperCase()}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority}
              </Text>
            </View>
          </View>
          <Text style={styles.incidentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.incidentMeta}>
            <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
            <Text style={styles.incidentLocation} numberOfLines={1}>
              {item.location_text || 'Unknown location'}
            </Text>
          </View>
          <View style={styles.incidentFooter}>
            <Text style={styles.incidentTime}>{timeAgo}</Text>
            {item.updates && item.updates.length > 0 && (
              <View style={styles.updatesBadge}>
                <Ionicons name="chatbubble-outline" size={12} color={Colors.dark.textSecondary} />
                <Text style={styles.updatesCount}>{item.updates.length}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="radio-outline" size={64} color={Colors.dark.textMuted} />
      <Text style={styles.emptyTitle}>No Active Incidents</Text>
      <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Feed</Text>
          <Text style={styles.headerSubtitle}>
            {incidents.length} active incident{incidents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {isLoading && incidents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item._id}
          renderItem={renderIncident}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.dark.accent}
            />
          }
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return format(date, 'MMM d, h:mm a');
  } catch {
    return 'Unknown';
  }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.error,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark.error,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  incidentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  incidentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  incidentContent: {
    flex: 1,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  incidentType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  incidentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  incidentLocation: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  incidentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incidentTime: {
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
  updatesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updatesCount: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
});
