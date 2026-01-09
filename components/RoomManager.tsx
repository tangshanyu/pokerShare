import React, { useEffect, useState } from 'react';
import { GameSettings } from '../types';

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  isHost: boolean;
}

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
  defaultAccesses: string[];
  groupsAccesses: Record<string, string[]>;
  usersAccesses: Record<string, string[]>;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  updateSettings, 
  isHost 
}) => {
  const [history, setHistory] = useState<RoomHistory[]>([]);
  const [globalRooms, setGlobalRooms] = useState<GlobalRoom[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

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
      // Fetch from our Vercel Serverless Function
      const res = await fetch('/api/rooms');
      if (!res.ok) {
         if (res.status === 404) throw new Error("API route not found. (Are you running on Vercel?)");
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

  const handleToggleLock = () => {
    const newVal = !settings.isLocked;
    const confirmMsg = newVal 
      ? "確定要鎖定房間嗎？鎖定後無法再編輯籌碼與新增玩家。" 
      : "確定要解鎖房間嗎？";
      
    if (window.confirm(confirmMsg)) {
      updateSettings({ isLocked: newVal });
    }
  };

  const switchRoom = (roomId: string) => {
    window.location.href = `?room=${roomId}`;
  };

  const clearHistory = () => {
    if (window.confirm("確定要清除本機的房間瀏覽紀錄嗎？(這不會刪除房間本身)")) {
      localStorage.removeItem('poker_room_history');
      loadHistory();
    }
  };

  const openLiveblocksDashboard = () => {
    window.open('https://liveblocks.io/dashboard/rooms', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-[#1a1a20] border border-poker-gold/30 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-poker-gold/10 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🕵️‍♂️</span>
            <h2 className="text-xl font-bold text-poker-gold">Room Manager</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Section 1: Room Control (Host Only) */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Current Room Control</h3>
            {isHost ? (
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <div className="text-white font-medium">Lock Room Status</div>
                  <div className={`text-xs mt-1 ${settings.isLocked ? 'text-red-400' : 'text-green-400'}`}>
                    {settings.isLocked ? '🔒 Locked (Read Only)' : '🔓 Open (Editable)'}
                  </div>
                </div>
                <button 
                  onClick={handleToggleLock}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    settings.isLocked 
                      ? 'bg-white/10 text-white hover:bg-white/20' 
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                  }`}
                >
                  {settings.isLocked ? 'Unlock Game' : 'Finish & Lock Game'}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">Only the Host can lock/unlock this room.</p>
            )}
          </div>

          {/* Section 2: Global Management (Server Side) */}
          <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">All Active Rooms (Server)</h3>
               <button onClick={fetchGlobalRooms} className="text-xs text-poker-green hover:underline">Refresh</button>
            </div>

            {isLoadingGlobal ? (
               <div className="py-8 flex justify-center text-poker-green">
                   <div className="animate-spin h-5 w-5 border-2 border-poker-green border-t-transparent rounded-full"></div>
               </div>
            ) : globalError ? (
               <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                   <p className="text-xs text-red-300 mb-2">無法讀取伺服器資料。請確認您已在 Vercel 設定環境變數 <code>LIVEBLOCKS_SECRET_KEY</code>。</p>
                   <p className="text-[10px] text-red-400 font-mono">{globalError}</p>
                   <button 
                     onClick={openLiveblocksDashboard}
                     className="mt-3 text-xs text-white bg-red-500/20 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors"
                   >
                     Fallback: Open Dashboard
                   </button>
               </div>
            ) : (
               <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                   {globalRooms.length === 0 ? (
                       <div className="p-4 text-center text-gray-500 text-sm">No active rooms found.</div>
                   ) : (
                       globalRooms.map(room => (
                           <div 
                               key={room.id}
                               onClick={() => switchRoom(room.id)}
                               className={`p-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors ${window.location.search.includes(room.id) ? 'bg-poker-green/5' : ''}`}
                           >
                               <div>
                                   <div className="text-sm font-mono text-blue-300">{room.id}</div>
                                   <div className="text-[10px] text-gray-500">
                                       Last active: {new Date(room.lastConnectionAt).toLocaleString()}
                                   </div>
                               </div>
                               <div className="text-xs text-gray-400">➜</div>
                           </div>
                       ))
                   )}
               </div>
            )}
          </div>

          {/* Section 3: Room History (Local) */}
          <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Local History</h3>
               {history.length > 0 && (
                 <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 underline">
                   Clear History
                 </button>
               )}
            </div>
            
            <div className="space-y-2 pr-1">
              {history.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm bg-white/5 rounded-xl border border-dashed border-white/10">
                  No history found on this device.
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
                        ? 'bg-poker-green/10 border-poker-green/30 cursor-default' 
                        : 'bg-white/5 border-transparent hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className={`font-mono text-sm ${isCurrent ? 'text-poker-green' : 'text-gray-300'}`}>
                        {room.roomId} {isCurrent && '(Current)'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {new Date(room.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Host: {room.hostName || 'Unknown'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};