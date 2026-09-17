export const ORDER_STATUSES = ['new', 'current', 'old', 'problematic'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'NEW', color: '#2563eb', bg: '#eff6ff' },
  current: { label: 'CURRENT', color: '#059669', bg: '#ecfdf5' },
  old: { label: 'OLD', color: '#64748b', bg: '#f1f5f9' },
  problematic: { label: 'PROBLEMATIC', color: '#dc2626', bg: '#fef2f2' },
};

export const ORDER_ORIGINS = [
  { id: 'myhome', label: 'Myhome' },
  { id: 'ssge', label: 'Ss.ge' },
  { id: 'korteri', label: 'Korteri' },
  { id: 'phone', label: 'ტელეფონი' },
] as const;

export const ORDER_DEAL_META = {
  sale: { label: 'ყიდვა', color: '#d97706' },
  rent: { label: 'ქირაობა', color: '#059669' },
} as const;

export interface OrderComment {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

export interface OrderViewing {
  id: string;
  shownAt: string;
  listingIds: string[];
  note?: string;
  author?: string;
  createdAt: string;
}

export interface OrderRow {
  id: string;
  clientName: string;
  clientPhone: string;
  dealType: 'sale' | 'rent';
  budgetAmount: number;
  budgetCurrency: 'USD' | 'GEL';
  origin: string[];
  status: OrderStatus;
  comments: OrderComment[];
  viewings: OrderViewing[];
  createdByUserId?: number | null;
  createdByName?: string | null;
  assignedToUserId?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export function digitsOf(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phoneReady(phone: string): boolean {
  return digitsOf(phone).length >= 9;
}
