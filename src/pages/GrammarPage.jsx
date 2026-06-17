import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  getGrammarTopics, saveGrammarTopic, deleteGrammarTopic,
  saveGrammarQuestions, getGrammarQuestions
} from '../utils/storage';
import {
  generateGrammarQuestions, generateId,
  extractGrammarFromImage, pdfPageToImageBase64,
  generateMixedGrammarQuestions
} from '../utils/helpers';
import {
  Plus, Brain, Trash2, ChevronRight, X, Loader,
  AlertCircle, Sparkles, BookMarked, FileImage, FileText, Upload, CheckCircle, Check
} from 'lucide-react';
import './GrammarPage.css';

const BUILT_IN_TOPICS = [
  {
    id: 'builtin-wechselpraepositionen',
    name: 'Wechselpräpositionen',
    nameZh: '雙介系詞',
    description: '支配第三格（靜態位置 Dativ）或第四格（動態方向 Akkusativ）的雙向介系詞，如 in, an, auf 等',
    builtin: true,
    questionCount: 0,
  },
  {
    id: 'builtin-verben-praepositionen',
    name: 'Verben und Präpositionen',
    nameZh: '動詞與介系詞的格',
    description: '搭配特定介系詞並支配 Akkusativ 或 Dativ 的動詞搭配與句型結構',
    builtin: true,
    questionCount: 0,
  },
  {
    id: 'builtin-pronomen-artikel',
    name: 'Pronomen und Artikel',
    nameZh: '冠詞與代名詞的變化',
    description: '定冠詞、不定冠詞、否定冠詞與人稱代名詞在 Akkusativ 和 Dativ 下的字尾與形式變化',
    builtin: true,
    questionCount: 0,
  },
  {
    id: 'builtin-imperativ',
    name: 'Imperativ',
    nameZh: '祈使句 / 命令句',
    description: '德語中用於命令、請求、建議或指令的動詞變位形式（du, ihr, Sie）與句型',
    builtin: true,
    questionCount: 0,
  },
  {
    id: 'builtin-perfekt',
    name: 'Perfekt',
    nameZh: '現在完成式',
    description: '口語最常用的過去時態，包含助動詞 (haben/sein) 變位與過去分詞 (Partizip II) 的構成',
    builtin: true,
    questionCount: 0,
  },
  {
    id: 'builtin-trennbare-verben',
    name: 'Trennbare Verben',
    nameZh: '可分動詞',
    description: '由可分前綴與基本動詞構成，在現在式與命令句中前綴需分離至句尾的語法規則',
    builtin: true,
    questionCount: 0,
  },
  {
    id: 'builtin-modalverben',
    name: 'Modalverben',
    nameZh: '情態助動詞',
    description: '德語中的情態助動詞 (können, müssen, dürfen, wollen, sollen, mögen) 在現在式的變位與用法',
    builtin: true,
    questionCount: 0,
  },
];

