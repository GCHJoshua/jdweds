/* ============================================================
   J & D Wedding — app logic
   Vanilla JS. State persists in localStorage.
   ============================================================ */
(function(){
  "use strict";
  var W = window.WEDDING;
  var app = document.getElementById('app');
  var cdTimer = null;

  /* ---------- tiny helpers ---------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function get(k, d){ try{ var v = localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function uid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function mapUrl(q){ return q.indexOf('http')===0 ? q : 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q); }

  /* ---------- state ---------- */
  function getAuth(){ return get('jd_auth', null); }              // {tier}
  function setAuth(t){ set('jd_auth', {tier:t, ts:Date.now()}); }
  function getMyRSVP(){ return get('jd_my', null); }
  function setMyRSVP(o){ set('jd_my', o); }
  function getResponses(){ return get('jd_responses', null); }
  function saveResponses(a){ set('jd_responses', a); }
  function getSheetEndpoint(){ return get('jd_sheet_endpoint','') || W.sheetEndpoint || ''; }
  function getStoryPhotos(){ return get('jd_story_photos', []); }
  function setStoryPhotos(a){ set('jd_story_photos', a); }
  function setSheetEndpoint(v){ set('jd_sheet_endpoint', v); }
  function sheetConfigured(){ var u=getSheetEndpoint(); return !!(u && u.indexOf('http')===0); }
  function postToSheet(action, payload){
    if(!sheetConfigured()) return;
    try{
      fetch(getSheetEndpoint(), {
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify(Object.assign({action:action}, payload))
      }).catch(function(){});
    }catch(e){}
  }
  function fetchSheetResponses(){
    if(!sheetConfigured()) return Promise.resolve(null);
    return fetch(getSheetEndpoint()+(getSheetEndpoint().indexOf('?')>=0?'&':'?')+'action=list')
      .then(function(r){ return r.json(); })
      .then(function(d){ return Array.isArray(d) ? d : (d && d.responses) || null; })
      .catch(function(){ return null; });
  }
  function ensureSeed(){
    if(getResponses()===null){
      var seeded = W.seedResponses.map(function(r){ var c=Object.assign({},r); c.id=uid(); c.status=r.attending?'attending':'declined'; return c; });
      saveResponses(seeded);
    }
  }
  function isAdmin(){ return sessionStorage.getItem('jd_admin')==='1'; }
  function getPasswords(){ return Object.assign({}, W.passwords, get('jd_passwords', {})); }
  function setPasswords(p){ set('jd_passwords', p); }

  ensureSeed();

  /* ---------- shared chrome ---------- */
  function letterhead(active){
    var t = getAuth() ? getAuth().tier : 1;
    return ''
      + '<header class="letterhead"><div class="inner">'
      +   '<span class="mono-brand">Joshua <span class="amp">&amp;</span> Dorcas</span>'
      +   '<span class="tier-pill">'+ esc(W.tiers[t].name) +'</span>'
      +   '<nav>'
      +     '<a href="#" data-nav="details" class="'+(active==='details'?'on':'')+'">Details</a>'
      +     '<a href="#" data-nav="rsvp" class="'+(active==='rsvp'?'on':'')+'">Edit RSVP</a>'
      +     '<a href="#admin">Admin</a>'
      +     '<a href="#" data-nav="signout">Sign out</a>'
      +   '</nav>'
      + '</div></header>';
  }

  function toast(msg){
    var t = document.createElement('div'); t.className='toast'; t.textContent=msg;
    document.body.appendChild(t); requestAnimationFrame(function(){ t.classList.add('show'); });
    setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 250); }, 1900);
  }

  function bindNav(){
    app.querySelectorAll('[data-nav]').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var n = a.getAttribute('data-nav');
        if(n==='signout'){ localStorage.removeItem('jd_auth'); localStorage.removeItem('jd_my'); location.hash=''; route(); }
        else if(n==='rsvp'){ location.hash=''; renderRSVP(); }
        else if(n==='details'){ location.hash=''; renderDetails(); }
      });
    });
  }

  /* ============================================================
     LANDING (locked)
     ============================================================ */
  function renderLanding(){
    clearCd();
    app.className='pw-gate-page';
    app.innerHTML = '<div class="pw-gate">'
      + '<div class="pw-gate-inner" id="pwGateInner">'
      +   '<div class="monogram" style="color:var(--accent);margin-bottom:18px;">Joshua &amp; Dorcas</div>'
      +   '<form class="lock" id="lockform" autocomplete="off">'
      +     '<div class="tt" style="text-align:center;margin-bottom:12px;">Enter your invitation password</div>'
      +     '<div class="row">'
      +       '<input class="field" id="pw" type="password" placeholder="• • • • • •" aria-label="password" autofocus />'
      +       '<button class="btn" type="submit">Enter</button>'
      +     '</div>'
      +     '<div class="err" id="pwerr"></div>'
      +   '</form>'

      + '</div>'
      + '</div>';

    var f = document.getElementById('lockform');
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var v = document.getElementById('pw').value.trim().toLowerCase();
      var err = document.getElementById('pwerr');
      if(v===String(getPasswords().tier1).toLowerCase()){ setAuth(1); showCTA(); }
      else if(v===String(getPasswords().tier2).toLowerCase()){ setAuth(2); showCTA(); }
      else { err.textContent = 'Hmm the password isn\'t right, do check your invitation again!'; document.getElementById('pw').value=''; }
    });
  }

  function showCTA(){
    // Fade out the password gate
    var inner = document.getElementById('pwGateInner');
    if(inner){
      inner.style.transition = 'opacity .5s ease, transform .5s ease';
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(-16px)';
    }
    setTimeout(function(){
      // Build full landing page
      app.className = '';
      app.innerHTML = ''
        + '<div class="landing" id="fullLanding" style="opacity:0;transition:opacity .7s ease;">'
        +   '<div class="ticker"><div class="track">'
        +     ticketText() + ticketText()
        +   '</div></div>'
        +   '<div class="landing-body"><div class="invite">'
        // +     '<div class="monogram">You are warmly invited</div>'
        +     '<h1>Joshua <span class="amp">&amp;</span> Dorcas</h1>'
        +     '<div class="sub">'+ esc(W.tagline) +'</div>'
        +     '<div class="meta">'+ esc(W.dateLabel) +' · '+ esc(W.cityLabel) +'</div>'
        +     '<div class="countdown" id="cd"></div>'
        +     '<div class="rule-orn"><span class="gly">✦︎</span></div>'
        +     '<div class="auth-cta" id="ctaBlock">'
        +       '<p class="cta-welcome">Welcome! We\'re so glad you\'re here.</p>'
        +       '<button class="btn cta-btn" id="ctaBtn">RSVP now ✦</button>'
        +     '</div>'
        +   '</div></div>'
        + '</div>';
      startCd();
      // Fade in the full landing
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          var fl = document.getElementById('fullLanding');
          if(fl) fl.style.opacity = '1';
          var cta = document.getElementById('ctaBlock');
          if(cta) setTimeout(function(){ cta.classList.add('visible'); }, 400);
        });
      });
      document.getElementById('ctaBtn').addEventListener('click', function(){
        var fl = document.getElementById('fullLanding');
        if(fl){ fl.style.transition = 'opacity .3s ease'; fl.style.opacity = '0'; }
        setTimeout(function(){ afterAuth(); }, 320);
      });
    }, 550);
  }

  function ticketText(){
    var g='<span class="gly">✦︎</span>';
    return '<span>Save the date</span>'+g+'<span>'+esc(W.dateLabel)+'</span>'+g
         + '<span>'+esc(W.cityLabel)+'</span>'+g;
  }
  function afterAuth(){ location.hash=''; if(!getMyRSVP()) renderRSVP(); else renderDetails(); }

  /* countdown */
  function clearCd(){ if(cdTimer){ clearInterval(cdTimer); cdTimer=null; } }
  function startCd(){
    var target = new Date(W.dateISO).getTime();
    function tick(){
      var cd = document.getElementById('cd'); if(!cd){ clearCd(); return; }
      var diff = target - Date.now();
      var d,h,m,s;
      if(diff<=0){ d=h=m=s=0; } else {
        d=Math.floor(diff/86400000); h=Math.floor(diff/3600000)%24; m=Math.floor(diff/60000)%60; s=Math.floor(diff/1000)%60;
      }
      cd.innerHTML = cell(d,'Days')+cell(h,'Hours')+cell(m,'Min');
    }
    function cell(n,l){ return '<div class="cd-cell"><div class="cd-num">'+String(n).padStart(2,'0')+'</div><div class="cd-lbl">'+l+'</div></div>'; }
    tick(); cdTimer=setInterval(tick,1000);
  }

  /* ============================================================
     RSVP — conversational
     ============================================================ */
  var convo, draft, step, history;
  function renderRSVP(){
    clearCd();
    app.className='';
    var t = getAuth().tier;
    var existing = getMyRSVP();
    draft = existing ? Object.assign({}, existing) : { tier:t };
    draft.tier = t;
    convo = [];
    history = [];
    app.innerHTML = letterhead('rsvp')
      + '<div class="rsvp-shell">'
      +   '<div class="rsvp-head">'
      +     '<div class="rsvp-required">Completing the RSVP will unlock the event details!</div>'
      +     '<h2>Let\'s chat!</h2>'
      +   '</div>'
      +   '<div class="chat" id="chat"></div>'
      + '</div>';
    bindNav();
    step = 'name';
    if(existing){ // greet returning editor
      ask('Lovely to see you again, '+esc(existing.name)+'! Want to update your reply? Let\u2019s run through it.');
    }
    askStep(step);
  }

  function ask(html){ convo.push({side:'them', html:html}); }
  function meSaid(text){ convo.push({side:'me', html:esc(text)}); }

  function questionFor(s){
    var existing = getMyRSVP();
    switch(s){
      case 'name': return existing ? 'Do let us know your first name + last name :)' : 'Hey there, we\'re so glad to have you! Do let us know your first name + last name :)';
      case 'attending': return 'Will you be able to celebrate with us?';
      case 'events': return 'Let us know which events you\'re available to join us for!';
      case 'dietary': return 'Any dietary needs or allergies that we should take note of?';
      case 'shuttle': return 'One more thing! We will be chartering a bus from Min Jiang @ Dempsey to Orchard / Botanic Gardens MRT after the dinner. Please let us know if you\'d like to register for this bus so we can make the necessary arrangements! P.S depending on the numbers, we might figure out alternative arrangements instead :)';
      case 'note': return 'Last thing -- leave us a message if you\'d like to! (totally optional haha)';
      case 'declinedNote': return 'That\'s ok! You\'ll be missed though! Feel free to leave us a message if you\'d like to (totally optional haha)!';
    }
    return '';
  }

  function askStep(s){
    history.push({step:s, draft:Object.assign({}, draft), convoLen: convo.length});
    ask(questionFor(s));
    paint();
  }

  function nextAfter(s){
    if(s==='name') return 'attending';
    if(s==='attending') return draft.attending ? (draft.tier===2 ? 'events' : 'dietary') : 'declinedNote';
    if(s==='events') return 'dietary';
    if(s==='dietary') return draft.tier===2 ? 'shuttle' : 'note';
    if(s==='shuttle') return 'note';
    return 'submit';
  }

  function answerArea(s){
    var box = document.createElement('div');
    box.className = 'answer-area' + (s==='attending'||s==='events' ? ' toright' : '');
    if(s==='name'){
      box.innerHTML = '<input class="field" id="ans" placeholder="e.g. Joey Tribbiani" value="'+esc(draft.name||'')+'" />'
        + '<div class="choice-row"><button class="btn small" id="go">Continue →</button></div>';
      wireText(box, function(v){ if(!v) return; draft.name=v; meSaid(v);
        var inviteMsg = draft.tier===2
          ? 'Here\'s the outline for the day\'s events! Feel free to come back to this page to edit your RSVP anytime :)<br/><br/><b>Wedding Ceremony + Lunch Reception</b><br/>Location: The Bible Church, Singapore<br/>Time: 10:30am<br/><br/><b>Tea Ceremony</b> <span class="tl-badge">Family Only</span><br/><b>+ Dinner Banquet</b><br/>Location: Min Jiang at Dempsey, Singapore<br/>Time:<br/>&bull; Tea Ceremony - 5:30pm (Family Only)<br/>&bull; Dinner Banquet - 7pm'
          : 'Here\'s the outline for the day\'s events! Feel free to come back to this page to edit your RSVP anytime :)<br/><br/><b>Wedding Ceremony + Lunch Reception</b><br/>Location: The Bible Church, Singapore<br/>Time: 10:30am';
        ask(inviteMsg); advance('name'); });
    }
    else if(s==='attending'){
      box.innerHTML = '<div class="choice-row">'
        + '<button class="btn" data-v="yes">Joyfully, yes!</button>'
        + '<button class="btn ghost" data-v="no">Unfortunately, no</button></div>';
      box.querySelectorAll('[data-v]').forEach(function(b){ b.onclick=function(){
        draft.attending = b.getAttribute('data-v')==='yes';
        meSaid(draft.attending ? 'Joyfully, yes!' : 'Unfortunately, no');
        advance('attending');
      };});
    }
    else if(s==='events'){
      box.innerHTML = '<div class="choice-row">'
        + '<button class="btn opt1" data-v="both">Church + Dinner</button>'
        + '<button class="btn opt2" data-v="church">Church only</button>'
        + '<button class="btn opt3" data-v="dinner">Dinner only</button></div>';
      box.querySelectorAll('[data-v]').forEach(function(b){ b.onclick=function(){
        draft.events=b.getAttribute('data-v');
        meSaid({both:'Church + Dinner',church:'Church only',dinner:'Dinner only'}[draft.events]);
        advance('events');
      };});
    }
    else if(s==='shuttle'){
      box.innerHTML = '<div class="choice-row">'
+ '<button class="btn" data-v="orchard">Yes, drop off at <u><em>Orchard MRT</em></u> please!</button>'
+ '<button class="btn" data-v="botanic">Yes, drop off at <u><em>Botanic Gardens MRT</em></u> please!</button>'
        + '<button class="btn ghost" data-v="no">No, it\'s alright!</button></div>';
      box.querySelectorAll('[data-v]').forEach(function(b){ b.onclick=function(){
        draft.shuttle=b.getAttribute('data-v');
        meSaid(draft.shuttle==='orchard' ? 'Yes, drop off at Orchard MRT please!' : draft.shuttle==='botanic' ? 'Yes, drop off at Botanic Gardens MRT please!' : 'No, it\'s alright!');
        ask('Thank you! We\'ll follow up on this!');
        advance('shuttle');
      };});
    }
    else if(s==='dietary'){
      box.innerHTML = '<input class="field" id="ans" placeholder="e.g. 1 vegetarian, no nuts" value="'+esc(draft.dietary||'')+'" />'
        + '<div class="choice-row"><button class="btn ghost small" id="none">No restrictions</button><button class="btn small" id="go">Continue →</button></div>';
      box.querySelector('#none').onclick=function(){ draft.dietary=''; meSaid('No restrictions'); advance('dietary'); };
      wireText(box, function(v){ draft.dietary=v; meSaid(v||'No restrictions'); advance('dietary'); });
    }
    else if(s==='note' || s==='declinedNote'){
      box.innerHTML = '<textarea class="field" id="ans" placeholder="Write something sweet…">'+esc(draft.note||'')+'</textarea>'
        + '<div class="choice-row"><button class="btn ghost small" id="skip">Skip</button><button class="btn small" id="go">'+(s==='declinedNote'?'Send':'Finish RSVP')+' ✦</button></div>';
      box.querySelector('#skip').onclick=function(){ draft.note=''; meSaid('(no note)'); finish(); };
      box.querySelector('#go').onclick=function(){ var v=box.querySelector('#ans').value.trim(); draft.note=v; meSaid(v||'(no note)'); finish(); };
    }
    if(history.length>1){
      var backRow = document.createElement('div');
      backRow.className = 'back-row';
      backRow.innerHTML = '<button class="btn ghost small" id="backBtn">\u2190 Back</button>';
      box.insertBefore(backRow, box.firstChild);
      backRow.querySelector('#backBtn').onclick = goBack;
    }
    return box;
  }

  function wireText(box, cb){
    var go = box.querySelector('#go'); var inp = box.querySelector('#ans');
    if(go) go.onclick=function(){ cb(inp.value.trim()); };
    if(inp) inp.addEventListener('keydown', function(e){ if(e.key==='Enter' && inp.tagName!=='TEXTAREA'){ e.preventDefault(); cb(inp.value.trim()); } });
  }

  function advance(s){ step = nextAfter(s); if(step==='submit'){ finish(); } else { askStep(step); } }

  function goBack(){
    if(history.length<2) return;
    history.pop();
    var prev = history.pop();
    draft = Object.assign({}, prev.draft);
    convo.length = prev.convoLen;
    step = prev.step;
    askStep(step);
  }

  function paint(){
    var chat = document.getElementById('chat'); if(!chat) return;
    var html = convo.map(function(b, i){
      var enter = i===convo.length-1 ? ' enter' : '';
      if(b.side==='them') return '<div class="bubble them'+enter+'"><span class="who">Joshua & Dorcas</span>'+b.html+'</div>';
      return '<div class="bubble me'+enter+'">'+b.html+'</div>';
    }).join('');
    chat.innerHTML = html;
    chat.appendChild(answerArea(step));
    var area = chat.lastChild;
    var focusable = area.querySelector('input, textarea'); if(focusable) focusable.focus();
    var thems = chat.querySelectorAll('.bubble.them');
var lastThem = thems[thems.length-1];
requestAnimationFrame(function(){
  if(lastThem){
    var offset = window.innerWidth <= 780 ? 170 : 90;
    var y = lastThem.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior:'smooth' });
  } else {
    window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
  }
});
  }
  function finish(){
    var rec = {
      id: draft.id || uid(),
      name: draft.name || 'Guest',
      tier: draft.tier,
      attending: !!draft.attending,
      count: draft.attending ? (draft.count||1) : 0,
      events: draft.attending ? (draft.tier===2 ? (draft.events||'both') : 'church') : '',
      dietary: draft.dietary||'',
      shuttle: draft.attending && draft.tier===2 ? (draft.shuttle||'') : '',
      note: draft.note||'',
      status: draft.attending ? 'attending' : 'declined',
      ts: (new Date()).toISOString().slice(0,10)
    };
    // upsert into admin list
    var list = getResponses();
    var idx = draft.id ? list.findIndex(function(r){ return r.id===draft.id; }) : -1;
    if(idx>=0) list[idx]=rec; else list.unshift(rec);
    saveResponses(list);
    setMyRSVP(rec);
    postToSheet('upsert', {record: rec});
    renderConfirm(rec);
  }

  function renderConfirm(rec){
    var chat = document.getElementById('chat');
    var msg = rec.attending
      ? 'Great, we\'re all set! Can\'t wait to celebrate with you!'
      : 'Thanks for letting us know! Take care and we wish you well! ❤️';
    chat.innerHTML += '<div class="bubble them enter"><span class="who">Joshua & Dorcas</span>'+msg+'</div>';
    chat.innerHTML += '<div class="confirm-card enter">'
      + '<div class="monogram" style="color:var(--accent)">RSVP received</div>'
      + '<p class="helper" style="font-size:13px;letter-spacing:.04em;">Thank you '+esc(rec.name)+'! You can change your RSVP response anytime via the Edit RSVP page button above :)</p>'
      + (rec.attending ? '<button class="btn" id="toDetails">Open the wedding details →</button>'
                       : '<button class="btn ghost" id="toDetails">View the details anyway →</button>')
      + '</div>';
    var b=document.getElementById('toDetails'); if(b) b.onclick=function(){ renderDetails(); window.scrollTo(0,0); };
    window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
  }

  /* ============================================================
     DETAILS (gated by tier)
     ============================================================ */
  function renderDetails(){
    clearCd();
    var t = getAuth().tier;
    var sched = W.schedule.filter(function(s){ return s.minTier<=t; });
    var venues = W.venues.map(function(v){
      return Object.assign({}, v, { events: v.events.filter(function(ev){ return ev.minTier<=t; }) });
    }).filter(function(v){ return v.events.length; });

    var html = letterhead('details');
    html += '<div class="wrap">';
    // hero
    html += '<section class="hero">'
      + '<div class="monogram">Together with their families</div>'
      + '<h1>Joshua <span class="amp">&amp;</span> Dorcas</h1>'
      + '<div class="when">'+esc(W.dateLabel)+' · '+esc(W.timeLabel)+'</div>'
      + '<div class="access-banner">✦ You\u2019re invited to: <b style="margin-left:4px">'+esc(W.tiers[t].name)+'</b></div>'
      + '</section>';

    // our story
    var photos = (W.ourStory.photos && W.ourStory.photos.length) ? W.ourStory.photos : getStoryPhotos();
    html += '<section class="section-block"><div class="section-title"><span class="gly">❦</span><h2>Our Story</h2></div>'
      + '<div class="story">'
      +   '<div class="story-photo" id="storyCarousel">'
      +     (photos.length ? photos.map(function(p,i){ return '<img class="sp-img'+(i===0?' on':'')+'" src="'+p+'" />'; }).join('') : '<div class="sp-empty">Add photos of the two of you from Admin → Our Story photos</div>')
      +     (photos.length>1 ? '<button class="sp-nav prev" id="spPrev">‹</button><button class="sp-nav next" id="spNext">›</button><div class="sp-dots">'+photos.map(function(_,i){ return '<span class="sp-dot'+(i===0?' on':'')+'"></span>'; }).join('')+'</div>' : '')
      +   '</div>'
      +   '<p class="story-body">'+esc(W.ourStory.body)+'</p>'
      + '</div>'
      + '<div class="fun-facts">'
      +   W.ourStory.funFacts.map(function(f){
            return '<div class="fun-fact"><div class="ff-q">'+esc(f.q)+'</div><div class="ff-a">'+esc(f.a)+'</div></div>';
          }).join('')
      + '</div></section>';

    // schedule
    html += '<section class="section-block"><div class="section-title"><span class="gly">✦︎</span><h2>Timeline of the Day' + "'s Events</h2></div>"
      + '<div class="timeline">'
      + sched.map(function(s){
          return '<div class="tl-item"><div class="tl-time">'+esc(s.time)+'</div>'
               + '<div class="tl-title">'+esc(s.title)+ (s.tag?'<span class="tl-badge">'+esc(s.tag)+'</span>':'') +'</div>'
               + '<div class="tl-place">'+esc(s.place)+'</div></div>';
        }).join('')
      + '</div></section>';

    // venues
    html += '<section class="section-block"><div class="section-title"><span class="gly">✦</span><h2>Where</h2><span class="tt">Venues &amp; maps</span></div>'
      + '<div class="venues">'
      + venues.map(function(v){
          return '<div class="venue"><h3>'+esc(v.name)+'</h3><div class="addr">'+esc(v.address)+'</div>'
               + (v.parkingNote?'<div class="note">'+esc(v.parkingNote).replace('Parking FAQ below','<a href="#" class="parking-link">Parking FAQ below</a>')+'</div>':'')
               + '<div class="venue-events">'
               + v.events.map(function(ev){
                   return '<div class="venue-event'+(ev.tag?' has-tag':'')+'"><div class="ve-top"><span class="label">'+esc(ev.label)+'</span>'+(ev.tag?'<span class="tl-badge ve-badge">'+esc(ev.tag)+'</span>':'')+'<span class="ve-time">'+esc(ev.time)+'</span></div>'
                        + '<div class="note">'+esc(ev.detail)+'</div>'
                        + (ev.dress?'<div class="note dress-note">'+esc(ev.dress)+'</div>':'')
                        + '</div>';
                 }).join('')
               + '</div>'
               + '<a class="btn small" target="_blank" rel="noopener" href="'+mapUrl(v.map)+'">Open in maps →</a></div>';
        }).join('')
      + '</div></section>';

    // faq
    html += '<section class="section-block"><div class="section-title"><span class="gly">✦︎</span><h2>FAQ</h2></div><div id="faq">'
      + W.faq.map(function(f,i){
          return '<div class="faq-item'+(f.q.toLowerCase().indexOf('parking')>=0?' faq-parking':'')+'"><button class="faq-q" data-faq="'+i+'">'+esc(f.q)+'</button>'
               + '<div class="faq-a"><p>'+(f.html?f.a:esc(f.a))+'</p></div></div>';
        }).join('')
      + '</div></section>';

    html += '<footer class="foot"><div class="rule-orn"><span class="gly">✦︎</span></div>'
      + '<div class="monogram">J <span class="amp">&amp;</span> D · '+esc(W.dateLabel)+'</div>'
      + '<p class="helper" style="margin-top:14px">Need to change your reply? '
      + '<button class="linkbtn" data-nav="rsvp">Edit my RSVP</button></p>'
      + '</footer>';
    html += '</div>';

    app.className='';
    app.innerHTML = html;
    bindNav();
    app.querySelectorAll('[data-faq]').forEach(function(b){
      b.addEventListener('click', function(){ b.closest('.faq-item').classList.toggle('open'); });
    });
    initStoryCarousel();
    app.querySelectorAll('.parking-link').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var item = document.querySelector('.faq-parking');
        if(!item) return;
        item.classList.add('open');
        item.scrollIntoView({behavior:'smooth', block:'center'});
      });
    });
  }

  var storyTimer = null;
  function initStoryCarousel(){
    var box = document.getElementById('storyCarousel');
    if(!box) return;
    var imgs = box.querySelectorAll('.sp-img');
    if(imgs.length<2) return;
    var i = 0;
    function show(n){
      i = (n+imgs.length)%imgs.length;
      imgs.forEach(function(im,k){ im.classList.toggle('on', k===i); });
      box.querySelectorAll('.sp-dot').forEach(function(d,k){ d.classList.toggle('on', k===i); });
    }
    box.querySelector('#spPrev').onclick=function(){ show(i-1); resetTimer(); };
    box.querySelector('#spNext').onclick=function(){ show(i+1); resetTimer(); };
    function resetTimer(){ clearInterval(storyTimer); storyTimer=setInterval(function(){ show(i+1); }, 4500); }
    resetTimer();
  }

  /* ============================================================
     ADMIN
     ============================================================ */
  var adminFilter = 'all', adminSearch = '';
  function renderAdmin(){
    clearCd();
    if(!isAdmin()){ return renderAdminGate(); }
    app.className='';
    renderAdminShell();
    if(sheetConfigured()){
      var wrap = document.getElementById('tablewrap');
      if(wrap) wrap.innerHTML = '<div class="empty">Syncing with your Google Sheet…</div>';
      fetchSheetResponses().then(function(list){
        if(list) saveResponses(list);
        renderAdminShell();
      });
    }
  }
  function renderAdminShell(){
    var list = getResponses();
    var attending = list.filter(function(r){ return r.attending; });
    var guestsAttending = attending.length;
    var declined = list.filter(function(r){ return !r.attending; }).length;
    var dinnerHead = attending.filter(function(r){ return r.tier===2 && (r.events==='both'||r.events==='dinner'); }).length;

    var html = '<header class="letterhead"><div class="inner">'
      + '<span class="mono-brand">Joshua <span class="amp">&amp;</span> Dorcas</span>'
      + '<span class="tier-pill on">Admin console</span>'
      + '<nav><a href="#" data-nav="back">← Back to site</a><a href="#" data-nav="adminout">Lock</a></nav>'
      + '</div></header>';
    html += '<div class="wrap-wide admin">'
      + '<h1>RSVP responses</h1>'
      + '<p class="helper" style="margin-top:6px">'+(sheetConfigured()?'Synced live from your connected Google Sheet.':'Replies are saved in this browser only — connect a Google Sheet below to collect RSVPs from every guest device.')+'</p>'
      + '<div class="stats">'
      +   stat(list.length,'Total replies',false)
      +   stat(guestsAttending,'Guests attending',true)
      +   stat(declined,'Declined',false)
      +   stat(dinnerHead,'Dinner headcount',true)
      + '</div>'
      + '<div class="pw-settings">'
      +   '<h3>Invitation passwords</h3>'
      +   '<p class="helper" style="margin:4px 0 14px">Update the passwords guests and admins use to sign in.</p>'
      +   '<form id="pwSettingsForm" class="pw-settings-grid">'
      +     '<label>Ceremony + Lunch<input class="field" id="pwTier1" value="'+esc(getPasswords().tier1)+'" autocomplete="off" /></label>'
      +     '<label>+ Dinner Banquet<input class="field" id="pwTier2" value="'+esc(getPasswords().tier2)+'" autocomplete="off" /></label>'
      +     '<label>Admin access<input class="field" id="pwAdmin" value="'+esc(getPasswords().admin)+'" autocomplete="off" /></label>'
      +     '<button class="btn small" type="submit">Save passwords</button>'
      +   '</form>'
      + '</div>'
      + '<div class="pw-settings">'
      +   '<h3>Live RSVP sync '+(sheetConfigured()?'<span class="badge yes" style="margin-left:8px">Connected</span>':'<span class="badge no" style="margin-left:8px">Not connected</span>')+'</h3>'
      +   '<p class="helper" style="margin:4px 0 14px">Paste your Google Apps Script Web App URL so guest RSVPs from any device land here.</p>'
      +   '<form id="sheetSettingsForm" class="pw-settings-grid">'
      +     '<label style="grid-column:1 / -1">Sheet endpoint URL<input class="field" id="sheetUrl" value="'+esc(getSheetEndpoint())+'" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" /></label>'
      +     '<button class="btn small" type="submit">Save & sync</button>'
      +   '</form>'
      + '</div>'
      + '<div class="pw-settings">'
      +   '<h3>Our Story photos</h3>'
      +   '<p class="helper" style="margin:4px 0 14px">Upload photos to cycle through in the "Our Story" section. Drag to reorder isn\'t supported yet — remove and re-add to reorder.</p>'
      +   '<div class="story-photo-grid" id="storyPhotoGrid">'
      +     getStoryPhotos().map(function(p,i){ return '<div class="sp-thumb"><img src="'+p+'" /><button type="button" class="sp-remove" data-i="'+i+'">×</button></div>'; }).join('')
      +   '</div>'
      +   '<input type="file" id="storyPhotoInput" accept="image/*" multiple style="margin-top:12px" />'
      + '</div>'
      + '<div class="toolbar"><div class="chips">'
      +   chip('all','All')+chip('t1','Ceremony tier')+chip('t2','Dinner tier')+chip('attending','Attending')+chip('declined','Declined')
      + '</div><input class="field search" id="adminSearch" placeholder="Search guest…" value="'+esc(adminSearch)+'" /></div>'
      + '<div class="tablewrap" id="tablewrap"></div>'
      + '</div>';
    app.innerHTML = html;

    app.querySelector('[data-nav="back"]').onclick=function(e){ e.preventDefault(); location.hash=''; route(); };
    app.querySelector('[data-nav="adminout"]').onclick=function(e){ e.preventDefault(); sessionStorage.removeItem('jd_admin'); location.hash=''; route(); };
    document.getElementById('pwSettingsForm').addEventListener('submit', function(e){
      e.preventDefault();
      setPasswords({
        tier1: document.getElementById('pwTier1').value.trim() || getPasswords().tier1,
        tier2: document.getElementById('pwTier2').value.trim() || getPasswords().tier2,
        admin: document.getElementById('pwAdmin').value.trim() || getPasswords().admin
      });
      toast('Passwords updated');
    });
    document.getElementById('sheetSettingsForm').addEventListener('submit', function(e){
      e.preventDefault();
      setSheetEndpoint(document.getElementById('sheetUrl').value.trim());
      toast(sheetConfigured() ? 'Connected — syncing…' : 'Sheet endpoint cleared');
      renderAdmin();
    });
    document.getElementById('storyPhotoInput').addEventListener('change', function(e){
      var files = Array.prototype.slice.call(e.target.files||[]);
      if(!files.length) return;
      var reads = files.map(function(f){
        return new Promise(function(res){ var r=new FileReader(); r.onload=function(){ res(r.result); }; r.readAsDataURL(f); });
      });
      Promise.all(reads).then(function(urls){
        setStoryPhotos(getStoryPhotos().concat(urls));
        renderAdmin();
        toast('Photo(s) added');
      });
    });
    app.querySelectorAll('.sp-remove').forEach(function(b){
      b.onclick=function(){
        var i = +b.getAttribute('data-i');
        var arr = getStoryPhotos(); arr.splice(i,1); setStoryPhotos(arr);
        renderAdmin(); toast('Photo removed');
      };
    });
    app.querySelectorAll('[data-chip]').forEach(function(c){ c.onclick=function(){ adminFilter=c.getAttribute('data-chip'); renderTable(); syncChips(); }; });
    var srch = document.getElementById('adminSearch');
    srch.addEventListener('input', function(){ adminSearch=srch.value; renderTable(); });
    renderTable();
  }
  function stat(n,l,accent){ return '<div class="stat"><div class="big'+(accent?' accent':'')+'">'+n+'</div><div class="lbl">'+l+'</div></div>'; }
  function chip(k,l){ return '<button class="chip'+(adminFilter===k?' on':'')+'" data-chip="'+k+'">'+l+'</button>'; }
  function syncChips(){ app.querySelectorAll('[data-chip]').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-chip')===adminFilter); }); }

  function filtered(){
    var list = getResponses();
    return list.filter(function(r){
      if(adminFilter==='t1' && r.tier!==1) return false;
      if(adminFilter==='t2' && r.tier!==2) return false;
      if(adminFilter==='attending' && !r.attending) return false;
      if(adminFilter==='declined' && r.attending) return false;
      if(adminSearch && r.name.toLowerCase().indexOf(adminSearch.toLowerCase())<0) return false;
      return true;
    });
  }
  var EVTXT = {both:'Church + Dinner', church:'Church only', dinner:'Dinner only', '':'—'};
  function renderTable(){
    var wrap = document.getElementById('tablewrap'); if(!wrap) return;
    var rows = filtered();
    if(!rows.length){ wrap.innerHTML='<div class="empty">No responses match this filter.</div>'; return; }
    wrap.innerHTML = '<table class="rsvp-table"><thead><tr>'
      + '<th>Guest</th><th>Tier</th><th>Reply</th><th>Events</th><th>Dietary</th><th>Shuttle</th><th>Note</th><th>Manage</th>'
      + '</tr></thead><tbody>'
      + rows.map(function(r){
          var reply = r.attending ? '<span class="badge yes">Yes</span>' : '<span class="badge no">No</span>';
          var tier = r.tier===2 ? '<span class="badge t2">Dinner</span>' : '<span class="badge t1">Ceremony</span>';
          return '<tr>'
            + '<td><b>'+esc(r.name)+'</b><div class="helper">'+esc(r.ts||'')+'</div></td>'
            + '<td>'+tier+'</td><td>'+reply+'</td>'
            + '<td>'+esc(EVTXT[r.events]||'—')+'</td>'
            + '<td>'+(r.dietary?esc(r.dietary):'<span class="helper">—</span>')+'</td>'
            + '<td>'+(r.tier===2 ? (r.shuttle==='orchard'?'Orchard MRT':r.shuttle==='botanic'?'Botanic Gardens MRT':r.shuttle==='no'?'No':'<span class="helper">—</span>') : '<span class="helper">—</span>')+'</td>'
            + '<td>'+(r.note?'<span title="'+esc(r.note)+'">'+esc(r.note.length>26?r.note.slice(0,26)+'…':r.note)+'</span>':'<span class="helper">—</span>')+'</td>'
            + '<td><div class="row-actions"><button class="icbtn" data-edit="'+r.id+'" title="Edit">✎</button>'
            + '<button class="icbtn" data-del="'+r.id+'" title="Delete">🗑</button></div></td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>';
    wrap.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ delResponse(b.getAttribute('data-del')); }; });
    wrap.querySelectorAll('[data-edit]').forEach(function(b){ b.onclick=function(){ editResponse(b.getAttribute('data-edit')); }; });
  }

  function delResponse(id){
    var r = getResponses().find(function(x){ return x.id===id; });
    if(!confirm('Delete the RSVP from '+(r?r.name:'this guest')+'?')) return;
    saveResponses(getResponses().filter(function(x){ return x.id!==id; }));
    postToSheet('delete', {id: id});
    renderAdmin(); toast('Response deleted');
  }

  function editResponse(id){
    var r = getResponses().find(function(x){ return x.id===id; }); if(!r) return;
    var bg = document.createElement('div'); bg.className='modal-bg';
    bg.innerHTML = '<div class="modal">'
      + '<h3>Edit RSVP</h3>'
      + '<label>Guest name</label><input class="field" id="e_name" value="'+esc(r.name)+'" />'
      + '<label>Attending</label>'
      + '<div class="chips"><button class="chip" data-att="1">Attending</button><button class="chip" data-att="0">Declined</button></div>'
      + '<label>Events</label><select class="field" id="e_events"><option value="both">Church + Dinner</option><option value="church">Church only</option><option value="dinner">Dinner only</option><option value="">—</option></select>'
      + '<label>Dietary</label><input class="field" id="e_diet" value="'+esc(r.dietary)+'" />'
      + '<label>Note</label><textarea class="field" id="e_note">'+esc(r.note)+'</textarea>'
      + '<div class="actions"><button class="btn ghost small" id="e_cancel">Cancel</button><button class="btn small" id="e_save">Save</button></div>'
      + '</div>';
    document.body.appendChild(bg);
    var att = r.attending?1:0;
    function syncAtt(){ bg.querySelectorAll('[data-att]').forEach(function(c){ c.classList.toggle('on', +c.getAttribute('data-att')===att); }); }
    bg.querySelectorAll('[data-att]').forEach(function(c){ c.onclick=function(){ att=+c.getAttribute('data-att'); syncAtt(); }; });
    syncAtt();
    bg.querySelector('#e_events').value = r.events||'';
    bg.querySelector('#e_cancel').onclick=function(){ bg.remove(); };
    bg.addEventListener('click', function(e){ if(e.target===bg) bg.remove(); });
    bg.querySelector('#e_save').onclick=function(){
      r.name = bg.querySelector('#e_name').value.trim()||r.name;
      r.attending = att===1;
      r.events = att===1 ? bg.querySelector('#e_events').value : '';
      r.dietary = bg.querySelector('#e_diet').value.trim();
      r.note = bg.querySelector('#e_note').value.trim();
      r.status = r.attending?'attending':'declined';
      var list = getResponses(); var i = list.findIndex(function(x){ return x.id===id; }); list[i]=r; saveResponses(list);
      postToSheet('upsert', {record: r});
      // keep guest's own copy in sync if it's theirs
      var mine = getMyRSVP(); if(mine && mine.id===id) setMyRSVP(r);
      bg.remove(); renderAdmin(); toast('Response updated');
    };
  }

  function renderAdminGate(){
    app.className='';
    app.innerHTML = '<div class="admin-gate">'
      + '<div class="monogram" style="color:var(--accent)">Private</div>'
      + '<h2>Admin Console</h2>'
      + '<p class="helper" style="margin-bottom:18px">For J &amp; D only.</p>'
      + '<form id="ag"><input class="field center" id="apw" type="password" placeholder="admin password" style="margin-bottom:10px" />'
      + '<button class="btn" style="width:100%;justify-content:center" type="submit">Unlock</button>'
      + '<div class="err" id="aerr" style="text-align:center"></div></form>'
      + '<p style="margin-top:20px"><button class="linkbtn" data-nav="home">← Back to wedding site</button></p>'
      + '</div>';
    document.getElementById('ag').addEventListener('submit', function(e){
      e.preventDefault();
      var v=document.getElementById('apw').value.trim();
      if(v===String(getPasswords().admin)){ sessionStorage.setItem('jd_admin','1'); renderAdmin(); }
      else { document.getElementById('aerr').textContent='✗ Wrong password'; }
    });
    var back=app.querySelector('[data-nav="home"]'); if(back) back.onclick=function(e){ e.preventDefault(); location.hash=''; route(); };
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function route(){
    if(location.hash.indexOf('admin')>=0){ renderAdmin(); return; }
    if(!getAuth()){ renderLanding(); return; }
    if(!getMyRSVP()){ renderRSVP(); return; }
    renderDetails();
  }
  window.addEventListener('hashchange', route);

  // expose a tiny reset for demo convenience
  window.__resetWedding = function(){ localStorage.removeItem('jd_auth'); localStorage.removeItem('jd_my'); localStorage.removeItem('jd_responses'); sessionStorage.removeItem('jd_admin'); ensureSeed(); location.hash=''; route(); };

  route();
})();
