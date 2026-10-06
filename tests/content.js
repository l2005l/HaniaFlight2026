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
