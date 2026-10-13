/* ================= network play =================
   Rooms with a short code on a tiny Cloudflare relay (server/). The relay introduces the players and the game
   then runs over direct WebRTC data channels; a pair that cannot connect directly keeps playing through the relay.
   Who decides what:
   - each player flies their own jet and sends its state 10 times a second;
   - a missile is decided on the machine of the player it is aimed at (that is where the flares are);
   - gun hits are decided by the shooter;
   - in co-op the host runs the enemy (MiGs, drones, SAMs, ground) and sends it 8 times a second;
     a guest's kills are sent to the host, which applies them.
   Voice: push-to-talk over the same WebRTC connection, with a radio filter; two channels. */
const MP={ws:null,id:null,host:false,code:null,name:'',peers:new Map(),url:null,live:false,want:null,mic:null,micOn:false,micAsk:false,
  ice:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],
  async server(){if(MP.url)return MP.url;let u=null;
    try{u=new URLSearchParams(location.search).get('mp');}catch(e){}
    if(!u)try{u=localStorage.getItem('haniaflight-mpurl');}catch(e){}
    for(const src of['mp.json','https://raw.githubusercontent.com/l2005l/HaniaFlight2026/main/mp.json']){if(u)break;try{const r=await fetch(src,{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.url)u=j.url;}}catch(e){}}
    MP.url=u?u.replace(/\/$/,''):null;return MP.url;},
  status(t){mpUi.status(t);},
  async connect(code,name){MP.leave(true);const url=await MP.server();if(!url){MP.status('שרת המשחק ברשת עוד לא הוגדר. ראה הוראות ב-README.');return false;}
    MP.code=code;MP.name=name;MP.status('מתחבר לחדר '+code+'…');
    return new Promise(res=>{let ok=false;let ws;try{ws=new WebSocket(url+'/room/'+code+'?name='+encodeURIComponent(name));}catch(e){MP.status('החיבור לשרת נכשל.');res(false);return;}MP.ws=ws;
      const to=setTimeout(()=>{if(!ok){MP.status('השרת לא עונה. בדוק את החיבור לאינטרנט.');try{ws.close();}catch(e){}res(false);}},9000);
      ws.onmessage=e=>{let o;try{o=JSON.parse(e.data);}catch(x){return;}
        if(o.t==='hello'){ok=true;clearTimeout(to);MP.id=o.id;MP.host=o.host;MP.live=true;for(const p of o.peers)MP.addPeer(p,true);mpUi.room();MP.status('');res(true);}
        else if(o.t==='full'){clearTimeout(to);MP.status('החדר מלא (עד 4 שחקנים).');res(false);}
        else if(o.t==='join'){MP.addPeer(o.peer,false);mpUi.room();if(MP.host)mpg.sendRoom();}
        else if(o.t==='leave'){MP.dropPeer(o.id,o.host);}
        else if(o.t==='sig')MP.signal(o.from,o.d);
        else if(o.t==='g'&&o.d)mpg.recv(o.d,o.from,true);};
      ws.onclose=()=>{clearTimeout(to);if(MP.ws!==ws)return;const was=MP.live;MP.live=false;MP.ws=null;if(!ok){MP.status('לא ניתן להתחבר לשרת. ייתכן שהמכסה היומית של השרת נגמרה; היא מתחדשת ב-3 בלילה.');res(false);}else if(was){MP.status('החיבור לשרת נותק.');mpg.lost('השרת');}mpUi.room();};
      ws.onerror=()=>{};});},
  leave(silent){const ws=MP.ws;MP.ws=null;MP.live=false;try{if(ws)ws.close();}catch(e){}for(const id of[...MP.peers.keys()])MP.dropPeer(id,false,true);MP.id=null;MP.host=false;if(!silent)mpUi.room();},
  wsSend(o){try{if(MP.ws&&MP.ws.readyState===1)MP.ws.send(JSON.stringify(o));}catch(e){}},
  addPeer(info,offer){if(MP.peers.has(info.id))return;const P={id:info.id,name:info.name||'טייס',host:!!info.host,via:'wait',st:null,pc:null,dcU:null,dcR:null,plane:'',ch:1,talk:false,audio:null};MP.peers.set(P.id,P);
    try{MP.rtc(P,offer);}catch(e){P.via='relay';}if(P.via==='relay')setTimeout(()=>mpg.hi(P),300);
    P.timer=setTimeout(()=>{if(P.via!=='p2p'){P.via='relay';mpUi.room();mpg.hi(P);}},8000);},
  rtc(P,offer){if(typeof RTCPeerConnection==='undefined'){P.via='relay';return;}
    const pc=P.pc=new RTCPeerConnection({iceServers:MP.ice});
    pc.onicecandidate=e=>{if(e.candidate)MP.wsSend({t:'sig',to:P.id,d:{ice:e.candidate}});};
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed'){if(P.via==='p2p'){P.via='relay';mpUi.room();}}};
    pc.ontrack=e=>mpVoice.attach(P,e.streams[0]||new MediaStream([e.track]));
    const tr=pc.addTransceiver('audio',{direction:'sendrecv'});P.sender=tr.sender;if(MP.mic)tr.sender.replaceTrack(MP.mic).catch(()=>{});
    const wire=(dc,rel)=>{dc.onopen=()=>{if(rel){P.via='p2p';mpUi.room();mpg.hi(P);}};dc.onclose=()=>{if(rel&&P.via==='p2p'){P.via='relay';mpUi.room();}};dc.onmessage=e=>{let o;try{o=JSON.parse(e.data);}catch(x){return;}mpg.recv(o,P.id,false);};if(rel)P.dcR=dc;else P.dcU=dc;};
    if(offer){wire(pc.createDataChannel('r',{ordered:true}),true);wire(pc.createDataChannel('u',{ordered:false,maxRetransmits:0}),false);
      pc.createOffer().then(d=>pc.setLocalDescription(d)).then(()=>MP.wsSend({t:'sig',to:P.id,d:{sdp:pc.localDescription}})).catch(()=>{P.via='relay';});}
    else pc.ondatachannel=e=>wire(e.channel,e.channel.label==='r');},
  async signal(from,d){const P=MP.peers.get(from);if(!P||!P.pc||!d)return;const pc=P.pc;
    try{if(d.sdp){await pc.setRemoteDescription(d.sdp);if(d.sdp.type==='offer'){const tr=pc.getTransceivers().find(t=>t.receiver&&t.receiver.track&&t.receiver.track.kind==='audio');if(tr){tr.direction='sendrecv';P.sender=tr.sender;if(MP.mic)tr.sender.replaceTrack(MP.mic).catch(()=>{});}
        const a=await pc.createAnswer();await pc.setLocalDescription(a);MP.wsSend({t:'sig',to:from,d:{sdp:pc.localDescription}});}}
      else if(d.ice)await pc.addIceCandidate(d.ice);}catch(e){}},
  dropPeer(id,wasHost,quiet){const P=MP.peers.get(id);if(!P)return;MP.peers.delete(id);clearTimeout(P.timer);try{if(P.pc)P.pc.close();}catch(e){}mpVoice.detach(P);
    if(!quiet){mpg.left(P,wasHost);mpUi.room();}},
  /* send to everyone: data channel where open, relay for the rest (one relay message when everyone is on the relay) */
  send(o,rel){if(!MP.live)return;const s=JSON.stringify(o);let relay=[];
    for(const P of MP.peers.values()){const dc=rel?P.dcR:(P.dcU||P.dcR);if(P.via==='p2p'&&dc&&dc.readyState==='open'){try{dc.send(s);}catch(e){relay.push(P);}}else if(P.via==='relay'||rel)relay.push(P);}
    if(!relay.length)return;if(relay.length===MP.peers.size)MP.wsSend({t:'g',d:o});else for(const P of relay)MP.wsSend({t:'g',to:P.id,d:o});},
  sendTo(id,o,rel){const P=MP.peers.get(id);if(!P)return;const dc=rel?P.dcR:(P.dcU||P.dcR);if(P.via==='p2p'&&dc&&dc.readyState==='open'){try{dc.send(JSON.stringify(o));return;}catch(e){}}if(P.via==='relay'||rel)MP.wsSend({t:'g',to:id,d:o});}};

