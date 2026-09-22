
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { RoomProvider } from './liveblocks.config';
import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomManager } from './components/RoomManager';
import { roomHostHeaders, saveRoomHostToken } from './utils/roomAccess';
import type { GameSettings } from './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// --- State Management for Lobby/User ---

interface UserState {
  id: string;
  name: string;
  isHost: boolean;
  initialSettings?: { 
      chip: number; 
      cash: number; 
      gameTitle?: string;
      creatorName?: string;
      createdAt?: number;
  };
}

interface RoomHistory {
  roomId: string;
  timestamp: number;
  hostName: string;
}

// Helper: Generate or retrieve a persistent User ID
const getUserId = () => {
  let id = localStorage.getItem('poker_user_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('poker_user_id', id);
  }
  return id;
};

// Helper: Save Room to History
const saveRoomToHistory = (roomId: string, hostName?: string) => {
  try {
    const key = 'poker_room_history';
    const raw = localStorage.getItem(key);
    let history: RoomHistory[] = raw ? JSON.parse(raw) : [];
    
    // Remove if exists (to move to top)
    history = history.filter(r => r.roomId !== roomId);
    
    // Add to top
    history.unshift({
      roomId,
      timestamp: Date.now(),
      hostName: hostName || 'Unknown'
    });
    
    // Keep last 10
    if (history.length > 10) history.pop();
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

const getLocalHistory = (): RoomHistory[] => {
    try {
        const raw = localStorage.getItem('poker_room_history');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

const getDefaultGameTitle = () => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()} Poker Night`;
}

// --- User Selector Component (Simplified) ---

interface UserSelectorProps {
  name: string;
  setName: (n: string) => void;
}

const UserSelector = ({ name, setName }: UserSelectorProps) => {
  return (
    <div className="space-y-2 animate-fade-in">
      <label className="block text-xs font-bold uppercase text-poker-green">
        玩家名稱 (Player Name)
      </label>
      <input 
        type="text" 
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter your name..."
        maxLength={60}
        className="glass-input w-full rounded-xl py-4 px-5 text-white text-lg outline-none focus:border-poker-green transition-colors"
        autoFocus
        autoComplete="off"
      />
      <p className="text-[10px] text-gray-500 text-right">
        請輸入您在此局遊戲中使用的名稱
      </p>
    </div>
  );
};

// Component: Lobby Screen (The New Home)
const LobbyScreen = ({ 
    onCreateClick, 
    openManager 
}: { 
    onCreateClick: () => void, 
    openManager: () => void
}) => {
    const [recentRooms] = useState<RoomHistory[]>(() => getLocalHistory());
    const [selectedRoom, setSelectedRoom] = useState("");

    const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const roomId = e.target.value;
        if (roomId) {
            window.location.href = `?room=${encodeURIComponent(roomId)}`;
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4">
             {/* Logo Section */}
             <div onClick={openManager} className="mb-10 text-center cursor-pointer select-none">
                 <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-2">
                     Poker<span className="text-poker-green">Pro</span>
                 </h1>
                 <p className="text-gray-400 text-sm md:text-base tracking-widest uppercase opacity-70">
                     Professional Settlement Tool
                 </p>
             </div>

             {/* Split Action Cards */}
             <div className="grid grid-cols-1 gap-6 w-full mb-10 max-w-md">
                 
                 {/* Create Game */}
                 <button 
                    onClick={onCreateClick}
                    className="group relative h-48 md:h-64 glass-panel rounded-3xl p-8 flex flex-col justify-between overflow-hidden hover:border-poker-green/50 transition-all duration-300 hover:scale-[1.02]"
                 >
                     <div className="absolute inset-0 bg-gradient-to-br from-poker-green/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="relative z-10 text-left">
                         <div className="w-12 h-12 rounded-full bg-poker-green text-black flex items-center justify-center mb-4 text-2xl font-bold shadow-lg shadow-poker-green/20">
                             +
                         </div>
                         <h2 className="text-3xl font-bold text-white mb-2">開新牌局</h2>
                         <p className="text-gray-400 text-sm">Create New Game</p>
                     </div>
                     <div className="relative z-10 self-end">
                         <span className="text-poker-green text-sm font-bold uppercase tracking-wider flex items-center group-hover:translate-x-2 transition-transform">
                             Get Started <span className="ml-2">→</span>
                         </span>
                     </div>
                 </button>
             </div>

             {/* Bottom: Rooms previously opened on this device */}
             <div className="w-full max-w-md">
                  <div className="relative">
                     <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                         🕒
                     </div>
                     <select
                         value={selectedRoom}
                         onChange={handleRoomChange}
                         className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-gray-300 focus:outline-none focus:border-white/30 appearance-none cursor-pointer hover:bg-black/40 transition-colors disabled:opacity-50"
                     >
                         <option value="" disabled>
                             最近加入的房間 (Recent Rooms)...
                         </option>
                         {recentRooms.length === 0 ? (
                             <option value="" disabled>這台裝置尚無紀錄 (No Recent Rooms)</option>
                         ) : (
                             recentRooms.map(r => {
                                 return (
                                     <option key={r.roomId} value={r.roomId}>
                                         {r.roomId} · {r.hostName || 'Visited'}
                                     </option>
                                 );
                            })
                        )}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none text-xs">
                        ▼
                    </div>
                 </div>
             </div>
        </div>
    );
}

// Component: Create Room Form
const CreateRoomForm = ({ 
    onJoin, 
    onBack 
}: { 
    onJoin: (state: UserState, roomId: string) => void, 
    onBack: () => void
}) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const [gameTitle, setGameTitle] = useState(getDefaultGameTitle());
  const [chipRatio, setChipRatio] = useState(1000);
  const [cashRatio, setCashRatio] = useState(500);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreate = async () => {
    // Validation: Name must be entered
    if (!name.trim()) return alert("請輸入玩家名稱 (Please enter a name)");
    if (!Number.isFinite(chipRatio) || chipRatio <= 0 || !Number.isFinite(cashRatio) || cashRatio <= 0) {
      return alert("籌碼與現金比例必須大於 0 (Ratios must be greater than zero)");
    }
    
    setIsGenerating(true);

    try {
      // 1. Local Storage Preference
      const playerName = name.trim();
      localStorage.setItem('poker_user_name', playerName);

      const userId = getUserId();
      const finalTitle = gameTitle.trim() || getDefaultGameTitle();

      // 2. Let the server generate the unpredictable room ID and host capability.
      const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              title: finalTitle,
              creatorName: playerName,
              intent: 'create'
          })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.roomId || !data.hostToken) {
        throw new Error(data.error || 'Failed to create room');
      }

      saveRoomHostToken(data.roomId, data.hostToken);
      saveRoomToHistory(data.roomId, playerName);

      onJoin({
        id: userId,
        name: playerName,
        isHost: true,
        initialSettings: { 
            chip: chipRatio, 
            cash: cashRatio,
            gameTitle: finalTitle,
            creatorName: playerName,
            createdAt: data.createdAt
        }
      }, data.roomId);
    } catch (e) {
      console.error(e);
      alert("建立房間失敗，請檢查網路連線 (Failed to create room)");
      setIsGenerating(false);
    }
  };

  return (
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden animate-fade-in-up">
        {/* Back Button */}
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors">
            ← Back
        </button>

        <div className="relative z-10 pt-6">
          <div className="text-center mb-8">
             <h1 className="text-3xl font-bold mb-1 tracking-tight">建立新牌局</h1>
             <p className="text-gray-400 text-sm">Configure your game</p>
          </div>

          <div className="space-y-6">
            
            {/* Game Title Input */}
            <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Game Title (Optional)</label>
                 <input 
                    type="text" 
                    value={gameTitle}
                    onChange={e => setGameTitle(e.target.value)}
                    placeholder="e.g. Friday Night Poker"
                    maxLength={100}
                    className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none focus:border-poker-green"
                 />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Chips</label>
                  <input 
                    type="number" 
                    min="1"
                    value={chipRatio}
                    onChange={e => setChipRatio(Number(e.target.value))}
                    className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none text-center"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cash ($)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={cashRatio}
                    onChange={e => setCashRatio(Number(e.target.value))}
                    className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none text-center"
                  />
               </div>
            </div>

            <hr className="border-white/5" />

            {/* User Selector */}
            <UserSelector 
              name={name} 
              setName={setName} 
            />

            <button 
              onClick={handleCreate}
              disabled={isGenerating || !name.trim()}
              className={`w-full bg-gradient-to-r from-poker-green to-emerald-600 hover:from-emerald-400 hover:to-poker-green text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,220,130,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 flex justify-center items-center ${isGenerating || !name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  建立中...
                </>
              ) : (
                '🚀 開始 (Start)'
              )}
            </button>
          </div>
        </div>
      </div>
  );
};

