
import React from 'react';
import { CalculationResult, GameSettings } from '../types';
import { generateTextSummary } from '../utils/pokerLogic';

interface SettlementPanelProps {
  result: CalculationResult | null;
  settings: GameSettings;
  onUnlock: () => void;
  currentUserIsHost: boolean;
}

export const SettlementPanel: React.FC<SettlementPanelProps> = ({ result, settings, onUnlock, currentUserIsHost }) => {
  if (!result) return null;

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
        handleCopyText();
    }
  };

  return (
    <div className="w-full bg-[#1a1a20] border-t-2 border-poker-green shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-up pb-10">
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white flex items-center">
                🏆 最終結算 (Final Results)
                </h2>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30 uppercase tracking-wider">
                    Game Locked
                </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
                所有數據已保存。如需修改，請先解除鎖定。
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
                onClick={handleShareSystem}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5"
            >
                📤 分享
            </button>
            <button 
                onClick={() => {
                    if (window.confirm("確定要解除鎖定嗎？這將隱藏結算表並允許修改數據。\n(Unlock to edit?)")) {
                        onUnlock();
                    }
                }}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                    currentUserIsHost 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!currentUserIsHost}
                title={!currentUserIsHost ? "Only Host can unlock" : "Unlock to Edit"}
            >
                🔓 解除鎖定 (Re-calc)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Stats */}
            <div className="space-y-6">
                 {/* Balance Warning */}
                {!result.isBalanced && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-5 animate-pulse">
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-red-400 font-bold text-lg">金額不平衡 (Unbalanced)</h3>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                            <span className="text-gray-400 text-sm">差異 (Discrepancy):</span>
                            <span className="text-xl font-mono font-bold text-red-400">
                                {result.totalBalance > 0 ? '+' : ''}{result.totalBalance}
                            </span>
                        </div>
                    </div>
                )}

                {/* Player Table */}
                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-gray-300">玩家戰績 (Standings)</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-black/20 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-left">Player</th>
                                <th className="p-4 text-center">Buy-ins</th>
                                <th className="p-4 text-right">Net Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedPlayers.map((p, idx) => {
                                const net = p.netAmount || 0;
                                const isWinner = net > 0;
                                return (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <span className={`text-xs w-5 h-5 flex items-center justify-center rounded ${idx === 0 ? 'bg-yellow-500 text-black font-bold' : 'bg-white/10 text-gray-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className={`font-bold ${isWinner ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                                        </td>
                                        <td className="p-4 text-center text-gray-500">{p.buyInCount}</td>
                                        <td className={`p-4 text-right font-mono font-bold text-lg ${net >= 0 ? 'text-poker-green' : 'text-poker-red'}`}>
                                            {net > 0 ? '+' : ''}{net}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column: Transfers */}
            <div>
                 <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden h-full">
                    <div className="p-4 bg-white/5 border-b border-white/5">
                        <h3 className="font-bold text-gray-300">轉帳建議 (Settlement Plan)</h3>
                    </div>
                    
                    <div className="p-5 space-y-3">
                        {result.isBalanced && result.transfers.length === 0 ? (
                             <div className="flex flex-col items-center justify-center py-10 text-gray-500 opacity-70">
                                <div className="text-4xl mb-2">✨</div>
                                <div>完美平帳，無需轉帳</div>
                             </div>
                        ) : result.isBalanced ? (
                            result.transfers.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-black/40 to-black/20 border border-white/10 p-4 rounded-xl relative overflow-hidden group">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-poker-red to-transparent"></div>
                                    
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase mb-0.5">FROM</span>
                                        <span className="text-poker-red font-bold text-lg">{t.fromName}</span>
                                    </div>

                                    <div className="flex flex-col items-center justify-center px-4 flex-1">
                                         <div className="text-2xl font-bold text-white mb-1">${t.amount}</div>
                                         <div className="h-0.5 w-full bg-white/10 relative">
                                            <div className="absolute right-0 -top-1.5 text-white/20">▶</div>
                                         </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-gray-500 uppercase mb-0.5">TO</span>
                                        <span className="text-poker-green font-bold text-lg">{t.toName}</span>
                                    </div>
                                    
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-poker-green to-transparent"></div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-red-400 py-10">
                                請先修正金額不平衡，系統無法計算轉帳路徑。
                            </div>
                        )}
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
