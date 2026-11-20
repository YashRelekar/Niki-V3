import React, { useState } from 'react';
import { BackendStatePayload, BackendMessage } from '../types';
import { backendService } from '../services/backend';
import { Play, Sparkles, Camera, Printer, CheckCircle2, RotateCcw, Activity, AlertTriangle } from 'lucide-react';

interface AdminConsoleProps {
  statePayload: BackendStatePayload;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ statePayload }) => {
  const [activeTab, setActiveTab] = useState<'console' | 'simulator'>('console');

  const turn = statePayload.turn || 'unknown';
  const stateLabel = statePayload.state_label || statePayload.niki_ui_state?.state || 'Idle';
  const pendingTool = statePayload.pending_tool_name;

  const buttonDict = statePayload.button_and_responses || {};
  const buttons = Object.entries(buttonDict).map(([text, response]) => ({ text, response }));

  const rawMessages = statePayload.master_message_list || [];

  const handleAdminAction = (response: string) => {
    backendService.sendAdminResponse(response);
  };

  const parseMessageContent = (msg: { role: string; content: string }) => {
    if (msg.role === 'tool') {
      try {
        const obj = JSON.parse(msg.content);
        if (obj.text && obj.emotion) {
          return `TTS (${obj.emotion}): ${obj.text}`;
        }
        if (typeof obj.presence_detected === 'boolean') {
          return `Presence detected: ${obj.presence_detected ? 'yes' : 'no'}`;
        }
        if (typeof obj.capture_success === 'boolean') {
          return `Capture success: ${obj.capture_success ? 'yes' : 'no'}`;
        }
        if (typeof obj.print_success === 'boolean') {
          return `Print success: ${obj.print_success ? 'yes' : 'no'}`;
        }
        if (obj.user_input) {
          return `User input: ${obj.user_input}`;
        }
        if (obj.chosen_photo) {
          return `Chosen photo: ${obj.chosen_photo}`;
        }
      } catch {
        // fallback
      }
    }

    if (msg.content.length > 180) {
      return msg.content.substring(0, 180) + '…';
    }
    return msg.content;
  };

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-700/60 shadow-2xl font-sans">
      {/* Console Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            NIKI Admin Console
          </h2>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-800 p-1 rounded-lg text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'console'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Logs & Tools
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'simulator'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual State Stepper
          </button>
        </div>
      </div>

      {/* High-level status bar matching Admin.swift */}
      <div className="py-3 px-4 my-3 bg-slate-800/80 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center shrink-0">
        <div className="text-base font-semibold text-teal-300">
          {stateLabel}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-1 text-xs text-slate-400">
          <span>Turn: <strong className="text-slate-200 capitalize">{turn}</strong></span>
          {pendingTool && (
            <span>Pending tool: <strong className="text-amber-400 font-mono">{pendingTool}</strong></span>
          )}
          <span>UI State: <strong className="text-teal-400 font-mono">{statePayload.niki_ui_state?.state || 'IDLE'}</strong></span>
        </div>
      </div>

      {activeTab === 'console' ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Admin Action Buttons matching Admin.swift */}
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
              Available Admin Decisions
            </div>
            {buttons.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {buttons.map((b, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAdminAction(b.response)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-medium text-xs rounded-lg transition shadow-md flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{b.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No active admin actions required right now.
              </p>
            )}
          </div>

          {/* Conversation Log matching Admin.swift */}
          <div className="flex-1 min-h-[320px] flex flex-col bg-slate-950/70 rounded-xl p-3 border border-slate-800">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span>Event / Conversation Stream</span>
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">{rawMessages.length} events</span>
            </div>

            <div className="flex-1 min-h-[220px] max-h-[500px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {rawMessages.slice().reverse().map((msg, index) => {
                const isTool = msg.role === 'tool';
                const isUser = msg.role === 'user';
                const isAi = msg.role === 'assistant' || msg.role === 'ai';

                return (
                  <div
                    key={index}
                    className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex gap-3 text-slate-200"
                  >
                    <span
                      className={`w-16 flex-shrink-0 text-[11px] font-bold uppercase ${
                        isTool
                          ? 'text-amber-400'
                          : isUser
                          ? 'text-sky-400'
                          : isAi
                          ? 'text-emerald-400'
                          : 'text-purple-400'
                      }`}
                    >
                      {msg.role}
                    </span>
                    <span className="flex-1 break-words text-slate-300">
                      {parseMessageContent(msg)}
                    </span>
                  </div>
                );
              })}

              {rawMessages.length === 0 && (
                <div className="text-center text-slate-600 py-8">
                  No log events recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Simulator State Stepper */
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-xs text-slate-400">
            Test and trigger any stage of the NIKI interaction flow directly:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => backendService.transitionKioskState('IDLE')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-bold text-white">1. Idle View</div>
                <div className="text-[10px] text-slate-400">(ᴗ˳ᴗ) Sleeping face</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('DETECT_PRESENCE')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <div>
                <div className="font-bold text-white">2. Detect Presence</div>
                <div className="text-[10px] text-slate-400">"Come closer!"</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('WAIT_FOR_USER_ENGAGEMENT')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Activity className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-bold text-white">3. Engagement Invite</div>
                <div className="text-[10px] text-slate-400">"Let's start! / No thanks"</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('CAPTURE_PHOTOS')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-white">4. Camera Capture</div>
                <div className="text-[10px] text-slate-400">Front camera + Shutter</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('WAIT_FOR_USER_CHOOSE_PHOTO')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <div className="font-bold text-white">5. Photo Selection</div>
                <div className="text-[10px] text-slate-400">Airplane slider & cards</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('PRINT_PHOTO')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-white">6. Printing View</div>
                <div className="text-[10px] text-slate-400">Robot speech monologue</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('PAPER_JAM_RECOVERY')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-amber-800/70 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-white">6b. Paper Jam View</div>
                <div className="text-[10px] text-amber-300/80">Retract & reprint flow</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('PRINT_SUCCESS')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <div>
                <div className="font-bold text-white">7. Print Success!</div>
                <div className="text-[10px] text-slate-400">Celebration screen</div>
              </div>
            </button>

            <button
              onClick={() => backendService.transitionKioskState('THINKING')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-left rounded-xl border border-slate-700 flex items-center gap-2"
            >
              <Activity className="w-4 h-4 text-rose-400" />
              <div>
                <div className="font-bold text-white">Thinking State</div>
                <div className="text-[10px] text-slate-400">Redacted placeholder</div>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => backendService.triggerCameraUUIDJump()}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Trigger Backend Camera UUID Jump Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
