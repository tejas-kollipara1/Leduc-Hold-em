import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  username: string;
  balance: number;
  birthDate?: string;
  email?: string;
}

export interface HistoryItem {
  id: string;
  game: string;
  bet: number;
  outcome: 'WIN' | 'LOSS' | 'PUSH';
  net: number;
  timestamp: number;
  balanceAfter: number;
  aiAdvice: string;
  followedAdvice: boolean;
}

interface CasinoContextType {
  user: User | null;
  history: HistoryItem[];
  login: (username: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (username: string, pass: string, birthDate: string) => Promise<void>;
  resetPasswordByBirthday: (username: string, birthday: string, newPass: string) => Promise<boolean>;
  logout: () => void;
  updateBalance: (amount: number) => void;
  recordGame: (item: Omit<HistoryItem, 'timestamp' | 'balanceAfter' | 'id'>) => void;
  updateUsername: (newUsername: string) => Promise<void>;
  isCloud: boolean;
}

const CasinoContext = createContext<CasinoContextType | undefined>(undefined);

/* ═════════════════════════════════════════════════════════════
   SUPABASE HELPERS
   ═════════════════════════════════════════════════════════════ */
const cloudDB = {
  signUp: async (email: string, password: string, username: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username }
      }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  isUsernameAvailable: async (username: string) => {
    if (!supabase) return true;
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    return !data;
  },

  signIn: async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  signInWithGoogle: async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw new Error(error.message);
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  getProfile: async (userId: string) => {
    if (!supabase) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  },

  upsertProfile: async (userId: string, username: string, balance: number, email: string, birthDate: string) => {
    if (!supabase) return;
    await supabase.from('profiles').upsert({ 
      id: userId, 
      username, 
      balance, 
      email, 
      birth_date: birthDate 
    });
  },

  resetPasswordByBirthday: async (email: string, birthday: string, newPass: string) => {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('reset_password_with_birthday', {
      p_email: email,
      p_birthday: birthday,
      p_new_password: newPass
    });
    if (error) throw new Error(error.message);
    return data;
  },

  updateUsername: async (userId: string, username: string) => {
    if (!supabase) return;
    // Update both profile and auth metadata for consistency
    const { error: pError } = await supabase.from('profiles').update({ username }).eq('id', userId);
    if (pError) throw pError;
    
    const { error: aError } = await supabase.auth.updateUser({
      data: { username }
    });
    if (aError) console.warn('Auth metadata sync failed, profile updated.', aError);
  },

  updateBalance: async (userId: string, balance: number) => {
    if (!supabase) return;
    await supabase.from('profiles').update({ balance }).eq('id', userId);
  },

  addTransaction: async (userId: string, item: HistoryItem) => {
    if (!supabase) return;
    await supabase.from('transactions').insert({
      user_id: userId,
      game: item.game,
      bet: item.bet,
      outcome: item.outcome,
      net: item.net,
      balance_after: item.balanceAfter,
      ai_advice: item.aiAdvice,
      followed_advice: item.followedAdvice,
      created_at: new Date(item.timestamp).toISOString(),
    });
  },

  getTransactions: async (userId: string): Promise<HistoryItem[]> => {
    if (!supabase) return [];
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return [];
    return data.map((row: any) => ({
      id: row.id,
      game: row.game,
      bet: row.bet,
      outcome: row.outcome,
      net: row.net,
      timestamp: new Date(row.created_at).getTime(),
      balanceAfter: row.balance_after,
      aiAdvice: row.ai_advice || '',
      followedAdvice: row.followed_advice || false,
    }));
  },
};

