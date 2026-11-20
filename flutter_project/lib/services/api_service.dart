import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/niki_models.dart';
import 'local_storage_service.dart';
import 'tts_service.dart';

class NikiApiService extends ChangeNotifier {
  static final NikiApiService _instance = NikiApiService._internal();
  factory NikiApiService() => _instance;
  NikiApiService._internal();

  final LocalStorageService _storage = LocalStorageService();
  final TtsService _tts = TtsService();

  Timer? _pollTimer;
  String? _previousCameraUUID;

  // Current State
  String _turn = 'user';
  String _stateLabel = 'Waiting for user input';
  String? _pendingToolName;
  String? _cameraUUID;
  List<ToolButton> _buttons = [];
  List<BackendMessage> _messages = [];

  NikiUIState _uiState = NikiUIState(
    type: 'display',
    state: KioskStateType.IDLE,
    text: '(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ',
  );

  // Getters
  String get turn => _turn;
  String get stateLabel => _stateLabel;
  String? get pendingToolName => _pendingToolName;
  String? get cameraUUID => _cameraUUID;
  List<ToolButton> get buttons => _buttons;
  List<BackendMessage> get messages => _messages;
  NikiUIState get uiState => _uiState;
  bool get isOffline => _storage.isOfflineMode;

  VoidCallback? onCameraUUIDJump;

  void toggleOfflineMode(bool offline) {
    _storage.isOfflineMode = offline;
    notifyListeners();
  }

