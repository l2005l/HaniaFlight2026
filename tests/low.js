// Low-level penetration: a timed route, early-warning radars that detect a jet flying high, and the result graded against the TOT.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const msgs=W=>{const m=W.events.filter(e=>e.type==='msg').map(e=>e.text);W.events.length=0;return m;};
for(const th of['south','north']){R.setTheatre&&R.setTheatre(th);
  const W=new R.World({plane:'F16I',mission:'low',start:'air'});const p=W.player;p.hp=p.hpMax=1e9;
  ok(W.missionId==='low'&&W.wps.length===6&&W.wps.slice(0,5).every((w,i,a)=>!i||w.tot>a[i-1].tot),th+': route of 5 timed points, TOT '+W.tot+' s, ewr '+W.ground.filter(g=>g.kind==='ewr').length);
  W.step(0.05);ok(p.agl<500&&!W.low.detected,th+': starts low ('+Math.round(p.agl)+' m) and unseen');
  /* climb high next to a radar: detected within a few seconds, MiGs scrambled */
  const r=W.ground.find(g=>g.kind==='ewr');p.pos=R.v3(r.pos.x-20000,R.terrainH(r.pos.x-20000,r.pos.z)+6000,r.pos.z);let m=[];for(let i=0;i<20*8;i++){W.step(0.05);m.push(...msgs(W));}
  ok(W.low.detected&&W.migsActive&&m.some(t=>/זוהית/.test(t)),th+': high near a radar: detected, fighters scrambled');
  /* the target destroyed 20 s after the TOT, then home */
  const g=W.ground.find(x=>x.primary);W.time=W.tot+20;W.killGround(g);m=msgs(W);ok(m.some(t=>/באיחור/.test(t)),th+': hit graded against the TOT: '+(m.find(t=>/פגיעה/.test(t))||''));
  p.pos=R.v3(5000,R.terrainH(5000,0)+800,0);for(let i=0;i<20*4;i++)W.step(0.05);ok(W.over&&W.over.win&&/זוהית/.test(W.over.reason),th+': back home: '+(W.over&&W.over.reason));}
{/* staying low behind terrain: not detected */const W=new R.World({plane:'F15I',mission:'low',start:'air'});const p=W.player;let seen=0;
  for(let i=0;i<20*60;i++){p.pos.y=R.terrainH(p.pos.x,p.pos.z)+60;W.step(0.05);if(W.exposed)seen++;}ok(!W.low.detected,'flying at 60 m for a minute: not detected (exposed ticks '+seen+')');}
process.exit(bad?1:0);
