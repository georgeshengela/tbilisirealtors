/** Agency cut shown under სრული ფასი and on price hover. */
export const COMMISSION_RATE = 0.03;

export function commissionOf(amount: number | string): number {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * COMMISSION_RATE);
}

export function formatCommissionLine(amount: number | string, currency: string): string {
  const fee = commissionOf(amount);
  if (!fee) return '';
  return `3% · ${fee.toLocaleString('ka-GE')} ${currency}`;
}

export function formatCommissionUsd(usdAmount: number | string): string {
  const fee = commissionOf(usdAmount);
  if (!fee) return '';
  return `3% · $${fee.toLocaleString('ka-GE')}`;
}
