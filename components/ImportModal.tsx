
import React, { useState } from 'react';
import { Player } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (players: Player[]) => void;
}

const ImportModalInner = ({ onClose, onImport }: Omit<ImportModalProps, 'isOpen'>) => {
    const [text, setText] = useState('');

    const handleImport = () => {
        const lines = text.trim().split('\n');
        const newPlayers: Player[] = [];
        const seenNames = new Set<string>();

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 0 && parts[0]) {
                const name = parts[0];
                
                // Avoid duplicates within the import itself
                if (seenNames.has(name)) return;
                seenNames.add(name);

                let buyIns = 1;
                let chips = 0;

                if (parts.length >= 2) {
                    const parsedBuyIns = parseFloat(parts[1]);
                    buyIns = isNaN(parsedBuyIns) ? 1 : parsedBuyIns;
                }
                
                if (parts.length >= 3) {
                    const parsedChips = parseFloat(parts[2]);
                    chips = isNaN(parsedChips) ? 0 : parsedChips;
                }

                newPlayers.push({
                    id: Date.now().toString() + Math.random().toString().slice(2),
                    name,
                    buyInCount: buyIns,
                    finalChips: chips
                });
            }
        });

        if (newPlayers.length > 0) {
            onImport(newPlayers);
        }

        onClose();
        setText('');
    };

    return (
        <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-[#1a1a20]/90 border border-white/10 animate-fade-in">
             <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div>
                    <h2 className="text-xl font-bold text-white">匯入資料 (Import Data)</h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
                <p className="text-gray-400 text-sm mb-4">
                    請貼上資料，格式範例：<br/>
                    <code className="bg-black/40 px-2 py-1 rounded text-poker-green mt-2 block w-max border border-white/5">玩家名 購買組數 剩餘籌碼</code>
                </p>
                <textarea
                    className="w-full bg-black/30 text-gray-200 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-poker-green/50 font-mono text-sm transition-all"
                    rows={8}
                    placeholder={`David 2 5000\nSarah 1 0\nMike 3 12000`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 transition-colors border border-transparent"
                    >
                    取消
                    </button>
                    <button 
                    onClick={handleImport}
                    className="px-5 py-2.5 rounded-xl bg-poker-green hover:bg-emerald-500 text-black font-bold transition-all shadow-lg shadow-poker-green/20"
                    >
                    確認匯入
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ImportModal: React.FC<ImportModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
       <ImportModalInner {...props} />
    </div>
  );
};
