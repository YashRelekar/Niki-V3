import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, ArrowLeft, ArrowRight, CameraOff } from 'lucide-react';

interface CameraViewProps {
  onPhotoSubmitted: (dataUrl: string) => void;
  onFinishSession?: (photos: string[]) => void;
  cameraUUID?: string;
  onCancel?: () => void;
}

/**
 * CameraView — redesigned capture stage.
 *
 * Solid Cathay-green slide; the live preview sits in a small, centered,
 * white-outlined "video call" window instead of filling the screen.
 * A dismissible instruction card explains the 3-second pose timer before
 * the first shot. Control bar: Back (left) · Shutter (center) · Next (right).
 */
export const CameraView: React.FC<CameraViewProps> = ({
  onPhotoSubmitted,
  onFinishSession,
  cameraUUID,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Use a ref to guarantee we always have the active stream for unmount cleanup
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [lastShotFlash, setLastShotFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const lastUUIDRef = useRef<string | undefined>(cameraUUID);
  const animFrameRef = useRef<number | null>(null);

  // Dedicated function to immediately terminate camera hardware and shut off indicator light
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    setStream(null);
  }, []);

  // 1. Camera initialization
  const startCamera = async () => {
    try {
      setCameraError(null);

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Store in ref for reliable unmount cleanup
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
      }
    } catch (err: any) {
      console.warn('Physical camera unavailable:', err);
      setHasPermission(false);
      setCameraError(err.message || 'Camera permission denied or camera device unavailable');
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
    }
  }, [stream]);

  // Lifecycle: start on mount, completely tear down on unmount
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stopCamera]);

  // 2. Animated simulated viewfinder if hardware webcam is denied/unavailable
  useEffect(() => {
    if (hasPermission === false) {
      const canvas = simCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let tick = 0;
      const renderSim = () => {
        tick += 0.03;
        canvas.width = 640;
        canvas.height = 480;

        const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
        bgGrad.addColorStop(0, '#003837');
        bgGrad.addColorStop(0.5, '#004c4b');
        bgGrad.addColorStop(1, '#002626');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 640, 480);

        // Viewfinder grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(213, 0); ctx.lineTo(213, 480);
        ctx.moveTo(426, 0); ctx.lineTo(426, 480);
        ctx.moveTo(0, 160); ctx.lineTo(640, 160);
        ctx.moveTo(0, 320); ctx.lineTo(640, 320);
        ctx.stroke();

        // Stylized user silhouette
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const headY = 190 + Math.sin(tick) * 4;
        ctx.beginPath();
        ctx.arc(320, headY, 65, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(320, 370 + Math.sin(tick) * 2, 160, 110, 0, Math.PI, 0, true);
        ctx.fill();

        // Face tracking rectangle
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2.5;
        const boxSize = 160;
        const bx = 320 - boxSize / 2;
        const by = headY - 80;

        const cornerLen = 22;
        ctx.beginPath();
        ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerLen, by);
        ctx.moveTo(bx + boxSize - cornerLen, by); ctx.lineTo(bx + boxSize, by); ctx.lineTo(bx + boxSize, by + cornerLen);
        ctx.moveTo(bx, by + boxSize - cornerLen); ctx.lineTo(bx, by + boxSize); ctx.lineTo(bx + cornerLen, by + boxSize);
        ctx.moveTo(bx + boxSize - cornerLen, by + boxSize); ctx.lineTo(bx + boxSize, by + boxSize); ctx.lineTo(bx + boxSize, by + boxSize - cornerLen);
        ctx.stroke();

        ctx.fillStyle = '#2dd4bf';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('FACIAL TRACKING ACTIVE • READY', 320 - 95, by - 12);

        animFrameRef.current = requestAnimationFrame(renderSim);
      };

      renderSim();
    }
  }, [hasPermission]);

  // 3. Capture photo logic
  const executeCapture = useCallback(() => {
    if (isCapturing) return;
    setIsCapturing(true);

    const canvas = canvasRef.current || document.createElement('canvas');
    let dataUrl = '';

    const video = videoRef.current;
    if (video && video.videoWidth > 0 && streamRef.current && streamRef.current.active) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      }
    } else {
      const simCanvas = simCanvasRef.current;
      if (simCanvas) {
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(simCanvas, 0, 0);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Cathay Souvenir Snapshot #${capturedPhotos.length + 1}`, 320, 440);
          dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        }
      }
    }

    if (!dataUrl) {
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#004c4b';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Photo #${capturedPhotos.length + 1}`, 320, 240);
        dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      }
    }

    // Visual flash
    setLastShotFlash(true);
    setTimeout(() => setLastShotFlash(false), 250);

    setCapturedPhotos((prev) => [...prev, dataUrl]);
    onPhotoSubmitted(dataUrl);

    setTimeout(() => {
      setIsCapturing(false);
    }, 400);
  }, [capturedPhotos.length, isCapturing, onPhotoSubmitted]);

  // 3-second countdown, then capture. The digit + its ring are re-keyed each
  // second, so the sweep restarts for every count: 3 sweeps, one per second.
  const triggerCountdownAndCapture = useCallback(() => {
    if (countdown !== null || isCapturing) return;

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          executeCapture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdown, executeCapture, isCapturing]);

  // Watch for backend UUID jump
  useEffect(() => {
    if (cameraUUID && cameraUUID !== lastUUIDRef.current) {
      lastUUIDRef.current = cameraUUID;
      executeCapture();
    }
  }, [cameraUUID, executeCapture]);

  const handleFinish = () => {
    stopCamera();
    if (onFinishSession) {
      onFinishSession(capturedPhotos);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel?.();
  };

  const isAnimating = countdown !== null || isCapturing;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 sm:gap-8 bg-[#006564] overflow-hidden select-none px-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* Centered camera window — small video-call frame, white outline */}
      <div className="relative h-[min(58dvh,500px)] aspect-[4/3] max-w-[94%] rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-[#001314] k-enter k-d1">
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && streamRef.current) {
              el.srcObject = streamRef.current;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            hasPermission ? 'block' : 'hidden'
          }`}
        />

        {!hasPermission && (
          <canvas ref={simCanvasRef} className="w-full h-full object-cover" />
        )}

        {/* LIVE chip on the preview frame */}
        {cameraError && !hasPermission ? (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-[#013030] border border-teal-800/80 text-teal-100 text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            <CameraOff className="w-3.5 h-3.5 text-amber-300" />
            <span>Simulated viewfinder</span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-[#001314] text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE</span>
          </div>
        )}

        {/* Framing crosshair */}
        <div className="absolute inset-4 pointer-events-none border border-white/15 rounded-xl flex items-center justify-center">
          <div className="w-10 h-10 border border-teal-400/40 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping" />
          </div>
        </div>

        {/* Shutter flash */}
        {lastShotFlash && (
          <div className="absolute inset-0 bg-white z-40 pointer-events-none k-flash" />
        )}

        {/* Countdown overlay: digit in a per-second sweep ring */}
        {countdown !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div key={countdown} className="relative flex items-center justify-center">
              <svg
                className="absolute w-36 h-36 -rotate-90"
                viewBox="0 0 160 160"
                aria-hidden="true"
              >
                <circle
                  cx="80" cy="80" r="70" fill="none"
                  stroke="rgba(255,255,255,0.2)" strokeWidth="6"
                />
                <circle
                  cx="80" cy="80" r="70" fill="none"
                  stroke="#2dd4bf" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="440" strokeDashoffset="440"
                  className="k-ring"
                />
              </svg>
              <span className="relative text-8xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] tabular-nums k-pop">
                {countdown}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Encouragement line once a shot exists */}
      <div className="h-5 -mt-2 sm:-mt-3 text-white/85 text-xs sm:text-sm font-medium k-enter">
        {capturedPhotos.length === 0
          ? 'Ready when you are — press the shutter!'
          : 'Saved! Take a few more, or tap Next to choose your favourite.'}
      </div>

      {/* Control bar: Back · Shutter · Next */}
      <div className="w-full max-w-2xl grid grid-cols-3 items-center k-enter k-d2">
        <div className="justify-self-start">
          <button
            onClick={handleCancel}
            disabled={isAnimating}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#013030] border border-teal-800/80 text-teal-100 text-xs sm:text-sm font-semibold hover:bg-[#02403c] active:scale-[0.97] transition shadow-lg disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        <div className="justify-self-center">
          <button
            onClick={triggerCountdownAndCapture}
            disabled={isAnimating}
            aria-label="Take photo (3-second timer)"
            className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 active:scale-90 transition-all flex items-center justify-center shadow-2xl disabled:opacity-50 disabled:active:scale-100"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white transition-transform group-hover:scale-90 group-active:scale-75 shadow" />
          </button>
        </div>

        <div className="justify-self-end">
          <button
            onClick={handleFinish}
            disabled={capturedPhotos.length === 0 || isAnimating}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-white text-[#006564] text-xs sm:text-sm font-bold hover:bg-white/95 active:scale-[0.97] transition shadow-lg disabled:opacity-50 disabled:hover:bg-white"
          >
            <span className="tabular-nums">
              Next{capturedPhotos.length > 1 ? ` (${capturedPhotos.length})` : ''}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Instruction modal — explains the pose timer, dismissible */}
      {showInstructions && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#002626]/95 p-6">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl k-pop">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#006564] flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#013030] leading-tight">
                How to take your photo
              </h2>
            </div>

            <div className="space-y-3 text-[#013030]/90 text-sm sm:text-base leading-relaxed">
              <p>
                When you press the shutter, you'll have{' '}
                <strong>3 seconds</strong> to step back and get into position
                for the shot.
              </p>
              <p>
                Take as many photos as you like — you'll{' '}
                <strong>pick your favourite</strong> on the next screen.
              </p>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3.5 rounded-2xl bg-[#006564] text-white font-bold text-base sm:text-lg hover:bg-[#005554] active:scale-[0.97] transition shadow-lg"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
