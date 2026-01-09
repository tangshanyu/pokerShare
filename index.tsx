import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { RoomProvider, hasApiKey, useStorage, useMutation } from './liveblocks.config';
import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomManager } from './components/RoomManager';
import { ReportsScreen } from './components/ReportsScreen';
import { getKnownPlayers } from './utils/storage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Constant ID for the shared database room
const GLOBAL_DB_ROOM_ID = "poker-pro-global-database-v1";

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

// Helper: Generate Date String YYYYMMDD
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// --- User Selector Component (Connected to Global DB) ---

interface UserSelectorProps {
  name: string;
  setName: (n: string) => void;
}

const UserSelector = ({ name, setName }: UserSelectorProps) => {
  // useStorage returns a plain array (snapshot)
  const cloudDirectory = useStorage((root) => root.playerDirectory);
  
  // Default to selection mode (False = Dropdown, True = Input)
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  
  // Loading & Animation State
  const [isDataReady, setIsDataReady] = useState(false);
  const [shouldFadeIn, setShouldFadeIn] = useState(false);

  // Mutation to add name to cloud
  const addToCloud = useMutation(({ storage }, newName: string) => {
    let list = storage.get("playerDirectory");
    if (!list) {
      list = new LiveList<string>([]);
      storage.set("playerDirectory", list);
    }
    if (!list.toArray().includes(newName)) {
      list.push(newName);
    }
  }, []);

  const directoryList = Array.isArray(cloudDirectory) ? [...cloudDirectory].sort() : [];

  // Initial Validation: Ensure the name in localStorage actually exists in DB
  useEffect(() => {
    // Only run this logic once when data first becomes available
    if (!isDataReady && cloudDirectory !== undefined) {
      if (name) {
        // If current name is NOT in the list, clear it to force selection
        // We only enforce this on initial load to prevent using stale localstorage names
        if (directoryList.length > 0 && !directoryList.includes(name)) {
           setName(''); 
        }
      }
      
      // Mark as ready
      setIsDataReady(true);
      
      // Trigger Fade In animation shortly after render
      setTimeout(() => setShouldFadeIn(true), 50);
    }
  }, [cloudDirectory, isDataReady, directoryList, name, setName]);

  const handleConfirmNewUser = () => {
      const trimmed = newNameInput.trim();
      if (!trimmed) return;

      // 1. Write to DB immediately
      addToCloud(trimmed);
      
      // 2. Select it locally
      setName(trimmed);
      
      // 3. Switch back to dropdown mode
      setIsCreatingNew(false);
      setNewNameInput('');
  };

  // --- RENDER LOADING SKELETON ---
  if (!isDataReady) {
     return (
       <div className="space-y-3">
          <div className="flex justify-between items-center mb-1">
             <div className="h-3 w-24 bg-white/10 rounded animate-pulse"></div>
             <div className="h-3 w-32 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div className="h-[52px] w-full bg-white/5 rounded-xl animate-pulse border border-white/5"></div>
       </div>
     );
  }

  // --- RENDER CONTENT WITH FADE IN ---
  return (
    <div className={`space-y-3 transition-all duration-500 ease-out transform ${shouldFadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex justify-between items-center mb-1">
        <label className={`block text-xs font-bold uppercase transition-colors ${isCreatingNew ? 'text-blue-400' : 'text-poker-green'}`}>
          {isCreatingNew ? '建立新檔案 (Create New)' : '選擇玩家 (Select Player)'}
        </label>
        
        {!isCreatingNew && (
            <button 
            onClick={() => {
                setIsCreatingNew(true);
                setNewNameInput('');
            }}
            className="text-[10px] text-gray-400 hover:text-white underline decoration-dotted underline-offset-2 transition-colors flex items-center"
            >
             <span className="mr-1">+</span> 我是新玩家 (New User)
            </button>
        )}
      </div>

      {isCreatingNew ? (
        <div className="animate-fade-in bg-black/20 p-3 rounded-xl border border-blue-500/30">
           <input 
              type="text" 
              value={newNameInput}
              onChange={e => setNewNameInput(e.target.value)}
              placeholder="輸入您的名字..."
              className="glass-input w-full rounded-lg py-2 px-3 text-white outline-none focus:border-blue-400 transition-colors mb-3"
              autoFocus
              autoComplete="off"
            />
            <div className="flex space-x-2">
                <button 
                    onClick={() => setIsCreatingNew(false)}
                    className="flex-1 py-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                    取消 (Cancel)
                </button>
                <button 
                    onClick={handleConfirmNewUser}
                    disabled={!newNameInput.trim()}
                    className={`flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg ${!newNameInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    新增並選取 (Add & Select)
                </button>
            </div>
        </div>
      ) : (
        <div className="relative">
           <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`glass-input w-full rounded-xl py-3 px-4 outline-none focus:border-poker-green transition-colors appearance-none cursor-pointer ${!name ? 'text-gray-400' : 'text-white font-bold'}`}
           >
              <option value="" disabled>-- 請選擇您的名字 --</option>
              {directoryList.map((p) => (
                <option key={p} value={p} className="bg-[#1a1a20] text-gray-200">
                  {p}
                </option>
              ))}
           </select>
           
           {/* Custom Arrow */}
           <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
           </div>
           
           {directoryList.length === 0 && (
               <div className="mt-2 text-[10px] text-orange-400">
                   ⚠️ 名冊是空的，請點擊上方「我是新玩家」來建立檔案。
               </div>
           )}
        </div>
      )}
    </div>
  );
};

