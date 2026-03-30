import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 🔑 Замените на свои данные из Supabase Dashboard
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function submitScore(username, score, playtime) {
  try {
    const { data, error } = await supabase.from('leaderboard').insert([{ username, score, playtime }]);
    if (error) throw error; return data;
  } catch (err) { console.error('Leaderboard submit error:', err); return null; }
}

export async function getLeaderboard(limit = 10) {
  try {
    const { data, error } = await supabase.from('leaderboard').select('username, score, playtime, created_at').order('score', { ascending: false }).limit(limit);
    if (error) throw error; return data;
  } catch (err) { console.error('Leaderboard fetch error:', err); return []; }
}