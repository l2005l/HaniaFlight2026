/* ================= UFC: the up-front control panel, and the back seat over the network =================
   The UFC is a small keypad and a green screen with four pages:
   - NAV: the waypoint, bearing, range and time to it, home, fuel and bingo;
   - COORD (נ"צ): your position on the map grid (km east and north of the home base), and coordinate entry: type a number and
     press E or N, then make it a waypoint or a GPS target; or take the coordinates of the point the pod looks at;
   - WPN: the stores, the selected weapon, master arm, the target;
   - GPS: satellites in view, the error estimate, INS, jamming.
   Two-seat jets (F-15I, F-16I, M-346) can take a friend in the back seat in a network game. The back seater sees the same
   cockpit and displays, runs the radar lock, the pod, the weapons and the UFC; the jet is flown on the pilot's machine
   and only followed here. What the back seater does is sent to the pilot's machine as commands; what the jet carries,
   locks and aims at comes back five times a second. */
const TWO_SEAT=['F15I','F16I','M346'];
const rear={userT:-1e9,seat:null,pilot:null,wso:null,csT:0,podT:0,podSig:'',tgt:null,pickPrev:false,
  /* set up for a network game: who flies with whom */
  setup(cfg){rear.seat=null;rear.pilot=null;rear.wso=null;const c=cfg&&cfg.crew||{};
    for(const w in c){if(w===MP.id){rear.seat='wso';rear.pilot=c[w];}if(c[w]===MP.id)rear.wso=w;}
    if(rear.seat==='wso'&&W){W.mirror=true;W.cat=null;const p=W.player;p.hp=p.hpMax=1e9;
      /* the controls that belong to the front seat are sent there */
      const ALLOW=['arm','rmode','rrng','rrngdn','ecm','radar','lights'];
      /* only what the back seater does with his own hands goes forward: the world and the game here also call these by themselves
         (an automatic start-up, a lost lock), and those calls must not reach the pilot's jet */
      const mine=()=>performance.now()-rear.userT<500;W.autoStart=false;
      W.sw=id=>{if(!mine())return false;if(ALLOW.includes(id)){rear.cmd({a:'sw',id});beep(1000,0.03);}else toast('רק הטייס במושב הקדמי');return false;};
      W.cycleTarget=()=>{if(mine())rear.cmd({a:'tgt'});};W.unlock=()=>{if(mine())rear.cmd({a:'unlock'});};W.select=k=>{if(mine())rear.cmd({a:'sel',k});};W.resetFaults=()=>{if(mine())rear.cmd({a:'reset'});return true;};
      W.wingCmd=c2=>rear.cmd({a:'wing',c:c2});W.eject=()=>{rear.cmd({a:'eject'});return false;};
      ufc.on=true;ufc.page='wpn';ufcShow();}
    else if(rear.wso)ufc.on=false;},
  /* the back seater pressed something: what must happen in the front is sent; true when handled */
  act(a){if(rear.seat!=='wso')return false;
    if(a==='wp'||a==='wpn'){rear.cmd({a});return true;}
    if(['gear','flaps','ardoor','ap','join','time','hook','eject'].includes(a)){if(a==='eject'){rear.cmd({a:'eject'});toast('פקודת נטישה נשלחה לטייס');}else toast('רק הטייס במושב הקדמי');return true;}
    return false;},
  cmd(o){if(rear.seat==='wso'&&rear.pilot)MP.sendTo(rear.pilot,Object.assign({t:'cmd'},o),true);else crewDo(o);},
  /* per frame */
  tick(dt){if(!mpg.on||!W)return;
    if(rear.seat==='wso'){rear.follow(dt);
      if(trigP&&!rear.pickPrev)rear.cmd({a:'pickle'});rear.pickPrev=trigP;
      /* the pod belongs to the back seat: its state goes forward whenever it changes */
      const nw=performance.now()/1000;if(nw-rear.podT>0.2){rear.podT=nw;const s=rear.podState(),sig=JSON.stringify(s);if(sig!==rear.podSig){rear.podSig=sig;MP.sendTo(rear.pilot,{t:'pod',s},true);}}}
    if(rear.wso){const nw=performance.now()/1000;if(nw-rear.csT>0.2){rear.csT=nw;MP.sendTo(rear.wso,rear.state(),false);}}},
  /* the pilot's jet, as the back seat sees it: dead reckoning on the pilot's 20-a-second state */
  follow(dt){const t=rear.tgt,p=W.player;if(!t)return;const now=performance.now()/1000,k=Math.min(now-t.at,0.5),tp=vadd(t.pos,vmul(t.vel,k)),d=vdist(tp,p.pos);
    p.pos=d>200?tp:vadd(p.pos,vmul(vsub(tp,p.pos),Math.min(1,dt*14)));p.vel=t.vel;
    const qa=new T.Quaternion(p.q.x,p.q.y,p.q.z,p.q.w),qb=new T.Quaternion(t.q[0],t.q[1],t.q[2],t.q[3]);qa.slerp(qb,Math.min(1,dt*16));p.q={x:qa.x,y:qa.y,z:qa.z,w:qa.w};
    p.eng=t.e;p.gearPos=t.g;p.gear=t.g>0.5;p.onGround=!!t.gd;p.V=vlen(t.vel);p.mach=p.V/340;p.agl=p.pos.y-R.terrainH(p.pos.x,p.pos.z);if(t.ga){p.g=t.ga[0];p.alpha=t.ga[1];}
    if(!t.a&&p.alive){p.alive=false;p.crash=p.crash||'המטוס אבד';}},
  /* front seat: everything the back seat needs to show the same displays */
  state(){const p=W.player,w=W.w,g=W.gtgt,r=v=>Math.round(v);
    return{t:'cs',lk:mpg.ref(W.lock),sel:w.sel,w:{aim120:w.aim120,python:w.python,spice:w.spice,gun:w.gun,chaff:w.chaff,flare:w.flare,tanks:w.tanks||0},arm:!!W.arm,
      gt:g&&g.alive?(g.pt||!mpg.ref(g)?{pt:[r(g.pos.x),r(g.pos.y),r(g.pos.z)],n:g.name||'POINT'}:{r:mpg.ref(g)}):null,wp:W.wp,wps:W.wps.map(q=>[q.n,r(q.x),r(q.z),q.alt|0]),
      fuel:r(p.fuel),hook:!!p.hook,flaps:!!p.flaps,bn:W.plane.bomb.name,bg:!!W.plane.bomb.gps,bl:!!W.plane.bomb.lgb,sys:{arDoor:W.sys.arDoor,radar:W.sys.radar,ins:W.sys.ins,lights:W.sys.lights},ecm:!!W.ecm,radar:{mode:W.radar.mode,rng:W.radar.rng},dmg:W.dmg.map(d=>d.t),over:W.over||null};},
  apply(o){if(rear.seat!=='wso'||!W)return;const p=W.player;W.lock=mpg.deref(o.lk);W.w.sel=o.sel;Object.assign(W.w,o.w);W.arm=o.arm;
    if(o.gt){if(o.gt.r){const e=mpg.deref(o.gt.r);if(e)W.gtgt=e;}else if(!W.gtgt||!W.gtgt.pt||vdist(W.gtgt.pos,{x:o.gt.pt[0],y:o.gt.pt[1],z:o.gt.pt[2]})>2)W.gtgt={pos:{x:o.gt.pt[0],y:o.gt.pt[1],z:o.gt.pt[2]},alive:true,name:o.gt.n,kind:'pt',vel:v3(),pt:true};}else W.gtgt=null;
    if(o.bn!=null&&W.plane.bomb.name!==o.bn)W.plane=Object.assign({},W.plane,{bomb:Object.assign({},W.plane.bomb,{name:o.bn,gps:o.bg,lgb:o.bl})});W.wp=o.wp;if(o.wps)W.wps=o.wps.map(q=>({n:q[0],x:q[1],z:q[2],alt:q[3]}));p.fuel=o.fuel;p.hook=o.hook;p.flaps=o.flaps;Object.assign(W.sys,o.sys);W.ecm=o.ecm;Object.assign(W.radar,o.radar);
    if(o.over&&!W.over)W.over=o.over;},
  podState(){const t=pod.trk;return{trk:t?(t.e?{r:mpg.ref(t.e)}:{p:[Math.round(t.p.x),Math.round(t.p.y),Math.round(t.p.z)]}):null,free:pod.free,dir:pod.dir?[+pod.dir.x.toFixed(4),+pod.dir.y.toFixed(4),+pod.dir.z.toFixed(4)]:null,laser:pod.laser,zoom:pod.zoom,mode:pod.mode};},
  podApply(s){if(rear.seat==='wso')return;pod.free=s.free;pod.dir=s.dir?v3(s.dir[0],s.dir[1],s.dir[2]):null;pod.laser=s.laser;pod.zoom=s.zoom;pod.mode=s.mode;
    if(s.trk){if(s.trk.r){const e=mpg.deref(s.trk.r);pod.trk=e?{e}:null;}else pod.trk={p:{x:s.trk.p[0],y:s.trk.p[1],z:s.trk.p[2]}};}else pod.trk=null;
    /* a point or a ground target tracked with an air-to-ground weapon selected is the target, as when the pilot locks it */
    if(W&&W.w.sel==='SPICE'&&pod.trk){if(pod.trk.e&&W.ground.includes(pod.trk.e))W.gtgt=pod.trk.e;else if(pod.trk.p)W.gtgt={pos:{...pod.trk.p},alive:true,name:'POINT',kind:'pt',vel:v3(),pt:true};}
    podBarSync();}};
