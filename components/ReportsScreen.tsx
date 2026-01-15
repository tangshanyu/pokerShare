import React, { useMemo } from 'react';
import { Player, CalculationResult } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';

interface ReportsScreenProps {
  onBack: () => void;
  players: Player[];
  result: CalculationResult | null;
}

export const ReportsScreen = ({ onBack, players, result }: ReportsScreenProps) => {
  
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.players
      .map(p => ({
        name: p.name,
        net: p.netAmount || 0,
        buyIn: p.buyInCount,
        chips: p.finalChips
      }))
      .sort((a, b) => b.net - a.net);
  }, [result]);

  const stats = useMemo(() => {
    if (!result) return { totalBuyIns: 0, totalChips: 0, maxWinner: null, maxLoser: null };
    
    const totalBuyIns = result.players.reduce((sum, p) => sum + p.buyInCount, 0);
    const totalChips = result.players.reduce((sum, p) => sum + p.finalChips, 0);
    const sorted = [...result.players].sort((a, b) => (b.netAmount || 0) - (a.netAmount || 0));
    
    return {
        totalBuyIns,
        totalChips,
        maxWinner: sorted.length > 0 && (sorted[0].netAmount || 0) > 0 ? sorted[0] : null,
        maxLoser: sorted.length > 0 && (sorted[sorted.length-1].netAmount || 0) < 0 ? sorted[sorted.length-1] : null
    };
  }, [result]);

  if (!result || players.length === 0) {
      return (
          <div className="fixed inset-0 z-[80] bg-[#0f0f13] flex flex-col items-center justify-center text-white">
               <div className="text-2xl mb-4">No Data</div>
               <button onClick={onBack} className="bg-white/10 px-6 py-2 rounded-xl">Back</button>
          </div>
      );
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a20] border border-white/20 p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold mb-1">{label}</p>
          <p className={`text-sm font-mono ${payload[0].value >= 0 ? 'text-poker-green' : 'text-poker-red'}`}>
            Net: {payload[0].value > 0 ? '+' : ''}{payload[0].value}
          </p>
          <p className="text-xs text-gray-400 mt-1">
             Buy-ins: {payload[0].payload.buyIn} | Chips: {payload[0].payload.chips}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#0f0f13] text-white overflow-y-auto custom-scrollbar animate-fade-in">
       <div className="max-w-6xl mx-auto p-4 md:p-8">
           
           {/* Header */}
           <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#0f0f13]/90 backdrop-blur p-4 rounded-b-2xl z-10 border-b border-white/5">
               <div className="flex items-center">
                   <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                   </button>
                   <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-poker-gold to-yellow-200">
                       📊 遊戲統計 (Statistics)
                   </h1>
               </div>
               <div className="text-xs text-gray-500 font-mono">
                   Session Report
               </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 bg-gradient-to-br from-blue-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Total Buy-ins</div>
                   <div className="text-3xl font-mono font-bold text-white mt-1">{stats.totalBuyIns}</div>
               </div>
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Total Chips</div>
                   <div className="text-3xl font-mono font-bold text-white mt-1">{stats.totalChips.toLocaleString()}</div>
               </div>
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-poker-green bg-gradient-to-br from-green-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">MVP (Winner)</div>
                   <div className="text-xl font-bold text-white mt-2 truncate">
                       {stats.maxWinner?.name || '-'}
                   </div>
                   <div className="text-sm font-mono text-poker-green">
                       {stats.maxWinner ? `+${stats.maxWinner.netAmount}` : ''}
                   </div>
               </div>
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-poker-red bg-gradient-to-br from-red-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Shark Food</div>
                   <div className="text-xl font-bold text-white mt-2 truncate">
                       {stats.maxLoser?.name || '-'}
                   </div>
                   <div className="text-sm font-mono text-poker-red">
                       {stats.maxLoser ? `${stats.maxLoser.netAmount}` : ''}
                   </div>
               </div>
           </div>

           {/* Charts */}
           <div className="glass-panel p-6 rounded-3xl mb-8 border border-white/10">
               <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                   <span className="w-2 h-6 bg-poker-green rounded mr-3"></span>
                   損益分佈 (Profit/Loss)
               </h3>
               <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" tick={{fill: '#9ca3af', fontSize: 12}} interval={0} />
                            <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
                            <Bar dataKey="net" radius={[4, 4, 4, 4]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#00dc82' : '#ff4757'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
               </div>
           </div>

           {/* Table */}
           <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
               <div className="p-6 border-b border-white/10">
                   <h3 className="text-lg font-bold text-white">詳細數據 (Details)</h3>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-white/5 text-gray-400 uppercase font-bold text-xs">
                           <tr>
                               <th className="p-4">Rank</th>
                               <th className="p-4">Player</th>
                               <th className="p-4 text-center">Buy-ins</th>
                               <th className="p-4 text-center">Final Chips</th>
                               <th className="p-4 text-right">Net Result</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                           {chartData.map((p, i) => (
                               <tr key={p.name} className="hover:bg-white/5 transition-colors">
                                   <td className="p-4 text-gray-500">#{i+1}</td>
                                   <td className="p-4 font-bold text-white">{p.name}</td>
                                   <td className="p-4 text-center text-gray-400">{p.buyIn}</td>
                                   <td className="p-4 text-center text-gray-400">{p.chips}</td>
                                   <td className={`p-4 text-right font-mono font-bold text-base ${p.net >= 0 ? 'text-poker-green' : 'text-poker-red'}`}>
                                       {p.net >= 0 ? '+' : ''}{p.net}
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>

       </div>
    </div>
  );
};