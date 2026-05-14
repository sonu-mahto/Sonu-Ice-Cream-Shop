export interface Product {
  id: string;
  name: string;
  currentPrice: number;
  isActive: boolean;
  createdAt: number;
}

export interface Salesman {
  id: string;
  name: string;
  phone?: string;
  isActive: boolean;
  createdAt: number;
}

export interface DispatchRecord {
  id: string;
  date: string; // YYYY-MM-DD
  salesmanId: string;
  salesmanNameSnapshot: string;
  productId: string;
  productNameSnapshot: string;
  givenQuantity: number;
  returnedQuantity: number | null;
  soldQuantity: number;
  priceSnapshot: number;
  amount: number;
  dispatchRound: number;
}

export interface Settlement {
  id: string;
  date: string; // YYYY-MM-DD
  salesmanId: string;
  salesmanNameSnapshot: string;
  totalAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  settlementLocked: boolean;
  createdAt: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  salesmanId: string;
  amountPaid: number;
  note?: string;
  createdAt: number;
}

export interface UserSession {
  isLoggedIn: boolean;
  ownerUsername: string | null;
}

export interface DatabaseState {
  products: Product[];
  salesmen: Salesman[];
  dispatches: DispatchRecord[];
  settlements: Settlement[];
  paymentLedger: PaymentRecord[];
  ownerUsername: string | null;
  ownerHash: string | null;
  recoveryHash: string | null;
  lastFirebaseSync?: number;
  firebaseDocId?: string;
  autoSyncEnabled?: boolean;
  lastUpdated?: string; // ISO String
}