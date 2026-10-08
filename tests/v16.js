/* version 1.6: failures, hook, weight, pair landing, ambushes, moving targets and the new missions */
const R=require('../src/core.js');
const {World,apSteer,vsub,vnorm,vlen,vdist,v3,D2R,KT,MSL}=R;
const run=(W,t,f)=>{for(let i=0;i<t*60&&!W.over;i++){if(f)f(i/60);W.step(1/60);}};
const msgs=W=>{const a=[];for(const e of W.events)if(e.type==='msg')a.push(Math.round(W.time)+' '+e.text.slice(0,70));W.events.length=0;return a;};
// take-off roll: clean against heavy
for(const cfg of[{fuelPct:60,tanks:0},{fuelPct:100,tanks:3}]){const W=new World(Object.assign({plane:'F15I',start:'runway',mission:'strike'},cfg));const p=W.player,x0=p.pos.x,vr=W.vr/KT;let lift=null;
  run(W,60,()=>{const e=p.euler();p.ctl.throttle=1.3;p.ctl.pitch=p.V>vr&&e.pitch<10*D2R?0.5:0;if(!p.onGround&&lift==null)lift={d:Math.round(p.pos.x-x0),t:Math.round(W.time)};});
  console.log('take-off',JSON.stringify(cfg),'mass',Math.round(p.mass),'Vr',W.vr,'kt · roll',lift&&lift.d,'m in',lift&&lift.t,'s · g limit',p.nLim||p.t.nMax,'alive',p.alive);}
// g limit with tanks: pull hard and read the peak g
for(const tanks of[0,3]){const W=new World({plane:'F15I',start:'air',mission:'duel',tanks});const p=W.player;W.migsActive=false;W.migs.forEach(m=>m.alive=false);let mx=0;run(W,8,()=>{p.ctl.pitch=1;p.ctl.throttle=1.3;mx=Math.max(mx,p.g);});console.log('max g with',tanks,'tanks:',mx.toFixed(1));}
// failed brakes on the runway, with and without the hook
for(const hook of[false,true]){const W=new World({plane:'F15I',start:'runway',mission:'strike'});const p=W.player;p.brakeK=0.12;p.pos.x=-200;p.vel=v3(70,0,0);p.hook=hook;p.wasAir=true;W.flags.airborne=true;
  run(W,40,()=>{p.ctl.throttle=0;p.ctl.brake=true;});console.log('brake fail, hook',hook,'-> stopped at x',Math.round(p.pos.x),'speed',Math.round(p.V),'runway end',R.RWY.x2,'caught',!!p.caught);}
// flameout and an air restart in a single-engine jet
{const W=new World({plane:'F16I',start:'air',mission:'intercept',fail:true});const p=W.player;W.failT=2;const r=Math.random;Math.random=()=>0.1;run(W,3,()=>apSteer(p,v3(1,0,0),0.3));Math.random=r;
  console.log('flameout:',W.dmg.map(d=>d.t).join(','),'rpm',p.rpm[0].toFixed(2));const ok=W.relight();run(W,16,()=>{apSteer(p,vnorm(v3(1,-0.05,0)),0.3);p.ctl.throttle=0.9;});console.log(' relight accepted',ok,'-> rpm',p.rpm[0].toFixed(2),'warnings',W.dmg.map(d=>d.t).join(',')||'none');}
// bird strike on the climb-out
{const W=new World({plane:'F15I',start:'runway',mission:'intercept',fail:true});W.birdAt='climb';W.failT=null;const p=W.player;
  run(W,50,()=>{const e=p.euler();p.ctl.throttle=1.3;p.ctl.pitch=p.V>W.vr/KT&&e.pitch<10*D2R?0.5:0;if(!p.onGround&&p.agl>30)p.gear=false;});console.log('bird:',p.bird,W.dmg.map(d=>d.t).join(','),'|',msgs(W).filter(m=>m.includes('ציפור')).join(''));}
