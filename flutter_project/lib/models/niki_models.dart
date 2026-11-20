import 'dart:convert';

enum KioskStateType {
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

  Map<String, dynamic> toJson() => {
    'type': type,
    'src': src,
    'emoji': emoji,
    'text': text,
    'state': state.name,
    'photos': photos,
  };
}

class BackendMessage {
  final String id;
  final String role;
  final String? content;

  BackendMessage({
    required this.id,
    required this.role,
    this.content,
  });

  factory BackendMessage.fromJson(Map<String, dynamic> json) {
    return BackendMessage(
      id: json['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
      role: json['role'] as String? ?? '',
      content: json['content'] as String?,
    );
  }
}

class ToolButton {
  final String text;
  final String response;

  ToolButton({required this.text, required this.response});
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

  factory CapturedPhoto.fromMap(Map<dynamic, dynamic> map) => CapturedPhoto(
    id: map['id'] as String,
    timestamp: DateTime.parse(map['timestamp'] as String),
    base64Data: map['base64Data'] as String,
    synced: map['synced'] as bool? ?? false,
  );
}

class SyncQueueItem {
  final String id;
  final String actionType;
  final Map<String, dynamic> payload;
  final DateTime timestamp;

  SyncQueueItem({
    required this.id,
    required this.actionType,
    required this.payload,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'actionType': actionType,
    'payload': payload,
    'timestamp': timestamp.toIso8601String(),
  };

  factory SyncQueueItem.fromMap(Map<dynamic, dynamic> map) => SyncQueueItem(
    id: map['id'] as String,
    actionType: map['actionType'] as String,
    payload: Map<String, dynamic>.from(map['payload'] as Map),
    timestamp: DateTime.parse(map['timestamp'] as String),
  );
}
