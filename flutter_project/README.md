# NIKI Cathay Photo Booth Companion (Flutter)

A cross-platform Flutter recreation of the native SwiftUI **Cathay Thing / NIKI** photo booth and admin system, architected for deployment across **iOS (iPad & iPhone)** and **Android (Tablets & Phones)**.

## Key Features

1. **Seamless Cross-Platform (iOS & Android)**: Runs on both platforms using Flutter 3.x with uniform native look and feel matching the Cathay Pacific teal aesthetic (`#006564`).
2. **Offline Functionality & Local Storage**:
   - Uses **Hive** key-value and binary storage for offline persistence of captured photos, session logs, and settings.
   - Built-in **Offline Sync Queue**: actions performed while disconnected (photos taken, user choices, admin overrides) are queued locally and synchronized once connectivity to `https://niki2.evnchn.io` is established.
3. **Hardware Integrations**:
   - **Front-Facing Camera** with programmatic shutter triggers from backend UUID events (`event_uuids['camera_taking_event']`).
   - **Text-to-Speech (TTS)** using `flutter_tts` with emotion-based pitch and rate mapping (Happy, Sad, Confused).
   - **Custom Canvas Meteor Shower**: Recreating the SwiftUI `MeteorBackground` particle physics.
   - **Custom Airplane Slider**: Interactive scroll controller with draggable airplane thumb.
4. **Complete State Machine**:
   - `IDLE`: Sleeping face `(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ`
   - `DETECT_PRESENCE`: "Hello, flyer! Come closer!"
   - `WAIT_FOR_USER_ENGAGEMENT`: "Let's start!" / "No thanks"
   - `CAPTURE_PHOTOS`: Front camera preview with 3s timer and manual/remote shutter.
   - `WAIT_FOR_USER_CHOOSE_PHOTO`: Multi-card gallery with Airplane scrollbar.
   - `PRINT_PHOTO`: Monologue about VLM, SLAM, LoRAs, and MCP.
   - `PRINT_SUCCESS`: Celebration screen.
   - `Admin Screen`: Full admin controls matching `Admin.swift`.

---

## Getting Started

### 1. Prerequisites
- Flutter SDK `>=3.0.0`
- Android Studio / Xcode

### 2. Install Dependencies
```bash
cd flutter_project
flutter pub get
```

### 3. Run on Devices

**Android:**
```bash
flutter run -d android
```

**iOS:**
```bash
cd ios && pod install && cd ..
flutter run -d ios
```

---

## Platform Permissions Configured

- **Android** (`android/app/src/main/AndroidManifest.xml`):
  - `android.permission.CAMERA`
  - `android.permission.RECORD_AUDIO`
  - `android.permission.INTERNET`
  - `android.permission.WRITE_EXTERNAL_STORAGE`

- **iOS** (`ios/Runner/Info.plist`):
  - `NSCameraUsageDescription`: "Camera access is needed to take souvenir photos with Niki."
  - `NSMicrophoneUsageDescription`: "Microphone access for voice interaction."
  - `NSSpeechRecognitionUsageDescription`: "Speech synthesis and interaction."