// pair landing: the leader flies a scripted approach, two lands alongside
{const W=new World({plane:'F15I',start:'air',mission:'strike',wing:true});const p=W.player,w=W.wing.ac;W.drones.forEach(d=>d.alive=false);W.migs.forEach(m=>m.alive=false);W.time=200;W.flags.airborne=true;
  const sl=Math.tan(3*D2R),th=R.RWY.x1+250,h0=R.SITES.base.h+2.4;p.pos=v3(th-9000,h0+9000*sl,0);p.q=R.qeuler(Math.PI/2,0,0);p.vel=v3(80,-80*sl,0);p.gear=true;p.gearPos=1;p.flaps=true;p.fuel=3000;W.w.spice=0;W.syncStores();
  w.pos=v3(p.pos.x-45,p.pos.y,24);w.q=p.q;w.vel={...p.vel};w.gear=true;w.gearPos=1;
  let all=[];run(W,190,()=>{const e=p.euler();all.push(...msgs(W));
    if(!p.onGround){const dx=th-p.pos.x,want=h0+Math.max(0,dx)*sl,gam=Math.asin(p.vel.y/p.V),tg=R.clamp(-3*D2R+(want-p.pos.y)*0.004,-6*D2R,1*D2R)*(p.agl<8?0.35:1);
      p.ctl.pitch=R.clamp((tg-gam)*6,-0.5,0.5);p.ctl.throttle=p.V<75?0.9:p.V>82?0.05:0.4;p.ctl.brake=p.V>88;p.ctl.roll=R.clamp(-e.roll*2-p.pos.z*0.002,-1,1);}
    else{p.ctl.pitch=0;p.ctl.throttle=0;p.ctl.brake=true;}});
  console.log('pair landing: leader on ground',p.onGround,p.alive,'| two on ground',w.onGround,'alive',w.alive,w.crash||'','pos',Math.round(w.pos.x),Math.round(w.pos.z),'stats.pair',!!W.stats.pair);console.log(' '+all.filter(m=>m.includes('שתיים')).join('\n '));}
// strike: the silent battery, the ambusher and the launcher that drives away
{const W=new World({plane:'F15I',start:'air',mission:'strike'});const p=W.player;const amb=W.sams.find(q=>q.silent),low=W.migAI.find(a=>a.low),tel=W.ground.find(g=>g.name==='TEL-2'),t0={...tel.pos};
  W.drones.forEach(d=>d.alive=false);W.hurt=()=>{};let wake=null,pop=null,all=[];
  run(W,900,()=>{p.fuel=8000;p.hp=1e9;const tg=W.wps[Math.min(W.wp,2)],d=vnorm(v3(tg.x-p.pos.x,0,tg.z-p.pos.z));apSteer(p,v3(d.x,(8000-p.pos.y)/4000,d.z),0.5);p.ctl.throttle=1;
    if(amb.awake&&wake==null)wake=Math.round(vdist(amb.pos,p.pos)/1000);if(low&&low.popped&&pop==null)pop=Math.round(vdist(low.ac.pos,p.pos)/1000);all.push(...msgs(W));if(Math.hypot(p.pos.x-R.SITES.tgt.x,p.pos.z-R.SITES.tgt.z)<6000)W.over={};});
  console.log('strike: ambush SAM woke at km',wake,'| low MiG popped at km',pop,'| TEL-2 moved m',Math.round(Math.hypot(tel.pos.x-t0.x,tel.pos.z-t0.z)),'| foe jam',W.foeJam);
  console.log(' '+all.filter(m=>/נסתרת|קפץ|זז|פיתיון|בינגו/.test(m)).join('\n '));}
// glide bomb follows a moving launcher in its last kilometres
{const W=new World({plane:'F15I',start:'air',mission:'strike'});const p=W.player;W.migs.forEach(m=>m.alive=false);W.sams.forEach(q=>q.radar.alive=false);const tel=W.ground.find(g=>g.name==='TEL-2');tel.mob=true;tel.vel=v3(6,0,8);
  p.pos=v3(tel.pos.x-14000,9000,tel.pos.z);p.vel=v3(260,0,0);p.q=R.qeuler(Math.PI/2,0,0);W.select('SPICE');while(W.gtgt!==tel)W.cycleTarget();W.arm=true;W.trigger(false,true,1/60);const n=W.bombs.length;run(W,90,()=>{p.fuel=6000;apSteer(p,v3(1,0,0),0.3);});
  console.log('moving launcher, bomb released',n,'-> hit',!tel.alive);}
