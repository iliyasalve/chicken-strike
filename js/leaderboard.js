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

// Pinned to an exact version (not the floating `@2`) so a CDN update
// cannot silently change the code we load. SRI/integrity is not
// supported for ES-module `import` URLs, so version pinning is the
// available mitigation here.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0/+esm';

/* ========================================= */
/* SUPABASE CONNECTION                       */
/* Using anon (public) key — safe for        */
/* frontend use. Protected by RLS policies.  */
/* ========================================= */

const SUPABASE_URL = 'https://jaaolhmbvmoaikwqudoi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y1Ui9F8AuURFjJWWcWJqRg_fGgqjSVi';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ========================================= */
/* EDGE FUNCTIONS (trusted write path)       */
/* Reads (leaderboard fetch, username check) */
/* stay direct — the table is publicly       */
/* readable. All WRITES go through Edge       */
/* Functions so scores are verified and       */
/* anti-cheated server-side; the anon key     */
/* cannot write to the table directly.        */
/* ========================================= */

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/**
 * Raw, signed Telegram initData string (empty outside Telegram).
 * Unlike initDataUnsafe, this is the HMAC-signed payload the
 * server re-verifies to derive a trusted `tg_<id>` identity.
 */
function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

/**
 * Calls an Edge Function with the anon key in the gateway headers.
 * @returns {{status: number, data: any}}
 */
async function callFunction(name, payload) {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/* ========================================= */
/* GAME SESSION (anti-cheat timing)          */
/* Fetched at game start. The token carries a */
/* server-set start time; submit-score        */
/* measures real elapsed time from it, so the */
/* client cannot forge how long a game lasted.*/
/* ========================================= */

let sessionToken = null;

/**
 * Starts a verified game session. Call at game start.
 * Stores the signed token for the next score submission.
 */
export async function startGameSession() {
  try {
    const { data } = await callFunction('session', {});
    sessionToken = data?.token ?? null;
  } catch (err) {
    console.error('Session start error:', err);
    sessionToken = null;
  }
  return sessionToken;
}

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
    // A verified session token is required. If the game-start
    // request failed (e.g. offline), try once more before giving up.
    if (!sessionToken) {
      await startGameSession();
    }

    const { status, data } = await callFunction('submit-score', {
      token: sessionToken,
      score,
      playtime,
      username,
      userId: getUserId(),      // ignored server-side for Telegram users
      initData: getInitData()   // HMAC-verified to derive tg_<id>
    });

    // 200 → { updated: true } (saved) or { updated: false } (not a record)
    if (status === 200) {
      return data;
    }

    // 409 → username taken by another device (also pre-checked client-side)
    if (data?.error === 'name_taken') {
      return { updated: null, error: 'name_taken' };
    }

    console.error('submit-score failed:', status, data);
    return null;

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
    // null (not []) so the UI can tell "failed to load" apart from
    // "genuinely no records" and show an error instead of an empty list
    console.error('Leaderboard fetch error:', err);
    return null;
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
    // null = fetch failed (see getLeaderboard)
    console.error('Full leaderboard fetch error:', err);
    return null;
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
    const { status, data } = await callFunction('delete-my-data', {
      userId: getUserId(),
      initData: getInitData()
    });

    if (status === 200 && data?.success) {
      // Clear all local data
      localStorage.removeItem('chicken_strike_device_id');
      localStorage.removeItem('highScore');
      localStorage.removeItem('gdpr_consent');

      return { success: true, count: data.count || 0 };
    }

    return { success: false, count: 0 };

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