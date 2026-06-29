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
  // Se usa solo si KV está vacío: 20 shorts dominicanos curados (verificados
  // embebibles). En cuanto guardas tu lista desde /admin, esta deja de usarse.
  const s = (videoId, title) => ({ type: "short", videoId, title });
  return {
    items: [
      s("Bis9DRV6obE", "#GAS"),
      s("xFUyWsYO3Gw", "Rochy RD – La Calle Soy Yo"),
      s("mK7F6r854pE", "El Alfa le manda fuego a Anuel"),
      s("9DvjRfysDqc", "Kiko El Crazy & Dahian El Apechao"),
      s("xPnqB_VdDZw", "Tokischa x Bad Gyal x Young Miko – Chulo Rmx"),
      s("U9Krl3bUNzA", "Chimbala inventa un dembow"),
      s("AvBI6HQbFwY", "Yomel El Meloso – Freestyle"),
      s("twKz18CI9p8", "Rochy RD En Vivo"),
      s("7uEYTmVgNDY", "El Alfa feat. Chimbala"),
      s("oXqc3g8mnIs", "Rochy RD – Locotron Remix"),
      s("eh4-NLi3Zg4", "Kiko El Crazy rompe la cabina"),
      s("rYUUaeQxgmA", "Rosalía y Tokischa – Dembow"),
      s("oAAA3tqqqkE", "Chimbala – Yo soy español"),
      s("7_-I8P-Rt80", "Tokischa #dembow"),
      s("vabK3LuF1b4", "El Alfa en su pasola"),
      s("ngCHM1mxvuI", "Nuevo baile dembow dominicano"),
      s("iYBaQOt-xoo", "Kiko El Crazy en la alfombra"),
      s("SLOqgX5KMfc", "Competencia de baile dembow"),
      s("hqcLlv-3bPs", "Yomel El Meloso en España"),
      s("H2hPVVsj89g", "Perreo dembow viral RD"),
    ],
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
