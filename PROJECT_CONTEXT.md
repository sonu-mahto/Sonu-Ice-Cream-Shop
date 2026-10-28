# 🍦 Sonu Ice Cream Shop — Project Context

> **Last Updated:** May 2026  
> **Version:** 0.0.7  
> **Owner:** Sonu Mahto  
> **App ID:** `com.sonu.icecream`

---

## 1. What Is This Project?

A **mobile-first business management app** for a real ice cream shop. It tracks daily operations: dispatching ice cream stock to salesmen, recording returns, calculating settlements with commission, and maintaining a financial ledger per salesman. It runs as a **web app** and is packaged as an **Android APK** via Capacitor.

**This is a production app actively used for real business operations. Treat all data operations with extreme care.**

---

## 2. Tech Stack

| Layer            | Technology                                                       |
| ---------------- | ---------------------------------------------------------------- |
| **Frontend**     | React 19 + TypeScript (single-file SPA in `App.tsx`)             |
| **Styling**      | Tailwind CSS v4 (via `@tailwindcss/vite` plugin)                 |
| **Build Tool**   | Vite 6 (dev server on port `3001`, host `0.0.0.0`)              |
| **Icons**        | `lucide-react`                                                   |
| **Fonts**        | Google Fonts — Poppins (body) + Lilita One (brand headings)      |
| **Database**     | Firebase Firestore (cloud) + `localStorage` (offline-first)      |
| **Mobile**       | Capacitor 8 (Android wrapper)                                    |
| **Sharing**      | `@capacitor/share` + WhatsApp deep-linking (`whatsapp://send`)   |
| **Hosting**      | Netlify (web), APK sideloaded on Android                         |

---

## 3. Project File Structure

```
sonu-ice-cream-shop/
├── index.html              # HTML entry point (viewport, fonts, root div)
├── index.tsx               # React entry — mounts <App /> to #root
├── index.css               # Global CSS: Tailwind import, glass-card, no-scrollbar, etc.
├── App.tsx                  # ⚡ MONOLITH — ALL views, components, and logic (~2082 lines)
├── types.ts                # TypeScript interfaces for all data models
├── db.ts                   # localStorage persistence layer + SHA-256 password hashing
├── firebase.ts             # Firebase app init + Firestore export (uses env vars)
├── .env.local              # 🔒 Firebase config + Gemini API key (NEVER commit)
├── vite.config.ts           # Vite config: React plugin, Tailwind, path aliases, env
├── capacitor.config.ts      # Capacitor config: app ID, Capgo OTA settings
├── tsconfig.json            # TypeScript config: ES2022, JSX react-jsx, bundler resolution
├── package.json             # Dependencies and scripts
├── netlify.toml             # Netlify deployment config (SPA redirects)
├── android/                 # Capacitor Android project (Gradle-based)
├── dist/                    # Build output (serves as Capacitor webDir)
├── SonuIceCreamShop.apk     # Pre-built APK binary
├── sonu_flutter/            # ⚠️ DEPRECATED — old Flutter version, safe to delete
└── 60d0b967-*/              # Miscellaneous/temp folder
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx (Monolith)                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │LoginScreen│ │ Dashboard │  │ Dispatch  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Returns  │ │Settlement │  │  Ledger   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Reports  │ │  Manage   │  │CloudSync  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌────────────────┐  ┌──────────────────┐           │
│  │  Navbar (tabs)  │  │ DateSelector     │           │
│  └────────────────┘  └──────────────────┘           │
└────────────────┬────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
  ┌──▼───┐            ┌─────▼──────┐
  │db.ts │            │firebase.ts │
  │local │            │ Firestore  │
  │Storage│            │  Cloud DB  │
  └──────┘            └────────────┘
```

### Key Architectural Decisions

- **Single-file SPA:** All views/components live in `App.tsx`. No routing library — tab switching via `activeTab` state.
- **Offline-first:** Data is always saved to `localStorage` first (via `db.ts`), then optionally synced to Firestore.
- **Real-time sync:** Uses Firestore `onSnapshot` listener for live cloud data updates when logged in.
- **Auto-sync debounce:** When `autoSyncEnabled` is true, every `db` state change triggers a 5-second debounced write to Firestore.
- **Timestamp-based conflict resolution:** Cloud vs local data compared via `lastUpdated` ISO string — newer wins.

