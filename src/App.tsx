/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { backendService } from './services/backend';
import { localStore } from './services/storage';
import { NikiSpeechService } from './services/tts';
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
import { UserDevSlider } from './components/UserDevSlider';
import { DevModeWorkspace } from './components/DevModeWorkspace';
import { StorageManagerModal } from './components/StorageManagerModal';
import { FlutterExportModal } from './components/FlutterExportModal';
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
  const [showFlutterModal, setShowFlutterModal] = useState(false);
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
  const handlePrimaryInvite = () => {
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
            onWakeUp={() => backendService.transitionKioskState('DETECT_PRESENCE')}
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
              "The weather looks great today.\nWouldn't you want to take a picture?"
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
            onWakeUp={() => backendService.transitionKioskState('DETECT_PRESENCE')}
          />
        );
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#001213] flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden font-sans">
      {/* Top-Right Floating User / Dev Mode Slider */}
      <UserDevSlider mode={previewMode} onChange={setPreviewMode} />

      {/* Main iPad Device Frame */}
      <div className="relative w-full max-w-5xl h-full max-h-[760px] rounded-3xl border-8 border-slate-900 ring-2 ring-teal-700/50 shadow-2xl overflow-hidden bg-[#006564] flex flex-col">
        {/* MODE 1: USER MODE (Clean Customer Kiosk Experience inside Frame) */}
        {previewMode === 'user' && (
          <div className="relative w-full h-full overflow-hidden flex flex-col">
            {/* Cathay Canvas Meteor Shower Background */}
            <MeteorBackground color="#ffffff" opacity={0.4} />

            {/* Kiosk Content Overlay */}
            <div className="relative z-10 w-full h-full flex flex-col">
              {renderKioskContent()}
            </div>
          </div>
        )}

        {/* MODE 2: DEV MODE (Entire Frame interior is replaced by Developer & Admin Studio) */}
        {previewMode === 'dev' && (
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
            onOpenFlutterModal={() => setShowFlutterModal(true)}
            photoCount={photoCount}
            renderKioskContent={renderKioskContent}
            refreshPhotoCount={refreshPhotoCount}
          />
        )}
      </div>

      {/* Modals Accessible from Dev Mode */}
      <StorageManagerModal
        isOpen={showStorageModal}
        onClose={() => {
          setShowStorageModal(false);
          refreshPhotoCount();
        }}
      />

      <FlutterExportModal
        isOpen={showFlutterModal}
        onClose={() => setShowFlutterModal(false)}
      />

      <VoiceSettingsModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />
    </div>
  );
}
