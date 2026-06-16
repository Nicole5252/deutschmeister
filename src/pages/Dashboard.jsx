import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { getDecks, getCards, getStudyLog, getStreak } from '../utils/storage';
import { getDueCards, getNewCards } from '../utils/srs';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { BookOpen, Flame, Target, TrendingUp, ChevronRight, Zap, Star } from 'lucide-react';
import './Dashboard.css';

function getWeeklyData(logs) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter(l => l.date === dateStr);
    days.push({
      day: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      studied: dayLogs.reduce((s, l) => s + l.total, 0),
      correct: dayLogs.reduce((s, l) => s + l.correct, 0),
    });
  }
  return days;
}

export default function Dashboard() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [studyLog, setStudyLog] = useState([]);
  const [streak, setStreak] = useState({ current: 0, best: 0 });

  useEffect(() => {
    setDecks(getDecks());
    setAllCards(getCards());
    setStudyLog(getStudyLog());
    setStreak(getStreak());
  }, []);

  const dueCards = getDueCards(allCards);
  const newCards = getNewCards(allCards);
  const totalDue = dueCards.length;

  const weeklyData = getWeeklyData(studyLog);
  const weekTotal = weeklyData.reduce((s, d) => s + d.studied, 0);
  const weekCorrect = weeklyData.reduce((s, d) => s + d.correct, 0);
  const accuracy = weekTotal > 0 ? Math.round((weekCorrect / weekTotal) * 100) : 0;

  const recentDecks = [...decks]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);

  return (
    <div className="dashboard animate-fade-in">
      {/* Hero Section */}
      <div className="dashboard-hero card">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-subtitle text-secondary">{t('dashboard.welcome')} 👋</p>
            <h1 className="hero-title">
              {totalDue > 0
                ? <><span className="text-gradient">{totalDue}</span> {t('dashboard.cards')}</>
                : t('dashboard.noCardsToday')
              }
              {totalDue > 0 && <div className="hero-desc text-secondary">{t('dashboard.todayReview')}</div>}
            </h1>
            {totalDue > 0 ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  const firstDueDeck = decks.find(d => getDueCards(getCards(d.id)).length > 0);
                  if (firstDueDeck) navigate(`/cards/study/${firstDueDeck.id}`);
                }}
              >
                <Zap size={18} />
                {t('dashboard.startStudy')}
              </button>
            ) : (
              <p className="text-secondary" style={{ fontSize: '1.1rem' }}>✨ {t('dashboard.keepGoing')}</p>
            )}
          </div>
          <div className="hero-illustration">
            <div className="de-flag">🇩🇪</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--warning)' }}>
            <Flame size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{streak.current}</div>
            <div className="stat-label text-secondary">{t('dashboard.streak')} <small>({t('dashboard.days')})</small></div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent-primary)' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{allCards.length}</div>
            <div className="stat-label text-secondary">{t('dashboard.totalWords')}</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--success)' }}>
            <Target size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label text-secondary">{t('dashboard.accuracy')}</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(96, 165, 250, 0.15)', color: 'var(--accent-blue)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{weekTotal}</div>
            <div className="stat-label text-secondary">{t('dashboard.weeklyActivity')}</div>
          </div>
        </div>
      </div>

      {/* Chart + Decks */}
      <div className="dashboard-main">
        {/* Weekly Activity Chart */}
        <div className="chart-section card card-body">
          <h2 className="section-title">{t('dashboard.weeklyActivity')}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="studiedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(18,18,31,0.95)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="studied"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#studiedGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Decks */}
        <div className="recent-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">{t('dashboard.recentDecks')}</h2>
            <button className="btn btn-glass btn-sm" onClick={() => navigate('/cards')}>
              {t('common.edit')} <ChevronRight size={14} />
            </button>
          </div>
          {recentDecks.length === 0 ? (
            <div className="empty-state card card-body text-center">
              <BookOpen size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p className="text-secondary">{t('common.empty')}</p>
              <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate('/cards')}>
                {t('flashcards.newDeck')}
              </button>
            </div>
          ) : (
            <div className="recent-decks-list">
              {recentDecks.map(deck => {
                const deckCards = getCards(deck.id);
                const due = getDueCards(deckCards).length;
                return (
                  <div
                    key={deck.id}
                    className="recent-deck-item card"
                    onClick={() => navigate(`/cards/study/${deck.id}`)}
                  >
                    <div className="deck-item-icon">
                      <BookOpen size={16} />
                    </div>
                    <div className="deck-item-info flex-1">
                      <div className="deck-item-name">{deck.name}</div>
                      <div className="deck-item-meta text-secondary">
                        {deckCards.length} {t('flashcards.cardCount')}
                        {due > 0 && <span className="badge badge-warning" style={{ marginLeft: 8 }}>{due} 待複習</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
