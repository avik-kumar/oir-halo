# Ozark International Raceway Sim

Browser minisim for **Halo** (Georgia Tech Solar Racing) at Ozark International Raceway — FSGP 2027. Static HTML/JS/Three.js; no build step required for day-to-day use.

See **[CHANGELOG.md](CHANGELOG.md)** for release notes.

## What you can do

| | **Practice** | **Race** |
|---|---|---|
| Goal | Learn Ozark, feel the car | Put down timed laps for the boards |
| Camera | Chase + cockpit (`C`) | Cockpit locked |
| Map / tuning | Yes (`T`) | Hidden — race pack locked |
| Leaderboard | No | Best valid lap per username |

From the menu: **Practice**, **Race** (enter a username), or **Leaderboards**. Hover the **ⓘ** for a short rules welcome.

## How a race session works

1. Enter a username and start. You’re in the cockpit on Ozark.
2. Cross the yellow start/finish to **start** the clock; next S/F **finishes** the lap. No warmup required.
3. A lap is **valid** only if you stay on track and never reach **65 mph** (FSGP).
4. The HUD shows current lap, **Last**, and **Best** for the session.
5. **`R`** resets only the current attempt (car + in-progress lap). Session best/last stay until you leave.
6. **Save laps & quit** submits your session **best** valid lap, then shows Pace / Efficiency place.

## Leaderboards

One shared log of submitted laps. The UI shows **best per name** on two boards:

- **Pace** — lowest valid lap time  
- **Efficiency** — lowest Wh among valid laps with average speed ≥ **35 mph** (FSGP efficiency gate)

Submitting a faster Pace lap does **not** overwrite your Efficiency best (and vice versa). Both historical rows stay in storage; each board picks its own best.

**Storage:** race quit has the **player’s browser** POST to the shared Google Apps Script web app (`js/leaderboard-config.js` → Sheet). That URL is committed so GitHub Pages and local serve hit the same board. Access is “Anyone” (no token). If `LEADERBOARD_URL` were empty, submits would fall back to **localStorage** only.

## Driving & energy

- **↑** throttle · **↓** friction brake · **←/→** steer  
- Lift throttle = **auto regen** (charges the pack). Friction brake dumps heat — no regen while braking.  
- Practice: **`T`** opens map + **experimental** tunable params (mass, motors, tire grip μ, tire stiffness, irradiance, etc.). Race mode ignores those and uses the fixed Halo race pack.

## Track & car pack

- Track: Ozark International Raceway (`data/track.csv`).  
- Race defaults (locked in Race): mass **315 kg**, **1.8 kW × 2** motors, μ **0.95**, etc. (`js/config.js`).

## Local preview

```bash
npm run serve
```

Open [http://localhost:8080](http://localhost:8080).

## Repo layout

```
index.html              Menu, HUD, boards UI
css/styles.css
data/track.csv          Ozark centerline
data/tracks.json        Track catalog
js/
  main.js               Boot
  config.js             Car / race pack / FSGP thresholds
  sim.js                Physics, rendering, controls
  mode.js               Practice / race / quit / boards
  race.js               Lap validity & session best/last
  tracks.js             Track loading
  leaderboard.js        Fetch / submit / best-per-name
  leaderboard-config.js Shared Sheet web-app URL (tracked)
scripts/
  apps-script-leaderboard.js
  serve.ps1 / serve.sh
```
