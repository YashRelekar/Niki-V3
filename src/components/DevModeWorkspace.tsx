import React, { useState, useEffect } from 'react';
import { BackendStatePayload, KioskStateType, SavedPhoto } from '../types';
import { localStore } from '../services/storage';
import { AdminConsole } from './AdminConsole';
import { MeteorBackground } from './MeteorBackground';
import {
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Database,
  Download,
  Layers,
  Monitor,
  Camera,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  ChevronRight,
  RefreshCw,
  LogOut,
} from 'lucide-react';

interface DevModeWorkspaceProps {
  backendState: BackendStatePayload;
  currentKioskState: KioskStateType;
  onTransitionState: (state: KioskStateType) => void;
  isOffline: boolean;
  onToggleOffline: (val: boolean) => void;
  isTtsEnabled: boolean;
  onToggleTts: () => void;
  onOpenVoiceModal: () => void;
  onOpenStorageModal: () => void;
  onOpenPWAModal: () => void;
  onExitDevMode: () => void;
  photoCount: number;
  renderKioskContent: () => React.ReactNode;
  refreshPhotoCount: () => Promise<void>;
}

const STAGES: Array<{ id: KioskStateType; label: string; short: string }> = [
  { id: 'IDLE', label: '1. Idle', short: 'Idle' },
  { id: 'DETECT_PRESENCE', label: '2. Presence', short: 'Presence' },
  { id: 'WAIT_FOR_USER_ENGAGEMENT', label: '3. Invite', short: 'Invite' },
  { id: 'CAPTURE_PHOTOS', label: '4. Camera', short: 'Camera' },
  { id: 'WAIT_FOR_USER_CHOOSE_PHOTO', label: '5. Select', short: 'Select' },
  { id: 'PRINT_PHOTO', label: '6. Printing', short: 'Printing' },
  { id: 'PAPER_JAM_RECOVERY', label: '6b. Jam Recovery', short: 'Jam' },
  { id: 'PRINT_SUCCESS', label: '7. Success', short: 'Success' },
  { id: 'GOODBYE', label: '8. Goodbye', short: 'Goodbye' },
];

