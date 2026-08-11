/* ============================================================
   J & D Wedding — scroll-driven pixel vine garden
   A fixed, low-res (pixelated) canvas overlay. As the page
   scrolls, vines grow down both gutters and sprout retro,
   colourful flowers. Pure vanilla, no deps.
   ============================================================ */
(function(){
  'use strict';

  var PX = 4;                         // pixel chunk size (bigger = chunkier / more retro)
  var canvas, ctx;
  var vw = 0, vh = 0;                 // viewport (css px)
  var cw = 0, ch = 0;                 // backing store (low-res)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // retro, slightly muted but colourful palette
  var GREEN      = '#6f8f4e';
  var GREEN_DK   = '#557038';
  var GREEN_LT   = '#8caa5e';
  var FLOWERS = [
    { petal:'#d98b3f', edge:'#b56a26', core:'#f4ead0' }, // mustard
    { petal:'#c9503c', edge:'#9c3626', core:'#f2d98f' }, // terracotta
    { petal:'#d98faa', edge:'#b56585', core:'#f4ead0' }, // dusty rose
    { petal:'#4f9a8f', edge:'#347268', core:'#f2d98f' }, // teal
    { petal:'#e8c95a', edge:'#c2a232', core:'#9c6a3a' }, // sun yellow
    { petal:'#9a6a9c', edge:'#744a76', core:'#f4ead0' }  // mauve
  ];

  function block(x, y, w, h, color){
    // x,y,w,h in low-res pixel units
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1,Math.round(w)), Math.max(1,Math.round(h)));
  }

  // deterministic pseudo-random from an integer seed
  function rnd(seed){
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // ---- one vine down a gutter -------------------------------
  // side: -1 = left edge, +1 = right edge
  function drawVine(side, frontierDoc, scrollY, docSpan, seedBase){
    var baseX = side < 0 ? 7 : (cw - 7);       // gutter x in low-res px
    var amp   = 5.5;                            // sway amplitude
    var freq  = 0.020;                          // sway frequency (per low-res px of doc)
    var step  = 1;                              // draw resolution
    var docSpanPx = docSpan;                    // total scrollable doc height (css px)

    // how far the vine has grown, in css px of document space
    var grownTo = frontierDoc;

    // iterate along the vine in low-res doc space
    var topDocLow = scrollY / PX;
    var botDocLow = (scrollY + vh) / PX + 8;
    var startLow = Math.max(0, topDocLow - 4);

    // vine stem
    for(var yl = startLow; yl <= botDocLow; yl += step){
      var docCss = yl * PX;
      if(docCss > grownTo) break;               // not grown here yet
      var sway = Math.sin(yl * freq + seedBase*10) * amp
               + Math.sin(yl * freq * 2.3 + seedBase*4) * (amp*0.4);
      var x = baseX + side * (2 + Math.abs(sway)) - (side<0?0:2);
      x = baseX + sway * (side<0? 1 : 1);
      var screenY = docCss - scrollY;           // css
      var sy = screenY / PX;
      if(sy < -6 || sy > ch + 6) continue;
      // stem thickness 2px, with a lighter highlight
      block(x, sy, 2, 1.4, GREEN);
      block(x, sy, 1, 1.4, GREEN_DK);
      // occasional leaf
      var li = Math.floor(yl);
      if(li % 22 === 0){
        var dir = (rnd(li+seedBase) > 0.5) ? 1 : -1;
        drawLeaf(x, sy, dir, clampGrow(docCss, grownTo, 40));
      }
    }

    // flowers spaced along the vine
    var spacing = 150;                          // css px between blooms
    var firstIdx = Math.floor((scrollY - vh) / spacing) - 1;
    var lastIdx  = Math.ceil((scrollY + vh) / spacing) + 1;
    for(var i = firstIdx; i <= lastIdx; i++){
      if(i < 0) continue;
      var fDoc = 90 + i * spacing + rnd(i*3+seedBase)*40;   // css doc y
      if(fDoc > docSpanPx + vh) continue;
      var bloom = clampGrow(fDoc, grownTo, 90);
      if(bloom <= 0) continue;
      var popBloom = bloomPop(bloom);
      var yl2 = fDoc / PX;
      var sway2 = Math.sin(yl2 * freq + seedBase*10) * amp
                + Math.sin(yl2 * freq * 2.3 + seedBase*4) * (amp*0.4);
      var fx = baseX + sway2;
      var fScreenY = (fDoc - scrollY) / PX;
      if(fScreenY < -12 || fScreenY > ch + 12) continue;
      // short branch pushing the flower slightly inward
      var reach = 9 * bloom;
      var inward = side < 0 ? reach : -reach;
      for(var b = 0; b < reach; b++){
        block(fx + (side<0?b:-b), fScreenY - b*0.15, 1.6, 1.6, GREEN_LT);
      }
      var pal = FLOWERS[((i % FLOWERS.length) + FLOWERS.length) % FLOWERS.length];
      drawFlower(fx + inward, fScreenY - reach*0.15, popBloom, pal, i+seedBase);
    }
  }

  // grow factor 0..1 as frontier passes a doc position over `range` css px
  function clampGrow(docPos, frontier, range){
    var d = (frontier - docPos) / range;
    if(d < 0) return 0; if(d > 1) return 1;
    // ease-out
    return 1 - Math.pow(1 - d, 2);
  }

  // exaggerated "pop" overshoot so blooms sprout with a visible flourish
  function bloomPop(t){
    if(t >= 1) return 1.14;
    var c4 = (2 * Math.PI) / 3;
    if(t <= 0) return 0;
    return Math.pow(2, -8 * t) * Math.sin((t * 8 - 0.75) * c4) + 1.16 * t;
  }

  function drawLeaf(x, y, dir, grow){
    if(grow <= 0) return;
    var s = 3 * grow;
    for(var k = 0; k < s; k++){
      var w = (s - k);
      block(x + dir*(1+k), y - k*0.6, Math.max(1,w*0.8), 1.2, k%2? GREEN : GREEN_LT);
    }
  }

  function drawFlower(cx, cy, bloom, pal, seed){
    var petals = 6;
    var r = 3.1 * bloom;
    var rot = rnd(seed) * Math.PI;
    // petals
    for(var p = 0; p < petals; p++){
      var a = rot + (p / petals) * Math.PI * 2;
      var px = cx + Math.cos(a) * r;
      var py = cy + Math.sin(a) * r;
      block(px - 1.5, py - 1.5, 3.4, 3.4, pal.edge);
      block(px - 0.9, py - 0.9, 2.2, 2.2, pal.petal);
    }
    // core — large, high-contrast centre so it reads clearly
    if(bloom > 0.2){
      var cs = Math.min(1, bloom);
      block(cx - 2.6*cs, cy - 2.6*cs, 5.2*cs, 5.2*cs, pal.edge);
      block(cx - 1.9*cs, cy - 1.9*cs, 3.8*cs, 3.8*cs, pal.core);
      block(cx - 0.8*cs, cy - 0.8*cs, 1.6*cs, 1.6*cs, pal.edge);
    }
  }

  // ---- frame -------------------------------------------------
  var ticking = false;
  function draw(){
    ticking = false;
    if(!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    // Hide the vine/flower garden on the RSVP ("Let's chat!") view —
    // that page shows the floating food instead.
    var onRsvp = !!document.querySelector('.rsvp-shell');
    canvas.style.display = onRsvp ? 'none' : 'block';
    if(onRsvp) return;
    var doc = document.documentElement;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var docHeight = Math.max(doc.scrollHeight, document.body.scrollHeight);
    var docSpan = Math.max(1, docHeight - vh);
    // frontier: bloom a little below the fold so flowers open as they enter view
    var frontier = scrollY + vh * 0.82;
    // if the page doesn't scroll, don't grow a garden (keeps the gate clean)
    if(docSpan < 40){ return; }
    drawVine(-1, frontier, scrollY, docSpan, 0.13);
    drawVine( 1, frontier, scrollY, docSpan, 0.61);
  }

  function requestDraw(){
    if(!ticking){ ticking = true; requestAnimationFrame(draw); }
  }

  function resize(){
    vw = window.innerWidth; vh = window.innerHeight;
    cw = Math.ceil(vw / PX); ch = Math.ceil(vh / PX);
    canvas.width = cw; canvas.height = ch;
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    ctx.imageSmoothingEnabled = false;
    requestDraw();
  }

  function init(){
    canvas = document.createElement('canvas');
    canvas.id = 'vine-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var s = canvas.style;
    s.position = 'fixed'; s.top = '0'; s.left = '0';
    s.pointerEvents = 'none'; s.zIndex = '5';
    s.imageRendering = 'pixelated';
    s.opacity = '0.92';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    resize();
    window.addEventListener('resize', resize, { passive:true });
    window.addEventListener('scroll', requestDraw, { passive:true });
    // SPA view swaps change document height without a scroll event
    setInterval(requestDraw, 500);
    // redraw once fonts/layout settle
    setTimeout(requestDraw, 300);
    setTimeout(requestDraw, 1200);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
