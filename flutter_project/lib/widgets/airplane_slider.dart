import 'package:flutter/material.dart';

class AirplaneSlider extends StatefulWidget {
  final double progress; // 0.0 to 1.0
  final ValueChanged<double> onChanged;

  const AirplaneSlider({
    Key? key,
    required this.progress,
    required this.onChanged,
  }) : super(key: key);

  @override
  State<AirplaneSlider> createState() => _AirplaneSliderState();
}

class _AirplaneSliderState extends State<AirplaneSlider> {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalWidth = constraints.maxWidth;
        const thumbSize = 44.0;
        final availableWidth = (totalWidth - thumbSize).clamp(1.0, double.infinity);
        final currentX = widget.progress.clamp(0.0, 1.0) * availableWidth;

        return GestureDetector(
          onHorizontalDragUpdate: (details) {
            final localX = (details.localPosition.dx - thumbSize / 2).clamp(0.0, availableWidth);
            final newProgress = localX / availableWidth;
            widget.onChanged(newProgress.clamp(0.0, 1.0));
          },
          child: Container(
            height: 50,
            color: Colors.transparent, // expand hit test
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                // Track
                Container(
                  height: 4,
                  width: totalWidth,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Airplane Thumb
                Positioned(
                  left: currentX,
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.15),
                    ),
                    child: Transform.rotate(
                      angle: 1.570796, // 90 deg clockwise to point directly to the right
                      child: const Icon(
                        Icons.airplanemode_active,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
