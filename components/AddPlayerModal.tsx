import React, { useState, useEffect } from 'react';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  existingNames: string[];
}

const AddPlayerInner = ({ onClose, onAdd, existingNames }: Omit<AddPlayerModalProps, 'isOpen'>) => {
  const [name, setName] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (existingNames.includes(trimmed)) {
        alert("該玩家已在房間內 (Player already exists)");
        return;
    }

    onAdd(trimmed);
    onClose();
    setName('');
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
        
        <div className="animate-fade-in space-y-4">
            <label className="block text-xs font-bold uppercase text-poker-green">
                玩家名稱 (Player Name)
            </label>
            <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="輸入玩家名稱..."
                className="glass-input w-full rounded-xl py-4 px-5 text-white text-lg outline-none focus:border-blue-400 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && name.trim()) handleConfirm();
                }}
            />
            <button 
                onClick={handleConfirm}
                disabled={!name.trim()}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                    name.trim() 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white transform hover:scale-[1.02]' 
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
            >
                確認新增 (Confirm Add)
            </button>
        </div>

      </div>
    </div>
  );
};

export const AddPlayerModal: React.FC<AddPlayerModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-auto min-h-[300px]">
         <AddPlayerInner {...props} />
      </div>
    </div>
  );
};
