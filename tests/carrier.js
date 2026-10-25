// Carrier: catapult launch, trap on a wire, bolter, hitting the ship, the LSO on the glide path.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const msgs=W=>{const m=W.events.filter(e=>e.type==='msg').map(e=>e.text);W.events.length=0;return m;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
{const W=new R.World({plane:'F35C',mission:'strike',start:'runway'}),p=W.player,cv=W.carrier;
  ok(cv&&R.isWater(cv.pos.x,cv.pos.z)&&cv.onDeck(p.pos)&&W.cat&&W.cat.phase==='hold','F-35C starts on the catapult of a carrier at sea');
  for(let i=0;i<60*16;i++){p.ctl.throttle=1.3;p.ctl.pitch=W.cat?0:clamp((0.2-p.euler().pitch)*3,-1,1);if(p.agl>30)p.gear=false;W.step(1/60);}
  ok(p.alive&&p.pos.y>150&&!W.cat,'catapult launch and climb-out: '+Math.round(p.pos.y)+' m');
  ok(W.wps.some(w=>w.n==='CVN'&&Math.hypot(w.x-cv.pos.x,w.z-cv.pos.z)<1),'home waypoint is the ship');}
const final=(W,u,h,vs,v)=>{const cv=W.carrier,p=W.player,pt=cv.landPt(u,v||0),f=R.v3(Math.sin(cv.landHdg),0,-Math.cos(cv.landHdg));p.pos=R.v3(pt.x,R.CV.h+h,pt.z);p.q=R.qeuler(cv.landHdg,0.08,0);
  p.vel=R.vadd(cv.vel,R.v3(f.x*68,-vs,f.z*68));p.gear=true;p.gearPos=1;p.flaps=true;p.onGround=false;p.ctl.throttle=p.eng=0.75;W.flags.cvApp=true;W.cat=null;};
{const W=new R.World({plane:'F35C',mission:'train',lesson:'carrier'}),p=W.player;msgs(W);p.hook=true;final(W,30,4.5,3.6);
  let m=[];for(let i=0;i<60*8;i++){p.ctl.throttle=p.onGround?1.3:0.75;W.step(1/60);m.push(...msgs(W));}
  ok(p.alive&&p.caught&&p.caught.wire>=1&&W.flags.trap,'hook down: trapped on wire '+(p.caught&&p.caught.wire)+' '+(p.crash||''));
  const L=W.carrier.land(p.pos);ok(L.u<190&&W.carrier.onDeck(p.pos),'stopped on deck, '+Math.round(L.u)+' m along the landing area');
  ok(m.some(t=>/כבל/.test(t)),'LSO calls the wire');
  for(let i=0;i<60*12&&!W.over;i++)W.step(1/60);ok(W.over&&W.over.win,'lesson complete');}
{const W=new R.World({plane:'F35C',mission:'train',lesson:'carrier'}),p=W.player;msgs(W);p.hook=false;final(W,40,4.5,3.6);
  let m=[];for(let i=0;i<60*10;i++){p.ctl.throttle=1.3;p.ctl.pitch=p.onGround?0.6:clamp((0.15-p.euler().pitch)*3,-1,1);W.step(1/60);m.push(...msgs(W));}
  ok(p.alive&&!p.caught&&m.some(t=>/בולטר/.test(t)),'hook up: bolter and fly away '+(p.crash||'')+' y='+Math.round(p.pos.y));}
{const W=new R.World({plane:'F35C',mission:'train',lesson:'carrier'}),p=W.player;final(W,-60,-6,0);for(let i=0;i<60*3&&p.alive;i++)W.step(1/60);
  ok(!p.alive&&/נושאת/.test(p.crash),'too low: into the stern: '+p.crash);}
{const W=new R.World({plane:'F35C',mission:'train',lesson:'carrier'}),p=W.player;msgs(W);p.hook=true;p.gear=true;p.gearPos=1;
  /* hold the jet 1 degree low at a mile, then on the slope: the LSO wants power, then nothing */
  const cv=W.carrier,at=(d,deg)=>{const pt=cv.landPt(R.CV.aim-d),f=R.v3(Math.sin(cv.landHdg),0,-Math.cos(cv.landHdg));p.pos=R.v3(pt.x,R.CV.h+1.5+d*Math.tan(R.CV.gs+deg*R.D2R),pt.z);p.vel=R.vadd(cv.vel,R.vmul(f,68));p.q=R.qeuler(cv.landHdg,0,0);};
  let m=[];for(let i=0;i<60*6;i++){at(1300,-0.8);W.step(1/60);m.push(...msgs(W));}ok(m.some(t=>/LSO: כוח/.test(t))&&m.some(t=>/כדור/.test(t)),'1 degree low: "power"');
  ok(W.cvGS&&Math.abs(W.cvGS.deg+0.8)<0.15,'glide-slope deviation measured: '+(W.cvGS&&W.cvGS.deg.toFixed(2)));}
{const W=new R.World({plane:'F15I',mission:'strike'});ok(!W.carrier,'other jets: no carrier');}
{/* a carrier sortie ends only with a trap: photos taken, near the ship but not landed is not home */
  const W=new R.World({plane:'F35C',mission:'recon',start:'air'}),p=W.player,cv=W.carrier;p.hp=p.hpMax=1e9;for(const g of W.ground)g.shot=true;W.sams.length=0;W.migs.forEach(m=>{m.alive=false;});
  const pt=cv.world(-3000,0,800);p.pos=R.v3(pt.x,800,pt.z);for(let i=0;i<60*20;i++){p.pos=R.v3(pt.x,800,pt.z);W.step(1/60);}ok(!W.over,'over the ship, not landed: sortie goes on');
  W.flags.trap=3;for(let i=0;i<60*5&&!W.over;i++)W.step(1/60);ok(W.over&&W.over.win,'trapped: sortie complete: '+(W.over&&W.over.title));}
process.exit(bad?1:0);
