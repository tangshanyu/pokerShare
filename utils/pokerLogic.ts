import { Player, GameSettings, Transfer, CalculationResult } from '../types';

export const calculateSettlement = (players: Player[], settings: GameSettings): CalculationResult => {
  const { chipPerBuyIn, cashPerBuyIn } = settings;
  const exchangeRate = cashPerBuyIn / chipPerBuyIn; // Cash per 1 chip

  let totalBalance = 0;
  
  // 1. Calculate Net Amount for each player
  const calculatedPlayers = players.map(player => {
    // Total cost of buy-ins
    const cost = player.buyInCount * cashPerBuyIn;
    
    // Value of chips held at the end
    const finalValue = player.finalChips * exchangeRate;
    
    // Net profit/loss
    const netAmount = Math.round(finalValue - cost);
    
    totalBalance += netAmount;
    
    return { ...player, netAmount };
  });

  // Check if roughly balanced (tolerance of +/- 1 due to rounding)
  const isBalanced = Math.abs(totalBalance) <= 1;

  // 2. Calculate Transfers (only if effectively balanced, otherwise we just return stats)
  const transfers: Transfer[] = [];
  
  if (isBalanced) {
    // Separate winners and losers
    let debtors = calculatedPlayers
      .filter(p => (p.netAmount || 0) < 0)
      .map(p => ({ ...p, netAmount: p.netAmount || 0 }))
      .sort((a, b) => a.netAmount - b.netAmount); // Ascending (most negative first)

    let creditors = calculatedPlayers
      .filter(p => (p.netAmount || 0) > 0)
      .map(p => ({ ...p, netAmount: p.netAmount || 0 }))
      .sort((a, b) => b.netAmount - a.netAmount); // Descending (most positive first)

    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];

      const debtAmount = Math.abs(debtor.netAmount);
      const creditAmount = creditor.netAmount;
      
      const transferAmount = Math.min(debtAmount, creditAmount);

      if (transferAmount > 0) {
        transfers.push({
          fromName: debtor.name,
          toName: creditor.name,
          amount: Math.round(transferAmount)
        });
      }

      // Adjust remaining amounts
      debtor.netAmount += transferAmount;
      creditor.netAmount -= transferAmount;

      // Move indices if settled
      if (Math.abs(debtor.netAmount) < 0.1) debtorIdx++;
      if (Math.abs(creditor.netAmount) < 0.1) creditorIdx++;
    }
  }

  return {
    players: calculatedPlayers,
    transfers,
    totalBalance,
    isBalanced
  };
};

// URL State Management
export const serializeState = (players: Player[], settings: GameSettings): string => {
  const data = { p: players, s: settings };
  // encodeURIComponent ensures the string is safe for btoa (handles Unicode/Chinese)
  return btoa(encodeURIComponent(JSON.stringify(data)));
};

export const deserializeState = (hash: string): { players: Player[], settings: GameSettings } | null => {
  try {
    const decoded = atob(hash);
    try {
      // Try treating as URI-encoded (new format for Unicode support)
      const json = decodeURIComponent(decoded);
      const data = JSON.parse(json);
      return { players: data.p, settings: data.s };
    } catch (uriError) {
      // Fallback for legacy URLs (plain JSON) or malformed URI sequences
      // This ensures old links created before this update still work
      const data = JSON.parse(decoded);
      return { players: data.p, settings: data.s };
    }
  } catch (e) {
    console.error("Failed to parse state from URL", e);
    return null;
  }
};

// --- Export Helpers ---

export const generateCSV = (result: CalculationResult): string => {
  const headers = ['Player', 'Buy-ins', 'Final Chips', 'Net Profit/Loss'];
  const rows = result.players.map(p => [
    p.name,
    p.buyInCount,
    p.finalChips,
    p.netAmount
  ]);
  
  const transferHeaders = ['From', 'To', 'Amount'];
  const transferRows = result.transfers.map(t => [t.fromName, t.toName, t.amount]);

  let csv = headers.join(',') + '\n';
  rows.forEach(r => csv += r.join(',') + '\n');
  
  csv += '\nTRANSFERS\n' + transferHeaders.join(',') + '\n';
  transferRows.forEach(r => csv += r.join(',') + '\n');

  return csv;
};

export const generateHTMLTable = (result: CalculationResult, settings: GameSettings): string => {
  // Inline styles are required for copy-paste to Google Docs
  const tableStyle = "border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; border: 1px solid #ccc;";
  const thStyle = "background-color: #f3f3f3; border: 1px solid #ccc; padding: 8px; text-align: left;";
  const tdStyle = "border: 1px solid #ccc; padding: 8px;";
  const profitStyle = "color: #2e7d32; font-weight: bold;";
  const lossStyle = "color: #c62828; font-weight: bold;";

  let html = `
    <h2 style="font-family: Arial, sans-serif;">Poker Settlement Result</h2>
    <p>1 Buy-in = $${settings.cashPerBuyIn} (${settings.chipPerBuyIn} Chips)</p>
    
    <h3 style="font-family: Arial, sans-serif;">Player Results</h3>
    <table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">Player</th>
          <th style="${thStyle}">Buy-ins</th>
          <th style="${thStyle}">Chips</th>
          <th style="${thStyle}">Net Amount</th>
        </tr>
      </thead>
      <tbody>
  `;

  result.players.sort((a,b) => (b.netAmount || 0) - (a.netAmount || 0)).forEach(p => {
    const net = p.netAmount || 0;
    const style = net >= 0 ? profitStyle : lossStyle;
    const sign = net >= 0 ? '+' : '';
    
    html += `
      <tr>
        <td style="${tdStyle}">${p.name}</td>
        <td style="${tdStyle}">${p.buyInCount}</td>
        <td style="${tdStyle}">${p.finalChips}</td>
        <td style="${tdStyle} ${style}">${sign}$${net}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  if (result.transfers.length > 0) {
    html += `
      <h3 style="font-family: Arial, sans-serif; margin-top: 20px;">Transfers</h3>
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${thStyle}">From</th>
            <th style="${thStyle}">To</th>
            <th style="${thStyle}">Amount</th>
          </tr>
        </thead>
        <tbody>
    `;

    result.transfers.forEach(t => {
      html += `
        <tr>
          <td style="${tdStyle} color: #c62828;">${t.fromName}</td>
          <td style="${tdStyle} color: #2e7d32;">${t.toName}</td>
          <td style="${tdStyle} font-weight: bold;">$${t.amount}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p style="font-family: Arial, sans-serif; margin-top: 20px;">No transfers needed.</p>`;
  }

  return html;
};