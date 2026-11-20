import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
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

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    await Hive.initFlutter();
    _photosBox = await Hive.openBox(photosBoxName);
    _queueBox = await Hive.openBox(queueBoxName);
    _settingsBox = await Hive.openBox(settingsBoxName);
    _initialized = true;
  }

  // --- Photos Storage ---

  Future<void> savePhoto(CapturedPhoto photo) async {
    await _photosBox.put(photo.id, photo.toMap());
  }

  List<CapturedPhoto> getAllPhotos() {
    final list = <CapturedPhoto>[];
    for (var key in _photosBox.keys) {
      final map = _photosBox.get(key);
      if (map is Map) {
        list.add(CapturedPhoto.fromMap(map));
      }
    }
    list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return list;
  }

  Future<void> deletePhoto(String id) async {
    await _photosBox.delete(id);
  }

  // --- Offline Sync Queue ---

  Future<void> enqueueSyncItem(String actionType, Map<String, dynamic> payload) async {
    final item = SyncQueueItem(
      id: 'sync_${DateTime.now().millisecondsSinceEpoch}',
      actionType: actionType,
      payload: payload,
      timestamp: DateTime.now(),
    );
    await _queueBox.put(item.id, item.toMap());
  }

  List<SyncQueueItem> getSyncQueue() {
    final list = <SyncQueueItem>[];
    for (var key in _queueBox.keys) {
      final map = _queueBox.get(key);
      if (map is Map) {
        list.add(SyncQueueItem.fromMap(map));
      }
    }
    return list;
  }

  Future<void> removeQueueItem(String id) async {
    await _queueBox.delete(id);
  }

  // --- Offline Settings & Mode ---

  bool get isOfflineMode => _settingsBox.get('isOfflineMode', defaultValue: true) as bool;
  set isOfflineMode(bool val) => _settingsBox.put('isOfflineMode', val);

  String get backendHost => _settingsBox.get('backendHost', defaultValue: 'niki2.evnchn.io') as String;
  set backendHost(String val) => _settingsBox.put('backendHost', val);

  Future<void> clearAll() async {
    await _photosBox.clear();
    await _queueBox.clear();
  }
}
