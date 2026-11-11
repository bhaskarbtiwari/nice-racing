# nice: 3D racing game

Three.js racing game: 1 player vs a computer driver, or 2 players on a split screen. Pick mode, track (the Track button opens a card picker), cars and laps on the start menu, then press START RACE. Rules: `CONSTITUTION.md`.

## Files
- `index.html`: start menu, HUD containers, import map (three@0.158.0 from unpkg)
- `main.js`: all game code, one IIFE. Data tables at the top: `THEMES`, `TRACKS`, `CARS`. Exposes `window._CAR_DEMO`
- `style.css`: menu, HUD and overlay styles
- `models/*.glb`: car models (credits in `models/CREDITS.md`). To add a car: drop the file in `models/` and add a row to `CARS` (`flip: true` if it faces backwards). Wheels are found by node name (anything with "wheel", "rim", "tyre" or "tire"): they spin, and the front ones steer. Models without named wheels (the Dune Buggy) keep rigid wheels. `steerWheels: false` on a `CARS` row keeps its front wheels straight (used for the Concept Car). Open the page as `?wheels=static`, `?wheels=nospin` or `?wheels=nosteer` to isolate a wheel problem. Keep each under ~150k triangles, since both cars render in both views
- `tests/*.js`: Puppeteer scripts
- `agents/`: unrelated checkout, ignore

## Tracks
Six tracks. A track is a closed curve through `points` ([x, z] metres) plus `halfWidth` and a theme (`THEMES`: ground, sky, fog, light, scenery type). The picker cards are built from `TRACKS`, so a new entry appears there automatically. After editing or adding one, run `_CAR_DEMO.checkTracks()` in the console: `clearance` must exceed `needClearance`, and `minRadius` should stay above ~7 m. Scenery is solid: every tree, rock, pillar, building and gate post becomes an entry in `obstacles` when the track is built (see `addProps`), so a new scenery type needs an obstacle shape there too. The computer driver brakes from the curvature automatically, so no per-track tuning.

## Commands
- Run: `python serve.py` (a no-cache server for this folder), then open http://localhost:8000. index.html adds a timestamp to `main.js` and `style.css`, so a normal reload always loads the latest code even with a plain `http.server`
- Test: start Chrome with `--remote-debugging-port=9222`, then `node tests/simulate.js` or `node tests/test_gtr.js`

## Console API (`window._CAR_DEMO`)
`start({mode, track, car1, car2, laps})` applies choices and starts a race. `step(dt)` advances the game without a browser frame. Also `race`, `players`, `sel`, `tracks`, `cars`, `track()`, `checkTracks()`, `ai` (`skill`, `brake`), `reset`, `showMenu`, `loadModel(name)`, `simulate`.

## Controls
1 player: WASD or arrow keys, Space handbrake, R or Enter back to track; player 2 is the computer. 2 players: P1 WASD, Space, R; P2 arrow keys, Right Shift, Enter. Esc or P: pause.
