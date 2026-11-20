import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  Printer,
  ArrowRight,
  Plane,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { AirplaneSlider } from './AirplaneSlider';
import { NikiSpeechService } from '../services/tts';

interface ViewProps {
  deviceIdiom?: 'pad' | 'phone';
}

// 1. IDLE VIEW matching IdleView.swift
export const IdleView: React.FC<ViewProps & { onWakeUp?: () => void }> = ({
  deviceIdiom = 'pad',
  onWakeUp,
}) => {
  return (
    <div
      onClick={onWakeUp}
      className="w-full h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer select-none"
    >
      <div
        className="font-bold tracking-tight transition-transform hover:scale-105 duration-300 text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
      >
        (ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ
      </div>
      <p className="mt-6 text-white/60 text-xs sm:text-sm md:text-base tracking-wider uppercase font-medium">
        Kiosk Sleeping • Tap anywhere to wake
      </p>
    </div>
  );
};

// 2. INITIAL VIEW (DETECT_PRESENCE) matching InitialView.swift
export const InitialView: React.FC<ViewProps & { onApproach?: () => void }> = ({
  deviceIdiom = 'pad',
  onApproach,
}) => {
  return (
    <div
      onClick={onApproach}
      className="w-full h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 select-none cursor-pointer"
    >
      <h1 className="font-bold leading-tight drop-shadow-md text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
        Hello, flyer!
      </h1>
      <h2 className="mt-4 font-normal text-white/90 leading-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
        Come closer!
      </h2>
      <div className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-xs sm:text-sm">
        <Sparkles className="w-4 h-4 text-teal-300" />
        <span>Step forward or tap to interact</span>
      </div>
    </div>
  );
};

// 3. INVITE VIEW matching InviteView.swift
interface InviteViewProps extends ViewProps {
  name: string;
  welcomeText: string;
  primaryActionTitle?: string;
  secondaryActionTitle?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
}

export const InviteView: React.FC<InviteViewProps> = ({
  name,
  welcomeText,
  primaryActionTitle = "Let's start!",
  secondaryActionTitle = 'No thanks',
  onPrimaryAction,
  onSecondaryAction,
  deviceIdiom = 'pad',
}) => {
  const [loadingNext, setLoadingNext] = useState(false);

  const handleStart = () => {
    setLoadingNext(true);
    onPrimaryAction();
  };

  return (
    <div
      className={`w-full h-full flex flex-col justify-between select-none p-6 sm:p-8 md:p-10 lg:p-12 overflow-hidden ${
        loadingNext ? 'opacity-30 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Text Section with scaled, proportional typography */}
      <div className="space-y-3 sm:space-y-4 max-w-4xl">
        <h1 className="font-bold whitespace-pre-line leading-tight text-2xl sm:text-3xl md:text-4xl lg:text-[42px] drop-shadow-sm">
          {welcomeText}
        </h1>

        <h2 className="font-normal text-white/90 whitespace-pre-line leading-snug text-lg sm:text-xl md:text-2xl lg:text-[28px]">
          Welcome! {'\n'}Take a photo with me!
        </h2>
      </div>

      {/* Primary Action Button (Centered with comfortable sizing) */}
      <div className="w-full flex flex-col items-center justify-center my-auto py-4">
        <button
          onClick={handleStart}
          disabled={loadingNext}
          className="w-full max-w-xs sm:max-w-sm py-4 px-8 rounded-2xl bg-white text-[#006564] font-bold text-center tracking-wide shadow-2xl hover:bg-white/95 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg sm:text-xl md:text-2xl"
        >
          <span>{primaryActionTitle}</span>
          <ArrowRight className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Footer Secondary Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onSecondaryAction}
          className="text-white/70 hover:text-white text-sm sm:text-base font-medium underline underline-offset-4 transition"
        >
          {secondaryActionTitle}
        </button>
      </div>
    </div>
  );
};

// 4. IMAGE SELECTION VIEW matching ImageSelectionView.swift
interface ImageSelectionViewProps extends ViewProps {
  photoURLs: string[];
  onSelectPhotoAtIndex: (index: number) => void;
  onCancel?: () => void;
}

export const ImageSelectionView: React.FC<ImageSelectionViewProps> = ({
  photoURLs,
  onSelectPhotoAtIndex,
  onCancel,
  deviceIdiom = 'pad',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [loadingNext, setLoadingNext] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isPad = deviceIdiom === 'pad';

  const handleSliderChange = (progress: number) => {
    setScrollProgress(progress);
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollLeft = maxScroll * progress;
    }
  };

  const handleContainerScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(container.scrollLeft / maxScroll);
      }
    }
  };

  const handleSelect = () => {
    setLoadingNext(true);
    onSelectPhotoAtIndex(selectedIndex);
  };

  return (
    <div
      className={`w-full h-full flex flex-col justify-between select-none p-5 sm:p-8 md:p-10 overflow-hidden ${
        loadingNext ? 'opacity-30 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Header bar with titles and primary Select action */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl">
            Choose your photo
          </h1>
          <p className="text-white/80 text-base sm:text-lg md:text-xl">
            Tap a photo below to select it for souvenir printing.
          </p>
        </div>

        <button
          onClick={handleSelect}
          disabled={photoURLs.length === 0 || loadingNext}
          className="py-3 px-6 sm:py-3.5 sm:px-8 rounded-xl font-bold transition shadow-xl bg-white text-[#006564] hover:bg-white/95 active:scale-95 text-base sm:text-lg md:text-xl flex items-center gap-2"
        >
          <Printer className="w-5 h-5 text-[#006564]" />
          <span>Print Photo #{selectedIndex + 1}</span>
        </button>
      </div>

      {/* Horizontal Photo Gallery with Custom Airplane Scroll Track */}
      <div className="w-full my-auto flex flex-col gap-4 py-2">
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="w-full overflow-x-auto scrollbar-none flex gap-4 sm:gap-6 py-4 px-2 scroll-smooth"
        >
          {photoURLs.map((url, index) => {
            const isSelected = selectedIndex === index;
            return (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 border-4 ${
                  isSelected
                    ? 'border-white scale-105 shadow-2xl ring-4 ring-teal-400/80'
                    : 'border-transparent hover:scale-102 opacity-75 hover:opacity-100'
                }`}
                style={{
                  width: isPad ? 300 : 220,
                  height: isPad ? 200 : 150,
                }}
              >
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Index Tag */}
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white font-bold text-xs">
                  Photo #{index + 1}
                </div>

                {/* Selection Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#006564] flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in-75">
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Airplane Track Slider matching Swift HorizontalScrollView + Airplane thumb */}
        <div className="px-2">
          <AirplaneSlider
            progress={scrollProgress}
            onChange={handleSliderChange}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs sm:text-sm text-teal-200/90 font-medium">
          Selected: <strong className="text-white">Photo #{selectedIndex + 1}</strong> of {photoURLs.length}
        </div>
        <button
          onClick={onCancel}
          className="text-white/70 hover:text-white text-sm sm:text-base font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// 5. PRINTING VIEW with post-print Move On & Paper Jam options
export const PrintingView: React.FC<
  ViewProps & { chosenPhoto?: string; onDone?: () => void; onPaperJam?: () => void }
> = ({ deviceIdiom = 'pad', chosenPhoto, onDone, onPaperJam }) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState(14);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const toggleSpeech = () => {
    if (isPlayingAudio) {
      NikiSpeechService.shared.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      const text = `Hi! I’m Niki, your friendly little robot.
You’re probably wondering how I can move, talk, see, and still look this cute.
Well… it’s not magic — it’s some pretty cool technology!

I use a Vision‑Language Model so I can see the world and chat with you about it.
SLAM helps me walk around while building a map in my head at the same time.
LoRAs let me add a fun, personal twist to every photo I create.

And with MCP, all these abilities come together like my arms, legs, and tiny robot brain.

Pretty cool, right? Let’s explore together!`;

      NikiSpeechService.shared.speak(text, 'HAPPY', () => {
        setIsPlayingAudio(false);
      });
    }
  };

  useEffect(() => {
    // Auto-progress print job over 4.2 seconds - audio is an explicit user choice, not auto-played
    const startTime = Date.now();
    const duration = 4200;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(interval);
        setIsFinished(true);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      NikiSpeechService.shared.stop();
    };
  }, []);

  // When printing finishes, start auto-advance countdown if user doesn't press anything
  useEffect(() => {
    if (!isFinished) return;

    const timer = setInterval(() => {
      setAutoAdvanceRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDone?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, onDone]);

  // Stage description based on print percentage
  const getStageDescription = () => {
    if (progress < 30) return 'Optimizing souvenir resolution & colors...';
    if (progress < 75) return 'Thermal printing souvenir postcard...';
    if (progress < 100) return 'Finalizing glossy finish & dispensing...';
    return 'Souvenir photo dispensed in tray below.';
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 select-none"
    >
      {/* Printed Photo Preview Animation */}
      {chosenPhoto ? (
        <div className="relative mb-5 w-44 h-32 sm:w-56 sm:h-40 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-slate-900">
          <img src={chosenPhoto} alt="Printing preview" className="w-full h-full object-cover" />
          {!isFinished && (
            <div className="absolute inset-x-0 top-0 h-1.5 bg-teal-300 shadow-[0_0_14px_#5eead4] animate-bounce" />
          )}
          {isFinished && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          )}
        </div>
      ) : (
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 flex items-center justify-center mb-5 animate-pulse">
          <Printer className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
        </div>
      )}

      {/* Main Headline */}
      {!isFinished ? (
        <h1 className="font-bold drop-shadow text-3xl sm:text-4xl md:text-5xl text-white">
          Printing... {progress}%
        </h1>
      ) : (
        <div className="space-y-1">
          <h1 className="font-bold drop-shadow text-3xl sm:text-4xl md:text-5xl text-white flex items-center justify-center gap-2">
            <span>Printing Finished!</span>
            <span className="text-3xl">🖨️✨</span>
          </h1>
          <p className="text-teal-100 text-base sm:text-lg font-medium">
            Please check the dispenser tray below for your printed souvenir.
          </p>
        </div>
      )}

      {/* Printing Progress Bar */}
      <div className="w-64 sm:w-80 h-3 bg-white/20 rounded-full overflow-hidden mt-4 shadow-inner">
        <div
          className={`h-full transition-all duration-150 ease-out rounded-full shadow-[0_0_10px_#2dd4bf] ${
            isFinished
              ? 'bg-gradient-to-r from-teal-300 to-emerald-400'
              : 'bg-gradient-to-r from-teal-300 via-teal-400 to-emerald-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {!isFinished && (
        <>
          <p className="mt-3 text-teal-200/90 text-xs sm:text-sm font-medium">
            {getStageDescription()}
          </p>

          {/* User Option for Niki's Technology Introduction Audio */}
          <button
            onClick={toggleSpeech}
            type="button"
            className={`mt-4 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition active:scale-95 shadow-lg backdrop-blur-sm cursor-pointer ${
              isPlayingAudio
                ? 'bg-teal-400/25 border-teal-200 text-teal-100 ring-2 ring-teal-300/40'
                : 'bg-white/15 hover:bg-white/25 border-white/25 text-white/90 hover:text-white'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-teal-200" />
                <span>Niki is speaking • Tap to pause</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-3 bg-teal-300 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-teal-300 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-teal-300 rounded-full animate-pulse delay-150" />
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-teal-300" />
                <span>Hear Niki explain her technology</span>
              </>
            )}
          </button>
        </>
      )}

      {/* Once Progress Completes: 2 Clear Options for the User */}
      {isFinished ? (
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="text-xs uppercase tracking-wider text-teal-200/90 font-bold">
            How does your print look?
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            {/* Option 1: Move on normally */}
            <button
              onClick={() => onDone?.()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[#006564] hover:bg-white/95 font-bold shadow-xl transition active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base border border-teal-100 ring-2 ring-white/50"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Photo Received — Move On!</span>
            </button>

            {/* Option 2: Notify robot about Paper Jam */}
            <button
              onClick={() => onPaperJam?.()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400/70 text-amber-100 font-bold shadow-xl transition active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>Paper Jammed / Stuck?</span>
            </button>
          </div>

          <div className="text-[11px] text-white/60 mt-1">
            Auto-continuing in <strong>{autoAdvanceRemaining}s</strong> if already collected
          </div>
        </div>
      ) : (
        onDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFinished(true);
            }}
            className="mt-6 px-5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-medium transition active:scale-95 shadow"
          >
            Skip to Finish
          </button>
        )
      )}
    </div>
  );
};

// 5b. PAPER JAM RECOVERY VIEW (Alternate screen when paper jam is reported)
export const PaperJamRecoveryView: React.FC<
  ViewProps & { chosenPhoto?: string; onResolved?: () => void }
> = ({ deviceIdiom = 'pad', chosenPhoto, onResolved }) => {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, title: 'Sensor Diagnostic', desc: 'Detecting dispenser paper position' },
    { id: 2, title: 'Paper Retraction', desc: 'Gently retracting jammed sheet into clearance tray' },
    { id: 3, title: 'Roller Calibration', desc: 'Cleaning feed rollers & realigning print ribbon' },
    { id: 4, title: 'Thermal Reprint', desc: 'Dispensing fresh souvenir photo print' },
  ];

  useEffect(() => {
    // Speak calming reassurance to the guest
    NikiSpeechService.shared.speak(
      "Please hold on for just a second! I'm retracting the paper and preparing a fresh print for you right now.",
      'CONCERNED'
    );

    const startTime = Date.now();
    const duration = 6500; // 6.5s recovery process
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 25) setActiveStep(1);
      else if (pct < 55) setActiveStep(2);
      else if (pct < 85) setActiveStep(3);
      else setActiveStep(4);

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          onResolved?.();
        }, 600);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onResolved]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-6 sm:p-8 select-none overflow-hidden">
      {/* Top Banner Alert */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 backdrop-blur-sm text-amber-200">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
            Printer Jam Detected • Auto-Recovery Active
          </span>
        </div>
        <span className="text-xs font-mono bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-md">
          {progress}%
        </span>
      </div>

      {/* Center Main Stage Content */}
      <div className="my-auto flex flex-col items-center text-center max-w-lg w-full">
        {/* Animated Printer Mechanical Recovery Visual */}
        <div className="relative mb-4 w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-amber-500/10 border-2 border-amber-400/30 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900/90 border border-amber-400/50 flex items-center justify-center shadow-2xl">
            <Printer className="w-10 h-10 text-amber-300" />
            <RotateCcw className="w-6 h-6 text-teal-300 absolute -top-2 -right-2 animate-spin duration-1000" />
          </div>
          {/* Animated paper moving upward (retracting) */}
          <div className="absolute -bottom-1 w-12 h-6 bg-white/90 rounded-t shadow-md border border-slate-300 animate-bounce" />
        </div>

        <h1 className="font-bold text-white drop-shadow text-2xl sm:text-3xl md:text-4xl">
          Hold on just a moment! ⚠️
        </h1>

        <p className="mt-2 text-teal-100 text-sm sm:text-base max-w-md">
          Please be patient while Niki gently retracts the stuck paper, clears the feed rollers, and automatically prints a fresh souvenir photo.
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-md h-3 bg-white/20 rounded-full overflow-hidden mt-4 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-teal-300 to-emerald-400 transition-all duration-150 ease-out rounded-full shadow-[0_0_12px_#fbbf24]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step-by-step indicator cards */}
        <div className="mt-5 w-full grid grid-cols-2 gap-2 text-left">
          {steps.map((st) => {
            const isDone = activeStep > st.id || progress === 100;
            const isCurrent = activeStep === st.id && progress < 100;

            return (
              <div
                key={st.id}
                className={`p-2.5 rounded-xl border text-xs transition ${
                  isCurrent
                    ? 'bg-amber-500/20 border-amber-400/80 text-white shadow-lg'
                    : isDone
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-900/40 border-slate-700/50 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <RotateCcw className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center text-[9px] shrink-0">
                      {st.id}
                    </span>
                  )}
                  <span className="truncate">{st.title}</span>
                </div>
                <div className="text-[10px] opacity-80 truncate">{st.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer & Skip Option */}
      <div className="w-full flex items-center justify-between pt-2 text-xs text-white/70">
        <span className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-teal-300" />
          <span>Automatic paper jam clearing protocol</span>
        </span>

        {onResolved && (
          <button
            onClick={onResolved}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition active:scale-95"
          >
            Fast-forward to Ready
          </button>
        )}
      </div>
    </div>
  );
};

// 6. PRINT SUCCESS VIEW matching PrintSuccessView.swift
export const PrintSuccessView: React.FC<
  ViewProps & { chosenPhoto?: string; onFinish?: () => void }
> = ({ deviceIdiom = 'pad', chosenPhoto, onFinish }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onFinish?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="w-full h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 select-none cursor-pointer"
    >
      <div className="text-4xl sm:text-5xl mb-3">🎉</div>

      {chosenPhoto && (
        <div className="relative mb-4 w-48 h-36 sm:w-60 sm:h-44 rounded-2xl overflow-hidden border-4 border-white shadow-2xl p-1 bg-white">
          <img src={chosenPhoto} alt="Souvenir photo" className="w-full h-full object-cover rounded-xl" />
          <div className="absolute bottom-2 inset-x-2 bg-[#006564]/95 py-1 text-[11px] font-bold text-white rounded shadow">
            Cathay Pacific Souvenir
          </div>
        </div>
      )}

      <h1 className="font-bold text-white drop-shadow text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
        Print success!
      </h1>
      <p className="mt-3 text-white/90 text-base sm:text-lg md:text-xl font-medium">
        Please collect your souvenir print from the tray below.
      </p>

      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white/90 text-xs sm:text-sm border border-white/20">
        <span>Returning to start in <strong>{secondsRemaining}s</strong></span>
        <span className="text-white/40">•</span>
        <span className="text-white/70">Tap anywhere to finish now</span>
      </div>
    </div>
  );
};

// 7. GOODBYE VIEW matching GoodbyeView.swift with automatic reset back to IDLE
export const GoodbyeView: React.FC<ViewProps & { onComplete?: () => void }> = ({
  deviceIdiom = 'pad',
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      onClick={onComplete}
      className="w-full h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 select-none cursor-pointer"
    >
      <div className="text-4xl sm:text-5xl mb-4">✈️</div>

      <h1 className="font-bold text-white drop-shadow text-3xl sm:text-4xl md:text-5xl">
        Have a wonderful journey!
      </h1>

      <p className="mt-3 text-white/85 text-base sm:text-lg max-w-md">
        Thank you for visiting Cathay Pacific. Resetting kiosk for the next guest...
      </p>

      <div className="mt-8 flex items-center gap-3 text-white/60 text-xs sm:text-sm">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span>Returning to home screen...</span>
      </div>
    </div>
  );
};

// 8. THINKING VIEW matching ThinkingView.swift
export const ThinkingView: React.FC<ViewProps> = () => {
  return (
    <div className="w-full h-full flex flex-col justify-between select-none animate-pulse p-6 sm:p-8 md:p-12">
      <div className="space-y-4 pt-4">
        <div className="h-12 w-3/4 bg-white/30 rounded-xl" />
        <div className="h-16 w-1/2 bg-white/20 rounded-xl" />
      </div>

      <div className="w-full flex justify-center py-6">
        <div className="h-14 w-60 bg-white/30 rounded-2xl" />
      </div>

      <div className="flex justify-end pb-2">
        <div className="h-6 w-20 bg-white/20 rounded-lg" />
      </div>
    </div>
  );
};
