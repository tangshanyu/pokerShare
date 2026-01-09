import React, { useState, useEffect, useMemo } from 'react';
import { Player, CalculationResult } from './types';
import { calculateSettlement, generateCSV, generateHTMLTable } from './utils/pokerLogic';
import { saveGameLog } from './utils/storage';
import { ImportModal } from './components/ImportModal';
import { PlayerDirectoryModal } from './components/PlayerDirectoryModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { ChatRoom } from './components/ChatRoom';
import { RoomManager } from './components/RoomManager';
import { useStorage, useMutation, useOthers } from './liveblocks.config';
import { LiveObject, LiveList } from '@liveblocks/client';

// Icons
const ChipsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 12h.01"/><path d="M12 16h.01"/><path d="M8 12h.01"/><path d="M12 8h.01"/></svg>
);
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"/></svg>
);
const DocsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const SheetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
);
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const DirectoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

export const App = ({ currentUser }: { currentUser: { id: string, name: string, isHost: boolean, initialSettings?: any } }) => {
  const players = useStorage((root) => root.players);
  const settings = useStorage((root) => root.settings);
  const messages = useStorage((root) => root.messages);
  const others = useOthers();
  
  // Local UI State
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false); // New: Add Player Modal
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Calculations
  useEffect(() => {
    if (players && settings) {
      const result = calculateSettlement(players, settings);
      setCalculation(result);
    }
  }, [players, settings]);

  // -- Mutations --

  const addPlayer = useMutation(({ storage }, name: string) => {
    const playersList = storage.get('players');
    if (!playersList) return;
    
    // Dupe check
    if (playersList.toArray().some(p => p.name === name)) {
        alert("此玩家已在列表中 (Player already exists)");
        return;
    }

    playersList.push({
      id: Date.now().toString() + Math.random().toString().slice(2),
      name: name,
      buyInCount: 1,
      finalChips: 0
    });
  }, []);

  const updatePlayer = useMutation(({ storage }, id: string, field: string, value: any) => {
    const playersList = storage.get('players');
    const index = playersList?.findIndex((p) => p.id === id);
    if (index !== undefined && index !== -1 && playersList) {
      const p = playersList.get(index);
      playersList.set(index, { ...p, [field]: value });
    }
  }, []);

  const removePlayer = useMutation(({ storage }, id: string) => {
    const playersList = storage.get('players');
    const index = playersList?.findIndex((p) => p.id === id);
    if (index !== undefined && index !== -1 && playersList) {
      playersList.delete(index);
    }
  }, []);

  const importPlayers = useMutation(({ storage }, newPlayers: Player[]) => {
    const playersList = storage.get('players');
    if (playersList) {
       newPlayers.forEach(p => playersList.push(p));
    }
  }, []);

  const updateSettings = useMutation(({ storage }, newSettings: Partial<any>) => {
    const s = storage.get('settings');
    if (s) {
      s.update(newSettings);
    }
  }, []);

  // -- Handlers --

  const handleShare = async () => {
    if (!calculation || !settings) return;
    
    // settings is already an object from useStorage
    const resultText = generateHTMLTable(calculation, settings);
    const roomId = new URLSearchParams(window.location.search).get("room");
    
    // Save to history log on share
    if (roomId) saveGameLog(roomId, calculation, currentUser.name);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Poker Settlement',
          text: `Room: ${roomId}\nBalance: $${calculation.totalBalance}`,
          url: window.location.href
        });
      } catch (e) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: Copy Link
      navigator.clipboard.writeText(window.location.href);
      alert("連結已複製到剪貼簿 (Link Copied)");
    }
  };

  const activePlayers = useMemo(() => {
      const active = others.filter(o => o.presence.name);
      const names = active.map(o => o.presence.name);
      if (currentUser.name) names.unshift(currentUser.name);
      return [...new Set(names)]; // Unique
  }, [others, currentUser]);

  const existingPlayerNames = players ? players.map(p => p.name) : [];

  // Loading state (Note: With ClientSideSuspense, this logic is less likely to trigger, but good for safety if types allow undefined)
  if (!players || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center text-poker-green">
        Loading Room Data...
      </div>
    );
  }

  const isLocked = settings.isLocked;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="px-4 pt-6 pb-2 flex justify-between items-center z-10">
        <div>
           <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
             Poker<span className="text-poker-green">Pro</span>
           </h1>
           <div className="flex items-center space-x-2 text-[10px] text-gray-400">
              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">Room: {new URLSearchParams(window.location.search).get("room")}</span>
              <span className="flex items-center text-green-400">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                 {others.length + 1} Online
              </span>
           </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
        >
          <SettingsIcon />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar z-10">
        
        {/* Status Message */}
        {isLocked && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2 flex items-center justify-center">
                 <span className="text-red-400 text-xs font-bold uppercase tracking-wider">🚫 Room Locked by Host</span>
            </div>
        )}

        {/* Players List */}
        {players.map((player) => (
          <div key={player.id} className="glass-panel rounded-2xl p-4 transition-all hover:border-white/20">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 shadow-inner mr-3">
                  <span className="font-bold text-lg text-gray-300">{player.name.charAt(0)}</span>
                </div>
                <div>
                   <div className="font-bold text-lg">{player.name}</div>
                   {calculation && (
                      <div className={`text-xs font-mono font-bold ${
                        (player.netAmount || 0) >= 0 ? 'text-poker-green' : 'text-poker-red'
                      }`}>
                         {player.netAmount && player.netAmount > 0 ? '+' : ''}{player.netAmount || 0}
                      </div>
                   )}
                </div>
              </div>
              {!isLocked && (
                <button 
                  onClick={() => {
                    if (confirm(`Remove ${player.name}?`)) removePlayer(player.id);
                  }}
                  className="text-gray-600 hover:text-red-500 transition-colors p-1"
                >
                  <TrashIcon />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Buy-ins Control */}
               <div className="bg-black/20 rounded-xl p-2 flex items-center justify-between border border-white/5">
                  <button 
                    disabled={isLocked}
                    onClick={() => updatePlayer(player.id, 'buyInCount', Math.max(0, player.buyInCount - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 disabled:opacity-30"
                  >
                    -
                  </button>
                  <div className="flex flex-col items-center">
                     <span className="text-[10px] text-gray-500 uppercase font-bold">Buy-ins</span>
                     <span className="font-mono text-lg font-bold text-white">{player.buyInCount}</span>
                  </div>
                  <button 
                    disabled={isLocked}
                    onClick={() => updatePlayer(player.id, 'buyInCount', player.buyInCount + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-poker-green disabled:opacity-30"
                  >
                    +
                  </button>
               </div>

               {/* Chips Input */}
               <div className="bg-black/20 rounded-xl p-2 border border-white/5 relative">
                  <div className="absolute top-1 left-0 w-full text-center text-[10px] text-gray-500 uppercase font-bold pointer-events-none">Chips</div>
                  <input 
                    type="number"
                    inputMode="numeric"
                    disabled={isLocked}
                    value={player.finalChips === 0 ? '' : player.finalChips}
                    onChange={(e) => updatePlayer(player.id, 'finalChips', Number(e.target.value))}
                    placeholder="0"
                    className="w-full h-full bg-transparent text-center font-mono text-xl font-bold text-poker-gold focus:outline-none pt-3"
                  />
               </div>
            </div>
          </div>
        ))}
        
        {players.length === 0 && (
           <div className="text-center py-10 text-gray-500 opacity-60">
              <div className="mb-2 text-4xl">🎲</div>
              <p>No players yet.</p>
              <p className="text-xs mt-1">Click "+" to add players.</p>
           </div>
        )}
      </div>

      {/* Stats Footer (Fixed) */}
      <div className="fixed bottom-20 left-4 right-4 z-20">
          {calculation && Math.abs(calculation.totalBalance) > 5 && (
             <div className="glass-panel bg-red-500/10 border-red-500/30 text-red-200 px-4 py-2 rounded-xl text-center text-xs font-bold mb-2 animate-bounce shadow-lg">
                ⚠️ Balance not zero: {calculation.totalBalance > 0 ? '+' : ''}{calculation.totalBalance}
             </div>
          )}
          
          <div className="glass-panel p-1 rounded-2xl flex justify-around items-center shadow-2xl bg-[#141419]/90 backdrop-blur-xl border border-white/10">
             {/* Import Button */}
             <button onClick={() => !isLocked && setIsImportOpen(true)} className={`p-4 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all ${isLocked ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <DocsIcon />
             </button>

             {/* Directory Button */}
             <button onClick={() => !isLocked && setIsDirectoryOpen(true)} className={`p-4 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all ${isLocked ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <DirectoryIcon />
             </button>

             {/* Add Button (Main) - Opens AddPlayerModal */}
             <button 
                onClick={() => !isLocked && setIsAddPlayerOpen(true)}
                disabled={isLocked}
                className={`w-14 h-14 -mt-8 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,220,130,0.3)] transition-transform hover:scale-110 active:scale-95 ${
                    isLocked ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-tr from-poker-green to-emerald-400 text-black'
                }`}
             >
                <PlusIcon />
             </button>

             {/* Chat Button */}
             <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-4 rounded-xl flex flex-col items-center justify-center space-y-1 text-gray-400 hover:text-white hover:bg-white/5 transition-all relative">
                <ChatIcon />
                {messages && messages.length > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
             </button>
             
             {/* Share Button */}
             <button onClick={handleShare} className="p-4 rounded-xl flex flex-col items-center justify-center space-y-1 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                <ShareIcon />
             </button>
          </div>
      </div>

      {/* Modals */}
      <RoomManager 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={(s) => updateSettings(s)}
        isHost={currentUser.isHost}
      />

      <ImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImport={(p) => importPlayers(p)}
      />

      <PlayerDirectoryModal
         isOpen={isDirectoryOpen}
         onClose={() => setIsDirectoryOpen(false)}
         onSelect={(names) => {
             names.forEach(name => addPlayer(name));
         }}
         existingNames={existingPlayerNames}
      />

      <AddPlayerModal
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        onAdd={(name) => addPlayer(name)}
        existingNames={existingPlayerNames}
      />

      <ChatRoom 
         currentUser={currentUser}
         isOpen={isChatOpen}
         onClose={() => setIsChatOpen(false)}
      />

    </div>
  );
};