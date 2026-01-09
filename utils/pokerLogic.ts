import { Player, GameSettings, Transfer, CalculationResult } from '../types';

export const calculateSettlement = (players: readonly Player[], settings: Readonly<GameSettings>): CalculationResult => {
  const { chipPerBuyIn, cashPerBuyIn } = settings;
  
  // Guard against division by zero
  if (chipPerBuyIn === 0) {
      return { players: [], transfers: [], totalBalance: 0, isBalanced: false };
  }

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
  // If not balanced, we DO NOT calculate transfers to avoid fighting
  const isBalanced = Math.abs(totalBalance) <= (exchangeRate < 1 ? 5 : 1);

  // 2. Calculate Transfers
  const transfers: Transfer[] = [];
  
  if (isBalanced) {
    // Separate winners and losers
    // Clone objects to avoid mutating the original array reference during calculation
    let debtors = calculatedPlayers
      .filter(p => (p.netAmount || 0) < 0)
      .map(p => ({ ...p, netAmount: p.netAmount || 0 }))
      .sort((a, b) => a.netAmount - b.netAmount); // Ascending (most negative first, e.g. -1000, -500)

    let creditors = calculatedPlayers
      .filter(p => (p.netAmount || 0) > 0)
      .map(p => ({ ...p, netAmount: p.netAmount || 0 }))
      .sort((a, b) => b.netAmount - a.netAmount); // Descending (most positive first, e.g. 1000, 500)

    let debtorIdx = 0;
    let creditorIdx = 0;

    // Greedy algorithm to settle debts
    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];

      const debtAmount = Math.abs(debtor.netAmount);
      const creditAmount = creditor.netAmount;
      
      // The amount to transfer is the minimum of what debtor owes vs what creditor is owed
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

      // Move indices if settled (using small epsilon for float safety, though we rounded earlier)
      if (Math.abs(debtor.netAmount) < 0.1) debtorIdx++;
      if (creditor.netAmount < 0.1) creditorIdx++;
    }
  }

  return {
    players: calculatedPlayers,
    transfers,
    totalBalance, // If this is not 0, the UI should warn the user
    isBalanced
  };
};

// --- Export Helpers ---

export const generateTextSummary = (result: CalculationResult, settings: GameSettings): string => {
    let text = `🎲 Poker Settlement Results 🎲\n`;
    text += `---------------------------\n`;
    
    if (!result.isBalanced) {
        text += `⚠️ ERROR: Game Not Balanced!\n`;
        text += `Discrepancy: ${result.totalBalance > 0 ? '+' : ''}${result.totalBalance}\n`;
        text += `Please check chips and buy-ins.\n`;
        text += `---------------------------\n`;
    }

    // Players
    text += `[Player Stats]\n`;
    result.players.sort((a,b) => (b.netAmount || 0) - (a.netAmount || 0)).forEach(p => {
        const net = p.netAmount || 0;
        const sign = net > 0 ? '+' : '';
        text += `${p.name}: ${sign}${net} (Buy: ${p.buyInCount}, Chips: ${p.finalChips})\n`;
    });

    // Transfers
    if (result.isBalanced && result.transfers.length > 0) {
        text += `\n[Transfers - Who Pays Whom]\n`;
        result.transfers.forEach(t => {
            text += `💸 ${t.fromName} ➔ $${t.amount} ➔ ${t.toName}\n`;
        });
    } else if (result.isBalanced) {
        text += `\nNo transfers needed (Perfectly Settled).\n`;
    }

    return text;
};

export const generateHTMLTable = (result: CalculationResult, settings: Readonly<GameSettings>): string => {
  // Inline styles are required for copy-paste to Google Docs/Line Keep
  const tableStyle = "border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 14px;";
  const thStyle = "border-bottom: 2px solid #ddd; padding: 8px; text-align: left; color: #666;";
  const tdStyle = "border-bottom: 1px solid #eee; padding: 8px;";
  const profitStyle = "color: #00AA00; font-weight: bold;";
  const lossStyle = "color: #CC0000; font-weight: bold;";

  let html = `
    <div style="font-family: sans-serif; padding: 10px;">
    <h3 style="margin: 0 0 10px 0;">🎲 Poker Settlement</h3>
    <p style="font-size: 12px; color: #888; margin: 0 0 15px 0;">1 Buy-in = $${settings.cashPerBuyIn} / ${settings.chipPerBuyIn} Chips</p>
    
    <h4 style="margin: 0 0 5px 0;">📊 Player Result</h4>
    <table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thStyle}">Player</th>
          <th style="${thStyle}">Buy</th>
          <th style="${thStyle}">Chips</th>
          <th style="${thStyle}">Net</th>
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
        <td style="${tdStyle} font-weight: bold;">${p.name}</td>
        <td style="${tdStyle}">${p.buyInCount}</td>
        <td style="${tdStyle}">${p.finalChips}</td>
        <td style="${tdStyle} ${style}">${sign}${net}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  if (result.isBalanced && result.transfers.length > 0) {
    html += `
      <h4 style="margin: 20px 0 5px 0;">💸 Transfers (Who Pays Whom)</h4>
      <table style="${tableStyle}">
        <tbody>
    `;

    result.transfers.forEach(t => {
      html += `
        <tr>
          <td style="${tdStyle}"><span style="${lossStyle}">${t.fromName}</span></td>
          <td style="${tdStyle} text-align: center;">pays <strong>$${t.amount}</strong> to</td>
          <td style="${tdStyle}"><span style="${profitStyle}">${t.toName}</span></td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
  } else if (!result.isBalanced) {
      html += `<p style="color: red; font-weight: bold; margin-top: 20px;">⚠️ Unbalanced: ${result.totalBalance > 0 ? '+' : ''}${result.totalBalance}</p>`;
  }

  html += `</div>`;
  return html;
};