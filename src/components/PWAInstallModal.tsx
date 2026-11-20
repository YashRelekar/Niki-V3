import React, { useEffect, useState } from 'react';
import { Smartphone, Share2, PlusSquare, Download, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PWA Install & Offline readiness studio modal (Dev Mode only).
 * - Standalone installation status
 * - Android/Chromium one-tap "Install App" (beforeinstallprompt)
 * - iOS Safari "Share -> Add to Home Screen" visual guide
 * - Service Worker / offline cache readiness
 * - Live connectivity badge
 */
export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { canInstall, isInstalled, installApp } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [swReady, setSwReady] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [installOutcome, setInstallOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const checkSW = async () => {
      if (!('serviceWorker' in navigator)) {
        setSwReady('unavailable');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!cancelled) setSwReady(reg || navigator.serviceWorker.controller ? 'ready' : 'checking');
        if (!reg) {
          // Give the auto-registering SW a moment to appear.
          setTimeout(async () => {
            const reg2 = await navigator.serviceWorker.getRegistration().catch(() => undefined);
            if (!cancelled) setSwReady(reg2 || navigator.serviceWorker.controller ? 'ready' : 'unavailable');
          }, 1500);
        }
      } catch {
        if (!cancelled) setSwReady('unavailable');
      }
    };
    checkSW();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-teal-800/60 rounded-2xl shadow-2xl text-slate-100 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="font-bold text-white text-sm">PWA Install & Offline</h2>
              <p className="text-[11px] text-slate-400">Standalone kiosk installation status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Installation Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-medium text-slate-300">Running mode</span>
            {isInstalled ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4" /> Standalone (installed)
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-300">Browser tab (not installed)</span>
            )}
          </div>

          {/* Connectivity badge (subtle, non-intrusive) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-medium text-slate-300">Connectivity</span>
            <span className={`text-xs font-semibold ${isOnline ? 'text-emerald-300' : 'text-slate-400'}`}>
              {isOnline ? 'Online' : 'Offline — using local simulator & cache'}
            </span>
          </div>

          {/* Service Worker readiness */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-medium text-slate-300">Offline cache (Service Worker)</span>
            <span className={`text-xs font-semibold ${swReady === 'ready' ? 'text-emerald-300' : swReady === 'checking' ? 'text-teal-300' : 'text-amber-300'}`}>
              {swReady === 'ready' ? 'Active & caching' : swReady === 'checking' ? 'Checking…' : 'Not available'}
            </span>
          </div>

          {/* Android / Chromium one-tap install */}
          {canInstall ? (
            <button
              onClick={async () => setInstallOutcome(await installApp())}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Install App</span>
            </button>
          ) : (
            !isInstalled && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                One-tap install is unavailable in this browser. On Android/Chromium it appears automatically once the
                install criteria are met; on iOS use the guide below.
              </div>
            )
          )}

          {installOutcome && (
            <div className="text-[11px] text-teal-300">
              {installOutcome === 'accepted' ? 'Install prompt accepted — check your home screen.' : 'Install prompt dismissed.'}
            </div>
          )}

          {/* iOS Safari step-by-step guide */}
          {(isIOS || !canInstall) && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-white">Install on iPhone / iPad (Safari)</span>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600/30 border border-teal-600/60 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Open this page in <strong className="text-white">Safari</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600/30 border border-teal-600/60 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span className="flex items-center gap-1.5 flex-wrap">Tap the <Share2 className="w-3.5 h-3.5 inline text-teal-300" /> <strong className="text-white">Share</strong> button</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600/30 border border-teal-600/60 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  <span className="flex items-center gap-1.5 flex-wrap">Scroll and tap <PlusSquare className="w-3.5 h-3.5 inline text-teal-300" /> <strong className="text-white">Add to Home Screen</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600/30 border border-teal-600/60 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                  <span>Tap <strong className="text-white">Add</strong> — NIKI Kiosk launches full-screen & offline-capable</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
