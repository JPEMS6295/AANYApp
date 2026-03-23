import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIncidentStore, Incident } from '../../src/store/incidentStore';
import { Colors, getIncidentColor } from '../../src/constants/theme';
import { getIncidentIcon } from '../../src/constants/icons';

export default function MapScreen() {
  const router = useRouter();
  const { incidents } = useIncidentStore();

  const handleIncidentPress = (incident: Incident) => {
    router.push(`/incident/${incident._id}`);
  };

  const incidentsWithLocation = incidents.filter(i => i.lat && i.lng);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incident Map</Text>
          <Text style={styles.headerSubtitle}>{incidentsWithLocation.length} incidents with location</Text>
        </View>
        <View style={styles.incidentCount}>
          <Ionicons name="location" size={16} color={Colors.dark.text} />
          <Text style={styles.countText}>{incidentsWithLocation.length}</Text>
        </View>
      </View>
      
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapIconContainer}>
          <Ionicons name="map" size={48} color={Colors.dark.accent} />
        </View>
        <Text style={styles.mapText}>Interactive Map</Text>
        <Text style={styles.mapSubtext}>Open in Expo Go app for full map experience</Text>
      </View>

      <Text style={styles.sectionTitle}>Incidents by Location</Text>

      <ScrollView style={styles.incidentList} contentContainerStyle={styles.listContent}>
        {incidentsWithLocation.map((incident) => {
          const color = getIncidentColor(incident.type);
          return (
            <TouchableOpacity
              key={incident._id}
              style={styles.incidentItem}
              onPress={() => handleIncidentPress(incident)}
              activeOpacity={0.7}
            >
              <View style={[styles.incidentIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={getIncidentIcon(incident.type)} size={20} color={color} />
              </View>
              <View style={styles.incidentInfo}>
                <View style={styles.incidentHeader}>
                  <Text style={[styles.incidentType, { color }]}>
                    {incident.type.toUpperCase()}
                  </Text>
                  {incident.lat && incident.lng && (
                    <Text style={styles.coordsText}>
                      {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                    </Text>
                  )}
                </View>
                <Text style={styles.incidentTitle} numberOfLines={1}>
                  {incident.title}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={Colors.dark.textSecondary} />
                  <Text style={styles.incidentLocation} numberOfLines={1}>
                    {incident.location_text || 'Unknown location'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          );
        })}
        
        {incidentsWithLocation.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color={Colors.dark.textMuted} />
            <Text style={styles.emptyText}>No incidents with location data</Text>
            <Text style={styles.emptySubtext}>Incidents will appear here when they have coordinates</Text>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  incidentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  countText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.dark.surface,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  mapIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  mapSubtext: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  incidentList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  incidentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  incidentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  incidentType: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  coordsText: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    fontFamily: 'monospace',
  },
  incidentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incidentLocation: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
