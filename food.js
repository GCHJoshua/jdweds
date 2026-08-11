/* ============================================================
   J & D Wedding — floating menu-art food (RSVP only)
   Uses the actual pixel-art dish icons cropped from the
   Min Jiang at Dempsey "Wedding Menu 2" artwork. Gentle,
   endless drift. Active only on the "Let's chat!" RSVP view
   (.rsvp-shell).
   ============================================================ */
(function(){
  'use strict';

  var canvas, ctx;
  var vw = 0, vh = 0;
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var items = [];
  var running = false;
  var active = false;
  var seeded = false;
  var lastTier = null;

  // All available dishes (Min Jiang "Wedding Menu 2").
  var ALL_FILES = ['trio','soup','duck','perch','abalone','lobster','dessert'];

  // Which dishes each access tier sees on the RSVP page:
  //   tier 1 = ceremony + lunch reception  -> lighter / shared dishes
  //   tier 2 = + dinner banquet            -> the full banquet spread
  // (Reassign freely — just move names between the two arrays.)
  var TIER1_FILES = ['trio','soup','perch','dessert'];
  var TIER2_FILES = ['trio','soup','duck','perch','abalone','lobster','dessert'];

  function currentTier(){
    try{
      var a = JSON.parse(localStorage.getItem('jd_auth'));
      return (a && a.tier) ? a.tier : 2;
    }catch(e){ return 2; }
  }

  // resolved at spawn time from the guest's tier
  var FILES = TIER2_FILES.slice();
  var imgs = [];              // index-aligned with ALL_FILES
  var loaded = 0;

  // target on-screen height (css px) for each dish
  var BASE_H = 68;

  function loadImages(){
    ALL_FILES.forEach(function(name){
      var im = new Image();
      im.onload = function(){ loaded++; };
      im.src = 'food/' + name + '.png';
      imgs.push(im);
    });
  }

  function imgIndex(name){ return ALL_FILES.indexOf(name); }

  function rand(a,b){ return a + Math.random()*(b-a); }

  // even, consistent density via jittered grid
  function spawn(){
    items = [];
    // pick the dish set for this guest's tier
    FILES = (currentTier() >= 2 ? TIER2_FILES : TIER1_FILES).slice();
    lastTier = currentTier();
    var n = Math.min(6, Math.max(4, Math.round(vw/320)));
    var cols = Math.max(1, Math.ceil(Math.sqrt(n * (vw/vh))));
    var rows = Math.max(1, Math.ceil(n / cols));
    var cellW = vw / cols, cellH = vh / rows;
    var order = FILES.map(function(name){ return imgIndex(name); }).sort(function(){ return Math.random()-0.5; });
    var idx = 0;
    for(var gy=0; gy<rows; gy++){
      for(var gx=0; gx<cols && idx<n; gx++){
        var ang = rand(0, Math.PI*2);
        var spd = rand(0.014, 0.024);            // css px / ms — gentle, slightly faster
        items.push({
          img: order[idx % order.length],
          x: cellW*(gx+0.5) + rand(-cellW*0.18, cellW*0.18),
          y: cellH*(gy+0.5) + rand(-cellH*0.18, cellH*0.18),
          vx: Math.cos(ang)*spd,
          vy: Math.sin(ang)*spd,
          scale: rand(0.86, 1.18),
          bobAmp: rand(3, 6),
          bobSpd: rand(0.0005, 0.0010),
          phase: rand(0, Math.PI*2)
        });
        idx++;
      }
    }
    seeded = true;
  }

  function drawItem(it, now){
    var im = imgs[it.img];
    if(!im || !im.width) return;
    var h = BASE_H * it.scale;
    var w = h * (im.width / im.height);
    var bob = Math.sin(now*it.bobSpd + it.phase) * it.bobAmp;
    // round to whole device pixels so scaling stays crisp & jitter-free
    var x = Math.round((it.x - w/2) * dpr) / dpr;
    var y = Math.round((it.y - h/2 + bob) * dpr) / dpr;
    ctx.drawImage(im, x, y, w, h);
  }

  function frame(now){
    if(!active){ running = false; return; }
    running = true;
    var dt = Math.min(40, now - (frame._last || now));
    frame._last = now;
    ctx.clearRect(0, 0, vw, vh);
    var pad = 90;
    for(var i=0;i<items.length;i++){
      var it = items[i];
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      if(it.x < -pad) it.x = vw + pad;
      else if(it.x > vw + pad) it.x = -pad;
      if(it.y < -pad) it.y = vh + pad;
      else if(it.y > vh + pad) it.y = -pad;
      drawItem(it, now);
    }
    requestAnimationFrame(frame);
  }

  function setActive(on){
    if(on === active) return;
    active = on;
    if(on){
      canvas.style.display = 'block';
      if(!seeded) spawn();
      if(!running){ frame._last = performance.now(); requestAnimationFrame(frame); }
    } else {
      canvas.style.display = 'none';
      if(ctx) ctx.clearRect(0, 0, vw, vh);
    }
  }

  function checkView(){
    var on = !!document.querySelector('.rsvp-shell');
    // if the guest's tier changed since we seeded, reseed the dish set
    if(on && seeded && currentTier() !== lastTier){ spawn(); }
    setActive(on);
  }

  function resize(){
    var oldW = vw, oldH = vh;
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;          // keep the pixel-art crisp
    if(seeded && oldW && oldH){
      var sx = vw/oldW, sy = vh/oldH;
      for(var i=0;i<items.length;i++){ items[i].x *= sx; items[i].y *= sy; }
    } else {
      spawn();
    }
  }

  function init(){
    loadImages();
    canvas = document.createElement('canvas');
    canvas.id = 'food-canvas';
    canvas.setAttribute('aria-hidden','true');
    var s = canvas.style;
    s.position='fixed'; s.top='0'; s.left='0';
    s.pointerEvents='none'; s.zIndex='4';
    s.imageRendering='pixelated'; s.opacity='0.95';
    s.display='none';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener('resize', resize, { passive:true });
    setInterval(checkView, 400);
    checkView();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
