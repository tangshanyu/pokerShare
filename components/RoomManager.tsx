import React, { useEffect, useState } from 'react';

import { clearRoomHostToken, roomHostHeaders } from '../utils/roomAccess';
import type { GameSettings } from '../types';

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: GameSettings;
  updateSettings?: (newSettings: Partial<GameSettings>) => void;
  isHost?: boolean;
  currentRoomId?: string;
}

interface RoomHistory {
  roomId: string;
  timestamp: number;
  hostName: string;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  isOpen,
  onClose,
  settings,
  updateSettings,
  isHost = false,
  currentRoomId,
}) => {
  const [history, setHistory] = useState<RoomHistory[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('poker_room_history');
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen]);

  const handleToggleLock = () => {
    if (!settings || !updateSettings || !isHost) return;
    const nextLocked = !settings.isLocked;
    const message = nextLocked
      ? '確定要鎖定並結算房間嗎？'
      : '確定要解鎖房間嗎？';
    if (window.confirm(message)) updateSettings({ isLocked: nextLocked });
  };

  const handleDeleteCurrentRoom = async () => {
    if (!isHost || !currentRoomId) return;
    if (!window.confirm(`確定要永久刪除房間「${currentRoomId}」嗎？此動作無法復原。`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rooms?roomId=${encodeURIComponent(currentRoomId)}`, {
        method: 'DELETE',
        headers: roomHostHeaders(currentRoomId),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Delete failed');

      clearRoomHostToken(currentRoomId);
      const nextHistory = history.filter(room => room.roomId !== currentRoomId);
      localStorage.setItem('poker_room_history', JSON.stringify(nextHistory));
      window.location.href = window.location.pathname;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete room');
    } finally {
      setIsDeleting(false);
    }
  };

  const switchRoom = (roomId: string) => {
    window.location.href = `?room=${encodeURIComponent(roomId)}`;
  };

  const clearHistory = () => {
    if (window.confirm('確定要清除本機的房間瀏覽紀錄嗎？')) {
      localStorage.removeItem('poker_room_history');
      loadHistory();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl bg-[#0a0a0f] border border-white/10 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Room Manager</h2>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              Local history and room controls
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {settings && updateSettings && (
            <section className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white font-bold">Current Room</h3>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{currentRoomId}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Status: {settings.isLocked ? 'Locked' : 'Active'}
                  </p>
                </div>
                {isHost ? (
                  <button
                    onClick={handleToggleLock}
                    className="px-4 py-2 rounded-lg bg-poker-green text-black font-bold text-xs"
                  >
                    {settings.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-white/5 text-gray-500 text-xs">Host only</span>
                )}
              </div>

              {isHost && currentRoomId && (
                <button
                  onClick={handleDeleteCurrentRoom}
                  disabled={isDeleting}
                  className="mt-5 w-full px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 text-sm"
                >
                  {isDeleting ? 'Deleting…' : 'Permanently delete this room'}
                </button>
              )}
            </section>
          )}

          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent rooms on this device</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
              )}
            </div>

            <div className="space-y-2">
              {history.length === 0 && (
                <div className="text-center py-8 text-gray-600 text-sm border border-dashed border-white/5 rounded-xl">
                  No room history on this device.
                </div>
              )}
              {history.map(room => {
                const isCurrent = room.roomId === currentRoomId;
                return (
                  <button
                    key={room.roomId}
                    onClick={() => !isCurrent && switchRoom(room.roomId)}
                    disabled={isCurrent}
                    className={`w-full text-left p-3 rounded-lg flex justify-between items-center border transition-all ${
                      isCurrent
                        ? 'bg-poker-green/5 border-poker-green/30 cursor-default'
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <span>
                      <span className={`block font-mono text-sm ${isCurrent ? 'text-poker-green' : 'text-gray-300'}`}>
                        {room.roomId}
                      </span>
                      <span className="block text-[10px] text-gray-500 mt-1">
                        {new Date(room.timestamp).toLocaleString()} · {room.hostName}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
