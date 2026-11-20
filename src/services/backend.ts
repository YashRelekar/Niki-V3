import { BackendStatePayload, NikiUIState, BackendMessage, ToolButton, SavedPhoto } from '../types';
import { localStore } from './storage';

type StateListener = (state: BackendStatePayload) => void;

class BackendService {
  private listeners: Set<StateListener> = new Set();
  private pollingTimer: number | null = null;
  private goodbyeTimer: number | null = null;
  private isOffline = true;
  private backendHost = 'niki2.evnchn.io';

  // Current state cache
  private currentState: BackendStatePayload = {
    turn: 'user',
    state_label: 'Waiting for flyer',
    pending_tool_name: undefined,
    button_and_responses: {},
    master_message_list: [
      {
        role: 'system',
        content: JSON.stringify({ text: 'Niki Robot System Initialized', emotion: 'HAPPY' }),
      },
    ],
    event_uuids: {
      camera_taking_event: 'uuid_init_0',
    },
    niki_ui_state: {
      type: 'display',
      state: 'IDLE',
      text: '(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ',
      emoji: '🤖',
    },
  };

  // Sample photos for selection when running offline or testing
  private samplePhotos: string[] = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
  ];

  constructor() {
    const settings = localStore.getSettings();
    this.isOffline = settings.isOfflineMode;
    this.backendHost = settings.backendHost || 'niki2.evnchn.io';
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }

  public setOfflineMode(offline: boolean) {
    this.isOffline = offline;
    const settings = localStore.getSettings();
    settings.isOfflineMode = offline;
    localStore.saveSettings(settings);
    this.notify();
  }

  public getIsOffline(): boolean {
    return this.isOffline;
  }

  public setBackendHost(host: string) {
    this.backendHost = host;
    const settings = localStore.getSettings();
    settings.backendHost = host;
    localStore.saveSettings(settings);
  }

  public startPolling(intervalMs: number = 1000) {
    if (this.pollingTimer) return;

    const poll = async () => {
      if (!this.isOffline) {
        await this.fetchRemoteState();
      }
    };

    poll();
    this.pollingTimer = window.setInterval(poll, intervalMs);
  }

  public stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async fetchRemoteState() {
    try {
      const url = `https://${this.backendHost}/api/state`;
      const res = await fetch(url, {
        headers: {
          // In Swift: Cookie: api_key=helloworld
          // Note: In browser CORS might require proxy or fail; if fail, we smoothly maintain offline capability
        },
      });

      if (res.ok) {
        const data = await res.json();
        this.currentState = data;
        this.notify();
      } else {
        // Fallback to offline notice
        console.warn('Backend responded with status:', res.status);
      }
    } catch {
      // Remote host unreachable or blocked by CORS - keep offline state alive
    }
  }

  // --- Offline Engine Methods ---

  public setOfflineState(newState: Partial<BackendStatePayload>) {
    this.currentState = {
      ...this.currentState,
      ...newState,
      niki_ui_state: {
        ...(this.currentState.niki_ui_state || { type: 'display', state: 'IDLE' }),
        ...(newState.niki_ui_state || {}),
      },
    };
    this.notify();
  }

  public async transitionKioskState(state: NikiUIState['state'], customText?: string) {
    const settings = localStore.getSettings();
    const flyerName = settings.demoName || 'Candbot';

    let nikiUIState: NikiUIState = {
      type: 'display',
      state,
      text: customText,
    };

    let newTurn = 'user';
    let label = 'Idle';
    let buttonResponses: Record<string, string> = {};
    let toolMsg: string | null = null;
    let emotion = 'HAPPY';

    switch (state) {
      case 'IDLE':
        if (this.goodbyeTimer) {
          clearTimeout(this.goodbyeTimer);
          this.goodbyeTimer = null;
        }
        label = 'Waiting for flyer';
        nikiUIState = {
          type: 'display',
          state: 'IDLE',
          text: '(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ',
        };
        buttonResponses = { 'Simulate Presence': 'detect_person' };
        break;

      case 'DETECT_PRESENCE':
        label = 'Flyer detected';
        nikiUIState = {
          type: 'display',
          state: 'DETECT_PRESENCE',
          text: `Hello, flyer! Come closer!`,
        };
        toolMsg = `Hello flyer! Come closer to take a picture!`;
        buttonResponses = { 'User Arrived': 'engage', 'Ignore': 'back_to_idle' };
        break;

      case 'WAIT_FOR_USER_ENGAGEMENT':
        label = 'Waiting for invitation response';
        nikiUIState = {
          type: 'display',
          state: 'WAIT_FOR_USER_ENGAGEMENT',
          text: `The weather looks great today, ${flyerName}!\nWouldn't you want to take a picture?`,
        };
        toolMsg = `The weather looks great today. Wouldn't you want to take a picture with me?`;
        buttonResponses = { "Let's start!": 'yes', 'No thanks': 'no' };
        break;

      case 'CAPTURE_PHOTOS':
        label = 'Photo capture mode active';
        newTurn = 'tool';
        // Clear previous session photos so new session starts completely fresh
        await localStore.clearAllExceptChosen();
        nikiUIState = {
          type: 'display',
          state: 'CAPTURE_PHOTOS',
          text: 'Get ready for your photo!',
        };
        toolMsg = '3... 2... 1... Say cheese!';
        buttonResponses = { 'Trigger Shutter': 'capture_now', 'Skip Photos': 'skip' };
        break;

      case 'WAIT_FOR_USER_CHOOSE_PHOTO':
        label = 'Photo selection';
        // Get locally saved photos, plus sample photos
        const saved = await localStore.getAllPhotos();
        const availableUrls = saved.length > 0
          ? saved.map((p) => p.dataUrl)
          : this.samplePhotos;

        nikiUIState = {
          type: 'photo_selection',
          state: 'WAIT_FOR_USER_CHOOSE_PHOTO',
          text: 'Choose your photos',
          photos: availableUrls,
          chosenPhoto: this.currentState.niki_ui_state?.chosenPhoto,
        };
        toolMsg = 'Swipe and select your favorite photo to print!';
        buttonResponses = { 'Select Photo 1': '0', 'Select Photo 2': '1' };
        break;

      case 'PRINT_PHOTO':
        label = 'Printing photo';
        newTurn = 'ai';
        nikiUIState = {
          type: 'display',
          state: 'PRINT_PHOTO',
          text: 'Printing...',
          chosenPhoto: this.currentState.niki_ui_state?.chosenPhoto,
        };
        toolMsg = `Printing your beautiful photo right now! Tap the screen to hear about my robot brain!`;
        buttonResponses = { 'Mark Print Done': 'print_done', 'Paper Jam': 'print_fail' };
        break;

      case 'PAPER_JAM_RECOVERY':
        label = 'Printer paper jam - auto retracting & reprinting';
        newTurn = 'ai';
        emotion = 'CONCERNED';
        nikiUIState = {
          type: 'display',
          state: 'PAPER_JAM_RECOVERY',
          text: 'Hold on just a moment! Retracting paper & reprinting...',
          chosenPhoto: this.currentState.niki_ui_state?.chosenPhoto,
        };
        toolMsg = `Paper feed anomaly detected. Retracting stuck paper, clearing feed rollers, and preparing fresh souvenir print.`;
        buttonResponses = { 'Reprint Complete': 'resolve_jam', 'Back to Idle': 'idle' };
        break;

      case 'PRINT_SUCCESS':
        label = 'Print completed successfully';
        nikiUIState = {
          type: 'display',
          state: 'PRINT_SUCCESS',
          text: 'Print success! 🎉',
          chosenPhoto: this.currentState.niki_ui_state?.chosenPhoto,
        };
        toolMsg = 'Your photo is ready! Thanks for flying with us!';
        buttonResponses = { 'Finish Session': 'finish' };
        break;

      case 'GOODBYE':
        label = 'Saying goodbye';
        nikiUIState = {
          type: 'display',
          state: 'GOODBYE',
          text: 'Have a safe flight! ✈️',
        };
        toolMsg = 'Have a wonderful journey ahead. Goodbye!';
        buttonResponses = { 'Reset to Idle': 'idle' };

        // Automatically return to IDLE after 2.5s and clean up session photos
        if (this.goodbyeTimer) {
          clearTimeout(this.goodbyeTimer);
        }
        this.goodbyeTimer = window.setTimeout(async () => {
          this.goodbyeTimer = null;
          await localStore.clearAllPhotos();
          this.transitionKioskState('IDLE');
        }, 2500);
        break;

      case 'THINKING':
        label = 'Robot is thinking';
        newTurn = 'ai';
        nikiUIState = {
          type: 'display',
          state: 'THINKING',
          text: 'Thinking...',
        };
        buttonResponses = { 'Resume': 'resume' };
        break;
    }

    const messages = [...(this.currentState.master_message_list || [])];
    if (state === 'PAPER_JAM_RECOVERY') {
      messages.push({
        role: 'user',
        content: 'Guest notified robot: Souvenir photo paper is jammed in the dispenser tray',
      });
      messages.push({
        role: 'assistant',
        content: 'Niki: Don’t worry! I’m retracting the paper, clearing the roller path, and re-printing a fresh photo right away.',
      });
    }

    if (toolMsg) {
      messages.push({
        role: 'tool',
        content: JSON.stringify({
          text: toolMsg,
          emotion,
          presence_detected: state === 'DETECT_PRESENCE',
          capture_success: state === 'WAIT_FOR_USER_CHOOSE_PHOTO',
          print_success: state === 'PRINT_SUCCESS',
          paper_jam_active: state === 'PAPER_JAM_RECOVERY',
        }),
      });
    }

    this.setOfflineState({
      turn: newTurn,
      state_label: label,
      niki_ui_state: nikiUIState,
      button_and_responses: buttonResponses,
      master_message_list: messages.slice(-30),
    });
  }

  // Camera UUID Jump Trigger
  public triggerCameraUUIDJump() {
    const newUUID = 'cam_event_' + Date.now();
    this.currentState = {
      ...this.currentState,
      event_uuids: {
        ...(this.currentState.event_uuids || {}),
        camera_taking_event: newUUID,
      },
    };
    this.notify();
  }

  // Handle user input (primary button, photo selection index, etc.)
  public async handleUserInput(message: string): Promise<void> {
    // Record to offline sync queue
    await localStore.enqueueSyncItem({
      type: 'handle_user_input',
      payload: { message },
    });

    if (!this.isOffline) {
      try {
        await fetch(`https://${this.backendHost}/api/handle_user_input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
      } catch (e) {
        console.warn('Online sync failed, stored in local queue', e);
      }
    }

    // Process in simulated state machine
    if (this.currentState.niki_ui_state?.state === 'WAIT_FOR_USER_ENGAGEMENT') {
      if (message.toLowerCase() === 'yes') {
        this.transitionKioskState('CAPTURE_PHOTOS');
      } else {
        this.transitionKioskState('GOODBYE');
        setTimeout(() => this.transitionKioskState('IDLE'), 3500);
      }
    } else if (this.currentState.niki_ui_state?.state === 'WAIT_FOR_USER_CHOOSE_PHOTO') {
      // Find chosen photo URL by index or value
      const photos = this.currentState.niki_ui_state?.photos || [];
      const idx = parseInt(message, 10);
      let chosenUrl = '';
      if (!isNaN(idx) && idx >= 0 && idx < photos.length) {
        chosenUrl = photos[idx];
      } else if (photos.includes(message)) {
        chosenUrl = message;
      } else if (photos.length > 0) {
        chosenUrl = photos[0];
      }

      if (chosenUrl) {
        this.currentState = {
          ...this.currentState,
          niki_ui_state: {
            ...this.currentState.niki_ui_state!,
            chosenPhoto: chosenUrl,
          },
        };
        // Automatically delete all unselected photos, keeping only the chosen print photo
        await localStore.clearAllExceptChosen(chosenUrl);
      }

      this.transitionKioskState('PRINT_PHOTO');
    }
  }

  // Admin response
  public async sendAdminResponse(action: string): Promise<void> {
    await localStore.enqueueSyncItem({
      type: 'admin_action',
      payload: { action },
    });

    if (!this.isOffline) {
      try {
        await fetch(`https://${this.backendHost}/api/handle_user_input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: action }),
        });
      } catch (e) {
        console.warn(e);
      }
    }

    // Handle offline admin action shortcuts
    switch (action) {
      case 'detect_person':
        this.transitionKioskState('DETECT_PRESENCE');
        break;
      case 'engage':
        this.transitionKioskState('WAIT_FOR_USER_ENGAGEMENT');
        break;
      case 'back_to_idle':
      case 'idle':
      case 'finish':
        this.transitionKioskState('IDLE');
        break;
      case 'yes':
        this.transitionKioskState('CAPTURE_PHOTOS');
        break;
      case 'no':
        this.transitionKioskState('GOODBYE');
        setTimeout(() => this.transitionKioskState('IDLE'), 2000);
        break;
      case 'capture_now':
        this.triggerCameraUUIDJump();
        break;
      case 'skip':
        this.transitionKioskState('WAIT_FOR_USER_CHOOSE_PHOTO');
        break;
      case 'print_done':
      case 'resolve_jam':
        this.transitionKioskState('PRINT_SUCCESS');
        setTimeout(() => this.transitionKioskState('GOODBYE'), 3000);
        setTimeout(() => this.transitionKioskState('IDLE'), 6000);
        break;
      case 'print_fail':
      case 'paper_jam':
        this.transitionKioskState('PAPER_JAM_RECOVERY');
        break;
      default:
        if (!isNaN(Number(action))) {
          this.handleUserInput(action);
        }
        break;
    }
  }

  // Save captured photo (supports multiple photos without auto-navigating away)
  public async savePhoto(dataUrl: string, autoTransition: boolean = false): Promise<void> {
    const photo: SavedPhoto = {
      id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      dataUrl,
      synced: !this.isOffline,
      source: 'camera',
    };

    // 1. Store locally in IndexedDB / LocalStorage
    await localStore.savePhoto(photo);

    // 2. Queue for remote sync
    await localStore.enqueueSyncItem({
      type: 'save_photo',
      payload: { b64url: dataUrl },
    });

    // 3. If online, upload
    if (!this.isOffline) {
      try {
        await fetch(`https://${this.backendHost}/api/save_photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ b64url: dataUrl }),
        });
      } catch (e) {
        console.warn('Online photo sync failed, stored safely offline', e);
      }
    }

    if (autoTransition) {
      this.transitionKioskState('WAIT_FOR_USER_CHOOSE_PHOTO');
    }
  }
}

export const backendService = new BackendService();
