import React, { useEffect, useState, useMemo } from 'react';
import { GameSettings } from '../types';
import { getGameLogs, GameLog, clearGameLogs } from '../utils/storage';

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: GameSettings;
  updateSettings?: (newSettings: Partial<GameSettings>) => void;
  isHost?: boolean;
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
}

// Stats Interface
interface SystemStats {
  totalRooms: number;
  activeToday: number; // Active in last 24h
  createdToday: number; // ID starts with today's date
  totalPlayersEstimate: number; // Rough estimate based on logic
}

interface PlayerStat {
  name: string;
  gamesPlayed: number;
  totalNet: number;
  lastPlayed: number;
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
  const [gameLogs, setGameLogs] = useState<GameLog[]>([]);
  const [globalRooms, setGlobalRooms] = useState<GlobalRoom[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Determine mode
  const isLobbyMode = !settings || !updateSettings;

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      fetchGlobalRooms();
      setGameLogs(getGameLogs());
    }
  }, [isOpen]);

  // Calculate Statistics
  const stats: SystemStats = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get YYYYMMDD for today
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

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
        totalPlayersEstimate: globalRooms.length * 4 // Heuristic avg
    };
  }, [globalRooms]);

  // Calculate Player Stats
  const playerStats: PlayerStat[] = useMemo(() => {
    const map = new Map<string, PlayerStat>();
    
    gameLogs.forEach(log => {
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
  }, [gameLogs]);


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
  
  const handleClearStats = () => {
      if (window.confirm("確定要清除所有戰績紀錄嗎？這將重置所有玩家的損益表。")) {
          clearGameLogs();
          setGameLogs([]);
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
                🏆 Player Stats
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
                  {/* Stats Grid */}
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

                  {/* Current Room Controls (Only if in-game) */}
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

          {/* TAB: PLAYER STATS */}
          {activeTab === 'player_stats' && (
              <div>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold text-poker-gold uppercase tracking-wider">Lifetime Leaderboard (Local Data)</h3>
                      <button onClick={handleClearStats} className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-2 py-1 rounded">Reset Stats</button>
                  </div>

                  {playerStats.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                          <p>尚無戰績資料。</p>
                          <p className="text-xs mt-2 text-gray-600">每次結算時會自動記錄於此裝置。</p>
                      </div>
                  ) : (
                      <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                          <table className="w-full text-left text-xs">
                              <thead className="bg-white/5 text-gray-400 font-medium">
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
                                <th className="p-3">Created At</th>
                                <th className="p-3">Last Active</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {globalRooms.map(room => (
                                <tr key={room.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3 font-mono text-blue-300">{room.id}</td>
                                    <td className="p-3 text-gray-500">{new Date(room.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-gray-400">{new Date(room.lastConnectionAt).toLocaleString()}</td>
                                    <td className="p-3 text-right">
                                        <button 
                                            onClick={() => switchRoom(room.id)}
                                            className="text-gray-500 hover:text-white group-hover:underline"
                                        >
                                            Inspect
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