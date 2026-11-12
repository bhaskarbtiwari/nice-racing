# nice: 3D racing game

Three.js racing game: 1 player vs a computer driver, 2 players on a split screen, or online with up to 8 players (rooms with a 5-character code or an invite link `?room=CODE`). Works on phones with on-screen touch buttons. Pick mode, track (the Track button opens a card picker), cars and laps on the start menu, then press START RACE. Rules: `CONSTITUTION.md`.

## Files
- `index.html`: start menu, HUD containers, import map (three@0.158.0 from unpkg)
- `main.js`: all game code, one IIFE. Data tables at the top: `THEMES`, `TRACKS`, `CARS`, `CAR_STATS` (top speed, acceleration, braking, steering lock and response, grass grip per car; the menu shows them as bars and the computer driver uses its own car's values). Exposes `window._CAR_DEMO`
- `style.css`: menu, HUD and overlay styles
- `models/*.glb`: car models (credits in `models/CREDITS.md`). To add a car: drop the file in `models/` and add a row to `CARS` (`flip: true` if it faces backwards). Wheels are found by node name (anything with "wheel", "rim", "tyre" or "tire"): they spin, and the front ones steer. Models without separate named wheels (the Dune Buggy and the detailed Porsche, McLaren and Mercedes cars) keep rigid wheels. `steerWheels: false` on a `CARS` row keeps its front wheels straight (used for the Concept Car). Open the page as `?wheels=static`, `?wheels=nospin` or `?wheels=nosteer` to isolate a wheel problem. Keep each under ~150k triangles, since both cars render in both views
- `tests/*.js`: Puppeteer scripts
- `agents/`: unrelated checkout, ignore

## Tracks
Six tracks. A track is a closed curve through `points` ([x, z] metres) plus `halfWidth` and a theme (`THEMES`: ground, sky, fog, light, scenery type). The picker cards are built from `TRACKS`, so a new entry appears there automatically. After editing or adding one, run `_CAR_DEMO.checkTracks()` in the console: `clearance` must exceed `needClearance`, and `minRadius` should stay above ~7 m. Scenery is solid: every tree, rock, pillar, building and gate post becomes an entry in `obstacles` when the track is built (see `addProps`), so a new scenery type needs an obstacle shape there too. The computer driver brakes from the curvature automatically, so no per-track tuning.

## Commands
- Run: `python serve.py` (a no-cache server for this folder), then open http://localhost:8000. index.html adds a timestamp to `main.js` and `style.css`, so a normal reload always loads the latest code even with a plain `http.server`
- Host: `.github/workflows/pages.yml` (GitHub Pages) and `.gitlab-ci.yml` (GitLab Pages) publish `index.html`, `main.js`, `style.css` and `models/` on every push to the default branch. The menu's Credits button reads `models/CREDITS.md`, so keep that file current
- Test: start Chrome with `--remote-debugging-port=9222`, then `node tests/simulate.js` or `node tests/test_gtr.js`

## Online and touch
- Online (`mode 3`): WebRTC through PeerJS (loaded from unpkg; its free public broker only introduces players, and it includes a free TURN relay). The room's host relays everyone's position (about 20 a second); each player drives their own car, so there is no anti-cheat. Messages: `hello`, `welcome`, `lobby`, `start`, `ready`, `go`, `s` (state), `bye`, `reject`. Everything from the network is checked in `cleanState` / `cleanEntry`. The code is in the "Online play" section of `main.js`; remote cars live in `remotes`, the local car is always `players[0]`
- Race start is two-step: the host sends `start`, everyone loads the track and cars and sends `ready`, then the host sends `go` (the `race.hold` flag keeps the countdown frozen until then)
- To test with two tabs, drive each with `_CAR_DEMO.step(dt)` plus `_CAR_DEMO.net.tick()` and `.updateRemotes(dt)`, and yield with `MessageChannel` (background tabs throttle timers)
- Touch buttons (`#touch`, shown on touch devices or with `?touch=1`) set the same `controls` as the keyboard

## Console API (`window._CAR_DEMO`)
`start({mode, track, car1, car2, laps})` applies choices and starts a race. `step(dt)` advances the game without a browser frame. Also `net` (online state and helpers), `race`, `players`, `sel`, `tracks`, `cars`, `track()`, `checkTracks()`, `ai` (`skill`, `brake`), `reset`, `showMenu`, `loadModel(name)`, `simulate`.

## Controls
1 player and online: WASD or arrow keys, Space handbrake, R or Enter back to track (in 1 player, player 2 is the computer; online, the other cars are other people). 2 players: P1 WASD, Space, R; P2 arrow keys, Right Shift, Enter. Esc or P: pause.
