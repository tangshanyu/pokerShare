import React, { useMemo, useState } from 'react';
import { useStorage } from '../liveblocks.config';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, AreaChart, Area, Legend
} from 'recharts';

interface ReportsScreenProps {
  onBack: () => void;
}

export const ReportsScreen = ({ onBack }: ReportsScreenProps) => {
  const globalGameLogs = useStorage((root) => root.gameLogs);
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days'>('all');

  // --- Data Processing ---
  const processedData = useMemo(() => {
    if (!globalGameLogs) return null;

    let logs = [...globalGameLogs];
    const now = Date.now();

    // Filter by Time
    if (timeFilter === '30days') {
       logs = logs.filter(l => (now - l.timestamp) < 30 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === '7days') {
       logs = logs.filter(l => (now - l.timestamp) < 7 * 24 * 60 * 60 * 1000);
    }

    // 1. Player Aggregates (Total Profit/Loss)
    const playerMap = new Map<string, { name: string, net: number, games: number, wins: number }>();
    
    // 2. Date Aggregates (Daily Activity)
    const dateMap = new Map<string, { date: string, games: number, volume: number }>();

    logs.forEach(log => {
        // Date Stats
        const dateStr = new Date(log.timestamp).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
        if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, { date: dateStr, games: 0, volume: 0 });
        }
        const dStat = dateMap.get(dateStr)!;
        dStat.games += 1;

        // Player Stats
        let totalPot = 0;
        log.players.forEach(p => {
            if (!playerMap.has(p.name)) {
                playerMap.set(p.name, { name: p.name, net: 0, games: 0, wins: 0 });
            }
            const pStat = playerMap.get(p.name)!;
            pStat.net += p.net;
            pStat.games += 1;
            if (p.net > 0) pStat.wins += 1;
            
            if (p.net > 0) totalPot += p.net;
        });
        dStat.volume += totalPot;
    });

    const playerStats = Array.from(playerMap.values()).sort((a, b) => b.net - a.net);
    const dateStats = Array.from(dateMap.values()).reverse(); // Show oldest to newest if logs are new-first

    // Top Winners & Losers
    const winners = playerStats.filter(p => p.net > 0).slice(0, 5);
    const losers = playerStats.filter(p => p.net < 0).sort((a, b) => a.net - b.net).slice(0, 5); // Ascending (most negative first)

    return {
        totalGames: logs.length,
        totalVolume: dateStats.reduce((acc, curr) => acc + curr.volume, 0),
        playerStats,
        dateStats,
        winners,
        losers
    };
  }, [globalGameLogs, timeFilter]);

  if (!globalGameLogs) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-poker-green">
              <div className="animate-spin h-10 w-10 border-4 border-poker-green border-t-transparent rounded-full mb-4"></div>
              <div className="font-mono animate-pulse">Downloading Financial Data...</div>
          </div>
      );
  }

  if (!processedData || processedData.totalGames === 0) {
      return (
          <div className="p-8 text-center">
               <div className="text-4xl mb-4">📉</div>
               <h2 className="text-xl font-bold text-white mb-2">No Data Available</h2>
               <p className="text-gray-400 mb-8">Play some games to generate reports!</p>
               <button onClick={onBack} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-white">Back to Home</button>
          </div>
      );
  }

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a20] border border-white/20 p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }} className="text-xs font-mono">
                  {entry.name}: {entry.value}
              </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white p-4 md:p-8 overflow-y-auto custom-scrollbar">
       <div className="max-w-6xl mx-auto pb-20">
           
           {/* Header */}
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
               <div>
                   <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white mb-2 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                       返回大廳 (Back)
                   </button>
                   <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-poker-gold to-yellow-200">
                       📊 戰績報表 (Analytics)
                   </h1>
               </div>

               {/* Filters */}
               <div className="flex bg-white/5 p-1 rounded-xl">
                   {['all', '30days', '7days'].map(filter => (
                       <button
                         key={filter}
                         onClick={() => setTimeFilter(filter as any)}
                         className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === filter ? 'bg-poker-green text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                       >
                           {filter === 'all' ? 'All Time' : filter === '30days' ? 'Last 30 Days' : 'Last 7 Days'}
                       </button>
                   ))}
               </div>
           </div>

           {/* Summary Cards */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 bg-gradient-to-br from-blue-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Total Games</div>
                   <div className="text-3xl font-mono font-bold text-white mt-1">{processedData.totalGames}</div>
               </div>
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-poker-gold bg-gradient-to-br from-yellow-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Total Volume ($)</div>
                   <div className="text-3xl font-mono font-bold text-poker-gold mt-1">
                       {processedData.totalVolume.toLocaleString()}
                   </div>
               </div>
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-poker-green bg-gradient-to-br from-green-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Top Winner</div>
                   <div className="text-xl font-bold text-white mt-2 truncate">
                       {processedData.winners[0]?.name || '-'}
                   </div>
                   <div className="text-sm font-mono text-poker-green">
                       {processedData.winners[0] ? `+$${processedData.winners[0].net}` : ''}
                   </div>
               </div>
               <div className="glass-panel p-5 rounded-2xl border-l-4 border-poker-red bg-gradient-to-br from-red-500/10 to-transparent">
                   <div className="text-gray-400 text-xs font-bold uppercase">Top Donation</div>
                   <div className="text-xl font-bold text-white mt-2 truncate">
                       {processedData.losers[0]?.name || '-'}
                   </div>
                   <div className="text-sm font-mono text-poker-red">
                       {processedData.losers[0] ? `$${processedData.losers[0].net}` : ''}
                   </div>
               </div>
           </div>

           {/* Charts Section */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
               
               {/* 1. Net Profit Distribution */}
               <div className="glass-panel p-6 rounded-3xl">
                   <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                       <span className="w-2 h-6 bg-poker-green rounded mr-3"></span>
                       玩家損益分佈 (Net Profit by Player)
                   </h3>
                   <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processedData.playerStats.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#9ca3af', fontSize: 12}} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="net" radius={[4, 4, 4, 4]}>
                                    {processedData.playerStats.slice(0, 10).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#00dc82' : '#ff4757'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
               </div>

               {/* 2. Daily Activity */}
               <div className="glass-panel p-6 rounded-3xl">
                   <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                       <span className="w-2 h-6 bg-blue-500 rounded mr-3"></span>
                       每日場次趨勢 (Games per Day)
                   </h3>
                   <div className="h-[300px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={processedData.dateStats}>
                               <defs>
                                   <linearGradient id="colorGames" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                   </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                               <XAxis dataKey="date" tick={{fill: '#6b7280', fontSize: 10}} />
                               <YAxis tick={{fill: '#6b7280', fontSize: 10}} />
                               <Tooltip content={<CustomTooltip />} />
                               <Area type="monotone" dataKey="games" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGames)" />
                           </AreaChart>
                       </ResponsiveContainer>
                   </div>
               </div>

           </div>

           {/* 3. Detailed Stats Table */}
           <div className="glass-panel rounded-3xl overflow-hidden">
               <div className="p-6 border-b border-white/10 flex justify-between items-center">
                   <h3 className="text-lg font-bold text-white">詳細數據 (Details)</h3>
                   <span className="text-xs text-gray-500">Sorted by Net Profit</span>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-white/5 text-gray-400 uppercase font-bold text-xs">
                           <tr>
                               <th className="p-4">Player</th>
                               <th className="p-4 text-center">Games Played</th>
                               <th className="p-4 text-center">Win Rate</th>
                               <th className="p-4 text-right">Total Net</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                           {processedData.playerStats.map((p, i) => (
                               <tr key={p.name} className="hover:bg-white/5 transition-colors">
                                   <td className="p-4 font-bold flex items-center">
                                       <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[10px] mr-3 text-gray-400">{i+1}</span>
                                       {p.name}
                                   </td>
                                   <td className="p-4 text-center text-gray-400">{p.games}</td>
                                   <td className="p-4 text-center text-gray-400">
                                       {((p.wins / p.games) * 100).toFixed(0)}%
                                   </td>
                                   <td className={`p-4 text-right font-mono font-bold ${p.net >= 0 ? 'text-poker-green' : 'text-poker-red'}`}>
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