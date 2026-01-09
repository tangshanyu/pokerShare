import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoomProvider, hasApiKey } from './liveblocks.config';
import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";

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

// Component: Create Room (Host)
const CreateRoomScreen = ({ onJoin }: { onJoin: (state: UserState, roomId: string) => void }) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const [chipRatio, setChipRatio] = useState(1000);
  const [cashRatio, setCashRatio] = useState(500);

  const handleCreate = () => {
    if (!name.trim()) return alert("請輸入您的暱稱 (Please enter your name)");
    
    // Save name preference
    localStorage.setItem('poker_user_name', name);

    const newRoomId = Math.random().toString(36).substring(2, 7);
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans">
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-poker-green/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2 tracking-tight text-center">Poker<span className="text-poker-green">Pro</span></h1>
          <p className="text-gray-400 mb-8 text-center text-sm">建立新牌局 (Create New Game)</p>

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
              className="w-full bg-gradient-to-r from-poker-green to-emerald-600 hover:from-emerald-400 hover:to-poker-green text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,220,130,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
            >
              🚀 建立房間 (Create)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: Join Room (Player)
const JoinRoomScreen = ({ onJoin }: { onJoin: (state: UserState) => void }) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const roomId = new URLSearchParams(window.location.search).get("room");
  const isPreviouslyHost = localStorage.getItem(`poker_is_host_${roomId}`) === 'true';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans">
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-500/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-center">加入房間</h1>
          <p className="text-gray-400 mb-8 text-center text-sm font-mono">Room: {roomId}</p>

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

  // Check storage for re-hydration logic (optional, for simple refresh handling)
  // For now, we force the lobby flow to ensure name input unless we wanted to persist session heavily.

  if (!hasApiKey) return <MissingKeyScreen />;

  // 1. If no room ID in URL, show Create Screen
  if (!roomId) {
    return (
      <CreateRoomScreen 
        onJoin={(user, newRoomId) => {
          setRoomId(newRoomId);
          setUserState(user);
          // Update URL without reload
          window.history.pushState({}, '', `?room=${newRoomId}`);
        }} 
      />
    );
  }

  // 2. If room ID exists but user hasn't input name yet, show Join Screen
  if (!userState) {
    return (
      <JoinRoomScreen 
        onJoin={(user) => setUserState(user)} 
      />
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