/* new aircraft, stealth, the air-defence mission and the guided training flight */
const R=require('../src/core.js');
const {World,apSteer,vsub,vnorm,vlen,v3,qrot,FWD,MSL}=R;
const run=(W,t,f)=>{for(let i=0;i<t*60&&!W.over;i++){if(f)f(i/60);W.step(1/60);}};
// every aircraft takes off under a simple pilot
for(const k of Object.keys(R.PLANES)){const W=new World({plane:k,start:'runway',mission:'intercept'});const p=W.player;
  run(W,70,()=>{const e=p.euler();p.ctl.throttle=1.3;p.ctl.pitch=p.V>82&&e.pitch<10*R.D2R?0.5:0;if(!p.onGround&&p.agl>30)p.gear=false;});
  console.log(k,'takeoff: alt',Math.round(p.pos.y),'kt',Math.round(p.V*1.944),'alive',p.alive,'sig',W.sig.toFixed(2),'mission',W.missionId,'stores',W.w.aim120,W.w.python,W.w.spice,W.w.gun);}
// stealth: how close each type gets to the SAM before it tracks
for(const k of ['F15I','F35I']){const W=new World({plane:k,start:'air',mission:'strike'});const p=W.player;let first=null,mn=1e9;W.migs.forEach(m=>m.alive=false);
  run(W,700,()=>{const d=vnorm(v3(W.sam.pos.x-p.pos.x,0,W.sam.pos.z-p.pos.z));apSteer(p,v3(d.x,(7000-p.pos.y)/4000,d.z),0.6);p.ctl.throttle=0.9;if(W.sam.tracking&&first==null)first=Math.round(vlen(vsub(W.sam.pos,p.pos))/1000);mn=Math.min(mn,vlen(vsub(W.sam.pos,p.pos)));if(first!=null||mn<3000)W.over={};});
  console.log(k,'SAM first tracks at km',first,'closest',Math.round(mn/1000),'alive',p.alive,p.crash);}
// air defence: shoot everything with unlimited missiles from a helper pilot
{const W=new World({plane:'F15C',start:'air',mission:'strike'});const p=W.player;let cd=0;
  run(W,1500,(t)=>{const live=W.drones.filter(d=>d.alive).sort((a,b)=>a.pos.x-b.pos.x)[0];if(!live)return;const r=vsub(live.pos,p.pos),R0=vlen(r),d=vnorm(v3(r.x,0,r.z));
    apSteer(p,v3(d.x,(3000-p.pos.y)/3000,d.z),0.7);p.ctl.throttle=1;p.fuel=5000;cd-=1/60;if(R0<14000&&cd<=0){W.launch(MSL.AIM120,p,live);cd=12;}});
  console.log('intercept:',W.missionId,W.over&&W.over.title,W.over&&W.over.reason,'t',Math.round(W.time));}
// air defence with nobody home: everything leaks
{const W=new World({plane:'F15I',start:'air',mission:'intercept'});const p=W.player;run(W,1500,()=>{apSteer(p,v3(0,(6000-p.pos.y)/3000,-1),0.5);p.fuel=5000;});console.log('intercept idle:',W.over&&W.over.title,W.over&&W.over.reason,'t',Math.round(W.time));}
// training: follow the instructor
{const W=new World({plane:'F16I',start:'air',mission:'train'});const p=W.player;const seen=[];let cd=0;
  run(W,900,()=>{for(const e of W.events)if(e.type==='msg')seen.push(Math.round(W.time)+' '+e.text.slice(0,34));W.events.length=0;const s=W.flags.step||0;p.fuel=4000;
    if(s===0){apSteer(p,v3(1,0.25,0),0.6);p.ctl.throttle=1.2;}
    else if(s===1){apSteer(p,v3(0,0,-1),0.6);p.ctl.throttle=0.9;}
    else if(s<5){const t=W.drones.find(d=>d.alive);if(t){const r=vsub(t.pos,p.pos);apSteer(p,vnorm(r),0.7);if(s===2){W.cycleTarget();}else{W.arm=true;cd-=1/60;if(cd<=0){W.launch(MSL.AIM120,p,t);cd=10;}}}p.ctl.throttle=0.9;}
    else{W.arm=false;p.ctl.throttle=0.6;apSteer(p,v3(0,0,-1),0.5);}});
  console.log('train:',W.over&&W.over.title,'step',W.flags.step,'\n '+seen.join('\n '));}
// laser-guided bombs: shorter reach, and the bomb misses if the laser is lost
for(const keep of [true,false]){const W=new World({plane:'F15I',start:'air',mission:'strike',bomb:'lgb'});const p=W.player;W.migs.forEach(m=>m.alive=false);W.sams.forEach(q=>q.radar.alive=false);W.select('SPICE');let rel=null;const g0=W.gtgt;
  run(W,900,()=>{const g=W.gtgt||g0,r=vsub(g.pos,p.pos),d=vnorm(v3(r.x,0,r.z));p.fuel=6000;
    if(rel==null){apSteer(p,v3(d.x,(7000-p.pos.y)/4000,d.z),0.6);p.ctl.throttle=1;const b=W.bombSol();if(b&&b.ok&&b.hd<b.rmax*0.8){W.arm=true;W.trigger(false,true,1/60);rel=W.time;}}
    else{if(keep)apSteer(p,v3(d.x,0.05,d.z),0.3);else apSteer(p,v3(-d.x,0.3,-d.z),0.9);if(!W.bombs.length&&W.time-rel>3)W.over={};}});
  console.log('LGB',W.plane.bomb.name,'x',W.plane.spice,keep?'overflew and banked hard (laser masked)':'turned away with the belly to the target','-> target alive:',g0.alive,'released at',rel&&Math.round(rel));}
