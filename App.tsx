import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db as firestore } from './firebase';
import { Share } from '@capacitor/share';
import {
  LayoutDashboard,
  Send,
  RotateCcw,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Calendar,
  Lock,
  CheckCircle2,
  IceCream,
  User,
  BarChart3,
  UserCheck,
  Clock,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Truck,
  BookOpen,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Share2,
  Eye,
  EyeOff
} from 'lucide-react';
import { loadDB, saveDB, hashPassword, generateUUID } from './db';
import { Product, Salesman, DispatchRecord, Settlement, PaymentRecord, DatabaseState } from './types';

const FIREBASE_COLLECTION = 'ice_cream_shops';

// Helper to wrap promises with a timeout
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

// Helper to get local date string in YYYY-MM-DD format
const getLocalDateString = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 5.5)); // IST offset is +5.5
  const year = nd.getFullYear();
  const month = String(nd.getMonth() + 1).padStart(2, '0');
  const day = String(nd.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Shared Components
const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'dispatch', label: 'Dispatch', icon: Send },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'settle', label: 'Settle', icon: CreditCard },
    { id: 'manage', label: 'Manage', icon: Settings },
  ];

  return (
    <nav
      className="bg-white/95 backdrop-blur-md border-t border-[#FFF1E0] flex justify-around items-center px-1 sticky bottom-0 z-50 premium-shadow"
      style={{
        height: 'calc(5rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-1.5 min-w-[50px] transition-all duration-300 ${isActive ? 'text-[#D32F2F] scale-110' : 'text-[#A1887F]'
              }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[8px] font-bold mt-1 uppercase tracking-wider ${isActive ? 'text-[#D32F2F]' : 'text-[#A1887F]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const DateSelector = ({ date, onChange }: { date: string, onChange: (d: string) => void }) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatDateLabel = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoDate;
    }
  };

  const handleContainerClick = () => {
    if (dateInputRef.current) {
      // The showPicker API is the modern way to programmatically open the date picker
      if (typeof (dateInputRef.current as any).showPicker === 'function') {
        try {
          (dateInputRef.current as any).showPicker();
        } catch (e) {
          dateInputRef.current.focus();
        }
      } else {
        // Fallback for older browsers
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  const handleChange = (val: string) => {
    const today = getLocalDateString();
    if (val > today) {
      alert("Future dates are not allowed!");
      onChange(today);
    } else {
      onChange(val);
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="relative mb-6 h-16 w-full cursor-pointer group pointer-events-auto"
    >
      <div className="absolute inset-0 bg-white/90 border border-white rounded-[24px] flex items-center px-5 py-4 premium-shadow z-0 group-active:bg-white transition-colors">
        <div className="bg-[#FFF1E0] p-2 rounded-xl mr-4"><Calendar size={18} className="text-[#E87A5D]" /></div>
        <span className="flex-1 font-bold text-[#5D4037]">{formatDateLabel(date)}</span>
        <ChevronDown size={20} className="text-[#D7CCC8]" />
      </div>
      <input
        ref={dateInputRef}
        type="date"
        value={date}
        max={getLocalDateString()}
        onChange={(e) => handleChange(e.target.value)}
        className="opacity-0 absolute pointer-events-none"
        style={{ colorScheme: 'light' }}
      />
    </div>
  );
};

export default function App() {
  const [db, setDb] = useState<DatabaseState>(loadDB());
  const [session, setSession] = useState<{ isLoggedIn: boolean; ownerUsername: string | null }>({
    isLoggedIn: false,
    ownerUsername: null,
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [loading, setLoading] = useState(false);
  const lastSyncedDbRef = useRef<DatabaseState | null>(loadDB());

  useEffect(() => {
    const saved = localStorage.getItem('sonu_session');
    if (saved) setSession(JSON.parse(saved));

  }, []);

  // Background cleanup effect removed to preserve user production data

  // Real-time Cloud Sync Listener
  useEffect(() => {
    const username = session.ownerUsername;
    if (firestore && session.isLoggedIn && username) {
      console.log("Setting up real-time listener for:", username);
      const docRef = doc(firestore, FIREBASE_COLLECTION, `${username}_data`);

      const unsubscribe = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as DatabaseState;

          // Timestamp-based merging
          const cloudTime = cloudData.lastUpdated ? new Date(cloudData.lastUpdated).getTime() : 0;
          const localTime = db.lastUpdated ? new Date(db.lastUpdated).getTime() : 0;

          if (cloudTime > localTime) {
            console.log("Cloud data is newer, updating local state...");
            try {
              const monthlySnap = await getDocs(collection(firestore!, FIREBASE_COLLECTION, `${username}_data`, "monthly_data"));
              const mergedDb: DatabaseState = {
                ...cloudData,
                dispatches: [],
                settlements: [],
                paymentLedger: []
              };
              if (monthlySnap.empty) {
                mergedDb.dispatches = cloudData.dispatches || [];
                mergedDb.settlements = cloudData.settlements || [];
                mergedDb.paymentLedger = cloudData.paymentLedger || [];
              } else {
                monthlySnap.forEach((doc) => {
                  const data = doc.data();
                  if (data.dispatches) mergedDb.dispatches.push(...data.dispatches);
                  if (data.settlements) mergedDb.settlements.push(...data.settlements);
                  if (data.paymentLedger) mergedDb.paymentLedger.push(...data.paymentLedger);
                });
              }
              setDb(mergedDb);
              lastSyncedDbRef.current = mergedDb;
            } catch (err) {
              console.error("Failed to pull monthly partitioned data during sync:", err);
            }
          } else {
            console.log("Local data is up to date or cloud data is older.");
          }
        }
      }, (err) => {
        console.error("Cloud sync listener error:", err);
      });

      return () => unsubscribe();
    }
  }, [session.isLoggedIn, session.ownerUsername, db.lastUpdated]);

  useEffect(() => {
    saveDB(db);

    // Auto-sync with Firebase if logged in and correctly configured
    if (firestore && session.isLoggedIn && db.ownerUsername) {
      const timeoutId = setTimeout(async () => {
        try {
          const docRef = doc(firestore!, FIREBASE_COLLECTION, `${db.ownerUsername}_data`);

          // Group by month
          const group: Record<string, { dispatches: any[], settlements: any[], paymentLedger: any[] }> = {};
          const getMonth = (dateStr: string) => dateStr.slice(0, 7);

          db.dispatches.forEach(d => {
            const m = getMonth(d.date);
            if (!group[m]) group[m] = { dispatches: [], settlements: [], paymentLedger: [] };
            group[m].dispatches.push(d);
          });
          db.settlements.forEach(s => {
            const m = getMonth(s.date);
            if (!group[m]) group[m] = { dispatches: [], settlements: [], paymentLedger: [] };
            group[m].settlements.push(s);
          });
          db.paymentLedger.forEach(p => {
            const m = getMonth(p.date);
            if (!group[m]) group[m] = { dispatches: [], settlements: [], paymentLedger: [] };
            group[m].paymentLedger.push(p);
          });

          // Determine modified months compared to lastSyncedDbRef
          const modified = new Set<string>();
          const last = lastSyncedDbRef.current;
          if (!last) {
            Object.keys(group).forEach(m => modified.add(m));
          } else {
            const lastGroup: Record<string, { dispatches: any[], settlements: any[], paymentLedger: any[] }> = {};
            last.dispatches.forEach(x => {
              const m = getMonth(x.date);
              if (!lastGroup[m]) lastGroup[m] = { dispatches: [], settlements: [], paymentLedger: [] };
              lastGroup[m].dispatches.push(x);
            });
            last.settlements.forEach(x => {
              const m = getMonth(x.date);
              if (!lastGroup[m]) lastGroup[m] = { dispatches: [], settlements: [], paymentLedger: [] };
              lastGroup[m].settlements.push(x);
            });
            last.paymentLedger.forEach(x => {
              const m = getMonth(x.date);
              if (!lastGroup[m]) lastGroup[m] = { dispatches: [], settlements: [], paymentLedger: [] };
              lastGroup[m].paymentLedger.push(x);
            });

            const allMonths = new Set([...Object.keys(group), ...Object.keys(lastGroup)]);
            allMonths.forEach(m => {
              const curr = group[m] || { dispatches: [], settlements: [], paymentLedger: [] };
              const lst = lastGroup[m] || { dispatches: [], settlements: [], paymentLedger: [] };

              if (JSON.stringify(curr.dispatches) !== JSON.stringify(lst.dispatches) ||
                  JSON.stringify(curr.settlements) !== JSON.stringify(lst.settlements) ||
                  JSON.stringify(curr.paymentLedger) !== JSON.stringify(lst.paymentLedger)) {
                modified.add(m);
              }
            });
          }

          if (modified.size > 0) {
            console.log("Auto-sync: modified months detected:", Array.from(modified));
            // 1. Write the monthly documents first
            const monthPromises = Array.from(modified).map(m => {
              const monthDocRef = doc(firestore!, FIREBASE_COLLECTION, `${db.ownerUsername}_data`, "monthly_data", m);
              return setDoc(monthDocRef, group[m] || { dispatches: [], settlements: [], paymentLedger: [] });
            });
            await Promise.all(monthPromises);
          }

          // 2. Write the metadata document last to update lastFirebaseSync and trigger listener
          const metaDoc = {
            products: db.products,
            salesmen: db.salesmen,
            ownerUsername: db.ownerUsername,
            ownerHash: db.ownerHash,
            recoveryHash: db.recoveryHash,
            lastFirebaseSync: Date.now(),
            lastUpdated: db.lastUpdated || new Date().toISOString()
          };
          await setDoc(docRef, metaDoc);
          
          lastSyncedDbRef.current = db;
          console.log("Auto-sync successful");
        } catch (err) {
          console.error("Auto-sync failed:", err);
        }
      }, 5000); // 5 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [db, session.isLoggedIn]);

  const handleLogin = async (username: string, pass: string, recoveryPhrase?: string) => {
    if (!username || !pass) {
      alert("Please fill in both fields.");
      return;
    }
    setLoading(true);
    try {
      const hash = await hashPassword(pass);

      // If Firebase is configured, check cloud first
      if (firestore) {
        try {
          const docRef = doc(firestore, FIREBASE_COLLECTION, `${username}_data`);
          // Cloud check with 20s timeout to allow cold-start connections
          const docSnap = await withTimeout(
            getDoc(docRef),
            20000,
            "Cloud connection timed out. Please check your internet connection and try again."
          );

          if (docSnap.exists()) {
            const cloudData = docSnap.data() as DatabaseState;
            if (cloudData.ownerHash === hash) {
              // Success! Load cloud data and all monthly documents
              const monthlySnap = await getDocs(collection(firestore, FIREBASE_COLLECTION, `${username}_data`, "monthly_data"));
              const mergedDb: DatabaseState = {
                ...cloudData,
                dispatches: [],
                settlements: [],
                paymentLedger: []
              };
              if (monthlySnap.empty) {
                mergedDb.dispatches = cloudData.dispatches || [];
                mergedDb.settlements = cloudData.settlements || [];
                mergedDb.paymentLedger = cloudData.paymentLedger || [];
              } else {
                monthlySnap.forEach((doc) => {
                  const data = doc.data();
                  if (data.dispatches) mergedDb.dispatches.push(...data.dispatches);
                  if (data.settlements) mergedDb.settlements.push(...data.settlements);
                  if (data.paymentLedger) mergedDb.paymentLedger.push(...data.paymentLedger);
                });
              }

              setDb(mergedDb);
              lastSyncedDbRef.current = mergedDb;
              const newSession = { isLoggedIn: true, ownerUsername: username };
              setSession(newSession);
              localStorage.setItem('sonu_session', JSON.stringify(newSession));
              return;
            } else {
              alert("Invalid Password (Cloud Check)");
              return;
            }
          }
        } catch (cloudErr) {
          console.error("Cloud check failed:", cloudErr);
          if (db.ownerHash === null) {
            const msg = cloudErr instanceof Error ? cloudErr.message : String(cloudErr);
            alert(`Cloud login failed: ${msg}\n\nPlease check your network connection and try again.`);
            return;
          }
          // Continue to local check if a local account already exists
        }
      }

      // Fallback/Initial Setup logic (Local)
      if (db.ownerHash === null) {
        if (!recoveryPhrase) {
          alert("Please provide a Recovery Phrase for first-time setup.");
          return;
        }
        // This is a new local setup
        const recHash = await hashPassword(recoveryPhrase);
        const newState = { ...db, ownerUsername: username, ownerHash: hash, recoveryHash: recHash };
        setDb(newState);
        const newSession = { isLoggedIn: true, ownerUsername: username };
        setSession(newSession);
        localStorage.setItem('sonu_session', JSON.stringify(newSession));

        // If firestore is available, push this new setup to cloud immediately
        if (firestore) {
          try {
            // Push new setup to cloud with 10s timeout
            await withTimeout(
              setDoc(doc(firestore, FIREBASE_COLLECTION, `${username}_data`), {
                ...newState,
                lastUpdated: new Date().toISOString()
              }),
              10000,
              "Initial cloud sync timed out, but local setup is complete."
            );
          } catch (e) {
            console.error("Initial cloud sync failed", e);
          }
        }
        return;
      }

      if (db.ownerUsername === username && db.ownerHash === hash) {
        const newSession = { isLoggedIn: true, ownerUsername: username };
        setSession(newSession);
        localStorage.setItem('sonu_session', JSON.stringify(newSession));
        return;
      }

      alert("Invalid Username or Password (Local Check)");
    } catch (err) {
      console.error("Login Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`An error occurred during login: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (username: string, recoveryPhrase: string, newPass: string) => {
    if (!username || !recoveryPhrase || !newPass) {
      alert("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const recHash = await hashPassword(recoveryPhrase);
      const newHash = await hashPassword(newPass);

      if (firestore) {
        const docRef = doc(firestore, FIREBASE_COLLECTION, `${username}_data`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const cloudData = docSnap.data() as DatabaseState;
          if (cloudData.recoveryHash === recHash) {
            // Match! Update password
            await updateDoc(docRef, {
              ownerHash: newHash,
              lastUpdated: new Date().toISOString()
            });
            alert("Password Reset Successful! You can now log in.");
            setLoading(false);
            return true;
          }
        }
      }

      // Fallback for local
      if (db.ownerUsername === username && db.recoveryHash === recHash) {
        setDb({ ...db, ownerHash: newHash });
        alert("Password Reset Successful!");
        setLoading(false);
        return true;
      }

      alert("Invalid Username or Recovery Phrase.");
    } catch (err) {
      console.error("Reset Error:", err);
      alert("Could not reset password. Check connection.");
    } finally {
      setLoading(false);
    }
    return false;
  };

  const handleLogout = () => {
    setSession({ isLoggedIn: false, ownerUsername: null });
    localStorage.removeItem('sonu_session');
  };

  if (!session.isLoggedIn) {
    return <LoginScreen
      isSetup={db.ownerHash === null}
      onLogin={handleLogin}
      onResetPassword={handleResetPassword}
      loading={loading}
    />;
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      setSelectedDate(getLocalDateString());
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView db={db} setDb={setDb} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setActiveTab={handleTabChange} setSelectedSalesmanId={setSelectedSalesmanId} onOpenReports={() => handleTabChange('reports')} />;
      case 'dispatch': return <DispatchView db={db} setDb={setDb} selectedDate={selectedDate} setSelectedDate={setSelectedDate} sid={selectedSalesmanId} setSid={setSelectedSalesmanId} />;
      case 'returns': return <ReturnsView db={db} setDb={setDb} selectedDate={selectedDate} setSelectedDate={setSelectedDate} sid={selectedSalesmanId} setSid={setSelectedSalesmanId} />;
      case 'settle': return <SettlementView db={db} setDb={setDb} selectedDate={selectedDate} setSelectedDate={setSelectedDate} sid={selectedSalesmanId} setSid={setSelectedSalesmanId} />;
      case 'ledger': return <LedgerView db={db} setDb={setDb} />;
      case 'reports': return <ReportsView db={db} />;
      case 'manage': return <ManageView db={db} setDb={setDb} onLogout={handleLogout} lastSyncedDbRef={lastSyncedDbRef} />;
      default: return null;
    }
  };

  return (
    <div
      className="flex flex-col bg-[#FFFBF7] w-full sm:max-w-md mx-auto relative sm:border-x border-[#FFF1E0] sm:shadow-2xl overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)'
      }}
    >
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
}

// --- Views ---

type LoginMode = 'select' | 'setup' | 'cloud' | 'recovery' | 'login';

const LoginScreen = ({ isSetup, onLogin, onResetPassword, loading }: { isSetup: boolean, onLogin: (u: string, p: string, rp?: string) => Promise<void>, onResetPassword: (u: string, rp: string, np: string) => Promise<boolean>, loading: boolean }) => {
  const [mode, setMode] = useState<LoginMode>(isSetup ? 'select' : 'login');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleAction = async () => {
    if (mode === 'recovery') {
      const success = await onResetPassword(username, recoveryPhrase, newPass);
      if (success) setMode('login');
    } else {
      await onLogin(username, pass, recoveryPhrase);
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#FFF9F5] to-[#FFF1E0] flex items-center justify-center p-6 overflow-y-auto no-scrollbar relative">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-100/50 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-orange-100/50 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md flex flex-col items-center justify-center relative z-10 py-10 min-h-screen">
        <div className={`absolute top-6 right-6 flex items-center gap-1 bg-green-50 text-green-600 border-green-100 px-3 py-1 rounded-full border`}>
          <Cloud size={10} />
          <span className="text-[7px] font-black uppercase tracking-widest">Cloud Active</span>
        </div>

        <div className="h-28 w-28 bg-gradient-to-br from-[#FFAB91] to-[#FFCCBC] rounded-[40px] flex items-center justify-center mb-10 shadow-2xl group">
          <IceCream size={56} className="text-white group-hover:scale-110 transition-transform" />
        </div>

        <div className="text-center mb-10 text-balance">
          <h2 className="font-brand text-4xl text-[#5D4037] mb-2 tracking-wide leading-tight">Sonu Ice Cream</h2>
          <p className="text-xs font-semibold text-[#8D6E63] uppercase tracking-[0.2em] opacity-70">
            {mode === 'select' ? "Get Started" : mode === 'recovery' ? "Reset Password" : mode === 'setup' ? "Initial Setup" : "Store Manager Login"}
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          {mode === 'select' ? (
            <div className="flex flex-col gap-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={() => setMode('cloud')}
                className="w-full bg-white p-6 rounded-[32px] border border-[#FFF1E0] shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-4 group"
              >
                <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-blue-100 transition-colors">
                  <Cloud className="text-blue-500" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#5D4037]">Login with Cloud Account</h3>
                  <p className="text-[9px] text-[#A1887F] font-bold uppercase tracking-widest mt-1">Existing users</p>
                </div>
              </button>

              <button
                onClick={() => setMode('setup')}
                className="w-full bg-white p-6 rounded-[32px] border border-[#FFF1E0] shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-4 group"
              >
                <div className="bg-orange-50 p-3 rounded-2xl group-hover:bg-orange-100 transition-colors">
                  <Plus className="text-[#FF8A65]" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#5D4037]">Setup New Admin Account</h3>
                  <p className="text-[9px] text-[#A1887F] font-bold uppercase tracking-widest mt-1">First time users</p>
                </div>
              </button>
            </div>
          ) : mode === 'recovery' ? (
            <>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#FF8A65]"><AlertCircle size={18} /></div>
                <input type="text" placeholder="Your Recovery Phrase" value={recoveryPhrase} onChange={(e) => setRecoveryPhrase(e.target.value)}
                  className="w-full pl-14 pr-5 py-5 bg-[#FFF3E0] border border-[#FFE0B2] rounded-[24px] focus:ring-2 focus:ring-[#FFCCBC] focus:bg-white outline-none font-medium text-[#5D4037] transition-all shadow-sm" />
              </div>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#A1887F]"><Lock size={18} /></div>
                <input type={showPass ? "text" : "password"} placeholder="New Password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                  className="w-full pl-14 pr-12 py-5 bg-white/60 border border-white rounded-[24px] focus:ring-2 focus:ring-[#FFCCBC] focus:bg-white outline-none font-medium text-[#5D4037] transition-all shadow-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#A1887F]">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#A1887F]"><User size={18} /></div>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-14 pr-5 py-5 bg-white/60 border border-white rounded-[24px] focus:ring-2 focus:ring-[#FFCCBC] focus:bg-white outline-none font-medium text-[#5D4037] transition-all shadow-sm" />
              </div>

              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#A1887F]"><Lock size={18} /></div>
                <input type={showPass ? "text" : "password"} placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)}
                  className="w-full pl-14 pr-12 py-5 bg-white/60 border border-white rounded-[24px] focus:ring-2 focus:ring-[#FFCCBC] focus:bg-white outline-none font-medium text-[#5D4037] transition-all shadow-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#A1887F]">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {mode === 'setup' && (
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#FF8A65]"><AlertCircle size={18} /></div>
                  <input type="text" placeholder="Secret Recovery Phrase" value={recoveryPhrase} onChange={(e) => setRecoveryPhrase(e.target.value)}
                    className="w-full pl-14 pr-5 py-5 bg-[#FFF3E0] border border-[#FFE0B2] rounded-[24px] focus:ring-2 focus:ring-[#FFCCBC] focus:bg-white outline-none font-medium text-[#5D4037] transition-all shadow-sm" />
                  <p className="text-[8px] text-[#A1887F] mt-2 px-4 font-bold uppercase tracking-widest opacity-60">Needed if you forget your password</p>
                </div>
              )}
            </>
          )}
        </div>

        {mode !== 'select' && (
          <button onClick={handleAction} disabled={loading}
            className={`w-full mt-6 ${mode === 'recovery' ? 'bg-[#5D4037]' : 'bg-gradient-to-r from-[#FF8A65] to-[#FFAB91]'} text-white font-bold text-lg py-5 rounded-[28px] hover:shadow-xl hover:shadow-orange-200/50 active:scale-95 transition-all flex items-center justify-center gap-3`}>
            {loading ? "Processing..." : (mode === 'recovery' ? "Reset Password" : mode === 'setup' ? "Setup System" : "Sign In")} {!loading && <ArrowRight size={20} />}
          </button>
        )}

        <div className="flex flex-col items-center gap-4 mt-4 w-full">
          {(mode === 'login' || mode === 'cloud') && (
            <button
              onClick={() => setMode('recovery')}
              className="w-full text-[10px] font-black text-[#FF8A65] uppercase tracking-[0.2em] py-4 border border-[#FFCCBC] rounded-[22px] bg-white/50 hover:bg-white transition-all active:scale-95"
            >
              Forgot Password?
            </button>
          )}

          {mode !== 'login' && mode !== 'select' && (
            <button
              onClick={() => setMode(isSetup ? 'select' : 'login')}
              className="w-full text-[10px] font-black text-[#5D4037] uppercase tracking-[0.2em] py-4 border border-[#D7CCC8] rounded-[22px] bg-white/50 hover:bg-white transition-all active:scale-95 opacity-80"
            >
              Back
            </button>
          )}
        </div>

        {mode === 'login' && (
          <div className="mt-8 w-full flex justify-center">
            <button
              onClick={() => {
                if (confirm("⚠️ WARNING: This will DELETE all local data on this phone. Use this ONLY if you are locked out and want to start fresh or connect to a Cloud account. Continue?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 text-[8px] font-bold text-red-400/60 uppercase tracking-widest hover:text-red-500 hover:bg-red-50/50 rounded-full transition-all active:scale-95 border border-transparent hover:border-red-100"
            >
              Emergency Reset (Wipe All Data)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardView = ({ db, setDb, selectedDate, setSelectedDate, setActiveTab, setSelectedSalesmanId, onOpenReports }: { db: DatabaseState, setDb: (db: DatabaseState | ((p: DatabaseState) => DatabaseState)) => void, selectedDate: string, setSelectedDate: (d: string) => void, setActiveTab: (t: string) => void, setSelectedSalesmanId: (id: string) => void, onOpenReports: () => void }) => {
  const dailyDispatches = useMemo<DispatchRecord[]>(() => (db.dispatches as DispatchRecord[]).filter((d: DispatchRecord) => d.date === selectedDate), [db.dispatches, selectedDate]);
  const dailySettlements = useMemo<Settlement[]>(() => (db.settlements as Settlement[]).filter((s: Settlement) => s.date === selectedDate), [db.settlements, selectedDate]);
  const [expandedSalesman, setExpandedSalesman] = useState<string | null>(null);

  const handleDeleteDispatch = (dispatchId: string) => {
    if (confirm("Are you sure you want to DELETE this dispatch record?")) {
      setDb((prev: DatabaseState) => ({
        ...prev,
        dispatches: prev.dispatches.filter((d: DispatchRecord) => d.id !== dispatchId),
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  const handleDeleteSalesmanActivity = (sid: string) => {
    if (confirm("🚨 WARNING: This will DELETE ALL dispatches for this salesman today. They will be moved back to the Waitlist. Continue?")) {
      setDb((prev: DatabaseState) => ({
        ...prev,
        dispatches: prev.dispatches.filter((d: DispatchRecord) => !(d.salesmanId === sid && d.date === selectedDate)),
        lastUpdated: new Date().toISOString()
      }));
      setExpandedSalesman(null);
    }
  };

  const uniqueSalesmanIdsDispatched = useMemo<string[]>(() => Array.from(new Set(dailyDispatches.map((d: DispatchRecord) => d.salesmanId))), [dailyDispatches]);
  const totalDispatchedCount = uniqueSalesmanIdsDispatched.length;
  const settledCount = dailySettlements.filter((s: Settlement) => s.settlementLocked).length;

  const remainingSalesmen = useMemo(() => {
    return (db.salesmen as Salesman[]).filter((s: Salesman) => s.isActive && !uniqueSalesmanIdsDispatched.includes(s.id));
  }, [db.salesmen, uniqueSalesmanIdsDispatched]);

  const remainingCount = remainingSalesmen.length;

  const pendingAllTime = useMemo(() => {
    const pendingByDateSalesman: Record<string, { date: string, salesmanId: string, salesmanName: string, status: 'on_field' | 'returned', count: number }> = {};

    (db.dispatches as DispatchRecord[]).forEach(d => {
      const key = `${d.date}_${d.salesmanId}`;

      // Check if already settled
      const isSettled = (db.settlements as Settlement[]).some(s => s.date === d.date && s.salesmanId === d.salesmanId && s.settlementLocked);
      if (isSettled) return;

      if (!pendingByDateSalesman[key]) {
        pendingByDateSalesman[key] = {
          date: d.date,
          salesmanId: d.salesmanId,
          salesmanName: d.salesmanNameSnapshot,
          status: d.returnedQuantity === null ? 'on_field' : 'returned',
          count: 1
        };
      } else {
        pendingByDateSalesman[key].count++;
        // If any dispatch for this day has returns, mark as 'returned'
        if (d.returnedQuantity !== null) {
          pendingByDateSalesman[key].status = 'returned';
        }
      }
    });

    return Object.values(pendingByDateSalesman).sort((a, b) => b.date.localeCompare(a.date));
  }, [db.dispatches, db.settlements]);

  const { totalSales, totalComm, netAmt } = useMemo(() => {
    return dailySettlements.reduce((acc, s: Settlement) => {
      if (s.settlementLocked) {
        return {
          totalSales: acc.totalSales + s.totalAmount,
          totalComm: acc.totalComm + s.commissionAmount,
          netAmt: acc.netAmt + s.netAmount
        };
      }
      return acc;
    }, { totalSales: 0, totalComm: 0, netAmt: 0 });
  }, [dailySettlements]);

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7] animate-in fade-in duration-700 overflow-y-auto no-scrollbar pb-10">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-[#FFAB91] to-[#FFCCBC] p-2.5 rounded-2xl shadow-lg shadow-orange-100/50 flex-shrink-0">
              <IceCream size={24} className="text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-[20px] xs:text-2xl font-brand text-[#5D4037] tracking-wider leading-tight whitespace-nowrap overflow-visible">Sonu Ice Cream</h2>
              <p className="text-[8px] xs:text-[9px] text-[#A1887F] font-black tracking-[0.15em] mt-0.5 uppercase opacity-60">Daily Business Hub</p>
            </div>
          </div>
          <button
            onClick={onOpenReports}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-white text-[#8D6E63] rounded-2xl border border-orange-50/50 premium-shadow hover:bg-orange-50 transition-all active:scale-90"
            title="View Reports"
          >
            <BarChart3 size={20} />
          </button>
        </div>

        <DateSelector date={selectedDate} onChange={setSelectedDate} />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#FCE4EC] rounded-[28px] py-6 flex flex-col items-center justify-center border border-white premium-shadow min-w-0">
            <UserCheck size={18} className="text-[#D81B60] mb-2 flex-shrink-0" />
            <span className="text-xl font-black text-[#5D4037]">{totalDispatchedCount}</span>
            <span className="text-[8px] font-bold text-[#AD1457] uppercase tracking-wider mt-1 opacity-70 text-center">On Field</span>
          </div>
          <div className="bg-[#FFF3E0] rounded-[28px] py-6 flex flex-col items-center justify-center border border-white premium-shadow min-w-0">
            <Clock size={18} className="text-[#EF6C00] mb-2 flex-shrink-0" />
            <span className="text-xl font-black text-[#5D4037]">{remainingCount}</span>
            <span className="text-[8px] font-bold text-[#E65100] uppercase tracking-wider mt-1 opacity-70 text-center">Waitlist</span>
          </div>
          <div className="bg-[#E0F2F1] rounded-[28px] py-6 flex flex-col items-center justify-center border border-white premium-shadow min-w-0">
            <CheckCircle2 size={18} className="text-[#00897B] mb-2 flex-shrink-0" />
            <span className="text-xl font-black text-[#5D4037]">{settledCount}</span>
            <span className="text-[8px] font-bold text-[#00695C] uppercase tracking-wider mt-1 opacity-70 text-center">Settled</span>
          </div>
        </div>

        <div className="bg-[#5D4037] rounded-[40px] p-7 flex flex-col gap-4 shadow-xl shadow-[#5D4037]/20 relative overflow-hidden group min-h-[140px] flex-shrink-0 mb-8">
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col">
              <span className="text-[#D7CCC8] font-bold text-[10px] uppercase tracking-[0.2em] mb-1 opacity-80">Settled Revenue</span>
              <span className="text-white text-3xl font-black tracking-wider font-brand">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white/10 p-2.5 rounded-2xl"><IceCream size={20} className="text-[#FFCCBC]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 z-10">
            <div className="flex flex-col">
              <span className="text-[#D7CCC8] font-bold text-[8px] uppercase tracking-[0.2em] mb-0.5 opacity-60">Settled Comm.</span>
              <span className="text-pink-300 text-lg font-black tracking-wide leading-none">₹{totalComm.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[#D7CCC8] font-bold text-[8px] uppercase tracking-[0.2em] mb-0.5 opacity-60">Store Net</span>
              <span className="text-[#81C784] text-lg font-black tracking-wide leading-none">₹{netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
        </div>

        {pendingAllTime.length > 0 && (
          <div className="w-full flex flex-col gap-4 mb-10">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-black text-[#E87A5D] uppercase tracking-[0.2em]">⚠️ Overdue Settlements</h3>
              <span className="bg-[#FFEBEE] text-[#D32F2F] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#FFCDD2]">{pendingAllTime.length}</span>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2 -mx-1 px-1">
              {pendingAllTime.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(item.date);
                    setSelectedSalesmanId(item.salesmanId);
                    setActiveTab(item.status === 'returned' ? 'settle' : 'returns');
                  }}
                  className="min-w-[140px] bg-white rounded-[24px] p-4 border border-white premium-shadow flex flex-col gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${item.status === 'returned' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                      {item.status === 'returned' ? <CreditCard size={14} /> : <RotateCcw size={14} />}
                    </div>
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border ${item.status === 'returned' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                      {item.status === 'returned' ? 'Ready' : 'Field'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#5D4037] text-[11px] leading-tight truncate">{item.salesmanName}</h4>
                    <p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider opacity-60 mt-0.5">
                      {new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-[#5D4037]/40 uppercase">
                    Take Action <ArrowRight size={8} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-4 mb-10">
          <h3 className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.2em] px-1 py-2">Field Activity</h3>
          {uniqueSalesmanIdsDispatched.length === 0 ? (
            <div className="bg-white/40 border-2 border-dashed border-[#FFF1E0] rounded-[32px] flex flex-col items-center justify-center text-center py-10 opacity-60">
              <ClipboardList size={32} className="mb-2 text-[#D7CCC8]" />
              <p className="text-[#A1887F] text-[10px] font-bold uppercase tracking-widest">Nobody out yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {uniqueSalesmanIdsDispatched.map(sid => {
                const sm = (db.salesmen as Salesman[]).find((s: Salesman) => s.id === sid);
                const vDispatches = dailyDispatches.filter((d: DispatchRecord) => d.salesmanId === sid);
                const vSales = vDispatches.reduce((a, d: DispatchRecord) => a + ((d.givenQuantity - (d.returnedQuantity ?? 0)) * d.priceSnapshot), 0);
                const isSettled = (db.settlements as Settlement[]).find((s: Settlement) => s.salesmanId === sid && s.date === selectedDate && s.settlementLocked);
                const hasReturns = vDispatches.some((d: DispatchRecord) => d.returnedQuantity !== null);
                const isExpanded = expandedSalesman === sid;

                return (
                  <div key={sid} className="bg-white rounded-[32px] border border-white overflow-hidden transition-all premium-shadow">
                    <div
                      onClick={() => setExpandedSalesman(isExpanded ? null : sid)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer active:bg-[#FFFBF7] transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-12 w-12 rounded-[20px] shrink-0 flex items-center justify-center font-bold text-lg ${isSettled ? 'bg-[#E8F5EE] text-[#5DBF8A]' : 'bg-[#FFF4E6] text-[#E87A5D]'}`}>
                          {sm?.name?.[0].toUpperCase() || "S"}
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="font-bold text-[#5D4037] text-base leading-tight truncate block">
                            {sm?.name || "Unknown"}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {isSettled ? (
                              <span className="shrink-0 bg-[#EFFFF0] text-[#4CAF50] text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-[#C8E6C9] flex items-center leading-none">Settled</span>
                            ) : hasReturns ? (
                              <span className="shrink-0 bg-[#E3F2FD] text-[#1E88E5] text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-[#BBDEFB] flex items-center leading-none">Returned</span>
                            ) : (
                              <span className="shrink-0 bg-[#FFF3E0] text-[#FF9800] text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-[#FFE0B2] flex items-center leading-none">On Field</span>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                              <p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider opacity-70 leading-none">₹{vSales.toLocaleString('en-IN')}</p>
                              {isExpanded ? <ChevronUp size={10} className="text-[#D7CCC8]" /> : <ChevronDown size={10} className="text-[#D7CCC8]" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-center">
                        {!isSettled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSalesmanActivity(sid);
                            }}
                            className="p-2 text-red-500 hover:text-red-700 rounded-xl hover:bg-red-50 transition-colors shrink-0 self-center shadow-none block"
                            title="Delete all dispatches for today"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className="text-right shrink-0 border-l border-[#FFF1E0] pl-3 py-1">
                          <div className="font-black text-[#5D4037] text-lg tabular-nums leading-none">{vDispatches.length}</div>
                          <div className="text-[8px] text-[#A1887F] font-bold uppercase tracking-tighter opacity-50 mt-1">Items</div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-[#FFFBF7]/80 border-t border-[#FFF1E0] px-5 py-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col gap-3">
                          {vDispatches.map((d: DispatchRecord, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-[10px]">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-[#5D4037] uppercase">{d.productNameSnapshot}</span>
                                <div className="flex gap-2">
                                  <span className="text-[8px] text-[#A1887F] font-medium uppercase tracking-tight">Sent: <b className="text-[#5D4037]">{d.givenQuantity}</b></span>
                                  <span className="text-[8px] text-[#A1887F] font-medium uppercase tracking-tight">Ret: <b className="text-blue-500">{d.returnedQuantity ?? '-'}</b></span>
                                  <span className="text-[8px] text-[#A1887F] font-medium uppercase tracking-tight">Sold: <b className="text-green-600">{d.givenQuantity - (d.returnedQuantity ?? 0)} x ₹{d.priceSnapshot}</b></span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-[#E87A5D] tabular-nums text-base">₹{((d.givenQuantity - (d.returnedQuantity ?? 0)) * d.priceSnapshot).toLocaleString('en-IN')}</span>
                                {!isSettled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDispatch(d.id);
                                    }}
                                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {isSettled && (
                            <div className="mt-4 pt-4 border-t-2 border-dashed border-[#FFF1E0]">
                              <div className="flex flex-col gap-2.5 mb-6">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-[#A1887F] font-bold uppercase tracking-wider">Total Sales</span>
                                  <span className="font-black text-[#5D4037]">₹{isSettled.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-[#A1887F] font-bold uppercase tracking-wider">Commission ({isSettled.commissionPercent}%)</span>
                                  <span className="font-black text-[#EF5350]">- ₹{isSettled.commissionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[#5D4037] font-black uppercase text-[11px] tracking-widest">Store Net</span>
                                  <span className="font-brand text-xl text-[#43A047]">₹{isSettled.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>

                              <button
                                onClick={async () => {
                                  const dateStr = new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                  let message = `🍦 *Sonu Ice Cream Shop*\n*Daily Settlement Report*\n\n📅 Date: ${dateStr}\n👤 Salesman: ${sm?.name}\n\n--- *Itemized Sales* ---\n`;

                                  vDispatches.forEach(d => {
                                    const sold = d.givenQuantity - (d.returnedQuantity ?? 0);
                                    message += `• *${d.productNameSnapshot}*\n  Sent: ${d.givenQuantity} | Ret: ${d.returnedQuantity ?? 0} | Sold: ${sold}\n  Amount: ₹${(sold * d.priceSnapshot).toLocaleString('en-IN')}\n\n`;
                                  });

                                  message += `--- *Final Summary* ---\n💰 Total Sales: ₹${isSettled.totalAmount.toLocaleString('en-IN')}\n🎁 Commission: ₹${isSettled.commissionAmount.toLocaleString('en-IN')}\n✅ *Daily Net: ₹${isSettled.netAmount.toLocaleString('en-IN')}*\n\nThank you! ✨`;

                                  // Ensure we reliably write to clipboard as an immediate safety baseline
                                  navigator.clipboard.writeText(message).catch(() => {});

                                  let cleanPhone = sm?.phone ? sm.phone.replace(/\D/g, '') : '';
                                  if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                                    cleanPhone = cleanPhone.substring(2);
                                  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
                                    cleanPhone = cleanPhone.substring(1);
                                  }

                                  const isValidPhone = cleanPhone.length === 10 && /^[6789]\d{9}$/.test(cleanPhone);

                                  if (isValidPhone) {
                                    let hasNavigated = false;
                                    const onBlurOrHidden = () => {
                                      hasNavigated = true;
                                    };

                                    window.addEventListener('blur', onBlurOrHidden, { once: true });
                                    document.addEventListener('visibilitychange', () => {
                                      if (document.hidden) {
                                        hasNavigated = true;
                                      }
                                    }, { once: true });

                                    // Launch WhatsApp native app directly to the pre-filled chat
                                    window.location.href = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`;

                                    // Give ample time (2500ms) for the intent launch before deciding it failed
                                    setTimeout(async () => {
                                      window.removeEventListener('blur', onBlurOrHidden);
                                      if (!hasNavigated && !document.hidden) {
                                        try {
                                          await Share.share({
                                            title: 'Sonu Ice Cream - Settlement',
                                            text: message,
                                            dialogTitle: 'Share Settlement Report'
                                          });
                                        } catch (err) {
                                          console.error("Share fallback error", err);
                                        }
                                      }
                                    }, 2500);
                                  } else {
                                    try {
                                      await Share.share({
                                        title: 'Sonu Ice Cream - Settlement',
                                        text: message,
                                        dialogTitle: 'Share Settlement Report'
                                      });
                                    } catch (err) {
                                      alert("Report copied to clipboard! You can now paste it manually.");
                                    }
                                  }
                                }}
                                className="w-full bg-[#5D4037] text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-[20px] shadow-lg shadow-[#5D4037]/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                              >
                                <Share2 size={16} /> Share Settlement
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.2em] px-1 py-2">Remaining for Dispatch</h3>
          {remainingSalesmen.length === 0 ? (
            <div className="bg-white/40 border-2 border-dashed border-[#FFF1E0] rounded-[32px] flex flex-col items-center justify-center text-center py-6 opacity-60">
              <CheckCircle2 size={24} className="mb-1 text-[#4CAF50]" />
              <p className="text-[#A1887F] text-[10px] font-bold uppercase tracking-widest">All Salesmen Out</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {remainingSalesmen.map((sm: Salesman) => (
                <div key={sm.id} className="bg-white/80 rounded-[24px] p-4 flex items-center gap-3 border border-white premium-shadow">
                  <div className="h-10 w-10 bg-[#F9F5F0] rounded-2xl flex items-center justify-center text-[#A1887F]">
                    <User size={18} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-[#5D4037] truncate">{sm.name}</span>
                    <span className="text-[8px] font-bold text-[#A1887F] uppercase tracking-wider">Ready</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportsView = ({ db }: { db: DatabaseState }) => {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredSettlements = useMemo<Settlement[]>(() => {
    return (db.settlements as Settlement[])
      .filter((s: Settlement) => s.date >= fromDate && s.date <= toDate && s.settlementLocked)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.settlements, fromDate, toDate]);

  const summary = useMemo(() => {
    return filteredSettlements.reduce((acc: { settlements: number; sales: number; comm: number; net: number }, s: Settlement) => ({
      settlements: acc.settlements + 1,
      sales: acc.sales + s.totalAmount,
      comm: acc.comm + (s.commissionAmount || 0),
      net: acc.net + (s.netAmount || 0)
    }), { settlements: 0, sales: 0, comm: 0, net: 0 });
  }, [filteredSettlements]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Settlement[]> = {};
    filteredSettlements.forEach((s: Settlement) => {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    });
    return groups;
  }, [filteredSettlements]) as Record<string, Settlement[]>;

  const formatDateString = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7] p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-24">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-3xl font-bold text-[#5D4037] tracking-tight">Reports</h2>
        <p className="text-xs text-[#A1887F] font-medium tracking-wide mt-0.5 opacity-60 uppercase">Settlement history</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
        <div className="flex flex-col gap-1.5">
          <label className="text-[8px] font-black text-[#A1887F] uppercase tracking-widest pl-2 opacity-60">From Date</label>
          <DateSelector date={fromDate} onChange={setFromDate} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[8px] font-black text-[#A1887F] uppercase tracking-widest pl-2 opacity-60">To Date</label>
          <DateSelector date={toDate} onChange={setToDate} />
        </div>
      </div>

      <div className="bg-white rounded-[36px] p-7 mb-8 border border-white premium-shadow flex-shrink-0">
        <h3 className="text-xs font-black text-[#5D4037] uppercase tracking-wider mb-5 opacity-60">Period Summary</h3>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#A1887F] font-bold uppercase tracking-widest">Settlements</span>
            <span className="font-black text-[#5D4037] tabular-nums">{summary.settlements}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#A1887F] font-bold uppercase tracking-widest">Total Sales</span>
            <span className="font-black text-[#5D4037] tabular-nums">₹{summary.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#A1887F] font-bold uppercase tracking-widest">Total Commission</span>
            <span className="font-black text-[#EF5350] tabular-nums">- ₹{summary.comm.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-px bg-[#FFF1E0] my-2"></div>
          <div className="flex justify-between items-center">
            <span className="text-[#5D4037] font-black text-xs uppercase tracking-widest">Net Profit</span>
            <span className="font-brand text-2xl text-[#43A047] tabular-nums">₹{summary.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {(Object.entries(groupedByDate) as [string, Settlement[]][]).map(([date, sets]) => (
          <div key={date} className="flex flex-col gap-3 mb-6">
            <h4 className="text-[9px] font-black text-[#A1887F] uppercase tracking-[0.3em] px-2 opacity-50">{formatDateString(date)}</h4>
            {sets.map((s: Settlement) => (
              <div key={s.id} className="bg-white/80 rounded-[32px] p-5 border border-white premium-shadow">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#FCE4EC] rounded-xl flex items-center justify-center text-[#D81B60]">
                      <IceCream size={16} />
                    </div>
                    <span className="font-black text-[#5D4037] text-base uppercase tracking-wider">{s.salesmanNameSnapshot}</span>
                  </div>
                  <div className="bg-[#EFFFF0] text-[#4CAF50] text-[7px] font-black uppercase px-2 py-1 rounded-full border border-[#C8E6C9] flex items-center gap-1">
                    <Lock size={10} /> Locked
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#BCAAA4] font-bold uppercase tracking-wider">Sales</span>
                    <span className="font-black text-[#5D4037] tabular-nums">₹{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#BCAAA4] font-bold uppercase tracking-wider">Comm. ({s.commissionPercent}%)</span>
                    <span className="font-black text-[#EF5350] tabular-nums">- ₹{s.commissionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-[#FFF1E0] my-1"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5D4037] font-bold uppercase text-[9px] tracking-widest">Daily Net</span>
                    <span className="font-black text-[#43A047] text-base tabular-nums">₹{s.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {filteredSettlements.length === 0 && (
          <div className="text-center py-12 opacity-30 italic text-[10px] uppercase tracking-widest">No history found</div>
        )}
      </div>
    </div>
  );
};

const DispatchView = ({ db, setDb, selectedDate, setSelectedDate, sid, setSid }: { db: DatabaseState, setDb: (db: DatabaseState | ((p: DatabaseState) => DatabaseState)) => void, selectedDate: string, setSelectedDate: (d: string) => void, sid: string, setSid: (s: string) => void }) => {
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const availableSalesmen = useMemo<Salesman[]>(() => {
    return (db.salesmen as Salesman[]).filter((s: Salesman) => {
      const isSettled = (db.settlements as Settlement[]).some(settle => settle.salesmanId === s.id && settle.date === selectedDate && settle.settlementLocked);
      return s.isActive && !isSettled;
    });
  }, [db.salesmen, db.settlements, selectedDate]);

  const activeProducts = (db.products as Product[]).filter((p: Product) => p.isActive);

  const isSettled = useMemo<boolean>(() => (db.settlements as Settlement[]).some((s: Settlement) => s.salesmanId === sid && s.date === selectedDate && s.settlementLocked), [db.settlements, sid, selectedDate]);

  const handleDispatch = () => {
    if (!sid) return alert("Select Salesman");
    const toDispatch = (Object.entries(quantities) as [string, string][]).filter(([_, qty]) => parseInt(qty) > 0);
    if (toDispatch.length === 0) return alert("Enter quantity for at least one product");
    if (isSettled) return alert("Accounts already locked for this salesman today.");

    const salesman = (db.salesmen as Salesman[]).find((s: Salesman) => s.id === sid)!;
    const existingDispatches = (db.dispatches as DispatchRecord[]).filter((d: DispatchRecord) => d.salesmanId === sid && d.date === selectedDate);
    const round = Math.max(0, ...existingDispatches.map((d: DispatchRecord) => d.dispatchRound)) + 1;

    const newRecords: DispatchRecord[] = (toDispatch as [string, string][]).map(([pId, qty]) => {
      const p = (db.products as Product[]).find((prod: Product) => prod.id === pId)!;
      const numQty = parseInt(qty);
      return {
        id: generateUUID(),
        date: selectedDate,
        salesmanId: sid,
        salesmanNameSnapshot: salesman.name,
        productId: pId,
        productNameSnapshot: p.name,
        givenQuantity: numQty,
        returnedQuantity: null,
        soldQuantity: numQty,
        priceSnapshot: p.currentPrice,
        amount: numQty * p.currentPrice,
        dispatchRound: round
      };
    });

    setDb((prev: DatabaseState) => ({
      ...prev,
      dispatches: [...prev.dispatches, ...newRecords],
      lastUpdated: new Date().toISOString()
    }));
    setQuantities({});
    setSid('');
    alert("Dispatch Successful!");
  };

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32">
      <DateSelector date={selectedDate} onChange={setSelectedDate} />

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-white premium-shadow mb-6">
        <label className="text-[10px] font-black text-[#A1887F] uppercase mb-3 block tracking-[0.15em] opacity-60">Assign Salesman</label>
        <select value={sid} onChange={(e) => setSid(e.target.value)}
          className="w-full bg-[#FFFBF7] border-0 rounded-[20px] px-4 py-5 font-bold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FFCCBC]">
          <option value="">-- Choose Salesman --</option>
          {availableSalesmen.map((s: Salesman) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {sid && isSettled && (
        <div className="bg-[#FFEBEE] text-[#C62828] p-7 rounded-[32px] border border-white flex items-center gap-4 premium-shadow mb-6">
          <Lock size={24} />
          <div>
            <p className="text-sm font-black uppercase tracking-tight">Access Locked</p>
            <p className="text-[10px] font-medium opacity-80 uppercase tracking-tighter">Settlement completed for this salesman on this date.</p>
          </div>
        </div>
      )}

      {sid && !isSettled && (
        <div className="bg-white rounded-[40px] p-7 shadow-sm border border-white premium-shadow">
          <label className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.15em] opacity-60 mb-6 block">Dispatch Quantities</label>
          <div className="flex flex-col gap-4 mb-8">
            {activeProducts.map((p: Product) => (
              <div key={p.id} className="flex gap-4 items-center bg-[#FFFBF7] p-4 rounded-[24px] border border-[#FFF1E0]">
                <div className="flex-1">
                  <div className="font-bold text-[#5D4037] text-sm leading-tight uppercase tracking-tight">{p.name}</div>
                  <div className="text-[9px] font-black text-[#A1887F] uppercase mt-1">₹{p.currentPrice}</div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-2xl border border-[#FFF1E0] shadow-inner">
                  <input type="number" placeholder="0" value={quantities[p.id] || ''}
                    onChange={(e) => setQuantities({ ...quantities, [p.id]: e.target.value })}
                    className="w-14 bg-transparent border-0 text-center text-sm font-black text-[#E87A5D] outline-none" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleDispatch}
            className="w-full bg-gradient-to-r from-[#FF8A65] to-[#FFAB91] text-white font-black text-lg py-5 rounded-[28px] shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3">
            <Truck size={22} /> Dispatch Stock
          </button>
        </div>
      )}
    </div>
  );
};

const ReturnsView = ({ db, setDb, selectedDate, setSelectedDate, sid, setSid }: { db: DatabaseState, setDb: (db: DatabaseState | ((p: DatabaseState) => DatabaseState)) => void, selectedDate: string, setSelectedDate: (d: string) => void, sid: string, setSid: (s: string) => void }) => {
  const dispatches = useMemo<DispatchRecord[]>(() => (db.dispatches as DispatchRecord[]).filter((d: DispatchRecord) => d.salesmanId === sid && d.date === selectedDate), [db.dispatches, sid, selectedDate]);
  const isSettled = useMemo<boolean>(() => (db.settlements as Settlement[]).some((s: Settlement) => s.salesmanId === sid && s.date === selectedDate && s.settlementLocked), [db.settlements, sid, selectedDate]);

  const [returnMap, setReturnMap] = useState<Record<string, string>>({});

  const uniqueSalesmanIdsForDate = useMemo<string[]>(() => {
    const ids = (db.dispatches as DispatchRecord[])
      .filter((d: DispatchRecord) => d.date === selectedDate)
      .map((d: DispatchRecord) => d.salesmanId);
    return Array.from(new Set(ids));
  }, [db.dispatches, selectedDate]);

  useEffect(() => {
    const updatedMap: Record<string, string> = {};
    dispatches.forEach((d: DispatchRecord) => {
      updatedMap[d.id] = d.returnedQuantity === null ? '' : d.returnedQuantity.toString();
    });
    setReturnMap(updatedMap);
  }, [dispatches]);

  const handleUpdateReturns = () => {
    if (!sid) return;
    setDb((prev: DatabaseState) => {
      const nextDispatches = prev.dispatches.map((d: DispatchRecord) => {
        if (d.salesmanId === sid && d.date === selectedDate) {
          const retStr = returnMap[d.id];
          const retQty = retStr === '' ? 0 : parseInt(retStr) || 0;
          const sold = d.givenQuantity - retQty;
          return {
            ...d,
            returnedQuantity: retQty,
            soldQuantity: sold,
            amount: sold * d.priceSnapshot
          };
        }
        return d;
      });
      return {
        ...prev,
        dispatches: nextDispatches,
        lastUpdated: new Date().toISOString()
      };
    });
    alert("Returns Updated Successfully!");
    setSid('');
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden bg-[#FFFBF7]">
      <div className="p-6 flex-shrink-0">
        <DateSelector date={selectedDate} onChange={setSelectedDate} />

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-white premium-shadow mb-2">
          <label className="text-[10px] font-black text-[#A1887F] uppercase mb-3 block tracking-[0.15em] opacity-60">Distribution Log</label>
          <select value={sid} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSid(e.target.value)}
            className="w-full bg-[#FFFBF7] border-0 rounded-[20px] px-4 py-5 font-bold text-[#5D4037] outline-none">
            <option value="">-- Choose Salesman --</option>
            {uniqueSalesmanIdsForDate.map((salesmanId: string) => {
              const s = (db.salesmen as Salesman[]).find((sm: Salesman) => sm.id === salesmanId);
              return <option key={salesmanId} value={salesmanId}>{s?.name || "Unknown"}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6">
        {sid && isSettled && (
          <div className="bg-[#E8F5EE] text-[#2E7D32] p-7 rounded-[32px] border border-white flex items-center gap-4 premium-shadow mb-6">
            <CheckCircle2 size={24} />
            <div>
              <p className="text-sm font-black uppercase tracking-tight">Accounts Settled</p>
              <p className="text-[10px] font-medium opacity-80 uppercase tracking-tighter">No more changes allowed for this date.</p>
            </div>
          </div>
        )}

        {sid && dispatches.length > 0 && (
          <div className="bg-white rounded-[40px] shadow-sm border border-white overflow-hidden premium-shadow mb-10">
            <div className="px-8 py-5 bg-[#FFF9F5] border-b border-[#FFF1E0] flex justify-between items-center sticky top-0 z-10">
              <span className="text-[9px] font-black uppercase text-[#A1887F] tracking-[0.2em]">Product Name</span>
              <span className="text-[9px] font-black uppercase text-[#A1887F] tracking-[0.2em]">Unsold Stock</span>
            </div>
            <div className="flex flex-col">
              {dispatches.map((d: DispatchRecord) => (
                <div key={d.id} className="px-8 py-6 border-b border-[#FFF1E0] flex items-center justify-between hover:bg-[#FFFBF7] transition-colors">
                  <div className="flex-1 pr-4">
                    <div className="font-bold text-[#5D4037] text-base leading-tight mb-1 uppercase tracking-tight">{d.productNameSnapshot}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] font-bold text-[#BCAAA4] uppercase tracking-wider opacity-60">Round {d.dispatchRound}</div>
                      <div className="h-1 w-1 rounded-full bg-[#D7CCC8]"></div>
                      <div className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider opacity-60">Sent: <span className="text-[#E87A5D] font-black">{d.givenQuantity}</span></div>
                    </div>
                  </div>
                  <input
                    type="number"
                    disabled={isSettled}
                    placeholder="0"
                    value={returnMap[d.id] || ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateReturns();
                    }}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0).toString();
                      if (val !== '' && parseInt(val) > d.givenQuantity) return;
                      setReturnMap({ ...returnMap, [d.id]: val });
                    }}
                    className={`w-14 text-center py-2.5 rounded-[12px] font-black text-sm outline-none transition-all ${isSettled ? 'bg-[#F9F5F0] text-[#D7CCC8]' : 'bg-white border border-[#FFF1E0] text-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="h-10" />
      </div>

      {sid && !isSettled && (
        <div className="p-6 pt-2 pb-6 bg-white/80 backdrop-blur-md border-t border-[#FFF1E0] flex-shrink-0 z-40">
          <button onClick={handleUpdateReturns}
            className="w-full bg-[#5D4037] text-white font-black text-lg py-5 rounded-[28px] shadow-xl shadow-[#5D4037]/20 active:scale-95 transition-all flex items-center justify-center gap-3">
            <RotateCcw size={22} /> Update Field Returns
          </button>
        </div>
      )}
    </div>
  );
};

const SettlementView = ({ db, setDb, selectedDate, setSelectedDate, sid, setSid }: { db: DatabaseState, setDb: (db: DatabaseState | ((p: DatabaseState) => DatabaseState)) => void, selectedDate: string, setSelectedDate: (d: string) => void, sid: string, setSid: (s: string) => void }) => {
  const [comm, setComm] = useState(40);
  const [paidAmt, setPaidAmt] = useState('');

  const dispatches = useMemo<DispatchRecord[]>(() => (db.dispatches as DispatchRecord[]).filter((d: DispatchRecord) => d.salesmanId === sid && d.date === selectedDate), [db.dispatches, sid, selectedDate]);
  const existingSettlement = useMemo<Settlement | undefined>(() => (db.settlements as Settlement[]).find((s: Settlement) => s.salesmanId === sid && s.date === selectedDate), [db.settlements, sid, selectedDate]);
  const existingPayment = useMemo<PaymentRecord | undefined>(() => (db.paymentLedger as PaymentRecord[]).find((p: PaymentRecord) => p.salesmanId === sid && p.date === selectedDate), [db.paymentLedger, sid, selectedDate]);

  useEffect(() => {
    if (existingSettlement) {
      setComm(existingSettlement.commissionPercent);
    } else {
      setComm(40);
    }
  }, [existingSettlement, sid, selectedDate]);

  const uniqueSalesmanIdsForDate = useMemo<string[]>(() => {
    const ids = (db.dispatches as DispatchRecord[])
      .filter((d: DispatchRecord) => d.date === selectedDate)
      .map((d: DispatchRecord) => d.salesmanId);
    return Array.from(new Set(ids));
  }, [db.dispatches, selectedDate]);

  const totalSales = useMemo<number>(() => {
    return dispatches.reduce((acc: number, d: DispatchRecord) => {
      const sold = d.givenQuantity - (d.returnedQuantity ?? 0);
      return acc + (sold * d.priceSnapshot);
    }, 0);
  }, [dispatches]);

  const commissionAmount = existingSettlement?.settlementLocked 
    ? existingSettlement.commissionAmount 
    : (totalSales * comm) / 100;

  const netAmount = existingSettlement?.settlementLocked 
    ? existingSettlement.netAmount 
    : totalSales - commissionAmount;

  const handleSettle = () => {
    if (!sid) return;
    if (existingSettlement?.settlementLocked) return;
    const salesman = (db.salesmen as Salesman[]).find((s: Salesman) => s.id === sid)!;
    const settlement: Settlement = {
      id: existingSettlement?.id || generateUUID(),
      date: selectedDate,
      salesmanId: sid,
      salesmanNameSnapshot: salesman.name,
      totalAmount: totalSales,
      commissionPercent: comm,
      commissionAmount,
      netAmount,
      settlementLocked: true,
      createdAt: Date.now()
    };
    setDb((prev: DatabaseState) => {
      const filtered = prev.settlements.filter((s: Settlement) => s.id !== settlement.id);
      return {
        ...prev,
        settlements: [...filtered, settlement],
        lastUpdated: new Date().toISOString()
      };
    });
    alert("Settlement Finalized!");
  };

  const handleRecordPayment = () => {
    if (!sid || !paidAmt) return;
    const amount = parseFloat(paidAmt);
    if (isNaN(amount)) return;

    const newPayment: PaymentRecord = {
      id: generateUUID(),
      date: selectedDate,
      salesmanId: sid,
      amountPaid: amount,
      createdAt: Date.now(),
      note: 'Settlement Payment'
    };

    setDb((prev: DatabaseState) => ({
      ...prev,
      paymentLedger: [...prev.paymentLedger, newPayment],
      lastUpdated: new Date().toISOString()
    }));

    setPaidAmt('');
    alert("Payment Recorded!");
  };

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32">
      <DateSelector date={selectedDate} onChange={setSelectedDate} />

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-white premium-shadow mb-6">
        <label className="text-[10px] font-black text-[#A1887F] uppercase mb-3 block tracking-[0.15em] opacity-60">Final Settlement Billing</label>
        <select value={sid} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const val: string = e.target.value;
          setSid(val);
          const s = (db.settlements as Settlement[]).find((item: Settlement) => item.salesmanId === val && item.date === selectedDate);
          if (s) setComm(s.commissionPercent);
          setPaidAmt('');
        }} className="w-full bg-[#FFFBF7] border-0 rounded-[20px] px-4 py-5 font-bold text-[#5D4037] outline-none">
          <option value="">-- Choose Salesman --</option>
          {uniqueSalesmanIdsForDate.map((salesmanId: string) => {
            const s = (db.salesmen as Salesman[]).find((sm: Salesman) => sm.id === salesmanId);
            return <option key={salesmanId} value={salesmanId}>{s?.name || "Unknown"}</option>;
          })}
        </select>
      </div>

      {sid && (
        <div className="bg-white rounded-[40px] p-6 shadow-sm border border-white flex flex-col gap-8 premium-shadow">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-[0.3em] mb-2 opacity-60">Actual Revenue Sold</span>
            <span className="text-4xl font-brand text-[#5D4037] tracking-wider leading-none">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {!existingSettlement?.settlementLocked && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <label className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.2em] opacity-60">Commission %</label>
                <div className="flex gap-2">
                  {[40, 50].map(val => (
                    <button key={val} onClick={() => setComm(val)}
                      className={`px-5 py-2.5 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all ${comm === val ? 'bg-[#FF8A65] text-white shadow-lg' : 'bg-[#FFF9F5] text-[#D7CCC8] border border-white'}`}>
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
              <input type="number" value={comm} onChange={(e) => setComm(parseInt(e.target.value) || 0)}
                className="w-full bg-[#FFFBF7] border-0 rounded-[20px] px-5 py-4 font-black text-[#FF8A65] outline-none text-right text-2xl tabular-nums shadow-inner" />
            </div>
          )}

          <div className="flex flex-col gap-4 bg-[#FFFBF7] p-6 rounded-[32px] border border-[#FFF1E0] shadow-inner">
            <div className="flex justify-between items-center"><span className="text-[10px] text-[#A1887F] font-bold uppercase tracking-widest opacity-60">Payout Amt {existingSettlement?.settlementLocked ? `(${existingSettlement.commissionPercent}%)` : `(${comm}%)`}</span><span className="text-[#EF5350] font-black tabular-nums">- ₹{commissionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between items-center border-t border-[#FFF1E0] pt-4"><span className="text-[#5D4037] font-black text-lg leading-none">Net Store</span><span className="text-[#43A047] font-brand text-2xl tracking-widest leading-none">₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          </div>

          {existingSettlement?.settlementLocked ? (
            <div className="flex flex-col gap-6">
              <div className="bg-[#E8F5EE] p-6 rounded-[32px] flex items-center justify-center gap-3 border border-white premium-shadow">
                <Lock size={18} className="text-[#4CAF50]" />
                <span className="text-[#2E7D32] font-black uppercase text-xs tracking-[0.2em]">Settlement Locked</span>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.2em] opacity-60 px-2">Record Cash Received</label>
                {existingPayment ? (
                  <div className="bg-[#E3F2FD] p-6 rounded-[32px] border border-white premium-shadow flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#1E88E5] uppercase tracking-widest">Amount Paid Today</span>
                      <span className="font-brand text-2xl text-[#1565C0]">₹{existingPayment.amountPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-[8px] font-black text-[#64B5F6] uppercase tracking-tighter self-end">{new Date(existingPayment.createdAt).toLocaleTimeString()}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <input
                      type="number"
                      placeholder="Enter amount paid"
                      value={paidAmt}
                      onChange={(e) => setPaidAmt(e.target.value)}
                      className="w-full bg-[#FFFBF7] border border-[#FFF1E0] rounded-[24px] px-6 py-4 font-black text-[#5D4037] outline-none text-xl tabular-nums focus:ring-2 focus:ring-[#BBDEFB]"
                    />
                    <button onClick={handleRecordPayment} className="w-full bg-[#1E88E5] text-white font-black text-sm py-4 rounded-[24px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                      <Receipt size={18} /> Confirm Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button onClick={handleSettle} className="mt-2 w-full bg-gradient-to-r from-[#FF8A65] to-[#FFAB91] text-white font-black text-base py-4 rounded-[28px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              <Lock size={20} /> Lock Settlement
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const LedgerView = ({ db, setDb }: { db: DatabaseState, setDb: (db: DatabaseState | ((p: DatabaseState) => DatabaseState)) => void }) => {
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string | null>(null);

  const salesmenBalances = useMemo(() => {
    return (db.salesmen as Salesman[]).filter((s: Salesman) => s.isActive).map((s: Salesman) => {
      const totalSettledDebt = (db.settlements as Settlement[])
        .filter((st: Settlement) => st.salesmanId === s.id && st.settlementLocked)
        .reduce((acc, st: Settlement) => acc + st.netAmount, 0);

      const totalPaid = (db.paymentLedger as PaymentRecord[])
        .filter((p: PaymentRecord) => p.salesmanId === s.id)
        .reduce((acc, p: PaymentRecord) => acc + p.amountPaid, 0);

      return {
        ...s,
        balance: totalSettledDebt - totalPaid
      };
    });
  }, [db.salesmen, db.settlements, db.paymentLedger]);

  const selectedSalesmanHistory = useMemo(() => {
    if (!selectedSalesmanId) return [];

    const sets = (db.settlements as Settlement[])
      .filter((s: Settlement) => s.salesmanId === selectedSalesmanId && s.settlementLocked)
      .map((s: Settlement) => ({
        type: 'debt' as const,
        date: s.date,
        amount: s.netAmount,
        createdAt: s.createdAt,
        note: `Sales Settlement`
      }));

    const pays = (db.paymentLedger as PaymentRecord[])
      .filter((p: PaymentRecord) => p.salesmanId === selectedSalesmanId)
      .map((p: PaymentRecord) => ({
        type: 'credit' as const,
        date: p.date,
        amount: p.amountPaid,
        createdAt: p.createdAt,
        note: p.note || 'Cash Received'
      }));

    return [...sets, ...pays].sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedSalesmanId, db.settlements, db.paymentLedger]);

  const handleSalesmanClick = (sid: string) => {
    setSelectedSalesmanId(sid === selectedSalesmanId ? null : sid);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7] p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-24">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-3xl font-bold text-[#5D4037] tracking-tight">Ledger</h2>
        <p className="text-xs text-[#A1887F] font-medium tracking-wide mt-0.5 opacity-60 uppercase">Debt tracking per salesman</p>
      </div>

      {!selectedSalesmanId ? (
        <div className="flex flex-col gap-4">
          {salesmenBalances.map((sm) => (
            <div
              key={sm.id}
              onClick={() => handleSalesmanClick(sm.id)}
              className="bg-white rounded-[32px] p-6 border border-white premium-shadow flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#FFF4E6] rounded-[20px] flex items-center justify-center text-[#E87A5D]">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="font-black text-[#5D4037] text-base leading-none mb-1">{sm.name}</h4>
                  <p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-widest opacity-60">Status: {sm.balance <= 0 ? 'Cleared' : 'Pending'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-brand text-xl ${sm.balance > 0 ? 'text-[#D32F2F]' : 'text-[#43A047]'}`}>
                  ₹{Math.abs(sm.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] font-black text-[#A1887F] uppercase tracking-widest opacity-40">
                  {sm.balance > 0 ? 'Rem. Debt' : 'Extra Credit'}
                </p>
              </div>
            </div>
          ))}
          {salesmenBalances.length === 0 && (
            <div className="text-center py-20 opacity-30 italic text-[10px] uppercase tracking-widest">No salesmen found</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right-10 duration-500">
          <button
            onClick={() => setSelectedSalesmanId(null)}
            className="flex items-center gap-2 text-[#A1887F] font-bold text-[10px] uppercase tracking-widest mb-2"
          >
            <History size={14} /> Back to all
          </button>

          <div className="bg-[#5D4037] rounded-[40px] p-8 text-white relative overflow-hidden premium-shadow">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-brand text-3xl tracking-wide">{(db.salesmen as Salesman[]).find((s: Salesman) => s.id === selectedSalesmanId)?.name}</h3>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Live Ledger Balance</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl"><BookOpen size={24} className="text-[#FFCCBC]" /></div>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">₹{Math.abs(salesmenBalances.find(s => s.id === selectedSalesmanId)?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] font-bold uppercase mb-1.5 opacity-60">
                {(salesmenBalances.find(s => s.id === selectedSalesmanId)?.balance || 0) > 0 ? 'Debt Owed' : 'Advanced Credit'}
              </span>
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.2em] px-2 opacity-60">Transaction History</h4>
            <div className="flex flex-col gap-3">
              {selectedSalesmanHistory.map((item, idx) => (
                <div key={idx} className="bg-white rounded-[28px] p-5 border border-white premium-shadow flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.type === 'debt' ? 'bg-[#FFEBEE] text-[#D32F2F]' : 'bg-[#E8F5EE] text-[#2E7D32]'}`}>
                      {item.type === 'debt' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div>
                      <h5 className="font-bold text-[#5D4037] text-sm leading-none mb-1">{item.note}</h5>
                      <p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider opacity-60">{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm tabular-nums ${item.type === 'debt' ? 'text-[#D32F2F]' : 'text-[#2E7D32]'}`}>
                      {item.type === 'debt' ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[8px] font-bold text-[#BCAAA4] uppercase tracking-tighter opacity-40">{item.type === 'debt' ? 'Added Debt' : 'Cash Paid'}</span>
                  </div>
                </div>
              ))}
              {selectedSalesmanHistory.length === 0 && (
                <div className="text-center py-12 opacity-30 italic text-[10px] uppercase tracking-widest">No transactions yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- DRIVE SYNC LOGIC ---

const FirebaseSyncPanel = ({ db, setDb, lastSyncedDbRef }: { 
  db: DatabaseState, 
  setDb: (newDb: DatabaseState) => void, 
  lastSyncedDbRef: React.MutableRefObject<DatabaseState | null> 
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('firebase_config') !== null);
  const [isRecoveryLocked, setIsRecoveryLocked] = useState(() => db.recoveryHash !== null);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('firebase_config');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  });

  const saveConfig = () => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    alert("Configuration saved locally. Please refresh to apply.");
    window.location.reload();
  };

  const updateRecoveryPhrase = async () => {
    if (!recoveryInput) return alert("Please enter a phrase.");
    try {
      const hash = await hashPassword(recoveryInput);
      setDb({ ...db, recoveryHash: hash, lastUpdated: new Date().toISOString() });
      setIsRecoveryLocked(true);
      setRecoveryInput('');
      alert("Security Recovery Phrase Updated! This will be synced to cloud automatically.");
    } catch (e) {
      alert("Failed to update phrase.");
    }
  };

  const syncToCloud = async () => {
    if (!db.ownerUsername) return alert("Please login first.");
    setSyncStatus('loading');
    try {
      const docRef = doc(firestore!, FIREBASE_COLLECTION, `${db.ownerUsername}_data`);
      const now = new Date().toISOString();

      // Group dispatches, settlements, and payments by month
      const group: Record<string, { dispatches: any[], settlements: any[], paymentLedger: any[] }> = {};
      const getMonth = (dateStr: string) => dateStr.slice(0, 7);

      db.dispatches.forEach(d => {
        const m = getMonth(d.date);
        if (!group[m]) group[m] = { dispatches: [], settlements: [], paymentLedger: [] };
        group[m].dispatches.push(d);
      });
      db.settlements.forEach(s => {
        const m = getMonth(s.date);
        if (!group[m]) group[m] = { dispatches: [], settlements: [], paymentLedger: [] };
        group[m].settlements.push(s);
      });
      db.paymentLedger.forEach(p => {
        const m = getMonth(p.date);
        if (!group[m]) group[m] = { dispatches: [], settlements: [], paymentLedger: [] };
        group[m].paymentLedger.push(p);
      });

      // 1. Write the monthly documents first
      const monthPromises = Object.keys(group).map(m => {
        const monthDocRef = doc(firestore!, FIREBASE_COLLECTION, `${db.ownerUsername}_data`, "monthly_data", m);
        return setDoc(monthDocRef, group[m]);
      });
      await Promise.all(monthPromises);

      // 2. Write the metadata document last
      await setDoc(docRef, {
        products: db.products,
        salesmen: db.salesmen,
        ownerUsername: db.ownerUsername,
        ownerHash: db.ownerHash,
        recoveryHash: db.recoveryHash,
        lastFirebaseSync: Date.now(),
        lastUpdated: now
      });

      const updatedDb = { ...db, lastFirebaseSync: Date.now(), lastUpdated: now };
      setDb(updatedDb);
      lastSyncedDbRef.current = updatedDb;
      setSyncStatus('success');
      setLastError(null);
      alert("Cloud Backup Successful!");
    } catch (err) {
      console.error("Firebase Error:", err);
      setSyncStatus('error');
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setLastError(msg);
      alert(`Backup failed. Check your Firebase config and connection.\n\nError details:\n${msg}`);
    }
  };

  const fetchFromCloud = async () => {
    if (!db.ownerUsername) return alert("Please login first.");
    setSyncStatus('loading');
    try {
      const docRef = doc(firestore!, FIREBASE_COLLECTION, `${db.ownerUsername}_data`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as DatabaseState;
        if (confirm("Restore cloud data? This will overwrite your local records.")) {
          
          // Fetch the monthly partitioned data
          const monthlySnap = await getDocs(collection(firestore!, FIREBASE_COLLECTION, `${db.ownerUsername}_data`, "monthly_data"));
          const mergedDb: DatabaseState = {
            ...cloudData,
            dispatches: [],
            settlements: [],
            paymentLedger: []
          };
          if (monthlySnap.empty) {
            mergedDb.dispatches = cloudData.dispatches || [];
            mergedDb.settlements = cloudData.settlements || [];
            mergedDb.paymentLedger = cloudData.paymentLedger || [];
          } else {
            monthlySnap.forEach((doc) => {
              const data = doc.data();
              if (data.dispatches) mergedDb.dispatches.push(...data.dispatches);
              if (data.settlements) mergedDb.settlements.push(...data.settlements);
              if (data.paymentLedger) mergedDb.paymentLedger.push(...data.paymentLedger);
            });
          }

          const updatedDb = { ...mergedDb, lastFirebaseSync: Date.now() };
          setDb(updatedDb);
          lastSyncedDbRef.current = updatedDb;
          setSyncStatus('success');
          setLastError(null);
          alert("Restore Complete!");
        }
      } else {
        alert("No cloud backup found for this account.");
        setSyncStatus('idle');
      }
    } catch (err) {
      console.error("Firebase Error:", err);
      setSyncStatus('error');
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setLastError(msg);
      alert(`Fetch failed. Check your Firebase config and connection.\n\nError details:\n${msg}`);
    }
  };



  return (
    <div className="flex flex-col gap-6">
      {/* Firebase Configuration */}
      <div className="bg-white rounded-[32px] p-6 border border-[#FFF1E0] premium-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="text-[#FFAB91]" size={20} />
            <h3 className="font-bold text-[#5D4037]">Firebase Setup</h3>
          </div>
          {isLocked && (
            <span className="bg-[#E8F5EE] text-[#4CAF50] text-[8px] font-black uppercase px-2 py-1 rounded-full border border-[#C8E6C9] flex items-center gap-1">
              <ShieldCheck size={10} /> Configured
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-[#FFF1E0] shadow-inner">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[9px] font-bold text-[#A1887F] uppercase tracking-wider">
                <span>Database Link</span>
                <span className="text-[#5D4037]">Sonu Ice Cream Cloud</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold text-[#A1887F] uppercase tracking-wider mt-2">
                <span>Security</span>
                <span className="text-[#4CAF50] font-black">HARDCODED SECURELY</span>
              </div>
            </div>
          </div>
          <div className="text-center text-[8px] font-bold text-[#A1887F] uppercase tracking-widest opacity-60 mt-2">
            Configuration cannot be changed here.
          </div>
        </div>
      </div>

      {/* Security & Recovery */}
      <div className="bg-white rounded-[32px] p-6 border border-[#FFF1E0] premium-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lock className="text-[#FFAB91]" size={20} />
            <h3 className="font-bold text-[#5D4037]">Security & Recovery</h3>
          </div>
          {isRecoveryLocked && (
            <span className="bg-[#E8F5EE] text-[#4CAF50] text-[8px] font-black uppercase px-2 py-1 rounded-full border border-[#C8E6C9] flex items-center gap-1">
              <ShieldCheck size={10} /> Secure Key Active
            </span>
          )}
        </div>

        {isRecoveryLocked ? (
          <div className="flex flex-col gap-4">
            <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-[#FFF1E0] shadow-inner text-[9px] font-bold text-[#A1887F] uppercase tracking-wider text-center">
              Recovery System is Active and Locked
            </div>
            <button
              onClick={() => setIsRecoveryLocked(false)}
              className="w-full bg-[#F9F5F0] text-[#8D6E63] py-3 rounded-[16px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-white premium-shadow transition-all active:scale-95"
            >
              Change Recovery Phrase
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] text-[#A1887F] font-medium mb-1 uppercase tracking-widest leading-relaxed">
              Set a <span className="text-[#D32F2F]">Secret Phrase</span> to reset your password if forgotten.
            </p>
            <input
              type="text"
              placeholder="Your Secret Word or Sentence"
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              className="w-full bg-[#FFFBF7] border border-[#FFF1E0] rounded-[16px] px-4 py-4 font-bold text-[11px] text-[#5D4037] outline-none focus:ring-1 focus:ring-[#FFCCBC]"
            />
            <button
              onClick={updateRecoveryPhrase}
              className="w-full bg-[#FF8A65] text-white py-3 rounded-[16px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
            >
              <CheckCircle2 size={16} /> Activate Recovery Phrase
            </button>
            {db.recoveryHash && (
              <button onClick={() => setIsRecoveryLocked(true)} className="text-[8px] font-black text-[#BCAAA4] uppercase tracking-widest py-1">Cancel Update</button>
            )}
          </div>
        )}
      </div>

      {/* Cloud Backup Control */}
      <div className="bg-[#5D4037] rounded-[36px] p-8 premium-shadow text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="text-[#FFAB91]" />
            <h3 className="font-bold text-lg">Firebase Cloud Sync</h3>
          </div>
          <p className="text-[10px] text-white/60 mb-8 uppercase tracking-widest leading-relaxed">
            Backup local data to Firestore or restore from cloud.
          </p>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={syncToCloud}
                disabled={syncStatus === 'loading'}
                className="bg-[#FF8A65] py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50"
              >
                <CloudUpload size={24} /> {syncStatus === 'loading' ? 'Syncing...' : 'Upload'}
              </button>
              <button
                onClick={fetchFromCloud}
                disabled={syncStatus === 'loading'}
                className="bg-white/10 border border-white/20 py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex flex-col items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <CloudDownload size={24} /> {syncStatus === 'loading' ? 'Fetching...' : 'Download'}
              </button>
            </div>

            <div className="w-full py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 bg-[#43A047]/10 border border-[#43A047]/20 text-[#43A047]">
              <RefreshCw size={16} className="animate-spin" />
              Auto-Sync: Active
            </div>

            {lastError && (
              <div className="bg-red-950/40 border border-red-500/30 p-5 rounded-[24px] flex items-start gap-3 mt-2 text-left backdrop-blur-sm animate-in fade-in duration-300">
                <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-red-300 uppercase tracking-widest block mb-1">Detailed Error Log</span>
                  <p className="text-[10px] font-mono text-red-200/95 leading-relaxed break-all whitespace-pre-wrap">{lastError}</p>
                </div>
              </div>
            )}
          </div>

          {db.lastFirebaseSync && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <CheckCircle2 size={12} className="text-[#81C784]" />
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.3em]">
                Last Sync: {new Date(db.lastFirebaseSync).toLocaleString()}
              </p>
            </div>
          )}
        </div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};

const ManageView = ({ db, setDb, onLogout, lastSyncedDbRef }: { 
  db: DatabaseState, 
  setDb: (db: DatabaseState | ((p: DatabaseState) => DatabaseState)) => void, 
  onLogout: () => void,
  lastSyncedDbRef: React.MutableRefObject<DatabaseState | null>
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'salesmen' | 'cloud'>('products');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleAdd = () => {
    if (!newName) return;
    if (activeTab === 'products') {
      const p: Product = { id: generateUUID(), name: newName, currentPrice: parseFloat(newPrice) || 0, isActive: true, createdAt: Date.now() };
      setDb((prev: DatabaseState) => ({
        ...prev,
        products: [...prev.products, p],
        lastUpdated: new Date().toISOString()
      }));
    } else {
      if (newPhone && !/^\d{10}$/.test(newPhone)) {
        alert("Phone number must be exactly 10 digits.");
        return;
      }
      const s: Salesman = { 
        id: generateUUID(), 
        name: newName, 
        ...(newPhone && { phone: newPhone }),
        isActive: true, 
        createdAt: Date.now() 
      };
      setDb((prev: DatabaseState) => ({
        ...prev,
        salesmen: [...prev.salesmen, s],
        lastUpdated: new Date().toISOString()
      }));
    }
    setNewName('');
    setNewPrice('');
    setNewPhone('');
  };

  const handleUpdatePhone = (id: string) => {
    const phone = prompt("Enter 10-digit Indian phone number (or leave empty to remove):");
    if (phone === null) return;
    if (phone && !/^\d{10}$/.test(phone)) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    setDb((prev: DatabaseState) => {
      const nextSalesmen = (prev.salesmen as Salesman[]).map((s: Salesman) => s.id === id ? { ...s, phone: phone || undefined } : s);
      return { ...prev, salesmen: nextSalesmen, lastUpdated: new Date().toISOString() };
    });
  };

  const handleDeleteEntry = (id: string, name: string) => {
    const isUsed = db.dispatches.some((d: DispatchRecord) => (activeTab === 'products' ? d.productNameSnapshot === name : d.salesmanId === id));

    if (isUsed) {
      alert("⚠️ This item is used in existing records. It can only be deactivated (hidden), not deleted entirely.");
      setDb((prev: DatabaseState) => {
        if (activeTab === 'products') {
          const nextProducts = (prev.products as Product[]).map((p: Product) => p.id === id ? { ...p, isActive: false } : p);
          return { ...prev, products: nextProducts, lastUpdated: new Date().toISOString() };
        }
        const nextSalesmen = (prev.salesmen as Salesman[]).map((s: Salesman) => s.id === id ? { ...s, isActive: false } : s);
        return { ...prev, salesmen: nextSalesmen, lastUpdated: new Date().toISOString() };
      });
      return;
    }

    if (confirm(`🚨 PERMANENT DELETE: Are you sure you want to completely remove "${name}"? This cannot be undone.`)) {
      setDb((prev: DatabaseState) => {
        if (activeTab === 'products') {
          const nextProducts = prev.products.filter((p: Product) => p.id !== id);
          return { ...prev, products: nextProducts, lastUpdated: new Date().toISOString() };
        }
        const nextSalesmen = prev.salesmen.filter((s: Salesman) => s.id !== id);
        return { ...prev, salesmen: nextSalesmen, lastUpdated: new Date().toISOString() };
      });
    }
  };

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32">
      {/* Header Tabs with Fixed Spacing */}
      <div className="bg-white/90 rounded-[24px] p-1 flex shadow-sm border border-[#FFF1E0] gap-2 premium-shadow mb-8 flex-shrink-0">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 text-[8px] font-black uppercase tracking-tight rounded-[20px] transition-all ${activeTab === 'products' ? 'bg-[#FF8A65] text-white shadow-md' : 'text-[#BCAAA4]'}`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('salesmen')}
          className={`flex-1 py-3 text-[8px] font-black uppercase tracking-tight rounded-[20px] transition-all ${activeTab === 'salesmen' ? 'bg-[#FF8A65] text-white shadow-md' : 'text-[#BCAAA4]'}`}
        >
          Staff
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex-1 py-3 text-[8px] font-black uppercase tracking-tight rounded-[20px] transition-all ${activeTab === 'cloud' ? 'bg-[#5D4037] text-white shadow-md' : 'text-[#BCAAA4]'}`}
        >
          Cloud
        </button>
      </div>

      {activeTab === 'cloud' ? (
        <FirebaseSyncPanel db={db} setDb={(newDb: DatabaseState) => setDb(newDb)} lastSyncedDbRef={lastSyncedDbRef} />
      ) : (
        <>
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#FFF1E0] premium-shadow mb-8">
            <label className="text-[10px] font-black text-[#A1887F] uppercase mb-5 block tracking-[0.2em] opacity-60">
              Add {activeTab === 'products' ? 'Product' : 'Salesman'}
            </label>
            <div className="flex flex-col gap-4">
              <input type="text" placeholder={activeTab === 'products' ? "Flavor Name" : "Salesman Name"} value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#FFFBF7] border border-[#FFF1E0] rounded-[20px] px-5 py-4 font-bold text-[#5D4037] outline-none focus:ring-1 focus:ring-[#FFCCBC]" />
              {activeTab === 'products' ? (
                <input type="number" placeholder="Rate (₹)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-[#FFFBF7] border border-[#FFF1E0] rounded-[20px] px-5 py-4 font-bold text-[#5D4037] outline-none focus:ring-1 focus:ring-[#FFCCBC]" />
              ) : (
                <input type="tel" placeholder="Phone Number (10 digits) - Optional" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#FFFBF7] border border-[#FFF1E0] rounded-[20px] px-5 py-4 font-bold text-[#5D4037] outline-none focus:ring-1 focus:ring-[#FFCCBC]" />
              )}
              <button onClick={handleAdd} className="w-full bg-[#5D4037] text-white font-black py-4 rounded-[20px] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all mt-2">
                <Plus size={20} /> Register Entry
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-[#A1887F] uppercase tracking-[0.25em] px-2 opacity-40 py-2">Registered Active</h3>
            <div className="flex flex-col gap-3">
              {(activeTab === 'products' ? (db.products as Product[]) : (db.salesmen as Salesman[])).filter(i => i.isActive).map(item => (
                <div key={item.id} className="bg-white/80 rounded-[28px] p-5 border border-[#FFF1E0] flex items-center justify-between gap-3 group premium-shadow">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-12 w-12 bg-[#FFFBF7] rounded-[18px] flex items-center justify-center text-xl shadow-inner border border-[#FFF1E0] flex-shrink-0">
                      {activeTab === 'products' ? '🍦' : '👤'}
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-black text-[#5D4037] text-base leading-tight uppercase tracking-tight truncate block">{item.name}</div>
                      {activeTab === 'products' && <div className="text-[8px] font-black text-[#FF8A65] uppercase tracking-widest opacity-70 mt-0.5">Rate: ₹{(item as Product).currentPrice}</div>}
                      {activeTab === 'salesmen' && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {(item as Salesman).phone ? (
                            <>
                              <a href={`tel:+91${(item as Salesman).phone}`} className="bg-[#4CAF50] text-white text-[9px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm active:scale-95 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                📞 Call
                              </a>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdatePhone(item.id); }} className="text-[9px] text-[#A1887F] font-bold underline flex-shrink-0">Edit Phone</button>
                            </>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdatePhone(item.id); }} className="text-[9px] text-[#FF8A65] font-bold underline flex-shrink-0">Add Phone Number</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(item.id, item.name);
                    }}
                    className="p-2.5 bg-[#FFEBEE] text-[#D32F2F] rounded-[14px] hover:bg-[#FFCDD2] transition-colors flex-shrink-0 self-center shadow-sm active:scale-95"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button onClick={onLogout} className="mt-12 w-full bg-gradient-to-r from-[#D32F2F] to-[#EF5350] text-white font-black uppercase text-xs tracking-[0.2em] py-4 rounded-[24px] shadow-lg shadow-[#D32F2F]/20 hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0">
        <LogOut size={18} /> Logout
      </button>
    </div>
  );
};