function CreateTopicModal({ onClose, onCreate, t }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in">
        <div className="modal-header">
          <h3>{t('grammar.newTopic')}</h3>
          <button className="btn btn-glass btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="label">{t('grammar.topicName')} *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Präteritum" autoFocus />
          </div>
          <div className="form-group">
            <label className="label">{t('grammar.topicDesc')}</label>
            <textarea className="input textarea" value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="描述此文法主題..." />
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
            {t('grammar.createTopic')}
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ topic, selectedTopics, onClose, onGenerated, t, apiKeys }) {
  const isMixed = selectedTopics && selectedTopics.length > 0;
  const [tab, setTab] = useState('text'); // 'text' | 'image'

  // Text-generation state
  const [count, setCount] = useState(5);
  const [type, setType] = useState('multiple');
  const [difficulty, setDifficulty] = useState('medium');

  // Image/PDF state
  const [imgStep, setImgStep] = useState('upload'); // upload | processing | done
  const [isDragging, setIsDragging] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [pdfInfo, setPdfInfo] = useState(null);
  const [imgPreview, setImgPreview] = useState(null); // base64 preview URL

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Text generation ──────────────────────────────────────
  async function handleTextGenerate() {
    const hasKey = apiKeys?.openaiKey || apiKeys?.geminiKey;
    if (!hasKey) { setError('需要 OpenAI 或 Google Gemini API Key，請先在設定中填入'); return; }
    setLoading(true); setError('');
    try {
      let questions;
      if (isMixed) {
        const result = await generateMixedGrammarQuestions(
          apiKeys,
          selectedTopics,
          count,
          type
        );
        questions = result.questions.map(q => ({ ...q, id: generateId(), topicId: 'mixed' }));
        localStorage.setItem('dm_mixed_questions', JSON.stringify(questions));
        onGenerated(questions.length, true);
      } else {
        const result = await generateGrammarQuestions(
          apiKeys,
          `${topic.name} ${topic.nameZh || ''}`,
          `${topic.description || ''} 難度：${difficulty}`,
          count,
          type
        );
        questions = result.questions.map(q => ({ ...q, id: generateId(), topicId: topic.id }));
        saveGrammarQuestions(questions);
        onGenerated(questions.length, false);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Image/PDF handling ────────────────────────────────────
  async function processImageFile(file) {
    const hasKey = apiKeys?.openaiKey || apiKeys?.geminiKey;
    if (!hasKey) { setError('需要 OpenAI 或 Google Gemini API Key，請先在設定中填入'); return; }
    setError('');
    const isPdf = file.type === 'application/pdf';

    if (isPdf) {
      setImgStep('processing');
      setProcessingMsg('載入 PDF...');
      try {
        const { totalPages } = await pdfPageToImageBase64(file, 1);
        if (totalPages > 1) {
          setPdfInfo({ file, totalPages, currentPage: 1 });
          setImgStep('pdfSelect');
        } else {
          await analyzeImagePage(file, 1, isPdf);
        }
      } catch (err) {
        setError('PDF 讀取失敗：' + err.message);
        setImgStep('upload');
      }
    } else {
      setImgStep('processing');
      setProcessingMsg('AI 分析圖片中...');
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result.split(',')[1];
            setImgPreview(e.target.result);
            await analyzeBase64(base64, file.type);
          } catch (err) {
            setError(err.message);
            setImgStep('upload');
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError(err.message);
        setImgStep('upload');
      }
    }
  }

  async function analyzeImagePage(file, pageNum) {
    setImgStep('processing');
    setProcessingMsg(`轉換第 ${pageNum} 頁並分析中...`);
    try {
      const { base64, mimeType } = await pdfPageToImageBase64(file, pageNum);
      await analyzeBase64(base64, mimeType);
    } catch (err) {
      setError(err.message);
      setImgStep('upload');
    }
  }

  async function analyzeBase64(base64, mimeType) {
    setImgStep('processing');
    setProcessingMsg('AI 分析文法內容並生成題目...');
    try {
      const result = await extractGrammarFromImage(apiKeys, base64, mimeType, {
        count,
        type,
        difficulty,
      });
      const questions = result.questions.map(q => ({ ...q, id: generateId(), topicId: topic.id }));
      saveGrammarQuestions(questions);
      onGenerated(questions.length, false);
      onClose();
    } catch (err) {
      setError(err.message);
      setImgStep('upload');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) processImageFile(file);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fade-in" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h3><Sparkles size={16} style={{ marginRight: 8, color: 'var(--accent-primary)' }} />{t('grammar.generateQuiz')}</h3>
          <button className="btn btn-glass btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Topic badge */}
        <div style={{ padding: '0 24px 4px' }}>
          {isMixed ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {selectedTopics.map(t => (
                <div key={t.id} className="topic-chip" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  <Brain size={12} />
                  {t.name}
                </div>
              ))}
            </div>
          ) : (
            <div className="topic-chip">
              <Brain size={14} />
              {topic?.name} {topic?.nameZh && `(${topic?.nameZh})`}
            </div>
          )}
        </div>

        {/* Tab switcher */}
        {!isMixed && (
          <div className="generate-tabs">
            <button
              className={`generate-tab ${tab === 'text' ? 'active' : ''}`}
              onClick={() => { setTab('text'); setError(''); }}
            >
              <Sparkles size={14} /> AI 文字生成
            </button>
            <button
              className={`generate-tab ${tab === 'image' ? 'active' : ''}`}
              onClick={() => { setTab('image'); setError(''); }}
            >
              <FileImage size={14} /> 圖片 / PDF 匯入
            </button>
          </div>
        )}

        <div className="modal-body">
          {/* Common error */}
          {!(apiKeys?.openaiKey || apiKeys?.geminiKey) && (
            <div className="alert-warning mb-4">
              <AlertCircle size={16} />
              需要 OpenAI 或 Google Gemini API Key，請先在設定中填入
            </div>
          )}
          {error && <div className="alert-error mb-4"><AlertCircle size={16} />{error}</div>}

          {/* ── TEXT TAB ──────────────────────── */}
          {tab === 'text' && (
            <>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="label">{t('grammar.questionCount')}</label>
                  <select className="input select" value={count} onChange={e => setCount(+e.target.value)}>
                    {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} 題</option>)}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="label">{t('grammar.difficulty')}</label>
                  <select className="input select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    <option value="easy">{t('grammar.easy')}</option>
                    <option value="medium">{t('grammar.medium')}</option>
                    <option value="hard">{t('grammar.hard')}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">{t('grammar.questionType')}</label>
                <div className="type-options">
                  {[
                    { val: 'multiple', label: t('grammar.multiple') },
                    { val: 'fillBlank', label: t('grammar.fillBlank') },
                    { val: 'sentence', label: t('grammar.sentence') },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      className={`type-option ${type === opt.val ? 'active' : ''}`}
                      onClick={() => setType(opt.val)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── IMAGE TAB ─────────────────────── */}
          {tab === 'image' && (
            <>
              {/* Settings row always visible */}
              <div className="flex gap-3 mb-4">
                <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                  <label className="label">{t('grammar.questionCount')}</label>
                  <select className="input select" value={count} onChange={e => setCount(+e.target.value)}>
                    {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} 題</option>)}
                  </select>
                </div>
                <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                  <label className="label">{t('grammar.difficulty')}</label>
                  <select className="input select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    <option value="easy">{t('grammar.easy')}</option>
                    <option value="medium">{t('grammar.medium')}</option>
                    <option value="hard">{t('grammar.hard')}</option>
                  </select>
                </div>
                <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                  <label className="label">{t('grammar.questionType')}</label>
                  <select className="input select" value={type} onChange={e => setType(e.target.value)}>
                    <option value="multiple">選擇題</option>
                    <option value="fillBlank">填空題</option>
                    <option value="sentence">造句</option>
                  </select>
                </div>
              </div>

              {imgStep === 'upload' && (
                <div
                  className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <FileImage size={38} style={{ color: 'var(--accent-primary)', marginBottom: 10 }} />
                  <p style={{ fontWeight: 600 }}>拖放教科書頁面、筆記或文法說明圖片</p>
                  <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                    AI 會讀取圖片中的文法內容並自動生成練習題·支援 JPG, PNG, PDF
                  </p>
                  <label className="btn btn-primary btn-sm" style={{ marginTop: 14, cursor: 'pointer' }}>
                    <Upload size={14} />
                    選擇檔案
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileInput}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}

              {imgStep === 'processing' && (
                <div className="text-center" style={{ padding: '36px 0' }}>
                  <div className="spinner mx-auto mb-4" />
                  <p className="text-secondary">{processingMsg}</p>
                </div>
              )}

              {imgStep === 'pdfSelect' && pdfInfo && (
                <div className="pdf-page-selector">
                  <div className="pdf-select-header">
                    <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                      <p style={{ fontWeight: 600 }}>PDF 共 {pdfInfo.totalPages} 頁</p>
                      <p className="text-secondary" style={{ fontSize: '0.82rem' }}>選擇要辨識的頁面</p>
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
            </>
          )}
        </div>

        <div className="modal-footer">
          {tab === 'text' ? (
            <>
              <button className="btn btn-glass" onClick={onClose}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleTextGenerate} disabled={loading || !(apiKeys?.openaiKey || apiKeys?.geminiKey)}>
                {loading
                  ? <><Loader size={14} className="spin" /> {t('grammar.generating')}</>
                  : <><Sparkles size={14} /> {t('grammar.generateQuiz')}</>
                }
              </button>
            </>
          ) : imgStep === 'pdfSelect' ? (
            <>
              <button className="btn btn-glass" onClick={() => setImgStep('upload')}>重新選檔</button>
              <button
                className="btn btn-primary"
                onClick={() => analyzeImagePage(pdfInfo.file, pdfInfo.currentPage)}
              >
                <FileText size={14} />
                分析第 {pdfInfo?.currentPage} 頁
              </button>
            </>
          ) : (
            <button className="btn btn-glass" onClick={imgStep === 'upload' ? onClose : () => setImgStep('upload')}>
              {imgStep === 'upload' ? t('common.cancel') : '重新上傳'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


export default function GrammarPage() {
  const { t, settings, showToast } = useApp();
  const navigate = useNavigate();
  const [userTopics, setUserTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [generateModalConfig, setGenerateModalConfig] = useState(null); // { topic, selectedTopics }

  useEffect(() => {
    setUserTopics(getGrammarTopics());
  }, []);

  const allTopics = [...BUILT_IN_TOPICS, ...userTopics];

  function handleCreate(topic) {
    saveGrammarTopic(topic);
    setUserTopics(getGrammarTopics());
    showToast(`✅ 已建立「${topic.name}」`, 'success');
  }

  function handleDelete(topicId) {
    if (!window.confirm('確定要刪除此文法主題？')) return;
    deleteGrammarTopic(topicId);
    setUserTopics(getGrammarTopics());
    setSelectedTopicIds(prev => prev.filter(id => id !== topicId));
  }

  function handleGenerated(count, isRedirect = false) {
    showToast(`✅ 已生成 ${count} 題`, 'success');
    setUserTopics(getGrammarTopics());
    if (isRedirect) {
      navigate('/grammar/practice/mixed');
    }
  }

  function toggleTopicSelect(topicId) {
    setSelectedTopicIds(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  }

  const selectedCount = selectedTopicIds.length;

  return (
    <div className="grammar-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('grammar.title')}</h1>
          <p className="text-secondary">{allTopics.length} 個文法主題 · 勾選主題可進行 A1 混合練習</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          {t('grammar.newTopic')}
        </button>
      </div>

      {/* Built-in Topics */}
      <div>
        <h2 className="section-header">核心文法主題</h2>
        <div className="topics-grid">
          {BUILT_IN_TOPICS.map(topic => {
            const qCount = getGrammarQuestions(topic.id).length;
            const isSelected = selectedTopicIds.includes(topic.id);
            return (
              <div
                key={topic.id}
                className={`topic-card card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleTopicSelect(topic.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="topic-card-header" onClick={e => e.stopPropagation()}>
                  <div className="topic-card-header-checkbox">
                    <div
                      className={`topic-checkbox ${isSelected ? 'checked' : ''}`}
                      onClick={() => toggleTopicSelect(topic.id)}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="topic-icon">
                      <Brain size={18} />
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setGenerateModalConfig({ topic, selectedTopics: null })}
                  >
                    <Sparkles size={12} />
                    生成題目
                  </button>
                </div>
                <h3 className="topic-name">{topic.name}</h3>
                {topic.nameZh && <div className="topic-name-zh text-accent">{topic.nameZh}</div>}
                <p className="topic-desc text-secondary">{topic.description}</p>
                <div className="topic-footer" onClick={e => e.stopPropagation()}>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {qCount > 0 ? `${qCount} 題可練習` : '尚無題目'}
                  </span>
                  <button
                    className="btn btn-glass btn-sm"
                    disabled={qCount === 0}
                    onClick={() => navigate(`/grammar/practice/${topic.id}`)}
                  >
                    {t('grammar.practiceNow')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Topics */}
      {userTopics.length > 0 && (
        <div>
          <h2 className="section-header">自訂主題</h2>
          <div className="topics-grid">
            {userTopics.map(topic => {
              const qCount = getGrammarQuestions(topic.id).length;
              const isSelected = selectedTopicIds.includes(topic.id);
              return (
                <div
                  key={topic.id}
                  className={`topic-card card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleTopicSelect(topic.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="topic-card-header" onClick={e => e.stopPropagation()}>
                    <div className="topic-card-header-checkbox">
                      <div
                        className={`topic-checkbox ${isSelected ? 'checked' : ''}`}
                        onClick={() => toggleTopicSelect(topic.id)}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="topic-icon" style={{ background: 'rgba(45, 212, 191, 0.15)', color: 'var(--accent-teal)' }}>
                        <BookMarked size={18} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => setGenerateModalConfig({ topic, selectedTopics: null })}>
                        <Sparkles size={12} /> 生成
                      </button>
                      <button className="btn btn-glass btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(topic.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="topic-name">{topic.name}</h3>
                  {topic.description && <p className="topic-desc text-secondary">{topic.description}</p>}
                  <div className="topic-footer" onClick={e => e.stopPropagation()}>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {qCount > 0 ? `${qCount} 題可練習` : '尚無題目'}
                    </span>
                    <button
                      className="btn btn-glass btn-sm"
                      disabled={qCount === 0}
                      onClick={() => navigate(`/grammar/practice/${topic.id}`)}
                    >
                      {t('grammar.practiceNow')} <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateTopicModal onClose={() => setShowCreate(false)} onCreate={handleCreate} t={t} />
      )}

      {generateModalConfig && (
        <GenerateModal
          topic={generateModalConfig.topic}
          selectedTopics={generateModalConfig.selectedTopics}
          onClose={() => setGenerateModalConfig(null)}
          onGenerated={handleGenerated}
          t={t}
          apiKeys={settings}
        />
      )}

      {/* Bottom Floating Action Bar for Selected Topics */}
      {selectedCount > 0 && (
        <div className="mixed-action-bar-container">
          <div className="mixed-action-bar">
            <div className="mixed-bar-info">
              <span className="mixed-bar-badge">{selectedCount}</span>
              <span className="mixed-bar-text">已選擇 {selectedCount} 個文法主題進行 A1 混合出題</span>
            </div>
            <div className="mixed-bar-actions">
              <button className="btn btn-glass btn-sm" onClick={() => setSelectedTopicIds([])}>
                清除選擇
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const selected = allTopics.filter(t => selectedTopicIds.includes(t.id));
                  setGenerateModalConfig({ topic: null, selectedTopics: selected });
                }}
              >
                <Sparkles size={14} />
                設定並生成混合練習題
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
