import React, { useState, useEffect, useMemo } from 'react';
import { RoomProvider, useStorage, useMutation } from '../liveblocks.config';
import { ClientSideSuspense } from "@liveblocks/react";
import { LiveList } from '@liveblocks/client';
import { addKnownPlayers } from '../utils/storage'; // We still use this to sync back to local for autocomplete

// Constant ID for the shared database room
const GLOBAL_DB_ROOM_ID = "poker-pro-global-database-v1";

interface PlayerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (names: string[]) => void;
  existingNames: string[];
}

// --- Inner Component (Connected to Liveblocks) ---
const DirectoryInner = ({ onClose, onSelect, existingNames }: Omit<PlayerDirectoryModalProps, 'isOpen'>) => {
  const cloudDirectory = useStorage((root) => root.playerDirectory);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mutation: Add new player to Cloud
  const addToCloud = useMutation(({ storage }, name: string) => {
    let list = storage.get("playerDirectory");
    if (!list) {
      list = new LiveList<string>([]);
      storage.set("playerDirectory", list);
    }
    
    // Check duplicates strictly
    if (!list.toArray().includes(name)) {
      list.push(name);
    }
  }, []);

  // Mutation: Remove player from Cloud
  const removeFromCloud = useMutation(({ storage }, name: string) => {
    const list = storage.get("playerDirectory");
    if (!list) return;
    
    const index = list.findIndex((n) => n === name);
    if (index !== -1) {
      list.delete(index);
    }
  }, []);

  // Sync Cloud to LocalStorage (Side Effect)
  // This ensures the "datalist" used in the Lobby/Inputs gets updated too
  useEffect(() => {
    if (cloudDirectory) {
      const names = cloudDirectory.toArray();
      addKnownPlayers(names);
    }
  }, [cloudDirectory]);

  // Derived state for filtering
  const filteredDirectory = useMemo(() => {
    const list = cloudDirectory ? cloudDirectory.toArray() : [];
    // Sort alphabetically
    list.sort();
    return list.filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cloudDirectory, searchTerm]);

  const handleToggle = (name: string) => {
    if (existingNames.includes(name)) return;

    const newSet = new Set(selected);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelected(newSet);
  };

  const handleAddNew = () => {
    if (!searchTerm.trim()) return;
    const newName = searchTerm.trim();
    
    addToCloud(newName);
    
    // Auto select
    const newSet = new Set(selected);
    newSet.add(newName);
    setSelected(newSet);
    
    setSearchTerm('');
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (confirm(`確定要從雲端名冊中永久移除 "${name}" 嗎？\n(這將影響所有裝置)`)) {
      removeFromCloud(name);
      if (selected.has(name)) {
        const newSet = new Set(selected);
        newSet.delete(name);
        setSelected(newSet);
      }
    }
  };

  const handleSubmit = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  const showAddButton = searchTerm.trim() && !filteredDirectory.includes(searchTerm.trim());

  if (!cloudDirectory) return null; // Should be handled by Suspense, but safe guard

  return (
    <div className="flex flex-col h-full bg-[#1a1a20]/95">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            ☁️ 雲端玩家名冊
          </h2>
          <p className="text-xs text-gray-400">已同步至 Liveblocks Database</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/5 shrink-0">
        <div className="relative">
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 搜尋或新增玩家..."
              className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-poker-green/50 transition-all"
              autoFocus
            />
            {showAddButton && (
                <button 
                  onClick={handleAddNew}
                  className="absolute right-2 top-2 bottom-2 bg-poker-green/20 text-poker-green text-xs font-bold px-3 rounded-lg hover:bg-poker-green/30 transition-colors"
                >
                  + 新增 "{searchTerm}"
                </button>
            )}
        </div>
      </div>

      {/* Grid List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {cloudDirectory.length === 0 && !searchTerm && (
              <div className="text-center text-gray-500 py-10 border border-dashed border-white/5 rounded-xl">
                  名冊是空的。<br/>
                  請輸入名字來建立您的第一個雲端玩家。
              </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredDirectory.map(name => {
                const isSelected = selected.has(name);
                const isAlreadyInGame = existingNames.includes(name);

                return (
                    <div 
                      key={name}
                      onClick={() => handleToggle(name)}
                      className={`
                          relative group p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between
                          ${isAlreadyInGame 
                              ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' 
                              : isSelected 
                                  ? 'bg-poker-green/20 border-poker-green text-white shadow-[0_0_10px_rgba(0,220,130,0.1)]' 
                                  : 'bg-black/20 border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20'
                          }
                      `}
                    >
                        <span className="truncate text-sm font-medium mr-2">{name}</span>
                        
                        {isAlreadyInGame ? (
                            <span className="text-[10px] text-gray-500 uppercase">In Game</span>
                        ) : isSelected ? (
                            <span className="text-poker-green">✓</span>
                        ) : (
                            <button 
                              onClick={(e) => handleDelete(e, name)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-opacity"
                              title="從雲端移除"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                )
            })}
          </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20 shrink-0 flex justify-between items-center">
          <span className="text-sm text-gray-400">已選擇: <span className="text-white font-bold">{selected.size}</span></span>
          <button 
              onClick={handleSubmit}
              disabled={selected.size === 0}
              className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
                  selected.size > 0 
                  ? 'bg-poker-green text-black hover:bg-emerald-400 hover:scale-105' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
          >
              加入遊戲
          </button>
      </div>
    </div>
  );
};

// --- Main Modal Wrapper (Provides Room Context) ---
export const PlayerDirectoryModal: React.FC<PlayerDirectoryModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-[85vh]">
        <RoomProvider 
            id={GLOBAL_DB_ROOM_ID} 
            initialPresence={{}} 
            initialStorage={{ playerDirectory: new LiveList([]) }}
        >
            <ClientSideSuspense fallback={
                <div className="h-full flex flex-col items-center justify-center text-poker-green space-y-4">
                     <div className="w-10 h-10 border-4 border-poker-green border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-sm font-mono animate-pulse">Syncing Player Database...</p>
                </div>
            }>
                {() => <DirectoryInner {...props} />}
            </ClientSideSuspense>
        </RoomProvider>
      </div>
    </div>
  );
};
