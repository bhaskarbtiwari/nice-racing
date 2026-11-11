---
name: run-game
description: Start the car demo and confirm it renders. Use for "run the game" or to check a change in the browser.
---

1. Start the `car-demo` server from `.claude/launch.json` (port 8000).
2. Open http://localhost:8000 and read the console.
3. Pass if both split-screen views show a car and there are no errors. A 404 for `/primitive` is a known harmless fallback.
