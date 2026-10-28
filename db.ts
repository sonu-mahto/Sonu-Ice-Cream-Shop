
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

function jsSha256(ascii: string): string {
  ascii = unescape(encodeURIComponent(ascii));
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number;
  let j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[i] + (w[i] = (i < 16) ? (w[i] || 0) : (
        (w[i - 16] +
        (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
        w[i - 7] +
        (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0
      ))) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >>> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salted = password + 'sonu_salt_2024';
  if (typeof crypto !== 'undefined' && crypto && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const msgBuffer = new TextEncoder().encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to jsSha256
    }
  }
  return jsSha256(salted);
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to standard fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