// Component: Join Room Form (Inner)
const JoinRoomForm = ({ onJoin, openManager }: { onJoin: (state: UserState) => void, openManager: () => void }) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const roomId = new URLSearchParams(window.location.search).get("room");
  const [clickCount, setClickCount] = useState(0);
  const [roomData, setRoomData] = useState<{ title?: string, creator?: string, createdAt?: string } | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isVerifiedHost, setIsVerifiedHost] = useState(false);

  // Fetch Room Info
  useEffect(() => {
      if (roomId) {
          fetch(`/api/rooms?roomId=${encodeURIComponent(roomId)}`, {
              headers: roomHostHeaders(roomId),
          })
              .then(async res => {
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || 'Room not found');
                  return data;
              })
              .then(data => {
                  setIsVerifiedHost(data.isHost === true);
                  const room = data.room;
                  if (room?.metadata) {
                      setRoomData({
                          title: room.metadata.title,
                          creator: room.metadata.creatorName,
                          createdAt: room.metadata.createdAt // stored as string timestamp
                      });
                  }
              })
              .catch(error => setRoomError(error.message || 'Room not found'))
              .finally(() => setIsLoadingRoom(false));
      } else {
          setIsLoadingRoom(false);
      }
  }, [roomId]);

  const handleJoin = () => {
    if (!name.trim()) return alert("請輸入玩家名稱 (Please enter a name)");
    
    // 1. Local Logic
    const playerName = name.trim();
    localStorage.setItem('poker_user_name', playerName);
    if (roomId) saveRoomToHistory(roomId, roomData?.creator || (isVerifiedHost ? playerName : 'Visited'));

    const userId = getUserId();
    
    onJoin({
      id: userId,
      name: playerName,
      isHost: isVerifiedHost
    });
  };

  const handleLogoClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 5) {
      openManager();
      setClickCount(0);
    }
  };

  const formattedDate = roomData?.createdAt 
    ? new Date(Number(roomData.createdAt)).toLocaleString('zh-TW', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' }) 
    : null;

  return (
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-500/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <div onClick={handleLogoClick} className="cursor-pointer select-none text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">加入房間</h1>
            {roomData?.title ? (
                <div className="flex flex-col items-center animate-fade-in">
                    <h2 className="text-xl text-poker-green font-bold mb-1">{roomData.title}</h2>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono mt-1 bg-black/30 px-3 py-1 rounded-full border border-white/5">
                        {roomData.creator && (
                            <span className="flex items-center">
                                <span className="mr-1">👤</span> {roomData.creator}
                            </span>
                        )}
                        {formattedDate && (
                            <>
                                <span className="opacity-30">|</span>
                                <span className="flex items-center">
                                    <span className="mr-1">🕒</span> {formattedDate}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-gray-400 text-sm font-mono tracking-wider bg-white/5 py-2 rounded-lg border border-white/5 inline-block px-4">
                    {roomId}
                </p>
            )}
            {roomError && (
                <p className="mt-3 text-sm text-red-400">⚠️ {roomError}</p>
            )}
          </div>

          <div className="space-y-6">
            
            <UserSelector 
              name={name} 
              setName={setName} 
            />

            <button 
              onClick={handleJoin}
              disabled={!name.trim() || !!roomError || isLoadingRoom}
              className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all ${!name.trim() || !!roomError || isLoadingRoom ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoadingRoom ? '確認房間中…' : '👋 加入遊戲 (Join)'}
            </button>
          </div>
        </div>
      </div>
  );
};

// Global Loading Component for Root and Screens
const Loading = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f13] text-white overflow-hidden">
      <div className="relative mb-6">
         <div className="absolute inset-0 bg-poker-green/20 blur-xl rounded-full animate-pulse"></div>
         <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-poker-green border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
         </div>
         <div className="absolute inset-0 flex items-center justify-center text-xl">
            🎲
         </div>
      </div>
      <div className="flex flex-col items-center space-y-2">
         <span className="text-white font-bold text-lg tracking-widest uppercase animate-pulse font-mono">{message}</span>
         <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-poker-green rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-1.5 h-1.5 bg-poker-green rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1.5 h-1.5 bg-poker-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
         </div>
      </div>
  </div>
);

