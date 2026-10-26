# FSGP 2027 Halo V1 – Track Sim

Browser-based minisim for the Halo V1 solar car. **This folder is the entire repository** (GitHub Pages publishes from repo root).

## Layout

```
index.html
css/styles.css
data/track.csv          Default track (latitude, longitude, elevation_ft)
js/
  main.js               Boot + track fetch
  config.js             Vehicle & tuning defaults
  sim.js                Scene, car, track, physics, UI
scripts/                Local dev & optional JS rebuild
```

## Local preview

Requires a static HTTP server (ES modules + `fetch` for the CSV).

```bash
npm run serve
```

Open [http://localhost:8080](http://localhost:8080).  
PowerShell: `.\scripts\serve.ps1`

## GitHub Pages

1. Push **this folder’s contents** as the repo root (`index.html` at top level).
2. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
3. On push to `main` / `master`, the workflow `.github/workflows/pages.yml` deploys the site.

Site URL: `https://<user>.github.io/<repo>/` — paths like `js/main.js` and `data/track.csv` are relative to that root.

## Track CSV

Edit or replace `data/track.csv`. Columns: `latitude`, `longitude`, and `elevation_ft` (or `elevation_raw_ft`). You can also drag-and-drop a CSV onto the page.

## Regenerating `sim.js` (optional)

If you inline script into HTML again for a one-off edit:

```bash
npm run build:js
```
