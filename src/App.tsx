/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { backendService } from './services/backend';
import { localStore } from './services/storage';
import { NikiSpeechService } from './services/tts';
import { buildInviteWelcome } from './data/scripts';
import { BackendStatePayload, KioskStateType } from './types';

// Components
import { MeteorBackground } from './components/MeteorBackground';
import { CameraView } from './components/CameraView';
import {
  IdleView,
  InitialView,
  InviteView,
  ImageSelectionView,
  PrintingView,
  PaperJamRecoveryView,
  PrintSuccessView,
  GoodbyeView,
  ThinkingView,
} from './components/KioskViews';
import { DevToggle } from './components/DevToggle';
import { DevModeWorkspace } from './components/DevModeWorkspace';
import { StorageManagerModal } from './components/StorageManagerModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';

export default function App() {
  const [backendState, setBackendState] = useState<BackendStatePayload>({
    turn: 'user',
    state_label: 'Waiting for flyer',
    niki_ui_state: { type: 'display', state: 'IDLE', text: '(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ' },
  });

  // Top-level Mode: 'user' (pristine customer kiosk frame) vs 'dev' (replaces frame interior with dev tools)
  const [previewMode, setPreviewMode] = useState<'user' | 'dev'>('user');

  const [isOffline, setIsOffline] = useState(true);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);

  // Modals
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Subscribe to backend state engine
  useEffect(() => {
    const unsubscribe = backendService.subscribe((state) => {
      setBackendState(state);
    });

    backendService.startPolling(1000);

    // Initial settings
    const settings = localStore.getSettings();
    setIsOffline(settings.isOfflineMode);
    setIsTtsEnabled(settings.autoSpeakTTS);
    NikiSpeechService.shared.setEnabled(settings.autoSpeakTTS);

    // Photo count
    localStore.getAllPhotos().then((photos) => setPhotoCount(photos.length));

    return () => {
      unsubscribe();
      backendService.stopPolling();
    };
  }, []);

  const refreshPhotoCount = useCallback(async () => {
    const photos = await localStore.getAllPhotos();
    setPhotoCount(photos.length);
  }, []);

  // Mode toggles
  const handleToggleOffline = (val: boolean) => {
    setIsOffline(val);
    backendService.setOfflineMode(val);
  };

  const handleToggleTts = () => {
    const next = !isTtsEnabled;
    setIsTtsEnabled(next);
    NikiSpeechService.shared.setEnabled(next);
  };

  // Actions from Kiosk
  const handleWakeUp = () => {
    // Prime/unlock speechSynthesis within this explicit user gesture (iOS policy)
    NikiSpeechService.shared.unlock();
    backendService.transitionKioskState('DETECT_PRESENCE');
  };

  const handlePrimaryInvite = () => {
    // Re-prime the speech context on a primary CTA tap (autoplay policy safety)
    NikiSpeechService.shared.unlock();
    backendService.handleUserInput('yes');
  };

  const handleSecondaryInvite = () => {
    backendService.handleUserInput('no');
  };

  const handleSelectPhoto = async (index: number) => {
    await backendService.handleUserInput(String(index));
    await refreshPhotoCount();
  };

  const handlePhotoCaptured = async (dataUrl: string) => {
    await backendService.savePhoto(dataUrl);
    await refreshPhotoCount();
  };

  const currentKioskState: KioskStateType =
    backendState.niki_ui_state?.state || 'IDLE';

  // Render the current Kiosk screen
  const renderKioskContent = () => {
    switch (currentKioskState) {
      case 'IDLE':
        return (
          <IdleView
            deviceIdiom="pad"
            onWakeUp={handleWakeUp}
          />
        );
      case 'DETECT_PRESENCE':
        return (
          <InitialView
            deviceIdiom="pad"
            onApproach={() =>
              backendService.transitionKioskState('WAIT_FOR_USER_ENGAGEMENT')
            }
          />
        );
      case 'WAIT_FOR_USER_ENGAGEMENT':
        return (
          <InviteView
            deviceIdiom="pad"
            name={localStore.getSettings().demoName || 'Candbot'}
            welcomeText={
              backendState.niki_ui_state?.text ||
              buildInviteWelcome(localStore.getSettings().demoName || 'Candbot')
            }
            onPrimaryAction={handlePrimaryInvite}
            onSecondaryAction={handleSecondaryInvite}
          />
        );
      case 'CAPTURE_PHOTOS':
        return (
          <CameraView
            cameraUUID={backendState.event_uuids?.camera_taking_event || backendState.niki_ui_state?.camera_uuid}
            onPhotoSubmitted={handlePhotoCaptured}
            onFinishSession={() =>
              backendService.transitionKioskState('WAIT_FOR_USER_CHOOSE_PHOTO')
            }
          />
        );
      case 'WAIT_FOR_USER_CHOOSE_PHOTO':
        return (
          <ImageSelectionView
            deviceIdiom="pad"
            photoURLs={backendState.niki_ui_state?.photos || []}
            onSelectPhotoAtIndex={handleSelectPhoto}
          />
        );
      case 'PRINT_PHOTO':
        return (
          <PrintingView
            deviceIdiom="pad"
            chosenPhoto={backendState.niki_ui_state?.chosenPhoto}
            onDone={() =>
              backendService.transitionKioskState('PRINT_SUCCESS')
            }
            onPaperJam={() =>
              backendService.transitionKioskState('PAPER_JAM_RECOVERY')
            }
          />
        );
      case 'PAPER_JAM_RECOVERY':
        return (
          <PaperJamRecoveryView
            deviceIdiom="pad"
            chosenPhoto={backendState.niki_ui_state?.chosenPhoto}
            onResolved={() =>
              backendService.transitionKioskState('PRINT_SUCCESS')
            }
          />
        );
      case 'PRINT_SUCCESS':
        return (
          <PrintSuccessView
            deviceIdiom="pad"
            chosenPhoto={backendState.niki_ui_state?.chosenPhoto}
            onFinish={() => backendService.transitionKioskState('GOODBYE')}
          />
        );
      case 'GOODBYE':
        return (
          <GoodbyeView
            deviceIdiom="pad"
            onComplete={async () => {
              await localStore.clearAllPhotos();
              await refreshPhotoCount();
              // Stop any goodbye narration before returning to the sleeping kiosk
              NikiSpeechService.shared.stop();
              backendService.transitionKioskState('IDLE');
            }}
          />
        );
      case 'THINKING':
        return (
          <ThinkingView
            deviceIdiom="pad"
          />
        );
      default:
        return (
          <IdleView
            deviceIdiom="pad"
            onWakeUp={handleWakeUp}
          />
        );
    }
  };

  return (
    // Edge-to-edge fullscreen: mobile-first, no device bezel. Safe-area aware
    // so it fills iPhone (notch/Dynamic Island), iPad, and Android edge-to-edge
    // when launched from the Home Screen.
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#001213] flex flex-col select-none font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* MODE 1: USER MODE — clean flyer kiosk experience */}
      {previewMode === 'user' && (
        <>
          {/* Discreet corner Dev Mode toggle (staff only) */}
          <DevToggle onEnterDev={() => setPreviewMode('dev')} />

          <div className="relative w-full flex-1 min-h-0 overflow-hidden flex flex-col bg-[#006564]">
            {/* Cathay Canvas Meteor Shower Background */}
            <MeteorBackground color="#ffffff" opacity={0.4} />

            {/* Kiosk Content Overlay */}
            <div className="relative z-10 w-full h-full flex flex-col">
              {renderKioskContent()}
            </div>
          </div>
        </>
      )}

      {/* MODE 2: DEV MODE (full Developer & Admin Studio) */}
      {previewMode === 'dev' && (
        <div className="w-full flex-1 min-h-0 flex flex-col">
          <DevModeWorkspace
            backendState={backendState}
            currentKioskState={currentKioskState}
            onTransitionState={(s) => backendService.transitionKioskState(s)}
            isOffline={isOffline}
            onToggleOffline={handleToggleOffline}
            isTtsEnabled={isTtsEnabled}
            onToggleTts={handleToggleTts}
            onOpenVoiceModal={() => setShowVoiceModal(true)}
            onOpenStorageModal={() => setShowStorageModal(true)}
            onOpenPWAModal={() => setShowPWAModal(true)}
            onExitDevMode={() => setPreviewMode('user')}
            photoCount={photoCount}
            renderKioskContent={renderKioskContent}
            refreshPhotoCount={refreshPhotoCount}
          />
        </div>
      )}

      {/* Modals Accessible from Dev Mode */}
      <StorageManagerModal
        isOpen={showStorageModal}
        onClose={() => {
          setShowStorageModal(false);
          refreshPhotoCount();
        }}
      />

      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
      />

      <VoiceSettingsModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />
    </div>
  );
}
