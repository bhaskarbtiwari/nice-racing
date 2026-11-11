const puppeteer = require('puppeteer-core');
(async ()=>{
  try{
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
    let pages = await browser.pages();
    let page = pages.find(p=>p.url().includes('localhost:8000'));
    if(!page) page = await browser.newPage();
    console.log('Navigating to http://localhost:8000');
    await page.goto('http://localhost:8000',{waitUntil:'load',timeout:10000});

    // capture console
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.waitForFunction('window._CAR_DEMO && window._CAR_DEMO.start', {timeout:8000});
    console.log('Starting a race with the GTR_R35');
    const loaded = await page.evaluate(async () => {
      await window._CAR_DEMO.start({ mode: 1, track: 'circuit', car1: 'GTR_R35', car2: 'GTR_R35' });
      return !!(window._CAR_DEMO.car && window._CAR_DEMO.car.obj);
    });
    console.log('Model load result:', loaded);

    // run simulation: forward for 4 seconds
    console.log('Running simulate forward 4s');
    const result = await page.evaluate(()=>{
      if(!window._CAR_DEMO || !window._CAR_DEMO.simulate) return {error:'simulate missing'};
      window._CAR_DEMO.reset();
      window._CAR_DEMO.simulate([{t:0, controls:{forward:true}},{t:4, controls:{}}],6,0.02);
      const c = window._CAR_DEMO.car && window._CAR_DEMO.car.obj ? window._CAR_DEMO.car.obj.position : null;
      const s = window._CAR_DEMO.state;
      return { pos: c ? {x:c.x.toFixed(3),y:c.y.toFixed(3),z:c.z.toFixed(3)} : null, speed: s.speed, onTrack: s.onTrack };
    });
    console.log('Simulate result:', result);

    await browser.disconnect();
  }catch(e){ console.error('Error',e); process.exit(1);} 
})();
