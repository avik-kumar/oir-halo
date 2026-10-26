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
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions** (not “Deploy from a branch”). Save if prompted.
3. Push to `main` / `master`, or run **Actions → Deploy GitHub Pages → Run workflow**.

Site URL: `https://<user>.github.io/<repo>/`

### Deploy failed with `404` / “Failed to create deployment”

That almost always means **Pages is not fully enabled** for the repo yet (the artifact upload can still succeed).

1. Open **Settings → Pages** for the repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** and save.
3. If **Source** was “Deploy from a branch”, switch to **GitHub Actions**, save, wait a minute, then **re-run** the failed workflow (or push an empty commit).
4. Repo must be **public**, or **private with GitHub Pro/Team** and Pages enabled for private repos.
5. For org-owned repos, an org admin may need to allow **Pages** under organization settings.

After a successful run, the Pages URL appears at the top of **Settings → Pages**.

## Track CSV

Edit or replace `data/track.csv`. Columns: `latitude`, `longitude`, and `elevation_ft` (or `elevation_raw_ft`). You can also drag-and-drop a CSV onto the page.

## Regenerating `sim.js` (optional)

If you inline script into HTML again for a one-off edit:

```bash
npm run build:js
```
