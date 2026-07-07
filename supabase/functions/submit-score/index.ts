// ============================================================
// Edge Function: submit-score
// The ONLY trusted writer for the leaderboard. Uses the
// service-role key (bypasses RLS), so once anonymous write
// policies are removed at merge time, this is the single path
// that can insert/update scores.
//
// Enforces, server-side:
//   1. Session token authenticity + real elapsed time (HMAC).
//   2. Rate-based anti-cheat: score <= elapsed*RATE + BASE.
//      RATE is generous to stay valid for a future endless mode;
//      the ceiling grows with real time, not with a fixed cap.
//   3. Telegram identity: if initData is present it is verified
//      by HMAC with the bot token, and user_id is derived
//      server-side (`tg_<id>`) — the client cannot impersonate.
//   4. "Only if better": the previous score is read server-side;
//      the client's claim that it improved is not trusted.
//
// verify_jwt disabled: custom auth (session token + Telegram
// initData) is implemented below.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SIGNING_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN"); // optional

// --- Anti-cheat tuning (rate-based, endless-mode safe) ---
// Endless mode: Monte-Carlo sim peaks at 22 pts/s over any 60s window
// (ideal bot, boss bonus included); RATE = ceil(22 * 1.5) headroom.
// Repeated boss bursts are >= 40s apart, covered by RATE; BASE absorbs
// a single burst on top.
const RATE = 33;   // max plausible points per real second
const BASE = 700;  // absorbs the +500 boss-kill burst + slack
const MAX_SESSION_SECONDS = 86400;
const TG_INITDATA_MAX_AGE = 86400; // reject replayed old initData

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacBytes(key: string | Uint8Array, msg: string): Promise<Uint8Array> {
  const raw = typeof key === "string" ? enc.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg)));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verify session token, return start time (ms) or null.
async function verifyToken(token: string): Promise<number | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(await hmacBytes(SIGNING_SECRET, payload));
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof json.iat !== "number") return null;
    return json.iat;
  } catch {
    return null;
  }
}

// Verify Telegram WebApp initData; return trusted user id or null.
async function verifyTelegram(initData: string): Promise<string | null> {
  if (!BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const pairs = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`).sort().join("\n");

  const secretKey = await hmacBytes("WebAppData", BOT_TOKEN); // key=WebAppData, msg=botToken
  const computed = toHex(await hmacBytes(secretKey, pairs));
  if (!timingSafeEqual(computed, hash)) return null;

  // Freshness: reject stale initData replays.
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || (Date.now() / 1000 - authDate) > TG_INITDATA_MAX_AGE) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "{}");
    return user?.id ? `tg_${user.id}` : null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const token = String(body.token ?? "");
  const score = Number(body.score);
  const playtime = Number(body.playtime);
  let username = String(body.username ?? "").trim();
  let userId = String(body.userId ?? "");
  const initData = typeof body.initData === "string" ? body.initData : "";

  // --- 1. Session token → real elapsed time ---
  const iat = await verifyToken(token);
  if (iat === null) return json({ error: "bad_session" }, 401);
  const elapsed = (Date.now() - iat) / 1000;
  if (elapsed < 0 || elapsed > MAX_SESSION_SECONDS) {
    return json({ error: "session_time" }, 401);
  }

  // --- 2. Value sanity ---
  if (!Number.isInteger(score) || score < 0 || score > 10000000) return json({ error: "score" }, 400);
  if (!Number.isInteger(playtime) || playtime < 0 || playtime > MAX_SESSION_SECONDS) return json({ error: "playtime" }, 400);
  if (username.length < 1 || username.length > 20) return json({ error: "username" }, 400);

  // --- 3. Rate-based anti-cheat (real server time) ---
  if (score > elapsed * RATE + BASE) return json({ error: "implausible" }, 422);

  // --- 4. Identity: Telegram is server-verified; browser is soft ---
  if (initData) {
    const tgId = await verifyTelegram(initData);
    if (!tgId) return json({ error: "bad_telegram" }, 401);
    userId = tgId; // trusted, overrides client claim
  } else {
    if (!/^local_[0-9a-f-]{36}$/.test(userId)) return json({ error: "bad_user" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SIGNING_SECRET);

  // --- 5. "Only if better" decided server-side ---
  const { data: existing } = await supabase
    .from("leaderboard").select("score").eq("user_id", userId).maybeSingle();

  if (existing && score <= existing.score) {
    return json({ updated: false });
  }

  const { error } = await supabase.from("leaderboard").upsert({
    user_id: userId,
    username,
    score,
    playtime,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) {
    // 23505 = unique_violation on username (name taken by another device)
    if ((error as { code?: string }).code === "23505") return json({ error: "name_taken" }, 409);
    return json({ error: "db", detail: error.message }, 500);
  }

  return json({ updated: true });
});
