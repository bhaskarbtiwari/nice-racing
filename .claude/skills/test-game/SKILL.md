---
name: test-game
description: Run the Puppeteer tests for the car demo. Use for "test the game" or after changing main.js.
---

Needs the server on port 8000 and Chrome started with `--remote-debugging-port=9222`.

- `node tests/simulate.js`: driving simulation via `window._CAR_DEMO.simulate`
- `node tests/test_gtr.js`: starts a race with the GTR via `_CAR_DEMO.start`
- `node tests/collect_console.js`: dumps page console output

Report each script's result and any page errors.