/* a command from the back seat (or from this machine's own UFC), carried out on the pilot's machine */
function crewDo(o){if(!W)return;const p=W.player;
  switch(o.a){case 'sw':W.sw(o.id);break;case 'tgt':tgpHold=null;W.cycleTarget();break;case 'unlock':W.unlock();break;case 'sel':W.select(o.k);break;
    case 'wp':W.wp=(W.wp+1)%W.wps.length;break;case 'wpPrev':W.wp=(W.wp+W.wps.length-1)%W.wps.length;break;case 'pickle':tap.pickle=true;break;case 'reset':W.resetFaults();break;case 'wing':W.wingCmd(o.c);break;
    case 'eject':if(p.alive&&!W.ejected){radioQ.push('נווט: נטישה! נטישה!');W.eject();}break;
    case 'wpn':W.select(WSEL[(WSEL.indexOf(W.w.sel)+1)%4]);break;
    case 'ufc':ufcApply(o.u);break;}}
/* UFC entries change the flight plan or the target, on the machine that flies the jet */
function ufcApply(u){if(!W)return;const p=W.player,x=u.e*1000,z=-u.n*1000;
  if(u.k==='wpt'){const n='MK'+((W.mkN=(W.mkN||0)+1));const i=Math.max(0,W.wps.findIndex(q=>q.n==='BASE'||q.n==='CVN'));const at=i>=0?i:W.wps.length;W.wps.splice(at,0,{n,x,z,alt:Math.max(1000,Math.round(p.pos.y/100)*100)});W.wp=at;radioQ.push(`UFC: נקודה ${n} נוספה למסלול ונבחרה.`);}
  else if(u.k==='tgt'){W.gtgt={pos:{x,y:R.terrainH(x,z),z},alive:true,name:'COORD',kind:'pt',vel:v3(),pt:true};radioQ.push(W.w.sel==='SPICE'?'UFC: נקודת המטרה הוזנה. חימוש GPS יכוון אליה.':'UFC: נקודת המטרה הוזנה. בחר חימוש לקרקע.');}}

