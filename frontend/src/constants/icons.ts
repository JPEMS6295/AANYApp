import { Ionicons } from '@expo/vector-icons';

export const IncidentIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  fire: 'flame',
  ems: 'medkit',
  police: 'shield',
  traffic: 'car',
  hazmat: 'warning',
  rescue: 'hand-left',
  other: 'alert-circle',
};

export const getIncidentIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  const normalizedType = type?.toLowerCase() || 'other';
  return IncidentIcons[normalizedType] || IncidentIcons.other;
};
