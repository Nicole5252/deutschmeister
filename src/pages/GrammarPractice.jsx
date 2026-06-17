import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { 
  getGrammarTopics, getGrammarQuestions,
  getBookmarkedGrammarQuestions, saveBookmarkedGrammarQuestion, deleteBookmarkedGrammarQuestion
} from '../utils/storage';
import { ArrowLeft, Check, X, ChevronRight, Trophy, Home, Bookmark } from 'lucide-react';
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
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Check if we have multiple blanks
  const isMultiBlank = Array.isArray(question.blanks) && question.blanks.length > 0;
  const targetBlanks = isMultiBlank ? question.blanks : [question.blank || question.correctAnswer || ''];

  const [answers, setAnswers] = useState(() => Array(targetBlanks.length).fill(''));

  const isCorrect = answers.every((ans, i) =>
    ans.trim().toLowerCase() === targetBlanks[i].trim().toLowerCase()
  );

  const handleUpdateAnswer = (index, value) => {
    setAnswers(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // Split question text by underscores (at least 3 underscores)
  const questionText = question.question || '';
  const parts = questionText.split(/_{3,}/);

  return (
    <div className="question-block">
      {/* If it's multi-blank, render the inputs inline within the text! */}
      {isMultiBlank && parts.length - 1 === targetBlanks.length ? (
        <h3 className="question-text" style={{ lineHeight: '2.8rem', display: 'flow-root' }}>
          {parts.map((part, index) => (
            <span key={index} style={{ verticalAlign: 'middle' }}>
              {part}
              {index < targetBlanks.length && (
                <input
                  className="input fill-blank-inline-input"
                  style={{
                    display: 'inline-block',
                    width: `${Math.max(70, targetBlanks[index].length * 12 + 20)}px`,
                    margin: '0 8px',
                    textAlign: 'center',
                    padding: '4px 8px',
                    fontSize: '1.1rem',
                    verticalAlign: 'middle',
                  }}
                  value={answers[index]}
                  onChange={e => handleUpdateAnswer(index, e.target.value)}
                  placeholder="?"
                  disabled={submitted}
                  autoFocus={index === 0}
                />
              )}
            </span>
          ))}
        </h3>
      ) : (
        <>
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
            value={answers[0] || ''}
            onChange={e => handleUpdateAnswer(0, e.target.value)}
            placeholder="輸入答案..."
            disabled={submitted}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && !submitted && (answers[0] || '').trim()) setSubmitted(true); }}
          />
        </>
      )}

      {/* Render hint section for multi-blank if present */}
      {isMultiBlank && question.hint && (
        <div className="hint-section animate-fade-in" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
          {showHint ? (
            <p className="question-hint text-secondary">💡 提示：{question.hint}</p>
          ) : (
            <button className="btn btn-glass btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setShowHint(true)}>
              💡 顯示提示
            </button>
          )}
        </div>
      )}

      {!submitted ? (
        <button
          className="btn btn-primary"
          disabled={answers.some(ans => !ans.trim())}
          onClick={() => setSubmitted(true)}
        >
          確認答案
        </button>
      ) : (
        <div className="answer-result">
          {isCorrect
            ? <div className="result-correct">✅ 正確！</div>
            : (
              <div className="result-incorrect">
                ❌ 正確答案：<strong>{targetBlanks.join(' / ')}</strong>
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
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    setBookmarks(getBookmarkedGrammarQuestions());
  }, []);

  const currentQuestion = questions[currentIdx];
  const isBookmarked = currentQuestion ? bookmarks.some(b => b.id === currentQuestion.id) : false;

  function toggleBookmark() {
    if (!currentQuestion) return;
    if (isBookmarked) {
      deleteBookmarkedGrammarQuestion(currentQuestion.id);
      setBookmarks(prev => prev.filter(b => b.id !== currentQuestion.id));
    } else {
      const newBookmark = {
        ...currentQuestion,
        topicName: topic?.nameZh || topic?.name || '混合文法練習',
      };
      saveBookmarkedGrammarQuestion(newBookmark);
      setBookmarks(prev => [...prev, newBookmark]);
    }
  }

  const BUILT_IN_NAMES = {
    'builtin-wechselpraepositionen': { name: 'Wechselpräpositionen', nameZh: '雙介系詞' },
    'builtin-verben-praepositionen': { name: 'Verben und Präpositionen', nameZh: '動詞與介系詞的格' },
    'builtin-pronomen-artikel': { name: 'Pronomen und Artikel', nameZh: '冠詞與代名詞的變化' },
    'builtin-imperativ': { name: 'Imperativ', nameZh: '祈使句 / 命令句' },
    'builtin-perfekt': { name: 'Perfekt', nameZh: '現在完成式' },
    'builtin-trennbare-verben': { name: 'Trennbare Verben', nameZh: '可分動詞' },
    'builtin-modalverben': { name: 'Modalverben', nameZh: '情態助動詞' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className={`btn btn-icon ${isBookmarked ? 'bookmarked-active' : 'btn-glass'}`}
            style={{ 
              borderRadius: '50%', 
              width: 36, 
              height: 36,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isBookmarked ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              background: isBookmarked ? 'var(--accent-interactive-bg-strong)' : 'var(--glass-bg)',
              color: isBookmarked ? 'var(--accent-primary)' : 'inherit'
            }}
            onClick={toggleBookmark}
            title="收藏此題"
          >
            <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <div className="score-chip">
            <span style={{ color: 'var(--success)' }}>{score.correct}</span>
            <span className="text-muted">/</span>
            <span>{score.total}</span>
          </div>
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
