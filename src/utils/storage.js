// LocalStorage persistence layer
import { getSupabase } from './supabase';

async function syncDeckToCloud(deck) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('decks').upsert({
      id: deck.id,
      user_id: userId,
      name: deck.name,
      description: deck.description,
      created_at: new Date(deck.createdAt || Date.now()).toISOString(),
      updated_at: new Date(deck.updatedAt || Date.now()).toISOString()
    });
  } catch (err) {
    console.error('Cloud sync deck failed:', err);
  }
}

async function deleteDeckOnCloud(deckId) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('decks').delete().eq('id', deckId).eq('user_id', userId);
  } catch (err) {
    console.error('Cloud delete deck failed:', err);
  }
}

async function syncCardToCloud(card) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('cards').upsert({
      id: card.id,
      user_id: userId,
      deck_id: card.deckId,
      german: card.german,
      chinese: card.chinese,
      part_of_speech: card.partOfSpeech || 'other',
      article: card.article || '',
      example: card.example || '',
      notes: card.notes || '',
      image_url: card.imageUrl || '',
      srs: card.srs || null,
      created_at: new Date(card.createdAt || Date.now()).toISOString(),
      updated_at: new Date(card.updatedAt || Date.now()).toISOString()
    });
  } catch (err) {
    console.error('Cloud sync card failed:', err);
  }
}

async function syncCardsToCloud(cards) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    const toUpload = cards.map(c => ({
      id: c.id,
      user_id: userId,
      deck_id: c.deckId,
      german: c.german,
      chinese: c.chinese,
      part_of_speech: c.partOfSpeech || 'other',
      article: c.article || '',
      example: c.example || '',
      notes: c.notes || '',
      image_url: c.imageUrl || '',
      srs: c.srs || null,
      created_at: new Date(c.createdAt || Date.now()).toISOString(),
      updated_at: new Date(c.updatedAt || Date.now()).toISOString()
    }));

    await supabase.from('cards').upsert(toUpload);
  } catch (err) {
    console.error('Cloud sync cards failed:', err);
  }
}

async function deleteCardOnCloud(cardId) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('cards').delete().eq('id', cardId).eq('user_id', userId);
  } catch (err) {
    console.error('Cloud delete card failed:', err);
  }
}

async function syncStudyLogToCloud(log) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('study_logs').insert({
      user_id: userId,
      deck_id: log.deckId,
      correct: log.correct,
      total: log.total,
      date: log.date,
      timestamp: log.timestamp
    });
  } catch (err) {
    console.error('Cloud sync study log failed:', err);
  }
}

async function syncStreakToCloud(streak) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from('streaks').upsert({
      user_id: userId,
      current: streak.current,
      best: streak.best,
      last_date: streak.lastDate,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Cloud sync streak failed:', err);
  }
}

const STORAGE_KEYS = {
  DECKS: 'dm_decks',
  CARDS: 'dm_cards',
  GRAMMAR_TOPICS: 'dm_grammar_topics',
  GRAMMAR_QUESTIONS: 'dm_grammar_questions',
  STUDY_LOG: 'dm_study_log',
  SETTINGS: 'dm_settings',
  STREAK: 'dm_streak',
};

