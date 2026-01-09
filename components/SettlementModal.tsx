import React from 'react';
import { CalculationResult, GameSettings } from '../types';
import { generateTextSummary, generateHTMLTable } from '../utils/pokerLogic';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CalculationResult | null;
  settings: GameSettings;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({ isOpen, onClose, result, settings }) => {
  if (!isOpen || !result) return null;

  // Helpers
  const sortedPlayers = [...result.players].sort((a, b) => (b.netAmount || 0) - (a.netAmount || 0));
  
  const handleCopyText = () => {
      const text = generateTextSummary(result, settings);
      navigator.clipboard.writeText(text);
      alert("✅ 文字報表已複製 (Text Report Copied)");
  };

  const handleShareSystem = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Poker Results',
                text: generateTextSummary(result, settings),
                url: window.location.href
            });
        } catch (e) {
            console.log("Share cancelled");
        }
    } else {
        // Fallback to copy link
        handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-poker-gold/10 to-transparent">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              💰 結算 (Settlement)
            </h2>
            <p className="text-xs text-gray-400">1 Buy-in = ${settings.cashPerBuyIn} ({settings.chipPerBuyIn} Chips)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* 1. Balance Check */}
            {!result.isBalanced && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">⚠️</span>
                        <h3 className="text-red-400 font-bold text-lg">金額不平衡 (Unbalanced)</h3>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                        目前的籌碼總數與買入金額不符。請檢查輸入是否有誤。
                    </p>
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                        <span className="text-gray-400 text-sm">差異金額 (Discrepancy):</span>
                        <span className="text-xl font-mono font-bold text-red-400">
                             {result.totalBalance > 0 ? '+' : ''}{result.totalBalance}
                        </span>
                    </div>
                </div>
            )}

            {/* 2. Player Stats Table */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">📊 玩家損益 (Net Profit/Loss)</h3>
                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-left border-b border-white/5">
                                <th className="p-3 font-medium">Player</th>
                                <th className="p-3 font-medium text-center">Buy-ins</th>
                                <th className="p-3 font-medium text-right">Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedPlayers.map(p => {
                                const net = p.netAmount || 0;
                                return (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-bold text-white">{p.name}</td>
                                        <td className="p-3 text-center text-gray-400">{p.buyInCount}</td>
                                        <td className={`p-3 text-right font-mono font-bold text-base ${net >= 0 ? 'text-poker-green' : 'text-poker-red'}`}>
                                            {net > 0 ? '+' : ''}{net}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Transfer List (The "Who pays Whom") */}
            {result.isBalanced && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">💸 轉帳路徑 (Who Pays Whom)</h3>
                    {result.transfers.length === 0 ? (
                        <div className="p-4 rounded-xl bg-poker-green/10 border border-poker-green/30 text-center text-poker-green font-bold">
                            ✅ 完美結算，無需轉帳 (Perfectly Settled)
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {result.transfers.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-xl">
                                    <div className="text-poker-red font-bold text-lg">{t.fromName}</div>
                                    
                                    <div className="flex flex-col items-center px-4">
                                        <span className="text-[10px] text-gray-500 uppercase mb-1">PAYS</span>
                                        <div className="relative">
                                            <div className="h-[2px] w-16 bg-white/20"></div>
                                            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 bg-[#1a1a20] px-2 text-poker-gold font-mono font-bold">
                                                ${t.amount}
                                            </div>
                                            <div className="absolute right-0 -top-1.5 text-white/20">▶</div>
                                        </div>
                                    </div>

                                    <div className="text-poker-green font-bold text-lg">{t.toName}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex space-x-3">
            <button 
                onClick={handleCopyText}
                className="flex-1 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center border border-white/5"
            >
                📋 複製文字 (Copy)
            </button>
            <button 
                onClick={handleShareSystem}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-poker-gold to-orange-500 text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center shadow-lg"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                分享 (Share)
            </button>
        </div>
      </div>
    </div>
  );
};