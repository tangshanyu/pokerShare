import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoomProvider, hasApiKey } from './liveblocks.config';
import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomManager } from './components/RoomManager';

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
  initialSettings?: { chip: number; cash: number };
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
    let history = raw ? JSON.parse(raw) : [];
    
    // Remove if exists (to move to top)
    history = history.filter((r: any) => r.roomId !== roomId);
    
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

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

// Helper: Generate Date String YYYYMMDD
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// Component: Create Room (Host)
const CreateRoomScreen = ({ onJoin, openManager }: { onJoin: (state: UserState, roomId: string) => void, openManager: () => void }) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const [chipRatio, setChipRatio] = useState(1000);
  const [cashRatio, setCashRatio] = useState(500);
  const [clickCount, setClickCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSequentialRoomId = async () => {
    const datePrefix = getTodayString(); // e.g., 20240112
    
    try {
      // Fetch existing rooms to calculate sequence
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        const rooms = data.rooms || [];

        // Find rooms created today that match the pattern YYYYMMDDxxx
        const todaysRooms = rooms.filter((r: any) => {
             // Check if starts with date and the suffix is a number
             return r.id.startsWith(datePrefix) && !isNaN(Number(r.id.substring(8)));
        });

        let maxSeq = 0;
        todaysRooms.forEach((r: any) => {
            // Extract the suffix (e.g., from 20240112005 extract 005)
            const suffix = r.id.substring(8);
            // We assume suffixes are numeric.
            const seq = parseInt(suffix, 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        });

        // Generate next sequence (e.g., 001)
        // Using 3 digits for cleaner look (001), change padStart to 5 if you want 00001
        const nextSeq = String(maxSeq + 1).padStart(3, '0');
        return `${datePrefix}${nextSeq}`;
      }
    } catch (e) {
      console.warn("API fetch failed, falling back to time-based ID", e);
    }

    // Fallback: Use Time (HHMMSS) if API fails to ensure uniqueness
    const now = new Date();
    const timeSuffix = String(now.getHours()).padStart(2, '0') + 
                       String(now.getMinutes()).padStart(2, '0') + 
                       String(now.getSeconds()).padStart(2, '0');
    return `${datePrefix}${timeSuffix}`;
  };

  const handleCreate = async () => {
    if (!name.trim()) return alert("請輸入您的暱稱 (Please enter your name)");
    
    setIsGenerating(true);

    try {
      // Save name preference
      localStorage.setItem('poker_user_name', name);

      // Generate ID
      const newRoomId = await generateSequentialRoomId();
      const userId = getUserId();
      
      // Mark as host in local storage for this room
      localStorage.setItem(`poker_is_host_${newRoomId}`, 'true');
      saveRoomToHistory(newRoomId, name);

      onJoin({
        id: userId,
        name: name,
        isHost: true,
        initialSettings: { chip: chipRatio, cash: cashRatio }
      }, newRoomId);
    } catch (e) {
      alert("建立房間失敗，請稍後再試");
      setIsGenerating(false);
    }
  };

  const handleLogoClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 3) {
      openManager();
      setClickCount(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans relative">
      {/* Admin Button (Top Right) */}
      <button 
        onClick={openManager}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
        title="Open Manager"
      >
        <ShieldIcon />
      </button>

      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-poker-green/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <div onClick={handleLogoClick} className="cursor-pointer select-none">
             <h1 className="text-4xl font-bold mb-2 tracking-tight text-center">Poker<span className="text-poker-green">Pro</span></h1>
             <p className="text-gray-400 mb-8 text-center text-sm">建立新牌局 (Create New Game)</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-poker-green uppercase mb-2">房主暱稱 (Host Name)</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: David"
                className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none focus:border-poker-green transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Chips</label>
                  <input 
                    type="number" 
                    value={chipRatio}
                    onChange={e => setChipRatio(Number(e.target.value))}
                    className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none text-center"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cash ($)</label>
                  <input 
                    type="number" 
                    value={cashRatio}
                    onChange={e => setCashRatio(Number(e.target.value))}
                    className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none text-center"
                  />
               </div>
            </div>

            <button 
              onClick={handleCreate}
              disabled={isGenerating}
              className={`w-full bg-gradient-to-r from-poker-green to-emerald-600 hover:from-emerald-400 hover:to-poker-green text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,220,130,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 flex justify-center items-center ${isGenerating ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  產生房間 ID...
                </>
              ) : (
                '🚀 建立房間 (Create)'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: Join Room (Player)
const JoinRoomScreen = ({ onJoin, openManager }: { onJoin: (state: UserState) => void, openManager: () => void }) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const roomId = new URLSearchParams(window.location.search).get("room");
  const isPreviouslyHost = localStorage.getItem(`poker_is_host_${roomId}`) === 'true';
  const [clickCount, setClickCount] = useState(0);

  const handleJoin = () => {
    if (!name.trim()) return alert("請輸入您的暱稱 (Please enter your name)");
    localStorage.setItem('poker_user_name', name);
    
    if (roomId) saveRoomToHistory(roomId, 'Visited');

    const userId = getUserId();
    
    onJoin({
      id: userId,
      name: name,
      isHost: isPreviouslyHost // Restore host status if they created it
    });
  };

  const handleLogoClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 3) {
      openManager();
      setClickCount(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans relative">
      {/* Admin Button (Top Right) */}
      <button 
        onClick={openManager}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
        title="Open Manager"
      >
        <ShieldIcon />
      </button>

      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-500/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <div onClick={handleLogoClick} className="cursor-pointer select-none">
            <h1 className="text-3xl font-bold mb-2 tracking-tight text-center">加入房間</h1>
            <p className="text-gray-400 mb-8 text-center text-sm font-mono tracking-wider bg-white/5 py-2 rounded-lg border border-white/5">{roomId}</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-blue-400 uppercase mb-2">您的暱稱 (Your Name)</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Sarah"
                className="glass-input w-full rounded-xl py-3 px-4 text-white outline-none focus:border-blue-400 transition-colors"
                autoFocus
              />
            </div>

            <button 
              onClick={handleJoin}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              👋 加入遊戲 (Join)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Error Screen
const MissingKeyScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans p-4">
    <div className="glass-panel p-8 rounded-3xl text-center max-w-md w-full border border-red-500/30">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">Configuration Missing</h1>
        <p className="text-gray-400 mb-6 text-sm">Liveblocks API Key is missing.</p>
        <code className="block text-xs font-mono text-poker-green bg-black/40 p-2 rounded">VITE_LIVEBLOCKS_PUBLIC_KEY</code>
    </div>
  </div>
);

// Loading Screen
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-poker-green">
    <div className="animate-pulse flex flex-col items-center">
       <div className="w-12 h-12 border-4 border-poker-green border-t-transparent rounded-full animate-spin mb-4"></div>
       <div className="text-sm font-mono">Connecting to Room...</div>
    </div>
  </div>
);

// --- Main Root Component ---

const Root = () => {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(new URLSearchParams(window.location.search).get("room"));
  const [isLobbyManagerOpen, setIsLobbyManagerOpen] = useState(false);

  // Check storage for re-hydration logic (optional, for simple refresh handling)
  // For now, we force the lobby flow to ensure name input unless we wanted to persist session heavily.

  if (!hasApiKey) return <MissingKeyScreen />;

  // 1. If no room ID in URL, show Create Screen
  if (!roomId) {
    return (
      <>
        <CreateRoomScreen 
          onJoin={(user, newRoomId) => {
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
          onJoin={(user) => setUserState(user)} 
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
  return (
    <RoomProvider 
      id={roomId} 
      initialPresence={{ name: userState.name }} // Pass name to presence
      initialStorage={{
        players: new LiveList([]),
        messages: new LiveList([]),
        settings: new LiveObject({
          chipPerBuyIn: 1000,
          cashPerBuyIn: 500,
          isLocked: false
        })
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <App currentUser={userState} />}
      </ClientSideSuspense>
    </RoomProvider>
  );
};

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);