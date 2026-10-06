const R=require('../src/core.js');const {World,apSteer,v3,vnorm,D2R,KT,terrainH,vdist}=R;
// AI-only smoke: player autopilot flies the mission crudely
const W=new World({start:'air'});const p=W.player;let log=[];let last=0;
function ev(){for(const e of W.events){if(e.type==='msg')log.push(`[${W.time|0}] ${e.text}`);else if(e.type==='launch')log.push(`[${W.time|0}] launch ${e.m.s.name} by ${e.m.owner===p?'player':(e.m.owner.type||'SAM')} R=${(vdist(e.m.pos,e.m.target.pos)/1000).toFixed(1)}`);else if(e.type==='boom')log.push(`[${W.time|0}] boom`);else if(e.type==='kill')log.push(`[${W.time|0}] kill ${e.e.type}`);else if(e.type==='gkill')log.push(`[${W.time|0}] gkill ${e.g.name}`);}W.events.length=0;}
const dt=1/60;let cmT=0;
for(let t=0;t<1500&&!W.over;t+=dt){
  const wp=W.wps[W.wp];let alt=wp.alt||8000;
  let dir=vnorm(v3(wp.x-p.pos.x,0,wp.z-p.pos.z));dir=vnorm(v3(dir.x,R.clamp((alt-p.pos.y)/2500,-0.25,0.25),dir.z));
  // weapons logic
  if(W.w.sel!=='SPICE'){ if(W.contacts.length&&W.lock!==W.contacts[0].e)W.lock=W.contacts[0].e;
    if(W.lock){const Rr=vdist(W.lock.pos,p.pos);dir=vnorm(R.vsub(W.lock.pos,p.pos));
      if(W.dlz&&W.dlz.R<W.dlz.rmax*0.5&&W.w.aim120>0&&!W.missiles.some(m=>m.owner===p&&m.target===W.lock)){W.w.sel='AIM120';W.trigger(true,dt);W.trigger(false,dt);}
      else if(W.w.aim120===0&&Rr<900){W.w.sel='GUN';W.trigger(true,dt);} }
    if(W.wp>=2&&!W.contacts.length)W.select('SPICE');
    if(p.pos.y<terrainH(p.pos.x+p.vel.x*8,p.pos.z+p.vel.z*8)+700)dir=vnorm(v3(dir.x,0.5,dir.z));
  } else { const b=W.bombSol(); if(b){dir=vnorm(v3(W.gtgt.pos.x-p.pos.x,R.clamp((9000-p.pos.y)/2500,-0.25,0.25)*40000,W.gtgt.pos.z-p.pos.z));dir=vnorm(v3(dir.x,R.clamp((9000-p.pos.y)/2500,-0.25,0.25),dir.z)); if(b.ok&&!W.bombs.some(x=>x.target===W.gtgt)){W.trigger(true,dt);W.trigger(false,dt);W.cycleTarget();} } }
  if(W.mwarn&&W.mwarn.R<9000){cmT-=dt;if(cmT<=0){cmT=0.5;W.dispense(p);}}
  apSteer(p,dir);p.ctl.throttle=p.V<270?1.3:0.95;
  W.step(dt);ev();
  if(W.time-last>60){last=W.time;log.push(`[${W.time|0}] pos ${(p.pos.x/1000).toFixed(1)},${(p.pos.z/1000).toFixed(1)} alt ${p.pos.y|0} kt ${p.V*KT|0} g ${p.g.toFixed(1)} fuel ${p.fuel|0} wp ${W.wp} sel ${W.w.sel} lock ${W.lock?W.lock.type:'-'} contacts ${W.contacts.length} migs ${W.migAI.map(a=>a.state+':'+(a.ac.alive?(a.ac.pos.y|0)+'m '+(a.ac.V|0):'dead')).join(' ')} sam ${W.sam.left}`);}
}
ev();console.log(log.join('\n'));console.log('over',W.over,W.stats,W.w);
