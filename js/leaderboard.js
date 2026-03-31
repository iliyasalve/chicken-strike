import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jaaolhmbvmoaikwqudoi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y1Ui9F8AuURFjJWWcWJqRg_fGgqjSVi';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ USER ID ============

// ============ GET UNIQUE USERNAME ============

export async function isUsernameTaken(username, currentUserId) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // Не найдено — ник свободен
      return false;
    }

    if (error) throw error;

    // Если запись принадлежит текущему игроку — это ок
    if (data.user_id === currentUserId) {
      return false;
    }

    // Ник занят другим игроком
    return true;
  } catch (err) {
    console.error('Username check error:', err);
    return false; // В случае ошибки — пропускаем
  }
}

function getUserId() {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return 'tg_' + window.Telegram.WebApp.initDataUnsafe.user.id;
  }

  let localId = localStorage.getItem('chicken_strike_device_id');
  if (!localId) {
    localId = 'local_' + crypto.randomUUID();
    localStorage.setItem('chicken_strike_device_id', localId);
  }
  return localId;
}

// ✅ Экспортируем getUserId чтобы main.js мог его использовать
export { getUserId };

// ============ SUBMIT ============

export async function submitScore(username, score, playtime) {
  try {
    const userId = getUserId();

    const { data: existing, error: fetchError } = await supabase
      .from('leaderboard')
      .select('score')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Fetch error:', fetchError);
    }

    if (existing && score <= existing.score) {
      console.log('Score not improved. Skip update.');
      return { updated: false };
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .upsert({
        user_id: userId,
        username: username,
        score: score,
        playtime: playtime,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) throw error;
    console.log('Score submitted!', data);
    return { updated: true, data };

  } catch (err) {
    console.error('Leaderboard submit error:', err);
    return null;
  }
}

// ============ GET LEADERBOARD ============

export async function getLeaderboard(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('username, score, playtime, created_at')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    return [];
  }
}

// ============ FORMAT TIME (UTC → local) ============

export function formatDate(utcString) {
  const date = new Date(utcString);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatPlaytime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

// ============ DETERMINE LEADERBOARD SIZE ============

export function getLeaderboardLimit() {
  // Мобилка — 3, десктоп — 10
  return window.innerWidth <= 768 ? 3 : 10;
}


// ============ GET FULL LEADERBOARD ============

export async function getFullLeaderboard() {
  try {
    // Топ 100 игроков
    // Чтобы показать ВСЕХ — замени limit(100) на просто убери .limit()
    const { data, error } = await supabase
      .from('leaderboard')
      .select('username, score, playtime, created_at')
      .order('score', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Full leaderboard fetch error:', err);
    return [];
  }
}
