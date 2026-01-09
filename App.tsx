import React, { useState, useEffect, useRef } from 'react';
import { Player, CalculationResult } from './types';
import { calculateSettlement, generateCSV, generateHTMLTable } from './utils/pokerLogic';
import { ImportModal } from './components/ImportModal';
import { ChatRoom } from './components/ChatRoom';
import { RoomManager } from './components/RoomManager';
import { useStorage, useMutation, useOthers, useSelf } from './liveblocks.config';
import { LiveObject } from '@liveblocks/client';

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
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const DocsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const SheetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
);
const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);

interface AppProps {
  currentUser: {
    id: string;
    name: string;
    isHost: boolean;
    initialSettings?: { chip: number; cash: number };
  };
}

const App: React.FC<AppProps> = ({ currentUser }) => {
  // Liveblocks Hooks
  const others = useOthers();
  const self = useSelf();
  const playerCount = others.length + 1; // +1 for self

  // Access Storage directly
  const players = useStorage((root) => root.players);
  const settings = useStorage((root) => root.settings);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'transfers' | 'profits' | 'export'>('transfers');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const hasAutoJoined = useRef(false);

  // Mutations
  const updateSettings = useMutation(({ storage }, newSettings: Partial<typeof settings>) => {
    const s = storage.get("settings");
    if (!s) return;
    
    if (newSettings.cashPerBuyIn !== undefined) s.set("cashPerBuyIn", newSettings.cashPerBuyIn);
    if (newSettings.chipPerBuyIn !== undefined) s.set("chipPerBuyIn", newSettings.chipPerBuyIn);
    if (newSettings.isLocked !== undefined) s.set("isLocked", newSettings.isLocked);
  }, []);

  // Generic add player (for Host manual add or Auto-join)
  const addPlayer = useMutation(({ storage }, playerDetails: { id?: string, name: string }) => {
    const list = storage.get("players");
    if (!list) return;

    list.push({
      id: playerDetails.id || Date.now().toString(),
      name: playerDetails.name,
      buyInCount: 1,
      finalChips: 0
    });
  }, []);

  const importPlayers = useMutation(({ storage }, newPlayers: Player[]) => {
    const list = storage.get("players");
    if (!list) return;
    newPlayers.forEach(p => list.push(p));
  }, []);

  const removePlayer = useMutation(({ storage }, id: string) => {
    const list = storage.get("players");
    if (!list) return;
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
      list.delete(index);
    }
  }, []);

  // Fix: Explicitly structured mutation to ensure updates work
  const updatePlayer = useMutation(({ storage }, payload: { id: string, field: keyof Player, value: string | number }) => {
    const list = storage.get("players");
    if (!list) return;
    const index = list.findIndex(p => p.id === payload.id);
    if (index !== -1) {
      const player = list.get(index);
      const updatedPlayer = { ...player, [payload.field]: payload.value };
      list.set(index, updatedPlayer);
    }
  }, []);

  // Initialization & Auto-Join Logic
  useEffect(() => {
    if (!players || !settings) return;

    // 1. If Host, initialize settings (only once effectively due to mutation nature, but safe to set)
    if (currentUser.isHost && currentUser.initialSettings) {
      if (settings.chipPerBuyIn === 1000 && settings.cashPerBuyIn === 500 && currentUser.initialSettings) {
          if (currentUser.initialSettings.chip !== 1000 || currentUser.initialSettings.cash !== 500) {
             updateSettings({ 
                 chipPerBuyIn: currentUser.initialSettings.chip, 
                 cashPerBuyIn: currentUser.initialSettings.cash 
             });
          }
      }
    }

    // 2. Auto-Join logic
    if (!hasAutoJoined.current) {
        const alreadyJoined = players.some(p => p.id === currentUser.id);
        
        if (!alreadyJoined) {
            addPlayer({ id: currentUser.id, name: currentUser.name });
            hasAutoJoined.current = true;
        } else {
             hasAutoJoined.current = true;
        }
    }
  }, [players, settings, currentUser, addPlayer, updateSettings]);


  // Guard clause
  if (!settings || !players) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] text-poker-green">
        <div className="animate-pulse flex flex-col items-center">
           <div className="w-12 h-12 border-4 border-poker-green border-t-transparent rounded-full animate-spin mb-4"></div>
           <div className="text-sm font-mono">Initializing Room Storage...</div>
        </div>
      </div>
    );
  }

  const handleCalculate = () => {
    const res = calculateSettlement(players, settings);
    setResult(res);
    setTimeout(() => {
        document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("房間連結已複製！分享給朋友即可加入。\n(Room Link Copied!)");
    });
  };

  const getExportText = () => {
    if (!result) return '';
    let text = `📅 德州撲克結算報告\n\n`;
    text += `💰 1組買入: $${settings.cashPerBuyIn} (${settings.chipPerBuyIn} 籌碼)\n`;
    text += `----------------\n`;
    
    text += `📊 損益情形:\n`;
    result.players.sort((a,b) => (b.netAmount || 0) - (a.netAmount || 0)).forEach(p => {
        const sign = (p.netAmount || 0) >= 0 ? '+' : '';
        text += `${p.name}: ${sign}$${p.netAmount}\n`;
    });
    
    text += `\n💸 建議轉帳:\n`;
    result.transfers.forEach(t => {
        text += `${t.fromName} ➜ ${t.toName}: $${t.amount}\n`;
    });

    if (!result.isBalanced) {
        text += `\n⚠️ 警告: 帳目不平衡 (差額: $${result.totalBalance})`;
    }

    return text;
  };

  const copyExportText = () => {
    navigator.clipboard.writeText(getExportText()).then(() => alert("報告已複製 (Report Copied)"));
  };

  const copyForGoogleDocs = async () => {
    if (!result) return;
    const html = generateHTMLTable(result, settings);
    try {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([getExportText()], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      await navigator.clipboard.write(data);
      alert("已複製表格！(Table copied!)");
    } catch (err) {
      console.error('Failed to copy formatted text: ', err);
      copyExportText();
    }
  };

  const downloadCSV = () => {
    if (!result) return;
    const csv = generateCSV(result);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `poker_settlement_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenChat = () => {
      setIsChatOpen(true);
  };

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    // Secret Admin Trigger: 5 clicks
    if (newCount >= 5) {
        setIsManagerOpen(true);
        setLogoClickCount(0);
    }
  };

  const isLocked = settings.isLocked || false;

  return (
    <div className="min-h-screen pb-20 font-sans selection:bg-poker-green selection:text-black">
      
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-x-0 border-t-0 bg-opacity-40 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3 cursor-pointer select-none group" onClick={handleLogoClick}>
                <div className={`bg-gradient-to-br from-poker-green to-emerald-700 p-2 rounded-xl shadow-lg shadow-poker-green/20 ${logoClickCount > 0 ? 'animate-pulse' : ''} transition-transform group-active:scale-95`}>
                    <ChipsIcon />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Poker<span className="text-poker-green">Pro</span>
                    </h1>
                    <div className="flex items-center space-x-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${currentUser.isHost ? 'bg-poker-gold' : 'bg-blue-400'}`}></span>
                        <p className="text-xs text-gray-400 font-mono">
                            {currentUser.isHost ? 'HOST' : 'PLAYER'}: <span className="text-white">{currentUser.name}</span>
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* Admin button removed. Access via 5 logo clicks only. */}

                {/* Locked Badge */}
                {isLocked && (
                    <div className="hidden md:flex items-center px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold animate-pulse">
                        <span className="mr-1"><LockIcon /></span> FINISHED
                    </div>
                )}

                {/* Online Users with Tooltip - VISIBLE ON MOBILE NOW */}
                <div className="flex relative group items-center px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 cursor-pointer">
                    <UsersIcon />
                    <span className="ml-2 text-xs font-bold text-gray-300">{playerCount} <span className="hidden sm:inline">Online</span></span>
                    
                    {/* Tooltip */}
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a20] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden cursor-default">
                       <div className="p-2">
                          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-b border-white/5 mb-1">Users (Click to Chat)</div>
                          {self && (
                              <div onClick={handleOpenChat} className="px-3 py-2 text-sm text-poker-green flex items-center hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                  <span className="w-1.5 h-1.5 bg-poker-green rounded-full mr-2"></span>
                                  {self.presence.name || 'You'} (Me)
                              </div>
                          )}
                          {others.map((user) => (
                             <div onClick={handleOpenChat} key={user.connectionId} className="px-3 py-2 text-sm text-gray-300 flex items-center hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                                  {user.presence.name || `User ${user.connectionId}`}
                             </div>
                          ))}
                       </div>
                    </div>
                </div>

                {/* Mobile Chat Toggle Button (also visible on desktop for convenience) */}
                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${isChatOpen ? 'bg-poker-green text-black border-poker-green' : 'bg-black/20 text-gray-400 border-white/5 hover:text-white'}`}
                >
                    <ChatIcon />
                </button>

                <button 
                    onClick={copyLink}
                    className="flex items-center space-x-2 bg-poker-green/10 hover:bg-poker-green/20 text-poker-green border border-poker-green/20 px-3 py-2 rounded-lg text-sm transition-all hover:scale-105 active:scale-95"
                >
                    <ShareIcon /> <span className="hidden md:inline">Invite Friends</span>
                </button>
            </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-4xl mt-8 space-y-8">
        
        {/* Settings Card */}
        <section className={`glass-panel rounded-3xl overflow-hidden relative group transition-opacity ${!currentUser.isHost || isLocked ? 'opacity-80' : ''}`}>
           {currentUser.isHost && (
             <div className="absolute top-0 right-0 w-32 h-32 bg-poker-green/10 rounded-full blur-3xl group-hover:bg-poker-green/20 transition-all duration-700"></div>
           )}

          <div className="px-8 py-5 border-b border-glass-border flex items-center justify-between">
             <h2 className="text-lg font-bold text-white flex items-center">
               <span className="mr-2">🎲</span> 遊戲設定 (Settings)
             </h2>
             <div className="flex items-center space-x-2">
                 {isLocked && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded font-bold">LOCKED</span>}
                 {!currentUser.isHost && <span className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded">Read Only</span>}
             </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
               <div className="space-y-3">
                 <label className="text-xs text-poker-green font-bold uppercase tracking-wider">Chips per Buy-in</label>
                 <input 
                   type="number" 
                   value={settings.chipPerBuyIn}
                   onChange={(e) => updateSettings({ chipPerBuyIn: Number(e.target.value) })}
                   disabled={!currentUser.isHost || isLocked}
                   className={`glass-input w-full rounded-xl py-4 px-5 text-white text-lg font-medium outline-none ${(!currentUser.isHost || isLocked) ? 'cursor-not-allowed opacity-70 bg-black/40' : ''}`}
                 />
               </div>
               
               <div className="hidden md:flex justify-center">
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400">⚡</div>
               </div>

               <div className="space-y-3">
                 <label className="text-xs text-poker-green font-bold uppercase tracking-wider">Cash per Buy-in</label>
                 <div className="relative">
                   <span className="absolute left-5 top-4 text-gray-400 text-lg">$</span>
                   <input 
                    type="number" 
                    value={settings.cashPerBuyIn}
                    onChange={(e) => updateSettings({ cashPerBuyIn: Number(e.target.value) })}
                    disabled={!currentUser.isHost || isLocked}
                    className={`glass-input w-full rounded-xl py-4 pl-10 pr-5 text-white text-lg font-medium outline-none ${(!currentUser.isHost || isLocked) ? 'cursor-not-allowed opacity-70 bg-black/40' : ''}`}
                   />
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* Players Card */}
        <section className={`glass-panel rounded-3xl ${isLocked ? 'border-red-500/20' : ''}`}>
           <div className="px-8 py-5 border-b border-glass-border flex justify-between items-center flex-wrap gap-3">
             <div className="flex items-center">
                <h2 className="text-lg font-bold text-white flex items-center"><span className="mr-2">🃏</span> 玩家列表 (Players)</h2>
                {isLocked && <span className="ml-3 text-xs bg-red-500 text-black font-bold px-2 py-0.5 rounded">FINISHED</span>}
             </div>
             
             {/* Only Host sees Import/Add buttons */}
             {currentUser.isHost && !isLocked && (
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
                    >
                        匯入 (Import)
                    </button>
                    <button 
                        onClick={() => addPlayer({ name: `Player ${players.length + 1}` })}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white border border-white/10 rounded-xl transition-all shadow-lg flex items-center"
                    >
                        <PlusIcon /> <span className="ml-1">Add</span>
                    </button>
                </div>
             )}
          </div>
          
          <div className="p-4 md:p-8 space-y-4">
            {players.length === 0 && (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center">
                    <p className="mb-4 text-lg font-medium">尚無玩家 (No Players)</p>
                </div>
            )}

            {players.map((player, index) => {
              const isMe = player.id === currentUser.id;
              const canEdit = (currentUser.isHost || isMe) && !isLocked;
              const canEditName = currentUser.isHost && !isLocked;
              
              return (
                <div key={player.id} className={`group relative rounded-2xl p-4 transition-all duration-300 border ${isMe ? 'bg-poker-green/5 border-poker-green/30' : 'bg-black/20 border-white/5'}`}>
                    {isMe && <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-poker-green rounded-full shadow-[0_0_10px_#00dc82]"></div>}
                    
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="hidden md:flex w-8 h-8 rounded-full bg-white/5 items-center justify-center text-xs font-bold text-gray-500">
                            {index + 1}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-12 gap-4 w-full items-center">
                            {/* Name */}
                            <div className="col-span-2 md:col-span-4">
                                <label className="md:hidden text-[10px] text-gray-500 uppercase font-bold mb-1 block">Name</label>
                                <input 
                                type="text" 
                                value={player.name}
                                onChange={(e) => updatePlayer({ id: player.id, field: 'name', value: e.target.value })}
                                disabled={!canEditName}
                                className={`w-full bg-transparent text-lg text-white font-medium border-b border-transparent placeholder-gray-600 outline-none transition-colors ${canEditName ? 'focus:border-poker-green' : 'cursor-not-allowed opacity-80'}`}
                                placeholder="Player Name"
                                />
                            </div>

                            {/* Buy-ins */}
                            <div className="col-span-1 md:col-span-3">
                                <label className="md:hidden text-[10px] text-gray-500 uppercase font-bold mb-1 block">Buy-ins</label>
                                <div className="flex items-center md:justify-center">
                                    <span className="text-gray-500 text-xs mr-2 md:hidden">x</span>
                                    <input 
                                        type="number" 
                                        value={player.buyInCount}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            updatePlayer({ id: player.id, field: 'buyInCount', value: isNaN(val) ? 0 : val });
                                        }}
                                        disabled={!canEdit}
                                        className={`glass-input w-20 text-center rounded-lg py-2 text-white outline-none ${!canEdit ? 'cursor-not-allowed opacity-50 bg-black/40' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* Chips */}
                            <div className="col-span-1 md:col-span-4">
                                <label className="md:hidden text-[10px] text-gray-500 uppercase font-bold mb-1 block">Final Chips</label>
                                <input 
                                    type="number" 
                                    value={player.finalChips}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        updatePlayer({ id: player.id, field: 'finalChips', value: isNaN(val) ? 0 : val });
                                    }}
                                    disabled={!canEdit}
                                    className={`glass-input w-full text-right rounded-lg py-2 px-3 text-poker-gold font-bold outline-none ${!canEdit ? 'cursor-not-allowed opacity-50 bg-black/40' : ''}`}
                                />
                            </div>

                            {/* Delete (Only Host) */}
                            {currentUser.isHost && !isLocked && (
                                <div className="col-span-2 md:col-span-1 flex justify-end">
                                    <button 
                                    onClick={() => removePlayer(player.id)}
                                    className="text-gray-600 hover:text-red-400 p-2 transition-colors"
                                    title="Kick Player"
                                    >
                                    <TrashIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-glass-border">
              <button 
                onClick={handleCalculate}
                className="w-full bg-gradient-to-r from-poker-green to-emerald-600 hover:from-emerald-400 hover:to-poker-green text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,220,130,0.3)] transform hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                🎊 計算結算 (Calculate)
              </button>
          </div>
        </section>

        {/* Results Section */}
        {result && (
          <section id="resultsSection" className="glass-panel rounded-3xl overflow-hidden animate-fade-in-up">
             <div className="px-8 py-5 border-b border-glass-border flex justify-between items-center bg-black/20">
                 <h2 className="text-lg font-bold text-white">📊 結算結果 (Results)</h2>
                 <div className={`px-3 py-1 rounded-full text-xs font-bold border ${result.isBalanced ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    {result.isBalanced ? 'Balanced ✨' : `Diff: $${result.totalBalance}`}
                 </div>
             </div>

             <div className="p-2 bg-black/10">
                <div className="flex bg-black/20 rounded-xl p-1 relative">
                    <button 
                      onClick={() => setActiveTab('transfers')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all z-10 ${activeTab === 'transfers' ? 'bg-gray-700/80 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      💸 轉帳方案
                    </button>
                    <button 
                      onClick={() => setActiveTab('profits')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all z-10 ${activeTab === 'profits' ? 'bg-gray-700/80 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      📈 損益報告
                    </button>
                    <button 
                      onClick={() => setActiveTab('export')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all z-10 ${activeTab === 'export' ? 'bg-gray-700/80 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      📋 匯出
                    </button>
                </div>
             </div>

             <div className="p-8 min-h-[300px]">
                {activeTab === 'transfers' && (
                  <div className="space-y-4">
                     {result.transfers.length === 0 ? (
                       <div className="text-center text-gray-500 py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            No transfers needed. Everyone is even!
                       </div>
                     ) : (
                       result.transfers.map((t, i) => (
                         <div key={i} className="flex items-center justify-between bg-gradient-to-r from-gray-800/40 to-gray-900/40 p-5 rounded-2xl border border-white/5">
                            <div className="flex items-center space-x-3">
                               <div className="flex flex-col">
                                   <span className="font-bold text-red-400 text-lg">{t.fromName}</span>
                                   <span className="text-[10px] uppercase text-gray-500 font-bold">Sender</span>
                               </div>
                               <div className="text-gray-600">➜</div>
                               <div className="flex flex-col">
                                   <span className="font-bold text-poker-green text-lg">{t.toName}</span>
                                   <span className="text-[10px] uppercase text-gray-500 font-bold">Receiver</span>
                               </div>
                            </div>
                            <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/10">
                                <span className="font-mono font-bold text-white text-xl">${t.amount}</span>
                            </div>
                         </div>
                       ))
                     )}
                     {!result.isBalanced && (
                       <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3">
                         <span className="text-red-400 text-xl">⚠️</span>
                         <div className="text-red-300 text-sm">
                            <strong className="block mb-1 text-red-200">帳目不平衡 (Balance Error)</strong>
                            差額為 ${result.totalBalance}。請檢查籌碼輸入是否正確。
                         </div>
                       </div>
                     )}
                  </div>
                )}

                {activeTab === 'profits' && (
                  <div className="space-y-2">
                    {result.players
                      .sort((a,b) => (b.netAmount || 0) - (a.netAmount || 0))
                      .map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-colors">
                         <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-4 shadow-[0_0_8px] ${(p.netAmount || 0) >= 0 ? 'bg-poker-green shadow-poker-green' : 'bg-red-500 shadow-red-500'}`}></div>
                            <span className="font-medium text-gray-200 text-lg">{p.name}</span>
                         </div>
                         <span className={`font-mono font-bold text-lg ${(p.netAmount || 0) >= 0 ? 'text-poker-green' : 'text-red-400'}`}>
                            {(p.netAmount || 0) >= 0 ? '+' : ''}{p.netAmount}
                         </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'export' && (
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <button 
                            onClick={copyForGoogleDocs}
                            className="group flex items-center justify-center space-x-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-200 py-4 rounded-xl font-medium transition-all"
                         >
                            <DocsIcon />
                            <span className="group-hover:text-white">Copy for Google Docs</span>
                         </button>
                         <button 
                            onClick={downloadCSV}
                            className="group flex items-center justify-center space-x-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 text-green-200 py-4 rounded-xl font-medium transition-all"
                         >
                            <SheetIcon />
                            <span className="group-hover:text-white">Download CSV</span>
                         </button>
                      </div>

                      <div className="relative group">
                        <textarea 
                          readOnly
                          value={getExportText()}
                          className="w-full h-64 bg-black/40 text-poker-green font-mono text-sm p-6 rounded-2xl border border-white/10 focus:outline-none focus:border-white/20 transition-colors resize-none"
                        />
                        <button 
                          onClick={copyExportText}
                          className="absolute bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 text-xs rounded-lg transition-colors border border-gray-600"
                        >
                          Copy Plain Text
                        </button>
                      </div>
                   </div>
                )}
             </div>
          </section>
        )}
      </div>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={(newPlayers) => importPlayers(newPlayers)}
      />

      <ChatRoom 
        currentUser={currentUser}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
      
      <RoomManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        settings={settings}
        updateSettings={updateSettings}
        isHost={currentUser.isHost}
      />

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>© 2024 Poker Settlement Pro v3.1</p>
      </footer>
    </div>
  );
};

export default App;