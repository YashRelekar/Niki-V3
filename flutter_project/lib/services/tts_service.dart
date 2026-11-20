import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  static final TtsService _instance = TtsService._internal();
  factory TtsService() => _instance;
  TtsService._internal();

  final FlutterTts _tts = FlutterTts();
  bool _initialized = false;
  bool isSpeaking = false;
  double basePitch = 1.25; // Feminine vocal pitch baseline

  Future<void> init() async {
    if (_initialized) return;

    await _tts.setLanguage("en-US");
    await _tts.setSpeechRate(0.5);
    await _tts.setPitch(basePitch);

    // Specifically prioritize Google UK English Female and Samantha on iOS & Android
    try {
      final voices = await _tts.getVoices;
      if (voices is List) {
        final femaleVoice = voices.firstWhere(
          (v) {
            final name = (v['name'] ?? '').toString().toLowerCase();
            return name.contains('google uk english female') ||
                name.contains('samantha');
          },
          orElse: () => voices.firstWhere(
            (v) {
              final name = (v['name'] ?? '').toString().toLowerCase();
              return name.contains('female') ||
                  name.contains('victoria') ||
                  name.contains('karen') ||
                  name.contains('zira') ||
                  name.contains('jenny');
            },
            orElse: () => null,
          ),
        );

        if (femaleVoice != null && femaleVoice is Map) {
          await _tts.setVoice({
            "name": femaleVoice["name"].toString(),
            "locale": femaleVoice["locale"]?.toString() ?? "en-US",
          });
        }
      }
    } catch (_) {}

    _tts.setStartHandler(() {
      isSpeaking = true;
    });

    _tts.setCompletionHandler(() {
      isSpeaking = false;
    });

    _tts.setErrorHandler((msg) {
      isSpeaking = false;
    });

    _initialized = true;
  }

  Future<void> speak(String text, {String? emotion}) async {
    if (!_initialized) await init();
    if (text.trim().isEmpty) return;

    await _tts.stop();

    // Feminine emotion-modulated pitch
    final emo = (emotion ?? '').toUpperCase();
    switch (emo) {
      case 'HAPPY':
        await _tts.setSpeechRate(0.52);
        await _tts.setPitch(basePitch * 1.15); // ~1.44
        break;
      case 'SAD':
        await _tts.setSpeechRate(0.42);
        await _tts.setPitch(basePitch * 0.85); // ~1.06
        break;
      case 'CONFUSED':
        await _tts.setSpeechRate(0.51);
        await _tts.setPitch(basePitch * 1.08); // ~1.35
        break;
      default:
        await _tts.setSpeechRate(0.5);
        await _tts.setPitch(basePitch); // 1.25
        break;
    }

    await _tts.speak(text);
  }

  Future<void> stop() async {
    await _tts.stop();
    isSpeaking = false;
  }
}
