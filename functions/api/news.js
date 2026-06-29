/**
 * GET /api/news  —  Cloudflare Pages Function
 *
 * Junta varios feeds RSS de medios urbanos (reggaetón / dembow / trap / Latin),
 * los parsea sin librerías y devuelve JSON normalizado:
 *   { items: [ { title, url, source, date, image } ], updated }
 *
 * Sin API key. Tolerante a fallos: cada feed es independiente; si uno cae se ignora.
 * Cacheado en el edge ~30 min para no golpear los feeds en cada visita.
 *
 * Para añadir/quitar fuentes: edita FEEDS abajo (url + nombre legible).
 */

const FEEDS = [
  { url: "https://www.electrowow.net/category/reggaeton/feed", source: "Electro Wow" },
  { url: "https://www.billboard.com/c/music/latin/feed/",      source: "Billboard Latin" },
  { url: "https://latinheat.com/category/music/feed/",         source: "Latin Heat" },
  { url: "https://remezcla.com/feed/",                          source: "Remezcla" },
  // { url: "https://www.billboard.com/c/music/rb-hip-hop/feed/", source: "Billboard Hip-Hop" },
];

const MAX_ITEMS = 16;
const PER_SOURCE = 4;       // máx por fuente → mezcla balanceada, no domina un feed
const FEED_TIMEOUT_MS = 6000;
const CACHE_SECONDS = 1800; // 30 min

export async function onRequest(context) {
  const { request } = context;
  const cache = caches.default;

  // Servir desde el edge si ya está cacheado
  const cached = await cache.match(request);
  if (cached) return cached;

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  let items = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) items = items.concat(r.value);
  }

  // dedupe por url + orden por fecha desc
  const seen = new Set();
  items = items
    .filter((it) => it.url && !seen.has(it.url) && seen.add(it.url))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // cap por fuente para que ningún feed domine, luego recorte global
  const perSource = {};
  items = items
    .filter((it) => {
      perSource[it.source] = (perSource[it.source] || 0) + 1;
      return perSource[it.source] <= PER_SOURCE;
    })
    .slice(0, MAX_ITEMS)
    .map(({ ts, ...rest }) => rest);

  const body = JSON.stringify({ items, updated: new Date().toISOString() });
  const res = new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      "Access-Control-Allow-Origin": "*",
    },
  });

  context.waitUntil(cache.put(request, res.clone()));
  return res;
}

/* ── fetch + parse de un feed ─────────────────────────────────────────── */
async function fetchFeed({ url, source }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "ClavoRecordsBot/1.0 (+https://clavorecords.com)" },
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    return parseRss(xml, source);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseRss(xml, source) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const out = [];
  for (const block of blocks) {
    const title = clean(tag(block, "title"));
    const url = clean(tag(block, "link"));
    if (!title || !url) continue;
    const pub = tag(block, "pubDate") || tag(block, "dc:date");
    const ts = pub ? Date.parse(pub) : 0;
    out.push({
      title,
      url,
      source,
      date: pub ? new Date(ts || Date.now()).toISOString() : null,
      image: extractImage(block),
      ts: Number.isNaN(ts) ? 0 : ts,
    });
  }
  return out;
}

/* contenido del primer <tag>…</tag> (con o sin CDATA) */
function tag(block, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/* imagen: media:content / media:thumbnail / enclosure / primer <img> del contenido */
function extractImage(block) {
  let m =
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i);
  if (m) return decodeEntities(m[1]);
  const content =
    tag(block, "content:encoded") || tag(block, "description") || "";
  const img = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? decodeEntities(img[1]) : null;
}

/* decodifica entidades HTML básicas + numéricas */
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/* decodifica + quita tags sobrantes y colapsa espacios (para títulos) */
function clean(str) {
  if (!str) return "";
  return decodeEntities(str.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}
