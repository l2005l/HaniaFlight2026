/* version 1.7: automatic join-up with the tanker, stand-off weapons and the naval strike */
const R=require('../src/core.js');
const run=(W,t,f)=>{for(let i=0;i<t*60&&!W.over;i++){if(f)f();W.step(1/60);}};
for(const d of['easy','normal','hard']){const W=new R.World({mission:'tanker',start:'air',diff:d});W.arJoin=true;run(W,300,()=>{if(!W.arJoin)W.over={};});const a=W.ar,p=W.player,k=W.tanker;const tj=Math.round(W.time);W.over=null;
  run(W,120,()=>{const fw=R.qrot(k.q,R.FWD),cp=R.vadd(k.pos,R.qrot(k.q,R.v3(0,-7.5,30))),r=R.vsub(cp,p.pos),rv=R.vsub(p.vel,k.vel);R.apSteer(p,R.vnorm(R.vadd(R.vmul(fw,400),R.v3(r.x,0,r.z))),0.4);p.ctl.pitch=R.clamp(r.y*0.03-rv.y*0.25,-0.3,0.3);
    const dv=k.spd+R.clamp(R.vdot(r,fw)*0.05,-2,2)-R.vdot(p.vel,fw);p.ctl.throttle=R.clamp(0.6+dv*0.06,0,1);p.ctl.brake=dv<-5;if(a.state==='contact')W.over={};});
  console.log('join',d,': at the waiting point after',tj,'s; then a simple pilot ->',a.state,'alive',p.alive);}
{const W=new R.World({mission:'naval',start:'air',plane:'F15I'});const p=W.player;W.hurt=()=>{};W.select('SPICE');W.arm=true;let n=0;
 run(W,1500,()=>{p.fuel=8000;const live=W.ground.filter(g=>g.alive);if(!live.length){R.apSteer(p,R.vnorm(R.v3(-p.pos.x,0,-p.pos.z)),0.4);return;}const r=R.vsub(live[0].pos,p.pos),hd=Math.hypot(r.x,r.z);
  R.apSteer(p,hd<20000?R.vnorm(R.v3(-r.x,0,-r.z)):R.vnorm(R.v3(r.x,(6000-p.pos.y)/3000*hd,r.z)),0.5);p.ctl.throttle=1;
  const tgt=live.find(g=>!W.missiles.some(m=>m.alive&&m.target===g));if(tgt){W.gtgt=tgt;const b=W.bombSol();if(b&&b.ok){W.trigger(false,true,1/60);W.trigger(false,false,1/60);n++;}}});
 console.log('naval:',W.over&&W.over.title,'| launched',W.stats.shots,'sunk',W.stats.tgt,'(a ship can shoot a missile down, so a miss is possible)');}
{const W=new R.World({mission:'strike',start:'air',plane:'F16I',bomb:'delilah'});const p=W.player;W.hurt=()=>{};W.select('SPICE');while(W.gtgt&&W.gtgt.kind!=='bunker')W.cycleTarget();const g=W.gtgt;W.arm=true;p.pos.x=20000;const b=W.bombSol();W.trigger(false,true,1/60);
 run(W,700,()=>{p.fuel=5000;R.apSteer(p,R.v3(-1,0.02,0),0.4);if(!g.alive)W.over={};});console.log('delilah from',Math.round(b.hd/1000),'km: bunker destroyed',!g.alive,'after',Math.round(W.time),'s');}
{const W=new R.World({mission:'strike',start:'air',plane:'F15I',bomb:'jdam'});console.log('jdam:',W.w.spice,'×',W.plane.bomb.name,'| anti-ship on a land target refused:',(()=>{const N=new R.World({mission:'naval',start:'air'});N.gtgt={alive:true,kind:'tel',pos:{x:30000,y:0,z:0}};return !N.bombSol().ok;})());}