const ufc={on:false,page:'nav',buf:'',e:null,n:null,flash:'',flashT:0,last:''};
const UFCP=[['nav','ניווט'],['crd','נ"צ'],['wpn','חימוש'],['gps','GPS']];
const fE=v=>(v<0?'W':'E')+Math.abs(v).toFixed(1).padStart(5,'0'),fN=v=>(v<0?'S':'N')+Math.abs(v).toFixed(1).padStart(5,'0');
const pad2=n=>String(n).padStart(2,'0'),mmssU=s=>s>5999?'--:--':pad2(Math.floor(s/60))+':'+pad2(Math.floor(s%60));
function ufcShow(){const b=$('ufc');if(!b)return;const vis=ufc.on&&state==='fly'&&!!W;if(b.hidden===vis)b.hidden=!vis;if(!vis)return;
  $('ufcPages').innerHTML=UFCP.map(([k,l])=>`<button data-up="${k}" aria-pressed="${ufc.page===k}">${l}</button>`).join('');
  for(const x of $('ufcPages').querySelectorAll('button'))x.onclick=()=>{ufc.page=x.dataset.up;ufc.last='';ufcShow();beep(1100,0.02);};
  const S={nav:[['הקודם','wpPrev'],['הבא','wp']],crd:[['E','setE'],['N','setN'],['מיקום שלי','here'],['מהפוד','pod'],['לנקודת ציון','wpt'],['למטרה','tgt']],wpn:[['בחר נשק','wpn'],['חימוש ראשי','arm']],gps:[]}[ufc.page];
  $('ufcSoft').innerHTML=S.map(([l,k])=>`<button data-sk="${k}">${l}</button>`).join('');for(const x of $('ufcSoft').querySelectorAll('button'))x.onclick=()=>ufcSoft(x.dataset.sk);
  b.dataset.pad=ufc.page==='crd'?'1':'';b.dataset.t=touchOn?'1':'';$('ufcSeat').textContent=rear.seat==='wso'?'BACK SEAT':rear.wso?'FRONT · WSO ON':'';ufc.last='';ufcDraw();}
