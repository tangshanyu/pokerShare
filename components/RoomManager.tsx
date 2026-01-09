import React, { useEffect, useState, useMemo } from 'react';
import { GameSettings, GameLog } from '../types';
import { getGameLogs, clearGameLogs, getPendingUploads, clearPendingUploads } from '../utils/storage';
import { RoomProvider, useMutation, useStorage } from '../liveblocks.config';
import { LiveList } from '@liveblocks/client';
import { ClientSideSuspense } from "@liveblocks/react";

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: GameSettings;
  updateSettings?: (newSettings: Partial<GameSettings>) => void;
  isHost?: boolean;
}

// Constant ID for the shared database room
const GLOBAL_DB_ROOM_ID = "poker-pro-global-database-v1";

// --- Inner Component that Connects to Global DB ---
// This runs INSIDE the Global DB Room Context
const GlobalStatsView = ({ onClose }: { onClose: () => void }) => {
  const globalGameLogs = useStorage((root) => root.gameLogs);
  const playerDirectory = useStorage((root) => root.playerDirectory);
  const [localStatus, setLocalStatus] = useState("Syncing...");
  
  // Define Mutation to push pending logs
  const uploadLogs = useMutation(({ storage }, logsToUpload: GameLog[]) => {
      let remoteLogs = storage.get("gameLogs");
      
      // Initialize if missing
      if (!remoteLogs) {
          remoteLogs = new LiveList<GameLog>([]);
          storage.set("gameLogs", remoteLogs);
      }

      // Append new logs (Check for duplicates roughly by timestamp+roomId if needed, 
      // but here we trust the queue is cleared after upload)
      // A simple duplicate check:
      const existingIds = new Set(remoteLogs.map(l => l.roomId));
      
      logsToUpload.forEach(log => {
          if (!existingIds.has(log.roomId)) {
             remoteLogs!.push(log);
          }
      });
  }, []);

  // Mutations for Data Management
  const clearLogs = useMutation(({ storage }) => {
      const logs = storage.get("gameLogs");
      if (logs) logs.clear();
  }, []);

  const clearDirectory = useMutation(({ storage }) => {
      const dir = storage.get("playerDirectory");
      if (dir) dir.clear();
  }, []);

  // Sync Effect
  useEffect(() => {
    if (globalGameLogs === undefined) return; // Wait for connection

    const pending = getPendingUploads();
    if (pending.length > 0) {
        setLocalStatus(`Uploading ${pending.length} new records...`);
        uploadLogs(pending);
        clearPendingUploads();
        setLocalStatus("Sync Complete.");
    } else {
        setLocalStatus("Up to date.");
    }
  }, [globalGameLogs, uploadLogs]);

  // Calculate Player Stats from GLOBAL Data
  const playerStats = useMemo(() => {
    if (!globalGameLogs) return [];
    
    const map = new Map<string, { name: string, gamesPlayed: number, totalNet: number, lastPlayed: number }>();
    
    globalGameLogs.forEach(log => {
      log.players.forEach(p => {
        const name = p.name;
        if (!map.has(name)) {
          map.set(name, { name, gamesPlayed: 0, totalNet: 0, lastPlayed: 0 });
        }
        const stat = map.get(name)!;
        stat.gamesPlayed += 1;
        stat.totalNet += p.net;
        if (log.timestamp > stat.lastPlayed) {
          stat.lastPlayed = log.timestamp;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalNet - a.totalNet);
  }, [globalGameLogs]);

  // Handlers
  const handleClearLogs = () => {
      if (window.confirm("⚠️ 危險操作：您確定要刪除所有「戰績紀錄」嗎？\n此動作無法復原，所有排行榜資料將被清空。")) {
          if (window.confirm("再次確認：真的要刪除嗎？")) {
             clearLogs();
          }
      }
  };

  const handleClearDirectory = () => {
      if (window.confirm("⚠️ 危險操作：您確定要刪除所有「雲端玩家名冊」嗎？\n這將移除所有已儲存的玩家名字建議。")) {
          if (window.confirm("再次確認：真的要刪除嗎？")) {
             clearDirectory();
          }
      }
  };

  return (
      <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xs font-bold text-poker-gold uppercase tracking-wider">Global Database (Cloud)</h3>
                <p className="text-[10px] text-gray-400 mt-1">Status: <span className="text-poker-green">{localStatus}</span></p>
              </div>
          </div>

          {/* Database Management Controls */}
          <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
             <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col justify-between group hover:border-red-500/30 transition-colors">
                 <div className="mb-2 flex justify-between items-start">
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase">Player Directory</h4>
                        <div className="text-xl font-mono text-white mt-1">{playerDirectory ? playerDirectory.length : '...'}</div>
                    </div>
                    <div className="text-xl opacity-20 group-hover:opacity-50 group-hover:text-red-500">👤</div>
                 </div>
                 <button 
                    onClick={handleClearDirectory}
                    className="w-full py-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-[10px] font-bold uppercase rounded-lg border border-white/5 hover:border-red-500/30 transition-all"
                 >
                    Clear Names
                 </button>
             </div>
             <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col justify-between group hover:border-red-500/30 transition-colors">
                 <div className="mb-2 flex justify-between items-start">
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase">Game Logs</h4>
                        <div className="text-xl font-mono text-white mt-1">{globalGameLogs ? globalGameLogs.length : '...'}</div>
                    </div>
                    <div className="text-xl opacity-20 group-hover:opacity-50 group-hover:text-red-500">📜</div>
                 </div>
                 <button 
                    onClick={handleClearLogs}
                    className="w-full py-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-[10px] font-bold uppercase rounded-lg border border-white/5 hover:border-red-500/30 transition-all"
                 >
                    Clear History
                 </button>
             </div>
          </div>

          <div className="flex justify-between items-center mb-2 mt-2">
             <h4 className="text-[10px] font-bold text-gray-500 uppercase">Leaderboard Preview</h4>
             <div className="text-[10px] text-gray-600 bg-white/5 px-2 py-1 rounded">
                 {playerStats.length} Players
             </div>
          </div>

          {!globalGameLogs ? (
               <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin h-6 w-6 border-2 border-poker-green border-t-transparent rounded-full mx-auto mb-2"></div>
                  Connecting to Global DB...
               </div>
          ) : playerStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                  <p>Cloud database is empty.</p>
              </div>
          ) : (
              <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-gray-400 font-medium sticky top-0 backdrop-blur-md">
                          <tr>
                              <th className="p-3">Rank</th>
                              <th className="p-3">Player</th>
                              <th className="p-3 text-right">Games</th>
                              <th className="p-3 text-right">Total Net</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {playerStats.map((stat, i) => (
                              <tr key={stat.name} className="hover:bg-white/5 transition-colors">
                                  <td className="p-3 font-mono text-gray-500 w-12">#{i + 1}</td>
                                  <td className="p-3 font-bold text-white">{stat.name}</td>
                                  <td className="p-3 text-right text-gray-400">{stat.gamesPlayed}</td>
                                  <td className={`p-3 text-right font-mono font-bold text-sm ${stat.totalNet >= 0 ? 'text-poker-green' : 'text-red-400'}`}>
                                      {stat.totalNet >= 0 ? '+' : ''}{stat.totalNet}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
  );
};

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

interface SystemStats {
  totalRooms: number;
  activeToday: number;
  createdToday: number;
  totalPlayersEstimate: number;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  updateSettings, 
  isHost = false
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rooms' | 'local' | 'player_stats'>('dashboard');
  const [history, setHistory] = useState<RoomHistory[]>([]);
  const [globalRooms, setGlobalRooms] = useState<GlobalRoom[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  // Determine mode
  const isLobbyMode = !settings || !updateSettings;

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      fetchGlobalRooms();
    }
  }, [isOpen]);

  // Calculate Statistics (Room Based)
  const stats: SystemStats = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    let activeCount = 0;
    let createdCount = 0;

    globalRooms.forEach(room => {
        const lastActive = new Date(room.lastConnectionAt);
        if (lastActive > oneDayAgo) activeCount++;
        if (room.id.startsWith(datePrefix)) createdCount++;
    });

    return {
        totalRooms: globalRooms.length,
        activeToday: activeCount,
        createdToday: createdCount,
        totalPlayersEstimate: globalRooms.length * 4
    };
  }, [globalRooms]);

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
      
      // Filter out the Database Room from the visual list
      const filtered = (data.rooms || []).filter((r: GlobalRoom) => r.id !== GLOBAL_DB_ROOM_ID);
      
      setGlobalRooms(filtered);
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
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-poker-green border-b-2 border-poker-green bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
                📊 Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('player_stats')}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-medium transition-colors ${activeTab === 'player_stats' ? 'text-poker-gold border-b-2 border-poker-gold bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
                🏆 DB & Stats
            </button>
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
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
              <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="text-gray-500 text-xs uppercase font-bold mb-1">Total Rooms</div>
                          <div className="text-2xl font-mono text-white">{isLoadingGlobal ? '...' : stats.totalRooms}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="text-poker-green text-xs uppercase font-bold mb-1">Active (24h)</div>
                          <div className="text-2xl font-mono text-white">{isLoadingGlobal ? '...' : stats.activeToday}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="text-blue-400 text-xs uppercase font-bold mb-1">New Today</div>
                          <div className="text-2xl font-mono text-white">{isLoadingGlobal ? '...' : stats.createdToday}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="text-purple-400 text-xs uppercase font-bold mb-1">Est. Players</div>
                          <div className="text-2xl font-mono text-white">{isLoadingGlobal ? '...' : `~${stats.totalPlayersEstimate}`}</div>
                      </div>
                  </div>

                  {!isLobbyMode && settings && updateSettings && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
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
              </div>
          )}

          {/* TAB: PLAYER STATS (Connects to Global DB Room) */}
          {activeTab === 'player_stats' && (
              // We create a new RoomProvider specifically for the DB room
              <RoomProvider 
                  id={GLOBAL_DB_ROOM_ID} 
                  initialPresence={{}} 
                  initialStorage={{ 
                      gameLogs: new LiveList([]),
                      playerDirectory: new LiveList([]) 
                  }}
              >
                 <ClientSideSuspense fallback={
                    <div className="py-12 flex justify-center text-gray-500">
                        <div className="animate-spin h-6 w-6 border-2 border-poker-green border-t-transparent rounded-full mr-3"></div>
                        Connecting to Database...
                    </div>
                 }>
                    <GlobalStatsView onClose={onClose} />
                 </ClientSideSuspense>
              </RoomProvider>
          )}

          {/* TAB: GLOBAL ROOMS */}
          {activeTab === 'rooms' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Server Room List</h3>
                    <button onClick={fetchGlobalRooms} className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white transition-colors">Refresh Data</button>
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
                                <th className="p-3">Room ID</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Active</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {globalRooms.map(room => (
                                <tr key={room.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3 font-mono text-blue-300">{room.id}</td>
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