
import { DatabaseState } from './types';

const STORAGE_KEY = 'sonu_ice_cream_db';

const initialState: DatabaseState = {
  products: [],
  salesmen: [],
  dispatches: [],
  settlements: [],
  paymentLedger: [],
  ownerUsername: null,
  ownerHash: null,
  recoveryHash: null,
};

export const loadDB = (): DatabaseState => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return initialState;

  const parsed = JSON.parse(data);
  // Migration for old data if necessary
  if (parsed.vehicles) {
    parsed.salesmen = parsed.vehicles;
    delete parsed.vehicles;
  }
  if (!parsed.paymentLedger) {
    parsed.paymentLedger = [];
  }
  return parsed;
};

export const saveDB = (state: DatabaseState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const hashPassword = async (password: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(password + 'sonu_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
