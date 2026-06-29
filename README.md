# Clavo Records · Noticias urbanas

Página de **noticias.clavorecords.com**: titulares **en vivo** de música urbana
(reggaetón / dembow / trap / Latin) arriba, y un **video wall** de 20 reproductores
de YouTube (autoplay muteado, API IFrame oficial) debajo.

- `index.html` — frontend (hero + copy, cards de noticias, video wall). Estética Clavo (oro/negro, Cinzel).
- `functions/api/news.js` — Cloudflare Pages Function. Junta varios feeds RSS urbanos,
  los parsea sin librerías y devuelve JSON en `GET /api/news`. Sin API key.

## `/api/news`

Devuelve `{ items: [ { title, url, source, date, image } ], updated }`.

- **Fuentes:** array `FEEDS` arriba de `functions/api/news.js`. Hoy: Electro Wow (reggaetón),
  Billboard Latin, Latin Heat, Remezcla. Añadir/quitar = editar ese array (`url` + `source`).
  Verifica que la URL responda XML antes de fijarla (algunos feeds redirigen o están muertos).
- **Balance:** `PER_SOURCE` (4) limita cuántos items aporta cada feed → mezcla, no domina uno.
- **Tolerante a fallos:** cada feed es independiente; si uno cae se ignora. Si caen todos → `items: []`
  y el frontend muestra estado vacío (nunca error roto).
- **Caché:** edge ~30 min (`CACHE_SECONDS`) para no golpear los feeds en cada visita.

## Editar el video wall
- IDs de video → array `POOL` y `COUNT` en el `<script>` de `index.html`.
- Columnas del grid → variable CSS `--cols`.

## Local

Con Functions (recomendado, para probar `/api/news`):

```bash
npx wrangler pages dev . --compatibility-date=2026-06-01 --port 8788
# abrir http://localhost:8788
```

Solo estático (sin noticias): `python -m http.server 8080`.
La API de YouTube **no** funciona con `file://` (error 153 / origen null) — sirve por HTTP.

## Deploy (Cloudflare Pages)
- Framework preset: **None**
- Build command: *(vacío)*
- Build output directory: `/`
- La carpeta `functions/` se detecta sola (Pages Functions) — no requiere build ni dependencias.
