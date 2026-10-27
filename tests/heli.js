// Attack helicopters: low over the ground, hide from the jet behind terrain, hard for the radar, pop up to shoot.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
{const W=new R.World({mission:'cas',start:'air',plane:'F16I'});ok(W.helis.length===2&&W.air.includes(W.helis[0]),'CAS: two Mi-24 in the air list');
  const h=W.helis[0],p=W.player;p.hp=p.hpMax=1e9;for(let i=0;i<60*20;i++){W.step(1/60);}const agl=h.pos.y-R.terrainH(h.pos.x,h.pos.z);ok(h.alive&&agl>10&&agl<60,'patrols low: '+Math.round(agl)+' m');
  /* the jet comes in: the helicopter hides and hovers, and the radar loses it in the ground */
  p.pos=R.v3(h.pos.x-8000,h.pos.y+3000,h.pos.z);p.vel=R.v3(200,0,0);p.q=R.qeuler(Math.PI/2,0,0);let modes=new Set(),hov=0,launched=0;
  for(let i=0;i<60*60;i++){p.pos=R.v3(h.pos.x-3500,h.pos.y+1500,h.pos.z);p.vel=R.v3(0.1,0,0);W.step(1/60);modes.add(h.mode);if(h.mode==='hide'&&R.vlen(h.vel)<3)hov++;launched+=W.events.filter(e=>e.type==='launch'&&e.m.owner===h).length;W.events.length=0;}
  ok(modes.has('hide')&&hov>60,'hides and hovers: '+[...modes].join(',')+', hover '+(hov/60).toFixed(1)+' s');
  ok(W.notched(p.pos,{pos:h.pos,vel:R.v3(0,0,0)},false),'hovering below the jet: in the radar notch');
  ok(modes.has('pop')&&launched>=1,'pops up and fires: '+launched+' missile(s)');}
{const W=new R.World({mission:'strike',start:'air',diff:'easy'});ok(W.helis.length===1,'strike, easy: one');}
{const W=new R.World({mission:'intercept',start:'air'});ok(!W.helis.length,'intercept: none');}
{const W=new R.World({mission:'cas',start:'air',plane:'F16I'}),h=W.helis[0];W.killAir(h);ok(!h.alive&&W.stats.heli===1,'kill counted');}
process.exit(bad?1:0);