/* push-to-talk radio: the microphone track is always attached but only enabled while talking */
const mpVoice={
  async micStart(){if(MP.mic||MP.micAsk)return!!MP.mic;MP.micAsk=true;
    try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});MP.mic=s.getAudioTracks()[0];MP.mic.enabled=false;
      for(const P of MP.peers.values())if(P.sender)P.sender.replaceTrack(MP.mic).catch(()=>{});return true;}catch(e){MP.micAsk=false;toast('אין גישה למיקרופון. הקשר הקולי לא יעבוד; ההודעות המוכנות כן.');return false;}},
  attach(P,stream){Snd.init();const ac=Snd.ac;if(!ac||P.audio)return;
    const el=new Audio();el.srcObject=stream;el.muted=true;el.play().catch(()=>{});
    const src=ac.createMediaStreamSource(stream),hp=ac.createBiquadFilter(),lp=ac.createBiquadFilter(),sh=ac.createWaveShaper(),g=ac.createGain();
    hp.type='highpass';hp.frequency.value=380;lp.type='lowpass';lp.frequency.value=3000;const c=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;c[i]=Math.tanh(x*2.2)/Math.tanh(2.2);}sh.curve=c;g.gain.value=0;
    src.connect(hp);hp.connect(lp);lp.connect(sh);sh.connect(g);g.connect(Snd.master);P.audio={el,src,g};},
  detach(P){if(!P.audio)return;try{P.audio.g.disconnect();P.audio.src.disconnect();P.audio.el.srcObject=null;}catch(e){}P.audio=null;},
  hears(P){return P.ch===1||P.ch===mpg.ch;},
  /* a peer keyed or released the mic */
  ptt(P,on,ch){P.talk=on;P.ch=ch||1;const hear=mpVoice.hears(P);if(P.audio)P.audio.g.gain.setTargetAtTime(on&&hear?1.6:0,Snd.ac.currentTime,0.02);
    if(hear){mpVoice.click(on);mpg.talkers();}},
  click(on){if(!Snd.ac)return;const ac=Snd.ac,n=ac.createBufferSource(),b=ac.createBuffer(1,ac.sampleRate*0.09,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)*0.5;n.buffer=b;const g=ac.createGain();g.gain.value=0.25;n.connect(g);g.connect(Snd.master);n.start();if(!on)beep(1700,0.07,0.04,'sine');},
  async key(on){if(!MP.live)return;if(on&&!MP.mic&&!(await mpVoice.micStart()))return;if(MP.mic)MP.mic.enabled=on;if(MP.micOn===on)return;MP.micOn=on;MP.send({t:'ptt',on,ch:mpg.ch},true);mpVoice.click(on);$('pttBtn').dataset.on=on?'1':'';}};

