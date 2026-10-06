const R=require('../src/core.js');const {World,v3,D2R,KT}=R;
{const W=new World({start:'runway'});const p=W.player;let msgs=[];
 for(let t=0;t<60;t+=1/120){p.ctl.throttle=1.3;p.ctl.pitch=p.V>77&&p.euler().pitch<10*D2R?0.5:0;if(!p.onGround&&p.agl>20){p.gear=false;p.flaps=false;}W.trigger(false,false,1/120);W.step(1/120);for(const e of W.events)if(e.type==='msg')msgs.push((W.time|0)+' '+e.text.slice(0,40));W.events.length=0;}
 console.log('takeoff world: alt',p.pos.y|0,'kt',p.V*KT|0,'alive',p.alive,p.crash,'g',p.g.toFixed(2));console.log(msgs.join('\n'));}
{const W=new World({start:'air'});const p=W.player;for(const g of W.ground)if(g.primary)g.alive=false;W.stats.tgt=3;W.migsActive=false;
 // final approach from the east: 3 km out on 3deg slope
 p.pos=v3(R.RWY.x2-250+3000,60+2.4+3000*Math.tan(3*D2R),0);p.q=R.qeuler(-Math.PI/2,6*D2R,0);p.vel=v3(-80*Math.cos(3*D2R),-80*Math.sin(3*D2R),0);p.gear=true;p.gearPos=1;p.flaps=true;p.fuel=2500;W.w.spice=0;W.w.aim120=1;W.syncStores();
 let msgs=[],td=null;
 for(let t=0;t<120&&!W.over;t+=1/120){const e=p.euler();
   if(!p.onGround){const dx=p.pos.x-(R.RWY.x2-250);const want=60+2.4+Math.max(0,dx)*Math.tan(3*D2R);const gam=Math.asin(p.vel.y/p.V);const tg=R.clamp(-3*D2R+(want-p.pos.y)*0.004,-6*D2R,1*D2R)*(p.agl<8?0.35:1);
     p.ctl.pitch=R.clamp((tg-gam)*6,-0.5,0.5);p.ctl.throttle=p.V<78?1.0:0.5;p.ctl.roll=R.clamp(-e.roll*2,-1,1);p.ctl.brake=false;}
   else{if(!td){td={x:p.pos.x|0,v:p.V*KT|0,sink:p.touchSink.toFixed(2),mass:p.mass|0,aoa:(p.alpha*57.3).toFixed(1)};}p.ctl.pitch=0;p.ctl.throttle=0;p.ctl.brake=true;}
   W.step(1/120);for(const ev of W.events)if(ev.type==='msg')msgs.push((W.time|0)+' '+ev.text.slice(0,50));W.events.length=0;}
 console.log('landing',td,'stop x',p.pos.x|0,'over',W.over,p.crash);console.log(msgs.join('\n'));}