export const CasinoProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [supaUserId, setSupaUserId] = useState<string | null>(null);
  const isCloud = isSupabaseConfigured();

  /* ── Logout ── defined early so useEffect below can call it safely ── */
  const logout = () => {
    if (isCloud) cloudDB.signOut();
    setUser(null);
    setHistory([]);
    setSupaUserId(null);
  };

  /* ── Restore session on mount ── */
  useEffect(() => {
    if (isCloud && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const uId = session.user.id;
          const email = session.user.email || '';
          setSupaUserId(uId);
          cloudDB.getProfile(uId).then(async (profile) => {
            if (profile) {
              // Age verification on session restore
              if (profile.birth_date && !checkAge(profile.birth_date)) {
                logout();
                return;
              }
              setUser({ 
                username: profile.username, 
                balance: profile.balance,
                birthDate: profile.birth_date,
                email: profile.email
              });
              cloudDB.getTransactions(uId).then(txns => setHistory(txns));
            } else {
              // OAuth first-time login: missing profile
              const defaultName = session.user.user_metadata?.username || email.split('@')[0] || 'HighRoller';
              const defaultBirth = '2000-01-01'; // Default for OAuth users, should be updated by user later
              await cloudDB.upsertProfile(uId, defaultName, 10000, email, defaultBirth);
              setUser({ username: defaultName, balance: 10000, email: email, birthDate: defaultBirth });
            }
          });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloud]);

  /* ── Google Login ── */
  const loginWithGoogle = async () => {
    if (!isCloud) throw new Error('Cloud database not configured.');
    await cloudDB.signInWithGoogle();
  };

  /* ── Login ── */
  const login = async (username: string, pass: string) => {
    if (!isCloud) {
       // Simulate local only login
       const virtualEmail = `${username.trim().toLowerCase()}@neon.vegas`;
       setUser({ username: username.trim(), balance: 10000, email: virtualEmail, birthDate: '2000-01-01' });
       return;
    }
    
    // Map Handle to Virtual Email
    const virtualEmail = `${username.trim().toLowerCase()}@neon.vegas`;
    const { user: authUser } = await cloudDB.signIn(virtualEmail, pass);
    if (!authUser) throw new Error('Login failed.');
    
    setSupaUserId(authUser.id);
    const profile = await cloudDB.getProfile(authUser.id);
    
    if (profile) {
      // Check Age
      if (profile.birth_date && !checkAge(profile.birth_date)) {
        await logout();
        throw new Error('Access denied: You must be 18 or older to enter the casino.');
      }
      setUser({ 
        username: profile.username, 
        balance: profile.balance,
        birthDate: profile.birth_date,
        email: profile.email
      });
      const txns = await cloudDB.getTransactions(authUser.id);
      setHistory(txns);
    } else {
      // New account sync
      await cloudDB.upsertProfile(authUser.id, username, 10000, virtualEmail, '2000-01-01');
      setUser({ username, balance: 10000, email: virtualEmail });
    }
  };

  /* ── Register ── */
  const register = async (username: string, pass: string, birthDate: string) => {
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) throw new Error('Handle must be at least 3 characters.');
    const virtualEmail = `${cleanUsername.toLowerCase()}@neon.vegas`;

    // Check Age
    if (!checkAge(birthDate)) {
      throw new Error('You must be 18 or older to register.');
    }

    if (!isCloud) {
       setUser({ username: cleanUsername, balance: 10000, email: virtualEmail, birthDate });
       return;
    }

    // Check uniqueness
    const isAvailable = await cloudDB.isUsernameAvailable(cleanUsername);
    if (!isAvailable) throw new Error('This handle is already taken! Try another one.');

    const { user: authUser } = await cloudDB.signUp(virtualEmail, pass, cleanUsername);
    if (!authUser) throw new Error('Registration failed.');
    
    setSupaUserId(authUser.id);
    await cloudDB.upsertProfile(authUser.id, cleanUsername, 10000, virtualEmail, birthDate);
    setUser({ username: cleanUsername, balance: 10000, email: virtualEmail, birthDate });
  };

  /* ── Forgot Password ── */
  const resetPasswordByBirthday = async (username: string, birthday: string, newPass: string) => {
    const virtualEmail = `${username.trim().toLowerCase()}@neon.vegas`;
    return await cloudDB.resetPasswordByBirthday(virtualEmail, birthday, newPass);
  };

  /* ── Logout (re-export from above, kept here for clarity in context value) ── */

  /* ── Identity Renaming ── */
  const updateUsername = async (newUsername: string) => {
    if (!isCloud || !supaUserId) return;
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 3) throw new Error('Username must be at least 3 characters.');

    // Check availability
    const isAvailable = await cloudDB.isUsernameAvailable(trimmed);
    if (!isAvailable) throw new Error('That handle is already claimed! Choose another path.');

    await cloudDB.updateUsername(supaUserId, trimmed);
    setUser(prev => prev ? { ...prev, username: trimmed } : null);
  };

  /* ── Balance Update ── */
  const updateBalance = (amount: number) => {
    setUser(prev => {
      if (!prev) return null;
      const newBal = prev.balance + amount;
      const newUser = { ...prev, balance: newBal };

      if (isCloud && supaUserId) {
        cloudDB.updateBalance(supaUserId, newBal);
      }
      return newUser;
    });
  };

  /* ── Record Game ── */
  const recordGame = (item: Omit<HistoryItem, 'timestamp' | 'balanceAfter' | 'id'>) => {
    if (!user) return;

    setHistory(prev => {
      const newItem: HistoryItem = {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        balanceAfter: user.balance + item.net,
      };
      const newHistory = [newItem, ...prev].slice(0, 100);

      if (isCloud && supaUserId) {
        cloudDB.addTransaction(supaUserId, newItem);
      }
      return newHistory;
    });
  };

  return (
    <CasinoContext.Provider value={{ 
      user, history, login, loginWithGoogle, register, resetPasswordByBirthday, 
      logout, updateBalance, recordGame, updateUsername, isCloud 
    }}>
      {children}
    </CasinoContext.Provider>
  );
};

/* ── Age Utils ── */
export const checkAge = (birthDateStr: string): boolean => {
  if (!birthDateStr) return false;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
};


export const useCasino = () => {
  const context = useContext(CasinoContext);
  if (!context) throw new Error('useCasino must be used within a CasinoProvider');
  return context;
};
