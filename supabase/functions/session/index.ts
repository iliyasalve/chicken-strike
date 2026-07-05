// ============================================================
// Edge Function: session
// Issues a signed, server-timestamped session token at game
// start. The token's start time is set server-side, so the
// client cannot forge how long a game actually lasted. On
// submit, `submit-score` recomputes elapsed time from this
// token and rejects scores that grow faster than physically
// possible (rate-based anti-cheat — future endless-mode safe).
//
// Stateless: the token is self-contained and HMAC-signed with
// the service-role key (auto-injected into the Edge runtime),
// so no session table is needed and no extra secret to manage.
//
// verify_jwt is disabled: browser players have no Supabase auth
// session. Authenticity is enforced by the HMAC signature here
// and re-verified in submit-score.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SIGNING_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, msg: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}

// token = base64url(payload).base64url(hmac(payload))
async function issueToken(): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    sid: crypto.randomUUID(),
    iat: Date.now(),
  })));
  const sig = b64url(await hmac(SIGNING_SECRET, payload));
  return `${payload}.${sig}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const token = await issueToken();
  return new Response(JSON.stringify({ token }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
