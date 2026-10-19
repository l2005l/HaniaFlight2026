// The newer air-to-ground weapons reach and destroy a strike target when used as intended.
const R=require('../src/core.js');const {qrot,FWD}=R;let bad=0;
function fly(W,secs,ctl){for(let i=0;i<secs*20;i++){if(ctl)ctl(W);W.step(0.05);}}
function aimAt(W,g,pitch){const p=W.player,h=Math.atan2(g.pos.x-p.pos.x,-(g.pos.z-p.pos.z));p.q=R.qeuler(h,pitch||0,0);p.vel=R.vmul?R.vmul(qrot(p.q,FWD),p.V||240):p.vel;}
for(const[bo,pl]of[['spice','F15I'],['sdb','F15I'],['bunker','F15I'],['rampage','F16I'],['mk84','F15I']]){
  const W=new R.World({plane:pl,mission:'strike',start:'air',bomb:bo});W.arm=true;W.real=false;const g=W.ground.find(x=>x.primary);W.gtgt=g;W.select('SPICE');W.gtgt=g;
  for(const q of W.sams)q.alive=false;W.migs.forEach(m=>m.alive=false);const p=W.player;p.hp=p.hpMax=1e9;const n0=W.ground.filter(x=>x.alive).length;
  /* place the jet on a run at the target: inside range for guided weapons, overhead in a dive for the free-fall bomb */
  const d=bo==='spice'?14000:bo==='rampage'?60000:bo==='mk84'?2600:bo==='bunker'?9000:14000,alt=bo==='mk84'?2200:6000;
  const a=Math.random()*6.28;p.pos={x:g.pos.x+Math.sin(a)*d,y:R.terrainH(g.pos.x,g.pos.z)+alt,z:g.pos.z-Math.cos(a)*d};
  const h=Math.atan2(g.pos.x-p.pos.x,-(g.pos.z-p.pos.z));
  if(bo==='mk84'){/* find the dive angle that puts the CCIP on the target */let best=null;for(let pd=-10;pd>=-70;pd-=0.5){p.q=R.qeuler(h,pd*Math.PI/180,0);const f=qrot(p.q,FWD);p.vel={x:f.x*230,y:f.y*230,z:f.z*230};W._ccip=null;const c=W.ccip();if(!c)continue;const m=Math.hypot(c.x-g.pos.x,c.z-g.pos.z);if(!best||m<best.m)best={m,pd};}
    p.q=R.qeuler(h,best.pd*Math.PI/180,0);const f=qrot(p.q,FWD);p.vel={x:f.x*230,y:f.y*230,z:f.z*230};W._ccip=null;}
  else{p.q=R.qeuler(h,0,0);const f=qrot(p.q,FWD);p.vel={x:f.x*240,y:0,z:f.z*240};}
  if(bo==='bunker')W.laserSpot=null;
  const sol=W.bombSol();W.pickHeld=false;W.trigger(false,true,0.05);
  const shot=W.bombs.length+W.missiles.length;
  if(!sol||!sol.ok||!shot){console.log('NO RELEASE',bo,JSON.stringify(sol&&{ok:sol.ok,hd:sol.hd|0,rmax:sol.rmax|0,miss:sol.miss}));bad++;continue;}
  /* climb the jet out of the way: the weapon flies on by itself */
  if(bo!=='bunker'){p.pos={...p.pos,y:p.pos.y+4000};p.q=R.qeuler(h,0,0);const f=qrot(p.q,FWD);p.vel={x:f.x*240,y:0,z:f.z*240};}
  /* the lasing for the GBU-28 comes from the jet's own pod */
  fly(W,240,W2=>{W2.player.ctl.throttle=0.8;if(bo==='bunker')W2.laserSpot={...g.pos};});
  const wb=W.bombs[0]||W.missiles.find(m=>m.cruise);if(process.env.DBG)console.log(' over',W.over&&W.over.title,'player',W.player.alive,'wpn',wb&&{alive:wb.alive,res:wb.result,d:Math.round(Math.hypot(wb.pos.x-g.pos.x,wb.pos.z-g.pos.z)),y:Math.round(wb.pos.y),t:Math.round(wb.t)});
  const ok=!g.alive;console.log(bo.padEnd(8),pl,ok?'target destroyed':'MISSED',W.plane.bomb.name);if(!ok)bad++;}
process.exit(bad?1:0);
