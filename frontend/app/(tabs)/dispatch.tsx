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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../../src/api/client';
import { useIncidentStore } from '../../src/store/incidentStore';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, IncidentColors } from '../../src/constants/theme';

const INCIDENT_TYPES = ['fire', 'ems', 'police', 'traffic', 'hazmat', 'rescue', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  name: string;
  uploadedUrl?: string;
}

export default function DispatchScreen() {
  const { fetchIncidents } = useIncidentStore();
  const { userType } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
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

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newMedia: MediaItem = {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        name: asset.fileName || `media_${Date.now()}`,
      };
      setMediaItems([...mediaItems, newMedia]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newMedia: MediaItem = {
        uri: asset.uri,
        type: 'image',
        name: `photo_${Date.now()}.jpg`,
      };
      setMediaItems([...mediaItems, newMedia]);
    }
  };

  const removeMedia = (index: number) => {
    const updated = [...mediaItems];
    updated.splice(index, 1);
    setMediaItems(updated);
  };

  const uploadMedia = async (media: MediaItem): Promise<string | null> => {
    try {
      const formData = new FormData();
      
      // Create file object for upload
      const file = {
        uri: media.uri,
        type: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: media.name,
      };
      
      formData.append('file', file as any);

      const response = await apiClient.post('/api/admin/upload-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.url) {
        return response.data.url;
      }
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

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
      // Upload media files first
      let uploadedMedia: any[] = [];
      if (mediaItems.length > 0) {
        setIsUploading(true);
        for (const media of mediaItems) {
          const url = await uploadMedia(media);
          if (url) {
            uploadedMedia.push({
              url,
              kind: media.type,
            });
          }
        }
        setIsUploading(false);
      }

      const payload = {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        media: uploadedMedia,
        image_url: uploadedMedia.find(m => m.kind === 'image')?.url || '',
        video_url: uploadedMedia.find(m => m.kind === 'video')?.url || '',
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
            setMediaItems([]);
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
      setIsUploading(false);
    }
  };

  if (userType !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dispatch</Text>
        </View>
        <View style={styles.restrictedContainer}>
          <Ionicons name="lock-closed" size={64} color={Colors.dark.textMuted} />
          <Text style={styles.restrictedTitle}>Dispatcher Access Only</Text>
          <Text style={styles.restrictedSubtitle}>
            Creating incidents is only available for dispatchers
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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

          {/* Media Attachments */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Media Attachments</Text>
            <View style={styles.mediaSection}>
              <View style={styles.mediaButtons}>
                <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                  <Ionicons name="images-outline" size={22} color={Colors.dark.accent} />
                  <Text style={styles.mediaButtonText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={22} color={Colors.dark.accent} />
                  <Text style={styles.mediaButtonText}>Camera</Text>
                </TouchableOpacity>
              </View>
              
              {mediaItems.length > 0 && (
                <View style={styles.mediaPreviews}>
                  {mediaItems.map((item, index) => (
                    <View key={index} style={styles.mediaPreview}>
                      {item.type === 'image' ? (
                        <Image source={{ uri: item.uri }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.videoPreview}>
                          <Ionicons name="videocam" size={24} color={Colors.dark.text} />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeMediaButton}
                        onPress={() => removeMedia(index)}
                      >
                        <Ionicons name="close-circle" size={22} color={Colors.dark.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submitContent}>
                <ActivityIndicator color={Colors.dark.text} />
                <Text style={styles.submitText}>
                  {isUploading ? 'Uploading media...' : 'Creating...'}
                </Text>
              </View>
            ) : (
              <View style={styles.submitContent}>
                <Ionicons name="add-circle" size={22} color={Colors.dark.text} />
                <Text style={styles.submitText}>Create Incident</Text>
              </View>
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
  mediaSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surfaceLight,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.accent,
  },
  mediaPreviews: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.dark.background,
    borderRadius: 11,
  },
  submitButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
  },
  restrictedSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
