# nice: 3D car driving demo

Two-player split-screen Three.js game. Rules: `CONSTITUTION.md`.

## Files
- `index.html`: UI, car selector, import map (three@0.158.0 from unpkg)
- `main.js`: all game code, one IIFE; exposes `window._CAR_DEMO` (`loadModel`, `simulate`, `reset`, `focus`, `state`, `car`)
- `style.css`: UI styles
- `models/*.glb`: car models; add new ones to the selector in `index.html` and the path map in `main.js`
- `tests/*.js`: Puppeteer scripts
- `agents/`: unrelated checkout, ignore

## Commands
- Run: `python -m http.server 8000`, then open http://localhost:8000
- Test: start Chrome with `--remote-debugging-port=9222`, then `node tests/simulate.js` or `node tests/test_gtr.js`

## Controls
Player 1: WASD. Player 2: arrow keys.
