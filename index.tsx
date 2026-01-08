import React from 'react';
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

// Simple URL routing for Room ID
const roomId = new URLSearchParams(window.location.search).get("room");

// Component to handle the "Lobby" view
const Lobby = () => {
  const createRoom = () => {
    // Generate a random room ID
    const newRoomId = Math.random().toString(36).substring(2, 7);
    window.location.search = `?room=${newRoomId}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans">
      <div className="glass-panel p-10 rounded-3xl text-center max-w-md mx-4 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-poker-green/10 to-transparent animate-spin-slow pointer-events-none"></div>
        
        <h1 className="text-4xl font-bold mb-2 tracking-tight relative z-10">Poker<span className="text-poker-green">Pro</span></h1>
        <p className="text-gray-400 mb-8 relative z-10">Real-time Settlement Calculator</p>
        
        <button 
          onClick={createRoom}
          className="relative z-10 w-full bg-gradient-to-r from-poker-green to-emerald-600 hover:from-emerald-400 hover:to-poker-green text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,220,130,0.3)] transform hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          🎲 建立新局 (Create Room)
        </button>
        
        <p className="mt-6 text-xs text-gray-500 relative z-10">
          建立房間後，分享網址即可多人同時編輯。
        </p>
      </div>
    </div>
  );
};

// Error Screen for Missing Key
const MissingKeyScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-white font-sans p-4">
    <div className="glass-panel p-8 rounded-3xl text-center max-w-md w-full border border-red-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">Configuration Missing</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Liveblocks API Key 尚未設定或無效。
          <br/>
          (API Key is missing or invalid)
        </p>
        <div className="text-left bg-black/40 p-4 rounded-xl border border-white/5 mb-6">
            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Required Environment Variable:</p>
            <code className="block text-xs font-mono text-poker-green break-all">VITE_LIVEBLOCKS_PUBLIC_KEY</code>
            <div className="mt-2 pt-2 border-t border-white/5 text-xs text-gray-600">
               Current Status: {hasApiKey ? "Valid" : "Missing / Invalid"}
            </div>
        </div>
        <div className="text-xs text-gray-500">
            請確認 .env 檔案或 Vercel 環境變數設定正確，並且 Key 以 "pk_" 開頭。
        </div>
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

root.render(
  <React.StrictMode>
    {!hasApiKey ? (
      <MissingKeyScreen />
    ) : roomId ? (
      <RoomProvider 
        id={roomId} 
        initialPresence={{}}
        initialStorage={{
          players: new LiveList([]),
          settings: new LiveObject({
            chipPerBuyIn: 1000,
            cashPerBuyIn: 500
          })
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          {() => <App />}
        </ClientSideSuspense>
      </RoomProvider>
    ) : (
      <Lobby />
    )}
  </React.StrictMode>
);