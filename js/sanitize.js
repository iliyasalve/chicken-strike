/* ========================================= */
/* SANITIZE                                  */
/* Pure, dependency-free escaping so the XSS  */
/* defense (SEC-1) can be unit-tested.        */
/* ========================================= */

/**
 * Escapes HTML-special characters to prevent stored XSS.
 * Usernames come from the database (user-controlled) and are
 * injected into innerHTML templates. Without escaping, a name
 * like `<img src=x onerror=...>` would execute for everyone who
 * views the leaderboard.
 * @param {*} value - Raw value (coerced to string)
 * @returns {string} Safe-to-inject string
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
