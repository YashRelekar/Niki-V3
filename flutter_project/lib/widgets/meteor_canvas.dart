import 'dart:math' as math;
import 'package:flutter/material.dart';

class Meteor {
  final DateTime birth;
  final double lifetime; // seconds
  final Offset start;
  final Offset direction; // normalized
  final double speed;
  final double length;
  final double thickness;
  final Color color;

  Meteor({
    required this.birth,
    required this.lifetime,
    required this.start,
    required this.direction,
    required this.speed,
    required this.length,
    required this.thickness,
    required this.color,
  });
}

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
  final List<Meteor> _meteors = [];
  DateTime _lastSpawn = DateTime.fromMillisecondsSinceEpoch(0);
  final math.Random _rng = math.Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _updateMeteors(Size size) {
    final now = DateTime.now();

    // Remove expired
    _meteors.removeWhere(
      (m) => now.difference(m.birth).inMilliseconds / 1000.0 > m.lifetime,
    );

    // Spawn logic matching slower smooth parameters
    final interval = 0.3 + _rng.nextDouble() * 0.5;
    if (now.difference(_lastSpawn).inMilliseconds / 1000.0 >= interval) {
      _lastSpawn = now;

      // Bottom-right to top-left: dx: -1, dy: -1 normalized
      const dirX = -0.70710678;
      const dirY = -0.70710678;

      final startX = _rng.nextDouble() * 1.35 * size.width;
      final startY = (1.0 + _rng.nextDouble() * 0.35) * size.height;

      _meteors.add(
        Meteor(
          birth: now,
          lifetime: 8.5 + _rng.nextDouble() * 4.5,
          start: Offset(startX, startY),
          direction: const Offset(dirX, dirY),
          speed: 70.0 + _rng.nextDouble() * 65.0,
          length: 140.0 + _rng.nextDouble() * 200.0,
          thickness: 1.6 + _rng.nextDouble() * 1.4,
          color: widget.color,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: widget.opacity,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final size = Size(constraints.maxWidth, constraints.maxHeight);
              _updateMeteors(size);
              return CustomPaint(
                size: size,
                painter: _MeteorPainter(meteors: _meteors),
              );
            },
          );
        },
      ),
    );
  }
}

class _MeteorPainter extends CustomPainter {
  final List<Meteor> meteors;

  _MeteorPainter({required this.meteors});

  @override
  void paint(Canvas canvas, Size size) {
    final now = DateTime.now();

    for (final m in meteors) {
      final age = now.difference(m.birth).inMilliseconds / 1000.0;
      if (age < 0 || age > m.lifetime) continue;

      final progress = (age / m.lifetime).clamp(0.0, 1.0);
      final fadeIn = (age / 1.2).clamp(0.0, 1.0);
      final fadeOut = ((m.lifetime - age) / 2.0).clamp(0.0, 1.0);
      final alpha = (fadeIn * fadeOut).clamp(0.0, 1.0);

      if (alpha <= 0.0) continue;

      final headX = m.start.dx + m.direction.dx * m.speed * age;
      final headY = m.start.dy + m.direction.dy * m.speed * age;
      final head = Offset(headX, headY);

      final tailLength = m.length * (1.0 - progress * 0.45);
      final tailX = headX - m.direction.dx * tailLength;
      final tailY = headY - m.direction.dy * tailLength;
      final tail = Offset(tailX, tailY);

      final paint = Paint()
        ..strokeWidth = m.thickness
        ..strokeCap = StrokeCap.round
        ..shader = LinearGradient(
          colors: [
            m.color.withOpacity(0.0),
            m.color.withOpacity(0.35 * (1.0 - progress * 0.45) * alpha),
            m.color.withOpacity(0.95 * alpha),
          ],
          stops: const [0.0, 0.4, 1.0],
        ).createShader(Rect.fromPoints(tail, head));

      canvas.drawLine(tail, head, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MeteorPainter oldDelegate) => true;
}