---

## 5. Data Models (`types.ts`)

### Product
```ts
{ id, name, currentPrice, isActive, createdAt }
```

### Salesman
```ts
{ id, name, phone?, isActive, createdAt }
```

### DispatchRecord
```ts
{ id, date (YYYY-MM-DD), salesmanId, salesmanNameSnapshot, productId, 
  productNameSnapshot, givenQuantity, returnedQuantity (null = still on field), 
  soldQuantity, priceSnapshot, amount, dispatchRound }
```

### Settlement
```ts
{ id, date, salesmanId, salesmanNameSnapshot, totalAmount, 
  commissionPercent, commissionAmount, netAmount, settlementLocked, createdAt }
```

### PaymentRecord
```ts
{ id, date, salesmanId, amountPaid, note?, createdAt }
```

### DatabaseState (root state)
```ts
{ products[], salesmen[], dispatches[], settlements[], paymentLedger[],
  ownerUsername, ownerHash, recoveryHash, lastFirebaseSync?, firebaseDocId?,
  autoSyncEnabled?, lastUpdated? }
```

---

## 6. Feature Map & Views

| Tab/View        | Component Name       | Purpose                                                                 |
| --------------- | -------------------- | ----------------------------------------------------------------------- |
| **Login**       | `LoginScreen`        | Auth with cloud-first + local fallback. Setup, recovery, emergency reset |
| **Home**        | `DashboardView`      | Daily summary: on-field/waitlist/settled counts, revenue card, overdue alerts |
| **Dispatch**    | `DispatchView`       | Assign ice cream stock to salesmen (multi-product, multi-round)         |
| **Returns**     | `ReturnsView`        | Record unsold stock returned by each salesman                           |
| **Ledger**      | `LedgerView`         | Per-salesman debt tracking: total settled debt minus payments received  |
| **Settle**      | `SettlementView`     | Finalize daily sales: commission calc (40%/50%), lock settlement, record payment |
| **Reports**     | `ReportsView`        | Date-range filtered settlement history with period summary              |
| **Manage**      | `ManageView`         | Add/edit/delete products & salesmen. Cloud sync panel. Logout.          |
| **Cloud Sync**  | `FirebaseSyncPanel`  | Manual upload/download to Firebase, auto-sync toggle, recovery phrase   |

### Shared Components
- `Navbar` — Bottom nav with 6 tabs (Home, Dispatch, Returns, Ledger, Settle, Manage)
- `DateSelector` — Custom styled date picker with `showPicker()` API + future date prevention

---

## 7. Business Logic (Critical Flows)

### Daily Workflow
1. **Dispatch** → Assign stock quantities per product to a salesman (creates `DispatchRecord` entries)
2. **Returns** → Salesman returns unsold stock (updates `returnedQuantity` on dispatch records)
3. **Settlement** → Calculate total sold × price, apply commission %, lock settlement
4. **Payment** → Record cash received from salesman (updates ledger balance)

### Commission System
- Default options: **40%** or **50%** (custom % also supported)
- `commissionAmount = totalSales × commissionPercent / 100`
- `netAmount = totalSales - commissionAmount` (what the store keeps)

### Settlement Sharing (WhatsApp)
- Generates formatted message with itemized sales
- Tries `whatsapp://send` deep link first (with 91+phone)
- Falls back to `@capacitor/share` native share sheet
- Always copies to clipboard as baseline

### Authentication
- SHA-256 hashed passwords with salt `'sonu_salt_2024'`
- Cloud-first login: checks Firestore `ice_cream_shops/{username}_data` document
- Local fallback if cloud unavailable
- Recovery phrase system for password reset
- Emergency reset option (wipes all local data)

### Date Handling
- IST timezone hardcoded (`UTC + 5.5 hours`)
- All dates stored as `YYYY-MM-DD` strings
- Future dates prevented in the date selector

---

## 8. Firebase Configuration

