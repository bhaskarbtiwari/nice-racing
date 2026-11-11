---
name: run-game
description: Start the racing game and confirm it works. Use for "run the game" or to check a change in the browser.
---

1. Start the `car-demo` server from `.claude/launch.json` (port 8000).
2. Open http://localhost:8000 (a normal reload loads fresh code) and read the console.
3. Pass if the start menu shows the track and the GTR behind it, START RACE enables, and clicking it runs the countdown with no console errors.
4. For a headless check use `_CAR_DEMO.start({...})` then `_CAR_DEMO.step(0.02)` in a loop: a hidden browser pane throttles animation frames, so do not wait on `requestAnimationFrame`.
