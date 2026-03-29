import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Incident } from '../store/incidentStore';

const TTS_SETTINGS_KEY = 'tts_settings';

// High-priority incident types that trigger TTS
const TTS_TRIGGER_TYPES = new Set([
  // Signal codes
  '10-75',
  '10-76', 
  '10-77',
  '10-60',
  '10-61',
  '10-62',
  '10-63',
  '10-64',
  '10-65',
  '10-66',
  // Fire alarms
  'ALL HANDS',
  'ALL-HANDS',
  'ALLHANDS',
  '2ND ALARM',
  '2ND-ALARM',
  '3RD ALARM',
  '3RD-ALARM',
  '4TH ALARM',
  '4TH-ALARM',
  '5TH ALARM',
  '5TH-ALARM',
  '6TH ALARM',
  '6TH-ALARM',
  '7TH ALARM',
  '7TH-ALARM',
  '8TH ALARM',
  '8TH-ALARM',
]);

// Mapping of codes to readable text
const CODE_TO_SPEECH: Record<string, string> = {
  '10-75': 'Ten Seventy Five, Working Fire',
  '10-76': 'Ten Seventy Six, High Rise Fire',
  '10-77': 'Ten Seventy Seven, High Rise Fire with Rescue',
  '10-60': 'Ten Sixty, Major Emergency',
  '10-61': 'Ten Sixty One',
  '10-62': 'Ten Sixty Two',
  '10-63': 'Ten Sixty Three',
  '10-64': 'Ten Sixty Four',
  '10-65': 'Ten Sixty Five',
  '10-66': 'Ten Sixty Six, Brush Fire',
  'ALL HANDS': 'All Hands Working',
  'ALL-HANDS': 'All Hands Working',
  'ALLHANDS': 'All Hands Working',
  '2ND ALARM': 'Second Alarm',
  '2ND-ALARM': 'Second Alarm',
  '3RD ALARM': 'Third Alarm',
  '3RD-ALARM': 'Third Alarm',
  '4TH ALARM': 'Fourth Alarm',
  '4TH-ALARM': 'Fourth Alarm',
  '5TH ALARM': 'Fifth Alarm',
  '5TH-ALARM': 'Fifth Alarm',
  '6TH ALARM': 'Sixth Alarm',
  '6TH-ALARM': 'Sixth Alarm',
  '7TH ALARM': 'Seventh Alarm',
  '7TH-ALARM': 'Seventh Alarm',
  '8TH ALARM': 'Eighth Alarm',
  '8TH-ALARM': 'Eighth Alarm',
};

export interface TTSSettings {
  enabled: boolean;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0 - 1
}

const defaultSettings: TTSSettings = {
  enabled: true,
  rate: 0.95,
  pitch: 0.85, // Slightly lower pitch for male voice
  volume: 1.0,
};

// Track speaking state and queue
let isSpeaking = false;
let speechQueue: string[] = [];

