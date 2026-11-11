const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
(async ()=>{
  const api = 'https://api.github.com/repos/KhronosGroup/glTF-Sample-Models/contents/2.0';
  console.log('Fetching model list...');
  const res = await fetch(api, { headers: { 'User-Agent': 'node' } });
  const list = await res.json();
  const names = list.map(x=>x.name);
  const pattern = ['car','truck','vehicle','buggy','vc','race','police','taxi','van','sports','racecar','wheel'];
  const candidates = names.filter(n => pattern.some(p => n.toLowerCase().includes(p)));
  console.log('Candidates:', candidates);
  fs.mkdirSync('models', { recursive: true });
  const downloaded = [];
  for (const n of candidates) {
    const url = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${n}/glTF-Binary/${n}.glb`;
    const out = path.join('models', `${n}.glb`);
    try {
      const r = await fetch(url);
      if (r.ok) {
        const buf = await r.arrayBuffer();
        fs.writeFileSync(out, Buffer.from(buf));
        console.log('Downloaded', n);
        downloaded.push(n);
      } else {
        console.log('No glb for', n, r.status);
      }
    } catch (e) {
      console.log('Err downloading', n, e.message);
    }
  }
  console.log('Done. Downloaded:', downloaded);
})();
