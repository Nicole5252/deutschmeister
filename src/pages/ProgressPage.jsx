import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { getStudyLog, getStreak, getCards, getDecks } from '../utils/storage';
import { getMasteredCards } from '../utils/srs';
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Flame, Target, BookOpen, Trophy, Calendar } from 'lucide-react';
import './ProgressPage.css';

function getWeeklyData(logs) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter(l => l.date === dateStr);
    days.push({
      day: ['日','一','二','三','四','五','六'][d.getDay()],
      date: dateStr,
      studied: dayLogs.reduce((s, l) => s + l.total, 0),
      correct: dayLogs.reduce((s, l) => s + l.correct, 0),
    });
  }
  return days;
}

function getMonthlyData(logs) {
  const result = {};
  logs.forEach(l => {
    const week = l.date.slice(0, 7);
    if (!result[week]) result[week] = { week, studied: 0, correct: 0 };
    result[week].studied += l.total;
    result[week].correct += l.correct;
  });
  return Object.values(result).slice(-12);
}

export default function ProgressPage() {
  const { t } = useApp();
  const [logs, setLogs] = useState([]);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [cards, setCards] = useState([]);
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    setLogs(getStudyLog());
    setStreak(getStreak());
    setCards(getCards());
    setDecks(getDecks());
  }, []);

  const weeklyData = getWeeklyData(logs);
  const monthlyData = getMonthlyData(logs);
  const total = logs.reduce((s, l) => s + l.total, 0);
  const correct = logs.reduce((s, l) => s + l.correct, 0);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mastered = getMasteredCards(cards).length;

  const deckStats = decks.map(d => {
    const dc = cards.filter(c => c.deckId === d.id);
    const dm = getMasteredCards(dc);
    return {
      name: d.name,
      total: dc.length,
      mastered: dm.length,
      pct: dc.length > 0 ? Math.round((dm.length / dc.length) * 100) : 0,
    };
  }).filter(d => d.total > 0);

  return (
    <div className="progress-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('progress.title')}</h1>
          <p className="text-secondary">你的學習成果一覽</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)' }}>
            <Flame size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{streak.current}</div>
            <div className="stat-label text-secondary">{t('progress.weeklyGoal')}<br/><small>連續天數</small></div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--accent-primary)' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{total}</div>
            <div className="stat-label text-secondary">{t('progress.totalStudied')}</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}>
            <Target size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label text-secondary">總體正確率</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)' }}>
            <Trophy size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{streak.best}</div>
            <div className="stat-label text-secondary">{t('progress.bestStreak')}</div>
          </div>
        </div>
      </div>

      <div className="progress-charts">
        {/* Weekly Chart */}
        <div className="chart-card card card-body">
          <h3 className="chart-title">本週每日複習量</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(18,18,31,0.95)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="studied" radius={[6, 6, 0, 0]} fill="url(#barGrad)">
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${230 + i * 8}, 70%, ${55 + i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mastery Pie */}
        <div className="chart-card card card-body">
          <h3 className="chart-title">單字掌握狀況</h3>
          {cards.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '已掌握', value: mastered, fill: '#34d399' },
                      { name: '學習中', value: Math.max(0, cards.filter(c => c.srs?.repetitions > 0).length - mastered), fill: '#818cf8' },
                      { name: '未學習', value: cards.filter(c => !c.srs?.repetitions).length, fill: 'rgba(255,255,255,0.1)' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(18,18,31,0.95)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {[
                  { label: '已掌握', color: '#34d399', value: mastered },
                  { label: '學習中', color: '#818cf8', value: cards.filter(c => c.srs?.repetitions > 0).length - mastered },
                  { label: '未學習', color: 'rgba(255,255,255,0.3)', value: cards.filter(c => !c.srs?.repetitions).length },
                ].map(item => (
                  <div key={item.label} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: item.color }} />
                    <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{item.label}</span>
                    <strong style={{ fontSize: '0.85rem' }}>{Math.max(0, item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-muted" style={{ padding: '2rem' }}>尚無資料</div>
          )}
        </div>
      </div>

      {/* Deck Performance */}
      {deckStats.length > 0 && (
        <div className="card card-body">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>{t('progress.performanceByDeck')}</h3>
          <div className="deck-perf-list">
            {deckStats.map(ds => (
              <div key={ds.name} className="deck-perf-item">
                <div className="deck-perf-name">{ds.name}</div>
                <div className="deck-perf-progress flex-1">
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${ds.pct}%` }} />
                  </div>
                </div>
                <div className="deck-perf-stats text-secondary">
                  {ds.mastered}/{ds.total} ({ds.pct}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Heatmap */}
      <div className="card card-body">
        <h3 className="chart-title" style={{ marginBottom: 16 }}>學習紀錄（過去30天）</h3>
        <div className="calendar-grid">
          {Array.from({ length: 30 }, (_, i) => {
            const d = new Date(Date.now() - (29 - i) * 86400000);
            const dateStr = d.toISOString().slice(0, 10);
            const count = logs.filter(l => l.date === dateStr).reduce((s, l) => s + l.total, 0);
            const intensity = count === 0 ? 0 : count < 5 ? 1 : count < 15 ? 2 : 3;
            return (
              <div
                key={i}
                className="calendar-cell"
                data-intensity={intensity}
                title={`${dateStr}: ${count} 張`}
              />
            );
          })}
        </div>
        <div className="calendar-legend">
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>少</span>
          {[0,1,2,3].map(i => <div key={i} className="calendar-cell" data-intensity={i} style={{ width: 12, height: 12 }} />)}
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>多</span>
        </div>
      </div>
    </div>
  );
}
