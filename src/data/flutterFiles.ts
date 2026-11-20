export interface FlutterFile {
  path: string;
  name: string;
  category: 'config' | 'dart' | 'android' | 'ios' | 'docs';
  content: string;
}

export const FLUTTER_FILES: FlutterFile[] = [
  {
    path: 'pubspec.yaml',
    name: 'pubspec.yaml',
    category: 'config',
    content: `name: niki_cathay_kiosk
description: "Recreation of NIKI Cathay Photo Booth companion in Flutter for iOS and Android with offline local storage, camera capture, airplane slider, and TTS audio."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

  # UI and Icons
  cupertino_icons: ^1.0.6

  # Camera & Image Capture
  camera: ^0.10.5+9
  image: ^4.1.7

  # Offline Local Data Storage
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  path_provider: ^2.1.2

  # Text-to-Speech (TTS)
  flutter_tts: ^3.8.5

  # Network & Backend Polling
  http: ^1.2.0

  # Utilities
  uuid: ^4.3.3
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  hive_generator: ^2.0.1
  build_runner: ^2.4.8

flutter:
  uses-material-design: true
`,
  },
  {
    path: 'lib/main.dart',
    name: 'main.dart',
    category: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'services/local_storage_service.dart';
import 'services/tts_service.dart';
import 'screens/kiosk_screen.dart';
import 'screens/admin_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  // Initialize offline local storage & TTS
  await LocalStorageService().init();
  await TtsService().init();

  runApp(const NikiApp());
}

class NikiApp extends StatelessWidget {
  const NikiApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NIKI Photo Booth',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF006564),
        fontFamily: 'GT Walsheim Trial',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF006564),
          brightness: Brightness.dark,
        ),
      ),
      home: const MainRoot(),
    );
  }
}

class MainRoot extends StatefulWidget {
  const MainRoot({Key? key}) : super(key: key);

  @override
  State<MainRoot> createState() => _MainRootState();
}

