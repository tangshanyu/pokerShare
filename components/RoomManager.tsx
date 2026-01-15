
import React, { useEffect, useState, useMemo } from 'react';
import { GameSettings } from '../types';

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: GameSettings;
  updateSettings?: (newSettings: Partial<GameSettings>) => void;
  isHost?: boolean;
}

// --- Main Manager Component ---

interface RoomHistory {
  roomId: string;
  timestamp: number;
  hostName: string;
}

interface GlobalRoom {
  type: "room";
  id: string;
  lastConnectionAt: string;
  createdAt: string;
  metadata: Record<string, any>;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  updateSettings, 
  isHost = false
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'local'>('rooms');
  const [history, setHistory] = useState<RoomHistory[]>([]);
  const [globalRooms, setGlobalRooms] = useState<GlobalRoom[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      fetchGlobalRooms();
    }
  }, [isOpen]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('poker_room_history');
      if (raw) {
        setHistory(JSON.parse(raw));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("Failed to load history");
    }
  };

  const fetchGlobalRooms = async () => {
    setIsLoadingGlobal(true);
    setGlobalError(null);
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) {
         if (res.status === 404) throw new Error("API route not found.");
         const json = await res.json();
         throw new Error(json.error || "Failed to fetch");
      }
      const data = await res.json();
      setGlobalRooms(data.rooms || []);
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "Failed to load global rooms");
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
      if (!window.confirm(`Are you sure you want to permanently delete room "${roomId}"?`)) {
          return;
      }

      setDeletingRoomId(roomId);
      try {
          const res = await fetch(`/api/rooms?roomId=${roomId}`, {
              method: 'DELETE',
          });
          
          if (!res.ok) throw new Error("Delete failed");
          
          // Remove from local list immediately for UI feedback
          setGlobalRooms(prev => prev.filter(r => r.id !== roomId));
      } catch (e) {
          alert("Failed to delete room. Check console/network.");
          console.error(e);
      } finally {
          setDeletingRoomId(null);
      }
  };

  const handleToggleLock = () => {
    if (!settings || !updateSettings) return;

    const newVal = !settings.isLocked;
    const confirmMsg = newVal 
      ? "[ADMIN] 確定要鎖定房間嗎？這將禁止所有操作。" 
      : "[ADMIN] 確定要解鎖房間嗎？";
      
    if (window.confirm(confirmMsg)) {
      updateSettings({ isLocked: newVal });
    }
  };

  const switchRoom = (roomId: string) => {
    window.location.href = `?room=${roomId}`;
  };

  const clearHistory = () => {
    if (window.confirm("確定要清除本機的房間瀏覽紀錄嗎？")) {
      localStorage.removeItem('poker_room_history');
      loadHistory();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl bg-[#0a0a0f] border border-red-500/20 flex flex-col max-h-[90vh]">
        
        {/* Header - Admin Style */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-red-900/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/30 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">System Admin</h2>
                <p className="text-[10px] text-red-400 font-mono tracking-widest uppercase">Restricted Access</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-black/20 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('rooms')}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'rooms' ? 'text-poker-green border-b-2 border-poker-green bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
                🌍 Global Rooms
            </button>
            <button 
                onClick={() => setActiveTab('local')}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'local' ? 'text-poker-green border-b-2 border-poker-green bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
                🕒 Local History
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-[#0a0a0f] to-[#111]">
          
            {settings && updateSettings && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-6">
                    <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center">
                        <span className="mr-2">⚡</span> Current Room Maintenance
                    </h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-white font-medium">Force Lock Room</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Status: {settings.isLocked ? <span className="text-red-400 font-bold">LOCKED</span> : <span className="text-green-400 font-bold">ACTIVE</span>}
                            </p>
                        </div>
                        <button 
                            onClick={handleToggleLock}
                            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${
                            settings.isLocked 
                                ? 'bg-white/10 text-white hover:bg-white/20' 
                                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
                            }`}
                        >
                            {settings.isLocked ? 'Unlock' : 'Lock Down'}
                        </button>
                    </div>
                </div>
            )}

          {/* TAB: GLOBAL ROOMS */}
          {activeTab === 'rooms' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Server Rooms</h3>
                    <button onClick={fetchGlobalRooms} className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white transition-colors">Refresh</button>
                </div>

                {isLoadingGlobal ? (
                <div className="py-12 flex justify-center text-gray-500">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                </div>
                ) : globalError ? (
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-red-300 text-xs">
                    Error: {globalError}
                </div>
                ) : (
                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-400 font-medium">
                            <tr>
                                <th className="p-3">Room Details</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Active</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {globalRooms.map(room => (
                                <tr key={room.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3">
                                        <div className="font-bold text-white mb-0.5">{room.metadata?.title || 'Untitled Room'}</div>
                                        <div className="font-mono text-blue-300/60 text-[10px]">{room.id}</div>
                                    </td>
                                    <td className="p-3 text-gray-500">{new Date(room.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-gray-400">{new Date(room.lastConnectionAt).toLocaleString()}</td>
                                    <td className="p-3 text-right flex justify-end space-x-2">
                                        <button 
                                            onClick={() => switchRoom(room.id)}
                                            className="text-gray-500 hover:text-white group-hover:underline px-2 py-1"
                                        >
                                            View
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteRoom(room.id)}
                                            disabled={deletingRoomId === room.id}
                                            className="text-red-500/50 hover:text-red-500 px-2 py-1 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                            title="Delete Room"
                                        >
                                            {deletingRoomId === room.id ? '...' : '🗑️'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {globalRooms.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-gray-500">No active rooms found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
          )}

          {/* TAB: LOCAL HISTORY */}
          {activeTab === 'local' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device History</h3>
                    {history.length > 0 && (
                        <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                    )}
                </div>
                
                <div className="space-y-2">
                {history.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-sm border border-dashed border-white/5 rounded-xl">
                        No history on this device.
                    </div>
                )}
                {history.map((room) => {
                    const isCurrent = window.location.search.includes(room.roomId);
                    return (
                    <div 
                        key={room.roomId}
                        onClick={() => !isCurrent && switchRoom(room.roomId)}
                        className={`p-3 rounded-lg flex justify-between items-center border transition-all ${
                        isCurrent 
                            ? 'bg-poker-green/5 border-poker-green/30 cursor-default' 
                            : 'bg-white/5 border-transparent hover:bg-white/10 cursor-pointer'
                        }`}
                    >
                        <div>
                        <div className={`font-mono text-sm ${isCurrent ? 'text-poker-green' : 'text-gray-300'}`}>
                            {room.roomId}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            {new Date(room.timestamp).toLocaleString()} • Host: {room.hostName}
                        </div>
                        </div>
                    </div>
                    );
                })}
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
