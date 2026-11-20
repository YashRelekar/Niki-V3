import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Sparkles, ArrowRight, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';

interface CameraViewProps {
  onPhotoSubmitted: (dataUrl: string) => void;
  onFinishSession?: (photos: string[]) => void;
  cameraUUID?: string;
  onCancel?: () => void;
}

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

  // Countdown timer
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

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Live Viewfinder Area */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden bg-slate-950">
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
          <div className="relative w-full h-full flex items-center justify-center">
            <canvas ref={simCanvasRef} className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-teal-900/80 backdrop-blur-md border border-teal-500/40 text-teal-200 text-xs flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Simulated Camera Viewfinder Active</span>
            </div>
          </div>
        )}

        {lastShotFlash && (
          <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
              {/* Attention halo — state change, one gentle pulse per digit */}
              <span className="absolute w-32 h-32 rounded-full bg-white/10 animate-ping" />
              <span className="relative text-9xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] tabular-nums">
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Framing Crosshair Overlay */}
        <div className="absolute inset-8 pointer-events-none border border-white/15 rounded-3xl flex items-center justify-center">
          <div className="w-16 h-16 border border-teal-400/40 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping" />
          </div>
        </div>

        {/* Top Info Banner */}
        <div className="absolute top-4 inset-x-0 flex items-center justify-between px-6 z-30">
          <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/20">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE PREVIEW</span>
          </div>

          <div className="px-4 py-1.5 rounded-full bg-teal-950/80 backdrop-blur-md text-teal-200 text-xs font-bold border border-teal-700/50 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>{capturedPhotos.length} Photo{capturedPhotos.length === 1 ? '' : 's'} Taken</span>
          </div>
        </div>
      </div>

      {/* Bottom Shutter & Multi-Photo Control Strip */}
      <div className="w-full bg-slate-950/95 border-t border-white/10 px-6 py-4 flex flex-col gap-3 z-30">
        {capturedPhotos.length > 0 && (
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              <span className="text-xs text-white/60 font-medium flex-shrink-0">
                Session Photos:
              </span>
              {capturedPhotos.map((p, i) => (
                <div
                  key={i}
                  className="relative w-12 h-10 rounded-lg overflow-hidden border-2 border-teal-400 flex-shrink-0 shadow-md group"
                >
                  <img src={p} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold bg-black/80 px-1 rounded text-teal-300">
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Finish & Proceed to Selection Button */}
            <button
              onClick={handleFinish}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-white/95 active:scale-[0.97] text-[#006564] font-bold text-sm flex items-center gap-2 shadow-lg transition flex-shrink-0"
            >
              <span>Next: Review (<span className="tabular-nums">{capturedPhotos.length}</span>)</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Primary Controls Bar */}
        <div className="flex items-center justify-between max-w-xl mx-auto w-full">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-white/70 hover:text-white text-xs font-semibold hover:bg-white/10 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={triggerCountdownAndCapture}
              disabled={isCapturing}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-[0.97] disabled:opacity-50"
              title="3-Second Timer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Timer (3s)</span>
            </button>

            <button
              onClick={executeCapture}
              disabled={isCapturing}
              className="group relative w-18 h-18 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 active:scale-90 transition-all flex items-center justify-center shadow-2xl disabled:opacity-50"
              title="Capture Photo"
            >
              <div className="w-12 h-12 rounded-full bg-white transition-transform group-hover:scale-90 group-active:scale-75 shadow" />
            </button>

            {capturedPhotos.length > 0 && (
              <button
                onClick={executeCapture}
                disabled={isCapturing}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-[0.97] text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Take Another Photo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Take Another</span>
              </button>
            )}
          </div>

          {!hasPermission && (
            <button
              onClick={startCamera}
              className="text-xs text-teal-400 hover:text-teal-300 underline underline-offset-4"
              title="Retry WebCam"
            >
              Retry Camera
            </button>
          )}

          {hasPermission && <div className="w-14" />}
        </div>
      </div>
    </div>
  );
};
