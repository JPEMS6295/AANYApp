import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIncidentStore, EASAlert } from '../../src/store/incidentStore';
import { Colors, getEASColor } from '../../src/constants/theme';
import { format } from 'date-fns';

export default function EASScreen() {
  const router = useRouter();
  const { easAlerts, fetchEASAlerts } = useIncidentStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEASAlerts();
    setRefreshing(false);
  }, []);

  const handleAlertPress = (alert: EASAlert) => {
    router.push(`/eas/${alert.id}`);
  };

  const renderAlert = ({ item }: { item: EASAlert }) => {
    const color = getEASColor(item.level);
    const issuedDate = formatDate(item.issued);
    const expiresDate = formatDate(item.expires);

    return (
      <TouchableOpacity
        style={[styles.alertCard, { borderLeftColor: color }]}
        onPress={() => handleAlertPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.alertHeader}>
          <View style={[styles.levelBadge, { backgroundColor: color + '20' }]}>
            <Ionicons name="warning" size={14} color={color} />
            <Text style={[styles.levelText, { color }]}>
              {item.level?.toUpperCase() || 'ALERT'}
            </Text>
          </View>
          {item.audio_url && (
            <View style={styles.audioBadge}>
              <Ionicons name="volume-high" size={14} color={Colors.dark.accent} />
            </View>
          )}
        </View>

        <Text style={styles.alertTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.alertMeta}>
          <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.alertArea} numberOfLines={1}>
            {item.area || 'Unknown area'}
          </Text>
        </View>

        <View style={styles.alertTimes}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Issued</Text>
            <Text style={styles.timeValue}>{issuedDate}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Expires</Text>
            <Text style={styles.timeValue}>{expiresDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={64} color={Colors.dark.success} />
      <Text style={styles.emptyTitle}>No Active Alerts</Text>
      <Text style={styles.emptySubtitle}>All clear! No emergency alerts at this time.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>EAS Alerts</Text>
          <Text style={styles.headerSubtitle}>Emergency Alert System</Text>
        </View>
        {easAlerts.length > 0 && (
          <View style={styles.alertCount}>
            <Text style={styles.countText}>{easAlerts.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={easAlerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlert}
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
    </SafeAreaView>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d, h:mm a');
  } catch {
    return 'Unknown';
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
  alertCount: {
    backgroundColor: Colors.dark.warning,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  alertCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  audioBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 10,
    lineHeight: 22,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  alertArea: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  alertTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 10,
    padding: 12,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 12,
  },
  timeLabel: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 12,
    color: Colors.dark.text,
    fontWeight: '500',
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
    textAlign: 'center',
  },
});
