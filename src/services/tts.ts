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

  // Monotonic session id: every playback run bumps it so stale utterance
  // callbacks (iOS Safari fires `onend` on cancelled utterances) are ignored.
  private sessionToken = 0;
  // Becomes true after the first explicit user-gesture unlock.
  private unlocked = false;

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

  /**
   * Prime/unlock `speechSynthesis` inside an explicit user tap handler.
   * Mobile autoplay policies (especially iOS Safari) block synthesis until
   * the first utterance is triggered from a user gesture — call this from the
   * IDLE wake tap and every primary CTA tap.
   */
  public unlock() {
    if (!this.synth) return;
    this.unlocked = true;
    try {
      // Speak a silent, zero-length-ish utterance to prime the audio context.
      const prime = new SpeechSynthesisUtterance(' ');
      prime.volume = 0;
      this.synth.speak(prime);
      // Immediately cancel so nothing audible ever plays from the prime.
      try { this.synth.cancel(); } catch { /* no-op */ }
    } catch {
      // Priming is best-effort; normal speak() paths will still attempt queueing.
    }
  }

  /** Whether a user-gesture unlock has happened this session. */
  public isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Split a script block into short, utterance-sized segments.
   * Newlines are hard breaks; within a line, sentences are split on terminal
   * punctuation so iOS Safari never chokes on long utterances.
   */
  private splitScript(text: string): string[] {
    const segments: string[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const sentences = line.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) || [line];
      for (const s of sentences) {
        const trimmed = s.trim();
        if (trimmed) segments.push(trimmed);
      }
    }
    return segments.length ? segments : [text.trim()];
  }

  /** Recursively queue the remaining segments for the current session. */
  private speakSegment(
    segments: string[],
    index: number,
    emotion: string | null,
    sessionId: number,
    onEnd?: () => void
  ) {
    if (!this.synth) return;
    if (sessionId !== this.sessionToken) return; // superseded by a newer session
    if (index >= segments.length) {
      this.isSpeaking = false;
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(segments[index]);

    // Emotion modulation on top of the feminine pitch/rate.
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
      case 'CONCERNED':
        pitchMod = Math.min(2.0, this.basePitch * 1.1);
        rateMod = this.baseRate * 1.02;
        break;
      default:
        break;
    }
    utterance.pitch = pitchMod;
    utterance.rate = rateMod;

    const targetVoice = this.autoSelectBestFeminineVoice();
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    const advance = () => {
      if (sessionId !== this.sessionToken) return;
      // Tiny gap between segments keeps iOS Safari from stalling mid-queue.
      setTimeout(() => this.speakSegment(segments, index + 1, emotion, sessionId, onEnd), 10);
    };

    utterance.onstart = () => {
      if (sessionId === this.sessionToken) this.isSpeaking = true;
    };
    utterance.onend = advance;
    utterance.onerror = advance;

    try {
      this.synth.speak(utterance);
    } catch {
      if (sessionId === this.sessionToken) {
        this.isSpeaking = false;
        onEnd?.();
      }
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

    // Clean cancel + new session id so any in-flight utterance callbacks
    // (cancelled utterances firing onend) can never corrupt this run.
    this.sessionToken += 1;
    const sessionId = this.sessionToken;

    try {
      this.synth.cancel();
    } catch { /* no-op */ }

    const segments = this.splitScript(cleanText);
    this.speakSegment(segments, 0, emotion || null, sessionId, onEnd);
  }

  public testVoice(sampleText: string = "Hi! I'm Niki, your friendly Cathay Pacific photo companion! Ready to capture some beautiful memories?") {
    this.speak(sampleText, 'HAPPY');
  }

  public stop() {
    // Invalidate the current session first so queued segment callbacks die.
    this.sessionToken += 1;
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
