/**
 * /api/wall
 *   GET  → lista de videos del wall desde KV (público). Default si vacío.
 *   POST → guarda la lista. Requiere Authorization: Bearer <ADMIN_PASSWORD>.
 *
 * KV: binding WALL_KV, key "config" = { items:[{type,videoId,title}], updatedAt }.
 * type ∈ "live" | "music" | "short".
 */
const KEY = "config";
const TYPES = new Set(["live", "music", "short"]);
const MAX_ITEMS = 100;
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "GET") return getWall(env);
  if (request.method === "POST") return postWall(request, env);
  return new Response("Method not allowed", { status: 405 });
}

async function getWall(env) {
  let config = null;
  try {
    config = await env.WALL_KV.get(KEY, "json");
  } catch { /* KV no disponible → default */ }

  if (!config || !Array.isArray(config.items) || !config.items.length) {
    config = defaultConfig();
  }
  return json(config, 200, "public, max-age=30");
}

function defaultConfig() {
  // Se usa solo si KV está vacío: el Short que había hardcodeado.
  return {
    items: [{ type: "short", videoId: "Bis9DRV6obE", title: "#GAS" }],
    updatedAt: null,
    isDefault: true,
  };
}

async function postWall(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_PASSWORD || !timingSafeEqual(token, env.ADMIN_PASSWORD)) {
    return json({ error: "No autorizado" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!Array.isArray(body.items)) return json({ error: "Falta 'items'" }, 400);

  const items = [];
  for (const it of body.items.slice(0, MAX_ITEMS)) {
    const videoId = String(it && it.videoId || "").trim();
    if (!ID_RE.test(videoId)) continue;
    const type = TYPES.has(it.type) ? it.type : "music";
    const title = String(it && it.title || "").slice(0, 160);
    items.push({ type, videoId, title });
  }
  if (!items.length) return json({ error: "Sin items válidos" }, 400);

  const config = { items, updatedAt: new Date().toISOString() };
  await env.WALL_KV.put(KEY, JSON.stringify(config));
  return json({ ok: true, count: items.length });
}

/* compare de tiempo (cuasi) constante para no filtrar la clave por timing */
function timingSafeEqual(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function json(obj, status = 200, cache) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };
  if (cache) headers["Cache-Control"] = cache;
  return new Response(JSON.stringify(obj), { status, headers });
}
