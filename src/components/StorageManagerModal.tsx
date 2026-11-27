import React, { useEffect, useState } from 'react';
import { localStore } from '../services/storage';
import { SavedPhoto, SyncQueueItem } from '../types';
import { Database, Trash2, Download, RefreshCw, X, HardDrive, CheckCircle2 } from 'lucide-react';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [photos, setPhotos] = useState<SavedPhoto[]>([]);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const storedPhotos = await localStore.getAllPhotos();
    const queuedItems = await localStore.getSyncQueue();
    setPhotos(storedPhotos);
    setQueue(queuedItems);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeletePhoto = async (id: string) => {
    await localStore.deletePhoto(id);
    loadData();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all offline photos and queue logs?')) {
      await localStore.clearAll();
      loadData();
    }
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      photos,
      queue,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `niki_offline_storage_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Local Data Storage & Offline Cache</h3>
              <p className="text-xs text-slate-400">
                Persistent storage via IndexedDB & Offline Sync Queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Stored Photos</span>
                <HardDrive className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{photos.length}</div>
              <div className="text-[11px] text-teal-400 mt-1">IndexedDB Persistence</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Offline Sync Queue</span>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{queue.length}</div>
              <div className="text-[11px] text-amber-400 mt-1">Pending sync actions</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Offline Status</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-2">Active & Ready</div>
              <div className="text-[11px] text-slate-400 mt-1">Zero network dependency</div>
            </div>
          </div>

          {/* Stored Photos Gallery */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">
                Captured Photos in Local Storage
              </h4>
              <span className="text-xs text-slate-400">{photos.length} items</span>
            </div>

            {photos.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-700 rounded-lg text-slate-400 text-sm">
                No captured photos stored yet. Take a photo in the Kiosk camera to populate!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="group relative rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-black">
                      <img
                        src={p.dataUrl}
                        alt="Stored"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-800">
                      <span>{new Date(p.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Queue Table */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">
              Offline Action Sync Queue
            </h4>
            {queue.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-700 rounded-lg text-slate-400 text-xs">
                Sync queue is empty. Actions taken offline will automatically register here.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/80 text-slate-400 font-medium">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payload Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {queue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-teal-400">{item.type}</td>
                        <td className="p-3 text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400 truncate max-w-xs">
                          {JSON.stringify(item.payload)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Clear Storage
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-1.5 border border-slate-700"
            >
              <Download className="w-4 h-4" />
              Export JSON Backup
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition shadow"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