function ufcFlash(t){ufc.flash=t;ufc.flashT=2.2;ufc.last='';}
function ufcSoft(k){click(0.6);const p=W.player,num=parseFloat(ufc.buf);
  if(k==='wp'||k==='wpPrev'){rear.cmd({a:k});if(rear.seat!=='wso')ufcFlash('WPT '+(W.wps[W.wp]||{}).n);}
  else if(k==='setE'||k==='setN'){if(!ufc.buf||isNaN(num)){ufcFlash('ENTER A NUMBER FIRST');return;}if(k==='setE')ufc.e=num;else ufc.n=num;ufc.buf='';ufcFlash(k==='setE'?'EAST SET':'NORTH SET');}
  else if(k==='here'){ufc.e=+(p.pos.x/1000).toFixed(1);ufc.n=+(-p.pos.z/1000).toFixed(1);ufcFlash('OWN POSITION');}
  else if(k==='pod'){const g=podTgt();if(!g||g.sky){ufcFlash('POD: NO POINT');return;}ufc.e=+(g.pos.x/1000).toFixed(1);ufc.n=+(-g.pos.z/1000).toFixed(1);ufcFlash('POD POINT');}
  else if(k==='wpt'||k==='tgt'){if(ufc.e==null||ufc.n==null){ufcFlash('SET E AND N');return;}rear.cmd({a:'ufc',u:{k,e:ufc.e,n:ufc.n}});ufcFlash(k==='wpt'?'WAYPOINT ADDED':'TARGET SET');}
  else if(k==='wpn')rear.cmd({a:'wpn'});else if(k==='arm')(rear.seat==='wso'?rear.cmd({a:'sw',id:'arm'}):W.sw('arm'));
  ufcDraw();}
