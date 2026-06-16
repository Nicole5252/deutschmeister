import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  let settingsUrl = '';
  let settingsKey = '';
  try {
    const settingsRaw = localStorage.getItem('dm_settings');
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      settingsUrl = parsed.supabaseUrl || '';
      settingsKey = parsed.supabaseAnonKey || '';
    }
  } catch (e) {
    // Ignore
  }

  const url = settingsUrl || envUrl;
  const key = settingsKey || envKey;

  if (!url || !key) return null;

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return supabaseInstance;
}

export function resetSupabaseInstance() {
  supabaseInstance = null;
}

// Helpers for localStorage direct read/write to prevent circular dependencies
const getLocal = (key) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const setLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore
  }
};

// --- Sync functions ---

export async function syncDecks(supabase, userId) {
  const localDecks = getLocal('dm_decks') || [];
  
  // 1. Fetch from Supabase
  const { data: cloudDecks, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;

  const mergedDecks = [...localDecks];
  const toUpload = [];

  // Compare local with cloud
  for (const local of localDecks) {
    const cloud = cloudDecks.find(d => d.id === local.id);
    if (!cloud) {
      // Not in cloud, needs upload
      toUpload.push({
        id: local.id,
        user_id: userId,
        name: local.name,
        description: local.description,
        created_at: new Date(local.createdAt || Date.now()).toISOString(),
        updated_at: new Date(local.updatedAt || Date.now()).toISOString()
      });
    } else {
      const cloudUpdated = new Date(cloud.updated_at).getTime();
      const localUpdated = local.updatedAt || 0;
      if (localUpdated > cloudUpdated) {
        // Local is newer, upload
        toUpload.push({
          id: local.id,
          user_id: userId,
          name: local.name,
          description: local.description,
          created_at: new Date(local.createdAt || Date.now()).toISOString(),
          updated_at: new Date(localUpdated).toISOString()
        });
      }
    }
  }

  // Upload newer/new decks
  if (toUpload.length > 0) {
    const { error: uploadErr } = await supabase
      .from('decks')
      .upsert(toUpload);
    if (uploadErr) throw uploadErr;
  }

  // Compare cloud with local and update local list
  for (const cloud of cloudDecks) {
    const localIdx = mergedDecks.findIndex(d => d.id === cloud.id);
    const cloudUpdated = new Date(cloud.updated_at).getTime();
    if (localIdx < 0) {
      // Not in local, download
      mergedDecks.push({
        id: cloud.id,
        name: cloud.name,
        description: cloud.description,
        createdAt: new Date(cloud.created_at).getTime(),
        updatedAt: cloudUpdated
      });
    } else {
      const local = mergedDecks[localIdx];
      const localUpdated = local.updatedAt || 0;
      if (cloudUpdated > localUpdated) {
        // Cloud is newer, update local
        mergedDecks[localIdx] = {
          ...local,
          name: cloud.name,
          description: cloud.description,
          createdAt: new Date(cloud.created_at).getTime(),
          updatedAt: cloudUpdated
        };
      }
    }
  }

  setLocal('dm_decks', mergedDecks);
  return mergedDecks;
}

export async function syncCards(supabase, userId) {
  const localCards = getLocal('dm_cards') || [];
  
  // 1. Fetch from Supabase
  const { data: cloudCards, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;

  const mergedCards = [...localCards];
  const toUpload = [];

  // Compare local with cloud
  for (const local of localCards) {
    const cloud = cloudCards.find(c => c.id === local.id);
    if (!cloud) {
      // Not in cloud, needs upload
      toUpload.push({
        id: local.id,
        user_id: userId,
        deck_id: local.deckId,
        german: local.german,
        chinese: local.chinese,
        part_of_speech: local.partOfSpeech || 'other',
        article: local.article || '',
        example: local.example || '',
        notes: local.notes || '',
        image_url: local.imageUrl || '',
        srs: local.srs || null,
        created_at: new Date(local.createdAt || Date.now()).toISOString(),
        updated_at: new Date(local.updatedAt || Date.now()).toISOString()
      });
    } else {
      const cloudUpdated = new Date(cloud.updated_at).getTime();
      const localUpdated = local.updatedAt || 0;
      if (localUpdated > cloudUpdated) {
        // Local is newer, upload
        toUpload.push({
          id: local.id,
          user_id: userId,
          deck_id: local.deckId,
          german: local.german,
          chinese: local.chinese,
          part_of_speech: local.partOfSpeech || 'other',
          article: local.article || '',
          example: local.example || '',
          notes: local.notes || '',
          image_url: local.imageUrl || '',
          srs: local.srs || null,
          created_at: new Date(local.createdAt || Date.now()).toISOString(),
          updated_at: new Date(localUpdated).toISOString()
        });
      }
    }
  }

  // Upload newer/new cards
  if (toUpload.length > 0) {
    const { error: uploadErr } = await supabase
      .from('cards')
      .upsert(toUpload);
    if (uploadErr) throw uploadErr;
  }

  // Compare cloud with local and update local list
  for (const cloud of cloudCards) {
    const localIdx = mergedCards.findIndex(c => c.id === cloud.id);
    const cloudUpdated = new Date(cloud.updated_at).getTime();
    if (localIdx < 0) {
      // Not in local, download
      mergedCards.push({
        id: cloud.id,
        deckId: cloud.deck_id,
        german: cloud.german,
        chinese: cloud.chinese,
        partOfSpeech: cloud.part_of_speech,
        article: cloud.article,
        example: cloud.example,
        notes: cloud.notes,
        imageUrl: cloud.image_url,
        srs: cloud.srs,
        createdAt: new Date(cloud.created_at).getTime(),
        updatedAt: cloudUpdated
      });
    } else {
      const local = mergedCards[localIdx];
      const localUpdated = local.updatedAt || 0;
      if (cloudUpdated > localUpdated) {
        // Cloud is newer, update local
        mergedCards[localIdx] = {
          ...local,
          deckId: cloud.deck_id,
          german: cloud.german,
          chinese: cloud.chinese,
          partOfSpeech: cloud.part_of_speech,
          article: cloud.article,
          example: cloud.example,
          notes: cloud.notes,
          imageUrl: cloud.image_url,
          srs: cloud.srs,
          createdAt: new Date(cloud.created_at).getTime(),
          updatedAt: cloudUpdated
        };
      }
    }
  }

  setLocal('dm_cards', mergedCards);
  return mergedCards;
}

export async function syncStudyLogs(supabase, userId) {
  const localLogs = getLocal('dm_study_log') || [];
  
  const { data: cloudLogs, error } = await supabase
    .from('study_logs')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;

  const mergedLogs = [...localLogs];
  const toUpload = [];

  // Compare local with cloud by timestamp
  for (const local of localLogs) {
    const cloud = cloudLogs.find(l => l.timestamp === local.timestamp);
    if (!cloud) {
      toUpload.push({
        user_id: userId,
        deck_id: local.deckId,
        correct: local.correct,
        total: local.total,
        date: local.date,
        timestamp: local.timestamp
      });
    }
  }

  if (toUpload.length > 0) {
    const { error: uploadErr } = await supabase
      .from('study_logs')
      .insert(toUpload);
    if (uploadErr) throw uploadErr;
  }

  // Compare cloud with local
  for (const cloud of cloudLogs) {
    const localExists = localLogs.some(l => l.timestamp === cloud.timestamp);
    if (!localExists) {
      mergedLogs.push({
        deckId: cloud.deck_id,
        correct: cloud.correct,
        total: cloud.total,
        date: cloud.date,
        timestamp: cloud.timestamp
      });
    }
  }

  setLocal('dm_study_log', mergedLogs);
  return mergedLogs;
}

export async function syncStreak(supabase, userId) {
  const localStreak = getLocal('dm_streak') || { current: 0, best: 0, lastDate: null };

  const { data: cloudStreakData, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is single row not found

  if (cloudStreakData) {
    if (cloudStreakData.current > localStreak.current || cloudStreakData.best > localStreak.best) {
      const merged = {
        current: cloudStreakData.current,
        best: cloudStreakData.best,
        lastDate: cloudStreakData.last_date
      };
      setLocal('dm_streak', merged);
      return merged;
    } else if (localStreak.current > cloudStreakData.current) {
      // Upload local
      const { error: uploadErr } = await supabase
        .from('streaks')
        .upsert({
          user_id: userId,
          current: localStreak.current,
          best: localStreak.best,
          last_date: localStreak.lastDate,
          updated_at: new Date().toISOString()
        });
      if (uploadErr) throw uploadErr;
    }
  } else {
    // Cloud has no streak, upload local
    const { error: uploadErr } = await supabase
      .from('streaks')
      .upsert({
        user_id: userId,
        current: localStreak.current,
        best: localStreak.best,
        last_date: localStreak.lastDate,
        updated_at: new Date().toISOString()
      });
    if (uploadErr) throw uploadErr;
  }

  return localStreak;
}

// Global double-sync orchestrator
export async function syncAllData(supabase, userId) {
  await syncDecks(supabase, userId);
  await syncCards(supabase, userId);
  await syncStudyLogs(supabase, userId);
  await syncStreak(supabase, userId);
}