export const DevModeWorkspace: React.FC<DevModeWorkspaceProps> = ({
  backendState,
  currentKioskState,
  onTransitionState,
  isOffline,
  onToggleOffline,
  isTtsEnabled,
  onToggleTts,
  onOpenVoiceModal,
  onOpenStorageModal,
  onOpenPWAModal,
  onExitDevMode,
  photoCount,
  renderKioskContent,
  refreshPhotoCount,
}) => {
  const [subView, setSubView] = useState<'admin' | 'kiosk' | 'split'>('admin');
  const [storedPhotos, setStoredPhotos] = useState<SavedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<SavedPhoto | null>(null);

  // Load photos from local storage for in-frame dev inspection
  const loadStoredPhotos = async () => {
    try {
      const photos = await localStore.getAllPhotos();
      setStoredPhotos(photos);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStoredPhotos();
  }, [photoCount, currentKioskState]);

  const handleDeletePhoto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await localStore.deletePhoto(id);
    await refreshPhotoCount();
    await loadStoredPhotos();
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
  };

  const handleClearAllPhotos = async () => {
    await localStore.clearAllPhotos();
    await refreshPhotoCount();
    await loadStoredPhotos();
    setSelectedPhoto(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* Dev Mode Frame Header: Flyer Kiosk Toggles, Voice, Speaker, Online Sync, Local Storage, Platform */}
      <div className="shrink-0 bg-slate-900 border-b border-teal-900/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-10">
        {/* Left: View Mode Toggles (Flyer Kiosk / Admin Console / Split Dual) */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-teal-900/50">
          <button
            onClick={() => setSubView('kiosk')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              subView === 'kiosk'
                ? 'bg-teal-600 text-white shadow'
                : 'text-teal-300/70 hover:text-white'
            }`}
            title="View live Flyer Kiosk inside Dev workspace"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Flyer Kiosk</span>
          </button>
          <button
            onClick={() => setSubView('admin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              subView === 'admin'
                ? 'bg-teal-600 text-white shadow'
                : 'text-teal-300/70 hover:text-white'
            }`}
            title="View Admin Console"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </button>
          <button
            onClick={() => setSubView('split')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              subView === 'split'
                ? 'bg-teal-600 text-white shadow'
                : 'text-teal-300/70 hover:text-white'
            }`}
            title="Split Dual View (Kiosk & Admin)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dual View</span>
          </button>
        </div>

        {/* Right Tools: Voice, Speaker, Online Sync, Local Storage, Platform */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Feminine Voice Profile Selector */}
          <button
            onClick={onOpenVoiceModal}
            className="px-2.5 py-1 rounded-lg bg-teal-950/70 hover:bg-teal-900 active:scale-[0.97] text-teal-200 border border-teal-700/50 text-xs font-medium flex items-center gap-1.5 transition"
            title="Configure Niki's Voice Profile (Google UK English Female / Samantha)"
          >
            <Sparkles className="w-3 h-3 text-teal-300" />
            <span>Voice</span>
          </button>

          {/* Sound / TTS Toggle */}
          <button
            onClick={onToggleTts}
            className={`p-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1 ${
              isTtsEnabled
                ? 'bg-teal-600/30 text-teal-200 border-teal-500/40 hover:bg-teal-600/50'
                : 'bg-slate-900 text-teal-500 border-teal-900 hover:text-teal-300'
            }`}
            title={isTtsEnabled ? 'TTS Audio Active' : 'TTS Muted'}
          >
            {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Online Sync / Offline Mode Toggle */}
          <button
            onClick={() => onToggleOffline(!isOffline)}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
              isOffline
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
            }`}
            title="Toggle Offline Storage vs Online Remote Sync"
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3 h-3 text-emerald-400" />
                <span>Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 text-teal-400 animate-pulse" />
                <span>Online</span>
              </>
            )}
          </button>

          {/* Local Data Storage Modal Trigger */}
          <button
            onClick={onOpenStorageModal}
            className="px-2.5 py-1 rounded-xl bg-teal-950/70 hover:bg-teal-900 text-teal-200 border border-teal-700/50 text-xs font-medium flex items-center gap-1.5 transition"
            title="Open Local Storage & Cache Manager"
          >
            <Database className="w-3 h-3 text-teal-400" />
            <span>Storage</span>
            {photoCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-teal-500 text-teal-950 font-bold text-[10px] flex items-center justify-center">
                {photoCount}
              </span>
            )}
          </button>

          {/* Platform: PWA Install & Offline Readiness */}
          <button
            onClick={onOpenPWAModal}
            className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition"
            title="Install as standalone PWA & check offline readiness"
          >
            <Download className="w-3 h-3" />
            <span>PWA Install</span>
          </button>

          {/* Exit back to fullscreen flyer User Mode */}
          <button
            onClick={onExitDevMode}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-white/90 active:scale-95 text-[#006564] font-bold text-xs flex items-center gap-1.5 shadow transition"
            title="Exit Dev / User View"
          >
            <LogOut className="w-3 h-3" />
            <span>User View</span>
          </button>
        </div>
      </div>

      {/* Interactive State Machine Stepper: 8 stages */}
      <div className="shrink-0 bg-slate-900/60 border-b border-teal-900/30 px-3 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[11px] font-semibold text-teal-400/90 whitespace-nowrap shrink-0 flex items-center gap-1">
          <Sliders className="w-3 h-3" />
          <span>Stage Machine:</span>
        </span>
        <div className="flex items-center gap-1">
          {STAGES.map((s) => {
            const isActive = currentKioskState === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onTransitionState(s.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400'
                    : 'bg-slate-950/60 text-teal-300/70 hover:bg-slate-800 hover:text-white border border-teal-900/40'
                }`}
                title={`Transition State Machine to ${s.label}`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dev Center Area: Admin, Kiosk, or Split */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        {subView === 'admin' && (
          <div className="w-full h-full p-2 sm:p-3 overflow-y-auto min-h-0">
            <AdminConsole statePayload={backendState} />
          </div>
        )}

        {subView === 'kiosk' && (
          <div className="w-full h-full relative bg-[#006564] overflow-hidden flex flex-col">
            <MeteorBackground color="#ffffff" opacity={0.4} />
            <div className="relative z-10 w-full h-full flex flex-col">
              {renderKioskContent()}
            </div>
          </div>
        )}

        {subView === 'split' && (
          <div className="w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-teal-900/40 overflow-hidden min-h-0 overflow-y-auto md:overflow-hidden">
            {/* Left / Top: Kiosk Screen */}
            <div className="flex-1 min-h-[360px] relative bg-[#006564] overflow-hidden flex flex-col">
              <MeteorBackground color="#ffffff" opacity={0.4} />
              <div className="relative z-10 w-full h-full flex flex-col">
                {renderKioskContent()}
              </div>
            </div>

            {/* Right / Bottom: Admin Console */}
            <div className="flex-1 p-2 bg-slate-950/90 overflow-y-auto flex flex-col min-h-0">
              <AdminConsole statePayload={backendState} />
            </div>
          </div>
        )}
      </div>

      {/* Photos in Storage Quick Inspector Strip */}
      <div className="shrink-0 bg-slate-900 border-t border-teal-900/40 px-3 py-1.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[11px] font-semibold text-teal-300 flex items-center gap-1 whitespace-nowrap">
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>Photos in Storage ({storedPhotos.length}):</span>
          </span>

          {storedPhotos.length === 0 ? (
            <span className="text-[11px] text-slate-500 italic">No photos stored yet. Take photos in Camera state.</span>
          ) : (
            <div className="flex items-center gap-1.5">
              {storedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative w-7 h-7 rounded-md overflow-hidden border border-teal-700/60 hover:border-teal-400 cursor-pointer transition shrink-0"
                  title={`Photo #${idx + 1} (${new Date(photo.timestamp).toLocaleTimeString()})`}
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => handleDeletePhoto(photo.id, e)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {storedPhotos.length > 0 && (
          <button
            onClick={handleClearAllPhotos}
            className="text-[11px] text-red-400/80 hover:text-red-300 hover:underline whitespace-nowrap flex items-center gap-1 shrink-0"
            title="Clear all stored photos"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Photos</span>
          </button>
        )}
      </div>

      {/* Quick Photo Modal if thumbnail clicked */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-teal-700 rounded-2xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-white">Stored Photo Details</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="my-3 rounded-xl overflow-hidden border border-slate-700 aspect-[4/3] bg-black flex items-center justify-center">
              <img
                src={selectedPhoto.dataUrl}
                alt="Selected"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Captured: {new Date(selectedPhoto.timestamp).toLocaleString()}</span>
              <button
                onClick={(e) => handleDeletePhoto(selectedPhoto.id, e)}
                className="px-3 py-1 rounded-lg bg-red-950 text-red-300 border border-red-800 hover:bg-red-900"
              >
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
