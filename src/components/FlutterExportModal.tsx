import React, { useState } from 'react';
import { FLUTTER_FILES, FlutterFile } from '../data/flutterFiles';
import JSZip from 'jszip';
import {
  FileCode,
  Download,
  Copy,
  Check,
  X,
  Smartphone,
  Tablet,
  FolderTree,
  Terminal,
  ExternalLink,
} from 'lucide-react';

interface FlutterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlutterExportModal: React.FC<FlutterExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<FlutterFile>(FLUTTER_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add all project files
      for (const file of FLUTTER_FILES) {
        zip.file(file.path, file.content);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'niki_flutter_kiosk_project.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  Flutter Cross-Platform Project
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  iOS + Android
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ready-to-deploy Flutter codebase with offline Hive storage & camera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'Packaging ZIP...' : 'Download Project (.ZIP)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split File Tree & Code Viewer */}
        <div className="flex-1 flex min-h-0">
          {/* File Tree Left Sidebar */}
          <div className="w-72 border-r border-slate-800 bg-slate-950/40 p-4 flex flex-col space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <FolderTree className="w-3.5 h-3.5 text-teal-400" />
              <span>Flutter Files ({FLUTTER_FILES.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {FLUTTER_FILES.map((f) => {
                const isSelected = selectedFile.path === f.path;
                return (
                  <button
                    key={f.path}
                    onClick={() => setSelectedFile(f)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-teal-600/30 text-teal-200 border border-teal-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <FileCode
                      className={`w-4 h-4 flex-shrink-0 ${
                        f.category === 'dart'
                          ? 'text-sky-400'
                          : f.category === 'config'
                          ? 'text-amber-400'
                          : f.category === 'android'
                          ? 'text-emerald-400'
                          : f.category === 'ios'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{f.path}</span>
                  </button>
                );
              })}
            </div>

            {/* Terminal Run Guide Box */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-teal-400" />
                <span>Quick Deployment</span>
              </div>
              <div className="bg-slate-950 p-2 rounded text-slate-400 font-mono text-[10px] space-y-1">
                <div>$ flutter pub get</div>
                <div>$ flutter run -d android</div>
                <div>$ flutter run -d ios</div>
              </div>
            </div>
          </div>

          {/* Code Viewer Panel Right */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
            {/* Header with path and copy */}
            <div className="p-3 px-5 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-teal-300 font-medium">
                  {selectedFile.path}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 uppercase">
                  {selectedFile.category}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-5 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950/80 select-text">
              <pre>
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
