# Clavo Records · Video Wall

Muro de 20 reproductores de YouTube simultáneos (autoplay muteado), API oficial
IFrame Player. Estático, un solo archivo: `index.html`.

Destino: **noticias.clavorecords.com** (Cloudflare Pages).

## Editar
- IDs de video → array `POOL` y `COUNT` al inicio del `<script>` en `index.html`.
- Columnas del grid → variable CSS `--cols`.

## Local
Servir por HTTP (la API de YouTube no funciona con `file://`):

```bash
python -m http.server 8080
# abrir http://localhost:8080
```

## Deploy (Cloudflare Pages)
- Framework preset: **None**
- Build command: *(vacío)*
- Build output directory: `/`
