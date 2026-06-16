import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  LayoutDashboard, BookOpen, Brain, BarChart3, Settings,
  Sun, Moon, Globe, Menu, X, GraduationCap
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', exact: true },
  { path: '/cards', icon: BookOpen, labelKey: 'nav.flashcards' },
  { path: '/grammar', icon: Brain, labelKey: 'nav.grammar' },
  { path: '/progress', icon: BarChart3, labelKey: 'nav.progress' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function Layout() {
  const { t, toggleTheme, settings, updateSettings } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleLanguage = () => {
    updateSettings({ language: settings.language === 'zh' ? 'en' : 'zh' });
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar hide-mobile">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <GraduationCap size={22} />
          </div>
          <div className="logo-text">
            <span className="logo-title">Deutsch</span>
            <span className="logo-subtitle text-gradient">Meister</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive: navIsActive }) =>
                `sidebar-nav-item ${navIsActive ? 'active' : ''}`
              }
            >
              <item.icon size={18} />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-action-btn"
            onClick={toggleTheme}
            title={settings.theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
          >
            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{settings.theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}</span>
          </button>
          <button
            className="sidebar-action-btn"
            onClick={toggleLanguage}
            title={t('settings.language')}
          >
            <Globe size={16} />
            <span>{settings.language === 'zh' ? 'English' : '中文'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-tabbar hide-desktop">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive: navIsActive }) =>
              `mobile-tab ${navIsActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Mobile Header */}
      <div className="mobile-header hide-desktop">
        <div className="logo-text">
          <span className="logo-title" style={{ fontSize: '1rem' }}>Deutsch</span>
          <span className="logo-subtitle text-gradient" style={{ fontSize: '1rem' }}>Meister</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-glass btn-sm btn-icon" onClick={toggleTheme}>
            {settings.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button className="btn btn-glass btn-sm btn-icon" onClick={toggleLanguage}>
            <Globe size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
