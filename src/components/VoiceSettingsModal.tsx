import React, { useState, useEffect } from 'react';
import { NikiSpeechService, VoiceOption, FeminineVoicePreset } from '../services/tts';
import { localStore } from '../services/storage';
import { Volume2, Sparkles, Check, Play, X, User, Sliders, Music } from 'lucide-react';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedURI, setSelectedURI] = useState<string>('');
  const [preset, setPreset] = useState<FeminineVoicePreset>('friendly_feminine');
  const [pitch, setPitch] = useState<number>(1.25);
  const [rate, setRate] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const speech = NikiSpeechService.shared;
      const updateVoices = () => {
        const allVoices = speech.getAvailableVoices();
        setVoices(allVoices);
      };
      updateVoices();

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }

      const settings = localStore.getSettings();
      const currentPreset = settings.voicePreset || 'friendly_feminine';
      setPreset(currentPreset);

      const currentPitch = settings.voicePitch ?? speech.getPitch();
      const currentRate = settings.voiceRate ?? speech.getRate();
      setPitch(currentPitch);
      setRate(currentRate);

      const currentURI = settings.selectedVoiceURI || speech.getSelectedVoiceURI() || '';
      setSelectedURI(currentURI);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetSelect = (p: FeminineVoicePreset) => {
    setPreset(p);
    const speech = NikiSpeechService.shared;
    speech.setPreset(p);
    setPitch(speech.getPitch());
    setRate(speech.getRate());
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedURI(uri);
    NikiSpeechService.shared.setVoiceURI(uri);
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    NikiSpeechService.shared.setCustomPitchAndRate(newPitch, rate);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    NikiSpeechService.shared.setCustomPitchAndRate(pitch, newRate);
  };

  const handleTestVoice = () => {
    setIsPlaying(true);
    const speech = NikiSpeechService.shared;
    speech.setCustomPitchAndRate(pitch, rate);
    if (selectedURI) speech.setVoiceURI(selectedURI);

    speech.speak(
      "Hi flyer! I'm Niki, your friendly Cathay Pacific photo companion! Ready to capture some beautiful memories?",
      'HAPPY',
      () => setIsPlaying(false)
    );
  };

  const handleSaveAndClose = () => {
    const settings = localStore.getSettings();
    settings.voicePreset = preset;
    settings.selectedVoiceURI = selectedURI;
    settings.voicePitch = pitch;
    settings.voiceRate = rate;
    localStore.saveSettings(settings);
    onClose();
  };

  const feminineVoices = voices.filter((v) => v.isFeminine);
  const otherVoices = voices.filter((v) => !v.isFeminine);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Niki's Feminine Voice Profile</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Feminine / Female
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Choose Niki's vocal tone, pitch, and voice synthesis personality
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Feminine Persona Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              1. Feminine Persona Presets
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    id: 'friendly_feminine',
                    title: 'Friendly & Warm',
                    desc: 'Natural, cheerful feminine flight companion (Pitch 1.45x)',
                    badge: 'Recommended',
                  },
                  {
                    id: 'cute_robot',
                    title: 'Cute & Playful Robot',
                    desc: 'Higher melodic pitch, expressive & adorable (Pitch 1.65x)',
                    badge: 'Playful',
                  },
                  {
                    id: 'gentle_concierge',
                    title: 'Gentle Concierge',
                    desc: 'Calm, soothing feminine flight attendant (Pitch 1.35x)',
                    badge: 'Elegant',
                  },
                  {
                    id: 'energetic_female',
                    title: 'Bright & Energetic',
                    desc: 'Brisk, upbeat youth personality (Pitch 1.55x)',
                    badge: 'Upbeat',
                  },
                ] as const
              ).map((p) => {
                const isSelected = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p.id)}
                    className={`p-3.5 rounded-lg border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-950/40 border-teal-500/80 shadow-md ring-1 ring-teal-500/40 text-white'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white">{p.title}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
                    </div>
                    <div className="mt-2 text-[10px] font-semibold text-teal-300 uppercase">
                      {p.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. System Feminine Voice Engine Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Specifically Requested Voices
              </label>
              <span className="text-[11px] text-teal-300 font-medium">Google UK English Female & Samantha</span>
            </div>

            {/* Quick-select cards for Google UK English Female and Samantha */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {(() => {
                const googleVoice = voices.find((v) =>
                  v.name.toLowerCase().includes('google uk english female')
                );
                const isSelected = selectedURI === googleVoice?.voiceURI;
                return (
                  <button
                    onClick={() => googleVoice && handleVoiceChange(googleVoice.voiceURI)}
                    disabled={!googleVoice}
                    className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-900/40 border-teal-500 text-white ring-1 ring-teal-500'
                        : googleVoice
                        ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>🇬🇧 Google UK Female</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {googleVoice ? 'Detected & Available' : 'Not installed in browser'}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                  </button>
                );
              })()}

              {(() => {
                const samanthaVoice = voices.find((v) =>
                  v.name.toLowerCase().includes('samantha')
                );
                const isSelected = selectedURI === samanthaVoice?.voiceURI;
                return (
                  <button
                    onClick={() => samanthaVoice && handleVoiceChange(samanthaVoice.voiceURI)}
                    disabled={!samanthaVoice}
                    className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-900/40 border-teal-500 text-white ring-1 ring-teal-500'
                        : samanthaVoice
                        ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>🍎 Samantha (Apple)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {samanthaVoice ? 'Detected & Available' : 'Not installed in browser'}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>

            <select
              value={selectedURI}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <optgroup label="✨ Detected Feminine Voices">
                {feminineVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    🌸 {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
              {otherVoices.length > 0 && (
                <optgroup label="Other System Voices">
                  {otherVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* 3. Fine-tuning sliders */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/60 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Voice Pitch & Speed Fine-Tuning</span>
            </div>

            {/* Pitch Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Vocal Pitch (Feminine frequency)</span>
                <span className="font-mono text-teal-400 font-bold">{pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.7"
                step="0.05"
                value={pitch}
                onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0.9x (Lower)</span>
                <span>1.25x (Feminine Baseline)</span>
                <span>1.7x (High/Anime Robot)</span>
              </div>
            </div>

            {/* Rate Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Speaking Rate (Speed)</span>
                <span className="font-mono text-teal-400 font-bold">{rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={rate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0.75x (Relaxed)</span>
                <span>1.0x (Normal)</span>
                <span>1.3x (Fast)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Test and Save Buttons */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <button
            onClick={handleTestVoice}
            disabled={isPlaying}
            className="px-4 py-2.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/40 text-xs font-bold flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isPlaying ? 'animate-pulse' : ''}`} />
            <span>{isPlaying ? 'Speaking Sample...' : 'Test Niki’s Voice'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-950 transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Voice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