export const ttsService = {
  settings: { ...defaultSettings },
  maleVoiceId: null as string | null,

  async initialize(): Promise<boolean> {
    try {
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem(TTS_SETTINGS_KEY);
      if (savedSettings) {
        this.settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
      }

      // Find a male voice
      const voices = await Speech.getAvailableVoicesAsync();
      
      // Prefer male voices - look for common male voice identifiers
      const maleVoice = voices.find(v => {
        const id = v.identifier.toLowerCase();
        const name = (v.name || '').toLowerCase();
        // Common male voice patterns
        return (
          id.includes('male') ||
          name.includes('male') ||
          id.includes('daniel') ||
          id.includes('alex') ||
          id.includes('tom') ||
          id.includes('james') ||
          id.includes('david') ||
          id.includes('aaron') ||
          id.includes('fred') ||
          id.includes('bruce')
        );
      });

      // Fallback to any English voice
      const englishVoice = maleVoice || voices.find(v => 
        v.language.startsWith('en') && v.quality === 'Enhanced'
      ) || voices.find(v => 
        v.language.startsWith('en')
      );

      if (englishVoice) {
        this.maleVoiceId = englishVoice.identifier;
        console.log(`TTS initialized with voice: ${englishVoice.name || englishVoice.identifier}`);
      } else {
        console.log('TTS initialized with default voice');
      }

      return true;
    } catch (error) {
      console.error('Error initializing TTS:', error);
      return false;
    }
  },

  async saveSettings(settings: Partial<TTSSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await AsyncStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(this.settings));
  },

  async getSettings(): Promise<TTSSettings> {
    try {
      const saved = await AsyncStorage.getItem(TTS_SETTINGS_KEY);
      if (saved) {
        this.settings = { ...defaultSettings, ...JSON.parse(saved) };
      }
      return this.settings;
    } catch {
      return defaultSettings;
    }
  },

  /**
   * Check if incident type should trigger TTS
   */
  shouldTriggerTTS(incidentType: string): boolean {
    if (!incidentType) return false;
    
    const normalized = incidentType.toUpperCase().trim();
    
    // Direct match
    if (TTS_TRIGGER_TYPES.has(normalized)) return true;
    
    // Check for partial matches (e.g., "10-75 All Hands" contains "10-75")
    for (const trigger of TTS_TRIGGER_TYPES) {
      if (normalized.includes(trigger)) return true;
    }
    
    // Check for alarm patterns like "2 ALARM", "3RD ALARM", etc.
    if (/\d+(ST|ND|RD|TH)?\s*ALARM/i.test(normalized)) return true;
    if (/ALL\s*HANDS/i.test(normalized)) return true;
    
    return false;
  },

  /**
   * Convert incident type to readable speech text
   */
  getReadableType(incidentType: string): string {
    const normalized = incidentType.toUpperCase().trim();
    
    // Check direct mapping
    if (CODE_TO_SPEECH[normalized]) {
      return CODE_TO_SPEECH[normalized];
    }
    
    // Check if it contains a known code
    for (const [code, speech] of Object.entries(CODE_TO_SPEECH)) {
      if (normalized.includes(code)) {
        // Return the mapped speech, possibly with additional context
        const remaining = normalized.replace(code, '').trim();
        if (remaining) {
          return `${speech}, ${remaining}`;
        }
        return speech;
      }
    }
    
    // Handle generic alarm patterns
    const alarmMatch = normalized.match(/(\d+)(ST|ND|RD|TH)?\s*ALARM/i);
    if (alarmMatch) {
      const num = parseInt(alarmMatch[1]);
      const ordinal = getOrdinal(num);
      return `${ordinal} Alarm`;
    }
    
    // Default: return the type as-is
    return incidentType;
  },

  /**
   * Speak incident type and location
   */
  async speakIncident(incident: Incident): Promise<void> {
    if (!this.settings.enabled) return;
    
    const type = incident.type || incident.title || '';
    
    if (!this.shouldTriggerTTS(type)) {
      console.log(`TTS: Skipping non-trigger type: ${type}`);
      return;
    }

    const readableType = this.getReadableType(type);
    const location = incident.location_text || 'Unknown location';
    
    // Clean up location for speech (remove abbreviations that sound awkward)
    const cleanLocation = cleanLocationForSpeech(location);
    
    const speechText = `Attention. ${readableType}. At ${cleanLocation}`;
    
    console.log(`TTS: Speaking - "${speechText}"`);
    
    await this.speak(speechText);
  },

  /**
   * Add text to speech queue and process
   */
  async speak(text: string): Promise<void> {
    if (!this.settings.enabled || !text) return;

    speechQueue.push(text);
    await this.processQueue();
  },

  /**
   * Process speech queue (one at a time)
   */
  async processQueue(): Promise<void> {
    if (isSpeaking || speechQueue.length === 0) return;

    isSpeaking = true;
    const text = speechQueue.shift()!;

    try {
      // Stop any current speech
      await Speech.stop();

      const options: Speech.SpeechOptions = {
        language: 'en-US',
        rate: this.settings.rate,
        pitch: this.settings.pitch,
        volume: this.settings.volume,
        onDone: () => {
          isSpeaking = false;
          // Process next item in queue
          this.processQueue();
        },
        onError: (error) => {
          console.error('TTS Error:', error);
          isSpeaking = false;
          this.processQueue();
        },
        onStopped: () => {
          isSpeaking = false;
        },
      };

      // Use male voice if available
      if (this.maleVoiceId) {
        options.voice = this.maleVoiceId;
      }

      await Speech.speak(text, options);
    } catch (error) {
      console.error('TTS speak error:', error);
      isSpeaking = false;
      this.processQueue();
    }
  },

  /**
   * Stop current speech and clear queue
   */
  async stop(): Promise<void> {
    speechQueue = [];
    isSpeaking = false;
    await Speech.stop();
  },

  /**
   * Check if TTS is currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  },

  /**
   * Get list of trigger types for settings display
   */
  getTriggerTypes(): string[] {
    return Array.from(TTS_TRIGGER_TYPES);
  },
};

/**
 * Get ordinal string for a number
 */
function getOrdinal(n: number): string {
  const ordinals = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
  if (n >= 1 && n <= 10) return ordinals[n];
  
  // For numbers > 10, use numeric ordinal
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Clean location text for better speech output
 */
function cleanLocationForSpeech(location: string): string {
  let cleaned = location;
  
  // Expand common abbreviations
  const abbreviations: Record<string, string> = {
    'ST': 'Street',
    'AVE': 'Avenue',
    'BLVD': 'Boulevard',
    'RD': 'Road',
    'DR': 'Drive',
    'LN': 'Lane',
    'CT': 'Court',
    'PL': 'Place',
    'SQ': 'Square',
    'PKY': 'Parkway',
    'PKWY': 'Parkway',
    'HWY': 'Highway',
    'FWY': 'Freeway',
    'N': 'North',
    'S': 'South',
    'E': 'East',
    'W': 'West',
    'NE': 'Northeast',
    'NW': 'Northwest',
    'SE': 'Southeast',
    'SW': 'Southwest',
    'APT': 'Apartment',
    'FL': 'Floor',
    'BLDG': 'Building',
    'NYC': 'New York City',
    'NY': 'New York',
    'BX': 'Bronx',
    'BK': 'Brooklyn',
    'QNS': 'Queens',
    'SI': 'Staten Island',
    'MN': 'Manhattan',
  };
  
  // Replace abbreviations (word boundaries)
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    cleaned = cleaned.replace(regex, full);
  }
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

export default ttsService;