// Component: Create Room Form (Inner)
const CreateRoomForm = ({ 
    onJoin, 
    openManager, 
    onOpenReports 
}: { 
    onJoin: (state: UserState, roomId: string) => void, 
    openManager: () => void,
    onOpenReports: () => void 
}) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const [chipRatio, setChipRatio] = useState(1000);
  const [cashRatio, setCashRatio] = useState(500);
  const [clickCount, setClickCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateSequentialRoomId = async () => {
    const datePrefix = getTodayString();
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        const rooms = data.rooms || [];
        const todaysRooms = rooms.filter((r: any) => {
             return r.id.startsWith(datePrefix) && !isNaN(Number(r.id.substring(8)));
        });

        let maxSeq = 0;
        todaysRooms.forEach((r: any) => {
            const suffix = r.id.substring(8);
            const seq = parseInt(suffix, 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        });
        const nextSeq = String(maxSeq + 1).padStart(3, '0');
        return `${datePrefix}${nextSeq}`;
      }
    } catch (e) {
      console.warn("API fetch failed", e);
    }
    const now = new Date();
    const timeSuffix = String(now.getHours()).padStart(2, '0') + 
                       String(now.getMinutes()).padStart(2, '0') + 
                       String(now.getSeconds()).padStart(2, '0');
    return `${datePrefix}${timeSuffix}`;
  };

  const handleCreate = async () => {
    // Validation: Name must be selected from the UserSelector
    if (!name.trim()) return alert("請先選擇一位玩家 (Please select a player)");
    
    setIsGenerating(true);

    try {
      // 1. Local Storage Preference
      localStorage.setItem('poker_user_name', name);

      // 2. Generate ID
      const newRoomId = await generateSequentialRoomId();
      const userId = getUserId();
      
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
    if (next >= 5) {
      openManager();
      setClickCount(0);
    }
  };

  return (
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-poker-green/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <div onClick={handleLogoClick} className="cursor-pointer select-none">
             <h1 className="text-4xl font-bold mb-2 tracking-tight text-center">Poker<span className="text-poker-green">Pro</span></h1>
             <p className="text-gray-400 mb-8 text-center text-sm">建立新牌局 (Create New Game)</p>
          </div>

          <div className="space-y-6">
            {/* User Selector with DB Sync */}
            <UserSelector 
              name={name} 
              setName={setName} 
            />

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
              disabled={isGenerating || !name.trim()}
              className={`w-full bg-gradient-to-r from-poker-green to-emerald-600 hover:from-emerald-400 hover:to-poker-green text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,220,130,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 flex justify-center items-center ${isGenerating || !name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            
            {/* View Reports Button */}
            <div className="text-center pt-2">
                <button 
                   onClick={onOpenReports}
                   className="text-xs text-gray-400 hover:text-poker-gold transition-colors flex items-center justify-center mx-auto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    查看歷史報表 (View Reports)
                </button>
            </div>
          </div>
        </div>
      </div>
  );
};

// Component: Join Room Form (Inner)
const JoinRoomForm = ({ onJoin, openManager }: { onJoin: (state: UserState) => void, openManager: () => void }) => {
  const [name, setName] = useState(localStorage.getItem('poker_user_name') || '');
  const roomId = new URLSearchParams(window.location.search).get("room");
  const isPreviouslyHost = localStorage.getItem(`poker_is_host_${roomId}`) === 'true';
  const [clickCount, setClickCount] = useState(0);

  const handleJoin = () => {
    if (!name.trim()) return alert("請先選擇一位玩家 (Please select a player)");
    
    // 1. Local Logic
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
    if (next >= 5) {
      openManager();
      setClickCount(0);
    }
  };

  return (
      <div className="glass-panel p-8 md:p-10 rounded-3xl w-full max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-500/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <div className="relative z-10">
          <div onClick={handleLogoClick} className="cursor-pointer select-none">
            <h1 className="text-3xl font-bold mb-2 tracking-tight text-center">加入房間</h1>
            <p className="text-gray-400 mb-8 text-center text-sm font-mono tracking-wider bg-white/5 py-2 rounded-lg border border-white/5">{roomId}</p>
          </div>

          <div className="space-y-6">
            
            <UserSelector 
              name={name} 
              setName={setName} 
            />

            <button 
              onClick={handleJoin}
              disabled={!name.trim()}
              className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all ${!name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              👋 加入遊戲 (Join)
            </button>
          </div>
        </div>
      </div>
  );
};

// --- Wrapper Components to Provide Global DB Context ---

const CreateRoomScreen = (props: any) => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans relative">
     <RoomProvider 
        id={GLOBAL_DB_ROOM_ID} 
        initialPresence={{}} 
        initialStorage={{ playerDirectory: new LiveList([]) }}
      >
        <ClientSideSuspense fallback={
           <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-poker-green border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-sm font-mono text-poker-green">Connecting to Global Database...</div>
           </div>
        }>
           <CreateRoomForm {...props} />
        </ClientSideSuspense>
      </RoomProvider>
  </div>
);

const ReportsPage = ({ onBack }: { onBack: () => void }) => (
    <RoomProvider 
       id={GLOBAL_DB_ROOM_ID} 
       initialPresence={{}} 
       initialStorage={{ gameLogs: new LiveList([]) }}
     >
       <ClientSideSuspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-poker-green">
             <div className="animate-pulse flex flex-col items-center">
                 <div className="w-12 h-12 border-4 border-poker-green border-t-transparent rounded-full animate-spin mb-4"></div>
                 <div className="text-sm font-mono">Loading Reports...</div>
             </div>
          </div>
       }>
          <ReportsScreen onBack={onBack} />
       </ClientSideSuspense>
     </RoomProvider>
);

const JoinRoomScreen = (props: any) => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans relative">
     <RoomProvider 
        id={GLOBAL_DB_ROOM_ID} 
        initialPresence={{}} 
        initialStorage={{ playerDirectory: new LiveList([]) }}
      >
        <ClientSideSuspense fallback={
           <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-sm font-mono text-blue-400">Loading Room...</div>
           </div>
        }>
           <JoinRoomForm {...props} />
        </ClientSideSuspense>
      </RoomProvider>
  </div>
);

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

// Loading Screen (Main App)
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
  const [currentView, setCurrentView] = useState<'home' | 'reports'>('home');

  if (!hasApiKey) return <MissingKeyScreen />;

  // 0. Reports View
  if (currentView === 'reports') {
      return <ReportsPage onBack={() => setCurrentView('home')} />;
  }

  // 1. If no room ID in URL, show Create Screen (Home)
  if (!roomId) {
    return (
      <>
        <CreateRoomScreen 
          onJoin={(user: UserState, newRoomId: string) => {
            setRoomId(newRoomId);
            setUserState(user);
            // Update URL without reload
            window.history.pushState({}, '', `?room=${newRoomId}`);
          }}
          openManager={() => setIsLobbyManagerOpen(true)}
          onOpenReports={() => setCurrentView('reports')}
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
  return (
    <RoomProvider 
      id={roomId} 
      initialPresence={{ name: userState.name }} // Pass name to presence
      initialStorage={{
        players: new LiveList([]),
        messages: new LiveList([]),
        settings: new LiveObject({
          chipPerBuyIn: userState.initialSettings?.chip || 1000,
          cashPerBuyIn: userState.initialSettings?.cash || 500,
          isLocked: false
        })
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
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