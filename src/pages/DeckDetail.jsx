import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { getDecks, saveDeck, getCards, saveCard, saveCards, deleteCard } from '../utils/storage';
import { generateId, speak, formatNextReview, translateAndGenerate } from '../utils/helpers';
import {
  ArrowLeft, Plus, Trash2, Edit3, Volume2, X, Check, Image, Upload, Sparkles, Loader,
  ChevronLeft, ChevronRight, Shuffle, LayoutList, Eye, Star, Globe
} from 'lucide-react';
import { ImportModal } from './FlashcardsPage';
import './DeckDetail.css';

const POS_LABELS = {
  noun: '名詞', verb: '動詞', adjective: '形容詞',
  adverb: '副詞', preposition: '介詞', conjunction: '連詞', other: '其他',
};

const ARTICLE_COLORS = { der: '#818cf8', die: '#f472b6', das: '#34d399' };

function FlipCard({ card, isFlipped, onFlip, onSpeak, onToggleFavorite }) {
  const articleColors = { der: '#818cf8', die: '#f472b6', das: '#34d399' };

  if (!card) return null;

  return (
    <div className="flip-card-container" onClick={onFlip}>
      <motion.div
        className="flip-card-inner"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className="flip-card-face flip-card-front">
          <div className="card-face-content">
            <div className="card-lang-label">德文</div>
            {card.article && (
              <span className="card-article" style={{ color: articleColors[card.article] || 'var(--accent-primary)' }}>
                {card.article}
              </span>
            )}
            <div className="card-word">{card.german}</div>
            {card.partOfSpeech && (
              <div className="card-pos">
                <span className="badge badge-primary">{POS_LABELS[card.partOfSpeech] || card.partOfSpeech}</span>
              </div>
            )}
            <button
              className="card-speak-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSpeak(card.german);
              }}
            >
              <Volume2 size={18} />
            </button>
            <button
              className={`card-fav-btn ${card.isFavorite ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(card);
              }}
            >
              <Star size={18} fill={card.isFavorite ? 'var(--warning)' : 'none'} color={card.isFavorite ? 'var(--warning)' : 'var(--text-secondary)'} />
            </button>
            <div className="card-hint text-muted">點擊翻轉</div>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back" style={{ transform: 'rotateY(180deg)' }}>
          <div className="card-face-content">
            <div className="card-lang-label">中文</div>
            <div className="card-word" style={{ fontSize: '2.2rem' }}>{card.chinese}</div>
            {card.example && (
              <div className="card-example">
                <div className="example-label text-muted">例句</div>
                <div className="example-text text-secondary">{card.example}</div>
              </div>
            )}
            {card.notes && (
              <div className="card-notes text-muted" style={{ fontSize: '0.85rem' }}>{card.notes}</div>
            )}
            <button
              className={`card-fav-btn ${card.isFavorite ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(card);
              }}
            >
              <Star size={18} fill={card.isFavorite ? 'var(--warning)' : 'none'} color={card.isFavorite ? 'var(--warning)' : 'var(--text-secondary)'} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CardModal({ card, deckId, onClose, onSave, t, apiKeys }) {
  const [form, setForm] = useState({
    german: card?.german || '',
    chinese: card?.chinese || '',
    partOfSpeech: card?.partOfSpeech || 'other',
    article: card?.article || '',
    example: card?.example || '',
    notes: card?.notes || '',
    isFavorite: card?.isFavorite || false,
  });

  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [translateSource, setTranslateSource] = useState(''); // 'de' | 'zh'
  const [translationOptions, setTranslationOptions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleTranslate = async () => {
    const hasKey = apiKeys?.openaiKey || apiKeys?.geminiKey;
    if (!hasKey) {
      alert('請先在設定中輸入 OpenAI 或 Google Gemini API Key，才能使用 AI 翻譯功能。');
      return;
    }

    const { german, chinese } = form;
    let text = '';
    let inputLang = '';

    if (german.trim()) {
      text = german.trim();
      inputLang = 'de';
    } else if (chinese.trim()) {
      text = chinese.trim();
      inputLang = 'zh';
    } else {
      alert('請先在德文或中文欄位中輸入想要翻譯的單字！');
      return;
    }

    setLoadingTranslate(true);
    setTranslateSource(inputLang);
    setTranslationOptions([]);
    setSelectedIndices([]);
    try {
      const res = await translateAndGenerate(apiKeys, text, inputLang);
      setTranslationOptions(res.options || []);
      
      if (res.options && res.options.length > 0) {
        setSelectedIndices([0]);
        const opt = res.options[0];
        if (inputLang === 'de') {
          setForm(prev => ({
            ...prev,
            chinese: opt.chinese,
            partOfSpeech: opt.partOfSpeech || 'other',
            article: opt.article || '',
            example: res.example || prev.example,
          }));
        } else {
          setForm(prev => ({
            ...prev,
            german: opt.german,
            partOfSpeech: opt.partOfSpeech || 'other',
            article: opt.article || '',
            example: res.example || prev.example,
          }));
        }
      } else {
        setForm(prev => ({
          ...prev,
          example: res.example || prev.example,
        }));
      }
    } catch (err) {
      alert('翻譯與生成例句失敗：' + err.message);
    } finally {
      setLoadingTranslate(false);
    }
  };

  const handleToggleOption = (index) => {
    let newIndices = [...selectedIndices];
    if (newIndices.includes(index)) {
      newIndices = newIndices.filter(i => i !== index);
    } else {
      newIndices.push(index);
    }
    setSelectedIndices(newIndices);

    const selectedOpts = newIndices.map(i => translationOptions[i]);
    if (selectedOpts.length === 0) {
      if (translateSource === 'de') {
        update('chinese', '');
      } else {
        update('german', '');
      }
      return;
    }

    const firstOpt = selectedOpts[0];

    if (translateSource === 'de') {
      const chineseCombined = selectedOpts.map(o => o.chinese).join(', ');
      setForm(prev => ({
        ...prev,
        chinese: chineseCombined,
        partOfSpeech: firstOpt.partOfSpeech || 'other',
        article: firstOpt.article || '',
      }));
    } else {
      const germanCombined = selectedOpts.map(o => o.german).join(', ');
      setForm(prev => ({
        ...prev,
        german: germanCombined,
        partOfSpeech: firstOpt.partOfSpeech || 'other',
        article: firstOpt.article || '',
      }));
    }
  };

  const handleSave = () => {
    if (!form.german.trim() || !form.chinese.trim()) return;
    onSave({
      id: card?.id || generateId(),
      deckId,
      ...form,
      german: form.german.trim(),
      chinese: form.chinese.trim(),
      srs: card?.srs || null,
      imageUrl: card?.imageUrl || '',
      isFavorite: form.isFavorite,
      isDifficult: card?.isDifficult || false,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3>{card ? '編輯單字' : t('flashcards.addWord')}</h3>
          <button className="btn btn-glass btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="label">{t('flashcards.german')} *</label>
              <input className="input" value={form.german} onChange={e => update('german', e.target.value)} placeholder="z.B. Haus" autoFocus />
            </div>
            <div className="form-group flex-1">
              <label className="label">{t('flashcards.chinese')} *</label>
              <input className="input" value={form.chinese} onChange={e => update('chinese', e.target.value)} placeholder="中文翻譯" />
            </div>
          </div>

          <div className="translate-btn-container">
            <button
              className="btn btn-glass btn-sm translate-btn"
              disabled={loadingTranslate || (!form.german.trim() && !form.chinese.trim())}
              onClick={handleTranslate}
            >
              {loadingTranslate ? (
                <><Loader className="spin" size={12} /> {t('common.loading')}</>
              ) : (
                <><Sparkles size={12} /> AI 翻譯與生成例句</>
              )}
            </button>
          </div>

          {translationOptions.length > 0 && (
            <div className="synonyms-checklist-container animate-fade-in">
              <div className="synonyms-title">💡 請勾選欲匯入的翻譯/同義字（可多選）：</div>
              <div className="synonyms-list">
                {translationOptions.map((opt, i) => {
                  const isChecked = selectedIndices.includes(i);
                  const label = translateSource === 'de'
                    ? opt.chinese
                    : `${opt.article ? opt.article + ' ' : ''}${opt.german} (${POS_LABELS[opt.partOfSpeech] || opt.partOfSpeech})`;
                  return (
                    <div key={i} className="synonym-item" onClick={() => handleToggleOption(i)}>
                      <div className={`synonym-checkbox ${isChecked ? 'checked' : ''}`}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className="synonym-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="label">{t('flashcards.partOfSpeech')}</label>
              <select className="input select" value={form.partOfSpeech} onChange={e => update('partOfSpeech', e.target.value)}>
                {Object.entries(POS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.partOfSpeech === 'noun' && (
              <div className="form-group" style={{ width: 90 }}>
                <label className="label">冠詞</label>
                <select className="input select" value={form.article} onChange={e => update('article', e.target.value)}>
                  <option value="">-</option>
                  <option value="der">der</option>
                  <option value="die">die</option>
                  <option value="das">das</option>
                </select>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="label">{t('flashcards.example')} (AI 自動生成)</label>
            <textarea
              className="input textarea readonly"
              rows={2}
              value={form.example}
              readOnly
              placeholder="點擊上方 AI 翻譯按鈕將會自動在此生成 A1 例句，無須手動輸入..."
            />
          </div>
          <div className="form-group">
            <label className="label">{t('flashcards.notes')}</label>
            <textarea className="input textarea" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} />
          </div>

          <div className="form-group flex items-center gap-2 mt-4" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => update('isFavorite', !form.isFavorite)}>
            <div className={`synonym-checkbox ${form.isFavorite ? 'checked' : ''}`}>
              {form.isFavorite && <Check size={10} strokeWidth={3} />}
            </div>
            <span className="label" style={{ marginBottom: 0, cursor: 'pointer' }}>⭐ 收藏此單字</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-glass" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.german.trim() || !form.chinese.trim()}>
            <Check size={16} />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeckDetail() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { t, settings, showToast, user } = useApp();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'overview'
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'favorite' | 'difficult'
  const [overviewIdx, setOverviewIdx] = useState(0);
  const [overviewFlipped, setOverviewFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [sharing, setSharing] = useState(false);

  async function handleShareDeck() {
    if (!user) {
      showToast('⚠️ 請先登入帳號，才能分享單字本至公共庫！', 'error');
      return;
    }

    if (cards.length === 0) {
      showToast('⚠️ 單字本中沒有單字，無法分享！', 'error');
      return;
    }

    const isAlreadyPublic = deck?.isPublic;
    const confirmMsg = isAlreadyPublic
      ? '確定要取消分享此單字本嗎？取消後其他人將無法在公共單字庫中搜尋到它。'
      : '確定要將此單字本分享至「公共單字庫」嗎？公開後其他帳號皆可瀏覽並匯入此單字本。';

    if (!window.confirm(confirmMsg)) return;

    setSharing(true);
    try {
      const nextPublicState = !isAlreadyPublic;
      
      // Update local deck
      const updatedDeck = { ...deck, isPublic: nextPublicState };
      saveDeck(updatedDeck);
      setDeck(updatedDeck);

      // Update all cards in this deck to match the public status
      const updatedCards = cards.map(c => ({ ...c, isPublic: nextPublicState }));
      saveCards(updatedCards);
      setCards(updatedCards);

      showToast(nextPublicState ? '🌐 已分享至公共庫！' : '🔒 已取消分享！', 'success');
    } catch (err) {
      console.error(err);
      showToast('操作失敗：' + err.message, 'error');
    } finally {
      setSharing(false);
    }
  }

  useEffect(() => {
    const decks = getDecks();
    setDeck(decks.find(d => d.id === deckId));
    setCards(getCards(deckId));
  }, [deckId]);

  function handleSave(card) {
    saveCard(card);
    setCards(getCards(deckId));
    showToast('✅ 已儲存', 'success');
  }

  function handleImport(newCards) {
    saveCards(newCards);
    setCards(getCards(deckId));
    showToast(`✅ 已匯入 ${newCards.length} 張卡片`, 'success');
  }

  function handleDelete(cardId) {
    if (!window.confirm('確定要刪除此單字？')) return;
    deleteCard(cardId);
    setCards(getCards(deckId));
    showToast('已刪除單字', 'info');
  }

  function toggleFavorite(card) {
    const updated = { ...card, isFavorite: !card.isFavorite };
    saveCard(updated);
    setCards(getCards(deckId));
  }

  const filtered = cards.filter(c => {
    const matchesSearch = c.german.toLowerCase().includes(search.toLowerCase()) ||
                          c.chinese.includes(search);
    if (!matchesSearch) return false;

    if (filterTab === 'favorite') return !!c.isFavorite;
    if (filterTab === 'difficult') return !!c.isDifficult;
    return true;
  });

  const activeCards = isShuffled ? shuffledCards : filtered;

  // Generate shuffled list when isShuffled is turned on or when filtered cards change
  useEffect(() => {
    if (isShuffled) {
      setShuffledCards([...filtered].sort(() => Math.random() - 0.5));
    } else {
      setShuffledCards([]);
    }
    setOverviewIdx(0);
    setOverviewFlipped(false);
  }, [isShuffled, search, cards, filterTab]);

  // Keyboard navigation for card overview mode
  useEffect(() => {
    if (viewMode !== 'overview' || activeCards.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        if (overviewIdx > 0) {
          setOverviewIdx(prev => prev - 1);
          setOverviewFlipped(false);
        }
      } else if (e.key === 'ArrowRight') {
        if (overviewIdx < activeCards.length - 1) {
          setOverviewIdx(prev => prev + 1);
          setOverviewFlipped(false);
        }
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setOverviewFlipped(prev => !prev);
      } else if (e.key.toLowerCase() === 'v') {
        const currentCard = activeCards[overviewIdx];
        if (currentCard) speak(currentCard.german);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, overviewIdx, activeCards]);

  return (
    <div className="deck-detail animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <button className="btn btn-glass btn-icon" onClick={() => navigate('/cards')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{deck?.name || '...'}</h1>
            <p className="text-secondary">{cards.length} 張卡片</p>
          </div>
        </div>
        <div className="flex gap-3">
          {user && (
            <button
              className={`btn ${deck?.isPublic ? 'btn-primary' : 'btn-glass'}`}
              onClick={handleShareDeck}
              disabled={sharing}
              title={deck?.isPublic ? '取消分享' : '分享至公共庫'}
              style={{
                background: deck?.isPublic ? 'rgba(99, 102, 241, 0.15)' : undefined,
                borderColor: deck?.isPublic ? 'var(--accent-primary)' : undefined,
                color: deck?.isPublic ? 'var(--accent-primary)' : undefined,
              }}
            >
              <Globe size={16} />
              {deck?.isPublic ? '已公開分享' : '分享至公共庫'}
            </button>
          )}
          <button
            className="btn btn-glass"
            onClick={() => setShowImport(true)}
          >
            <Upload size={16} />
            {t('flashcards.importCards')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingCard(null); setShowModal(true); }}
          >
            <Plus size={16} />
            {t('flashcards.addWord')}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="deck-detail-tabs flex gap-2 mb-6">
        <button
          className={`tab-btn ${filterTab === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTab('all')}
        >
          全部單字 ({cards.length})
        </button>
        <button
          className={`tab-btn ${filterTab === 'favorite' ? 'active' : ''}`}
          onClick={() => setFilterTab('favorite')}
        >
          ⭐ 我的收藏 ({cards.filter(c => c.isFavorite).length})
        </button>
        <button
          className={`tab-btn ${filterTab === 'difficult' ? 'active' : ''}`}
          onClick={() => setFilterTab('difficult')}
        >
          ⚠️ 困難單字 ({cards.filter(c => c.isDifficult).length})
        </button>
      </div>

      {/* Controls: Search and View Mode Switcher */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6" style={{ width: '100%' }}>
        <div className="search-bar" style={{ flex: '1 1 auto' }}>
          <input
            className="input"
            placeholder={t('common.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setViewMode('list')}
            title="列表檢視"
          >
            <LayoutList size={14} style={{ marginRight: '4px' }} />
            列表檢視
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'overview' ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setViewMode('overview')}
            disabled={filtered.length === 0}
            title="卡片瀏覽"
          >
            <Eye size={14} style={{ marginRight: '4px' }} />
            卡片瀏覽
          </button>
        </div>
      </div>

      {/* Cards List / Overview Mode */}
      {filtered.length === 0 ? (
        <div className="card card-body text-center" style={{ padding: '3rem' }}>
          <p className="text-secondary">
            {cards.length === 0 
              ? t('flashcards.emptyDeck') 
              : filterTab !== 'all' 
                ? '此篩選分類中沒有符合的單字' 
                : '沒有符合的搜尋結果'}
          </p>
          {cards.length === 0 && (
            <button className="btn btn-primary btn-sm mt-4" onClick={() => setShowModal(true)}>
              <Plus size={14} />
              {t('flashcards.addFirst')}
            </button>
          )}
        </div>
      ) : viewMode === 'overview' ? (
        <div className="card-overview-container animate-fade-in">
          {/* Header controls for overview mode */}
          <div className="overview-navigation-header">
            <span className="overview-progress-text text-secondary">
              卡片 {overviewIdx + 1} / {activeCards.length} {isShuffled && '(隨機排序)'}
            </span>
            <button
              className={`btn btn-sm btn-icon ${isShuffled ? 'btn-primary' : 'btn-glass'}`}
              onClick={() => setIsShuffled(prev => !prev)}
              title={isShuffled ? '恢復正常順序' : '隨機打亂順序'}
              style={{ padding: '6px' }}
            >
              <Shuffle size={14} />
            </button>
          </div>

          {/* Card Presentation */}
          <div className="overview-card-wrapper">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCards[overviewIdx]?.id || overviewIdx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{ width: '100%' }}
              >
                <FlipCard
                  card={activeCards[overviewIdx]}
                  isFlipped={overviewFlipped}
                  onFlip={() => setOverviewFlipped(prev => !prev)}
                  onSpeak={speak}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Overview controls */}
          <div className="overview-controls flex items-center justify-center gap-4 mt-6">
            <button
              className="btn btn-glass btn-icon btn-sm"
              onClick={() => {
                if (overviewIdx > 0) {
                  setOverviewIdx(prev => prev - 1);
                  setOverviewFlipped(false);
                }
              }}
              disabled={overviewIdx === 0}
              title="上一張 (←)"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              className="btn btn-glass btn-sm"
              onClick={() => setOverviewFlipped(prev => !prev)}
            >
              翻轉卡片 (Space)
            </button>

            <button
              className="btn btn-glass btn-icon btn-sm"
              onClick={() => speak(activeCards[overviewIdx]?.german)}
              title="播放發音 (V)"
            >
              <Volume2 size={20} />
            </button>

            <button
              className="btn btn-glass btn-icon btn-sm"
              onClick={() => {
                if (overviewIdx < activeCards.length - 1) {
                  setOverviewIdx(prev => prev + 1);
                  setOverviewFlipped(false);
                }
              }}
              disabled={overviewIdx === activeCards.length - 1}
              title="下一張 (→)"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="keyboard-shortcuts-hint text-muted text-center mt-4" style={{ fontSize: '0.75rem' }}>
            鍵盤快捷鍵：← 上一張 · → 下一張 · 空白鍵 翻轉 · V 發音
          </div>
        </div>
      ) : (
        <div className="cards-table card">
          <table>
            <thead>
              <tr>
                <th>德文</th>
                <th>中文</th>
                <th>詞性</th>
                <th>下次複習</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(card => (
                <tr key={card.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className={`table-fav-btn ${card.isFavorite ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(card);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title={card.isFavorite ? '取消收藏' : '加入收藏'}
                      >
                        <Star size={16} fill={card.isFavorite ? 'var(--warning)' : 'none'} color={card.isFavorite ? 'var(--warning)' : 'var(--text-secondary)'} />
                      </button>
                      {card.article && (
                        <span className="article-tag" style={{ color: ARTICLE_COLORS[card.article] || 'var(--accent-primary)' }}>
                          {card.article}
                        </span>
                      )}
                      <strong>{card.german}</strong>
                    </div>
                  </td>
                  <td className="text-secondary">{card.chinese}</td>
                  <td>
                    {card.partOfSpeech && (
                      <span className="badge badge-primary">{POS_LABELS[card.partOfSpeech] || card.partOfSpeech}</span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {formatNextReview(card.srs?.nextReview)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-glass btn-icon btn-sm" onClick={() => speak(card.german)}>
                        <Volume2 size={14} />
                      </button>
                      <button className="btn btn-glass btn-icon btn-sm" onClick={() => { setEditingCard(card); setShowModal(true); }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-glass btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(card.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CardModal
          card={editingCard}
          deckId={deckId}
          onClose={() => { setShowModal(false); setEditingCard(null); }}
          onSave={handleSave}
          t={t}
          apiKeys={settings}
        />
      )}

      {showImport && (
        <ImportModal
          decks={deck ? [deck] : []}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          t={t}
          apiKeys={settings}
        />
      )}
    </div>
  );
}
