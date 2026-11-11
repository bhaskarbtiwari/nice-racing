const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
    // find an existing page for localhost:8000 or open new
    let pages = await browser.pages();
    let page = pages.find(p => p.url().includes('localhost:8000'));
    if (!page) page = await browser.newPage();
    const url = 'http://localhost:8000';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'load', timeout: 10000 });

    const logs = [];
    page.on('console', msg => {
      try {
        const args = msg.args();
        // try to serialize
        const text = msg.text();
        logs.push({ type: msg.type(), text });
        console.log('CONSOLE', msg.type(), text);
      } catch (e) {
        console.log('CONSOLE', msg.type(), msg.text());
      }
    });
    page.on('pageerror', err => {
      logs.push({ type: 'pageerror', message: err.message, stack: err.stack });
      console.error('PAGEERROR', err.message);
    });
    page.on('requestfailed', req => {
      const f = req.failure() || {};
      logs.push({ type: 'requestfailed', url: req.url(), error: f.errorText });
      console.log('REQUESTFAILED', req.url(), f.errorText);
    });

    // wait a bit to collect logs (compatibility across puppeteer-core versions)
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n==== Collected console logs ====');
    logs.forEach((l, i) => console.log(i+1, l.type, '-', l.text || l.message || JSON.stringify(l)));

    await browser.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error collecting console logs:', e);
    process.exit(1);
  }
})();
