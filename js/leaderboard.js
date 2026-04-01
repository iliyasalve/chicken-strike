/* ========================================= */
/* LEADERBOARD & DATA MANAGEMENT             */
/* Handles all Supabase interactions:        */
/*   - User identification (device/Telegram) */
/*   - Username uniqueness checking          */
/*   - Score submission (upsert)             */
/*   - Leaderboard fetching (3/10/100)       */
/*   - Data deletion (GDPR compliance)       */
/*   - GDPR consent management               */
/*   - Date/time formatting helpers          */
/* ========================================= */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* ========================================= */
/* SUPABASE CONNECTION                       */
/* Using anon (public) key — safe for        */
/* frontend use. Protected by RLS policies.  */
/* ========================================= */

const SUPABASE_URL = 'https://jaaolhmbvmoaikwqudoi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y1Ui9F8AuURFjJWWcWJqRg_fGgqjSVi';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ========================================= */
/* USER IDENTIFICATION                       */
/* Generates a unique ID per device/user.    */
/*                                           */
/* Priority:                                 */
/*   1. Telegram user ID (if in TG WebApp)   */
/*   2. Random UUID stored in localStorage   */
/*                                           */
/* Format:                                   */
/*   - Telegram: "tg_123456789"              */
/*   - Browser:  "local_abc123-def456..."    */
/*                                           */
/* Note: if user clears browser data,        */
/* their local ID is lost. They can contact  */
/* support via email to delete old records.  */
/* ========================================= */

function getUserId() {
  // Check if running inside Telegram WebApp
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return 'tg_' + window.Telegram.WebApp.initDataUnsafe.user.id;
  }

  // Fall back to localStorage-based device ID
  let localId = localStorage.getItem('chicken_strike_device_id');

  if (!localId) {
    // First visit: generate and persist a new UUID
    localId = 'local_' + crypto.randomUUID();
    localStorage.setItem('chicken_strike_device_id', localId);
  }

  return localId;
}

// Export for use in main.js (username uniqueness check)
export { getUserId };

/* ========================================= */
/* USERNAME UNIQUENESS CHECK                 */
/* Ensures no two different devices use the  */
/* same nickname in the leaderboard.         */
/*                                           */
/* Returns:                                  */
/*   true  — name is taken by another player */
/*   false — name is available (or is yours) */
/*                                           */
/* Uses .single() which returns 406 if not   */
/* found — this is expected and handled.     */
/* ========================================= */

export async function isUsernameTaken(username, currentUserId) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id')
      .eq('username', username)
      .single();

    // PGRST116 = "no rows found" — name is available
    if (error && error.code === 'PGRST116') {
      return false;
    }

    if (error) throw error;

    // If the record belongs to the current player, it's OK
    // (they're updating their own score, not stealing a name)
    if (data.user_id === currentUserId) {
      return false;
    }

    // Name is taken by a different player
    return true;

  } catch (err) {
    console.error('Username check error:', err);
    // On error, allow submission (don't block the player)
    return false;
  }
}

/* ========================================= */
/* SCORE SUBMISSION                          */
/* Uses upsert (insert or update) to:       */
/*   1. Check if player already has a record */
/*   2. Skip if new score isn't better       */
/*   3. Insert or update the record          */
/*                                           */
/* Returns:                                  */
/*   { updated: true }  — new record saved   */
/*   { updated: false } — score not improved */
/*   null               — error occurred     */
/*                                           */
/* onConflict: 'user_id' means if a record   */
/* with this user_id exists, update it       */
/* instead of creating a duplicate.          */
/* ========================================= */

export async function submitScore(username, score, playtime) {
  try {
    const userId = getUserId();

    // Check existing score for this device
    // maybeSingle() returns null instead of 406 error when not found
    const { data: existing, error: fetchError } = await supabase
      .from('leaderboard')
      .select('score')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
    }

    // Don't overwrite a better score
    if (existing && score <= existing.score) {
      console.log('Score not improved. Skip update.');
      return { updated: false };
    }

    // Upsert: insert new record or update existing one
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

/* ========================================= */
/* LEADERBOARD FETCHING                      */
/* Three tiers of data:                      */
/*   getLeaderboard(n)    — top N players    */
/*   getFullLeaderboard() — top 100 players  */
/*   getLeaderboardLimit()— 3 (mobile) or    */
/*                          10 (desktop)     */
/* ========================================= */

/**
 * Fetches top N players from the leaderboard.
 * Used for game over screen (top 3) and
 * in-game sidebar (3 or 10 depending on device).
 *
 * @param {number} limit - Number of records to fetch
 * @returns {Array} Sorted by score descending
 */
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

/**
 * Fetches top 100 players for the full leaderboard modal.
 * To show ALL players, remove the .limit(100) call.
 *
 * @returns {Array} Sorted by score descending
 */
export async function getFullLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('username, score, playtime, created_at')
      .order('score', { ascending: false })
      .limit(100); // Remove this line to show all players

    if (error) throw error;
    return data || [];

  } catch (err) {
    console.error('Full leaderboard fetch error:', err);
    return [];
  }
}

/**
 * Returns how many leaderboard entries to show
 * in the in-game mini sidebar.
 * Mobile (<=768px): 3 entries (save screen space)
 * Desktop (>768px): 10 entries
 */
export function getLeaderboardLimit() {
  return window.innerWidth <= 768 ? 3 : 10;
}

/* ========================================= */
/* DATA DELETION (GDPR)                      */
/* Deletes all records linked to the current */
/* device ID from Supabase, then clears      */
/* all related localStorage entries.         */
/*                                           */
/* Returns:                                  */
/*   { success: true, count: N }  — deleted  */
/*   { success: false, count: 0 } — error    */
/*                                           */
/* Note: if user cleared their browser and   */
/* lost their device ID, they need to        */
/* contact support via email for manual      */
/* deletion (as stated in Privacy Policy).   */
/* ========================================= */

export async function deleteByDeviceId() {
  try {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('leaderboard')
      .delete()
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    // Clear all local data
    localStorage.removeItem('chicken_strike_device_id');
    localStorage.removeItem('highScore');
    localStorage.removeItem('gdpr_consent');

    return { success: true, count: data?.length || 0 };

  } catch (err) {
    console.error('Delete by device error:', err);
    return { success: false, count: 0 };
  }
}

/* ========================================= */
/* GDPR CONSENT                              */
/* Simple flag stored in localStorage.       */
/* Must be true before any data is sent      */
/* to Supabase.                              */
/*                                           */
/* hasConsent() — checks if user agreed      */
/* setConsent() — saves user's choice        */
/* ========================================= */

/**
 * Checks if user has given GDPR consent.
 * @returns {boolean}
 */
export function hasConsent() {
  return localStorage.getItem('gdpr_consent') === 'true';
}

/**
 * Saves the user's GDPR consent choice.
 * @param {boolean} value - true = agreed, false = declined
 */
export function setConsent(value) {
  localStorage.setItem('gdpr_consent', value ? 'true' : 'false');
}

/* ========================================= */
/* FORMAT HELPERS                            */
/* Convert raw data into human-readable      */
/* strings for display in the UI.            */
/* ========================================= */

/**
 * Converts UTC timestamp to local date/time string.
 * Format adapts to user's browser locale.
 * Example: "04/07/25, 00:47"
 *
 * @param {string} utcString - ISO 8601 timestamp from Supabase
 * @returns {string} Localized date/time
 */
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

/**
 * Converts seconds to a readable time string.
 * Examples: "45s", "2m 15s"
 *
 * @param {number} seconds - Total playtime in seconds
 * @returns {string} Formatted time
 */
export function formatPlaytime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}