# Changelog

All notable changes to the **Ozark International Raceway Sim** (Halo @ FSGP 2027).

Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [1.2.0] — 2026-10-27

### Fixed
- Chase / aerial camera no longer pumps fore–aft: hard-follow position with dt-scaled yaw smoothing and a shared heading for offset + look-at.

### Changed
- Landing branding: **Halo — FSGP 2027** title, Ozark subtext, ⓘ tip next to subtext.
- Leaderboard refresh control uses a circular-arrow icon.
- Menu / Save & quit controls use translucent HUD-style panels.
- Race lobby no longer shows the old “cockpit only…” hint line.
- Keyboard drive/hotkeys (arrows, C, T, R) disabled on the menu and username screens.

### Added
- `CHANGELOG.md` with a landing-page Changelog link.

---

## [1.1.0] — 2026-10-27

### Added
- **Practice** and **Race** modes from a landing menu.
- Race flying-lap timing with FSGP validity (on track, under 65 mph).
- Session **Last** / **Best** HUD; **Save laps & quit** submits best lap.
- Dual leaderboards: **Pace** (fastest time) and **Efficiency** (lowest Wh, ≥35 mph avg).
- Shared Google Sheet backend via Apps Script (`js/leaderboard-config.js`, public write).
- Track catalog (`data/tracks.json`) loading Ozark.
- Experimental practice tuning (mass, motors, tire grip, stiffness, irradiance, …).
- Auto regen on lift-throttle; friction brake dumps heat (no regen while braking).
- App logistics README (how modes, boards, and storage work).

### Changed
- Race locks cockpit camera and the fixed Halo race pack.
- `R` resets only the current attempt; session best/last are kept until you leave race.

---

## Links

- Repository: [avik-kumar/oir-halo](https://github.com/avik-kumar/oir-halo)
- Live site: GitHub Pages from this repo
