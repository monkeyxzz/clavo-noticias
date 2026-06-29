/**
 * GET /api/resolve?url=<youtube-url>
 *
 * Parsea la URL → { videoId, type, title }. Pide oEmbed para el título.
 * Read-only, público (lo usa el panel para autollenar al agregar un video).
 */
import { parseYouTube } from "../lib/youtube.js";

export async function onRequest(context) {
  const { request } = context;
  const u = new URL(request.url).searchParams.get("url");
  const parsed = parseYouTube(u || "");
  if (!parsed) return json({ error: "URL de YouTube no válida" }, 400);

  let title = "";
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${parsed.videoId}`,
      { headers: { "User-Agent": "ClavoRecordsBot/1.0" } }
    );
    if (r.ok) {
      const d = await r.json();
      title = (d.title || "").slice(0, 160);
    }
  } catch { /* título opcional */ }

  return json({ videoId: parsed.videoId, type: parsed.type, title });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
