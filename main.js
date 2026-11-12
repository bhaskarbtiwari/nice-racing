// main.js - Three.js racing game: 1 or 2 players, several tracks and cars, laps, HUD, minimap, pause
(function() {
  console.log('main.js loaded (enhanced)');
  window._CAR_DEMO = window._CAR_DEMO || {};

  let scene, camera, camera2, renderer, container, clock, ground, hemi, amb, sun;
  const WORLD_SIZE = 700;

  // ---------------------------------------------------------------------------
  // Data: themes, tracks, cars
  // ---------------------------------------------------------------------------
  const THEMES = {
    meadow: { ground: 0x6aa84f, sky: 0x9ecff3, fogDensity: 0.0025, hemi: 0.6, amb: 0.08, sun: 1.2, sunColor: 0xffffff, props: 'pine', leaf: 0x2f6b34 },
    desert: { ground: 0xd9b26f, sky: 0xf0c98e, fogDensity: 0.0022, hemi: 0.7, amb: 0.1, sun: 1.3, sunColor: 0xfff0d0, props: 'rock', leaf: 0xa8744a },
    snow:   { ground: 0xe9eff3, sky: 0xbdd2e2, fogDensity: 0.0035, hemi: 0.75, amb: 0.12, sun: 1.0, sunColor: 0xf2f6ff, props: 'pine', leaf: 0xdfe9ee },
    night:  { ground: 0x2f4636, sky: 0x141c36, fogDensity: 0.003, hemi: 1.0, amb: 0.4, sun: 0.7, sunColor: 0x9db4ff, props: 'city', leaf: 0x000000 },
    coast:  { ground: 0xe3cf9f, sky: 0x7fcff0, fogDensity: 0.0018, hemi: 0.8, amb: 0.12, sun: 1.35, sunColor: 0xfff3d6, props: 'palm', leaf: 0x2f9a4a },
    canyon: { ground: 0xa8512f, sky: 0xe9a87a, fogDensity: 0.0024, hemi: 0.65, amb: 0.14, sun: 1.25, sunColor: 0xffd9b0, props: 'mesa', leaf: 0xc2693f }
  };

  // Each track is a closed Catmull-Rom curve through [x, z] points (metres), driven in this order.
  const TRACKS = {
    circuit: {
      name: 'Grand Circuit', theme: 'meadow', halfWidth: 8,
      desc: 'Fast and flowing, a good first track',
      points: [[0, -163], [195, -143], [260, -52], [208, 52], [78, 65], [26, 143], [-91, 169], [-221, 117], [-260, -13], [-195, -143]]
    },
    speedway: {
      name: 'Desert Speedway', theme: 'desert', halfWidth: 12,
      desc: 'Wide, flat-out oval with a dip on the back straight',
      points: [[0, 170], [-165, 147], [-285, 85], [-330, 0], [-285, -85], [-165, -150], [-60, -135], [60, -135], [165, -150], [285, -85], [330, 0], [285, 85], [165, 147]]
    },
    alpine: {
      name: 'Alpine Twist', theme: 'snow', halfWidth: 8,
      desc: 'Narrow and technical, lots of braking',
      points: [[0, -200], [150, -200], [240, -150], [220, -70], [130, -30], [200, 30], [250, 110], [190, 190], [90, 170], [40, 100], [-30, 170], [-120, 200], [-220, 150], [-200, 70], [-120, 30], [-210, -30], [-250, -110], [-170, -190]]
    },
    city: {
      name: 'Night City Loop', theme: 'night', halfWidth: 9,
      desc: 'Tight corners between the tower blocks, after dark',
      points: [[-200, -150], [0, -160], [200, -150], [260, -90], [260, 20], [200, 60], [120, 60], [90, 110], [100, 190], [40, 230], [-60, 230], [-100, 170], [-90, 100], [-160, 70], [-250, 60], [-290, -10], [-270, -100]]
    },
    coast: {
      name: 'Coastal Run', theme: 'coast', halfWidth: 10,
      desc: 'Long sweeping bends along the beach, with a twisty middle',
      points: [[-260, -150], [-90, -160], [100, -150], [260, -110], [330, -20], [310, 80], [220, 130], [120, 90], [100, 10], [20, -30], [-70, 0], [-110, 80], [-200, 140], [-300, 100], [-330, 0], [-310, -90]]
    },
    canyon: {
      name: 'Red Canyon', theme: 'canyon', halfWidth: 9,
      desc: 'Switchbacks between the rock pillars, hard on the brakes',
      points: [[0, -220], [120, -210], [200, -150], [180, -70], [90, -40], [60, 30], [130, 90], [220, 110], [250, 190], [170, 250], [60, 230], [0, 160], [-60, 230], [-170, 250], [-250, 190], [-220, 100], [-130, 70], [-100, 0], [-180, -40], [-240, -110], [-190, -190], [-100, -230]]
    }
  };

  // length: metres, flip: turn the model 180 degrees if it faces backwards, steerWheels: false keeps the front wheels straight
  const CARS = {
    GTR_R35: { name: 'Nissan GTR R35', file: 'models/GTR_R35.glb', length: 4.7, plate: 'GTR-035', rearPlate: "CHEENU'S CAR" },
    CarConcept: { name: 'Concept Car', file: 'models/CarConcept.glb', length: 4.4, plate: 'CON-001', steerWheels: false },
    RacerRed: { name: 'Racer (red)', file: 'models/RacerRed.glb', length: 4.2, plate: 'RED-001' },
    RacerPurple: { name: 'Racer (purple)', file: 'models/RacerPurple.glb', length: 4.2, plate: 'PUR-001' },
    RacerYellow: { name: 'Racer (yellow)', file: 'models/RacerYellow.glb', length: 4.2, plate: 'YEL-001' },
    RacerGreen: { name: 'Racer (green)', file: 'models/RacerGreen.glb', length: 4.2, plate: 'GRN-001' },
    FutureRacer: { name: 'Future Racer', file: 'models/carkit/race-future.glb', length: 4.4, plate: 'FUT-001' },
    SportsSedan: { name: 'Sports Sedan', file: 'models/carkit/sedan-sports.glb', length: 4.6, plate: 'SED-001' },
    SportsHatch: { name: 'Sports Hatchback', file: 'models/carkit/hatchback-sports.glb', length: 4.0, plate: 'HAT-001' },
    LuxurySUV: { name: 'Luxury SUV', file: 'models/carkit/suv-luxury.glb', length: 4.8, plate: 'SUV-001' },
    PoliceCar: { name: 'Police Car', file: 'models/carkit/police.glb', length: 4.6, plate: 'POL-001' },
    MiniCar: { name: 'Mini Car', file: 'models/BabylonCar.glb', length: 3.8, plate: 'MIN-001' },
    GroundVehicle: { name: 'Ground Vehicle', file: 'models/GroundVehicle.glb', length: 5.0, plate: 'GRV-001' },
    Buggy: { name: 'Dune Buggy', file: 'models/Buggy.glb', length: 3.8, plate: 'BUG-508' },
    CesiumMilkTruck: { name: 'Milk Truck', file: 'models/CesiumMilkTruck.glb', length: 5.2, plate: 'CMT-314' },
    McLarenF1LM: { name: 'McLaren F1 LM', file: 'models/McLarenF1LM.glb', length: 4.4, plate: 'F1-LM' },
    Porsche911: { name: 'Porsche 911 Turbo (1975)', file: 'models/Porsche911Turbo.glb', length: 4.3, plate: 'P-930' },
    Mercedes300SL: { name: 'Mercedes 300 SL Gullwing', file: 'models/Mercedes300SL.glb', length: 4.5, plate: '300-SL' },
    McLarenMCL35M: { name: 'McLaren F1 car (2021)', file: 'models/McLarenMCL35M.glb', length: 5.4, plate: 'MCL-35' },
    primitive: { name: 'Classic Lambo (built-in)', file: null, length: 4.2, plate: 'LMB-001' }
  };
  const DEFAULT_CAR = 'GTR_R35';

  // Driving stats per car. top: km/h, accel and brake: m/s^2, lock: steering lock at top speed in radians (bigger turns tighter),
  // response: how quickly the wheels follow the keys, grass: share of top speed kept off the tarmac. The faster, more
  // expensive cars are better at everything; trucks and the buggy are slow but the buggy copes with grass.
  const CAR_STATS = {
    McLarenMCL35M:   { top: 310, accel: 36, brake: 62, lock: 0.115, response: 9.0, grass: 0.35 },
    McLarenF1LM:     { top: 290, accel: 31, brake: 54, lock: 0.105, response: 8.5, grass: 0.38 },
    GTR_R35:         { top: 270, accel: 28, brake: 50, lock: 0.100, response: 8.0, grass: 0.40 },
    FutureRacer:     { top: 265, accel: 28, brake: 48, lock: 0.100, response: 8.0, grass: 0.40 },
    CarConcept:      { top: 260, accel: 27, brake: 48, lock: 0.100, response: 8.0, grass: 0.40 },
    primitive:       { top: 250, accel: 24, brake: 44, lock: 0.095, response: 7.5, grass: 0.40 },
    Porsche911:      { top: 240, accel: 22, brake: 42, lock: 0.090, response: 7.0, grass: 0.40 },
    Mercedes300SL:   { top: 225, accel: 19, brake: 38, lock: 0.085, response: 6.5, grass: 0.40 },
    SportsSedan:     { top: 215, accel: 19, brake: 40, lock: 0.085, response: 6.5, grass: 0.42 },
    PoliceCar:       { top: 215, accel: 20, brake: 40, lock: 0.085, response: 6.5, grass: 0.42 },
    SportsHatch:     { top: 200, accel: 18, brake: 38, lock: 0.090, response: 7.0, grass: 0.42 },
    RacerRed:        { top: 195, accel: 18, brake: 36, lock: 0.090, response: 7.0, grass: 0.42 },
    RacerPurple:     { top: 190, accel: 17.5, brake: 36, lock: 0.090, response: 7.0, grass: 0.42 },
    RacerYellow:     { top: 185, accel: 17, brake: 36, lock: 0.090, response: 7.0, grass: 0.42 },
    RacerGreen:      { top: 180, accel: 16.5, brake: 36, lock: 0.090, response: 7.0, grass: 0.42 },
    LuxurySUV:       { top: 185, accel: 16, brake: 34, lock: 0.075, response: 5.5, grass: 0.50 },
    Buggy:           { top: 165, accel: 17, brake: 34, lock: 0.090, response: 7.5, grass: 0.75 },
    MiniCar:         { top: 150, accel: 15, brake: 32, lock: 0.100, response: 8.0, grass: 0.50 },
    GroundVehicle:   { top: 130, accel: 12, brake: 30, lock: 0.060, response: 4.5, grass: 0.55 },
    CesiumMilkTruck: { top: 120, accel: 10, brake: 28, lock: 0.055, response: 4.5, grass: 0.50 }
  };
  const statsFor = id => CAR_STATS[id] || CAR_STATS[DEFAULT_CAR];
  function applyCarStats(state, id) {
    const c = statsFor(id);
    state.baseMaxSpeed = state.maxSpeed = c.top / 3.6;
    state.accel = c.accel; state.brake = c.brake; state.lockMin = c.lock; state.response = c.response; state.grassFactor = c.grass;
  }

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------
  const carState = {
    speed: 0,
    baseMaxSpeed: 69.4, // m/s on tarmac (250 km/h)
    maxSpeed: 69.4,
    accel: 24,
    brake: 48,
    friction: 5,
    steering: 0,
    onTrack: false
  };
  const GRASS_SPEED_FACTOR = 0.4; // top speed on grass relative to tarmac
  const WHEELBASE = 2.6;
  // ?wheels=static (no spin, no steering), nospin or nosteer in the page address helps pin down a wheel problem
  const WHEEL_MODE = new URLSearchParams(location.search).get('wheels') || 'full';
  const MAX_WHEEL_STEP = 0.2; // rad per frame (about 11 degrees): below half the gap between rim spokes, so the wheel never seems to turn backwards
  const LOCK_MAX = 0.55, LOCK_MIN = 0.08; // steering lock at standstill / at top speed (radians)

  const controls = { forward: false, backward: false, left: false, right: false, handbrake: false };
  const controls2 = { forward: false, backward: false, left: false, right: false, handbrake: false };
  const IDLE = { forward: false, backward: false, left: false, right: false, handbrake: false };
  const player2State = { ...carState };
  const players = [
    { controls, state: carState, camera: null, car: null, info: null, race: null, color: '#ffd24a' },
    { controls: controls2, state: player2State, camera: null, car: null, info: null, race: null, color: '#2aa9ff' }
  ];

  // phase: 'menu' -> 'countdown' -> 'racing' -> 'finished'
  const race = { phase: 'menu', countdown: 3, time: 0, paused: false };
  // 1 = you against a computer driver (full screen), 2 = two humans on a split screen
  let mode = 1;
  let laps = 3;
  const sel = { mode: 1, track: 'circuit', car1: DEFAULT_CAR, car2: DEFAULT_CAR, laps: 3 };
  const nameOf = i => mode === 1 ? (i === 0 ? 'You' : 'Computer') : 'Player ' + (i + 1);
  const singleView = () => mode === 1 || race.phase === 'menu';

  // current track
  let currentTrack = null, trackGroup = null, trackHalfWidth = 8, trackLength = 0, trackDs = 3;
  let trackPts = [], trackTan = [], trackVmax = [], trackKappa = [];
  const nSamples = () => trackPts.length;
  // solid scenery for the current track: circles { x, z, r } (trees, rocks, pillars) and boxes { x, z, hx, hz } (buildings)
  let obstacles = [];
  const CAR_R = 1.0; // collision radius of each of the two circles that stand in for a car

  function setPhase(p) {
    race.phase = p;
    document.body.classList.toggle('in-menu', p === 'menu');
    if (container) onWindowResize();
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    const width = Math.max(1, container.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, container.clientHeight || window.innerHeight || 1);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
  }

  function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ecff3);
    scene.fog = new THREE.FogExp2(0x9ecff3, 0.0025);
  }

  function createCamera() {
    const width = Math.max(1, container.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, container.clientHeight || window.innerHeight || 1);
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1200);
    camera2 = new THREE.PerspectiveCamera(60, width / 2 / height, 0.1, 1200);
    players[0].camera = camera;
    players[1].camera = camera2;
  }

  function createLights() {
    hemi = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6); scene.add(hemi);
    amb = new THREE.AmbientLight(0xffffff, 0.08); scene.add(amb);
    sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 80, 50);
    scene.add(sun);
  }

  function createGround() {
    ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4), new THREE.MeshStandardMaterial({ color: 0x6aa84f, roughness: 0.9, metalness: 0.01 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
  }

  function applyTheme(t) {
    ground.material.color.setHex(t.ground);
    scene.background.setHex(t.sky); scene.fog.color.setHex(t.sky); scene.fog.density = t.fogDensity;
    hemi.intensity = t.hemi; amb.intensity = t.amb; sun.intensity = t.sun; sun.color.setHex(t.sunColor);
  }

  // ---------------------------------------------------------------------------
  // Track
  // ---------------------------------------------------------------------------
  function rng(seed) { // small deterministic random generator so a track always looks the same
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // speed at which the steering lock still lets the car follow a bend of the given radius
  function vFromRadius(r, st = carState) {
    const lock = Math.atan(WHEELBASE / r);
    const pace = (LOCK_MAX - lock) / (LOCK_MAX - (st.lockMin ?? LOCK_MIN));
    if (pace >= 1) return st.baseMaxSpeed * 2; // a bend this gentle never limits the car
    return Math.max(14, Math.max(0, pace) * st.baseMaxSpeed * 0.72);
  }

  // sample a track definition into evenly spaced points, tangents and per-point corner speeds
  function samplePath(def) {
    const curve = new THREE.CatmullRomCurve3(def.points.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
    const length = curve.getLength();
    const n = Math.max(300, Math.min(800, Math.round(length / 3)));
    const pts = curve.getSpacedPoints(n).slice(0, n);
    const tan = pts.map((p, i) => pts[(i + 1) % n].clone().sub(pts[(i + n - 1) % n]).normalize());
    const ds = length / n;
    // sharpest curvature over a few window sizes, so an S-bend inside one long window does not cancel out
    const kappa = tan.map((t, i) => {
      let k = 1e-4;
      for (let w = 1; w <= 3; w++) {
        const a = tan[(i + n - w) % n], b = tan[(i + w) % n];
        k = Math.max(k, Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z))) / (2 * w * ds));
      }
      return k;
    });
    const vmax = kappa.map(k => vFromRadius(1 / k));
    return { pts, tan, length, ds, vmax, kappa };
  }

  // nearest centreline sample to a position: { index, dist, onTrack }
  function trackInfo(pos) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < trackPts.length; i++) {
      const dx = pos.x - trackPts[i].x, dz = pos.z - trackPts[i].z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    const dist = Math.sqrt(bestD);
    return { index: best, dist, onTrack: dist <= trackHalfWidth };
  }

  // flat strip following the track between lateral offsets a and b; keep(i) selects segments
  function ribbon(a, b, y, color, keep) {
    const n = trackPts.length, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const p = trackPts[i % n], t = trackTan[i % n];
      pos.push(p.x + t.z * a, y, p.z - t.x * a, p.x + t.z * b, y, p.z - t.x * b);
      if (i < n && (!keep || keep(i))) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    trackGroup.add(mesh);
  }

  function windowTexture() {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
    const c = cv.getContext('2d'); c.fillStyle = '#15171f'; c.fillRect(0, 0, 64, 128);
    const r = rng(7);
    for (let y = 6; y < 124; y += 10) for (let x = 6; x < 58; x += 10) { c.fillStyle = r() < 0.55 ? '#ffd98a' : '#242836'; c.fillRect(x, y, 6, 6); }
    const tex = new THREE.CanvasTexture(cv);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // trees, rocks, pillars or tower blocks beside the track (instanced, so they cost few draw calls)
  // near/spread: distance from the track edge, clear: minimum distance from any part of the track
  const PROP_LAYOUT = {
    pine: { near: 8, spread: 18, clear: 6 }, rock: { near: 8, spread: 18, clear: 6 }, palm: { near: 9, spread: 16, clear: 7 },
    mesa: { near: 16, spread: 45, clear: 12 }, city: { near: 16, spread: 22, clear: 14 }
  };
  function addProps(def, theme, seed) {
    const rand = rng(seed), n = trackPts.length, hw = def.halfWidth, lay = PROP_LAYOUT[theme.props];
    const spots = [];
    for (let i = 0; i < n; i += 4) for (const side of [-1, 1]) {
      const off = side * (hw + lay.near + rand() * lay.spread);
      const p = trackPts[i], t = trackTan[i];
      const pos = new THREE.Vector3(p.x + t.z * off, 0, p.z - t.x * off);
      if (trackInfo(pos).dist < hw + lay.clear) continue;
      spots.push({ pos, s: 0.8 + rand() * 0.8, r: rand() * Math.PI * 2, k: rand() });
    }
    spots.forEach(sp => { // what a car can hit
      const x = sp.pos.x, z = sp.pos.z;
      if (theme.props === 'pine' || theme.props === 'palm') obstacles.push({ x, z, r: 0.9 * sp.s });
      else if (theme.props === 'rock') obstacles.push({ x, z, r: 2.4 * sp.s });
      else if (theme.props === 'mesa') obstacles.push({ x, z, r: (4 + sp.s * 4) * 0.95 });
      else { const h = (12 + sp.s * 8) / 2; obstacles.push({ x, z, hx: h, hz: h }); }
    });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const inst = (geo, mat, fn) => {
      const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
      spots.forEach((s, i) => { fn(s, v, q, sc); m.compose(v, q, sc); mesh.setMatrixAt(i, m); });
      mesh.instanceMatrix.needsUpdate = true; trackGroup.add(mesh);
    };
    const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, extra));
    if (theme.props === 'pine') {
      inst(new THREE.CylinderGeometry(0.35, 0.45, 2.4, 6), std(0x6b4a2b), (s, v, q, sc) => { v.set(s.pos.x, 1.2 * s.s, s.pos.z); q.identity(); sc.setScalar(s.s); });
      inst(new THREE.ConeGeometry(2.4, 6, 7), std(theme.leaf), (s, v, q, sc) => { v.set(s.pos.x, 5.4 * s.s, s.pos.z); q.identity(); sc.setScalar(s.s); });
    } else if (theme.props === 'palm') {
      inst(new THREE.CylinderGeometry(0.3, 0.5, 6, 6), std(0x8a6a43), (s, v, q, sc) => { v.set(s.pos.x, 3 * s.s, s.pos.z); q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (s.k - 0.5) * 0.25); sc.setScalar(s.s); });
      inst(new THREE.SphereGeometry(2.6, 8, 5), std(theme.leaf), (s, v, q, sc) => { v.set(s.pos.x, 6.4 * s.s, s.pos.z); q.setFromAxisAngle(up, s.r); sc.set(s.s * 1.2, s.s * 0.45, s.s * 1.2); });
    } else if (theme.props === 'rock') {
      inst(new THREE.DodecahedronGeometry(2.2, 0), std(theme.leaf, { roughness: 1 }), (s, v, q, sc) => { v.set(s.pos.x, 0.9 * s.s, s.pos.z); q.setFromAxisAngle(up, s.r); sc.set(s.s * 1.4, s.s * (0.6 + s.k * 0.7), s.s); });
    } else if (theme.props === 'mesa') {
      inst(new THREE.CylinderGeometry(0.8, 1, 1, 7), std(theme.leaf, { roughness: 1 }), (s, v, q, sc) => { const h = 12 + s.k * 34, w = 4 + s.s * 4; v.set(s.pos.x, h / 2, s.pos.z); q.setFromAxisAngle(up, s.r); sc.set(w, h, w); });
    } else {
      const mat = new THREE.MeshStandardMaterial({ map: windowTexture(), color: 0xbfc4d6, roughness: 0.8 });
      mat.emissive = new THREE.Color(0x555a6e); mat.emissiveMap = mat.map;
      inst(new THREE.BoxGeometry(1, 1, 1), mat, (s, v, q, sc) => { const h = 22 + s.k * 50; v.set(s.pos.x, h / 2, s.pos.z); q.identity(); sc.set(12 + s.s * 8, h, 12 + s.s * 8); });
    }
  }

  function buildTrack(key) {
    const def = TRACKS[key] || TRACKS.circuit;
    key = TRACKS[key] ? key : 'circuit';
    if (trackGroup) {
      scene.remove(trackGroup);
      trackGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    }
    trackGroup = new THREE.Group(); scene.add(trackGroup);
    obstacles = [];
    const s = samplePath(def);
    trackPts = s.pts; trackTan = s.tan; trackVmax = s.vmax; trackKappa = s.kappa; trackLength = s.length; trackDs = s.ds; trackHalfWidth = def.halfWidth;
    currentTrack = key;
    const theme = THEMES[def.theme]; applyTheme(theme);
    const hw = def.halfWidth;

    ribbon(-hw, hw, 0.02, 0x2b2b30);                                   // tarmac
    ribbon(hw, hw + 1.2, 0.025, 0xd22a2a, i => (i >> 1) % 2 === 0);    // kerbs, red
    ribbon(hw, hw + 1.2, 0.025, 0xf2f2f2, i => (i >> 1) % 2 === 1);    // kerbs, white
    ribbon(-hw - 1.2, -hw, 0.025, 0xd22a2a, i => (i >> 1) % 2 === 0);
    ribbon(-hw - 1.2, -hw, 0.025, 0xf2f2f2, i => (i >> 1) % 2 === 1);
    ribbon(hw - 0.5, hw - 0.2, 0.03, 0xffffff);                        // edge lines
    ribbon(-hw + 0.2, -hw + 0.5, 0.03, 0xffffff);
    ribbon(-0.15, 0.15, 0.03, 0xfff1a8, i => i % 4 < 2);               // dashed centre line

    // start/finish line and gantry at sample 0
    const p = trackPts[0], t = trackTan[0];
    const gate = new THREE.Group();
    gate.position.set(p.x, 0, p.z);
    gate.rotation.y = Math.atan2(t.x, t.z);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16;
    const cx = cv.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { cx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; cx.fillRect(i * 8, j * 8, 8, 8); }
    const line = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
    line.rotation.x = -Math.PI / 2; line.position.y = 0.035; gate.add(line);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x333842, roughness: 0.6 });
    [-1, 1].forEach(sd => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), postMat); post.position.set(sd * (hw + 2), 3.5, 0); gate.add(post); });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 4.6, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0xd22a2a, roughness: 0.5, emissive: 0x330000 }));
    beam.position.y = 7; gate.add(beam);
    trackGroup.add(gate);
    [-1, 1].forEach(sd => { const off = sd * (hw + 2); obstacles.push({ x: p.x + t.z * off, z: p.z - t.x * off, r: 0.7 }); });

    addProps(def, theme, key.length * 977 + 13);
    initMinimapTransform();
  }

  // put a car on the starting grid, just behind the start line
  function placeOnGrid(obj, playerIndex) {
    const i = nSamples() - 6, p = trackPts[i], t = trackTan[i];
    const lat = playerIndex === 0 ? 3.5 : -3.5;
    obj.position.set(p.x + t.z * lat, 0, p.z - t.x * lat);
    obj.rotation.set(0, Math.atan2(t.x, t.z), 0);
  }

  // ---------------------------------------------------------------------------
  // Cars
  // ---------------------------------------------------------------------------
  function addNumberPlates(parent, front, rear, width, height, length, y) {
    function plate(label, registration) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const context = canvas.getContext('2d');
      context.fillStyle = '#f7f7f2'; context.fillRect(0, 0, canvas.width, canvas.height);
      const wide = label === "CHEENU'S CAR";
      const strip = wide ? 220 : 58;
      context.fillStyle = '#174a9c'; context.fillRect(0, 0, strip, canvas.height);
      context.fillStyle = '#f7f7f2'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.font = wide ? 'bold 18px Arial' : 'bold 34px Arial'; context.fillText('GB', strip / 2, 38);
      context.font = wide ? 'bold 19px Arial' : 'bold 13px Arial'; context.fillText(label, strip / 2, 94);
      context.strokeStyle = '#111111'; context.lineWidth = 7; context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
      context.fillStyle = '#111111';
      context.font = registration.length > 10 ? 'bold 38px Arial' : 'bold 64px Arial';
      context.fillText(registration, strip + (canvas.width - strip) / 2, canvas.height / 2 + 3);
      const texture = new THREE.CanvasTexture(canvas);
      if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    }
    const geo = new THREE.BoxGeometry(width, height, 0.04);
    const f = new THREE.Mesh(geo, plate(front.replace(/-/g, ''), front)); f.position.set(0, y, length / 2 + 0.03); f.userData.owned = true; parent.add(f);
    const r = new THREE.Mesh(geo.clone(), plate(rear.replace(/-/g, ''), rear)); r.position.set(0, y, -length / 2 - 0.03); r.userData.owned = true; parent.add(r);
  }

  function addGlow(root, player) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: player.color, transparent: true, opacity: 0.5, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05; disc.userData.owned = true; root.add(disc);
  }

  // built-in low-poly car, used as a choice and as a fallback when a model fails to load
  function createPrimitiveCar(playerIndex) {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: players[playerIndex].color, metalness: 0.35, roughness: 0.25 });
    const add = (geo, mat, x, y, z, rx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; car.add(m); return m; };
    add(new THREE.BoxGeometry(2.2, 0.28, 4.2), bodyMat, 0, 0.34, 0);
    add(new THREE.BoxGeometry(2.0, 0.12, 1.6), bodyMat, 0, 0.48, 1.0, -0.18);
    add(new THREE.BoxGeometry(1.6, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.9, roughness: 0.1 }), 0, 0.78, -0.6, -0.12);
    const intakeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    add(new THREE.BoxGeometry(0.4, 0.18, 0.8), intakeMat, -1.05, 0.48, -0.2); add(new THREE.BoxGeometry(0.4, 0.18, 0.8), intakeMat, 1.05, 0.48, -0.2);
    add(new THREE.BoxGeometry(1.6, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }), 0, 0.62, -1.9);
    const rearLightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0 });
    const rearL = add(new THREE.BoxGeometry(0.32, 0.08, 0.06), rearLightMat, -0.5, 0.46, -2.05), rearR = add(new THREE.BoxGeometry(0.32, 0.08, 0.06), rearLightMat, 0.5, 0.46, -2.05);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.9 });
    add(new THREE.BoxGeometry(0.28, 0.08, 0.06), lightMat, -0.6, 0.42, 1.95); add(new THREE.BoxGeometry(0.28, 0.08, 0.06), lightMat, 0.6, 0.42, 1.95);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 });
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 20), rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.42, 16);
    const wheels = [], spokeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    for (const [wx, wz] of [[-0.9, 1.0], [0.9, 1.0], [-0.9, -1.0], [0.9, -1.0]]) {
      const steer = new THREE.Group(); steer.position.set(wx, 0.35, wz); car.add(steer);
      const spin = new THREE.Group(); steer.add(spin);
      const tyre = new THREE.Mesh(wheelGeo, wheelMat); tyre.rotation.z = Math.PI / 2; spin.add(tyre);
      const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.z = Math.PI / 2; spin.add(rim);
      spin.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.05), spokeMat)); // a mark on the rim so the spin is visible
      wheels.push({ spin, steer: wz > 0 ? steer : null, r: 0.35 });
    }
    car.userData.rearLights = [rearL, rearR];
    car.userData.ownedAll = true; // every part of the built-in car is created fresh for it
    return { root: car, wheels };
  }

  // Turn a loaded glTF scene into a car 'length' metres long: long axis along +Z, wheels on the ground, centred.
  function normalizeModel(scn, cfg) {
    scn.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(scn, true), sz = all.getSize(new THREE.Vector3());
    const flat = [];
    scn.traverse(o => { // drop ground patches that some models ship with
      if (!o.isMesh) return;
      const s = new THREE.Box3().setFromObject(o, true).getSize(new THREE.Vector3());
      if (s.y < 0.02 * Math.max(s.x, s.z) && s.x * s.z > 0.8 * sz.x * sz.z) flat.push(o);
    });
    flat.forEach(o => o.removeFromParent());
    scn.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = false;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m) return;
        m.side = THREE.DoubleSide;
        // transmission forces an extra full-scene render pass per view, which makes detailed cars lag
        if (m.transmission) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.35); }
      });
    });
    const pivot = new THREE.Group(); pivot.add(scn);
    const root = new THREE.Group(); root.add(pivot);
    root.updateMatrixWorld(true);
    let size = new THREE.Box3().setFromObject(root, true).getSize(new THREE.Vector3());
    if (size.x > size.z) pivot.rotation.y = Math.PI / 2;
    if (cfg.flip) pivot.rotation.y += Math.PI;
    root.updateMatrixWorld(true);
    size = new THREE.Box3().setFromObject(root, true).getSize(new THREE.Vector3());
    pivot.scale.setScalar(cfg.length / size.z);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true), c = box.getCenter(new THREE.Vector3());
    pivot.position.set(-c.x, -box.min.y + 0.02, -c.z);
    return root;
  }

  // Find the wheels of a loaded model by name and rig them: each gets a steer pivot (front wheels only, +Z is the front)
  // and a spin pivot at its centre. Models whose wheels are not named (the Dune Buggy) simply keep rigid wheels.
  function rigWheels(root, cfg) {
    root.updateMatrixWorld(true);
    const parts = [];
    root.traverse(o => {
      if (o === root || !/wheel|rim|tyre|tire/i.test(o.name) || /brake|pad|disc|caliper|steering|interior|pedal/i.test(o.name)) return;
      for (let a = o.parent; a && a !== root; a = a.parent) if (parts.includes(a)) return; // already inside a wheel
      parts.push(o);
    });
    const clusters = [];
    parts.forEach(o => {
      const b = new THREE.Box3().setFromObject(o, true), c = b.getCenter(new THREE.Vector3());
      const hit = clusters.find(k => k.center.distanceTo(c) < 0.45);
      if (hit) { hit.parts.push(o); hit.box.union(b); hit.center = hit.box.getCenter(new THREE.Vector3()); } else clusters.push({ parts: [o], box: b, center: c });
    });
    // a single mesh that holds all four wheels (some detailed models) cannot be spun or steered; leave those rigid
    for (let i = clusters.length - 1; i >= 0; i--) { const sz = clusters[i].box.getSize(new THREE.Vector3()); if (sz.z > 1.8 || sz.y > 1.8) clusters.splice(i, 1); }
    if (!clusters.length) return [];
    const zs = clusters.map(k => k.center.z), mid = (Math.max(...zs) + Math.min(...zs)) / 2;
    return clusters.map(k => {
      const size = k.box.getSize(new THREE.Vector3());
      const steer = new THREE.Group(), spin = new THREE.Group();
      steer.position.copy(k.center); steer.add(spin); root.add(steer);
      root.updateMatrixWorld(true);
      // brake pads and calipers sit inside some wheel groups; they must turn with the steering but not roll with the tyre
      k.parts.forEach(o => {
        const fixed = [];
        o.traverse(d => { if (d !== o && /pad|caliper/i.test(d.name)) fixed.push(d); });
        fixed.forEach(d => steer.attach(d));
      });
      k.parts.forEach(o => spin.attach(o)); // attach keeps each part exactly where it was
      return { spin, steer: (k.center.z > mid + 0.01 && cfg.steerWheels !== false) ? steer : null, r: Math.max(0.15, Math.max(size.y, size.z) / 2) };
    });
  }

  let gltfLoader = null;
  const templates = {};
  function getTemplate(id) {
    if (!templates[id]) {
      const cfg = CARS[id];
      templates[id] = new Promise((resolve, reject) => {
        gltfLoader = gltfLoader || new window.GLTFLoader();
        gltfLoader.load(cfg.file, g => { try { resolve(normalizeModel(g.scene || g.scenes[0], cfg)); } catch (e) { reject(e); } }, undefined, reject);
      });
      templates[id].catch(() => { delete templates[id]; });
    }
    return templates[id];
  }

  async function makeCar(id, playerIndex) {
    const cfg = CARS[id] || CARS[DEFAULT_CAR];
    const player = players[playerIndex];
    let root, wheels = [];
    if (!cfg.file) {
      ({ root, wheels } = createPrimitiveCar(playerIndex));
    } else {
      try { root = (await getTemplate(id)).clone(true); wheels = rigWheels(root, cfg); } catch (e) {
        console.warn('Car model failed to load, using the built-in car instead:', id, e);
        ({ root, wheels } = createPrimitiveCar(playerIndex));
      }
    }
    const outer = new THREE.Group(); outer.add(root);
    addGlow(outer, player);
    addNumberPlates(outer, cfg.plate, cfg.rearPlate || cfg.plate, 0.9, 0.22, cfg.length, 0.45);
    outer.userData.rearLights = root.userData.rearLights;
    return { obj: outer, wheels };
  }

  // free what a removed car owned (its plates, glow disc and, for the built-in car, everything) so choosing cars again
  // and again in the menu does not pile up graphics memory; the cached model shared by all clones is kept
  function disposeCar(obj) {
    const all = !!(obj.children[0] && obj.children[0].userData.ownedAll);
    obj.traverse(o => {
      if (!o.isMesh || !(all || o.userData.owned)) return;
      if (o.geometry) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!m) return; if (m.map) m.map.dispose(); m.dispose(); });
    });
  }

  let carToken = 0, currentCars = [null, null];
  async function setCars(ids) {
    const token = ++carToken;
    const cars = await Promise.all(ids.map((id, i) => makeCar(id, i)));
    if (token !== carToken) return;
    players.forEach((p, i) => {
      if (p.car) { scene.remove(p.car.obj); disposeCar(p.car.obj); }
      p.car = cars[i]; scene.add(cars[i].obj); placeOnGrid(cars[i].obj, i); applyCarStats(p.state, ids[i]);
      p.state.speed = 0; p.state.steering = 0;
    });
    currentCars = ids.slice();
    window._CAR_DEMO.car = players[0].car;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  const KEYMAP = {
    KeyW: [controls, 'forward'], KeyS: [controls, 'backward'], KeyA: [controls, 'left'], KeyD: [controls, 'right'], Space: [controls, 'handbrake'],
    ArrowUp: [controls2, 'forward'], ArrowDown: [controls2, 'backward'], ArrowLeft: [controls2, 'left'], ArrowRight: [controls2, 'right'], ShiftRight: [controls2, 'handbrake']
  };
  // in 1 player mode the arrow keys drive your car too
  const keyTarget = m => (m[0] === controls2 && mode === 1) ? controls : m[0];

  function keyDown(e) {
    const m = KEYMAP[e.code];
    if (m) { if (race.phase === 'menu') return; e.preventDefault(); keyTarget(m)[m[1]] = true; return; }
    if (e.repeat) return;
    const cr = document.getElementById('credits');
    if (e.code === 'Escape' && cr && cr.style.display === 'flex') { e.preventDefault(); cr.style.display = 'none'; }
    else if (e.code === 'Escape' && pickerOpen()) { e.preventDefault(); togglePicker(false); }
    else if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') respawn(players[0]);
    else if (e.code === 'Enter') { if (race.phase !== 'menu') { e.preventDefault(); respawn(players[mode === 1 ? 0 : 1]); } }
  }

  function keyUp(e) {
    const m = KEYMAP[e.code];
    if (m) { if (race.phase !== 'menu') e.preventDefault(); keyTarget(m)[m[1]] = false; }
  }

  // ---------------------------------------------------------------------------
  // Driving
  // ---------------------------------------------------------------------------
  // Keep a car out of the scenery: two circles (front and back of the car) are pushed out of whatever they overlap,
  // the car loses speed in proportion to how head-on the hit was, and a glancing hit turns it along the obstacle.
  function collideScenery(obj, state) {
    const yaw = obj.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), dir = state.speed >= 0 ? 1 : -1;
    let worst = 0, tx = 0, tz = 0;
    for (const off of [1.4, -1.4]) {
      let cx = obj.position.x + fx * off, cz = obj.position.z + fz * off;
      for (const o of obstacles) {
        let nx, nz, pen;
        if (o.hx === undefined) {
          const dx = cx - o.x, dz = cz - o.z, rr = o.r + CAR_R;
          if (dx * dx + dz * dz >= rr * rr) continue;
          const d = Math.hypot(dx, dz) || 0.001; nx = dx / d; nz = dz / d; pen = rr - d;
        } else {
          const qx = Math.max(o.x - o.hx, Math.min(o.x + o.hx, cx)), qz = Math.max(o.z - o.hz, Math.min(o.z + o.hz, cz));
          const dx = cx - qx, dz = cz - qz, d2 = dx * dx + dz * dz;
          if (d2 >= CAR_R * CAR_R) continue;
          if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = CAR_R - d; }
          else { // the circle's centre is inside the box: leave through the nearest face
            const px = o.hx - Math.abs(cx - o.x), pz = o.hz - Math.abs(cz - o.z);
            if (px < pz) { nx = Math.sign(cx - o.x) || 1; nz = 0; pen = px + CAR_R; } else { nx = 0; nz = Math.sign(cz - o.z) || 1; pen = pz + CAR_R; }
          }
        }
        obj.position.x += nx * pen; obj.position.z += nz * pen; cx += nx * pen; cz += nz * pen;
        const into = -dir * (fx * nx + fz * nz);
        if (into > worst) { worst = into; tx = -nz; tz = nx; if (dir * (fx * tx + fz * tz) < 0) { tx = -tx; tz = -tz; } }
      }
    }
    if (worst > 0) {
      state.speed *= 1 - 0.85 * Math.min(1, worst);
      if (dir > 0) { // swing the nose toward the way along the obstacle
        let diff = Math.atan2(tx, tz) - obj.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        obj.rotation.y += diff * 0.3 * Math.min(1, worst);
      }
    }
  }

  function updateCar(dt, player = players[0]) {
    const c = player.car; if (!c) return;
    const state = player.state, obj = c.obj;
    const ctl = (player.race && player.race.finish != null) ? IDLE : player.controls;

    const info = trackInfo(obj.position);
    player.info = info;
    state.onTrack = info.onTrack;
    state.maxSpeed = info.onTrack ? state.baseMaxSpeed : state.baseMaxSpeed * (state.grassFactor ?? GRASS_SPEED_FACTOR);

    // throttle, brake, coast
    if (ctl.forward) state.speed += (state.speed < 0 ? state.brake : state.accel) * dt;
    else if (ctl.backward) state.speed -= (state.speed > 0 ? state.brake : state.accel * 0.6) * dt;
    else state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), state.friction * dt);
    if (ctl.handbrake) state.speed *= Math.max(0, 1 - 4 * dt);

    // above the surface's top speed (e.g. running onto grass): bleed speed off instead of snapping
    const over = Math.abs(state.speed) - state.maxSpeed;
    if (over > 0) state.speed -= Math.sign(state.speed) * Math.min(over, Math.max(30, state.accel + 12) * dt);
    state.speed = Math.max(-state.baseMaxSpeed * 0.3, state.speed);

    // steering lock shrinks with speed so the car stays controllable at pace
    const steerInput = typeof ctl.steer === 'number' ? ctl.steer : (ctl.left ? 1 : 0) - (ctl.right ? 1 : 0); // keys are -1/0/1, the computer driver is smooth
    const pace = Math.min(1, Math.abs(state.speed) / state.baseMaxSpeed);
    const lock = LOCK_MAX + ((state.lockMin ?? LOCK_MIN) - LOCK_MAX) * pace;
    state.steering += (steerInput * lock - state.steering) * Math.min(1, (state.response ?? 6) * dt);
    obj.rotation.y += state.speed * Math.tan(state.steering) / WHEELBASE * dt;

    // move
    const yaw = obj.rotation.y;
    obj.position.x += Math.sin(yaw) * state.speed * dt;
    obj.position.z += Math.cos(yaw) * state.speed * dt;

    // world bounds
    const lim = WORLD_SIZE - 1;
    const cxp = Math.max(-lim, Math.min(lim, obj.position.x)), czp = Math.max(-lim, Math.min(lim, obj.position.z));
    if (cxp !== obj.position.x || czp !== obj.position.z) state.speed = 0;
    obj.position.x = cxp; obj.position.z = czp;
    collideScenery(obj, state);

    // wheels roll with the road and the front ones turn with the steering
    // the wheel angle is eased and ignores tiny corrections, so the tyres do not twitch on a straight
    const raw = Math.max(-0.6, Math.min(0.6, state.steering * 1.6));
    c.visSteer = (c.visSteer || 0) + ((Math.abs(raw) < 0.03 ? 0 : raw) - (c.visSteer || 0)) * Math.min(1, 12 * dt);
    // A wheel that turns more than half the gap between its spokes in one frame looks like it jitters or runs backwards
    // (the 'wagon wheel' effect), and it did so whenever a frame took longer than usual, so the turn per frame is capped.
    c.wheels.forEach(w => {
      // however fast the car goes, or however slow the frame, a wheel turns at most MAX_WHEEL_STEP between two frames
      const step = (WHEEL_MODE === 'static' || WHEEL_MODE === 'nospin') ? 0 : Math.sign(state.speed) * Math.min(Math.abs(state.speed) / w.r * dt, MAX_WHEEL_STEP);
      w.spin.rotation.x = (w.spin.rotation.x + step) % (Math.PI * 2);
      if (w.steer) w.steer.rotation.y = (WHEEL_MODE === 'static' || WHEEL_MODE === 'nosteer') ? 0 : c.visSteer;
    });
    const lights = obj.userData && obj.userData.rearLights;
    if (lights) {
      const braking = (ctl.backward || ctl.handbrake) ? 1.2 : 0;
      lights.forEach(l => { if (l.material) l.material.emissiveIntensity = braking; });
    }

    updateCamera(player, dt);
  }

  // Chase camera. It sits a fixed distance behind the car (a little further back at speed), so the car never slides around
  // on screen; only the direction it looks from is eased, and that easing does not depend on the frame time.
  function updateCamera(player, dt) {
    const c = player.car, cam = player.camera; if (!c || !cam) return;
    const pace = Math.min(1, Math.abs(player.state.speed) / player.state.baseMaxSpeed);
    if (player.camYaw === undefined || dt >= 1) player.camYaw = c.obj.rotation.y;
    let d = c.obj.rotation.y - player.camYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    player.camYaw += d * (1 - Math.exp(-7 * dt));
    const dist = 9 + 2.5 * pace, height = 4.2 + 0.8 * pace;
    cam.position.set(c.obj.position.x - Math.sin(player.camYaw) * dist, c.obj.position.y + height, c.obj.position.z - Math.cos(player.camYaw) * dist);
    cam.lookAt(c.obj.position.x, c.obj.position.y + 1.2, c.obj.position.z);
    // widen the view slightly with speed
    const fov = 60 + 12 * pace;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * (1 - Math.exp(-3 * dt)); cam.updateProjectionMatrix(); }
  }

  // slow camera orbit around the cars while the menu is open
  let menuAngle = 0.6;
  function updateMenuCamera(dt) {
    const c = players[0].car; if (!c) return;
    menuAngle += dt * 0.35;
    const mid = players[0].car.obj.position.clone();
    if (mode === 2 && players[1].car) mid.lerp(players[1].car.obj.position, 0.5);
    mid.y = 0.8;
    const dist = mode === 2 ? 13 : 9.5;
    camera.position.set(mid.x + Math.sin(menuAngle) * dist, 2.8, mid.z + Math.cos(menuAngle) * dist);
    const f = mid.clone().sub(camera.position).setY(0).normalize();
    const look = mid.clone().addScaledVector(new THREE.Vector3(-f.z, 0, f.x), -2.3); // car sits right of the menu panel
    if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
    camera.lookAt(look);
  }

  // keep the two cars from driving through each other
  function collideCars() {
    const a = players[0].car, b = players[1].car; if (!a || !b) return;
    const dx = b.obj.position.x - a.obj.position.x, dz = b.obj.position.z - a.obj.position.z;
    const d = Math.hypot(dx, dz), min = 2.6;
    if (d >= min || d < 0.001) return;
    const push = (min - d) / 2, nx = dx / d, nz = dz / d;
    a.obj.position.x -= nx * push; a.obj.position.z -= nz * push;
    b.obj.position.x += nx * push; b.obj.position.z += nz * push;
    players[0].state.speed *= 0.995; players[1].state.speed *= 0.995; // a light scrub, so cars bounce off rather than stick together
  }

  // put a car back on the centre line where it left the track
  function respawn(player) {
    if (race.phase !== 'racing' || race.paused || !player.car || !player.info || player.race.finish != null) return;
    const i = player.info.index, p = trackPts[i], t = trackTan[i];
    player.car.obj.position.set(p.x, 0, p.z);
    player.car.obj.rotation.set(0, Math.atan2(t.x, t.z), 0);
    player.state.speed = 0; player.state.steering = 0;
  }

  // ---------------------------------------------------------------------------
  // Computer driver
  // ---------------------------------------------------------------------------
  // Follows the centre line, brakes for bends it can see coming, and runs a little under the limit so it can be beaten.
  const AI = { skill: 0.96, brake: 28, steerGain: 4 }; // tunable from the console: _CAR_DEMO.ai
  function aiDrive(p, dt) {
    const c = p.car; if (!c) return;
    const ctl = p.controls, st = p.state, n = nSamples(), pos = c.obj.position;
    const info = trackInfo(pos), sp = Math.abs(st.speed);

    // steer toward a point ahead on the centre line
    const ahead = Math.max(2, Math.round((7 + sp * 0.4) / trackDs));
    const tp = trackPts[(info.index + ahead) % n];
    const yaw = c.obj.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
    const dx = tp.x - pos.x, dz = tp.z - pos.z, len = Math.hypot(dx, dz) || 1;
    const cross = (fx * dz - fz * dx) / len;
    ctl.steer = Math.max(-1, Math.min(1, -cross * AI.steerGain)); ctl.handbrake = false;

    // speed we can carry now and still make every bend inside braking distance
    const brk = Math.min(AI.brake, st.brake * 0.6);
    const reach = Math.ceil((sp * sp / (2 * brk) + 14) / trackDs);
    let target = st.baseMaxSpeed;
    for (let k = 0; k <= reach; k += 2) {
      const v = vFromRadius(1 / trackKappa[(info.index + k) % n], st);
      target = Math.min(target, Math.sqrt(v * v + 2 * brk * k * trackDs));
    }
    target *= AI.skill;
    ctl.forward = sp < target; ctl.backward = sp > target + 3;

    // if it gets stuck or lost, put it back on the centre line
    const ai = p.ai || (p.ai = { stuck: 0, off: 0 });
    ai.stuck = (race.time > 2 && sp < 1.5) ? ai.stuck + dt : 0;
    ai.off = info.dist > trackHalfWidth + 3 ? ai.off + dt : 0;
    if (ai.stuck > 2 || ai.off > 2.5) {
      const q = trackPts[info.index], t = trackTan[info.index];
      c.obj.position.set(q.x, 0, q.z); c.obj.rotation.set(0, Math.atan2(t.x, t.z), 0);
      st.speed = 0; st.steering = 0; ai.stuck = 0; ai.off = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Race
  // ---------------------------------------------------------------------------
  function newRaceState() { return { lap: 0, cp: 3, lapStart: 0, last: null, best: null, finish: null, wrongWay: false }; }

  function resetPlayers() {
    players.forEach((p, i) => {
      if (p.car) placeOnGrid(p.car.obj, i);
      p.state.speed = 0; p.state.steering = 0; p.state.maxSpeed = p.state.baseMaxSpeed;
      p.race = newRaceState();
      p.ai = { stuck: 0, off: 0 };
      p.info = null;
      Object.assign(p.controls, IDLE); delete p.controls.steer;
    });
  }

  function startRace() {
    laps = sel.laps; mode = sel.mode;
    document.body.classList.toggle('one-player', mode === 1);
    resetPlayers();
    race.countdown = 3; race.time = 0; race.paused = false;
    setPhase('countdown');
    players.forEach(p => { if (p.car && p.camera) updateCamera(p, 1); });
    showOverlay(null);
    const menu = document.getElementById('menu'); if (menu) menu.style.display = 'none';
  }

  function showMenu() {
    mode = sel.mode;
    document.body.classList.toggle('one-player', mode === 1);
    resetPlayers();
    race.paused = false; race.time = 0;
    showOverlay(null);
    setPhase('menu');
    const menu = document.getElementById('menu'); if (menu) menu.style.display = 'flex';
  }

  // laps are counted by passing the four quarters of the track in order
  function updateProgress(player) {
    const r = player.race, info = player.info, n = nSamples();
    if (!info || !player.car || r.finish != null) return;
    const sector = Math.floor(info.index / (n / 4));
    if (info.onTrack && sector === (r.cp + 1) % 4) {
      r.cp = sector;
      if (sector === 0) {
        if (r.lap > 0) { r.last = race.time - r.lapStart; r.best = r.best == null ? r.last : Math.min(r.best, r.last); }
        r.lapStart = race.time;
        if (r.lap >= laps) r.finish = race.time; else r.lap++;
      }
    }
    const yaw = player.car.obj.rotation.y, t = trackTan[info.index];
    r.wrongWay = player.state.speed > 2 && (Math.sin(yaw) * t.x + Math.cos(yaw) * t.z) < -0.4;
  }

  function score(player) {
    const r = player.race, n = nSamples();
    if (r.finish != null) return 1e9 - r.finish;
    const idx = player.info ? player.info.index : 0;
    const inSector = Math.floor(idx / (n / 4)) === r.cp;
    return r.lap * n + (inSector ? idx : r.cp * n / 4);
  }

  function togglePause() {
    if (race.phase === 'finished' || race.phase === 'menu') return;
    race.paused = !race.paused;
    showOverlay(race.paused ? 'Paused' : null, mode === 1
      ? 'W A S D or arrow keys drive, Space handbrake, R back to track<br>Esc or P: pause'
      : 'Player 1: W A S D drive, Space handbrake, R back to track<br>Player 2: Arrow keys drive, Right Shift handbrake, Enter back to track<br>Esc or P: pause');
  }

  // ---------------------------------------------------------------------------
  // HUD and menu
  // ---------------------------------------------------------------------------
  const hud = [];
  let overlayEl, countdownEl, minimap, mapCtx, mapXform;

  function fmt(t) {
    if (t == null) return '--:--.-';
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }

  function initMinimapTransform() {
    if (!minimap) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    trackPts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
    const pad = 14, s = Math.min((minimap.width - pad * 2) / (maxX - minX), (minimap.height - pad * 2) / (maxZ - minZ));
    // viewed from above with +Z up, so +X is to the left
    mapXform = p => [minimap.width / 2 - (p.x - (minX + maxX) / 2) * s, minimap.height / 2 - (p.z - (minZ + maxZ) / 2) * s];
  }

  function initHud() {
    ['hud1', 'hud2'].forEach((id, i) => {
      const el = document.getElementById(id); if (!el) return;
      el.innerHTML = '<div class="stats"><div class="place"></div><div class="lap"></div><div class="time"></div><div class="best"></div></div>' +
        '<div class="msg"></div><div class="speedo"><span class="kmh">0</span> km/h<div class="bar"><i></i></div></div>';
      el.style.setProperty('--accent', players[i].color);
      const q = s => el.querySelector(s);
      hud[i] = { place: q('.place'), lap: q('.lap'), time: q('.time'), best: q('.best'), msg: q('.msg'), kmh: q('.kmh'), bar: q('.bar i') };
    });
    overlayEl = document.getElementById('overlay');
    countdownEl = document.getElementById('countdown');
    minimap = document.getElementById('minimap');
    if (minimap) mapCtx = minimap.getContext('2d');
  }

  function showOverlay(title, body) {
    if (!overlayEl) return;
    overlayEl.style.display = title ? 'flex' : 'none';
    if (!title) return;
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlayBody').innerHTML = body || '';
    document.getElementById('resumeBtn').style.display = race.phase === 'finished' ? 'none' : '';
  }

  function updateHud() {
    if (race.phase === 'menu') return;
    const ahead = score(players[0]) >= score(players[1]) ? 0 : 1;
    players.forEach((p, i) => {
      if (i === 1 && mode === 1) return; // the computer car has no HUD
      const h = hud[i], r = p.race; if (!h || !r) return;
      const kmh = Math.abs(p.state.speed) * 3.6;
      h.place.textContent = i === ahead ? '1st' : '2nd';
      h.lap.textContent = 'Lap ' + Math.max(1, r.lap) + '/' + laps;
      h.time.textContent = 'Time ' + fmt(r.finish != null ? r.finish : race.time);
      h.best.textContent = 'Best lap ' + fmt(r.best);
      h.kmh.textContent = Math.round(kmh);
      h.bar.style.width = Math.min(100, kmh / (p.state.baseMaxSpeed * 3.6) * 100) + '%';
      h.msg.textContent = r.finish != null ? 'Finished ' + (i === ahead ? '1st' : '2nd') : r.wrongWay ? 'Wrong way' : (race.phase === 'racing' && !p.state.onTrack) ? 'Off track' : '';
    });
    if (countdownEl) countdownEl.textContent = race.phase === 'countdown' ? String(Math.ceil(race.countdown)) : (race.phase === 'racing' && race.time < 1) ? 'GO!' : '';
  }

  function drawMinimap() {
    if (!mapCtx || !mapXform || race.phase === 'menu') return;
    const ctx = mapCtx;
    ctx.clearRect(0, 0, minimap.width, minimap.height);
    ctx.beginPath();
    trackPts.forEach((p, i) => { const [x, y] = mapXform(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3; ctx.stroke();
    const [sx, sy] = mapXform(trackPts[0]);
    ctx.fillStyle = '#fff'; ctx.fillRect(sx - 2, sy - 5, 4, 10);
    players.forEach(p => {
      if (!p.car) return;
      const [x, y] = mapXform(p.car.obj.position);
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    });
  }

  let loading = false;
  function setLoading(v) {
    loading = v;
    const b = document.getElementById('startBtn');
    if (b) { b.disabled = v; b.textContent = v ? 'Loading...' : 'START RACE'; }
  }

  // apply the menu choices to the scene so the player sees the track and cars behind the panel
  let applyChain = Promise.resolve();
  function applySelection() {
    applyChain = applyChain.then(async () => {
      setLoading(true);
      try {
        if (currentTrack !== sel.track) buildTrack(sel.track);
        const same = currentCars[0] === sel.car1 && currentCars[1] === sel.car2 && players[0].car && players[1].car;
        if (same) players.forEach((p, i) => placeOnGrid(p.car.obj, i)); else await setCars([sel.car1, sel.car2]);
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return applyChain;
  }

  // small stat bars under each car choice; the best car in each row fills the bar
  function renderCarStats() {
    const best = { top: 310, accel: 36, handling: 1 };
    const handling = c => Math.min(1, (c.lock / 0.115) * 0.6 + (c.response / 9) * 0.4);
    [['car1Stats', sel.car1], ['car2Stats', sel.car2]].forEach(([id, car]) => {
      const el = document.getElementById(id); if (!el) return;
      const c = statsFor(car), bar = (label, v) => '<div class="bar"><span>' + label + '</span><u><i style="width:' + Math.round(Math.min(1, v) * 100) + '%"></i></u></div>';
      el.innerHTML = '<div class="top"><span>' + CARS[car].name + '</span><b>' + c.top + ' km/h</b></div>' +
        bar('Top speed', c.top / best.top) + bar('Acceleration', c.accel / best.accel) + bar('Handling', handling(c) / best.handling);
    });
  }

  function refreshMenuLabels() {
    renderCarStats();
    const $ = id => document.getElementById(id);
    if ($('car1Label')) $('car1Label').textContent = sel.mode === 1 ? 'Your car' : 'Player 1 car';
    if ($('car2Label')) $('car2Label').textContent = sel.mode === 1 ? 'Computer car' : 'Player 2 car';
    const t = TRACKS[sel.track];
    if ($('trackInfo')) $('trackInfo').textContent = t.desc;
    if ($('trackBtn')) $('trackBtn').textContent = t.name;
    document.querySelectorAll('.tcard').forEach(c => c.classList.toggle('on', c.dataset.key === sel.track));
    document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === sel.mode));
    mode = sel.mode;
    document.body.classList.toggle('one-player', mode === 1);
    if (container) onWindowResize();
  }

  // track picker: one card per track with a drawn outline, length and difficulty
  function togglePicker(open) {
    const el = document.getElementById('trackPicker');
    if (el) el.style.display = open ? 'flex' : 'none';
  }
  const pickerOpen = () => { const el = document.getElementById('trackPicker'); return !!el && el.style.display === 'flex'; };

  function buildTrackPicker() {
    const grid = document.getElementById('trackGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (const [key, def] of Object.entries(TRACKS)) {
      const s = samplePath(def), th = THEMES[def.theme];
      const cv = document.createElement('canvas'); cv.width = 250; cv.height = 150;
      const c = cv.getContext('2d'), hex = h => '#' + h.toString(16).padStart(6, '0');
      c.fillStyle = hex(th.ground); c.fillRect(0, 0, 250, 150);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, 250, 150);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      s.pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
      const k = Math.min(210 / (x1 - x0), 112 / (z1 - z0));
      c.beginPath();
      s.pts.forEach((p, i) => { const x = 125 - (p.x - (x0 + x1) / 2) * k, y = 75 - (p.z - (z0 + z1) / 2) * k; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
      c.closePath(); c.lineJoin = 'round';
      c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 9; c.stroke();
      c.strokeStyle = '#e8e8ec'; c.lineWidth = 5; c.stroke();
      const sx = 125 - (s.pts[0].x - (x0 + x1) / 2) * k, sy = 75 - (s.pts[0].z - (z0 + z1) / 2) * k;
      c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fill();
      const slow = Math.min(...s.vmax) * 3.6, diff = slow > 300 ? 'easy' : slow > 140 ? 'medium' : 'hard';
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'tcard'; card.dataset.key = key;
      card.appendChild(cv);
      const info = document.createElement('div'); info.className = 'tinfo';
      info.innerHTML = '<div class="tname"></div><div class="tmeta"></div><div class="tdesc"></div>';
      info.querySelector('.tname').textContent = def.name;
      info.querySelector('.tmeta').textContent = (s.length / 1000).toFixed(1) + ' km, ' + def.halfWidth * 2 + ' m wide ';
      const badge = document.createElement('span'); badge.className = 'tdiff ' + diff; badge.textContent = diff; info.querySelector('.tmeta').appendChild(badge);
      info.querySelector('.tdesc').textContent = def.desc;
      card.appendChild(info);
      card.addEventListener('click', () => { sel.track = key; refreshMenuLabels(); togglePicker(false); applySelection(); });
      grid.appendChild(card);
    }
  }

  // credits screen: reads models/CREDITS.md so the list only has to be kept in one place
  function showCredits() {
    const box = document.getElementById('credits'), body = document.getElementById('creditsBody');
    box.style.display = 'flex';
    fetch('models/CREDITS.md', { cache: 'no-store' }).then(r => r.ok ? r.text() : Promise.reject(r.status)).then(text => {
      const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const items = [], notes = [];
      text.split(/\r?\n/).forEach(line => {
        if (/^\|\s*-/.test(line) || /^\|\s*File\s*\|/i.test(line)) return;
        if (line.startsWith('|')) {
          const c = line.split('|').slice(1, -1).map(x => x.trim().replace(/`/g, ''));
          if (c.length >= 3) items.push('<li><b>' + esc(c[0]) + '</b><small>' + esc(c[1]) + ' (' + esc(c[2]) + ')</small></li>');
        } else if (line.trim() && !line.startsWith('#')) notes.push('<p>' + esc(line.replace(/`/g, '')) + '</p>');
      });
      body.innerHTML = '<ul style="padding-left:18px;margin:0">' + items.join('') + '</ul>' + notes.join('') +
        '<p>Three.js (MIT licence) is loaded from unpkg.</p>';
    }).catch(() => { body.textContent = 'The credits list could not be loaded.'; });
  }

  function initMenu() {
    const $ = id => document.getElementById(id);
    const fill = (id, entries, value) => {
      const el = $(id); if (!el) return;
      el.innerHTML = entries.map(([v, label]) => '<option value="' + v + '">' + label + '</option>').join('');
      el.value = String(value);
    };
    buildTrackPicker();
    const carEntries = Object.entries(CARS).map(([k, c]) => [k, c.name]);
    fill('car1Select', carEntries, sel.car1); fill('car2Select', carEntries, sel.car2);
    fill('lapsSelect', [[1, '1 lap'], [3, '3 laps'], [5, '5 laps']], sel.laps);
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    document.querySelectorAll('#modeSeg button').forEach(b => b.addEventListener('click', () => { sel.mode = Number(b.dataset.v); refreshMenuLabels(); b.blur(); }));
    on('car1Select', 'change', e => { sel.car1 = e.target.value; renderCarStats(); applySelection(); e.target.blur(); });
    on('car2Select', 'change', e => { sel.car2 = e.target.value; renderCarStats(); applySelection(); e.target.blur(); });
    on('lapsSelect', 'change', e => { sel.laps = Number(e.target.value); e.target.blur(); });
    const click = (id, fn) => on(id, 'click', e => { e.currentTarget.blur(); fn(); });
    click('startBtn', () => { if (!loading) startRace(); });
    click('resetBtn', () => { if (race.phase !== 'menu') startRace(); });
    click('restartBtn', startRace); click('resumeBtn', togglePause);
    click('menuBtn', showMenu); click('menuBtn2', showMenu);
    click('trackBtn', () => togglePicker(true)); click('pickerBack', () => togglePicker(false));
    click('creditsBtn', showCredits); click('creditsClose', () => { document.getElementById('credits').style.display = 'none'; });
    refreshMenuLabels();
  }

  // ---------------------------------------------------------------------------
  // Main loop and public API
  // ---------------------------------------------------------------------------
  // restart the race with both cars on the grid
  function resetCar() { startRace(); }

  // debug helper: center camera on car
  function focusCameraOnCar() { updateCamera(players[0], 1); }

  // Simulation helper: run a headless control sequence for player 1 and log results (run from browser console)
  // sequence: array of {t: time in seconds, controls: {forward,backward,left,right}} changes applied at given times
  window._CAR_DEMO.simulate = function(sequence, totalTime = 5, dt = 0.02) {
    const c = window._CAR_DEMO.car; if (!c) { console.warn('no car'); return; }
    resetCar();
    let time = 0; let idx = 0;
    const seq = sequence.slice().sort((a,b)=>a.t-b.t);
    while (time < totalTime) {
      while (idx < seq.length && seq[idx].t <= time) {
        const s = seq[idx++];
        Object.assign(controls, IDLE);
        Object.assign(controls, s.controls || {});
      }
      updateCar(dt);
      time += dt;
    }
    Object.assign(controls, IDLE);
    console.log('simulate done. pos=', c.obj.position, 'speed=', carState.speed, 'onTrack=', carState.onTrack);
  };

  // set the menu choices, apply them and start the race. opts: { mode, track, car1, car2, laps }
  async function start(opts = {}) {
    if (opts.mode) sel.mode = opts.mode;
    if (opts.track && TRACKS[opts.track]) sel.track = opts.track;
    if (opts.car1 && CARS[opts.car1]) sel.car1 = opts.car1;
    if (opts.car2 && CARS[opts.car2]) sel.car2 = opts.car2;
    if (opts.laps) sel.laps = opts.laps;
    refreshMenuLabels();
    await applySelection();
    startRace();
  }

  // measures every track: length, tightest bend, closest approach of distant parts (should be well over the track width)
  function checkTracks() {
    const out = {};
    for (const [k, def] of Object.entries(TRACKS)) {
      const s = samplePath(def), n = s.pts.length;
      let minR = Infinity, clear = Infinity;
      for (let i = 0; i < n; i++) {
        minR = Math.min(minR, 1 / s.kappa[i]);
        for (let j = i + Math.ceil(60 / s.ds); j < n - Math.ceil(60 / s.ds); j++) clear = Math.min(clear, s.pts[i].distanceTo(s.pts[j]));
      }
      let ext = 0; s.pts.forEach(p => { ext = Math.max(ext, Math.abs(p.x), Math.abs(p.z)); });
      out[k] = { length: Math.round(s.length), samples: n, minRadius: +minR.toFixed(1), clearance: +clear.toFixed(1), needClearance: def.halfWidth * 2 + 12, extent: Math.round(ext), slowest: Math.round(Math.min(...s.vmax) * 3.6) + ' km/h' };
    }
    return out;
  }

  function init() {
    container = document.getElementById('canvas-container'); if (!container) { console.error('Missing canvas container'); return; }
    clock = new THREE.Clock();
    createScene(); createCamera(); createRenderer(); createLights(); createGround(); initHud();
    buildTrack(sel.track);
    initMenu();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    window._CAR_DEMO.scene = scene; window._CAR_DEMO.camera = camera; window._CAR_DEMO.renderer = renderer;
    showMenu();
    applySelection();
    animate();
  }

  function onWindowResize() {
    const w = Math.max(1, container.clientWidth || window.innerWidth || 1);
    const h = Math.max(1, container.clientHeight || window.innerHeight || 1);
    camera.aspect = (singleView() ? w : w / 2) / h;
    camera.updateProjectionMatrix();
    camera2.aspect = (w / 2) / h;
    camera2.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function renderSplitScreen() {
    const width = Math.max(1, container.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, container.clientHeight || window.innerHeight || 1);
    if (singleView()) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
      renderer.render(scene, camera);
      return;
    }
    const halfWidth = Math.floor(width / 2);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    renderer.render(scene, camera);
    renderer.setViewport(halfWidth, 0, width - halfWidth, height);
    renderer.setScissor(halfWidth, 0, width - halfWidth, height);
    renderer.render(scene, camera2);
    renderer.setScissorTest(false);
  }

  function step(dt) {
    if (race.phase === 'menu') { updateMenuCamera(dt); return; }
    if (race.paused) return;
    if (race.phase === 'countdown') {
      if (!players.every(p => p.car)) return;
      race.countdown -= dt;
      if (race.countdown <= 0) setPhase('racing');
      players.forEach(p => updateCamera(p, dt));
      return;
    }
    if (!players.every(p => p.car)) return; // a car model is still loading
    if (race.phase === 'racing') race.time += dt;
    if (mode === 1 && race.phase === 'racing') aiDrive(players[1], dt);
    players.forEach(p => updateCar(dt, p));
    collideCars();
    if (race.phase !== 'racing') return;
    players.forEach(updateProgress);
    // against the computer the race ends when you finish; with two players, when both have
    const done = mode === 1 ? players[0].race.finish != null : players.every(p => p.race.finish != null);
    if (done) {
      race.phase = 'finished';
      const order = players.map((p, i) => ({ i, r: p.race })).sort((a, b) => (a.r.finish ?? Infinity) - (b.r.finish ?? Infinity));
      const title = mode === 1 ? (order[0].i === 0 ? 'You win!' : 'Computer wins') : 'Player ' + (order[0].i + 1) + ' wins';
      showOverlay(title, order.map((o, k) => (k + 1) + '. ' + nameOf(o.i) + ' &nbsp; ' +
        (o.r.finish != null ? fmt(o.r.finish) + ' &nbsp; (best lap ' + fmt(o.r.best) + ')' : 'still racing')).join('<br>'));
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    try { step(dt); updateHud(); drawMinimap(); } catch (e) { console.error(e); }
    renderSplitScreen();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // export API
  Object.assign(window._CAR_DEMO, {
    update: updateCar, state: carState, reset: resetCar, step, race, players, ai: AI, tracks: TRACKS, cars: CARS, sel,
    start, checkTracks, showMenu, obstacles: () => obstacles,
    track: () => ({ points: trackPts, tangents: trackTan, halfWidth: trackHalfWidth, laps, vmax: trackVmax, ds: trackDs }),
    setMode: m => { sel.mode = m; refreshMenuLabels(); startRace(); },
    // load one model for both cars (kept for the test scripts)
    loadModel: async name => { await start({ car1: name, car2: name }); },
    focus: function() { try { focusCameraOnCar(); } catch(e) { console.warn(e); } }
  });
})();
