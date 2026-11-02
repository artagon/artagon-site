GitHub Pages via Actions; custom domain; HSTS at CDN; or NGINX/Caddy using deploy configs.

For the server examples, build with `npm run build --ignore-scripts=false`, then copy the contents of `.build/dist/` into the external document root configured in `deploy/Caddyfile` or `deploy/nginx.conf` (currently `/var/www/artagon-web/dist`). The samples serve `404.html` with status 404 for unknown routes.
