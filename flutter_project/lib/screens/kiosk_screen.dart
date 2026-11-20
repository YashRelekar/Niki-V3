import 'dart:convert';
import 'package:flutter/material.dart';
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
  void initState() {
    super.initState();
    _apiService.addListener(_onStateChanged);
    _apiService.startPolling();
  }

  @override
  void dispose() {
    _apiService.removeListener(_onStateChanged);
    _scrollController.dispose();
    super.dispose();
  }

  void _onStateChanged() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    const brandTeal = Color(0xFF006564);
    final uiState = _apiService.uiState;

    return Scaffold(
      backgroundColor: brandTeal,
      body: Stack(
        children: [
          // Background Meteor Shower matching Swift MeteorBackground()
          const MeteorBackgroundWidget(opacity: 0.4),

          // Main Screen Switching based on uiState.state
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
        return _buildIdleView();
      case KioskStateType.DETECT_PRESENCE:
        return _buildDetectPresenceView();
      case KioskStateType.WAIT_FOR_USER_ENGAGEMENT:
        return _buildInviteView(uiState);
      case KioskStateType.CAPTURE_PHOTOS:
        return _buildCameraView();
      case KioskStateType.WAIT_FOR_USER_CHOOSE_PHOTO:
        return _buildPhotoSelectionView(uiState);
      case KioskStateType.PRINT_PHOTO:
        return _buildPrintingView();
      case KioskStateType.PRINT_SUCCESS:
        return _buildPrintSuccessView();
      case KioskStateType.GOODBYE:
        return _buildGoodbyeView();
      case KioskStateType.THINKING:
        return _buildThinkingView();
    }
  }

  // 1. Idle View matching IdleView.swift
  Widget _buildIdleView() {
    return Center(
      child: GestureDetector(
        onTap: () => _apiService.transitionOfflineState(KioskStateType.DETECT_PRESENCE),
        child: const Text(
          '(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ',
          style: TextStyle(
            fontSize: 72,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  // 2. Initial View matching InitialView.swift
  Widget _buildDetectPresenceView() {
    return Center(
      child: GestureDetector(
        onTap: () => _apiService.transitionOfflineState(KioskStateType.WAIT_FOR_USER_ENGAGEMENT),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Text(
              'Hello, flyer!',
              style: TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            SizedBox(height: 16),
            Text(
              'Come closer!',
              style: TextStyle(fontSize: 48, color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }

  // 3. Invite View matching InviteView.swift
  Widget _buildInviteView(NikiUIState uiState) {
    final welcome = uiState.text ?? "The weather looks great today.\nWouldn't you want to take a picture?";

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
                  'Welcome! \nTake a photo with me!',
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
                    child: Text(
                      "Let's start!",
                      style: TextStyle(
                        fontSize: constraints.maxWidth > 600 ? 22 : 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
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

  int _sessionPhotosCount = 0;

  // 4. Camera View (Front camera with shutter & multiple photos)
  Widget _buildCameraView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 500,
            height: 340,
            decoration: BoxDecoration(
              color: Colors.black45,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.tealAccent.withOpacity(0.4), width: 2),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(Icons.camera_alt, size: 80, color: Colors.white70),
                Positioned(
                  top: 16,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Photos taken: $_sessionPhotosCount',
                      style: const TextStyle(color: Colors.tealAccent, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Shutter button (tap to take multiple photos)
              GestureDetector(
                onTap: () {
                  setState(() => _sessionPhotosCount++);
                  _apiService.savePhoto('sample_photo_bytes_$_sessionPhotosCount');
                },
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    color: Colors.white.withOpacity(0.2),
                  ),
                  child: const Center(
                    child: CircleAvatar(backgroundColor: Colors.white, radius: 26),
                  ),
                ),
              ),
              if (_sessionPhotosCount > 0) ...[
                const SizedBox(width: 24),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF006564),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    _apiService.transitionOfflineState(KioskStateType.WAIT_FOR_USER_CHOOSE_PHOTO);
                  },
                  icon: const Icon(Icons.arrow_forward),
                  label: Text('Review Photos ($_sessionPhotosCount)', style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  // 5. Photo Selection View matching ImageSelectionView.swift
  Widget _buildPhotoSelectionView(NikiUIState uiState) {
    final samplePhotos = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    ];
    final selectedIdx = _selectedPhotoIndex ?? 0;

    return Padding(
      padding: const EdgeInsets.all(40.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Choose your photo', style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white)),
                  Text('Tap any photo to select for souvenir print.', style: TextStyle(fontSize: 22, color: Colors.white70)),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF006564),
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => _apiService.handleUserInput('$selectedIdx'),
                icon: const Icon(Icons.print),
                label: Text('Print Photo #${selectedIdx + 1}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const Spacer(),
          // Horizontal List
          SizedBox(
            height: 220,
            child: ListView.separated(
              controller: _scrollController,
              scrollDirection: Axis.horizontal,
              itemCount: samplePhotos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 20),
              itemBuilder: (context, index) {
                final isSelected = _selectedPhotoIndex == index;
                return GestureDetector(
                  onTap: () => setState(() => _selectedPhotoIndex = index),
                  child: Container(
                    width: 320,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? Colors.white : Colors.transparent,
                        width: 4,
                      ),
                      image: DecorationImage(
                        image: NetworkImage(samplePhotos[index]),
                        fit: BoxFit.cover,
                      ),
                    ),
                    child: isSelected
                        ? const Align(
                            alignment: Alignment.topRight,
                            child: Padding(
                              padding: EdgeInsets.all(12),
                              child: CircleAvatar(
                                backgroundColor: Color(0xFF006564),
                                child: Icon(Icons.check, color: Colors.white),
                              ),
                            ),
                          )
                        : null,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
          // Airplane Slider matching custom SF Symbol airplane thumb
          AirplaneSlider(
            progress: _sliderProgress,
            onChanged: (p) {
              setState(() => _sliderProgress = p);
              if (_scrollController.hasClients) {
                final max = _scrollController.position.maxScrollExtent;
                _scrollController.jumpTo(max * p);
              }
            },
          ),
          const Spacer(),
        ],
      ),
    );
  }

  // 6. Printing View matching PrintingView.swift
  Widget _buildPrintingView() {
    return Center(
      child: GestureDetector(
        onTap: () {
          TtsService().speak(
            "Hi! I’m Niki, your friendly little robot. I use a Vision‑Language Model, SLAM, and LoRAs to capture magic photos!",
            emotion: 'HAPPY',
          );
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.print, size: 80, color: Colors.white),
            SizedBox(height: 24),
            Text('Printing...', style: TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Colors.white)),
            SizedBox(height: 16),
            Text('Tap to hear Niki explain its technology!', style: TextStyle(fontSize: 20, color: Colors.white70)),
          ],
        ),
      ),
    );
  }

  // 7. Print Success View
  Widget _buildPrintSuccessView() {
    return Center(
      child: GestureDetector(
        onTap: () => _apiService.transitionOfflineState(KioskStateType.GOODBYE),
        child: const Text('Print success! 🎉', style: TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }

  // 8. Goodbye View
  Widget _buildGoodbyeView() {
    return const Center(
      child: Text('Loading...', style: TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Colors.white)),
    );
  }

  // 9. Thinking View
  Widget _buildThinkingView() {
    return const Center(
      child: CircularProgressIndicator(color: Colors.white),
    );
  }
}
