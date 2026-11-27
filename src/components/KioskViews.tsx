import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Sparkles,
  Printer,
  ArrowRight,
  Plane,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Wrench,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';
import { AirplaneSlider } from './AirplaneSlider';
import { ScrambleText } from './ScrambleText';
import { NikiSpeechService } from '../services/tts';
import {
  IDLE_SCRIPT,
  PRESENCE_SCRIPT,
  INVITE_SCRIPT,
  PRINTING_MONOLOGUE_LINES,
  PRINTING_STAGE_SCRIPT,
  PRINT_SUCCESS_SCRIPT,
  PAPER_JAM_REASSURANCE,
  PAPER_JAM_SCRIPT,
  GOODBYE_SCRIPT,
} from '../data/scripts';

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
        className="font-bold tracking-tight transition-transform duration-300 text-5xl sm:text-6xl md:text-7xl lg:text-8xl animate-niki-breathe"
      >
        {IDLE_SCRIPT.kaomoji}
      </div>
      <p className="mt-6 whitespace-pre-line text-white/85 text-sm sm:text-base md:text-lg font-medium k-enter k-d2">
        {IDLE_SCRIPT.status}
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
      <h1 className="font-bold leading-tight drop-shadow-md text-3xl sm:text-4xl md:text-5xl lg:text-6xl k-enter">
        <ScrambleText text={PRESENCE_SCRIPT.headline} />
      </h1>
      <h2 className="mt-4 font-normal text-white/90 leading-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl k-enter k-d2">
        <ScrambleText text={PRESENCE_SCRIPT.sub} delay={160} />
      </h2>
      <div className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-deep border border-teal-800/80 text-teal-100 text-xs sm:text-sm shadow-lg k-enter k-d3">
        <Sparkles className="w-4 h-4 text-teal-300" />
        <span>{PRESENCE_SCRIPT.cta}</span>
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
  primaryActionTitle = INVITE_SCRIPT.primaryButton,
  secondaryActionTitle = INVITE_SCRIPT.secondaryButton,
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
        <h1 className="font-bold whitespace-pre-line leading-tight text-2xl sm:text-3xl md:text-4xl lg:text-[42px] drop-shadow-sm k-enter">
          <ScrambleText text={welcomeText} />
        </h1>

        <h2 className="font-normal text-white/90 whitespace-pre-line leading-snug text-lg sm:text-xl md:text-2xl lg:text-[28px] k-enter k-d2">
          <ScrambleText text={INVITE_SCRIPT.welcomeSub} delay={160} />
        </h2>
      </div>

      {/* Primary Action Button (Centered with comfortable sizing) */}
      <div className="w-full flex flex-col items-center justify-center my-auto py-4 k-enter k-d3">
        <button
          onClick={handleStart}
          disabled={loadingNext}
          className="w-full max-w-xs sm:max-w-sm py-4 px-8 rounded-2xl bg-white text-brand font-bold text-center tracking-wide shadow-2xl hover:bg-white/95 active:scale-[0.97] transition-[transform,background-color] flex items-center justify-center gap-3 text-lg sm:text-xl md:text-2xl"
        >
          <span>{primaryActionTitle}</span>
          <ArrowRight className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Footer Secondary Action */}
      <div className="flex justify-end pt-2 k-enter k-d4">
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
      {/* Header — information only; the action lives in the bottom bar */}
      <div className="space-y-1 k-enter">
        <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl">
          <ScrambleText text="Choose your photo" />
        </h1>
        <p className="text-white/80 text-base sm:text-lg md:text-xl">
          <ScrambleText
            text="Tap a photo below to select it for souvenir printing."
            delay={120}
          />
        </p>
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
                className={`relative flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden transition-[transform,border-color,opacity] duration-200 border-4 ${
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
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg bg-black/80 text-white font-bold text-xs tabular-nums">
                  Photo #{index + 1}
                </div>

                {/* Selection Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-brand flex items-center justify-center shadow-lg border-2 border-white k-pop">
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

      {/* Bottom Action Bar — thumb-reachable primary CTA */}
      <div className="w-full flex items-center justify-between gap-4 pt-1 k-enter k-d3">
        <div className="text-xs sm:text-sm text-teal-200/90 font-medium min-w-0">
          Selected: <strong className="text-white">Photo #{selectedIndex + 1}</strong> of {photoURLs.length}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white text-sm sm:text-base font-medium transition"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleSelect}
            disabled={photoURLs.length === 0 || loadingNext}
            className="py-3 sm:py-3.5 px-6 sm:px-8 rounded-2xl font-bold transition shadow-xl bg-white text-brand hover:bg-white/95 active:scale-[0.97] text-base sm:text-lg md:text-xl flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-5 h-5 text-brand" />
            <span>Print Photo #<span className="tabular-nums">{selectedIndex + 1}</span></span>
          </button>
        </div>
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

  useEffect(() => {
    // TTS auto-starts immediately on mount when entering PRINT_PHOTO.
    // The session is unlocked by the earlier user wake tap; there are NO
    // user-facing playback controls — narration stops automatically when
    // the guest moves on, the component unmounts, or the monologue completes.
    NikiSpeechService.shared.speak(PRINTING_MONOLOGUE_LINES.join('\n'), 'HAPPY');

    // Auto-progress print job over 4.2 seconds
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
    if (progress < 30) return PRINTING_STAGE_SCRIPT[0];
    if (progress < 75) return PRINTING_STAGE_SCRIPT[1];
    if (progress < 100) return PRINTING_STAGE_SCRIPT[2];
    return 'Souvenir photo dispensed in tray below.';
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 select-none"
    >
      {/* Printed Photo Preview Animation */}
      {chosenPhoto ? (
        <div className={`relative mb-5 w-44 h-32 sm:w-56 sm:h-40 rounded-2xl overflow-hidden border-4 bg-slate-900 k-enter ${isFinished ? 'border-white shadow-2xl' : 'border-white/70 shadow-xl'}`}>
          <img src={chosenPhoto} alt="Printing preview" className="w-full h-full object-cover" />
          {!isFinished && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 animate-niki-sweep">
                <div className="absolute inset-x-0 top-[4%] h-1.5 bg-teal-300 rounded-full" />
              </div>
            </div>
          )}
          {isFinished && (
            <>
              <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg k-pop">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              {/* One-shot completion sheen */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="k-sheen absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-deep border border-teal-800/60 flex items-center justify-center mb-5 k-enter">
          <Printer className="w-10 h-10 sm:w-12 sm:h-12 text-teal-300" />
        </div>
      )}

      {/* Main Headline */}
      {!isFinished ? (
        <h1 className="font-bold drop-shadow text-3xl sm:text-4xl md:text-5xl text-white">
          Printing… {progress}%
        </h1>
      ) : (
        <div className="space-y-1">
          <h1 className="font-bold drop-shadow text-3xl sm:text-4xl md:text-5xl text-white flex items-center justify-center gap-2">
            <ScrambleText text={PRINT_SUCCESS_SCRIPT.finishedHeadline} />
          </h1>
          <p className="text-teal-100 text-base sm:text-lg font-medium">
            {PRINT_SUCCESS_SCRIPT.trayLine}
          </p>
        </div>
      )}
      {/* Printing Progress Bar */}
      <div className="w-64 sm:w-80 h-3 bg-black/30 rounded-full overflow-hidden mt-4 shadow-inner">
        <div
          className={`h-full w-full origin-left transition-transform duration-150 ease-out rounded-full ${
            isFinished
              ? 'bg-gradient-to-r from-teal-300 to-emerald-400'
              : 'bg-gradient-to-r from-teal-300 via-teal-400 to-emerald-400'
          }`}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

        {!isFinished && (
          <p className="mt-3 text-teal-200/90 text-xs sm:text-sm font-medium">
            {getStageDescription()}
          </p>
        )}

      {/* Once Progress Completes: 2 Clear Options for the User */}
      {isFinished ? (
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-lg k-enter k-d2">
          <div className="text-sm text-teal-100 font-semibold">
            How does your print look?
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            {/* Option 1: Move on normally */}
            <button
              onClick={() => onDone?.()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-brand hover:bg-white/95 font-bold shadow-xl transition active:scale-[0.97] flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span className="whitespace-nowrap">Photo received, move on!</span>
            </button>

            {/* Option 2: Notify robot about Paper Jam */}
            <button
              onClick={() => onPaperJam?.()}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold shadow-xl transition active:scale-[0.97] flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-800" />
              <span className="whitespace-nowrap">Paper Jammed / Stuck?</span>
            </button>
          </div>

          <div className="text-xs text-white/80 mt-1 tabular-nums">
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
            className="mt-6 px-5 py-2 rounded-lg bg-brand-deep hover:bg-brand-dark border border-teal-800/70 text-teal-100 text-xs sm:text-sm font-medium transition active:scale-[0.97] shadow"
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

  const steps = PAPER_JAM_SCRIPT.steps;

  // Continuous fill of the threaded stage track: 3 gaps between 4 circles.
  // intraStage = how far through the current stage's progress band we are.
  const intraStage =
    progress < 25
      ? progress / 25
      : progress < 55
      ? (progress - 25) / 30
      : progress < 85
      ? (progress - 55) / 30
      : (progress - 85) / 15;
  const stageFillPct = Math.min(100, Math.max(0, ((activeStep - 1) + intraStage) / 3 * 100));

  useEffect(() => {
    // Speak Niki's calming reassurance to the guest (CONCERNED emotion).
    NikiSpeechService.shared.speak(PAPER_JAM_REASSURANCE, 'CONCERNED');

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
      <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-400 text-amber-950 shadow-xl k-enter">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-amber-900 animate-ping shrink-0" />
          <span className="text-sm sm:text-base font-bold">
            {PAPER_JAM_SCRIPT.banner}
          </span>
        </div>
        <span className="text-xs font-mono bg-amber-950/20 text-amber-950 px-2 py-0.5 rounded-lg tabular-nums">
          {progress}%
        </span>
      </div>

      {/* Center Main Stage Content */}
      <div className="my-auto flex flex-col items-center text-center max-w-lg w-full k-enter k-d2">
        {/* Animated Printer Mechanical Recovery Visual */}
        <div className="relative mb-4 w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center k-enter">
          <div className="absolute inset-0 rounded-3xl bg-brand-deep border-2 border-amber-400/50" />
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-amber-400/50 flex items-center justify-center">
            <Printer className="w-10 h-10 text-amber-300" />
            <RotateCcw className="w-6 h-6 text-teal-300 absolute -top-2 -right-2 animate-spin duration-1000" />
          </div>
          {/* Animated paper moving upward (retracting) */}
          <div className="absolute -bottom-1 w-12 h-6 bg-white/90 rounded-t shadow-md border border-slate-300 animate-pulse" />
        </div>

        <h1 className="font-bold text-white drop-shadow text-2xl sm:text-3xl md:text-4xl">
          {PAPER_JAM_SCRIPT.headline}
        </h1>

        <p className="mt-2 text-teal-100 text-sm sm:text-base max-w-md">
          {PAPER_JAM_SCRIPT.body}
        </p>

        {/* Stage stepper: 4 large circles with the progress bar threading
            through them — one hover-free glance shows where recovery is */}
        <div className="mt-2 w-full max-w-lg k-enter k-d3">
          <div className="relative">
            {/* Threaded track + fill, spanning circle centers */}
            <div className="absolute top-7 sm:top-8 left-[12.5%] right-[12.5%] h-1.5 rounded-full bg-black/30 -translate-y-1/2">
              <div
                className="h-full w-full origin-left rounded-full bg-amber-400 transition-transform duration-200 ease-out"
                style={{ transform: `scaleX(${stageFillPct / 100})` }}
              />
            </div>

            <div className="relative grid grid-cols-4">
              {steps.map((st) => {
                const isDone = activeStep > st.id || progress === 100;
                const isCurrent = activeStep === st.id && progress < 100;

                return (
                  <div key={st.id} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                        isDone
                          ? 'bg-emerald-500 border-white text-white shadow-lg'
                          : isCurrent
                          ? 'bg-amber-400 border-white text-amber-950 shadow-lg scale-105'
                          : 'bg-brand-deep border-teal-700/70 text-teal-200/70'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                      ) : isCurrent ? (
                        <RotateCcw className="w-6 h-6 animate-spin" />
                      ) : (
                        <span className="font-bold text-base sm:text-lg tabular-nums">{st.id}</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-bold text-center leading-tight ${
                        isCurrent ? 'text-amber-300' : isDone ? 'text-emerald-300' : 'text-white/60'
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What's happening right now, in a sentence */}
          <p className="mt-3 text-center text-xs sm:text-sm text-teal-100/90 min-h-[2.5rem] px-2">
            {steps[Math.min(activeStep, steps.length) - 1]?.desc}
          </p>
        </div>
      </div>

      {/* Footer & Skip Option */}
      <div className="w-full flex items-center justify-between pt-2 text-xs text-white/70">
        <span className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-teal-300" />
          <span>{PAPER_JAM_SCRIPT.footer}</span>
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
      <PartyPopper aria-hidden="true" className="w-12 h-12 sm:w-14 sm:h-14 mb-3 text-teal-100 k-pop" />

      {chosenPhoto && (
        <div className="relative mb-4 w-48 h-36 sm:w-60 sm:h-44 rounded-2xl overflow-hidden border-4 border-white shadow-2xl p-1 bg-white k-enter k-d1">
          <img src={chosenPhoto} alt="Souvenir photo" className="w-full h-full object-cover rounded-xl" />
          <div className="absolute bottom-2 inset-x-2 bg-brand py-1 text-[11px] font-bold text-white rounded-lg shadow">
            {PRINT_SUCCESS_SCRIPT.badge}
          </div>
        </div>
      )}

      <h1 className="font-bold text-white drop-shadow text-3xl sm:text-4xl md:text-5xl lg:text-6xl k-enter k-d2">
        <ScrambleText text={PRINT_SUCCESS_SCRIPT.headline} delay={180} />
      </h1>
      <p className="mt-3 text-white/90 text-base sm:text-lg md:text-xl font-medium k-enter k-d3">
        {PRINT_SUCCESS_SCRIPT.collectLine}
      </p>

      <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-deep border border-teal-800/80 text-teal-100 text-xs sm:text-sm tabular-nums shadow-lg k-enter k-d4">
        <span>{PRINT_SUCCESS_SCRIPT.countdown} <strong>{secondsRemaining}s</strong></span>
        <span className="text-teal-200/80">{PRINT_SUCCESS_SCRIPT.tapToFinish}</span>
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
      <Plane aria-hidden="true" className="w-12 h-12 sm:w-14 sm:h-14 mb-4 text-teal-100 k-enter k-d1" />

      <h1 className="font-bold text-white drop-shadow text-3xl sm:text-4xl md:text-5xl k-enter k-d2">
        <ScrambleText text={GOODBYE_SCRIPT.headline} delay={140} />
      </h1>

      <p className="mt-3 text-white/85 text-base sm:text-lg max-w-md k-enter k-d3">
        {GOODBYE_SCRIPT.body}
      </p>

      <div className="mt-8 flex items-center gap-3 text-white/60 text-xs sm:text-sm k-enter k-d4">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span>{GOODBYE_SCRIPT.footer}</span>
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