// the far theatre's missile boat is in the strike mission there (theatre is fixed per process, so only report its absence here)
console.log('ship in southern strike:',!!new World({plane:'F15I',start:'air',mission:'strike'}).ground.find(g=>g.kind==='ship'));
// rescue: the helicopter flies out, hovers and comes home; an escort keeps the MiGs off
{const W=new World({plane:'F15C',start:'air',mission:'csar'});const p=W.player,h=W.helo;let cd=0,all=[],ph=[];W.hurt=()=>{};
  run(W,1500,()=>{p.fuel=6000;p.hp=1e9;all.push(...msgs(W));if(!ph.includes(h.phase))ph.push(h.phase);const foe=W.migs.filter(m=>m.alive).sort((a,b)=>vdist(a.pos,h.pos)-vdist(b.pos,h.pos))[0];
    const t0=foe&&W.migsActive?foe.pos:vadd3(h.pos,0,3000,0),tgt=v3(t0.x,Math.max(t0.y,R.terrainH(t0.x,t0.z)+2500),t0.z),r=vsub(tgt,p.pos);apSteer(p,vnorm(r),0.7);p.ctl.throttle=1;cd-=1/60;if(foe&&W.migsActive&&vlen(r)<20000&&cd<=0){W.launch(MSL.AIM120,p,foe);cd=6;}});
  console.log('csar:',ph.join('>'),'|',W.over&&W.over.title,'·',W.over&&W.over.reason,'t',Math.round(W.time));console.log(' '+all.filter(m=>/מסוק|ממריא/.test(m)).join('\n '));}
function vadd3(a,x,y,z){return v3(a.x+x,a.y+y,a.z+z);}
// rescue without an escort: the MiGs get the helicopter
{const W=new World({plane:'F15C',start:'air',mission:'csar'});const p=W.player;run(W,1500,()=>{p.fuel=6000;apSteer(p,v3(0,(6000-p.pos.y)/3000,1),0.4);});console.log('csar, no escort:',W.over&&W.over.title,'·',W.over&&W.over.reason);}
// recon: point the pod at each site in turn
{const W=new World({plane:'F16I',start:'air',mission:'recon'});const p=W.player;W.migs.forEach(m=>m.alive=false);W.sams.forEach(q=>q.radar.alive=false);W.select('SPICE');let all=[];
  run(W,1500,()=>{p.fuel=5000;all.push(...msgs(W));const tg=W.wps[W.wp],d=vnorm(v3(tg.x-p.pos.x,0,tg.z-p.pos.z));apSteer(p,v3(d.x,(7000-p.pos.y)/4000,d.z),0.5);p.ctl.throttle=1;
    const s=W.ground.find(g=>g.kind==='site'&&!g.shot);if(s&&W.gtgt!==s){W.gtgt=s;}});
  console.log('recon:',W.over&&W.over.title,'photos',W.stats.tgt,'t',Math.round(W.time));console.log(' '+all.filter(m=>/צילום|צולמו/.test(m)).join('\n '));}
// stealth: radar range on the low drone, and the controller's calls
{const W=new World({plane:'F15I',start:'air',mission:'stealth'});const p=W.player,st=W.stealthUav;let seen=null,all=[],cd=0;
  run(W,1500,()=>{p.fuel=6000;all.push(...msgs(W));const r=vsub(st.pos,p.pos),R0=vlen(r);apSteer(p,vnorm(v3(r.x,(1500+st.pos.y-p.pos.y)/R0*3,r.z)),0.6);p.ctl.throttle=0.95;
    if(seen==null&&W.contacts.find(c=>c.e===st))seen=Math.round(R0/1000);if(seen!=null){W.lock=st;cd-=1/60;if(R0<9000&&cd<=0){W.launch(MSL.AIM120,p,st);cd=8;}}});
  console.log('stealth: radar first saw it at km',seen,'|',W.over&&W.over.title,'·',W.over&&W.over.reason);console.log(' '+all.filter(m=>/כיוון/.test(m)).slice(0,2).join('\n '));}
// every new mission builds with every aircraft
for(const m of['csar','recon','stealth'])for(const k of Object.keys(R.PLANES)){const W=new World({plane:k,start:'runway',mission:m});run(W,2);if(W.missionId!==m)console.log('  ',m,k,'->',W.missionId);}
console.log('done');
