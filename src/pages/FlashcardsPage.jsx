import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  getDecks, saveDeck, deleteDeck, getCards, saveCards
} from '../utils/storage';
import {
  extractWordsFromImage, generateId, pdfPageToImageBase64
} from '../utils/helpers';
import { getDueCards, getNewCards } from '../utils/srs';
import {
  Plus, Upload, BookOpen, Trash2, ChevronRight,
  X, FileImage, FileText, Loader, CheckCircle, AlertCircle, ChevronLeft
} from 'lucide-react';
import './FlashcardsPage.css';

function CreateDeckModal({ onClose, onCreate, t }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in">
        <div className="modal-header">
          <h3>{t('flashcards.newDeck')}</h3>
          <button className="btn btn-glass btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="label">{t('flashcards.deckName')} *</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. A1 Vokabular"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="label">{t('flashcards.description')}</label>
            <textarea
              className="input textarea"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-glass" onClick={onClose}>{t('common.cancel')}</button>
          <button
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => {
              onCreate({ id: generateId(), name: name.trim(), description: desc.trim() });
              onClose();
            }}
          >
            {t('flashcards.createDeck')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportModal({ decks, onClose, onImport, t, apiKeys }) {
  const [step, setStep] = useState('upload'); // upload | processing | result
  const [extractedWords, setExtractedWords] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || '');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null); // { file, totalPages, currentPage }
  const [processingMsg, setProcessingMsg] = useState('');

  async function processFile(file) {
    const hasKey = apiKeys?.openaiKey || apiKeys?.geminiKey;
    if (!hasKey) {
      setError('需要 OpenAI 或 Google Gemini API Key，請先在設定中填入');
      return;
    }
    setError('');

    const isPdf = file.type === 'application/pdf';

    if (isPdf) {
      // First: convert PDF page 1 to image to get total page count
      setStep('processing');
      setProcessingMsg('載入 PDF 中...');
      try {
        const { totalPages } = await pdfPageToImageBase64(file, 1);
        if (totalPages > 1) {
          // Let user pick which page to analyze
          setPdfInfo({ file, totalPages, currentPage: 1 });
          setStep('pdfSelect');
        } else {
          await processPdfPage(file, 1);
        }
      } catch (err) {
        setError('PDF 讀取失敗：' + err.message);
        setStep('upload');
      }
    } else {
      // Image: read as base64 directly
      setStep('processing');
      setProcessingMsg('AI 辨識中...');
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result.split(',')[1];
            const result = await extractWordsFromImage(apiKeys, base64, file.type);
            setExtractedWords(result.words.map(w => ({ ...w, selected: true, id: generateId() })));
            setStep('result');
          } catch (err) {
            setError(err.message);
            setStep('upload');
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError(err.message);
        setStep('upload');
      }
    }
  }

  async function processPdfPage(file, pageNum) {
    setStep('processing');
    setProcessingMsg(`轉換第 ${pageNum} 頁並辨識中...`);
    try {
      const { base64, mimeType } = await pdfPageToImageBase64(file, pageNum);
      const result = await extractWordsFromImage(apiKeys, base64, mimeType);
      setExtractedWords(result.words.map(w => ({ ...w, selected: true, id: generateId() })));
      setStep('result');
    } catch (err) {
      setError(err.message);
      setStep('upload');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  }

  function toggleWord(id) {
    setExtractedWords(prev =>
      prev.map(w => w.id === id ? { ...w, selected: !w.selected } : w)
    );
  }

  function confirmImport() {
    const selected = extractedWords.filter(w => w.selected);
    const cards = selected.map(w => ({
      id: generateId(),
      deckId: selectedDeckId,
      german: w.german,
      chinese: w.chinese,
      partOfSpeech: w.partOfSpeech || 'other',
      article: w.article || '',
      example: w.example || '',
      notes: '',
      imageUrl: '',
      srs: null,
    }));
    onImport(cards);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3>{t('flashcards.importTitle')}</h3>
          <button className="btn btn-glass btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {step === 'upload' && (
            <>
              <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>{t('flashcards.importDesc')}</p>
              {!(apiKeys?.openaiKey || apiKeys?.geminiKey) && (
                <div className="alert-warning mb-4">
                  <AlertCircle size={16} />
                  需要 OpenAI 或 Google Gemini API Key，請先在設定中填入
                </div>
              )}
              {error && <div className="alert-error mb-4"><AlertCircle size={16} />{error}</div>}
              <div
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <FileImage size={40} style={{ color: 'var(--accent-primary)', marginBottom: 12 }} />
                <p className="text-primary" style={{ fontWeight: 600 }}>拖放圖片或 PDF 到此處</p>
                <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: 4 }}>支援 JPG, PNG, PDF 格式</p>
                <label className="btn btn-primary btn-sm" style={{ marginTop: 16, cursor: 'pointer' }}>
                  <Upload size={14} />
                  選擇檔案
                  <input type="file" accept="image/*,.pdf" onChange={handleFileInput} style={{ display: 'none' }} />
                </label>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center" style={{ padding: '40px 0' }}>
              <div className="spinner mx-auto mb-4" />
              <p className="text-secondary">{processingMsg || t('flashcards.processing')}</p>
            </div>
          )}

          {step === 'pdfSelect' && pdfInfo && (
            <div className="pdf-page-selector">
              <div className="pdf-select-header">
                <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <p style={{ fontWeight: 600 }}>PDF 共 {pdfInfo.totalPages} 頁</p>
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>請選擇要辨識的頁面</p>
                </div>
              </div>
              <div className="pdf-pages-grid">
                {Array.from({ length: pdfInfo.totalPages }, (_, i) => i + 1).map(pg => (
                  <button
                    key={pg}
                    className={`pdf-page-btn ${pdfInfo.currentPage === pg ? 'active' : ''}`}
                    onClick={() => setPdfInfo(p => ({ ...p, currentPage: pg }))}
                  >
                    第 {pg} 頁
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'result' && (
            <>
              <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>
                {t('flashcards.importResult')}：找到 <strong style={{ color: 'var(--accent-primary)' }}>{extractedWords.length}</strong> 個單字
              </p>
              <div className="extracted-words-list">
                {extractedWords.map(w => (
                  <div
                    key={w.id}
                    className={`extracted-word ${w.selected ? 'selected' : ''}`}
                    onClick={() => toggleWord(w.id)}
                  >
                    <div className="word-check">
                      {w.selected ? <CheckCircle size={16} style={{ color: 'var(--success)' }} /> : <div className="check-empty" />}
                    </div>
                    <div className="word-info">
                      <span className="word-german">
                        {w.article && <span className="article-badge">{w.article}</span>}
                        {w.german}
                      </span>
                      <span className="word-sep">→</span>
                      <span className="word-chinese">{w.chinese}</span>
                    </div>
                    {w.partOfSpeech && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{w.partOfSpeech}</span>}
                  </div>
                ))}
              </div>
              <div className="form-group mt-4">
                <label className="label">匯入到單字本</label>
                <select
                  className="input select"
                  value={selectedDeckId}
                  onChange={e => setSelectedDeckId(e.target.value)}
                >
                  {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          {step === 'result' ? (
            <>
              <button className="btn btn-glass" onClick={() => setStep('upload')}>重新上傳</button>
              <button className="btn btn-primary" onClick={confirmImport}>
                <CheckCircle size={16} />
                {t('flashcards.confirmImport')} ({extractedWords.filter(w => w.selected).length})
              </button>
            </>
          ) : step === 'pdfSelect' ? (
            <>
              <button className="btn btn-glass" onClick={() => setStep('upload')}>重新選檔</button>
              <button
                className="btn btn-primary"
                onClick={() => processPdfPage(pdfInfo.file, pdfInfo.currentPage)}
              >
                <FileText size={16} />
                辨識第 {pdfInfo?.currentPage} 頁
              </button>
            </>
          ) : (
            <button className="btn btn-glass" onClick={onClose}>{t('common.cancel')}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const { t, settings, showToast } = useApp();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  function handleCreateDeck(deck) {
    saveDeck(deck);
    setDecks(getDecks());
    showToast(`✅ 已建立「${deck.name}」`, 'success');
  }

  function handleDeleteDeck(deckId) {
    if (!window.confirm('確定要刪除此單字本及其所有卡片？')) return;
    deleteDeck(deckId);
    setDecks(getDecks());
    showToast('已刪除單字本', 'info');
  }

  function handleImport(cards) {
    saveCards(cards);
    showToast(`✅ 已匯入 ${cards.length} 張卡片`, 'success');
    setDecks(getDecks());
  }

  return (
    <div className="flashcards-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('flashcards.title')}</h1>
          <p className="text-secondary">{decks.length} 個單字本 · {getCards().length} 張卡片</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-glass" onClick={() => {
            if (decks.length === 0) {
              showToast('請先建立單字本', 'info');
              return;
            }
            setShowImport(true);
          }}>
            <Upload size={16} />
            {t('flashcards.importCards')}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateDeck(true)}>
            <Plus size={16} />
            {t('flashcards.newDeck')}
          </button>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="empty-hero card">
          <div className="empty-hero-content">
            <div className="empty-hero-icon">📚</div>
            <h2>從這裡開始學習德文</h2>
            <p className="text-secondary">建立你的第一個單字本，然後匯入或手動新增單字。</p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreateDeck(true)}>
              <Plus size={18} />
              建立第一個單字本
            </button>
          </div>
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map(deck => {
            const deckCards = getCards(deck.id);
            const dueCount = getDueCards(deckCards).length;
            const newCount = getNewCards(deckCards).length;
            const progress = deckCards.length > 0
              ? Math.round((deckCards.reduce((acc, c) => acc + (c.srs?.repetitions ? Math.min(c.srs.repetitions, 3) / 3 : 0), 0) / deckCards.length) * 100)
              : 0;

            return (
              <div key={deck.id} className="deck-card card">
                <div className="deck-card-header">
                  <div className="deck-icon">
                    <BookOpen size={20} />
                  </div>
                  <button
                    className="btn btn-glass btn-icon btn-sm"
                    onClick={e => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="deck-card-body">
                  <h3 className="deck-name">{deck.name}</h3>
                  {deck.description && <p className="deck-desc text-secondary">{deck.description}</p>}
                  <div className="deck-stats">
                    <span className="text-secondary">{deckCards.length} {t('flashcards.cardCount')}</span>
                    {dueCount > 0 && <span className="badge badge-warning">{dueCount} 待複習</span>}
                    {newCount > 0 && <span className="badge badge-primary">{newCount} 新</span>}
                  </div>
                  <div className="progress mt-4">
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="deck-progress-label text-secondary">
                    {progress}% 已學習
                  </div>
                </div>
                <div className="deck-card-footer">
                  <button
                    className="btn btn-glass btn-sm"
                    onClick={() => navigate(`/cards/deck/${deck.id}`)}
                  >
                    管理單字
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/cards/study/${deck.id}`)}
                    disabled={deckCards.length === 0}
                  >
                    {t('flashcards.study')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {/* Add deck button */}
          <button className="add-deck-card" onClick={() => setShowCreateDeck(true)}>
            <Plus size={32} style={{ color: 'var(--text-muted)' }} />
            <span className="text-secondary">{t('flashcards.newDeck')}</span>
          </button>
        </div>
      )}

      {showCreateDeck && (
        <CreateDeckModal
          onClose={() => setShowCreateDeck(false)}
          onCreate={handleCreateDeck}
          t={t}
        />
      )}

      {showImport && (
        <ImportModal
          decks={decks}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          t={t}
          apiKeys={settings}
        />
      )}
    </div>
  );
}