- **Collection:** `ice_cream_shops`
- **Document pattern:** `{username}_data` (contains entire `DatabaseState`)
- **Auth:** No Firebase Auth used — custom username/password with SHA-256
- **Env vars required in `.env.local`:**
  ```
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET
  VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID
  GEMINI_API_KEY  (exposed as process.env.GEMINI_API_KEY via vite.config)
  ```
- **Security:** Firestore rules should protect the `ice_cream_shops` collection

---

## 9. Mobile (Android) Setup

- **Capacitor 8** wraps the Vite build output (`dist/` → `android/app/src/main/assets/public/`)
- APK built via: `npm run build` → `npx cap sync android` → Android Studio Gradle build

---

## 10. Development Commands

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3001)
npm run dev

# Build for production
npm run build

# Sync with Capacitor Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 11. Deployment

| Target      | Method                                                   |
| ----------- | -------------------------------------------------------- |
| **Web**     | Netlify — auto-deploys from build, SPA redirects in `netlify.toml` |
| **Android** | Build APK in Android Studio, sideload                    |

---

## 12. Design System

### Color Palette
| Token           | Hex       | Usage                        |
| --------------- | --------- | -----------------------------|
| Primary Brown   | `#5D4037` | Text, dark cards, CTA        |
| Warm Orange     | `#FF8A65` | Buttons, accents             |
| Light Peach     | `#FFAB91` | Gradients, hover states      |
| Cream BG        | `#FFFBF7` | Page backgrounds             |
| Light Cream     | `#FFF4E6` | Card backgrounds             |
| Muted Brown     | `#A1887F` | Secondary text, labels       |
| Success Green   | `#43A047` | Net amounts, settled status  |
| Error Red       | `#D32F2F` | Negative amounts, delete     |
| Info Blue       | `#1E88E5` | Payment UI, returned status  |

### Typography
- **Body:** Poppins (300–700)
- **Brand:** Lilita One (cursive display font)
- **Pattern:** All-caps, tracked-wide labels (`tracking-[0.2em]`)

### Component Patterns
- Rounded cards: `rounded-[32px]` to `rounded-[40px]`
- Glass cards: `bg-white/70 backdrop-blur-10px`
- Premium shadows: `box-shadow: 0 10px 30px -5px rgba(93,64,55,0.08)`
- Mobile-optimized: `safe-area-inset-*`, `100dvh`, no-scrollbar utility

---

## 13. Known Issues & Technical Debt

1. **Monolithic `App.tsx`** (~2082 lines, ~108KB) — all views in one file. Consider splitting into separate component files.
2. **No routing library** — tab-based navigation via state. Works fine for mobile but limits deep linking.
3. **No Firebase Auth** — custom SHA-256 auth. Not industry-standard security.
4. **IST timezone hardcoded** — won't work correctly in other timezones.
5. **`sonu_flutter/` folder** — deprecated Flutter experiment, safe to delete.
6. **`60d0b967-*/` folder** — appears to be a temp/artifact folder, review and clean up.
7. **GEMINI_API_KEY** in env but not visibly used in the app code (may be for future AI features).
8. **No tests** — no unit or integration tests exist.
9. **localStorage size limit** — as data grows, localStorage (5-10MB limit) may become a bottleneck.

---

## 14. Quick Reference for AI Agents

### To add a new feature/view:
1. Add the view component function in `App.tsx`
2. Add a case in `renderContent()` switch (line ~404)
3. If it needs a nav tab, add to the `tabs` array in `Navbar` (line ~72)

### To modify data models:
1. Update interface in `types.ts`
2. Add migration logic in `db.ts` → `loadDB()` if needed
3. Ensure Firebase sync still works (entire `DatabaseState` is synced as one document)

### To update the mobile app:
1. Run `npm run build`
2. Run `npx cap sync android`
3. For OTA: use Capgo CLI to push the bundle
4. For new APK: open in Android Studio and build

### Critical constants:
- `FIREBASE_COLLECTION = 'ice_cream_shops'` (line 47 in App.tsx)
- `STORAGE_KEY = 'sonu_ice_cream_db'` (line 4 in db.ts)
- Password salt: `'sonu_salt_2024'` (line 38 in db.ts)
- Dev server port: `3001` (vite.config.ts)