// random failure and ejection
{const W=new World({plane:'F16I',start:'air',mission:'train',fail:true});W.failT=5;const p=W.player;run(W,20,()=>{apSteer(p,v3(1,0,0),0.4);});console.log('failure:',W.dmg.map(d=>d.t).join(','));
  W.over=null;console.log('eject',W.eject());run(W,12);console.log(' ->',W.over&&W.over.title,W.over&&W.over.reason);}
// wind drift
{const W=new World({plane:'F15I',start:'air',mission:'train',wx:'wind'});const p=W.player;run(W,20);const e=p.euler();console.log('wind: crab angle deg',((e.hdg-Math.atan2(p.vel.x,-p.vel.z))*R.R2D).toFixed(1),'(nose into the wind, track unchanged)');}
// lessons: each one can be completed by a simple pilot
{const mk=l=>new World({plane:'F16I',start:'air',mission:'train',lesson:l});
 {const W=mk('land'),p=W.player;run(W,400,()=>{const e=p.euler();p.gear=true;p.flaps=true;const gs=Math.atan2(p.pos.y-R.SITES.base.h-2,Math.max(1,R.RWY.x1+250-p.pos.x));
    if(!p.onGround){const want=p.agl>12?-3*R.D2R:-0.6*R.D2R,fp=Math.asin(R.clamp(p.vel.y/Math.max(p.V,1),-1,1)),aim=gs>3.3*R.D2R?-4.5*R.D2R:gs<2.7*R.D2R?-1.2*R.D2R:want;p.ctl.pitch=R.clamp((aim-fp)*6,-0.5,0.5);p.ctl.roll=R.clamp(-p.pos.z*0.004-e.roll*2,-0.4,0.4);p.ctl.throttle=p.agl<8?0:p.V>78?0.25:p.V>72?0.6:1;p.ctl.brake=p.V>84;}
    else{p.ctl.throttle=0;p.ctl.pitch=0;p.ctl.brake=true;}});console.log('lesson land:',W.over&&W.over.title,'step',W.flags.step,p.crash||'');}
 {const W=mk('ground'),p=W.player;run(W,400,()=>{if(W.flags.step===0)W.select('SPICE');W.arm=true;const g=W.gtgt||W.ground[0],r=vsub(g.pos,p.pos);apSteer(p,vnorm(v3(r.x,0,r.z)),0.5);const b=W.bombSol();W.trigger(false,!!(b&&b.ok&&W.flags.step===3),1/60);});console.log('lesson ground:',W.over&&W.over.title,'step',W.flags.step);}
 {const W=mk('evade'),p=W.player;let cm=0;run(W,400,()=>{p.fuel=4000;const m=W.missiles.find(x=>x.alive&&x.target===p);if(m){const l=vnorm(vsub(p.pos,m.pos));apSteer(p,vnorm(v3(-l.z,-0.05,l.x)),0.8);cm-=1/60;if(cm<=0){cm=0.8;W.dispense(p);}}else apSteer(p,v3(1,0.02,0),0.4);});console.log('lesson evade:',W.over&&W.over.title,'step',W.flags.step,'of',W.trainN);}
 {const W=mk('refuel');console.log('lesson refuel: tanker',!!W.tanker,'fuel',Math.round(W.player.fuel),'steps',(W.mission(),W.trainN));}}
// return to the shelter after landing, pins at the arming point, pair take-off
{const W=new World({plane:'F15I',start:'cold',mission:'strike',wing:true});const p=W.player,c=W.crew;console.log('pins in at cold start:',W.sys.pins,'| wingman waits on runway:',W.wing.ac.onGround);
 p.pos=v3(R.ARM_PT.x,p.pos.y,R.ARM_PT.z);W.sys.chocks=false;c.phase='done';run(W,12,()=>{p.vel=v3();});console.log(' after 12 s stopped at the arming point: pins',W.sys.pins,c.arm);
 W.flags.touch=true;W.flags.airborne=true;p.wasAir=true;p.pos=v3(R.PARK.x,p.pos.y,R.PARK.z-200);run(W,2,()=>{p.vel=v3(0,0,3);p.pos.z=R.PARK.z-200;});const a=c.phase;p.pos=v3(R.PARK.x,p.pos.y,R.PARK.z-5);run(W,8,()=>{p.vel=v3();});console.log(' recovery phases:',a,'->',c.phase,'chocks',W.sys.chocks,'|',W.over&&W.over.reason);}
{const W=new World({plane:'F16I',start:'runway',mission:'intercept',wing:true});const p=W.player,w=W.wing.ac;run(W,90,()=>{const e=p.euler();p.ctl.throttle=1.3;p.ctl.pitch=p.V>82&&e.pitch<10*R.D2R?0.5:0;if(!p.onGround&&p.agl>30)p.gear=false;});console.log('pair take-off: leader alt',Math.round(p.pos.y),'wingman alive',w.alive,'alt',Math.round(w.pos.y),'dist',Math.round(vlen(vsub(w.pos,p.pos))));}
