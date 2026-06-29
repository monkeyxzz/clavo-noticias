# Clavo Records · Noticias urbanas

Página de **noticias.clavorecords.com**: titulares **en vivo** de música urbana
(reggaetón / dembow / trap / Latin) arriba, y un **wall de Shorts** verticales
(9:16) de música urbana dominicana (YouTube, autoplay muteado) debajo.

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
- **`GET /api/topvideos`** → `{ videos:[{id,title}], note }`. **INACTIVO** — el wall ahora es
  de Shorts (verticales), no de videos horizontales. La Function queda en el repo por si se
  quiere volver a un wall horizontal de top RD (requeriría la var `YOUTUBE_API_KEY`).

## Editar

- Feeds de noticias → array `FEEDS` en `functions/api/news.js`.
- Shorts del wall → array `SHORTS` en `public/index.html` (id + título). `COUNT = SHORTS.length`.
  Verifica que el Short sea embebible: `playableInEmbed:true` y sin bloqueo de content-ID
  (algunos sellos, p.ej. LatinAutor-UMPG, bloquean reproducción en sitios externos).
  Columnas del grid → variable CSS `--cols`. Celdas verticales → `.cell { aspect-ratio: 9/16 }`.

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