function get(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---- Decks ----
export function getDecks() {
  return get(STORAGE_KEYS.DECKS) || [];
}

export function saveDeck(deck) {
  const decks = getDecks();
  const idx = decks.findIndex(d => d.id === deck.id);
  let updatedDeck;
  if (idx >= 0) {
    updatedDeck = { ...decks[idx], ...deck, updatedAt: Date.now() };
    decks[idx] = updatedDeck;
  } else {
    updatedDeck = { ...deck, createdAt: Date.now(), updatedAt: Date.now() };
    decks.push(updatedDeck);
  }
  set(STORAGE_KEYS.DECKS, decks);

  // Background Cloud Sync
  syncDeckToCloud(updatedDeck);

  return updatedDeck;
}

export function deleteDeck(deckId) {
  const decks = getDecks().filter(d => d.id !== deckId);
  set(STORAGE_KEYS.DECKS, decks);
  // Also delete cards in this deck
  const cards = getCards().filter(c => c.deckId !== deckId);
  set(STORAGE_KEYS.CARDS, cards);

  // Background Cloud Sync
  deleteDeckOnCloud(deckId);
}

// ---- Cards ----
export function getCards(deckId) {
  const all = get(STORAGE_KEYS.CARDS) || [];
  return deckId ? all.filter(c => c.deckId === deckId) : all;
}

export function saveCard(card) {
  const cards = get(STORAGE_KEYS.CARDS) || [];
  const idx = cards.findIndex(c => c.id === card.id);
  let updatedCard;
  if (idx >= 0) {
    updatedCard = { ...cards[idx], ...card, updatedAt: Date.now() };
    cards[idx] = updatedCard;
  } else {
    updatedCard = { ...card, createdAt: Date.now(), updatedAt: Date.now() };
    cards.push(updatedCard);
  }
  set(STORAGE_KEYS.CARDS, cards);

  // Background Cloud Sync
  syncCardToCloud(updatedCard);

  return updatedCard;
}

export function saveCards(newCards) {
  const existing = get(STORAGE_KEYS.CARDS) || [];
  const merged = [...existing];
  const updatedCards = [];
  for (const card of newCards) {
    const idx = merged.findIndex(c => c.id === card.id);
    let updated;
    if (idx >= 0) {
      updated = { ...merged[idx], ...card, updatedAt: Date.now() };
      merged[idx] = updated;
    } else {
      updated = { ...card, createdAt: Date.now(), updatedAt: Date.now() };
      merged.push(updated);
    }
    updatedCards.push(updated);
  }
  set(STORAGE_KEYS.CARDS, merged);

  // Background Cloud Sync
  syncCardsToCloud(updatedCards);
}

export function deleteCard(cardId) {
  const cards = (get(STORAGE_KEYS.CARDS) || []).filter(c => c.id !== cardId);
  set(STORAGE_KEYS.CARDS, cards);

  // Background Cloud Sync
  deleteCardOnCloud(cardId);
}

// ---- Grammar Topics ----
export function getGrammarTopics() {
  return get(STORAGE_KEYS.GRAMMAR_TOPICS) || [];
}

export function saveGrammarTopic(topic) {
  const topics = getGrammarTopics();
  const idx = topics.findIndex(t => t.id === topic.id);
  if (idx >= 0) {
    topics[idx] = { ...topics[idx], ...topic, updatedAt: Date.now() };
  } else {
    topics.push({ ...topic, createdAt: Date.now(), updatedAt: Date.now() });
  }
  set(STORAGE_KEYS.GRAMMAR_TOPICS, topics);
  return topic;
}

export function deleteGrammarTopic(topicId) {
  const topics = getGrammarTopics().filter(t => t.id !== topicId);
  set(STORAGE_KEYS.GRAMMAR_TOPICS, topics);
  const questions = getGrammarQuestions().filter(q => q.topicId !== topicId);
  set(STORAGE_KEYS.GRAMMAR_QUESTIONS, questions);
}

// ---- Grammar Questions ----
export function getGrammarQuestions(topicId) {
  const all = get(STORAGE_KEYS.GRAMMAR_QUESTIONS) || [];
  return topicId ? all.filter(q => q.topicId === topicId) : all;
}

export function saveGrammarQuestions(questions) {
  const existing = get(STORAGE_KEYS.GRAMMAR_QUESTIONS) || [];
  const topicId = questions[0]?.topicId;
  const filtered = topicId ? existing.filter(q => q.topicId !== topicId) : existing;
  set(STORAGE_KEYS.GRAMMAR_QUESTIONS, [...filtered, ...questions]);
}

// ---- Study Log ----
export function logStudySession(deckId, correct, total) {
  const logs = get(STORAGE_KEYS.STUDY_LOG) || [];
  const today = new Date().toISOString().slice(0, 10);
  const newLog = { deckId, correct, total, date: today, timestamp: Date.now() };
  logs.push(newLog);
  // Keep last 365 days
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const trimmed = logs.filter(l => l.timestamp > cutoff);
  set(STORAGE_KEYS.STUDY_LOG, trimmed);

  // Background Cloud Sync
  syncStudyLogToCloud(newLog);

  updateStreak();
}

export function getStudyLog() {
  return get(STORAGE_KEYS.STUDY_LOG) || [];
}

// ---- Streak ----
export function updateStreak() {
  const streak = get(STORAGE_KEYS.STREAK) || { current: 0, best: 0, lastDate: null };
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (streak.lastDate === today) return streak;

  if (streak.lastDate === yesterday) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }
  streak.best = Math.max(streak.best, streak.current);
  streak.lastDate = today;
  set(STORAGE_KEYS.STREAK, streak);

  // Background Cloud Sync
  syncStreakToCloud(streak);

  return streak;
}

export function getStreak() {
  return get(STORAGE_KEYS.STREAK) || { current: 0, best: 0 };
}

// ---- Settings ----
export function getSettings() {
  return get(STORAGE_KEYS.SETTINGS) || {
    theme: 'dark',
    language: 'zh',
    openaiKey: '',
    geminiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    ttsRate: 0.8,
    ttsVoice: '',
  };
}

export function saveSettings(settings) {
  set(STORAGE_KEYS.SETTINGS, settings);
}

// ---- Export / Import ----
export function exportAllData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    decks: getDecks(),
    cards: getCards(),
    grammarTopics: getGrammarTopics(),
    grammarQuestions: getGrammarQuestions(),
    studyLog: getStudyLog(),
    streak: getStreak(),
  };
}

export function importAllData(data) {
  if (data.decks) set(STORAGE_KEYS.DECKS, data.decks);
  if (data.cards) set(STORAGE_KEYS.CARDS, data.cards);
  if (data.grammarTopics) set(STORAGE_KEYS.GRAMMAR_TOPICS, data.grammarTopics);
  if (data.grammarQuestions) set(STORAGE_KEYS.GRAMMAR_QUESTIONS, data.grammarQuestions);
  if (data.studyLog) set(STORAGE_KEYS.STUDY_LOG, data.studyLog);
  if (data.streak) set(STORAGE_KEYS.STREAK, data.streak);
}

export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
