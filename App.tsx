
import React, { useState, useEffect } from 'react';
import { Player, CalculationResult } from './types';
import { calculateSettlement } from './utils/pokerLogic';
import { ImportModal } from './components/ImportModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { ChatRoom } from './components/ChatRoom';
import { RoomManager } from './components/RoomManager';
import { SettlementPanel } from './components/SettlementPanel';
import { useStorage, useMutation, useOthers, useStatus } from './liveblocks.config';

// Icons
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"/></svg>
);
const DocsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

// Styled Loading Component
const LoadingBlock = ({ message = "Loading..." }: { message?: string }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f0f13] text-white">
      <div className="animate-spin h-10 w-10 border-4 border-poker-green border-t-transparent rounded-full mb-4"></div>
      <div className="font-mono animate-pulse">{message}</div>
  </div>
);

export const App = ({ currentUser }: { currentUser: { id: string; name: string; isHost: boolean } }) => {
  // Liveblocks Storage
  const players = useStorage((root) => root.players);
  const settings = useStorage((root) => root.settings);
  const others = useOthers();
  const status = useStatus();

  // Local UI State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);

  // Mutations
  const addPlayer = useMutation(({ storage }, name: string) => {
    const playersList = storage.get('players');
    if (!playersList) return;
    
    // Check if name exists
    const exists = playersList.some((p) => p.name === name);
    if (exists) return; // Prevent duplicates

    playersList.push({
      id: Date.now().toString() + Math.random().toString().slice(2),
      name,
      buyInCount: 1,
      finalChips: 0
    });
  }, []);

  const updatePlayer = useMutation(({ storage }, id: string, data: Partial<Player>) => {
    const playersList = storage.get('players');
    if (!playersList) return;
    
    const index = playersList.findIndex((p) => p.id === id);
    if (index !== -1) {
      const current = playersList.get(index);
      if (current) {
        playersList.set(index, { ...current, ...data });
      }
    }
  }, []);

  const removePlayer = useMutation(({ storage }, id: string) => {
    const playersList = storage.get('players');
    if (!playersList) return;
    
    const index = playersList.findIndex((p) => p.id === id);
    if (index !== -1) {
      playersList.delete(index);
    }
  }, []);

  const updateSettings = useMutation(({ storage }, newSettings: Partial<any>) => {
    const settingsObj = storage.get('settings');
    if (settingsObj) {
      Object.keys(newSettings).forEach(key => {
        settingsObj.set(key, newSettings[key]);
      });
    }
  }, []);

  const toggleLock = useMutation(({ storage }, isLocked: boolean) => {
      const s = storage.get('settings');
      if (s) s.set('isLocked', isLocked);
  }, []);

  const importPlayers = useMutation(({ storage }, importedPlayers: Player[]) => {
    const playersList = storage.get('players');
    if (!playersList) return;

    importedPlayers.forEach(p => {
        const exists = playersList.some(ex => ex.name === p.name);
        if (!exists) {
            playersList.push(p);
        }
    });
  }, []);

  // Effects
  useEffect(() => {
    if (players && settings) {
      const result = calculateSettlement(players, settings);
      setCalculationResult(result);
    }
  }, [players, settings]);

  if (status === "loading" || !players || !settings) {
    return <LoadingBlock message="Syncing with Room..." />;
  }

  // Derived Values
  const unreadMessages = 0; 
  const isLocked = settings.isLocked;

  const handleSettle = () => {
    const confirmed = window.confirm("確定要結算並鎖定房間嗎？(Settle & Lock?)");
    if (confirmed) {
        toggleLock(true);
        // Scroll to bottom after a short delay to ensure render
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    }
  };

  const handleUnlock = () => {
      toggleLock(false);
  };

  const handleGoHome = () => {
      // Clear URL params to go back to Lobby
      window.location.href = window.location.pathname;
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white font-sans pb-32 relative overflow-hidden flex flex-col">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0f0f13]/90 backdrop-blur-md border-b border-white/10 h-16 flex items-center justify-between px-4">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleGoHome} title="Back to Lobby">
          <div className="w-8 h-8 bg-poker-green rounded-lg flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-poker-green/20 group-hover:scale-105 transition-transform">
            P
          </div>
          <div className="flex flex-col">
             <span className="font-bold text-sm tracking-wide text-white group-hover:text-poker-green transition-colors">{settings.gameTitle || 'Poker Night'}</span>
             <span className="text-[10px] text-gray-500 font-mono flex items-center">
               <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
               {players.length} Players
             </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="p-2 rounded-full hover:bg-white/10 relative transition-colors"
            >
                <ChatIcon />
                {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f0f13]"></span>
                )}
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 px-4 max-w-5xl mx-auto flex-1 w-full">
         
         {/* Info Banner */}
         <div className="flex justify-between items-end mb-6 animate-fade-in-up">
             <div>
                <h1 className="text-2xl font-bold mb-1">記分板 (Scoreboard)</h1>
                <p className="text-gray-400 text-xs">
                    Buy-in: <span className="text-white font-mono">${settings.cashPerBuyIn}</span> = <span className="text-white font-mono">{settings.chipPerBuyIn}</span> Chips
                </p>
             </div>
             <div className="flex space-x-2">
                 <button 
                    onClick={() => setIsManagerOpen(true)}
                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                    title="Room Settings / Admin"
                 >
                     <SettingsIcon />
                 </button>
                 <button 
                    onClick={() => setIsImportOpen(true)}
                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                    title="Import Data"
                 >
                     <DocsIcon />
                 </button>
                 <button 
                    onClick={() => setIsAddPlayerOpen(true)}
                    className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition-all border border-blue-500/50"
                    disabled={isLocked}
                 >
                     <PlusIcon /> <span>Player</span>
                 </button>
             </div>
         </div>

         {/* Player List */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
             {players.map((player) => {
                 const currentNet = calculationResult?.players.find(p => p.id === player.id)?.netAmount || 0;
                 return (
                     <div key={player.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group relative animate-fade-in">
                         <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center space-x-3">
                                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-lg border border-white/10 shadow-inner">
                                     {player.name.charAt(0).toUpperCase()}
                                 </div>
                                 <div>
                                     <div className="font-bold text-white leading-tight">{player.name}</div>
                                     <div className={`text-xs font-mono font-bold ${currentNet >= 0 ? 'text-poker-green' : 'text-red-400'}`}>
                                         {currentNet >= 0 ? '+' : ''}{currentNet}
                                     </div>
                                 </div>
                             </div>
                             {!isLocked && (
                                 <button 
                                    onClick={() => {
                                        if (confirm(`Remove ${player.name}?`)) removePlayer(player.id);
                                    }}
                                    className="text-gray-600 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2"
                                 >
                                     <TrashIcon />
                                 </button>
                             )}
                         </div>

                         <div className="space-y-3">
                             {/* Buy-ins Control */}
                             <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                                 <span className="text-xs text-gray-500 font-bold uppercase ml-1">Buy-ins</span>
                                 <div className="flex items-center space-x-3">
                                     <button 
                                        onClick={() => updatePlayer(player.id, { buyInCount: Math.max(0, player.buyInCount - 1) })}
                                        disabled={isLocked}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-lg disabled:opacity-30 transition-colors"
                                     >
                                         -
                                     </button>
                                     <span className="font-mono text-lg w-6 text-center">{player.buyInCount}</span>
                                     <button 
                                        onClick={() => updatePlayer(player.id, { buyInCount: player.buyInCount + 1 })}
                                        disabled={isLocked}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-lg disabled:opacity-30 transition-colors"
                                     >
                                         +
                                     </button>
                                 </div>
                             </div>

                             {/* Chips Input */}
                             <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                 <div className="flex justify-between mb-1 ml-1">
                                     <span className="text-xs text-gray-500 font-bold uppercase">Final Chips</span>
                                 </div>
                                 <input 
                                     type="number"
                                     value={player.finalChips}
                                     onChange={(e) => updatePlayer(player.id, { finalChips: Number(e.target.value) })}
                                     disabled={isLocked}
                                     className="w-full bg-transparent text-right font-mono text-xl font-bold text-poker-gold outline-none placeholder-gray-700"
                                     placeholder="0"
                                     onFocus={(e) => e.target.select()}
                                 />
                             </div>
                         </div>
                     </div>
                 );
             })}

             {players.length === 0 && (
                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
                     <p className="mb-4">No players yet.</p>
                     <button 
                        onClick={() => setIsAddPlayerOpen(true)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                     >
                         Add your first player
                     </button>
                 </div>
             )}
         </div>
      </main>

      {/* Action Area: Either Floating Button OR Settlement Panel */}
      {isLocked ? (
          <SettlementPanel 
            result={calculationResult}
            settings={settings}
            onUnlock={handleUnlock}
            currentUserIsHost={currentUser.isHost}
          />
      ) : (
        <div className="fixed bottom-8 left-0 right-0 z-30 flex justify-center">
            <button 
                onClick={handleSettle}
                disabled={players.length === 0}
                className={`
                    px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,165,2,0.4)] transition-all flex items-center space-x-2 border
                    ${players.length === 0 ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-poker-gold to-orange-500 text-black hover:scale-105 active:scale-95 border-yellow-500/50'}
                `}
            >
                <ShareIcon />
                <span>結算 (Settle & Lock)</span>
            </button>
        </div>
      )}

      {/* Modals */}
      <ImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImport={(p) => importPlayers(p)} 
      />
      
      <AddPlayerModal 
        isOpen={isAddPlayerOpen} 
        onClose={() => setIsAddPlayerOpen(false)} 
        onAdd={(name) => addPlayer(name)}
        existingNames={players.map(p => p.name)}
      />

      <RoomManager 
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        settings={settings}
        updateSettings={updateSettings}
        isHost={currentUser.isHost}
      />

      <ChatRoom 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        currentUser={currentUser}
      />
    </div>
  );
};