class _MainRootState extends State<MainRoot> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tabIndex,
        children: const [
          KioskScreen(),
          AdminScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tabIndex,
        onTap: (i) => setState(() => _tabIndex = i),
        backgroundColor: const Color(0xFF003837),
        selectedItemColor: Colors.white,
        unselectedItemColor: Colors.white54,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.camera_outlined),
            activeIcon: Icon(Icons.camera),
            label: 'Flyer Kiosk',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.admin_panel_settings_outlined),
            activeIcon: Icon(Icons.admin_panel_settings),
            label: 'Admin Console',
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/models/niki_models.dart',
    name: 'niki_models.dart',
    category: 'dart',
    content: `enum KioskStateType {
  IDLE,
  DETECT_PRESENCE,
  WAIT_FOR_USER_ENGAGEMENT,
  CAPTURE_PHOTOS,
  WAIT_FOR_USER_CHOOSE_PHOTO,
  PRINT_PHOTO,
  PRINT_SUCCESS,
  GOODBYE,
  THINKING
}

class NikiUIState {
  final String type;
  final String? src;
  final String? emoji;
  final String? text;
  final KioskStateType state;
  final List<String> photos;

  NikiUIState({
    required this.type,
    this.src,
    this.emoji,
    this.text,
    required this.state,
    this.photos = const [],
  });

  factory NikiUIState.fromJson(Map<String, dynamic> json) {
    KioskStateType stateEnum = KioskStateType.IDLE;
    final stateStr = json['state'] as String? ?? 'IDLE';

    for (var s in KioskStateType.values) {
      if (s.name == stateStr) {
        stateEnum = s;
        break;
      }
    }

    return NikiUIState(
      type: json['type'] as String? ?? 'display',
      src: json['src'] as String?,
      emoji: json['emoji'] as String?,
      text: json['text'] as String?,
      state: stateEnum,
      photos: (json['photos'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class CapturedPhoto {
  final String id;
  final DateTime timestamp;
  final String base64Data;
  final bool synced;

  CapturedPhoto({
    required this.id,
    required this.timestamp,
    required this.base64Data,
    this.synced = false,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'timestamp': timestamp.toIso8601String(),
    'base64Data': base64Data,
    'synced': synced,
  };
}
`,
  },
  {
    path: 'lib/services/local_storage_service.dart',
    name: 'local_storage_service.dart',
    category: 'dart',
    content: `import 'package:hive_flutter/hive_flutter.dart';
import '../models/niki_models.dart';

class LocalStorageService {
  static final LocalStorageService _instance = LocalStorageService._internal();
  factory LocalStorageService() => _instance;
  LocalStorageService._internal();

  static const String photosBoxName = 'niki_photos_box';
  static const String queueBoxName = 'niki_sync_queue_box';
  static const String settingsBoxName = 'niki_settings_box';

  late Box<dynamic> _photosBox;
  late Box<dynamic> _queueBox;
  late Box<dynamic> _settingsBox;

  Future<void> init() async {
    await Hive.initFlutter();
    _photosBox = await Hive.openBox(photosBoxName);
    _queueBox = await Hive.openBox(queueBoxName);
    _settingsBox = await Hive.openBox(settingsBoxName);
  }

  Future<void> savePhoto(CapturedPhoto photo) async {
    await _photosBox.put(photo.id, photo.toMap());
  }

  bool get isOfflineMode => _settingsBox.get('isOfflineMode', defaultValue: true) as bool;
  set isOfflineMode(bool val) => _settingsBox.put('isOfflineMode', val);
}
`,
  },
  {
    path: 'lib/widgets/meteor_canvas.dart',
    name: 'meteor_canvas.dart',
    category: 'dart',
    content: `import 'dart:math' as math;
import 'package:flutter/material.dart';

class MeteorBackgroundWidget extends StatefulWidget {
  final Color color;
  final double opacity;

  const MeteorBackgroundWidget({
    Key? key,
    this.color = Colors.white,
    this.opacity = 0.4,
  }) : super(key: key);

  @override
  State<MeteorBackgroundWidget> createState() => _MeteorBackgroundWidgetState();
}

class _MeteorBackgroundWidgetState extends State<MeteorBackgroundWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<dynamic> _meteors = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: widget.opacity,
      child: CustomPaint(
        painter: _MeteorPainter(),
        size: Size.infinite,
      ),
    );
  }
}

class _MeteorPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Draws slower, serene meteors gliding smoothly from bottom-right to top-left (speed ~70-135 px/s)
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
`,
  },
  {
    path: 'lib/widgets/airplane_slider.dart',
    name: 'airplane_slider.dart',
    category: 'dart',
    content: `import 'package:flutter/material.dart';

class AirplaneSlider extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final ValueChanged<double> onChanged;

  const AirplaneSlider({
    Key? key,
    required this.progress,
    required this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalWidth = constraints.maxWidth;
        const thumbSize = 44.0;
        final currentX = progress.clamp(0.0, 1.0) * (totalWidth - thumbSize);

        return GestureDetector(
          onHorizontalDragUpdate: (details) {
            final p = (details.localPosition.dx / totalWidth).clamp(0.0, 1.0);
            onChanged(p);
          },
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              Container(height: 4, color: Colors.white30),
              Positioned(
                left: currentX,
                child: const Icon(Icons.airplanemode_active, color: Colors.white, size: 28),
              ),
            ],
          ),
        );
      },
    );
  }
}
`,
  },
  {
    path: 'lib/screens/kiosk_screen.dart',
    name: 'kiosk_screen.dart',
    category: 'dart',
    content: `import 'package:flutter/material.dart';
import '../models/niki_models.dart';
import '../services/api_service.dart';
import '../services/tts_service.dart';
import '../widgets/meteor_canvas.dart';
import '../widgets/airplane_slider.dart';

class KioskScreen extends StatefulWidget {
  const KioskScreen({Key? key}) : super(key: key);

  @override
  State<KioskScreen> createState() => _KioskScreenState();
}

class _KioskScreenState extends State<KioskScreen> {
  final NikiApiService _apiService = NikiApiService();
  final ScrollController _scrollController = ScrollController();
  double _sliderProgress = 0.0;
  int? _selectedPhotoIndex;

  @override
  Widget build(BuildContext context) {
    const brandTeal = Color(0xFF006564);
    final uiState = _apiService.uiState;

    return Scaffold(
      backgroundColor: brandTeal,
      body: Stack(
        children: [
          const MeteorBackgroundWidget(opacity: 0.4),
          SafeArea(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: _buildCurrentView(uiState),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentView(NikiUIState uiState) {
    switch (uiState.state) {
      case KioskStateType.IDLE:
        return const Center(
          child: Text('(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ', style: TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Colors.white)),
        );
      case KioskStateType.DETECT_PRESENCE:
        return const Center(
          child: Text('Hello, flyer!\\nCome closer!', textAlign: TextAlign.center, style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.white)),
        );
      case KioskStateType.WAIT_FOR_USER_ENGAGEMENT:
        return _buildInviteView(uiState);
      default:
        return const Center(child: Text('NIKI Kiosk', style: TextStyle(color: Colors.white)));
    }
  }

  Widget _buildInviteView(NikiUIState uiState) {
    final welcome = uiState.text ?? "The weather looks great today.\\nWouldn't you want to take a picture?";

    return LayoutBuilder(
      builder: (context, constraints) {
        return Padding(
          padding: EdgeInsets.symmetric(
            horizontal: constraints.maxWidth > 600 ? 40.0 : 20.0,
            vertical: constraints.maxHeight > 600 ? 32.0 : 16.0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  welcome,
                  style: TextStyle(
                    fontSize: constraints.maxWidth > 600 ? 36 : 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  'Welcome! \\nTake a photo with me!',
                  style: TextStyle(
                    fontSize: constraints.maxWidth > 600 ? 26 : 18,
                    color: Colors.white70,
                  ),
                ),
              ),
              const Spacer(),
              Center(
                child: SizedBox(
                  width: constraints.maxWidth > 600 ? 280 : 220,
                  height: constraints.maxHeight > 600 ? 60 : 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF006564),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: () => _apiService.handleUserInput('yes'),
                    child: const Text("Let's start!", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const Spacer(),
              Align(
                alignment: Alignment.bottomRight,
                child: TextButton(
                  onPressed: () => _apiService.handleUserInput('no'),
                  child: const Text('No thanks', style: TextStyle(color: Colors.white70, fontSize: 16)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'android',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.cathay.niki.kiosk">

    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:label="Niki Kiosk"
        android:usesCleartextTraffic="true">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`,
  },
  {
    path: 'ios/Runner/Info.plist',
    name: 'Info.plist',
    category: 'ios',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key>
	<string>niki_cathay_kiosk</string>
	<key>NSCameraUsageDescription</key>
	<string>Camera access is required to take souvenir photos with Niki.</string>
	<key>NSMicrophoneUsageDescription</key>
	<string>Microphone access is required for interactive voice commands.</string>
</dict>
</plist>`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'docs',
    content: `# NIKI Cathay Photo Booth Companion (Flutter)

A cross-platform Flutter recreation of the native SwiftUI Cathay Thing / NIKI photo booth and admin system.

## Setup & Running

1. Install dependencies:
   \`\`\`bash
   flutter pub get
   \`\`\`

2. Run on Android:
   \`\`\`bash
   flutter run -d android
   \`\`\`

3. Run on iOS:
   \`\`\`bash
   cd ios && pod install && cd ..
   flutter run -d ios
   \`\`\`
`,
  },
];
