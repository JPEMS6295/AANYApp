export const Colors = {
  dark: {
    background: '#0a0a0a',
    surface: '#141414',
    surfaceLight: '#1a1a1a',
    border: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#888888',
    textMuted: '#666666',
    accent: '#3b82f6',
    accentLight: '#60a5fa',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    fire: '#ef4444',
    ems: '#22c55e',
    police: '#3b82f6',
    other: '#8b5cf6',
  },
};

export const IncidentColors: Record<string, string> = {
  fire: '#ef4444',
  ems: '#22c55e',
  police: '#3b82f6',
  traffic: '#f59e0b',
  hazmat: '#f97316',
  rescue: '#06b6d4',
  other: '#8b5cf6',
};

export const EASColors: Record<string, string> = {
  extreme: '#dc2626',
  severe: '#f97316',
  moderate: '#eab308',
  minor: '#22c55e',
  unknown: '#6b7280',
};

export const getIncidentColor = (type: string): string => {
  const normalizedType = type?.toLowerCase() || 'other';
  return IncidentColors[normalizedType] || IncidentColors.other;
};

export const getEASColor = (level: string): string => {
  const normalizedLevel = level?.toLowerCase() || 'unknown';
  return EASColors[normalizedLevel] || EASColors.unknown;
};
