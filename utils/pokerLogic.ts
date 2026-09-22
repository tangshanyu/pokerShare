import { Player, GameSettings, Transfer, CalculationResult } from '../types';

export const calculateSettlement = (players: readonly Player[], settings: Readonly<GameSettings>): CalculationResult => {
  const { chipPerBuyIn, cashPerBuyIn } = settings;

  const settingsAreValid =
    Number.isFinite(chipPerBuyIn) &&
    Number.isFinite(cashPerBuyIn) &&
    chipPerBuyIn > 0 &&
    cashPerBuyIn > 0;
  const playersAreValid = players.every(player =>
    Number.isFinite(player.buyInCount) &&
    Number.isFinite(player.finalChips) &&
    player.buyInCount >= 0 &&
    player.finalChips >= 0
  );

  if (!settingsAreValid || !playersAreValid) {
    return {
      players: players.map(player => ({ ...player, netAmount: 0 })),
      transfers: [],
      totalBalance: 0,
      isBalanced: false,
    };
  }

  const exchangeRate = cashPerBuyIn / chipPerBuyIn; // Cash per 1 chip
  const totalPurchasedChips = players.reduce(
    (sum, player) => sum + player.buyInCount * chipPerBuyIn,
    0,
  );
  const totalFinalChips = players.reduce((sum, player) => sum + player.finalChips, 0);
  const chipsAreBalanced = Math.abs(totalFinalChips - totalPurchasedChips) < 1e-9;

  const calculations = players.map(player => {
    const rawNetAmount = player.finalChips * exchangeRate - player.buyInCount * cashPerBuyIn;
    return { player, rawNetAmount, netAmount: Math.round(rawNetAmount) };
  });

  let totalBalance = calculations.reduce((sum, item) => sum + item.netAmount, 0);
  const calculatedPlayers = calculations.map(item => ({ ...item.player, netAmount: item.netAmount }));

  // When chips are exactly conserved, per-player currency rounding may introduce a
  // small drift. Apply that drift to the largest absolute result so transfers still
  // sum to zero without hiding an actual chip-count mismatch.
  if (chipsAreBalanced && totalBalance !== 0 && calculatedPlayers.length > 0) {
    const adjustmentIndex = calculations.reduce(
      (best, item, index, all) =>
        Math.abs(item.rawNetAmount) > Math.abs(all[best].rawNetAmount) ? index : best,
      0,
    );
    calculatedPlayers[adjustmentIndex] = {
      ...calculatedPlayers[adjustmentIndex],
      netAmount: (calculatedPlayers[adjustmentIndex].netAmount ?? 0) - totalBalance,
    };
    totalBalance = 0;
  }

  const isBalanced = chipsAreBalanced && totalBalance === 0;

  // 2. Calculate Transfers
  const transfers: Transfer[] = [];
  
  if (isBalanced) {
    // Separate winners and losers
    // Clone objects to avoid mutating the original array reference during calculation
    const debtors = calculatedPlayers
      .filter(p => (p.netAmount || 0) < 0)
      .map(p => ({ ...p, netAmount: p.netAmount || 0 }))
      .sort((a, b) => a.netAmount - b.netAmount); // Ascending (most negative first, e.g. -1000, -500)

    const creditors = calculatedPlayers
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

export const generateTextSummary = (result: CalculationResult, settings: GameSettings): string => {
    const { chipPerBuyIn, cashPerBuyIn } = settings;
    const exchangeRate = cashPerBuyIn / chipPerBuyIn;
    const dateStr = new Date().toLocaleDateString();

    let text = `德州撲克結算\n`;
    text += `====================\n`;
    text += `日期: ${dateStr}\n`;
    text += `兌換比例: ${chipPerBuyIn} 籌碼 = ${cashPerBuyIn} 現金\n`;
    text += `====================\n\n`;

    if (!result.isBalanced) {
        text += `⚠️ 錯誤: 金額不平衡! 差異: ${result.totalBalance > 0 ? '+' : ''}${result.totalBalance}\n`;
        text += `請檢查籌碼與買入金額。\n`;
        text += `---------------------------\n\n`;
    }

    // Players
    // Sort by Net Amount descending (Winners first)
    const sortedPlayers = [...result.players].sort((a,b) => (b.netAmount || 0) - (a.netAmount || 0));
    
    sortedPlayers.forEach(p => {
        const net = p.netAmount || 0;
        const cost = p.buyInCount * cashPerBuyIn;
        // Calculate remaining value based on final chips
        const value = Math.round(p.finalChips * exchangeRate);
        const sign = net >= 0 ? '+' : '-'; // Explicit sign

        text += `玩家: ${p.name}\n`;
        text += `  - 購買籌碼組數: ${p.buyInCount}\n`;
        text += `  - 剩餘籌碼: ${p.finalChips}\n`;
        text += `  - 成本: $${cost}\n`;
        text += `  - 剩餘價值: $${value}\n`;
        text += `  - 損益: $${sign}${Math.abs(net)}\n\n`;
    });

    // Transfers
    if (result.isBalanced && result.transfers.length > 0) {
        text += `轉帳方案:\n`;
        result.transfers.forEach(t => {
            text += `  - ${t.fromName} 需支付給 ${t.toName} $${t.amount}\n`;
        });
    } else if (result.isBalanced) {
        text += `無需轉帳 (帳目完美平衡)\n`;
    }

    return text;
};