function ufcKey(k){if(!ufc.on)return;click(0.6);if(k==='clr'){ufc.buf=ufc.buf.slice(0,-1);}else if(k==='ent'){if(ufc.page!=='crd')return;ufcFlash('PRESS E OR N');}else if(k==='-'){ufc.buf=ufc.buf.startsWith('-')?ufc.buf.slice(1):'-'+ufc.buf;}else if(ufc.buf.length<7&&!(k==='.'&&ufc.buf.includes('.')))ufc.buf+=k;ufc.last='';ufcDraw();}
function ufcDraw(){if(!ufc.on||!W)return;const p=W.player,w=W.w,L=[];
  if(ufc.page==='nav'){const q=W.wps[W.wp]||{n:'---',x:p.pos.x,z:p.pos.z},br=(x,z)=>{let b=Math.atan2(x-p.pos.x,-(z-p.pos.z))*R2D;if(b<0)b+=360;return String(Math.round(b)%360).padStart(3,'0');},rg=Math.hypot(q.x-p.pos.x,q.z-p.pos.z),gs=Math.max(30,Math.hypot(p.vel.x,p.vel.z));
    const H=W.carrier&&W.cvHome?{n:'CVN',x:W.carrier.pos.x,z:W.carrier.pos.z}:{n:'BASE',x:0,z:0};
    L.push(`WPT ${q.n.padEnd(5)}      ${W.wp+1}/${W.wps.length}`,`BRG ${br(q.x,q.z)}   RNG ${(rg/NM).toFixed(1)}NM`,`ETE ${mmssU(rg/gs)}   ALT ${Math.round(q.alt*FT/100)*100}`,
      `HOME ${H.n} ${br(H.x,H.z)}/${(Math.hypot(H.x-p.pos.x,H.z-p.pos.z)/NM).toFixed(1)}NM`,`FUEL ${Math.round(p.fuel)}  BINGO ${W.bingo}`);}
  else if(ufc.page==='crd'){L.push(`OWN ${fE(p.pos.x/1000)} ${fN(-p.pos.z/1000)}`,`E   ${ufc.e==null?'-----':fE(ufc.e)}`,`N   ${ufc.n==null?'-----':fN(ufc.n)}`,`>${ufc.buf}_`);
    const g=W.gtgt;L.push(g&&g.alive?`TGT ${(g.name||'').slice(0,6).padEnd(6)} ${fE(g.pos.x/1000)} ${fN(-g.pos.z/1000)}`:'TGT NONE');}
  else if(ufc.page==='wpn'){const pl=W.plane,bn=(pl.bomb&&pl.bomb.name||'A/G').slice(0,10);
    L.push(`${(W.mrm&&W.mrm.name||'AIM-120').slice(0,8).padEnd(8)} x${w.aim120}  ${(W.srm&&W.srm.name||'PYTHON').slice(0,8).padEnd(8)} x${w.python}`,`${bn.padEnd(10)} x${w.spice}   GUN ${w.gun}`,`CHF ${w.chaff} FLR ${w.flare}  TNK ${w.tanks||0}`,
      `SEL ${String(w.sel).padEnd(7)} ${W.arm?'ARM':'SAFE'}`);const g=W.gtgt;L.push(g&&g.alive?`TGT ${(g.name||g.type||'').slice(0,10)}${pl.bomb&&pl.bomb.gps?' GPS':''}`:W.lock?`LOCK ${(W.lock.label||W.lock.name||W.lock.type||'').slice(0,10)}`:'NO TGT');}
  else if(ufc.page==='gps'){const s=W.gpsState(),seed=Math.floor(W.time/40),prn=[];for(let i=0;i<12;i++){const n=((seed*7+i*11)%31)+1;if(!prn.includes(n))prn.push(n);}
    const bars=prn.slice(0,Math.max(s.sats,0)).map((n,i)=>pad2(n)+['▂','▄','▆','█'][(n+i+seed)%4]).join(' ');
    L.push(`GPS ${s.mode.padEnd(5)} SATS ${pad2(s.sats)}  EPE ${s.epe}M`,`INS ${s.ins>=1?'NAV':'ALIGN '+Math.round(s.ins*100)+'%'}  ${W.flt&&W.flt.gps?'GPS FAIL':''}`,bars.slice(0,26)||'NO SATELLITES',bars.slice(27,53),`JAM ${s.jam>0.66?'HEAVY':s.jam>0.2?'MODERATE':s.jam>0?'LIGHT':'NONE'}`);}
  if(ufc.flashT>0)L[L.length-1]='» '+ufc.flash;
  const t=L.join('\n');if(t!==ufc.last){ufc.last=t;$('ufcScr').textContent=t;}}
function ufcTick(dt){if(ufc.flashT>0){ufc.flashT-=dt;if(ufc.flashT<=0)ufc.last='';}const b=$('ufc');if(!b)return;const vis=ufc.on&&state==='fly'&&!!W&&W.player.alive;if(b.hidden===vis){if(vis)ufcShow();else b.hidden=true;}if(vis){ufc.dt=(ufc.dt||0)+dt;if(ufc.dt>0.25){ufc.dt=0;ufcDraw();}}}
for(const x of $('ufcPad').querySelectorAll('button'))x.onclick=()=>ufcKey(x.dataset.k||x.textContent);
$('ufcX').onclick=()=>{ufc.on=false;ufcTick(0);};$('ufcBtn').onclick=()=>{ufc.on=!ufc.on;ufcTick(0);};
addEventListener('keydown',e=>{if(!ufc.on||state!=='fly')return;const t=e.target;if(t&&t.closest&&t.closest('input,textarea'))return;
  const k=/^(Digit|Numpad)([0-9])$/.exec(e.code);if(k){ufcKey(k[2]);e.stopImmediatePropagation();e.preventDefault();return;}
  if(e.code==='Period'||e.code==='NumpadDecimal'){ufcKey('.');e.stopImmediatePropagation();}else if(e.code==='Minus'||e.code==='NumpadSubtract'){ufcKey('-');e.stopImmediatePropagation();}else if(e.code==='Backspace'){ufcKey('clr');e.stopImmediatePropagation();e.preventDefault();}},true);

for(const ev of['pointerdown','keydown','touchstart'])addEventListener(ev,()=>{rear.userT=performance.now();},true);
