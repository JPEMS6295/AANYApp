import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface IncidentUpdate {
  id: string;
  text: string;
  ts: string;
  user: string;
  media?: any[];
}

export interface Incident {
  _id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  location_text: string;
  lat: number;
  lng: number;
  jurisdiction?: string;
  notes?: string;
  icon?: string;
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  media?: any[];
  updates?: IncidentUpdate[];
  created_at: string;
  updated_at: string;
  posted_by?: string;
}

export interface EASAlert {
  id: string;
  code: string;
  title: string;
  level: string;
  color: string;
  issued: string;
  expires: string;
  area: string;
  fips?: string[];
  lat?: number;
  lng?: number;
  eas_text?: string;
  audio_url?: string;
  received_at: string;
}

interface IncidentState {
  incidents: Incident[];
  easAlerts: EASAlert[];
  isLoading: boolean;
  selectedIncident: Incident | null;
  selectedEAS: EASAlert | null;
  fetchIncidents: () => Promise<void>;
  fetchEASAlerts: () => Promise<void>;
  setSelectedIncident: (incident: Incident | null) => void;
  setSelectedEAS: (eas: EASAlert | null) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (incident: Incident) => void;
  removeIncident: (id: string) => void;
  addEASAlert: (alert: EASAlert) => void;
  removeEASAlert: (id: string) => void;
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  easAlerts: [],
  isLoading: false,
  selectedIncident: null,
  selectedEAS: null,

  fetchIncidents: async () => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get('/api/incidents');
      if (response.data && Array.isArray(response.data)) {
        set({ incidents: response.data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Fetch incidents error:', error);
      set({ isLoading: false });
    }
  },

  fetchEASAlerts: async () => {
    try {
      const response = await apiClient.get('/api/eas');
      if (response.data && Array.isArray(response.data)) {
        set({ easAlerts: response.data });
      }
    } catch (error) {
      console.error('Fetch EAS error:', error);
    }
  },

  setSelectedIncident: (incident) => set({ selectedIncident: incident }),
  setSelectedEAS: (eas) => set({ selectedEAS: eas }),

  addIncident: (incident) => {
    const current = get().incidents;
    const exists = current.find((i) => i._id === incident._id);
    if (!exists) {
      set({ incidents: [incident, ...current] });
    }
  },

  updateIncident: (incident) => {
    const current = get().incidents;
    const index = current.findIndex((i) => i._id === incident._id);
    if (index !== -1) {
      const updated = [...current];
      updated[index] = incident;
      set({ incidents: updated });
    } else {
      set({ incidents: [incident, ...current] });
    }
  },

  removeIncident: (id) => {
    set({ incidents: get().incidents.filter((i) => i._id !== id) });
  },

  addEASAlert: (alert) => {
    const current = get().easAlerts;
    const exists = current.find((a) => a.id === alert.id);
    if (!exists) {
      set({ easAlerts: [alert, ...current] });
    }
  },

  removeEASAlert: (id) => {
    set({ easAlerts: get().easAlerts.filter((a) => a.id !== id) });
  },
}));
