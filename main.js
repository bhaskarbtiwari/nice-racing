// main.js - Three.js enhanced car demo: improved visuals, track boost, speedometer
(function() {
  console.log('main.js loaded (enhanced)');
  window._CAR_DEMO = window._CAR_DEMO || {};

  let scene, camera, renderer, container, clock;

  // --- World / gameplay parameters ---
  const WORLD_SIZE = 600;

  // Track area: circular ring (annulus) with a single gap (entry/exit)
  // Make track roughly ~1.2km circumference: radius ~190-195 => circumference ~1200m
  const TRACK = {
    // Reduced track size for tighter driving area
    innerRadius: 95,
    outerRadius: 105,
    gapCenterAngle: Math.PI / 2, // radians, 0 = +X, PI/2 = +Z
    gapSize: Math.PI / 8 // size of gap in radians (~22.5 degrees)
  };

  // Toggle enforcement of track entry/exit blocking. Set to false to allow free entry/exit while debugging.
  const ENFORCE_TRACK_BOUNDARY = true; // restore enforcement by default

  // car state
  const carState = {
    speed: 0,
    baseMaxSpeed: 25,
    maxSpeed: 25,
    accel: 25,
    brake: 40,
    friction: 8,
    steering: 0,
    maxSteering: Math.PI / 6,
    onTrack: false
  };

  // Force primitive car (skip GLTF) if true - set to false to load models/lamborghini.glb when available
  const FORCE_PRIMITIVE_CAR = false;

  const controls = { forward: false, backward: false, left: false, right: false, handbrake: false };

  // speedometer canvas
  let speedometerCanvas, speedometerCtx;

  function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // improved color & tonemapping for more realistic lighting
    // follow r155+ API changes: outputEncoding replaced by outputColorSpace
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace || 'srgb';
    if ('toneMapping' in renderer) renderer.toneMapping = THREE.ACESFilmicToneMapping || THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    // useLegacyLights replaces physicallyCorrectLights
    if ('useLegacyLights' in renderer) renderer.useLegacyLights = false;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
  }

  function createScene() {
    scene = new THREE.Scene();
    // subtle HDR-like sky color
    scene.background = new THREE.Color(0x9ecff3);
    scene.fog = new THREE.FogExp2(0x9ecff3, 0.0025);
  }

  function createCamera() {
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 6, -18);
  }

  function createLights() {
    // hemisphere light for soft sky/ground lighting
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6);
    scene.add(hemi);

    // ambient subtle fill
    const amb = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(amb);

    // stronger sun light for crisp shadows
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 80, 50);
    sun.castShadow = true;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // soft contact shadows under car using a simple blob texture (if available) - generate a canvas texture
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 256; shadowCanvas.height = 256;
    const sc = shadowCanvas.getContext('2d');
    sc.clearRect(0,0,256,256);
    const g = sc.createRadialGradient(128,128,20,128,128,128);
    g.addColorStop(0,'rgba(0,0,0,0.65)'); g.addColorStop(0.5,'rgba(0,0,0,0.22)'); g.addColorStop(1,'rgba(0,0,0,0)');
    sc.fillStyle = g; sc.fillRect(0,0,256,256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
    shadowTex.encoding = THREE.sRGBEncoding || shadowTex.encoding;
    // store for use by car underlay
    window._CAR_DEMO.contactShadow = shadowTex;
  }

  function createGround() {
    // ground with roughness map like material for more variance
    const mat = new THREE.MeshStandardMaterial({ color: 0x6aa84f, roughness: 0.9, metalness: 0.01 });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4), mat);
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    scene.add(g);

    // subtle detail lines for reference
    const grid = new THREE.GridHelper(WORLD_SIZE * 4, 80, 0x333333, 0x2a2a2a);
    grid.position.y = 0.01; grid.material.opacity = 0.6; grid.material.transparent = true;
    scene.add(grid);
  }

  function createTrack() {
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.1 });
    const inner = TRACK.innerRadius;
    const outer = TRACK.outerRadius;
    const gap = TRACK.gapSize;
    const gapStart = TRACK.gapCenterAngle - gap / 2;
    const thetaStart = gapStart + gap; // start angle after gap
    const thetaLength = Math.PI * 2 - gap; // arc length excluding gap
    const segments = 128;
    const ringGeo = new THREE.RingGeometry(inner, outer, segments, 1, thetaStart, thetaLength);
    const track = new THREE.Mesh(ringGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.02;
    track.receiveShadow = true;
    scene.add(track);

    // centerline (optional): draw center stripe on arc segments (approx by another ring slightly above)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0x333300 });
    const mid = (inner + outer) / 2;
    const stripeGeo = new THREE.RingGeometry(mid - 0.15, mid + 0.15, segments, 1, thetaStart, thetaLength);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = -Math.PI / 2; stripe.position.y = 0.03; scene.add(stripe);
  }

  function createEnvironment() {
    // simple roadside objects (left side)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3b });
    for (let i = -8; i <= 8; i += 2) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(6, 8 + Math.random() * 12, 6), boxMat);
      b.position.set(-WORLD_SIZE + 60 + Math.random()*120, (b.geometry.parameters.height)/2, i*40 + Math.random()*60);
      b.castShadow = true;
      scene.add(b);
    }

    // roadside objects (right side)
    for (let i = -8; i <= 8; i += 2) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(6, 8 + Math.random() * 12, 6), boxMat);
      b.position.set(WORLD_SIZE - 60 - Math.random()*120, (b.geometry.parameters.height)/2, i*40 + Math.random()*60);
      b.castShadow = true;
      scene.add(b);
    }
  }

  // normalize angle to [0, 2PI)
  function normalizeAngle(a) {
    let v = a % (Math.PI * 2);
    if (v < 0) v += Math.PI * 2;
    return v;
  }

  function isAngleInGap(angle) {
    const gap = TRACK.gapSize;
    const start = normalizeAngle(TRACK.gapCenterAngle - gap / 2);
    const end = normalizeAngle(start + gap);
    const a = normalizeAngle(angle);
    if (start < end) return a >= start && a <= end;
    // wrap-around
    return a >= start || a <= end;
  }

  function isCarOnTrackPos(pos) {
    const x = pos.x, z = pos.z;
    const r = Math.sqrt(x*x + z*z);
    if (r < TRACK.innerRadius || r > TRACK.outerRadius) { return false; }
    const angle = Math.atan2(z, x); // -PI..PI
    return !isAngleInGap(angle);
  }

  function createCar() {
    // Try to load a GLTF model (models/lamborghini.glb) and fall back to a primitive car
    function createPrimitiveCar() {
      const car = new THREE.Group();
      // Lamborghini-like primitive: low, wide, angular, yellow paint
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.35, roughness: 0.25 });
      // low-slung base
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 4.2), bodyMat);
      base.position.y = 0.34; base.castShadow = true; car.add(base);
      // wedge hood (thin box rotated slightly for slope)
      const hoodMat = bodyMat;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 1.6), hoodMat);
      hood.position.set(0, 0.48, 1.0); hood.rotation.x = -0.18; hood.castShadow = true; car.add(hood);
      // cabin / windshield - slightly sloped and tinted
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.9, roughness: 0.1 });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.2), cabinMat);
      cabin.position.set(0, 0.78, -0.6); cabin.rotation.x = -0.12; cabin.castShadow = true; car.add(cabin);
      // side intakes
      const intakeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      const intakeL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.8), intakeMat); intakeL.position.set(-1.05, 0.48, -0.2); intakeL.castShadow = true; car.add(intakeL);
      const intakeR = intakeL.clone(); intakeR.position.x = 1.05; car.add(intakeR);
      // rear spoiler
      const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), spoilerMat);
      spoiler.position.set(0, 0.62, -1.9); spoiler.castShadow = true; car.add(spoiler);
      // rear brake lights (emissive)
      const rearLightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000, emissiveIntensity: 0.0 });
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.06), rearLightMat);
      rearL.position.set(-0.5, 0.46, -2.05); rearL.castShadow = false; car.add(rearL);
      const rearR = rearL.clone(); rearR.position.x = 0.5; car.add(rearR);
      // underglow neon (emissive plane under car)
      const underMat = new THREE.MeshStandardMaterial({ color: 0x00ffd0, emissive: 0x00ffd0, emissiveIntensity: 0.0, transparent: true, opacity: 0.6, roughness: 1 });
      const under = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), underMat);
      under.rotation.x = -Math.PI/2; under.position.set(0, 0.05, 0); under.receiveShadow = false; under.renderOrder = 2; car.add(under);
      // headlights (emissive) - narrow, aggressive
      const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.9 });
      const lh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), lightMat);
      lh.position.set(-0.6, 0.42, 1.95); lh.castShadow = false; car.add(lh);
      const rh = lh.clone(); rh.position.x = 0.6; car.add(rh);
      // mark as Lamborghini (primitive)
      car.userData = car.userData || {}; car.userData.make = 'Lamborghini (primitive)';
      // wheels with simple rims (continued later)
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 });
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 20);
      const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.42, 16);
      const wheelPositions = [ [-0.9, 0.35, 1.0], [0.9, 0.35, 1.0], [-0.9, 0.35, -1.0], [0.9, 0.35, -1.0] ];
      const wheels = [];
      for (let p of wheelPositions) {
        const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI/2; w.position.set(p[0], p[1], p[2]); w.castShadow = true; car.add(w); wheels.push(w);
        const r = new THREE.Mesh(rimGeo, rimMat); r.rotation.z = Math.PI/2; r.position.set(p[0], p[1], p[2]); car.add(r);
      }
      // start near the gap entry outside the outer radius so player can drive in
      const gapAng = TRACK.gapCenterAngle;
      const startR = TRACK.outerRadius + 6;
      car.position.set(Math.cos(gapAng) * startR, 0, Math.sin(gapAng) * startR);
      // contact shadow under car
      if (window._CAR_DEMO && window._CAR_DEMO.contactShadow) {
        const shadowMat = new THREE.MeshBasicMaterial({ map: window._CAR_DEMO.contactShadow, transparent: true, depthWrite: false });
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), shadowMat);
        sh.rotation.x = -Math.PI/2; sh.position.set(0, 0.01, 0); sh.renderOrder = 1; car.add(sh);
        car.userData.contactShadow = sh;
      }
      scene.add(car);
      // store references for runtime visual updates
      car.userData = car.userData || {};
      car.userData.make = 'Lamborghini (primitive)';
      car.userData.rearLights = [rearL, rearR];
      car.userData.underglow = under;
      window._CAR_DEMO.car = { obj: car, wheels: wheels };
    }

    // Attempt to load GLTF model at models/lamborghini.glb; fall back if loader unavailable or load fails
    if (!FORCE_PRIMITIVE_CAR) {
      // loader logic extracted to function to allow dynamic script injection if needed
      function loadModelWithLoader(LoaderCtor) {
        try {
          const loader = new LoaderCtor();
          loader.load('models/lamborghini.glb', (gltf) => {
            const root = new THREE.Group();
            const model = gltf.scene || (gltf.scenes && gltf.scenes[0]) || gltf;
            // compute bounding box to determine scale and center
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            // target approximate length of model in world units
            const target = 3.0;
            const scaleFactor = target / maxDim;
            // apply scale
            model.scale.setScalar(scaleFactor);
            // after scaling, shift model so its center is at origin
            model.position.sub(center.multiplyScalar(scaleFactor));
            model.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
            root.add(model);
            // place near gap
            const gapAng = TRACK.gapCenterAngle; const startR = TRACK.outerRadius + 6;
            root.position.set(Math.cos(gapAng) * startR, 0, Math.sin(gapAng) * startR);
    // remove debug axes helper (clean up final scene)
            scene.add(root);
            window._CAR_DEMO.car = { obj: root, wheels: [] };
            // position camera to focus the model
            if (camera) {
              const scaledHeight = Math.max(size.y * scaleFactor, 1.8);
              const scaledDepth = Math.max(size.z * scaleFactor, 3.6);
              const camOffset = new THREE.Vector3(0, scaledHeight * 1.2 + 1.5, -scaledDepth * 1.4);
              const worldCamPos = root.position.clone().add(camOffset.applyAxisAngle(new THREE.Vector3(0,1,0), root.rotation.y));
              camera.position.copy(worldCamPos);
              camera.lookAt(root.position.clone().add(new THREE.Vector3(0, scaledHeight * 0.5, 0)));
            }
            console.log('Loaded model models/lamborghini.glb, scaled by', scaleFactor);
          }, undefined, (err) => {
            console.warn('GLTF load failed, falling back to primitive car:', err);
            createPrimitiveCar();
          });
        } catch (e) {
          console.warn('GLTFLoader not usable, falling back to primitive car', e);
          createPrimitiveCar();
        }
      }

      // ensure a GLTFLoader is available; if not, try to inject the script then load
      const tryUseLoader = () => {
        const LoaderCtor = (typeof THREE !== 'undefined' && THREE.GLTFLoader) ? THREE.GLTFLoader : (window.GLTFLoader || (window.THREE && window.THREE.GLTFLoader));
        if (LoaderCtor) { loadModelWithLoader(LoaderCtor); return true; }
        return false;
      };

      if (!tryUseLoader()) {
        // inject GLTFLoader script dynamically and attempt load on onload
        const url = 'https://unpkg.com/three@0.158.0/examples/js/loaders/GLTFLoader.js';
        const s = document.createElement('script'); s.src = url; s.onload = () => { if (!tryUseLoader()) { console.warn('GLTFLoader still unavailable after injection'); createPrimitiveCar(); } }; s.onerror = () => { console.warn('Failed to load GLTFLoader script, falling back'); createPrimitiveCar(); };
        document.head.appendChild(s);
        // return here; actual createPrimitiveCar or model creation will happen in callbacks
        return;
      }
    }
    // if loader not available or force primitive, use primitive
    createPrimitiveCar();
  }

  // input: arrow keys always map Up=forward, Down=backward, Left=steer left, Right=steer right
  // INVERT_CONTROLS affects only WASD mapping (if true, W/S/A/D are inverted)
  const INVERT_CONTROLS = false; // set true to invert WASD mapping

  function keyDown(e) {
    // prevent page scrolling when using arrows/space
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code)) {
      e.preventDefault();
    }
    // handle arrows and space first (consistent mapping)
    switch (e.code) {
      case 'ArrowUp': controls.forward = true; return;
      case 'ArrowDown': controls.backward = true; return;
      case 'ArrowLeft': controls.left = true; return;
      case 'ArrowRight': controls.right = true; return;
      case 'Space': controls.handbrake = true; return;
    }

    // WASD mapping (may be inverted by flag)
    if (!INVERT_CONTROLS) {
      switch (e.code) {
        case 'KeyW': controls.forward = true; break;
        case 'KeyS': controls.backward = true; break;
        case 'KeyA': controls.left = true; break;
        case 'KeyD': controls.right = true; break;
      }
    } else {
      switch (e.code) {
        case 'KeyW': controls.backward = true; break;
        case 'KeyS': controls.forward = true; break;
        case 'KeyA': controls.right = true; break;
        case 'KeyD': controls.left = true; break;
      }
    }
    // console.log('controls', controls);
  }

  function keyUp(e) {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code)) {
      e.preventDefault();
    }
    switch (e.code) {
      case 'ArrowUp': controls.forward = false; return;
      case 'ArrowDown': controls.backward = false; return;
      case 'ArrowLeft': controls.left = false; return;
      case 'ArrowRight': controls.right = false; return;
      case 'Space': controls.handbrake = false; return;
    }

    if (!INVERT_CONTROLS) {
      switch (e.code) {
        case 'KeyW': controls.forward = false; break;
        case 'KeyS': controls.backward = false; break;
        case 'KeyA': controls.left = false; break;
        case 'KeyD': controls.right = false; break;
      }
    } else {
      switch (e.code) {
        case 'KeyW': controls.backward = false; break;
        case 'KeyS': controls.forward = false; break;
        case 'KeyA': controls.right = false; break;
        case 'KeyD': controls.left = false; break;
      }
    }
    // console.log('controls', controls);
  }

  // speedometer drawing
  function initSpeedometer() {
    speedometerCanvas = document.getElementById('speedometer');
    if (!speedometerCanvas) return;
    speedometerCtx = speedometerCanvas.getContext('2d');
  }

  function drawSpeedometer() {
    if (!speedometerCtx) return;
    const ctx = speedometerCtx;
    const w = speedometerCanvas.width; const h = speedometerCanvas.height; const cx = w/2; const cy = h/2; const r = Math.min(w,h)/2 - 8;
    ctx.clearRect(0,0,w,h);
    // background
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(cx,cy,r+6,0,Math.PI*2); ctx.fill();
    // ticks
    ctx.save(); ctx.translate(cx,cy);
    const maxDisplay = carState.baseMaxSpeed * 3;
    const ticks = 10;
    for (let i=0;i<=ticks;i++){
      const t = i / ticks; const ang = Math.PI * (1 + (1 - t)); // from 180deg to 0deg
      const ix = Math.cos(ang)*(r-6); const iy = Math.sin(ang)*(r-6);
      ctx.beginPath(); ctx.moveTo(ix,iy); const ox = Math.cos(ang)*(r-1); const oy = Math.sin(ang)*(r-1); ctx.lineTo(ox,oy);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = (i%5===0?3:1); ctx.stroke();
      // label
      if (i%2===0){ ctx.fillStyle='#fff'; ctx.font='10px sans-serif'; const val = Math.round(maxDisplay * t); const lx = Math.cos(ang)*(r-18)-6; const ly = Math.sin(ang)*(r-18)+4; ctx.fillText(val.toString(), lx, ly); }
    }
    // needle
    const speed = Math.abs(carState.speed);
    const norm = Math.min(1, speed / (carState.baseMaxSpeed * 3));
    const needleAng = Math.PI * (1 + (1 - norm));
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(needleAng)*(r-12), Math.sin(needleAng)*(r-12)); ctx.strokeStyle='#ff4444'; ctx.lineWidth=3; ctx.stroke();
    // center cap
    ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fillStyle='#222'; ctx.fill();
    ctx.restore();
    // numeric
    ctx.fillStyle='#fff'; ctx.font='14px sans-serif'; ctx.fillText(Math.round(carState.speed) + ' m/s', 10, h-10);
  }

  // check if car is on track (wrapper)
  function isCarOnTrack(pos) {
    return isCarOnTrackPos(pos);
  }

  function updateCar(dt) {
    const c = window._CAR_DEMO.car; if (!c) return;

    // remember position before movement
    const posBefore = c.obj.position.clone();

    // acceleration/braking
    if (controls.forward) {
      carState.speed += carState.accel * dt;
    } else if (controls.backward) {
      carState.speed -= carState.brake * dt;
    } else {
      if (carState.speed > 0) carState.speed = Math.max(0, carState.speed - carState.friction * dt);
      else carState.speed = Math.min(0, carState.speed + carState.friction * dt);
    }

    // clamp speed to current limits
    const halfMax = carState.maxSpeed / 2;
    carState.speed = Math.max(-halfMax, Math.min(carState.maxSpeed, carState.speed));

    // steering
    let steerInput = 0; if (controls.left) steerInput = 1; if (controls.right) steerInput = -1;
    const steerSpeed = 3.0;
    carState.steering += (steerInput * carState.maxSteering - carState.steering) * Math.min(1, steerSpeed * dt);

    // update orientation
    const yaw = c.obj.rotation.y;
    const forwardVec = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw).normalize();
    const turnSpeed = carState.steering * (carState.speed / Math.max(1, carState.maxSpeed)) * dt * 2.2;
    c.obj.rotation.y += turnSpeed;

    // move car
    const move = forwardVec.clone().multiplyScalar(carState.speed * dt);
    c.obj.position.add(move);

    // after movement
    const posAfter = c.obj.position.clone();

    // detect track entry/exit with single-gap enforcement
    const angleBefore = Math.atan2(posBefore.z, posBefore.x);
    const angleAfter = Math.atan2(posAfter.z, posAfter.x);
    const rBefore = Math.sqrt(posBefore.x*posBefore.x + posBefore.z*posBefore.z);
    const rAfter = Math.sqrt(posAfter.x*posAfter.x + posAfter.z*posAfter.z);
    const wasOnTrack = (rBefore >= TRACK.innerRadius && rBefore <= TRACK.outerRadius && !isAngleInGap(angleBefore));
    let nowOnTrack = (rAfter >= TRACK.innerRadius && rAfter <= TRACK.outerRadius && !isAngleInGap(angleAfter));

    if (!ENFORCE_TRACK_BOUNDARY) {
      // bypass checks: allow entering/exiting freely during debug
      carState.onTrack = nowOnTrack;
    } else if (nowOnTrack && !wasOnTrack) {
      // entering: allow if approach or arrival angle lies within the gap or the midpoint angle crosses the gap
      function midAngle(a, b) {
        // normalize and compute midpoint taking wrap-around into account
        const na = normalizeAngle(a);
        const nb = normalizeAngle(b);
        let diff = nb - na;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return normalizeAngle(na + diff * 0.5);
      }
      const angleMid = midAngle(angleBefore, angleAfter);
      const moveAngle = Math.atan2(move.z, move.x);
      // allow radial approaches that head toward the gap even if exact angles don't report inside-gap
      function angDist(a,b){ const na=normalizeAngle(a), nb=normalizeAngle(b); let d=Math.abs(na-nb); if(d>Math.PI) d = Math.PI*2-d; return d; }
      const nearGap = angDist(angleMid, TRACK.gapCenterAngle) <= (TRACK.gapSize/2 + 0.15);
      // allow when car forward vector points toward track center and approach is generally aligned with gap
      const toCenter = new THREE.Vector3(-posAfter.x, 0, -posAfter.z).normalize();
      const forwardDir = forwardVec.clone().normalize();
      const forwardToCenterDot = forwardDir.dot(toCenter);
      const radialApproach = forwardToCenterDot > 0.6 && angDist(angleBefore, TRACK.gapCenterAngle) <= (TRACK.gapSize/2 + 0.4);
      if (isAngleInGap(angleBefore) || isAngleInGap(angleAfter) || isAngleInGap(angleMid) || isAngleInGap(moveAngle) || nearGap || radialApproach) {
        carState.onTrack = true; carState.maxSpeed = carState.baseMaxSpeed * 3; carState.speed = carState.speed * 3;
        nowOnTrack = true;
      } else {
        // block entry: revert position and stop
        console.debug('track:block entry', {
          angleBefore: angleBefore.toFixed(3), angleAfter: angleAfter.toFixed(3), angleMid: angleMid.toFixed(3),
          inGapBefore: isAngleInGap(angleBefore), inGapAfter: isAngleInGap(angleAfter), inGapMid: isAngleInGap(angleMid),
          rBefore: rBefore.toFixed(2), rAfter: rAfter.toFixed(2), wasOnTrack, nowOnTrack
        });
        c.obj.position.copy(posBefore);
        carState.speed = 0;
        nowOnTrack = false;
      }
    } else if (!ENFORCE_TRACK_BOUNDARY && !nowOnTrack && wasOnTrack) {
      // when enforcement disabled, allow exits freely
      carState.onTrack = nowOnTrack;
    } else if (!nowOnTrack && wasOnTrack) {
      // exiting: allow if exit angle / midpoint or movement direction goes through the gap
      function midAngle(a, b) {
        const na = normalizeAngle(a);
        const nb = normalizeAngle(b);
        let diff = nb - na;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return normalizeAngle(na + diff * 0.5);
      }
      const angleMidExit = midAngle(angleBefore, angleAfter);
      const moveAngle = Math.atan2(move.z, move.x);
      if (isAngleInGap(angleAfter) || isAngleInGap(angleMidExit) || isAngleInGap(moveAngle)) {
        carState.onTrack = false; carState.maxSpeed = carState.baseMaxSpeed;
        carState.speed = Math.sign(carState.speed) * Math.min(Math.abs(carState.speed), carState.maxSpeed);
        nowOnTrack = false;
      } else {
        // block exit: revert and stop
        console.debug('track:block exit', { angleAfter: angleAfter.toFixed(3), angleMidExit: angleMidExit.toFixed(3), moveAngle: moveAngle.toFixed(3), inGapAfter: isAngleInGap(angleAfter), inGapMid: isAngleInGap(angleMidExit), inGapMove: isAngleInGap(moveAngle), rAfter: rAfter.toFixed(2), wasOnTrack, nowOnTrack });
        c.obj.position.copy(posBefore);
        carState.speed = 0;
        nowOnTrack = true;
      }
    }
    // Apply on-track state and ensure speed / maxSpeed reflect a 3x boost while on track.
    // If we just entered the track, give a one-time speed boost (x3). Always set maxSpeed accordingly.
    const justEntered = (nowOnTrack && !wasOnTrack);
    carState.onTrack = nowOnTrack;
    if (justEntered) {
      carState.speed = carState.speed * 3;
    }
    carState.maxSpeed = carState.onTrack ? carState.baseMaxSpeed * 3 : carState.baseMaxSpeed;
    // clamp speed to the current max
    carState.speed = Math.sign(carState.speed) * Math.min(Math.abs(carState.speed), carState.maxSpeed);

    // adjust friction based on onTrack
    if (!carState.onTrack) carState.friction = 18; else carState.friction = 8;

    // handbrake: when active, quickly reduce speed to zero and increase friction
    if (controls.handbrake) {
      carState.speed = carState.speed * Math.max(0, 1 - 8 * dt);
      carState.friction = Math.max(carState.friction, 60);
    }

    // clamp world bounds
    const margin = 1.0;
    // noop placeholder: grouping commit, no functional change
    const minX = -WORLD_SIZE + margin, maxX = WORLD_SIZE - margin, minZ = -WORLD_SIZE + margin, maxZ = WORLD_SIZE - margin;
    const clampedX = Math.max(minX, Math.min(maxX, c.obj.position.x));
    const clampedZ = Math.max(minZ, Math.min(maxZ, c.obj.position.z));
    if (clampedX !== c.obj.position.x || clampedZ !== c.obj.position.z) carState.speed = 0;
    c.obj.position.x = clampedX; c.obj.position.z = clampedZ;

    // rotate wheels
    if (c.wheels && c.wheels.forEach) c.wheels.forEach(w => { w.rotation.x += carState.speed * dt * 0.8; });

    // runtime visual effects: rear lights and underglow intensity based on speed/brake
    if (c.obj && c.obj.userData) {
      const ud = c.obj.userData;
      if (ud.rearLights && ud.rearLights.forEach) {
        // make rear lights bright when braking or when handbrake is active
        const brakeIntensity = (controls.backward || controls.handbrake || carState.speed < 0) ? 1.0 : 0.0;
        ud.rearLights.forEach(l => { if (l.material) l.material.emissiveIntensity = brakeIntensity * 1.2; });
      }
      if (ud.underglow && ud.underglow.material) {
        // undeglow intensity scales with absolute speed
        const intensity = Math.min(1.0, Math.abs(carState.speed) / (carState.baseMaxSpeed * 2));
        ud.underglow.material.emissiveIntensity = intensity * 0.8;
        ud.underglow.material.opacity = 0.3 + intensity * 0.7;
      }
    }

    // camera follow
    const desiredOffset = new THREE.Vector3(0, 4.2, -9.0);
    const worldOffset = desiredOffset.clone().applyAxisAngle(new THREE.Vector3(0,1,0), c.obj.rotation.y);
    const desiredPos = c.obj.position.clone().add(worldOffset);
    camera.position.lerp(desiredPos, Math.min(1, dt*4.0));
    camera.lookAt(c.obj.position.clone().add(new THREE.Vector3(0,1.2,0)));
  }

  function updateUI() {
    const el = document.getElementById('speed'); if (el) el.textContent = Math.abs(carState.speed).toFixed(1);
    drawSpeedometer();
    const posEl = document.getElementById('pos');
    const onEl = document.getElementById('onTrack');
    if (posEl && window._CAR_DEMO.car) {
      const p = window._CAR_DEMO.car.obj.position;
      posEl.textContent = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
    }
    if (onEl) onEl.textContent = String(!!carState.onTrack);
  }

  // debug helper: center camera on car
  function focusCameraOnCar() {
    const c = window._CAR_DEMO.car; if (!c || !camera) return;
    const desiredOffset = new THREE.Vector3(0, 4.2, -9.0);
    const worldOffset = desiredOffset.clone().applyAxisAngle(new THREE.Vector3(0,1,0), c.obj.rotation.y);
    camera.position.copy(c.obj.position.clone().add(worldOffset));
    camera.lookAt(c.obj.position.clone().add(new THREE.Vector3(0,1.2,0)));
  }

  function resetCar() {
    const c = window._CAR_DEMO.car; if (!c) return; 
    const gapAng = TRACK.gapCenterAngle; const startR = TRACK.outerRadius + 6;
    const px = Math.cos(gapAng) * startR; const pz = Math.sin(gapAng) * startR;
    c.obj.position.set(px, 0, pz);
    // orient the car to face inward toward the track center so pressing forward drives through the gap
    // forward vector (0,0,1) rotated by rotation.y becomes (sin(y), cos(y)) on X/Z plane.
    // To point toward center (dir = -position), rotation.y = atan2(dir.x, dir.z)
    const dirX = -px, dirZ = -pz;
    c.obj.rotation.set(0, Math.atan2(dirX, dirZ), 0);
    carState.speed = 0; carState.onTrack = false; carState.maxSpeed = carState.baseMaxSpeed;
  }

  // Simulation helper: run a headless control sequence and log results (run from browser console)
  // sequence: array of {t: time in seconds, controls: {forward,backward,left,right}} changes applied at given times
  window._CAR_DEMO.simulate = function(sequence, totalTime = 5, dt = 0.02) {
    const c = window._CAR_DEMO.car; if (!c) { console.warn('no car'); return; }
    // reset to starting position
    resetCar();
    let time = 0; let idx = 0;
    const seq = sequence.slice().sort((a,b)=>a.t-b.t);
    while (time < totalTime) {
      // apply any sequence events
      while (idx < seq.length && seq[idx].t <= time) {
        const s = seq[idx++];
        Object.assign(controls, { forward:false, backward:false, left:false, right:false });
        Object.assign(controls, s.controls || {});
      }
      updateCar(dt);
      time += dt;
    }
    console.log('simulate done. pos=', c.obj.position, 'speed=', carState.speed, 'onTrack=', carState.onTrack);
  };

  function init() {
    container = document.getElementById('canvas-container'); if (!container) { console.error('Missing canvas container'); return; }
    clock = new THREE.Clock();
    createScene(); createCamera(); createRenderer(); createLights(); createGround(); createTrack(); createEnvironment(); createCar(); initSpeedometer();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    const resetBtn = document.getElementById('resetBtn'); if (resetBtn) resetBtn.addEventListener('click', resetCar);

    // position camera relative to car at start so user can see it immediately
    const car = window._CAR_DEMO.car;
    if (car && camera) {
      const startOffset = new THREE.Vector3(0, 4.2, -9.0).applyAxisAngle(new THREE.Vector3(0,1,0), car.obj.rotation.y);
      camera.position.copy(car.obj.position.clone().add(startOffset));
      camera.lookAt(car.obj.position.clone().add(new THREE.Vector3(0,1.2,0)));
    }

    animate();
  }

  function onWindowResize() { const w = container.clientWidth, h = container.clientHeight; camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); }

  function animate() { requestAnimationFrame(animate); const dt = Math.min(0.05, clock.getDelta()); try { updateCar(dt); updateUI(); } catch(e){ console.error(e); } renderer.render(scene, camera); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // export API
  window._CAR_DEMO.scene = scene; window._CAR_DEMO.camera = camera; window._CAR_DEMO.renderer = renderer; window._CAR_DEMO.update = updateCar; window._CAR_DEMO.state = carState;
  window._CAR_DEMO.reset = resetCar;
  window._CAR_DEMO.focus = function() { try { focusCameraOnCar(); } catch(e) { console.warn(e); } };
})();

