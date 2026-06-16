import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getDecks, getCards, saveCard, logStudySession } from '../utils/storage';
import { calculateNextReview, getDueCards, getNewCards } from '../utils/srs';
import { speak } from '../utils/helpers';
import {
  ArrowLeft, Volume2, RotateCcw, ChevronLeft, ChevronRight,
  Trophy, Home, BookOpen, X
} from 'lucide-react';
import './StudyMode.css';

const GRADE_CONFIG = [
  { grade: 0, label: '再試', labelEn: 'Again', color: 'var(--danger)', bg: 'rgba(248,113,113,0.15)' },
  { grade: 1, label: '困難', labelEn: 'Hard', color: 'var(--warning)', bg: 'rgba(251,191,36,0.15)' },
  { grade: 2, label: '良好', labelEn: 'Good', color: 'var(--accent-blue)', bg: 'rgba(96,165,250,0.15)' },
  { grade: 3, label: '輕鬆', labelEn: 'Easy', color: 'var(--success)', bg: 'rgba(52,211,153,0.15)' },
];

function FlipCard({ card, isFlipped, onFlip, onSpeak, settings }) {
  const articleColors = { der: '#818cf8', die: '#f472b6', das: '#34d399' };

  return (
    <div className="flip-card-container" onClick={onFlip}>
      <motion.div
        className="flip-card-inner"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className="flip-card-face flip-card-front">
          <div className="card-face-content">
            <div className="card-lang-label">Deutsch</div>
            {card.article && (
              <div className="card-article" style={{ color: articleColors[card.article] || 'var(--accent-primary)' }}>
                {card.article}
              </div>
            )}
            <div className="card-word">{card.german}</div>
            {card.partOfSpeech && (
              <div className="card-pos badge badge-primary">{card.partOfSpeech}</div>
            )}
            <button
              className="card-speak-btn"
              onClick={e => { e.stopPropagation(); onSpeak(card.german); }}
            >
              <Volume2 size={18} />
            </button>
            <div className="card-hint text-muted">點擊翻轉</div>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back" style={{ transform: 'rotateY(180deg)' }}>
          <div className="card-face-content">
            <div className="card-lang-label">中文</div>
            <div className="card-word" style={{ fontSize: '2.5rem' }}>{card.chinese}</div>
            {card.example && (
              <div className="card-example">
                <div className="example-label text-muted">例句</div>
                <div className="example-text text-secondary">{card.example}</div>
              </div>
            )}
            {card.notes && (
              <div className="card-notes text-muted" style={{ fontSize: '0.85rem' }}>{card.notes}</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FillBlankMode({ card, onGrade, onSpeak }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = answer.trim().toLowerCase() === card.german.trim().toLowerCase();

  return (
    <div className="fill-blank-mode">
      <div className="card card-body text-center" style={{ marginBottom: 24 }}>
        <div className="card-lang-label">中文</div>
        <div className="card-word" style={{ fontSize: '2.5rem', marginBottom: 16 }}>{card.chinese}</div>
        {card.example && (
          <div className="card-example">
            <div className="example-text text-secondary">{card.example?.replace(card.german, '_____')}</div>
          </div>
        )}
      </div>

      <div className="fill-blank-input-area">
        <input
          className="input"
          style={{ fontSize: '1.2rem', textAlign: 'center' }}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="輸入德文..."
          disabled={submitted}
          onKeyDown={e => { if (e.key === 'Enter' && !submitted) setSubmitted(true); }}
          autoFocus
        />

        {!submitted ? (
          <button className="btn btn-primary" onClick={() => setSubmitted(true)} disabled={!answer.trim()}>
            確認
          </button>
        ) : (
          <div className="fill-blank-result">
            {isCorrect ? (
              <div className="result-correct">✅ 正確！</div>
            ) : (
              <div className="result-incorrect">
                ❌ 正確答案：<strong>{card.german}</strong>
                {card.article && <span className="article-tag" style={{ marginLeft: 8 }}>({card.article})</span>}
              </div>
            )}
            <div className="grade-buttons">
              {GRADE_CONFIG.map(g => (
                <button
                  key={g.grade}
                  className="grade-btn"
                  style={{ '--gc': g.color, '--gbg': g.bg }}
                  onClick={() => {
                    setAnswer('');
                    setSubmitted(false);
                    onGrade(g.grade);
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudyMode() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { t, settings } = useApp();

  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('flip'); // flip | fill
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [reviewedCards, setReviewedCards] = useState(new Set());

  useEffect(() => {
    const decks = getDecks();
    setDeck(decks.find(d => d.id === deckId));
    const cards = getCards(deckId);
    const due = getDueCards(cards);
    const newC = getNewCards(cards);
    // Combine: due cards + new cards (max 20 new per session)
    const sessionCards = [...due, ...newC.slice(0, 20)];
    // Shuffle
    const shuffled = sessionCards.sort(() => Math.random() - 0.5);
    setQueue(shuffled);
  }, [deckId]);

  const currentCard = queue[currentIdx];

  const handleGrade = useCallback((grade) => {
    if (!currentCard) return;
    const newSrs = calculateNextReview(currentCard, grade);
    const isDifficult = grade < 2;
    saveCard({ ...currentCard, srs: newSrs, isDifficult });

    const isCorrect = grade >= 2;
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    setReviewedCards(prev => new Set([...prev, currentCard.id]));
    setIsFlipped(false);

    // Move to next
    setTimeout(() => {
      if (currentIdx + 1 >= queue.length) {
        // Session done
        logStudySession(deckId, sessionStats.correct + (isCorrect ? 1 : 0), sessionStats.total + 1);
        setFinished(true);
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    }, 200);
  }, [currentCard, currentIdx, queue, sessionStats, deckId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' && mode === 'flip') {
        setIsFlipped(prev => !prev);
      }
      if (isFlipped && mode === 'flip') {
        if (e.key === '1') handleGrade(0);
        if (e.key === '2') handleGrade(1);
        if (e.key === '3') handleGrade(2);
        if (e.key === '4') handleGrade(3);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, mode, handleGrade]);

  if (finished || queue.length === 0) {
    const accuracyPct = sessionStats.total > 0
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0;

    return (
      <div className="study-complete animate-fade-in">
        <div className="complete-card card card-body text-center">
          <div className="complete-icon">
            {queue.length === 0 ? '✨' : accuracyPct >= 80 ? '🏆' : '📚'}
          </div>
          <h2>{queue.length === 0 ? '今日沒有待複習的卡片！' : '練習完成！'}</h2>
          {sessionStats.total > 0 && (
            <>
              <div className="complete-stats">
                <div className="complete-stat">
                  <div className="stat-num">{sessionStats.total}</div>
                  <div className="text-secondary">複習張數</div>
                </div>
                <div className="complete-stat">
                  <div className="stat-num" style={{ color: 'var(--success)' }}>{sessionStats.correct}</div>
                  <div className="text-secondary">正確</div>
                </div>
                <div className="complete-stat">
                  <div className="stat-num" style={{ color: 'var(--accent-primary)' }}>{accuracyPct}%</div>
                  <div className="text-secondary">正確率</div>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button className="btn btn-glass" onClick={() => navigate('/')}>
              <Home size={16} />
              回首頁
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/cards/deck/${deckId}`)}>
              <BookOpen size={16} />
              管理單字
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="study-mode animate-fade-in">
      {/* Header */}
      <div className="study-header">
        <button className="btn btn-glass btn-icon" onClick={() => navigate(`/cards/deck/${deckId}`)}>
          <ArrowLeft size={18} />
        </button>
        <div className="study-progress-info">
          <div className="study-deck-name">{deck?.name}</div>
          <div className="study-count text-secondary">
            {currentIdx + 1} / {queue.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${mode === 'flip' ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setMode('flip')}
          >
            翻轉卡
          </button>
          <button
            className={`btn btn-sm ${mode === 'fill' ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setMode('fill')}
          >
            填空
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress study-progress-bar">
        <div className="progress-bar" style={{ width: `${(currentIdx / queue.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="study-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%' }}
          >
            {mode === 'flip' ? (
              <>
                <FlipCard
                  card={currentCard}
                  isFlipped={isFlipped}
                  onFlip={() => setIsFlipped(p => !p)}
                  onSpeak={speak}
                  settings={settings}
                />
                {/* Grade buttons (show after flip) */}
                <AnimatePresence>
                  {isFlipped && (
                    <motion.div
                      className="grade-area"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <p className="grade-hint text-muted">你記得嗎？</p>
                      <div className="grade-buttons">
                        {GRADE_CONFIG.map(g => (
                          <button
                            key={g.grade}
                            className="grade-btn"
                            style={{ '--gc': g.color, '--gbg': g.bg }}
                            onClick={() => handleGrade(g.grade)}
                          >
                            <span className="grade-label">{g.label}</span>
                            <span className="grade-key text-muted">[{g.grade + 1}]</span>
                          </button>
                        ))}
                      </div>
                      <p className="keyboard-hint text-muted">鍵盤快捷鍵：空白鍵翻轉 · 1-4 評分</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <FillBlankMode
                card={currentCard}
                onGrade={handleGrade}
                onSpeak={speak}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
