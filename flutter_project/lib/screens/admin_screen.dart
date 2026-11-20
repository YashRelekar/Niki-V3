import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/niki_models.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({Key? key}) : super(key: key);

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final NikiApiService _apiService = NikiApiService();

  @override
  void initState() {
    super.initState();
    _apiService.addListener(_onUpdate);
  }

  @override
  void dispose() {
    _apiService.removeListener(_onUpdate);
    super.dispose();
  }

  void _onUpdate() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final buttons = _apiService.buttons;
    final messages = _apiService.messages;

    return Scaffold(
      backgroundColor: const Color(0xFF1E293B),
      appBar: AppBar(
        title: const Text('NIKI Admin Console'),
        backgroundColor: const Color(0xFF0F172A),
        actions: [
          Row(
            children: [
              Text(
                _apiService.isOffline ? 'Offline Mode' : 'Online Mode',
                style: const TextStyle(fontSize: 12),
              ),
              Switch(
                value: !_apiService.isOffline,
                onChanged: (val) => _apiService.toggleOfflineMode(!val),
                activeColor: Colors.tealAccent,
              ),
            ],
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // High level state text matching Admin.swift
            Text(
              _apiService.stateLabel,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.tealAccent),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),

            // Turn / pending tool
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Turn: ${_apiService.turn}', style: const TextStyle(color: Colors.white70)),
                if (_apiService.pendingToolName != null) ...[
                  const SizedBox(width: 16),
                  Text('Pending tool: ${_apiService.pendingToolName}', style: const TextStyle(color: Colors.amberAccent)),
                ],
              ],
            ),
            const Divider(color: Colors.white24, height: 32),

            // Admin Actions
            if (buttons.isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Admin actions', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: buttons.map((b) {
                  return ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => _apiService.handleUserInput(b.response),
                    child: Text(b.text),
                  );
                }).toList(),
              ),
            ] else ...[
              const Text('No admin actions required right now.', style: TextStyle(color: Colors.white38, fontSize: 12)),
            ],

            const Divider(color: Colors.white24, height: 32),

            // Conversation log
            Expanded(
              child: ListView.separated(
                itemCount: messages.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 70,
                        child: Text(
                          msg.role.toUpperCase(),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: msg.role == 'tool' ? Colors.amberAccent : Colors.tealAccent,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          msg.content ?? '',
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
