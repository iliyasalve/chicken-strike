/* ========================================= */
/* FORMATTING                                */
/* Pure, dependency-free string formatters so */
/* they can be unit-tested in isolation       */
/* (leaderboard.js pulls Supabase from a CDN  */
/* URL and can't be imported headlessly).     */
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