/* the game over the network */
const QUICK=['כסה אותי','אני תוקף','פונה ימינה','פונה שמאלה','טיל באוויר!','נפגעתי','בינגו, חוזר הביתה','רואה אותך','מצטרף אליך','כן'];
const mpg={on:false,cfg:null,room:{mode:'coop',start:'air'},ch:1,sT:0,wT:0,nT:0,netN:0,live:new Set(),sent:false,overSent:false,lostSent:false,
  sendRoom(){if(!MP.host)return;const r=mpg.room;MP.send({t:'room',mode:r.mode,start:r.start,mission:opts.mission,theatre:opts.theatre,isrBase:opts.isrBase,diff:opts.diff,tod:opts.tod,wx:opts.wx},true);},
  hi(P){MP.sendTo(P.id,{t:'me',plane:opts.plane,call:readPilot().call||''},true);if(MP.host)mpg.sendRoom();},
  left(P,wasHost){if(mpg.on&&W){const r=W.remotes.find(x=>x.id===P.id);if(r&&r.alive){r.alive=false;r.gone=true;W.events.push({type:'kill',e:r});}radioQ.push(`רשת: ${P.name} יצא מהמשחק.`);
      if(!W.over&&((wasHost&&!MP.host)||(mpg.cfg.mode==='pvp'&&!W.remotes.some(x=>!x.gone))))W.over={win:false,title:'החיבור נותק',reason:wasHost?'המארח יצא מהמשחק.':'היריב יצא מהמשחק.'};}
    else if(wasHost)MP.status('המארח יצא. החדר נסגר.');},
  end(){if(!mpg.on)return;MP.send({t:'end'},true);mpg.on=false;},
  lost(what){if(mpg.on&&W&&!W.over)W.over={win:false,title:'החיבור נותק',reason:'הקשר עם '+what+' אבד.'};},
  /* ---- references to world objects, the same on every machine ---- */
  ref(e){if(!e)return null;if(e===W.player)return{p:MP.id};if(e.remote)return{p:e.id};let i;
    if((i=W.migs.indexOf(e))>=0)return{m:i};if((i=W.drones.indexOf(e))>=0)return{d:i};if((i=W.ground.indexOf(e))>=0)return{g:i};if((i=W.sams.indexOf(e))>=0)return{s:i};
    if((i=W.strikers.findIndex(k=>k.ac===e))>=0)return{k:i};if(e===W.helo)return{h:1};if(e===W.tanker)return{t:1};return null;},
  deref(r){if(!r)return null;if(r.p!=null)return r.p===MP.id?W.player:W.remotes.find(x=>x.id===r.p)||null;if(r.m!=null)return W.migs[r.m]||null;if(r.d!=null)return W.drones[r.d]||null;
    if(r.g!=null)return W.ground[r.g]||null;if(r.s!=null)return W.sams[r.s]||null;if(r.k!=null)return W.strikers[r.k]?W.strikers[r.k].ac:null;if(r.h)return W.helo;if(r.t)return W.tanker;return null;},
  mslKey(spec){for(const k in R.MSL)if(R.MSL[k]===spec)return k;return null;},
  /* ---- starting a game ---- */
  begin(cfg){mpg.cfg=cfg;mpg.on=true;mpg.live.clear();mpg.overSent=false;mpg.lostSent=false;
    Object.assign(opts,{mission:cfg.mode==='pvp'?'duel':cfg.mission,diff:cfg.diff,tod:cfg.tod,wx:cfg.wx});applyOpts();show('mpBox',false);
    start(cfg.mode==='pvp'?'air':cfg.start==='runway'?'runway':'air');},
  /* called by newGame: the extra World options and the seeded random numbers */
  worldOpts(){const c=mpg.cfg;return{net:MP.host?'host':'guest',coop:c.mode==='coop',pvp:c.mode==='pvp',wing:false,fail:false};},
  rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},
  setup(){const c=mpg.cfg,p=W.player,order=c.order,me=order.indexOf(MP.id),n=order.length;W.remotes=[];
    if(c.mode==='pvp'){for(const m of W.migs){m.alive=false;const g=meshOf.get(m);if(g)g.visible=false;}W.migs=[];W.migAI=[];W.air=[...W.drones];const cx=(R.THEATRE.duelX||60000),a=me/n*Math.PI*2,rad=22000;
      p.pos=v3(cx+Math.sin(a)*rad,6500,Math.cos(a)*rad);const h=Math.atan2(cx-p.pos.x,-(0-p.pos.z));p.q=R.qeuler(h,0,0);p.vel=vmul(qrot(p.q,FWD),235);}
    else if(me>0){const f=qrot(p.q,FWD),r=qrot(p.q,R.RIGHT);
      if(p.onGround){const side=me%2?1:-1,back=Math.floor((me-1)/2)*160;p.pos=vadd(p.pos,vadd(vmul(r,18*side),vmul(f,-back)));}
      else p.pos=vadd(p.pos,vadd(vmul(r,70*me),vmul(f,-45*me)));}
    for(const id of order){if(id===MP.id)continue;const P=MP.peers.get(id),st=P&&P.st,ty=(P&&P.plane)||'F15I';
      const e={remote:true,id,name:(P&&P.name)||'טייס',kind:'air',type:ty,label:(P&&P.call)||(P&&P.name)||'2',side:c.mode==='pvp'?1:0,alive:true,pos:st?{...st.pos}:v3(p.pos.x,p.pos.y,p.pos.z+400),vel:v3(),q:{x:0,y:0,z:0,w:1},
        eng:1,gearPos:0,rcs:ty==='F35I'?0.4:5,hp:100,onGround:false,t:null,tgt:null};
      W.remotes.push(e);(c.mode==='pvp'?W.air:W.friends).push(e);
      const m=mkPlayer(ty);m.userData.wing=true;dyn.add(m);meshOf.set(e,m);const lb=labelSprite(e.label,2);lb.position.set(0,7,0);m.add(lb);e.lbl=lb;}
    recObj=[...W.air,...W.friends];
    if(MP.host&&c.mode==='coop'){const orig=W.msg.bind(W);W.msg=t=>{orig(t);if(/^בקר/.test(t))MP.send({t:'msg',x:t},true);};}},
  /* ---- per frame ---- */
  tick(dt){if(!mpg.on||!W)return;const fly=state==='fly'||state==='pause';if(!fly)return;const p=W.player;
    mpg.sT-=dt;if(mpg.sT<=0){mpg.sT=0.1;const q=p.q,r=v=>Math.round(v*10)/10;
      MP.send({t:'s',p:[r(p.pos.x),r(p.pos.y),r(p.pos.z)],v:[r(p.vel.x),r(p.vel.y),r(p.vel.z)],q:[+q.x.toFixed(4),+q.y.toFixed(4),+q.z.toFixed(4),+q.w.toFixed(4)],e:+p.eng.toFixed(2),g:+p.gearPos.toFixed(2),a:p.alive?1:0,gd:p.onGround?1:0,gun:trigG&&W.w.sel==='GUN'&&p.alive?1:0,lk:W.lock&&W.lock.remote?W.lock.id:0,ty:W.plane.type},false);}
    if(MP.host&&mpg.cfg.mode==='coop'){mpg.wT-=dt;if(mpg.wT<=0){mpg.wT=0.125;mpg.snap();}}
    /* remote jets: dead reckoning towards the last state, gentle correction */
    const now=performance.now()/1000;W.netThreats=[];
    for(const e of W.remotes){const t=e.tgt;if(!t||!e.alive)continue;const k=Math.min(now-t.at,0.6),tp=vadd(t.pos,vmul(t.vel,k)),d=vdist(tp,e.pos);
      e.pos=d>400?tp:vadd(e.pos,vmul(vsub(tp,e.pos),Math.min(1,dt*8)));e.vel=t.vel;const qa=new T.Quaternion(e.q.x,e.q.y,e.q.z,e.q.w),qb=new T.Quaternion(t.q[0],t.q[1],t.q[2],t.q[3]);qa.slerp(qb,Math.min(1,dt*10));e.q={x:qa.x,y:qa.y,z:qa.z,w:qa.w};
      e.eng=t.e;e.gearPos=t.g;e.onGround=!!t.gd;
      if(t.gun&&state==='fly'){e.gunT=(e.gunT||0)-dt;if(e.gunT<=0){e.gunT=1/14;const f=qrot(e.q,FWD);W.bullets.push({pos:vadd(e.pos,vmul(f,8)),vel:vadd(e.vel,vmul(f,1000)),t:0,owner:e,ghost:true});}}
      if(t.lk===MP.id&&p.alive){const fl=W.missiles.some(m=>m.alive&&m.owner===e&&m.target===p);W.netThreats.push({sym:({F15I:'15',F15C:'15',F16I:'16',F35I:'35'})[e.type]||'F',pos:e.pos,lvl:fl?2:1});}}
    /* my bombs: send a copy so the others see them fall */
    for(const b of W.bombs)if(b.owner===p&&!b.netId&&!b.ghost){b.netId=MP.id+':'+(mpg.netN++);MP.send({t:'b',p:[b.pos.x,b.pos.y,b.pos.z],v:[b.vel.x,b.vel.y,b.vel.z],tg:mpg.ref(b.target),lgb:b.lgb,gps:b.gps,ld:b.ld},true);}
    /* missiles decided here that the others hold as copies */
    for(const m of mpg.live)if(!m.alive){mpg.live.delete(m);MP.send({t:'mx',id:m.netId,hit:m.result==='hit'?1:0,p:[m.pos.x,m.pos.y,m.pos.z]},true);}
    if(!p.alive&&!mpg.lostSent){mpg.lostSent=true;const by=W.lastHitBy&&W.lastHitBy.remote?W.lastHitBy.id:mpg.lastGunBy||null;MP.send({t:'dead',by,name:MP.name},true);}
    if(MP.host&&mpg.cfg.mode==='coop'&&W.over&&!mpg.overSent){mpg.overSent=true;MP.send({t:'over',o:W.over},true);}},
  /* the host's enemy world, 8 times a second */
  snap(){const r=v=>Math.round(v),f=v=>Math.round(v*10)/10,qq=q=>[+q.x.toFixed(3),+q.y.toFixed(3),+q.z.toFixed(3),+q.w.toFixed(3)];
    const ac=a=>a?[r(a.pos.x),r(a.pos.y),r(a.pos.z),f(a.vel.x),f(a.vel.y),f(a.vel.z),...(a.q?qq(a.q):[0,0,0,1]),a.alive?1:0,+(a.eng||1).toFixed(2)]:null;
    const g=[];W.ground.forEach((x,i)=>{if(!x.alive)g.push([i,0]);else if(x.vel&&(x.mob||x.kind==='truck'))g.push([i,1,r(x.pos.x),r(x.pos.z),f(x.vel.x),f(x.vel.z)]);});
    MP.send({t:'w',m:W.migs.map(ac),d:W.drones.map(ac),k:W.strikers.map(k=>ac(k.ac)),h:W.helo?[...ac(W.helo),W.helo.phase]:null,g,wp:W.wp},false);},
  applySnap(o){const set=(e,a)=>{if(!e||!a)return;const was=e.alive;e.pos={x:a[0],y:a[1],z:a[2]};e.vel={x:a[3],y:a[4],z:a[5]};if(e.q)e.q={x:a[6],y:a[7],z:a[8],w:a[9]};e.eng=a[11];
      if(was&&!a[10]){e.alive=false;W.events.push({type:'boom',pos:e.pos,size:1});W.events.push({type:'kill',e});if(W.lock===e)W.lock=null;}};
    (o.m||[]).forEach((a,i)=>set(W.migs[i],a));(o.d||[]).forEach((a,i)=>set(W.drones[i],a));(o.k||[]).forEach((a,i)=>W.strikers[i]&&set(W.strikers[i].ac,a));
    if(o.h&&W.helo){set(W.helo,o.h);W.helo.phase=o.h[13];}
    for(const a of o.g||[]){const x=W.ground[a[0]];if(!x)continue;if(!a[1]){if(x.alive){x.alive=false;W.events.push({type:'gkill',g:x});if(W.gtgt===x)W.gtgt=null;}}else{x.pos.x=a[2];x.pos.z=a[3];x.vel.x=a[4];x.vel.z=a[5];}}
    if(o.wp!=null)W.wp=o.wp;},
  /* events from the world on this machine */
  ev(e){if(!mpg.on)return;
    if(e.type==='launch'){const m=e.m;if(m.netId||m.cruise)return;const mine=m.owner===W.player,ai=MP.host&&mpg.cfg.mode==='coop'&&!m.owner.remote&&m.owner!==W.player;if(!mine&&!ai)return;
      const k=mpg.mslKey(m.s);if(!k)return;m.netId=MP.id+':'+(mpg.netN++);if(m.target&&m.target.remote)m.ghost=true;else mpg.live.add(m);
      MP.send({t:'m',id:m.netId,k,p:[m.pos.x,m.pos.y,m.pos.z],v:[m.vel.x,m.vel.y,m.vel.z],o:mpg.ref(m.owner),tg:mpg.ref(m.target),act:m.active?1:0},true);}
    else if(e.type==='net'){
      if(e.k==='hit'&&e.T&&e.T.remote)MP.sendTo(e.T.id,{t:'h',how:e.how},true);
      else if(e.k==='kill')MP.send({t:'k',r:mpg.ref(e.T)},true);
      else if(e.k==='gkill')MP.send({t:'gk',r:mpg.ref(e.g)},true);
      else if(e.k==='hitf')MP.send({t:'hf',r:mpg.ref(e.T),how:e.how},true);}
    else if(e.type==='cm'&&e.ac===W.player)MP.send({t:'cm'},true);},
  /* messages from the others */
  recv(o,from,viaRelay){const P=MP.peers.get(from);if(!o||!o.t)return;
    if(o.t==='me'){if(P){P.plane=o.plane;P.call=o.call;mpUi.room();}return;}
    if(o.t==='room'){if(P&&P.host){mpg.room={mode:o.mode,start:o.start};mpg.hostCfg=o;mpUi.room();mpg.align(o);}return;}
    if(o.t==='start'){mpg.begin(o);return;}
    if(o.t==='ptt'){if(P)mpVoice.ptt(P,o.on,o.ch);return;}
    if(o.t==='q'){if(P&&(o.ch===1||o.ch===mpg.ch)){radioQ.push(`${P.call||P.name}: ${QUICK[o.i]||''}`);mpVoice.click(true);}return;}
    if(!mpg.on||!W)return;const p=W.player,re=W.remotes.find(x=>x.id===from);
    if(o.t==='s'){if(P){P.plane=o.ty||P.plane;P.st={pos:{x:o.p[0],y:o.p[1],z:o.p[2]}};}if(!re)return;
      re.tgt={pos:{x:o.p[0],y:o.p[1],z:o.p[2]},vel:{x:o.v[0],y:o.v[1],z:o.v[2]},q:o.q,e:o.e,g:o.g,gd:o.gd,gun:o.gun,lk:o.lk,at:performance.now()/1000};
      if(!o.a&&re.alive){re.alive=false;W.events.push({type:'boom',pos:re.pos,size:1.4});W.events.push({type:'kill',e:re});if(W.lock===re)W.lock=null;}}
    else if(o.t==='w'){if(!MP.host)mpg.applySnap(o);}
    else if(o.t==='m'){const spec=R.MSL[o.k];if(!spec)return;const own=mpg.deref(o.o),tg=mpg.deref(o.tg);if(!tg)return;
      const m=new R.Missile(spec,own,tg,{x:o.p[0],y:o.p[1],z:o.p[2]},{x:o.v[0],y:o.v[1],z:o.v[2]});m.active=!!o.act;m.netId=o.id;m.ghost=tg!==p;if(!m.ghost)mpg.live.add(m);
      W.missiles.push(m);W.events.push({type:'launch',m});}
    else if(o.t==='mx'){const m=W.missiles.find(x=>x.netId===o.id);if(m&&m.alive){m.alive=false;m.result='net';mpg.live.delete(m);if(o.hit)W.events.push({type:'boom',pos:{x:o.p[0],y:o.p[1],z:o.p[2]},size:1});}}
    else if(o.t==='b'){const tg=mpg.deref(o.tg)||{pos:{x:o.p[0],y:0,z:o.p[2]},alive:false};const b=new R.Bomb(re||W.player,tg,{x:o.p[0],y:o.p[1],z:o.p[2]},{x:o.v[0],y:o.v[1],z:o.v[2]},{lgb:o.lgb,gps:o.gps,ld:o.ld});b.ghost=true;b.netId='x';W.bombs.push(b);}
    else if(o.t==='h'){if(p.alive){mpg.lastGunBy=from;W.lastHitBy=re||null;W.hurt(o.how||'gun');}}
    else if(o.t==='cm'){if(re&&re.alive)W.dispense(re);}
    else if(o.t==='end'){if(re){re.gone=true;if(re.alive){re.alive=false;const m=meshOf.get(re);if(m)m.visible=false;}radioQ.push(`רשת: ${re.name} סיים את הטיסה.`);}}
    else if(o.t==='dead'){if(re&&re.alive){re.alive=false;W.events.push({type:'boom',pos:re.pos,size:1.4});W.events.push({type:'kill',e:re});}
      if(o.by===MP.id){W.stats.mig++;radioQ.push(`בקר: הפלת את ${o.name||'היריב'}!`);}else radioQ.push(`בקר: ${o.name||'טייס'} הופל.`);}
    else if(o.t==='k'){if(MP.host){const T=mpg.deref(o.r);if(T&&T.alive){W.events.push({type:'boom',pos:T.pos,size:1});W.killAir(T);MP.sendTo(from,{t:'kc',r:o.r,ty:T.type},true);}}}
    else if(o.t==='gk'){if(MP.host){const g=mpg.deref(o.r);if(g&&g.alive){W.killGround(g);MP.sendTo(from,{t:'kc',r:o.r,ty:'GROUND'},true);}}}
    else if(o.t==='hf'){if(MP.host){const T=mpg.deref(o.r);if(T)W.hitFriend(T,o.how);}}
    else if(o.t==='kc'){if(o.ty==='GROUND')W.stats.tgt++;else if(o.ty==='UAV'||o.ty==='CM')W.stats.uav++;else W.stats.mig++;}
    else if(o.t==='msg'){radioQ.push(o.x);}
    else if(o.t==='over'){if(!W.over)W.over=Object.assign({},o.o,{reason:(o.o.reason||'')+(p.alive?'':'')});}},
  /* a guest follows the host's theatre: switching theatre needs a reload, then the guest rejoins by itself */
  align(o){if(MP.host)return;if(o.theatre&&o.theatre!==theatre0||o.theatre==='israel'&&o.isrBase&&o.isrBase!==opts.isrBase){
      opts.theatre=o.theatre;if(o.isrBase)opts.isrBase=o.isrBase;try{localStorage.setItem('haniaflight-opts',JSON.stringify(opts));}catch(e){}try{localStorage.setItem('haniaflight-mpjoin',JSON.stringify({code:MP.code,t:Date.now(),v:$('mpVoice').checked}));}catch(e){}
      MP.status('עובר לזירה של המארח…');setTimeout(()=>location.reload(),600);}},
  talkers(){const t=[...MP.peers.values()].filter(P=>P.talk&&mpVoice.hears(P)).map(P=>P.call||P.name);const el=$('talkers');el.textContent=t.length?'🎙 '+t.join(', '):'';el.hidden=!t.length;},
  quick(i){if(!MP.live)return;MP.send({t:'q',i,ch:mpg.ch},true);radioQ.push(`אתה: ${QUICK[i]}`);$('quickBox').hidden=true;}};

