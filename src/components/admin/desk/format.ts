/** "3 დღეში" / "2 დღით გადაცილებული" from a signed day offset. */
export function relativeDays(days: number | null): { text: string; overdue: boolean } {
  if (days === null) return { text: '—', overdue: false };
  if (days === 0) return { text: 'დღეს', overdue: true };
  if (days === 1) return { text: 'ხვალ', overdue: false };
  if (days === -1) return { text: '1 დღით გადაცილებული', overdue: true };
  if (days < 0) return { text: `${Math.abs(days)} დღით გადაცილებული`, overdue: true };
  return { text: `${days} დღეში`, overdue: false };
}
