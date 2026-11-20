export type KioskStateType =
  | 'IDLE'
  | 'DETECT_PRESENCE'
  | 'WAIT_FOR_USER_ENGAGEMENT'
  | 'CAPTURE_PHOTOS'
  | 'WAIT_FOR_USER_CHOOSE_PHOTO'
  | 'PRINT_PHOTO'
  | 'PAPER_JAM_RECOVERY'
  | 'PRINT_SUCCESS'
  | 'GOODBYE'
  | 'THINKING';

export interface NikiUIState {
  type: 'display' | 'image' | 'photo_selection' | 'button';
  src?: string;
  emoji?: string;
  text?: string;
  state: KioskStateType;
  photos?: string[];
  chosenPhoto?: string;
  camera_uuid?: string;
}

export interface ToolButton {
  id: string;
  text: string;
  response: string;
}

export interface BackendMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system' | 'admin';
  content: string | null;
  timestamp: number;
}

export interface BackendStatePayload {
  niki_ui_state?: NikiUIState;
  turn?: string;
  state_label?: string;
  pending_tool_name?: string;
  button_and_responses?: Record<string, string>;
  master_message_list?: Array<{
    role: string;
    content: string;
  }>;
  event_uuids?: {
    camera_taking_event?: string;
    [key: string]: string | undefined;
  };
}

export interface SavedPhoto {
  id: string;
  timestamp: number;
  dataUrl: string;
  synced: boolean;
  chosen?: boolean;
  source: 'camera' | 'sample';
}

export interface SyncQueueItem {
  id: string;
  type: 'save_photo' | 'handle_user_input' | 'admin_action';
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

export interface AppSettings {
  isOfflineMode: boolean;
  backendHost: string;
  autoSpeakTTS: boolean;
  soundVolume: number;
  deviceIdiom: 'pad' | 'phone';
  cameraFacing: 'user' | 'environment';
  demoName: string;
  voicePreset?: 'friendly_feminine' | 'cute_robot' | 'gentle_concierge' | 'energetic_female';
  selectedVoiceURI?: string;
  voicePitch?: number;
  voiceRate?: number;
}
