
import React, { useState, useEffect, useMemo } from 'react';
import { addKnownPlayers, getKnownPlayers } from '../utils/storage';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  existingNames: string[];
}

const AddPlayerInner = ({ onClose, onAdd, existingNames }: Omit<AddPlayerModalProps, 'isOpen'>) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  // Local Known Players
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    setKnownPlayers(getKnownPlayers());
  }, []);

  // Filter out players already in the game
  const availablePlayers = useMemo(() => {
    return knownPlayers
      .filter(name => !existingNames.includes(name))
      .sort();
  }, [knownPlayers, existingNames]);

  const handleConfirmSelect = () => {
    if (!selectedName) return;
    onAdd(selectedName);
    onClose();
    setSelectedName('');
  };

  const handleConfirmCreate = () => {
    const trimmed = newNameInput.trim();
    if (!trimmed) return;

    // 1. Update Local Storage
    addKnownPlayers([trimmed]);
    
    // 2. Add to Game
    onAdd(trimmed);
    
    // 3. Reset & Close
    onClose();
    setNewNameInput('');
    setIsCreatingNew(false);
  };

  return (
    <div className={`flex flex-col h-full bg-[#1a1a20]/95 transition-all duration-500 ease-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            ➕ 新增玩家 (Add Player)
          </h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
        
        {/* Toggle Mode */}
        <div className="flex justify-between items-center px-1">
            <label className={`text-xs font-bold uppercase transition-colors ${isCreatingNew ? 'text-blue-400' : 'text-poker-green'}`}>
                {isCreatingNew ? '建立新玩家檔案 (Create New)' : '從紀錄選擇 (Select Saved)'}
            </label>
            <button 
                onClick={() => {
                    setIsCreatingNew(!isCreatingNew);
                    setSelectedName('');
                    setNewNameInput('');
                }}
                className="text-xs text-gray-400 hover:text-white underline decoration-dotted underline-offset-2 transition-colors"
            >
                {isCreatingNew ? '回選單選擇 (Back to Select)' : '找不到人？新增玩家 (Create New)'}
            </button>
        </div>

        {isCreatingNew ? (
            // --- CREATE MODE ---
            <div className="animate-fade-in space-y-4">
                <input 
                    type="text" 
                    value={newNameInput}
                    onChange={e => setNewNameInput(e.target.value)}
                    placeholder="輸入新玩家名稱..."
                    className="glass-input w-full rounded-xl py-4 px-5 text-white text-lg outline-none focus:border-blue-400 transition-colors"
                    autoFocus
                />
                <button 
                    onClick={handleConfirmCreate}
                    disabled={!newNameInput.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                        newNameInput.trim() 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white transform hover:scale-[1.02]' 
                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    確認新增 (Confirm Add)
                </button>
            </div>
        ) : (
            // --- SELECT MODE ---
            <div className="animate-fade-in space-y-4">
                <div className="relative">
                    <select
                        value={selectedName}
                        onChange={(e) => setSelectedName(e.target.value)}
                        className={`glass-input w-full rounded-xl py-4 px-5 outline-none focus:border-poker-green transition-colors appearance-none cursor-pointer text-lg ${!selectedName ? 'text-gray-400' : 'text-white font-bold'}`}
                    >
                        <option value="" disabled>-- 請選擇玩家 --</option>
                        {availablePlayers.map((p) => (
                            <option key={p} value={p} className="bg-[#1a1a20] text-gray-200">
                                {p}
                            </option>
                        ))}
                    </select>
                    {/* Custom Arrow */}
                    <div className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>

                {availablePlayers.length === 0 && (
                     <div className="text-center text-orange-400 text-xs py-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                         ⚠️ 本機紀錄中沒有可用的玩家。
                     </div>
                )}

                <button 
                    onClick={handleConfirmSelect}
                    disabled={!selectedName}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                        selectedName 
                        ? 'bg-poker-green hover:bg-emerald-400 text-black transform hover:scale-[1.02]' 
                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    加入遊戲 (Add to Game)
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export const AddPlayerModal: React.FC<AddPlayerModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-auto min-h-[350px]">
         <AddPlayerInner {...props} />
      </div>
    </div>
  );
};