// --- Wrapper Components to Provide Global DB Context ---
// Note: We removed the Global DB wrapper, so these are just layout wrappers now

const MainMenuWrapper = (props: any) => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans relative">
           {props.view === 'create' ? (
                <CreateRoomForm 
                    onJoin={props.onJoin} 
                    onBack={props.onBack}
                />
           ) : (
               <LobbyScreen 
                    onCreateClick={() => props.setView('create')}
                    openManager={props.openManager}
               />
           )}
  </div>
);

const JoinRoomScreen = (props: any) => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans relative">
           <JoinRoomForm {...props} />
  </div>
);

// --- Main Root Component ---

const Root = () => {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(new URLSearchParams(window.location.search).get("room"));
  const [isLobbyManagerOpen, setIsLobbyManagerOpen] = useState(false);
  
  // Navigation State for Home
  const [homeView, setHomeView] = useState<'lobby' | 'create'>('lobby');

  // 1. If no room ID in URL, show Main Menu (Lobby or Create)
  if (!roomId) {
    return (
      <>
        <MainMenuWrapper 
          view={homeView}
          setView={setHomeView}
          onBack={() => setHomeView('lobby')}
          onJoin={(user: UserState, newRoomId: string) => {
            setRoomId(newRoomId);
            setUserState(user);
            // Update URL without reload
            window.history.pushState({}, '', `?room=${newRoomId}`);
          }}
          openManager={() => setIsLobbyManagerOpen(true)}
        />
        <RoomManager 
          isOpen={isLobbyManagerOpen}
          onClose={() => setIsLobbyManagerOpen(false)}
          // No settings passed = Lobby Mode
        />
      </>
    );
  }

  // 2. If room ID exists but user hasn't input name yet, show Join Screen
  if (!userState) {
    return (
      <>
        <JoinRoomScreen 
          onJoin={(user: UserState) => setUserState(user)} 
          openManager={() => setIsLobbyManagerOpen(true)}
        />
        <RoomManager 
          isOpen={isLobbyManagerOpen}
          onClose={() => setIsLobbyManagerOpen(false)}
          // No settings passed = Lobby Mode
        />
      </>
    );
  }

  // 3. User authenticated, render Room
  const initialSettings: GameSettings = {
    chipPerBuyIn: userState.initialSettings?.chip || 1000,
    cashPerBuyIn: userState.initialSettings?.cash || 500,
    isLocked: false,
  };
  if (userState.initialSettings?.gameTitle) initialSettings.gameTitle = userState.initialSettings.gameTitle;
  if (userState.initialSettings?.creatorName) initialSettings.creatorName = userState.initialSettings.creatorName;
  if (userState.initialSettings?.createdAt) initialSettings.createdAt = userState.initialSettings.createdAt;

  return (
    <RoomProvider 
      id={roomId} 
      initialPresence={{ name: userState.name }} // Pass name to presence
      initialStorage={{
        players: new LiveList([]),
        messages: new LiveList([]),
        settings: new LiveObject(initialSettings)
      }}
    >
      <ClientSideSuspense fallback={<Loading message="Joining Room..." />}>
        <App currentUser={userState} />
      </ClientSideSuspense>
    </RoomProvider>
  );
};

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
