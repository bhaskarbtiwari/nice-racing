// Node script to run car simulate tests via Puppeteer-core
// Usage: node tests/simulate.js
(async () => {
  try {
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.connect({browserURL: 'http://localhost:9222'});
    const page = await browser.newPage();
    const url = 'http://localhost:8000';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'load', timeout: 10000 });
    // wait for car demo to be ready
    await page.waitForFunction('window._CAR_DEMO && window._CAR_DEMO.reset && window._CAR_DEMO.simulate', { timeout: 10000 });
    console.log('Car demo available. Resetting...');
    await page.evaluate(() => { window._CAR_DEMO.reset(); });

    // Define sequences to test: approach gap forward
    const tests = [
      { name: 'short-forward', seq: [{ t: 0, controls: { forward: true } }, { t: 1.2, controls: {} }], total: 3 },
      { name: 'approach-and-stop', seq: [{ t: 0, controls: { forward: true } }, { t: 0.8, controls: { forward: false } }], total: 2 }
    ];

    for (const t of tests) {
      console.log('Running test', t.name);
      const out = await page.evaluate(async (seq, total) => {
        // run simulate and capture final state
        window._CAR_DEMO.reset();
        window._CAR_DEMO.simulate(seq, total, 0.02);
        // after simulate (synchronous), read state
        const car = window._CAR_DEMO.car && window._CAR_DEMO.car.obj ? window._CAR_DEMO.car.obj.position : null;
        const state = window._CAR_DEMO.state;
        return {
          pos: car ? { x: car.x.toFixed(3), y: car.y.toFixed(3), z: car.z.toFixed(3) } : null,
          speed: state.speed,
          onTrack: state.onTrack,
          maxSpeed: state.maxSpeed
        };
      }, t.seq, t.total);
      console.log('Result', t.name, out);
    }

    await browser.disconnect();
    console.log('Done.');
  } catch (e) {
    console.error('Error running simulate tests:', e);
    process.exit(1);
  }
})();
