import React, { useState, useEffect, useMemo } from 'react';
import { Player, CalculationResult } from './types';
import { calculateSettlement } from './utils/pokerLogic';
import { saveGameLog } from './utils/storage';
import { ImportModal } from './components/ImportModal';
import { PlayerDirectoryModal } from './components/PlayerDirectoryModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { ChatRoom } from './components/ChatRoom';
import { RoomManager } from './components/RoomManager';
import { SettlementModal } from './components/SettlementModal';
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
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const DirectoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

// Styled Loading Component
const LoadingBlock = ({ message = "Loading..." }: { message?: string }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f0f13]/90 backdrop-blur-md animate-fade-in transition-all duration-300">
    <div className="relative mb-6">
       {/* Glow effect */}
       <div className="absolute inset-0 bg-poker-green/20 blur-xl rounded-full animate-pulse"></div>
       
       {/* Spinner */}
       <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-poker-green border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
       </div>
       
       {/* Center Icon */}
       <div className="absolute inset-0 flex items-center justify-center text-2xl">
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

export const App = ({ currentUser }: { currentUser: { id: string, name: string, isHost: boolean, initialSettings?: any } }) => {
  const players = useStorage((root) => root.players);
  const settings = useStorage((root) => root.settings);
  const messages = useStorage((root) => root.messages);
  const others = useOthers();
  const status = useStatus(); // Check connection status
  
  // Local UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Handling global settlement state vs local dismissal
  const [isLocalSettlementDismissed, setIsLocalSettlementDismissed] = useState(false);
  
  // -- Mutations --

  const addPlayer = useMutation(({ storage }, name: string, isAutoJoin = false) => {
    const playersList = storage.get('players');
    if (!playersList) return;
    
    // Dupe check
    if (playersList.toArray().some(p => p.name === name)) {
        if (!isAutoJoin) alert("此玩家已在列表中 (Player already exists)");
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
      
      // Strict validation for chips
      if (field === 'finalChips') {
          value = Math.max(0, Number(value) || 0);
      }
      
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

  // -- Effects --

  // Auto-join logic
  useEffect(() => {
    if (status === 'connected' && players && currentUser.name) {
      const exists = players.some(p => p.name === currentUser.name);
      if (!exists) {
        addPlayer(currentUser.name, true);
      }
    }
  }, [status, players, currentUser.name, addPlayer]);

  // Calculations
  const calculation = useMemo(() => {
    if (players && settings) {
      return calculateSettlement(players, settings);
    }
    return null;
  }, [players, settings]);

  // Sync Local Dismissal state: If host opens settlement again, re-open for local user
  useEffect(() => {
      if (settings?.showSettlement) {
          setIsLocalSettlementDismissed(false);
      }
  }, [settings?.showSettlement]);

  // -- Handlers --

  const handleOpenSettlement = () => {
    if (!calculation || !settings) return;
    
    const roomId = new URLSearchParams(window.location.search).get("room");
    
    // Save log
    if (roomId && calculation.isBalanced) {
        saveGameLog(roomId, calculation, currentUser.name);
    }

    // Trigger global settlement
    updateSettings({ showSettlement: true, isLocked: true });
  };

  const handleCloseSettlement = () => {
      if (currentUser.isHost) {
          // Host closes for everyone
          if (confirm("關閉結算視窗將會對所有人關閉。\n(Closing settlement will close it for everyone.)")) {
              updateSettings({ showSettlement: false });
          }
      } else {
          // Guest just dismisses locally
          setIsLocalSettlementDismissed(true);
      }
  };

  const existingPlayerNames = players ? players.map(p => p.name) : [];

  // Determine modal visibility: Global flag AND not locally dismissed
  const isSettlementVisible = (settings?.showSettlement === true) && !isLocalSettlementDismissed;

  // Loading state (Block UI)
  if (!players || !settings) {
    return <LoadingBlock message="Joining Room" />;
  }

  const isLocked = settings.isLocked;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-32 relative overflow-hidden">
      
      {/* Reconnecting Overlay */}
      {status === 'reconnecting' && <LoadingBlock message="Reconnecting" />}

      {/* Top Bar - Tools & Settings */}
      <div className="px-4 pt-6 pb-2 flex justify-between items-center z-10">
        <div 
          onClick={() => window.location.href = window.location.origin} 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          title="Return to Home"
        >
           {settings.gameTitle ? (
               <div className="flex flex-col">
                   <h1 className="text-xl font-bold text-white truncate max-w-[200px]">
                     {settings.gameTitle}
                   </h1>
                   <div className="text-[10px] text-gray-400 font-mono tracking-wider">
                     Poker<span className="text-poker-green">Pro</span>
                   </div>
               </div>
           ) : (
               <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                 Poker<span className="text-poker-green">Pro</span>
               </h1>
           )}
           
           <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-1">
              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono">#{new URLSearchParams(window.location.search).get("room")}</span>
              <span className="flex items-center text-green-400">
                 <span className={`w-1.5 h-1.5 rounded-full mr-1 ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                 {others.length + 1}
              </span>
           </div>
        </div>
        <div className="flex space-x-2">
            {!isLocked && currentUser.isHost && (
                <>
                    <button 
                    onClick={() => setIsImportOpen(true)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 text-gray-400 hover:text-white"
                    title="Import"
                    >
                    <DocsIcon />
                    </button>
                    <button 
                    onClick={() => setIsDirectoryOpen(true)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 text-gray-400 hover:text-white"
                    title="Directory"
                    >
                    <DirectoryIcon />
                    </button>
                </>
            )}
            <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 text-gray-400 hover:text-white"
            title="Settings"
            >
            <SettingsIcon />
            </button>
        </div>
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
        {players.map((player) => {
          // Permissions Logic
          const isMe = player.name === currentUser.name;
          const canEdit = currentUser.isHost || isMe;
          const canDelete = currentUser.isHost || isMe;

          return (
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
              {!isLocked && canDelete && (
                <button 
                  onClick={() => {
                    const msg = isMe 
                        ? "Are you sure you want to leave?" 
                        : `Remove ${player.name}?`;
                    if (confirm(msg)) removePlayer(player.id);
                  }}
                  className="text-gray-600 hover:text-red-500 transition-colors p-1"
                >
                  <TrashIcon />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Buy-ins Control */}
               <div className={`bg-black/20 rounded-xl p-2 flex items-center justify-between border border-white/5 ${!canEdit ? 'opacity-50' : ''}`}>
                  <button 
                    disabled={isLocked || !canEdit}
                    onClick={() => updatePlayer(player.id, 'buyInCount', Math.max(0, player.buyInCount - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <div className="flex flex-col items-center">
                     <span className="text-[10px] text-gray-500 uppercase font-bold">Buy-ins</span>
                     <span className="font-mono text-lg font-bold text-white">{player.buyInCount}</span>
                  </div>
                  <button 
                    disabled={isLocked || !canEdit}
                    onClick={() => updatePlayer(player.id, 'buyInCount', player.buyInCount + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-poker-green disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
               </div>

               {/* Chips Input */}
               <div className={`bg-black/20 rounded-xl p-2 border border-white/5 relative ${!canEdit ? 'opacity-50' : ''}`}>
                  <div className="absolute top-1 left-0 w-full text-center text-[10px] text-gray-500 uppercase font-bold pointer-events-none">Chips</div>
                  <input 
                    type="number"
                    inputMode="numeric"
                    disabled={isLocked || !canEdit}
                    value={player.finalChips === 0 ? '' : player.finalChips}
                    onChange={(e) => updatePlayer(player.id, 'finalChips', e.target.value)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    className="w-full h-full bg-transparent text-center font-mono text-xl font-bold text-poker-gold focus:outline-none pt-3 disabled:cursor-not-allowed"
                  />
               </div>
            </div>
          </div>
          );
        })}
        
        {players.length === 0 && (
           <div className="text-center py-10 text-gray-500 opacity-60">
              <div className="mb-2 text-4xl">🎲</div>
              <p>No players yet.</p>
              {currentUser.isHost && <p className="text-xs mt-1">Click "+" to add players.</p>}
           </div>
        )}
      </div>

      {/* Floating Controls (Fixed Bottom) */}
      <div className="fixed bottom-6 left-6 right-6 z-30 flex items-end justify-between pointer-events-none">
          
          {/* Left: Chat */}
          <div className="pointer-events-auto relative">
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)} 
                className="w-12 h-12 bg-[#1a1a20]/90 border border-white/10 rounded-full flex items-center justify-center shadow-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                  <ChatIcon />
              </button>
              {messages && messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#0f0f13]"></span>
              )}
          </div>

          {/* Center: Settlement (Host Only or Re-Open) */}
          <div className="pointer-events-auto flex flex-col items-center space-y-2">
              {currentUser.isHost ? (
                  <button 
                    onClick={handleOpenSettlement}
                    className="px-8 py-3 bg-gradient-to-r from-poker-gold to-orange-500 text-black font-bold rounded-full shadow-[0_0_20px_rgba(255,165,2,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                  >
                      <ShareIcon />
                      <span>{settings.showSettlement ? '已開啟結算 (Open)' : '結算 (Settle)'}</span>
                  </button>
              ) : (
                  // If settlement is active but dismissed by guest, allow them to re-open it
                  settings.showSettlement && isLocalSettlementDismissed && (
                      <button 
                        onClick={() => setIsLocalSettlementDismissed(false)}
                        className="px-6 py-2 bg-poker-gold/20 text-poker-gold border border-poker-gold/50 font-bold rounded-full backdrop-blur-md shadow-lg flex items-center space-x-2"
                      >
                          <ShareIcon />
                          <span>查看結算 (View)</span>
                      </button>
                  )
              )}
          </div>

          {/* Right: Add Player - RESTRICTED TO HOST */}
          <div className="pointer-events-auto">
             {!isLocked && currentUser.isHost && (
                <button 
                    onClick={() => setIsAddPlayerOpen(true)}
                    className="w-14 h-14 bg-gradient-to-tr from-poker-green to-emerald-500 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,220,130,0.4)] hover:scale-110 active:scale-95 transition-all"
                >
                    <PlusIcon />
                </button>
             )}
          </div>
      </div>

      {/* Balance Warning Overlay */}
      {calculation && Math.abs(calculation.totalBalance) > 5 && !isSettlementVisible && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                <div className="glass-panel bg-red-500/20 border-red-500/40 text-red-100 px-4 py-1.5 rounded-full text-center text-xs font-bold animate-bounce shadow-lg backdrop-blur-md">
                ⚠️ Balance: {calculation.totalBalance > 0 ? '+' : ''}{calculation.totalBalance}
                </div>
            </div>
      )}

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

      <SettlementModal
        isOpen={isSettlementVisible}
        onClose={handleCloseSettlement}
        result={calculation}
        settings={settings}
      />

    </div>
  );
};