/* lobby */
const mpUi={
  open(){show('mpBox',true);mpUi.room();},
  status(t){const el=$('mpStatus');el.textContent=t||'';el.hidden=!t;},
  code(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';const r=new Uint32Array(4);crypto.getRandomValues(r);for(const x of r)s+=A[x%A.length];return s;},
  async create(){mpUi.prep();const ok=await MP.connect(mpUi.code(),mpUi.name());if(ok)mpg.sendRoom();},
  async join(code){code=(code||$('mpCode').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length<4){MP.status('הקוד צריך להיות 4 תווים.');return;}mpUi.prep();await MP.connect(code,mpUi.name());},
  prep(){Snd.init();if(Snd.ac&&Snd.ac.state==='suspended')Snd.ac.resume();if($('mpVoice').checked)mpVoice.micStart();},
  name(){const pl=readPilot();return pl.call||pl.name||'טייס';},
  room(){const inRoom=MP.live;$('mpJoinPane').hidden=inRoom;$('mpRoomPane').hidden=!inRoom;$('mpBtn').textContent=inRoom?`חדר ${MP.code} · ${MP.peers.size+1} שחקנים`:'משחק עם חברים';
    if(!inRoom)return;$('mpCodeShow').textContent=MP.code;
    const li=[`<li><b>${esc(mpUi.name())}</b> (אתה${MP.host?', מארח':''}) · ${esc(R.PLANES[opts.plane].name)}</li>`];
    for(const P of MP.peers.values())li.push(`<li><b>${esc(P.call||P.name)}</b>${P.host?' (מארח)':''} · ${P.plane&&R.PLANES[P.plane]?esc(R.PLANES[P.plane].name):'…'} · <span class="note">${P.via==='p2p'?'חיבור ישיר':P.via==='relay'?'דרך השרת':'מתחבר…'}</span></li>`);
    $('mpPeers').innerHTML=li.join('');const r=mpg.room,h=MP.host;
    for(const b of document.querySelectorAll('[data-mp]')){b.setAttribute('aria-pressed',b.dataset.mp===r.mode?'true':'false');b.disabled=!h;}
    for(const b of document.querySelectorAll('[data-mps]')){b.setAttribute('aria-pressed',b.dataset.mps===r.start?'true':'false');b.disabled=!h||r.mode==='pvp';}
    for(const b of document.querySelectorAll('[data-ch]'))b.setAttribute('aria-pressed',+b.dataset.ch===mpg.ch?'true':'false');
    const hc=mpg.hostCfg,mis=h?opts.mission:hc&&hc.mission,mn=$(({strike:'mStrike',intercept:'mIcpt',sead:'mSead',convoy:'mConvoy',escort:'mEscort',csar:'mCsar',recon:'mRecon',stealth:'mStealth',naval:'mNaval',duel:'mDuel',tanker:'mTanker',train:'mTrain'})[mis]||'mStrike');
    $('mpInfo').textContent=r.mode==='pvp'?'קרב אוויר: כל אחד מתחיל במרחק 22 ק"מ מהמרכז, פונה פנימה. מנצח מי שנשאר באוויר.':`משימה: ${mn?mn.textContent:''}. ${h?'בוחרים משימה ומטוס בתפריט, הם עוברים לכולם.':'המארח בוחר את המשימה. המטוס שלך לבחירתך.'}`;
    $('mpGo').hidden=!h;$('mpWait').hidden=h;$('mpGo').disabled=!MP.peers.size||(r.mode==='coop'&&['train','duel'].includes(opts.mission)&&false);},
  go(){if(!MP.host||!MP.peers.size)return;const r=mpg.room,order=[MP.id,...MP.peers.keys()];
    const cfg={t:'start',mode:r.mode,start:r.start,mission:['train'].includes(opts.mission)?'strike':opts.mission,diff:opts.diff,tod:opts.tod,wx:opts.wx,seed:(Math.random()*2**31)|0,order};
    MP.send(cfg,true);mpg.begin(cfg);},
  share(){const u=location.origin+location.pathname+'?room='+MP.code,t=`בוא לטוס איתי ב-HaniaFlight. קוד חדר: ${MP.code}\n${u}`;
    if(navigator.share)navigator.share({text:t}).catch(()=>{});else{try{navigator.clipboard.writeText(t);toast('הקישור הועתק');}catch(e){}}}};
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);}

