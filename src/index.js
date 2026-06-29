/**
 * Worker entry — Clavo Records · Noticias.
 *
 * Sirve los assets estáticos de ./public (index.html) y maneja las rutas de API.
 * Reutiliza las funciones de functions/api/*.js (formato Pages onRequest) pasándoles
 * un "context" equivalente { request, env, waitUntil }.
 *
 * Routing: si la ruta es /api/*, la maneja el Worker; cualquier otra cosa se sirve
 * desde los assets (binding ASSETS).
 */

import { onRequest as newsHandler } from "../functions/api/news.js";
import { onRequest as topHandler } from "../functions/api/topvideos.js";
import { onRequest as wallHandler } from "../functions/api/wall.js";
import { onRequest as resolveHandler } from "../functions/api/resolve.js";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };

    if (pathname === "/api/news") return newsHandler(context);
    if (pathname === "/api/topvideos") return topHandler(context);
    if (pathname === "/api/wall") return wallHandler(context);
    if (pathname === "/api/resolve") return resolveHandler(context);

    // resto → assets estáticos (index.html, admin.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
