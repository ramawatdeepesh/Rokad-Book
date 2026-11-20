import { Party, Transaction } from '../types/ledger';

export interface DailyLedgerSummary {
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  netDayFlow: number;
  closingBalance: number;
  physicalCashInHand: number;
  upiNet: number;
  khataIssued: number;
  dayCashInOnly: number;
  dayCashOutOnly: number;
  dayUpiInOnly: number;
  dayUpiOutOnly: number;
  transactionCount: number;
}

/**
 * Computes opening balance prior to `targetDate`, daily inflows/outflows (Cash + UPI),
 * physical cash drawer tally (Cash mode only), and closing balance.
 */
export function computeDailySummary(
  transactions: Transaction[],
  targetDate: string,
  baseOpeningCashBalance: number
): DailyLedgerSummary {
  let priorNetLiquid = 0;
  let priorPhysicalCash = 0;
  let cashIn = 0;
  let cashOut = 0;
  let dayCashInOnly = 0;
  let dayCashOutOnly = 0;
  let dayUpiInOnly = 0;
  let dayUpiOutOnly = 0;
  let khataIssued = 0;
  let transactionCount = 0;

  for (const tx of transactions) {
    const isLiquid = tx.paymentMode === 'Cash' || tx.paymentMode === 'UPI';

    if (tx.date < targetDate) {
      if (isLiquid) {
        priorNetLiquid += tx.direction === 'in' ? tx.amount : -tx.amount;
      }
      if (tx.paymentMode === 'Cash') {
        priorPhysicalCash += tx.direction === 'in' ? tx.amount : -tx.amount;
      }
    } else if (tx.date === targetDate) {
      transactionCount += 1;
      if (isLiquid) {
        if (tx.direction === 'in') {
          cashIn += tx.amount;
        } else {
          cashOut += tx.amount;
        }
      }
      if (tx.paymentMode === 'Cash') {
        if (tx.direction === 'in') dayCashInOnly += tx.amount;
        else dayCashOutOnly += tx.amount;
      } else if (tx.paymentMode === 'UPI') {
        if (tx.direction === 'in') dayUpiInOnly += tx.amount;
        else dayUpiOutOnly += tx.amount;
      } else if (tx.paymentMode === 'Khata') {
        khataIssued += tx.amount;
      }
    }
  }

  const openingBalance = baseOpeningCashBalance + priorNetLiquid;
  const netDayFlow = cashIn - cashOut;
  const closingBalance = openingBalance + netDayFlow;
  const physicalCashInHand =
    baseOpeningCashBalance + priorPhysicalCash + dayCashInOnly - dayCashOutOnly;
  const upiNet = dayUpiInOnly - dayUpiOutOnly;

  return {
    openingBalance,
    cashIn,
    cashOut,
    netDayFlow,
    closingBalance,
    physicalCashInHand,
    upiNet,
    khataIssued,
    dayCashInOnly,
    dayCashOutOnly,
    dayUpiInOnly,
    dayUpiOutOnly,
    transactionCount,
  };
}

export interface PartyComputedAccount {
  party: Party;
  balance: number; // > 0 = You Will Get (Lena), < 0 = You Will Give (Dena)
  lastActivityDate: string | null;
  txCount: number;
  transactions: Transaction[];
}

export function computePartyAccounts(
  parties: Party[],
  transactions: Transaction[]
): PartyComputedAccount[] {
  return parties.map((party) => {
    const linked = transactions
      .filter((tx) => tx.partyId === party.id)
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });

    let balance = party.openingBalance;
    for (const tx of linked) {
      if (tx.direction === 'in') {
        balance -= tx.amount;
      } else {
        balance += tx.amount;
      }
    }

    return {
      party,
      balance,
      lastActivityDate: linked.length > 0 ? linked[0].date : null,
      txCount: linked.length,
      transactions: linked,
    };
  });
}
