// Close air support: the controller checks in, talks the pilot onto each target, clears only the right one,
// complains about a release without clearance, and a bomb near our troops ends the sortie.
const R=require('../src/core.js');const {qrot,FWD}=R;let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const msgs=W=>{const m=W.events.filter(e=>e.type==='msg').map(e=>e.text);W.events.length=0;return m;};
function run(W,s,f){const out=[];for(let i=0;i<s*20;i++){if(f)f(W);W.step(0.05);out.push(...msgs(W));}return out;}
function place(W,g,d,alt){const p=W.player,a=Math.random()*6.28;p.pos={x:g.pos.x+Math.sin(a)*d,y:R.terrainH(g.pos.x,g.pos.z)+alt,z:g.pos.z-Math.cos(a)*d};const h=Math.atan2(g.pos.x-p.pos.x,-(g.pos.z-p.pos.z));p.q=R.qeuler(h,0,0);const f=qrot(p.q,FWD);p.vel={x:f.x*230,y:0,z:f.z*230};p.hp=p.hpMax=1e9;}
{const W=new R.World({plane:'F15I',mission:'cas',start:'air',bomb:'lgb'});W.arm=true;W.helis.forEach(h=>{h.alive=false;});
  ok(W.missionId==='cas'&&W.troops.length===4&&W.cas.order.length===3,'mission set up: 4 own units, 3 targets, '+W.ground.length+' enemy objects');
  const own=W.troops[0];ok(W.cas.order.every(g=>R.vdist(g.pos,own.pos)>450),'targets at least 450 m from our troops');
  for(const q of W.sams)q.alive=false;place(W,own,20000,5000);let m=run(W,6);
  ok(m.some(t=>/אגוז/.test(t))&&m.some(t=>/מטרה ראשונה/.test(t)),'check-in and first talk-on: '+(m.find(t=>/מטרה ראשונה/.test(t))||'').slice(0,90));
  const T=W.cas.order[0],wrong=W.ground.find(g=>g!==T&&g.alive);W.select('SPICE');W.gtgt=wrong;m=run(W,1.5);
  ok(m.some(t=>/שלילי/.test(t))&&!W.cas.cleared,'wrong target: corrected, not cleared: '+(m.find(t=>/שלילי/.test(t))||'').slice(0,90));
  W.gtgt=T;m=run(W,1.5);ok(W.cas.cleared&&m.some(t=>/רשאי לתקוף/.test(t)),'right target: cleared hot');
  /* lase it and drop a GBU-12 from range */
  place(W,T,7000,3000);W.gtgt=T;const sol=W.bombSol();W.pickHeld=false;W.trigger(false,true,0.05);ok(W.bombs.length===1&&W.cas.viol===0,'release with clearance, no reprimand (in range '+(sol&&sol.ok)+')');
  m=run(W,60,W2=>{W2.laserSpot={...T.pos};});ok(!T.alive&&m.some(t=>/פגיעה טובה/.test(t)),'target destroyed, good hits');
  m=m.concat(run(W,8));ok(m.some(t=>/מטרה שנייה/.test(t)),'second talk-on: '+(m.find(t=>/מטרה שנייה/.test(t))||'').slice(0,90));
  /* release on the second without clearance */
  const T2=W.cas.order[1];place(W,T2,7000,3000);W.gtgt=T2;W.cas.cleared=false;W.cas.lastLook=T2;W.pickHeld=false;W.trigger(false,true,0.05);m=msgs(W);
  ok(W.cas.viol===1&&m.some(t=>/אבורט/.test(t)),'release without clearance: reprimand, counted');}
{/* a bomb next to our own troops ends the sortie */const W=new R.World({plane:'F16I',mission:'cas',start:'air'});const own=W.troops[1];
  W.onBomb({owner:W.player,pos:{...own.pos},target:{alive:false}});ok(W.over&&!W.over.win&&W.over.title==='פגיעה בכוחותינו','fratricide: '+(W.over&&W.over.title));}
{/* the trainer cannot fly it; the F-15C (no pod) falls back */const W=new R.World({plane:'F15C',mission:'cas',start:'air'});ok(W.missionId==='intercept','no pod: falls back to '+W.missionId);}
process.exit(bad?1:0);
