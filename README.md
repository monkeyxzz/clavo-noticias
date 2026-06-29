# Clavo Records · Noticias urbanas

Página de **noticias.clavorecords.com**: titulares **en vivo** de música urbana
(reggaetón / dembow / trap / Latin) arriba, y un **video wall** con el Top 20 de
videos musicales de RD (YouTube, autoplay muteado) debajo.

Desplegado como **Cloudflare Worker con static assets** (proyecto `clavo-noticias`,
deploy `npx wrangler deploy`).

## Estructura

```
public/index.html        ← frontend (hero+copy, cards de noticias, video wall)
src/index.js             ← Worker entry: sirve assets + enruta /api/*
functions/api/news.js    ← lógica de /api/news (feeds RSS urbanos → JSON)
functions/api/topvideos.js ← lógica de /api/topvideos (YouTube Data API, top RD)
wrangler.jsonc           ← config del Worker (main + assets binding ASSETS)
```

`src/index.js` reutiliza las funciones `functions/api/*.js` (formato Pages `onRequest`)
pasándoles `{ request, env, waitUntil }`. Así el mismo código sirve para Worker o Pages.

## Rutas API

- **`GET /api/news`** → `{ items:[{title,url,source,date,image}], updated }`.
  Junta feeds RSS urbanos (Electro Wow reggaetón, Billboard Latin, Latin Heat, Remezcla),
  parsea sin librerías, cap `PER_SOURCE` por fuente, cache edge 30 min. Sin API key.
- **`GET /api/topvideos`** → `{ videos:[{id,title}], note }`.
  Top videos musicales de RD vía YouTube Data API (`chart=mostPopular, regionCode=DO,
  videoCategoryId=10`). Requiere la var **`YOUTUBE_API_KEY`**. Sin key → `note:"no-key"`
  y el wall usa la lista fija dominicana de respaldo (`FALLBACK` en index.html).

## Variables de entorno

- **`YOUTUBE_API_KEY`** (secret) — key gratis de YouTube Data API v3.
  Cloudflare: proyecto `clavo-noticias` → Settings → Variables and secrets → Add → redeploy.

## Editar

- Feeds de noticias → array `FEEDS` en `functions/api/news.js`.
- Lista fija del wall (respaldo) → array `FALLBACK` en `public/index.html` (id + título).
  Verifica que el video sea embebible: `playableInEmbed:true` y sin bloqueo de content-ID
  (algunos sellos, p.ej. LatinAutor-UMPG, bloquean reproducción en sitios externos).
- Región del top → `REGION` en `functions/api/topvideos.js`.

## Local

```bash
npx wrangler dev --port 8790
# abrir http://localhost:8790
```

Sirve assets + ambas rutas API. La API de YouTube **no** funciona con `file://`
(error 153 / origen null). Autoplay solo muteado (regla del navegador).

## Deploy

Cloudflare Workers Builds (repo conectado): Build command vacío, Deploy `npx wrangler deploy`.
Cada `git push` a `main` redespliega. Luego: Custom domains → `noticias.clavorecords.com`.
