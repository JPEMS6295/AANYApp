import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useIncidentStore, EASAlert } from '../../src/store/incidentStore';
import { getMediaUrl } from '../../src/api/client';
import { Colors, getEASColor } from '../../src/constants/theme';
import { format } from 'date-fns';

export default function EASDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { easAlerts } = useIncidentStore();
  const [alert, setAlert] = useState<EASAlert | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    const found = easAlerts.find((a) => a.id === id);
    if (found) {
      setAlert(found);
    }
  }, [id, easAlerts]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayAudio = async () => {
    if (!alert?.audio_url) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: getMediaUrl(alert.audio_url) || '' },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  if (!alert) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const color = getEASColor(alert.level);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Alert Level */}
        <View style={[styles.levelBanner, { backgroundColor: color + '20' }]}>
          <Ionicons name="warning" size={24} color={color} />
          <Text style={[styles.levelText, { color }]}>
            {alert.level?.toUpperCase() || 'ALERT'}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{alert.title}</Text>

        {/* Code */}
        {alert.code && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Alert Code</Text>
            <Text style={styles.codeValue}>{alert.code}</Text>
          </View>
        )}

        {/* Area */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={18} color={Colors.dark.accent} />
            <Text style={styles.cardTitle}>Affected Area</Text>
          </View>
          <Text style={styles.areaText}>{alert.area || 'Unknown area'}</Text>
          {alert.fips && alert.fips.length > 0 && (
            <Text style={styles.fipsText}>FIPS: {alert.fips.join(', ')}</Text>
          )}
        </View>

        {/* Audio */}
        {alert.audio_url && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="volume-high" size={18} color={Colors.dark.accent} />
              <Text style={styles.cardTitle}>Audio Broadcast</Text>
            </View>
            <TouchableOpacity style={styles.audioButton} onPress={handlePlayAudio}>
              <View style={styles.audioIconContainer}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color={Colors.dark.text}
                />
              </View>
              <Text style={styles.audioButtonText}>
                {isPlaying ? 'Pause Audio' : 'Play Audio'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EAS Text */}
        {alert.eas_text && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={18} color={Colors.dark.accent} />
              <Text style={styles.cardTitle}>Alert Message</Text>
            </View>
            <Text style={styles.easText}>{alert.eas_text}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={18} color={Colors.dark.accent} />
            <Text style={styles.cardTitle}>Timeline</Text>
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Issued</Text>
            <Text style={styles.timelineValue}>
              {formatDateTime(alert.issued)}
            </Text>
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineLabel}>Expires</Text>
            <Text style={styles.timelineValue}>
              {formatDateTime(alert.expires)}
            </Text>
          </View>
          <View style={[styles.timelineRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.timelineLabel}>Received</Text>
            <Text style={styles.timelineValue}>
              {formatDateTime(alert.received_at)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  levelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 16,
    lineHeight: 32,
  },
  codeContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  codeLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 14,
    color: Colors.dark.text,
    fontFamily: 'monospace',
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
  areaText: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  fipsText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontFamily: 'monospace',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  audioIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  easText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
