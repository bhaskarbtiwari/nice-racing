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

    // ensure UI present
    await page.waitForSelector('#carSelect', {timeout:5000});
    // set value and click load
    console.log('Selecting GTR_R35 and loading');
    await page.select('#carSelect','GTR_R35');
    await page.click('#loadCarBtn');

    // wait for model loaded or timeout
    const loaded = await page.evaluate(() => {
      return new Promise(resolve=>{
        let seen=false;
        const timeout = setTimeout(()=>resolve(false),8000);
        const check = ()=>{
          if(window._CAR_DEMO && window._CAR_DEMO.car && window._CAR_DEMO.car.obj){ clearTimeout(timeout); resolve(true); }
        };
        check();
        // also listen to console 'Loaded model' if available
        const orig = console.log;
        console.log = function(){ try{ const s = Array.from(arguments).join(' '); if(s.includes('Loaded model')){ clearTimeout(timeout); resolve(true);} }catch(e){} orig.apply(console,arguments); };
        // poll
        const iv = setInterval(()=>{ if(window._CAR_DEMO && window._CAR_DEMO.car && window._CAR_DEMO.car.obj){ clearInterval(iv); clearTimeout(timeout); resolve(true); } },250);
      });
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
