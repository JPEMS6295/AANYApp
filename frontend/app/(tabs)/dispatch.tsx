import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { useIncidentStore } from '../../src/store/incidentStore';
import { Colors, IncidentColors } from '../../src/constants/theme';

const INCIDENT_TYPES = ['fire', 'ems', 'police', 'traffic', 'hazmat', 'rescue', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function DispatchScreen() {
  const { fetchIncidents } = useIncidentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'fire',
    priority: 'medium',
    location_text: '',
    lat: '',
    lng: '',
    jurisdiction: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an incident title');
      return;
    }
    if (!formData.location_text.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
      };

      await apiClient.post('/api/admin/incidents', payload);

      Alert.alert('Success', 'Incident created successfully', [
        {
          text: 'OK',
          onPress: () => {
            setFormData({
              title: '',
              type: 'fire',
              priority: 'medium',
              location_text: '',
              lat: '',
              lng: '',
              jurisdiction: '',
              notes: '',
            });
            fetchIncidents();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create incident'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Incident</Text>
        <Text style={styles.headerSubtitle}>Create dispatch call</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Incident Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter incident description"
              placeholderTextColor={Colors.dark.textMuted}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              multiline
            />
          </View>

          {/* Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Incident Type</Text>
            <View style={styles.typeGrid}>
              {INCIDENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.type === type && {
                      backgroundColor: IncidentColors[type] + '20',
                      borderColor: IncidentColors[type],
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  <Text
                    style={[
                      styles.typeText,
                      formData.type === type && { color: IncidentColors[type] },
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityButton,
                    formData.priority === priority && styles.priorityActive,
                  ]}
                  onPress={() => setFormData({ ...formData, priority })}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      formData.priority === priority && styles.priorityTextActive,
                    ]}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter address or location"
              placeholderTextColor={Colors.dark.textMuted}
              value={formData.location_text}
              onChangeText={(text) => setFormData({ ...formData, location_text: text })}
            />
          </View>

          {/* Coordinates */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000000"
                placeholderTextColor={Colors.dark.textMuted}
                value={formData.lat}
                onChangeText={(text) => setFormData({ ...formData, lat: text })}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000000"
                placeholderTextColor={Colors.dark.textMuted}
                value={formData.lng}
                onChangeText={(text) => setFormData({ ...formData, lng: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Jurisdiction */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Jurisdiction</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter jurisdiction"
              placeholderTextColor={Colors.dark.textMuted}
              value={formData.jurisdiction}
              onChangeText={(text) => setFormData({ ...formData, jurisdiction: text })}
            />
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes..."
              placeholderTextColor={Colors.dark.textMuted}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.dark.text} />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color={Colors.dark.text} />
                <Text style={styles.submitText}>Create Incident</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    letterSpacing: 0.5,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  priorityActive: {
    backgroundColor: Colors.dark.accent + '20',
    borderColor: Colors.dark.accent,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  priorityTextActive: {
    color: Colors.dark.accent,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accent,
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
});
