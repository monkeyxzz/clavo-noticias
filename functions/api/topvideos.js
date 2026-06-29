/**
 * GET /api/topvideos  —  Cloudflare Pages Function
 *
 * Top videos musicales de República Dominicana vía YouTube Data API v3:
 *   videos.list?chart=mostPopular&regionCode=DO&videoCategoryId=10 (Música)
 *
 * Devuelve { videos: [ { id, title } ], note, updated }.
 *
 * Requiere la env var YOUTUBE_API_KEY (Cloudflare Pages → Settings → Environment variables).
 * Sin key → { videos: [], note: "no-key" } y el frontend usa su lista de respaldo.
 *
 * La key NO se expone al navegador: se usa solo aquí, server-side.
 */

const REGION = "DO";        // República Dominicana
const MUSIC_CATEGORY = "10"; // categoría Música
const MAX = 20;
const CACHE_SECONDS = 10800; // 3 h (los charts cambian lento)

export async function onRequest(context) {
  const { request, env } = context;
  const cache = caches.default;

  const cached = await cache.match(request);
  if (cached) return cached;

  const key = env.YOUTUBE_API_KEY;
  let videos = [];
  let note = null;

  if (!key) {
    note = "no-key";
  } else {
    try {
      videos = await fetchChart(key, true);          // música en RD
      if (videos.length < 8) {                        // algunos países no filtran por categoría
        const all = await fetchChart(key, false);
        if (all.length > videos.length) videos = all;
      }
    } catch (e) {
      note = "error";
    }
  }

  const body = JSON.stringify({
    videos: videos.slice(0, MAX),
    note,
    updated: new Date().toISOString(),
  });
  const res = new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // solo cachear cuando hay resultados; así al añadir la key se refresca rápido
      "Cache-Control": videos.length
        ? `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`
        : "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });

  if (videos.length) context.waitUntil(cache.put(request, res.clone()));
  return res;
}

async function fetchChart(key, withCategory) {
  const params = new URLSearchParams({
    part: "snippet",
    chart: "mostPopular",
    regionCode: REGION,
    maxResults: String(MAX),
    key,
  });
  if (withCategory) params.set("videoCategoryId", MUSIC_CATEGORY);

  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`,
    { headers: { Accept: "application/json" } }
  );
  if (!r.ok) throw new Error("YT API " + r.status);
  const data = await r.json();
  return (data.items || [])
    .map((it) => ({ id: it.id, title: it.snippet ? it.snippet.title : "" }))
    .filter((v) => v.id);
}
