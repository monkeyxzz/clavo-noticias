/**
 * parseYouTube(input) → { videoId, type } | null
 *
 * Acepta URLs de YouTube (watch, youtu.be, shorts, live, embed) o un videoId crudo.
 * Deduce el tipo por la forma de la URL:
 *   /shorts/ → "short", /live/ → "live", resto → "music".
 * El tipo es solo una sugerencia (el panel lo puede cambiar a mano).
 */
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTube(input) {
  if (!input) return null;
  const raw = String(input).trim();

  // videoId crudo
  if (ID_RE.test(raw)) return { videoId: raw, type: "music" };

  let url;
  try { url = new URL(raw); } catch { return null; }

  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let videoId = null;
  let type = "music";

  if (host === "youtu.be") {
    videoId = parts[0];
  } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    if (url.pathname.startsWith("/watch")) {
      videoId = url.searchParams.get("v");
    } else if (parts[0] === "shorts") {
      videoId = parts[1]; type = "short";
    } else if (parts[0] === "live") {
      videoId = parts[1]; type = "live";
    } else if (parts[0] === "embed") {
      videoId = parts[1];
    }
  }

  if (!videoId) return null;
  videoId = videoId.slice(0, 11);
  if (!ID_RE.test(videoId)) return null;
  return { videoId, type };
}