  void startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 1), (_) => _pollState());
    _pollState();
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _pollState() async {
    if (_storage.isOfflineMode) {
      // Offline mode: simulated local state machine is self-contained
      return;
    }

    try {
      final host = _storage.backendHost;
      final uri = Uri.parse('https://$host/api/state');
      final res = await http.get(uri, headers: {
        'Cookie': 'api_key=helloworld',
      }).timeout(const Duration(seconds: 3));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        _parseBackendState(data);
        notifyListeners();
      }
    } catch (e) {
      // Network failure: continue offline
    }
  }

  void _parseBackendState(Map<String, dynamic> json) {
    _turn = json['turn'] as String? ?? 'unknown';
    _pendingToolName = json['pending_tool_name'] as String?;

    if (json.containsKey('niki_ui_state')) {
      _uiState = NikiUIState.fromJson(json['niki_ui_state'] as Map<String, dynamic>);
    }

    // Camera UUID
    final eventUuids = json['event_uuids'] as Map<String, dynamic>?;
    final newCamUUID = eventUuids?['camera_taking_event'] as String?;

    if (newCamUUID != null && newCamUUID != _previousCameraUUID) {
      _previousCameraUUID = newCamUUID;
      _cameraUUID = newCamUUID;
      onCameraUUIDJump?.call();
    }

    // Buttons
    if (json.containsKey('button_and_responses')) {
      final bMap = json['button_and_responses'] as Map<String, dynamic>;
      _buttons = bMap.entries
          .map((e) => ToolButton(text: e.key, response: e.value.toString()))
          .toList();
    }

    // Messages & TTS
    if (json.containsKey('master_message_list')) {
      final rawList = json['master_message_list'] as List<dynamic>;
      _messages = rawList.map((m) => BackendMessage.fromJson(m as Map<String, dynamic>)).toList();

      for (var msg in _messages.reversed) {
        if (msg.role == 'tool' && msg.content != null) {
          try {
            final obj = jsonDecode(msg.content!) as Map<String, dynamic>;
            if (obj.containsKey('text')) {
              _tts.speak(obj['text'] as String, emotion: obj['emotion'] as String?);
              break;
            }
          } catch (_) {}
        }
      }
    }
  }

  // --- Offline Simulation Transitions ---

  void transitionOfflineState(KioskStateType newState, {String? customText}) {
    _uiState = NikiUIState(
      type: newState == KioskStateType.WAIT_FOR_USER_CHOOSE_PHOTO ? 'photo_selection' : 'display',
      state: newState,
      text: customText,
    );

    switch (newState) {
      case KioskStateType.IDLE:
        _turn = 'user';
        _stateLabel = 'Waiting for flyer';
        _buttons = [ToolButton(text: 'Simulate Flyer Arrival', response: 'detect_person')];
        break;
      case KioskStateType.DETECT_PRESENCE:
        _turn = 'user';
        _stateLabel = 'Flyer detected';
        _buttons = [ToolButton(text: 'Engage Flyer', response: 'engage')];
        _tts.speak("Hello, flyer! Come closer to take a picture!", emotion: 'HAPPY');
        break;
      case KioskStateType.WAIT_FOR_USER_ENGAGEMENT:
        _turn = 'user';
        _stateLabel = 'Waiting for user input';
        _buttons = [
          ToolButton(text: "Let's start!", response: 'yes'),
          ToolButton(text: 'No thanks', response: 'no'),
        ];
        _tts.speak("The weather looks great today. Wouldn't you want to take a picture?", emotion: 'HAPPY');
        break;
      case KioskStateType.CAPTURE_PHOTOS:
        _turn = 'tool';
        _stateLabel = 'Capturing photos';
        _buttons = [ToolButton(text: 'Trigger Shutter', response: 'capture_now')];
        _tts.speak("Get ready for your photo!", emotion: 'HAPPY');
        break;
      case KioskStateType.WAIT_FOR_USER_CHOOSE_PHOTO:
        _turn = 'user';
        _stateLabel = 'Choose photo';
        _buttons = [ToolButton(text: 'Choose Photo 1', response: '0')];
        _tts.speak("Choose one photo to keep!", emotion: 'HAPPY');
        break;
      case KioskStateType.PRINT_PHOTO:
        _turn = 'ai';
        _stateLabel = 'Printing photo';
        _buttons = [ToolButton(text: 'Complete Print', response: 'print_done')];
        _tts.speak("Printing your photo now! Tap the screen to learn about my robot brain.", emotion: 'HAPPY');
        break;
      case KioskStateType.PRINT_SUCCESS:
        _turn = 'user';
        _stateLabel = 'Print success';
        _buttons = [ToolButton(text: 'Finish', response: 'finish')];
        _tts.speak("Print success! Thank you for flying with us!", emotion: 'HAPPY');
        break;
      case KioskStateType.GOODBYE:
        _turn = 'user';
        _stateLabel = 'Goodbye';
        _buttons = [];
        break;
      case KioskStateType.THINKING:
        _turn = 'ai';
        _stateLabel = 'AI thinking';
        break;
    }

    notifyListeners();
  }

  // User Actions
  Future<void> handleUserInput(String message) async {
    // Record to offline queue
    await _storage.enqueueSyncItem('handle_user_input', {'message': message});

    if (!_storage.isOfflineMode) {
      try {
        final host = _storage.backendHost;
        await http.post(
          Uri.parse('https://$host/api/handle_user_input'),
          headers: {'Content-Type': 'application/json', 'Cookie': 'api_key=helloworld'},
          body: jsonEncode({'message': message}),
        );
      } catch (_) {}
    }

    if (_uiState.state == KioskStateType.WAIT_FOR_USER_ENGAGEMENT) {
      if (message.toLowerCase() == 'yes') {
        transitionOfflineState(KioskStateType.CAPTURE_PHOTOS);
      } else {
        transitionOfflineState(KioskStateType.GOODBYE);
        Future.delayed(const Duration(seconds: 3), () => transitionOfflineState(KioskStateType.IDLE));
      }
    } else if (_uiState.state == KioskStateType.WAIT_FOR_USER_CHOOSE_PHOTO) {
      transitionOfflineState(KioskStateType.PRINT_PHOTO);
    }
  }

  // Save Photo Offline & Sync
  Future<void> savePhoto(String base64Data) async {
    final photo = CapturedPhoto(
      id: 'photo_${DateTime.now().millisecondsSinceEpoch}',
      timestamp: DateTime.now(),
      base64Data: base64Data,
    );

    // Save to Hive offline database
    await _storage.savePhoto(photo);
    await _storage.enqueueSyncItem('save_photo', {'b64url': 'data:image/jpeg;base64,$base64Data'});

    if (!_storage.isOfflineMode) {
      try {
        final host = _storage.backendHost;
        await http.post(
          Uri.parse('https://$host/api/save_photo'),
          headers: {'Content-Type': 'application/json', 'Cookie': 'api_key=helloworld'},
          body: jsonEncode({'b64url': 'data:image/jpeg;base64,$base64Data'}),
        );
      } catch (_) {}
    }

    transitionOfflineState(KioskStateType.WAIT_FOR_USER_CHOOSE_PHOTO);
  }
}
