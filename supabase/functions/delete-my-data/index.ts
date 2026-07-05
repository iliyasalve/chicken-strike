// ============================================================
// Edge Function: delete-my-data (GDPR)
// Controlled deletion path. Uses the service-role key so it can
// delete even after the blanket anonymous DELETE policy is
// removed at merge time — closing the "anyone can wipe the whole
// table" hole while keeping self-service deletion working.
//
// Scope guard: deletes ONLY rows matching the requester's own
// user_id. Telegram identity is HMAC-verified from initData;
// browser identity must match the local_<uuid> format. Because
// a single call can only ever target one user_id (not `true`),
// a mass wipe in one request is impossible.
//
// verify_jwt disabled: custom auth implemented below.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const TG_INITDATA_MAX_AGE = 86400;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();

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

async function verifyTelegram(initData: string): Promise<string | null> {
  if (!BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secretKey = await hmacBytes("WebAppData", BOT_TOKEN);
  const computed = toHex(await hmacBytes(secretKey, pairs));
  if (!timingSafeEqual(computed, hash)) return null;
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

  let userId = String(body.userId ?? "");
  const initData = typeof body.initData === "string" ? body.initData : "";

  // Resolve a single, own user_id — never a wildcard.
  if (initData) {
    const tgId = await verifyTelegram(initData);
    if (!tgId) return json({ error: "bad_telegram" }, 401);
    userId = tgId;
  } else {
    if (!/^local_[0-9a-f-]{36}$/.test(userId)) return json({ error: "bad_user" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await supabase
    .from("leaderboard").delete().eq("user_id", userId).select();

  if (error) return json({ success: false, count: 0 }, 500);
  return json({ success: true, count: data?.length ?? 0 });
});
