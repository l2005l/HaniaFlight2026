// The Lavi trainer: takes off, climbs, has no afterburner, keeps a wide margin from the stall with the stick held full back, and lands.
const R=require('../src/core.js');const {World,D2R,R2D,KT,clamp}=R;let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
{const W=new World({plane:'M346',mission:'intercept',start:'runway'});const p=W.player;let off=null;
  ok(W.w.sel==='PYTHON'&&W.w.aim120===0&&W.w.python===2,'trainer starts with the training Pythons selected');
  for(let t=0;t<120;t+=1/60){p.ctl.throttle=1.3;p.ctl.pitch=p.V>65&&p.euler().pitch<12*D2R?0.45:p.onGround?0:0.05;if(!p.onGround&&off==null)off=t;if(!p.onGround&&p.agl>30){p.gear=false;p.flaps=false;}W.step(1/60);}
  ok(p.eng<=1.0001,'throttle stops at military power (no afterburner): '+p.eng.toFixed(2));
  ok(off!=null&&off<40,'airborne after '+(off||0).toFixed(1)+' s');ok(p.alive&&p.pos.y>800,'climbing, alt '+(p.pos.y|0)+' m, '+(p.V*KT|0)+' kt');
  /* stick full back for 20 s at low speed: alpha must stay well below the stall */
  p.ctl.throttle=0.4;let amax=0;for(let t=0;t<20;t+=1/60){p.ctl.pitch=1;p.ctl.roll=0;W.step(1/60);amax=Math.max(amax,p.alpha*R2D);}
  ok(amax<R.TYPES.M346.aStall*R2D-4,'max alpha with full back stick '+amax.toFixed(1)+'° (stall '+(R.TYPES.M346.aStall*R2D)+'°)');}
{/* level flight top speed at 3000 m */const W=new World({plane:'M346',mission:'train',start:'air'});const p=W.player;p.pos.y=3000;
  for(let t=0;t<240;t+=1/60){p.ctl.throttle=1;const gam=Math.asin(clamp(p.vel.y/p.V,-1,1));p.ctl.pitch=clamp(-gam*4+(3000-p.pos.y)*0.002,-0.5,0.5);p.ctl.roll=clamp(-p.euler().roll*2,-1,1);W.step(1/60);}
  ok(p.mach>0.75&&p.mach<1.1,'level top speed Mach '+p.mach.toFixed(2)+' (real: about 0.95)');}
process.exit(bad?1:0);