/* lobby and radio controls */
{const pt=$('pttBtn'),dn=e=>{e.preventDefault();mpVoice.key(true);},up=e=>{e.preventDefault();mpVoice.key(false);};pt.addEventListener('pointerdown',dn);pt.addEventListener('pointerup',up);pt.addEventListener('pointercancel',up);pt.addEventListener('pointerleave',up);}
$('quickBtn').onclick=()=>{$('quickBox').hidden=!$('quickBox').hidden;};
$('quickBox').innerHTML=QUICK.map((q,i)=>`<button data-q="${i}">${i<9?i+1:0}. ${q}</button>`).join('');for(const b of $('quickBox').querySelectorAll('button'))b.onclick=()=>mpg.quick(+b.dataset.q);
$('mpBtn').onclick=()=>mpUi.open();
{let code=null,auto=false;try{code=new URLSearchParams(location.search).get('room');}catch(e){}
  try{const j=JSON.parse(localStorage.getItem('haniaflight-mpjoin')||'null');localStorage.removeItem('haniaflight-mpjoin');if(j&&Date.now()-j.t<180000){code=j.code;auto=true;$('mpVoice').checked=j.v!==false;}}catch(e){}
  if(code){$('mpCode').value=code.toUpperCase();mpUi.open();if(auto)setTimeout(()=>mpUi.join(),300);else MP.status('הוזמנת לחדר '+code.toUpperCase()+'. לחץ "הצטרף".');}}$('mpClose').onclick=()=>show('mpBox',false);$('mpCreate').onclick=()=>mpUi.create();$('mpJoin').onclick=()=>mpUi.join();$('mpLeave').onclick=()=>{MP.leave();MP.status('יצאת מהחדר.');};
$('mpGo').onclick=()=>mpUi.go();$('mpShare').onclick=()=>mpUi.share();$('mpCode').addEventListener('keydown',e=>{if(e.key==='Enter')mpUi.join();});
for(const b of document.querySelectorAll('[data-mp]'))b.onclick=()=>{mpg.room.mode=b.dataset.mp;mpg.sendRoom();mpUi.room();};
for(const b of document.querySelectorAll('[data-mps]'))b.onclick=()=>{mpg.room.start=b.dataset.mps;mpg.sendRoom();mpUi.room();};
for(const b of document.querySelectorAll('[data-ch]'))b.onclick=()=>{mpg.ch=+b.dataset.ch;for(const P of MP.peers.values())mpVoice.ptt(P,P.talk,P.ch);mpUi.room();};
