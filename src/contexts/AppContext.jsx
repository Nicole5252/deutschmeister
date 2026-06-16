import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings } from '../utils/storage';
import { getSupabase, syncAllData, resetSupabaseInstance } from '../utils/supabase';
import { translations } from '../i18n';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => getSettings());
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Translation helper
  const t = useCallback((path) => {
    const lang = settings.language || 'zh';
    const keys = path.split('.');
    let obj = translations[lang];
    for (const k of keys) {
      obj = obj?.[k];
    }
    return obj || path;
  }, [settings.language]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      if (updates.supabaseUrl !== undefined || updates.supabaseAnonKey !== undefined) {
        resetSupabaseInstance();
      }
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  }, [settings.theme, updateSettings]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const triggerSync = useCallback(async (customUser = null) => {
    const activeUser = customUser || user;
    if (!activeUser) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setIsSyncing(true);
    try {
      await syncAllData(supabase, activeUser.id);
      showToast('☁️ 雲端資料同步完成！', 'success');
    } catch (err) {
      console.error('Sync failed:', err);
      showToast('❌ 雲端同步失敗：' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [user, showToast]);

  // Initialize Supabase Auth state listener
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setIsSyncing(true);
        syncAllData(supabase, session.user.id)
          .catch(err => console.error('Initial sync failed:', err))
          .finally(() => setIsSyncing(false));
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          setIsSyncing(true);
          syncAllData(supabase, session.user.id)
            .then(() => showToast('☁️ 已登入並同步雲端資料', 'success'))
            .catch(err => {
              console.error('Sign in sync failed:', err);
              showToast('❌ 雲端同步失敗：' + err.message, 'error');
            })
            .finally(() => setIsSyncing(false));
        }
      } else {
        setUser(null);
        if (event === 'SIGNED_OUT') {
          showToast('已登出雲端帳號', 'info');
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [showToast]);

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      toggleTheme,
      t,
      toasts,
      showToast,
      user,
      isSyncing,
      triggerSync,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
