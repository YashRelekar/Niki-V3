import { localStore } from './storage';

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  isFeminine: boolean;
}

export type FeminineVoicePreset =
  | 'friendly_feminine'
  | 'cute_robot'
  | 'gentle_concierge'
  | 'energetic_female';

const KNOWN_MALE_NAMES = [
  'google us english',
  'david',
  'mark',
  'george',
  'alex',
  'fred',
  'daniel',
  'oliver',
  'james',
  'guy',
  'richard',
  'thomas',
  'bruce',
  'albert',
  'junior',
  'ralph',
  'male',
  'tom',
  'man',
];

const KNOWN_FEMALE_NAMES = [
  'google uk english female',
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'zoe',
  'ava',
  'allison',
  'susan',
  'fiona',
  'serena',
  'stephanie',
  'jenny',
  'aria',
  'zira',
  'hazel',
  'catherine',
  'linda',
  'heera',
  'female',
  'woman',
  'girl',
];

export class NikiSpeechService {
  private static instance: NikiSpeechService;
  private synth: SpeechSynthesis | null = null;
  private isSpeaking = false;
  private enabled = true;

  // Customization
  private selectedVoiceURI: string | null = null;
  private basePitch = 1.45; // Distinctly feminine/bright pitch
  private baseRate = 1.0;
  private currentPreset: FeminineVoicePreset = 'friendly_feminine';
  private voicesLoaded = false;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;

      // Load saved settings
      try {
        const settings = localStore.getSettings();
        if (settings.voicePreset) this.currentPreset = settings.voicePreset;
        if (settings.selectedVoiceURI) this.selectedVoiceURI = settings.selectedVoiceURI;
        if (settings.voicePitch) this.basePitch = settings.voicePitch;
        if (settings.voiceRate) this.baseRate = settings.voiceRate;
      } catch {}

      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.voicesLoaded = true;
          this.autoSelectBestFeminineVoice();
        };
      }
      this.autoSelectBestFeminineVoice();
    }
  }

  public static get shared(): NikiSpeechService {
    if (!NikiSpeechService.instance) {
      NikiSpeechService.instance = new NikiSpeechService();
    }
    return NikiSpeechService.instance;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stop();
    }
  }

  public getAvailableVoices(): VoiceOption[] {
    if (!this.synth) return [];
    const voices = this.synth.getVoices();
    return voices
      .filter((v) => v.lang.startsWith('en'))
      .map((v) => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
        isFeminine: this.checkIsFeminineVoice(v.name),
      }));
  }

  public getFeminineVoices(): VoiceOption[] {
    const all = this.getAvailableVoices();
    return all.filter((v) => v.isFeminine);
  }

  public checkIsFeminineVoice(name: string): boolean {
    const lower = name.toLowerCase();
    // If it explicitly matches a male name, reject
    if (KNOWN_MALE_NAMES.some((mn) => lower.includes(mn))) {
      return false;
    }
    return KNOWN_FEMALE_NAMES.some((fn) => lower.includes(fn));
  }

  public setVoiceURI(uri: string | null) {
    this.selectedVoiceURI = uri;
  }

  public getSelectedVoiceURI(): string | null {
    return this.selectedVoiceURI;
  }

  public setPreset(preset: FeminineVoicePreset) {
    this.currentPreset = preset;
    switch (preset) {
      case 'friendly_feminine':
        this.basePitch = 1.45;
        this.baseRate = 1.0;
        break;
      case 'cute_robot':
        this.basePitch = 1.65;
        this.baseRate = 1.05;
        break;
      case 'gentle_concierge':
        this.basePitch = 1.35;
        this.baseRate = 0.95;
        break;
      case 'energetic_female':
        this.basePitch = 1.55;
        this.baseRate = 1.1;
        break;
    }
  }

  public setCustomPitchAndRate(pitch: number, rate: number) {
    this.basePitch = pitch;
    this.baseRate = rate;
  }

  public getPitch(): number {
    return this.basePitch;
  }

  public getRate(): number {
    return this.baseRate;
  }

  public getPreset(): FeminineVoicePreset {
    return this.currentPreset;
  }

  private autoSelectBestFeminineVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices.length) return null;

    // 1. If user previously selected a specific voice URI that exists, keep it
    if (this.selectedVoiceURI) {
      const match = voices.find((v) => v.voiceURI === this.selectedVoiceURI);
      if (match) return match;
    }

    // 2. SPECIFIC USER PREFERENCE:
    // First Priority: "Google UK English Female" (Chrome, Android, Edge)
    const googleUkFemale = voices.find(
      (v) =>
        v.name.toLowerCase().includes('google uk english female') ||
        (v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('uk') && v.name.toLowerCase().includes('female'))
    );
    if (googleUkFemale) {
      this.selectedVoiceURI = googleUkFemale.voiceURI;
      return googleUkFemale;
    }

    // Second Priority: "Samantha" (iOS, macOS, Safari)
    const samantha = voices.find(
      (v) => v.name.toLowerCase().includes('samantha')
    );
    if (samantha) {
      this.selectedVoiceURI = samantha.voiceURI;
      return samantha;
    }

    // 3. Fallback: Search for any other known high-quality female voices
    for (const target of KNOWN_FEMALE_NAMES) {
      const found = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          v.name.toLowerCase().includes(target) &&
          !KNOWN_MALE_NAMES.some((mn) => v.name.toLowerCase().includes(mn))
      );
      if (found) {
        this.selectedVoiceURI = found.voiceURI;
        return found;
      }
    }

    // 4. Fallback: Any English voice not in the male blacklist
    const safeFemaleCandidate = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        !KNOWN_MALE_NAMES.some((mn) => v.name.toLowerCase().includes(mn))
    );

    if (safeFemaleCandidate) {
      this.selectedVoiceURI = safeFemaleCandidate.voiceURI;
      return safeFemaleCandidate;
    }

    // 5. Last resort
    const fallback = voices[0] || null;
    if (fallback) {
      this.selectedVoiceURI = fallback.voiceURI;
    }
    return fallback;
  }

  public speak(text: string, emotion?: string | null, onEnd?: () => void) {
    if (!this.enabled || !text || !this.synth) {
      onEnd?.();
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      onEnd?.();
      return;
    }

    try {
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Emotion modulation on top of feminine pitch
      let pitchMod = this.basePitch;
      let rateMod = this.baseRate;

      const emo = (emotion || '').toUpperCase();
      switch (emo) {
        case 'HAPPY':
          pitchMod = Math.min(2.0, this.basePitch * 1.15);
          rateMod = this.baseRate * 1.05;
          break;
        case 'SAD':
          pitchMod = Math.max(0.9, this.basePitch * 0.9);
          rateMod = this.baseRate * 0.9;
          break;
        case 'CONFUSED':
          pitchMod = Math.min(2.0, this.basePitch * 1.1);
          rateMod = this.baseRate * 1.02;
          break;
        default:
          break;
      }

      utterance.pitch = pitchMod;
      utterance.rate = rateMod;

      // Assign verified feminine voice
      const targetVoice = this.autoSelectBestFeminineVoice();
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('TTS playback issue:', e);
      onEnd?.();
    }
  }

  public testVoice(sampleText: string = "Hi! I'm Niki, your friendly Cathay Pacific photo companion! Ready to capture some beautiful memories?") {
    this.speak(sampleText, 'HAPPY');
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.warn(e);
      }
      this.isSpeaking = false;
    }
  }

  public getSpeakingState() {
    return this.isSpeaking;
  }
}
