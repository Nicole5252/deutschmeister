import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  getSettings, saveSettings, exportAllData, importAllData, clearAllData
} from '../utils/storage';
import { getSupabase } from '../utils/supabase';
import {
  Eye, EyeOff, Download, Upload, Trash2, Sun, Moon, Globe, Key, Palette, Database,
  Cloud, Lock, RefreshCw, LogOut, UserPlus, ChevronDown, ChevronUp, Loader
} from 'lucide-react';
import './SettingsPage.css';

function KeyInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="key-input-wrapper">
      <input
        id={id}
        className="input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button className="key-toggle" onClick={() => setShow(p => !p)} type="button">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { t, settings, updateSettings, showToast, user, isSyncing, triggerSync } = useApp();
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey || '');
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [showCustomSupabase, setShowCustomSupabase] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const importRef = useRef();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      showToast('請輸入 Email 與密碼！', 'warning');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      showToast('⚠️ 未設定 Supabase 連線，請在進階設定中填入金鑰！', 'error');
      return;
    }
    setLoadingAuth(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });
      if (error) throw error;
      setEmail('');
      setPassword('');
    } catch (err) {
      showToast('❌ 登入失敗：' + err.message, 'error');
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleRegister() {
    if (!email.trim() || !password.trim()) {
      showToast('請輸入 Email 與密碼！', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('密碼長度必須大於 6 位數！', 'warning');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      showToast('⚠️ 未設定 Supabase 連線，請在進階設定中填入金鑰！', 'error');
      return;
    }
    setLoadingAuth(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim()
      });
      if (error) throw error;
      if (data.session) {
        showToast('✅ 註冊成功並已登入！', 'success');
      } else {
        showToast('✅ 註冊成功！請至信箱收取確認信，完成驗證後即可登入。', 'success', 6000);
      }
    } catch (err) {
      showToast('❌ 註冊失敗：' + err.message, 'error');
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleLogout() {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      showToast('❌ 登出失敗：' + err.message, 'error');
    }
  }

  function handleSaveSupabaseKeys() {
    updateSettings({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });
    showToast('✅ Supabase 金鑰已儲存', 'success');
  }

  function saveKeys() {
    updateSettings({ openaiKey, geminiKey });
    showToast('✅ ' + t('settings.saved'), 'success');
  }

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deutschmeister-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ 已匯出資料', 'success');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importAllData(data);
        showToast('✅ 已匯入資料，請重新整理頁面', 'success');
      } catch {
        showToast('❌ 檔案格式錯誤', 'error');
      }
    };
    reader.readAsText(file);
  }

  function handleClear() {
    if (!window.confirm(t('settings.clearConfirm'))) return;
    clearAllData();
    showToast('已清除所有資料', 'info');
    window.location.reload();
  }

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="text-secondary">個人化你的學習體驗</p>
        </div>
      </div>

      {/* API Keys */}
      <div className="settings-section card">
        <div className="settings-section-header">
          <Key size={18} style={{ color: 'var(--accent-primary)' }} />
          <h2>{t('settings.apiKeys')}</h2>
        </div>
        <div className="settings-section-body">
          <div className="form-group">
            <label className="label" htmlFor="openai-key">{t('settings.openaiKey')}</label>
            <KeyInput
              id="openai-key"
              value={openaiKey}
              onChange={setOpenaiKey}
              placeholder={t('settings.apiKeyPlaceholder')}
            />
            <p className="input-hint text-muted">用於 AI 辨識圖片單字與自動生成文法題目</p>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="gemini-key">{t('settings.geminiKey')}</label>
            <KeyInput
              id="gemini-key"
              value={geminiKey}
              onChange={setGeminiKey}
              placeholder="AIza..."
            />
            <p className="input-hint text-muted">Google Gemini API（備用）</p>
          </div>
          <button className="btn btn-primary" onClick={saveKeys}>
            <Key size={14} />
            {t('settings.saveKeys')}
          </button>
        </div>
      </div>

      {/* Supabase Cloud Sync */}
      <div className="settings-section card">
        <div className="settings-section-header">
          <Cloud size={18} style={{ color: 'var(--accent-blue)' }} />
          <h2>雲端同步與帳號登入</h2>
        </div>
        <div className="settings-section-body">
          {user ? (
            <div className="auth-status-container">
              <div className="auth-status-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="auth-status-label" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>目前登入帳號：</span>
                <strong className="auth-email" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{user.email}</strong>
              </div>
              <div className="flex gap-3 mt-4">
                <button 
                  className="btn btn-primary" 
                  onClick={() => triggerSync()}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <><Loader className="spin" size={14} /> 同步中...</>
                  ) : (
                    <><RefreshCw size={14} /> 立即雙向同步</>
                  )}
                </button>
                <button className="btn btn-glass danger" onClick={handleLogout}>
                  <LogOut size={14} />
                  登出雲端
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-form-container">
              <p className="input-hint text-muted" style={{ marginBottom: '1rem', fontSize: 'var(--text-xs)' }}>
                登入後即可在多個裝置（手機、平板、電腦）之間自動同步所有單字本與學習進度。
              </p>
              <div className="form-group">
                <label className="label" htmlFor="auth-email">電子信箱 (Email)</label>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="auth-password">密碼</label>
                <input
                  id="auth-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="請輸入密碼（至少 6 位數）"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button className="btn btn-primary" onClick={handleLogin} disabled={loadingAuth}>
                  {loadingAuth ? <Loader className="spin" size={14} /> : <Lock size={14} />}
                  登入帳號
                </button>
                <button className="btn btn-glass" onClick={handleRegister} disabled={loadingAuth}>
                  <UserPlus size={14} />
                  註冊新帳號
                </button>
              </div>
            </div>
          )}

          {/* Advanced Supabase Configuration */}
          <hr className="divider" style={{ margin: '1.5rem 0' }} />
          <div className="advanced-supabase-toggle" onClick={() => setShowCustomSupabase(!showCustomSupabase)} style={{ cursor: 'pointer' }}>
            <div className="setting-label flex items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              ⚙️ 自訂 Supabase 連線設定（進階自建雲端）
              {showCustomSupabase ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
              留空則使用系統預設的同步端點。自訂金鑰能讓您完全掌控個人隱私資料庫。
            </div>
          </div>

          {showCustomSupabase && (
            <div className="advanced-supabase-form animate-slide-in mt-4" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
              <div className="form-group">
                <label className="label" htmlFor="supabase-url">Supabase Project URL</label>
                <input
                  id="supabase-url"
                  className="input"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="supabase-key">Supabase Anon Key</label>
                <KeyInput
                  id="supabase-key"
                  value={supabaseAnonKey}
                  onChange={setSupabaseAnonKey}
                  placeholder="eyJhbGciOi..."
                />
              </div>
              <button className="btn btn-primary btn-sm mt-2" onClick={handleSaveSupabaseKeys}>
                儲存自訂連線金鑰
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section card">
        <div className="settings-section-header">
          <Palette size={18} style={{ color: 'var(--accent-secondary)' }} />
          <h2>{t('settings.appearance')}</h2>
        </div>
        <div className="settings-section-body">
          {/* Theme */}
          <div className="setting-row">
            <div>
              <div className="setting-label">主題顏色</div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>選擇深色或淺色介面</div>
            </div>
            <div className="theme-toggle-group">
              <button
                className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'dark' })}
              >
                <Moon size={16} /> {t('settings.darkMode')}
              </button>
              <button
                className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'light' })}
              >
                <Sun size={16} /> {t('settings.lightMode')}
              </button>
            </div>
          </div>

          <hr className="divider" />

          {/* Language */}
          <div className="setting-row">
            <div>
              <div className="setting-label">{t('settings.language')}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>介面顯示語言</div>
            </div>
            <div className="theme-toggle-group">
              <button
                className={`theme-btn ${settings.language === 'zh' ? 'active' : ''}`}
                onClick={() => updateSettings({ language: 'zh' })}
              >
                🇹🇼 {t('settings.chinese')}
              </button>
              <button
                className={`theme-btn ${settings.language === 'en' ? 'active' : ''}`}
                onClick={() => updateSettings({ language: 'en' })}
              >
                🇺🇸 {t('settings.english')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-section card">
        <div className="settings-section-header">
          <Database size={18} style={{ color: 'var(--accent-teal)' }} />
          <h2>{t('settings.data')}</h2>
        </div>
        <div className="settings-section-body">
          <div className="data-actions">
            <button className="btn btn-glass data-action-btn" onClick={handleExport}>
              <Download size={16} />
              <div>
                <div>{t('settings.exportData')}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>備份所有單字和設定</div>
              </div>
            </button>
            <button className="btn btn-glass data-action-btn" onClick={() => importRef.current?.click()}>
              <Upload size={16} />
              <div>
                <div>{t('settings.importData')}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>從 JSON 備份檔案還原</div>
              </div>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </button>
            <button className="btn btn-glass data-action-btn danger" onClick={handleClear}>
              <Trash2 size={16} />
              <div>
                <div>{t('settings.clearData')}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>此操作無法復原</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="about-section text-center text-muted">
        <div className="about-logo">🇩🇪</div>
        <div className="about-name text-gradient" style={{ fontSize: '1.5rem', fontWeight: 800 }}>DeutschMeister</div>
        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>v1.0.0 · 德文學習平台</div>
        <div style={{ fontSize: '0.75rem', marginTop: 8 }}>資料儲存在您的瀏覽器本地端 · 不上傳任何資料</div>
      </div>
    </div>
  );
}
