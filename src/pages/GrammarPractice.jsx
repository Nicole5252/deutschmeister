import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getGrammarTopics, getGrammarQuestions } from '../utils/storage';
import { ArrowLeft, Check, X, ChevronRight, Trophy, Home } from 'lucide-react';
import './GrammarPractice.css';

function MultipleChoice({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const isCorrect = selected === question.correctAnswer;

  return (
    <div className="question-block">
      <h3 className="question-text">{question.question}</h3>
      {question.hint && (
        <div className="hint-section animate-fade-in" style={{ alignSelf: 'flex-start', margin: '-4px 0 4px' }}>
          {showHint ? (
            <p className="question-hint text-secondary">💡 提示：{question.hint}</p>
          ) : (
            <button className="btn btn-glass btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setShowHint(true)}>
              💡 顯示提示
            </button>
          )}
        </div>
      )}
      <div className="options-list">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className={`option-btn ${selected === i ? 'selected' : ''} ${
              submitted && i === question.correctAnswer ? 'correct' : ''
            } ${submitted && selected === i && !isCorrect ? 'wrong' : ''}`}
            onClick={() => { if (!submitted) setSelected(i); }}
          >
            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
      {!submitted ? (
        <button
          className="btn btn-primary"
          disabled={selected === null}
          onClick={() => setSubmitted(true)}
        >
          確認答案
        </button>
      ) : (
        <div className="answer-result">
          {isCorrect
            ? <div className="result-correct">✅ {question.explanation ? '' : '正確！'}</div>
            : <div className="result-incorrect">❌ 正確答案：{question.options[question.correctAnswer]}</div>
          }
          {question.explanation && (
            <div className="explanation-box">
              <div className="explanation-label">📖 文法解說</div>
              <p className="text-secondary">{question.explanation}</p>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => onAnswer(isCorrect)}>
            繼續 <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function FillBlank({ question, onAnswer }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const isCorrect = answer.trim().toLowerCase() === (question.blank || question.correctAnswer || '').toLowerCase();

  return (
    <div className="question-block">
      <h3 className="question-text">{question.question}</h3>
      {question.hint && (
        <div className="hint-section animate-fade-in" style={{ alignSelf: 'flex-start', margin: '-4px 0 4px' }}>
          {showHint ? (
            <p className="question-hint text-secondary">💡 提示：{question.hint}</p>
          ) : (
            <button className="btn btn-glass btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setShowHint(true)}>
              💡 顯示提示
            </button>
          )}
        </div>
      )}
      <input
        className="input fill-blank-input"
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="輸入答案..."
        disabled={submitted}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && !submitted && answer.trim()) setSubmitted(true); }}
      />
      {!submitted ? (
        <button className="btn btn-primary" disabled={!answer.trim()} onClick={() => setSubmitted(true)}>
          確認答案
        </button>
      ) : (
        <div className="answer-result">
          {isCorrect
            ? <div className="result-correct">✅ 正確！</div>
            : <div className="result-incorrect">❌ 正確答案：<strong>{question.blank || question.correctAnswer}</strong></div>
          }
          {question.explanation && (
            <div className="explanation-box">
              <div className="explanation-label">📖 文法解說</div>
              <p className="text-secondary">{question.explanation}</p>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => onAnswer(isCorrect)}>
            繼續 <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function SentencePractice({ question, onAnswer }) {
  const [words, setWords] = useState(() => [...(question.words || [])].sort(() => Math.random() - 0.5));
  const [arranged, setArranged] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const userAnswer = arranged.join(' ');
  const isCorrect = userAnswer.toLowerCase() === (question.correctAnswer || '').toLowerCase();

  function moveToArranged(word, fromAvailable) {
    if (submitted) return;
    if (fromAvailable) {
      setWords(prev => { const a = [...prev]; a.splice(a.indexOf(word), 1); return a; });
      setArranged(prev => [...prev, word]);
    } else {
      setArranged(prev => { const a = [...prev]; a.splice(a.indexOf(word), 1); return a; });
      setWords(prev => [...prev, word]);
    }
  }

  return (
    <div className="question-block">
      <h3 className="question-text" style={{ marginBottom: 8 }}>排列以下單字，組成正確的德文句子：</h3>

      {/* Arranged area */}
      <div className="sentence-area">
        {arranged.length === 0
          ? <span className="text-muted" style={{ fontSize: '0.85rem' }}>點擊下方單字排列句子</span>
          : arranged.map((w, i) => (
            <button key={i} className="word-chip active" onClick={() => moveToArranged(w, false)}>{w}</button>
          ))
        }
      </div>

      {/* Available words */}
      <div className="words-pool">
        {words.map((w, i) => (
          <button key={i} className="word-chip" onClick={() => moveToArranged(w, true)}>{w}</button>
        ))}
      </div>

      {!submitted ? (
        <button className="btn btn-primary" disabled={arranged.length === 0} onClick={() => setSubmitted(true)}>
          確認答案
        </button>
      ) : (
        <div className="answer-result">
          {isCorrect
            ? <div className="result-correct">✅ 正確！</div>
            : (
              <div className="result-incorrect">
                ❌ 正確答案：<strong>{question.correctAnswer}</strong>
              </div>
            )
          }
          {question.explanation && (
            <div className="explanation-box">
              <div className="explanation-label">📖 文法解說</div>
              <p className="text-secondary">{question.explanation}</p>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => onAnswer(isCorrect)}>
            繼續 <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function GrammarPractice() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { t } = useApp();

  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const BUILT_IN_NAMES = {
    'builtin-nominativ': { name: 'Nominativ', nameZh: '第一格（主格）' },
    'builtin-akkusativ': { name: 'Akkusativ', nameZh: '第四格（受格）' },
    'builtin-dativ': { name: 'Dativ', nameZh: '第三格（與格）' },
    'builtin-genitiv': { name: 'Genitiv', nameZh: '第二格（屬格）' },
    'builtin-konjugation': { name: 'Verben Konjugation', nameZh: '動詞變位' },
    'builtin-plural': { name: 'Plural', nameZh: '名詞複數' },
  };

  useEffect(() => {
    if (topicId === 'mixed') {
      setTopic({ name: 'Mixed Grammar', nameZh: '混合文法練習' });
      const qs = JSON.parse(localStorage.getItem('dm_mixed_questions') || '[]');
      setQuestions(qs); // The questions are already generated and sorted
    } else {
      const topics = getGrammarTopics();
      const found = topics.find(t => t.id === topicId) || BUILT_IN_NAMES[topicId];
      setTopic(found);
      const qs = getGrammarQuestions(topicId);
      setQuestions(qs.sort(() => Math.random() - 0.5));
    }
  }, [topicId]);

  function handleAnswer(isCorrect) {
    const newScore = {
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(newScore);
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  }

  const q = questions[currentIdx];
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (finished || questions.length === 0) {
    return (
      <div className="study-complete animate-fade-in">
        <div className="complete-card card card-body text-center">
          <div className="complete-icon">
            {questions.length === 0 ? '❓' : pct >= 80 ? '🏆' : '📖'}
          </div>
          <h2>
            {questions.length === 0
              ? '此主題尚無練習題'
              : '練習完成！'
            }
          </h2>
          {finished && (
            <div className="complete-stats">
              <div className="complete-stat">
                <div className="stat-num">{score.total}</div>
                <div className="text-secondary">作答題數</div>
              </div>
              <div className="complete-stat">
                <div className="stat-num" style={{ color: 'var(--success)' }}>{score.correct}</div>
                <div className="text-secondary">答對</div>
              </div>
              <div className="complete-stat">
                <div className="stat-num" style={{ color: 'var(--accent-primary)' }}>{pct}%</div>
                <div className="text-secondary">正確率</div>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button className="btn btn-glass" onClick={() => navigate('/')}>
              <Home size={16} /> 回首頁
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/grammar')}>
              <ArrowLeft size={16} /> 回文法
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grammar-practice animate-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="study-header">
        <button className="btn btn-glass btn-icon" onClick={() => navigate('/grammar')}>
          <ArrowLeft size={18} />
        </button>
        <div className="study-progress-info">
          <div className="study-deck-name">
            {topic?.name} {topic?.nameZh && `(${topic.nameZh})`}
          </div>
          <div className="study-count text-secondary">{currentIdx + 1} / {questions.length}</div>
        </div>
        <div className="score-chip">
          <span style={{ color: 'var(--success)' }}>{score.correct}</span>
          <span className="text-muted">/</span>
          <span>{score.total}</span>
        </div>
      </div>

      <div className="progress study-progress-bar">
        <div className="progress-bar" style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {q?.type === 'multiple' && <MultipleChoice question={q} onAnswer={handleAnswer} />}
          {q?.type === 'fillBlank' && <FillBlank question={q} onAnswer={handleAnswer} />}
          {q?.type === 'sentence' && <SentencePractice question={q} onAnswer={handleAnswer} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
