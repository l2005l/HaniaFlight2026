// F-16I performance and a crude autopilot through the air-combat mission.
const R=require('../src/core.js');const {Aircraft,World,apSteer,v3,vnorm,vsub,vdist,D2R,KT}=R;R.buildTerrain();
const P=R.PLANES.F16I,st={storeMass:P.aim120*157+P.python*105+P.spice*P.bomb.mass+P.base,storeCD:(P.aim120+P.python)*0.0005+P.spice*0.0022};
{const a=new Aircraft('F16I',{x:-1240,y:60+1.9,z:0,hdg:Math.PI/2,gear:true,flaps:true,onGround:true,fuel:P.fuelRwy,throttle:0,...st});a.ctl.throttle=1.3;let lift=null;
 for(let t=0;t<40;t+=1/120){a.ctl.pitch=a.V>80&&a.euler().pitch<10*D2R?0.5:0;if(!a.onGround&&!lift){lift={t:+t.toFixed(1),run:a.pos.x+1240|0,kt:a.V*KT|0};a.gear=false;}a.step(1/120);if(!a.alive)break;}
 console.log('F-16I takeoff',JSON.stringify(lift),'alt@40s',a.pos.y|0,'kt',a.V*KT|0,'alive',a.alive,'mass',a.mass|0);}
function level(alt,thr,s){const a=new Aircraft('F16I',{x:0,y:alt,z:0,hdg:Math.PI/2,speed:250,fuel:3000,throttle:thr,...s});
 for(let t=0;t<240;t+=1/60){apSteer(a,vnorm(v3(1,R.clamp((alt-a.pos.y)/800,-0.3,0.3),0)));a.ctl.throttle=thr;a.step(1/60);}return 'M'+a.mach.toFixed(2);}
console.log('F-16I level: SL mil',level(300,1,{}),'SL AB',level(300,1.3,{}),'11km AB clean',level(11000,1.3,{}),'11km AB loaded',level(11000,1.3,st));
for(const plane of ['F15I','F16I']){const W=new World({mission:'duel',plane,diff:'easy'}),p=W.player;let cm=0,log=[];
 for(let t=0;t<400&&!W.over;t+=1/60){if(W.contacts.length&&!W.lock)W.lock=W.contacts[0].e;let dir=v3(1,0,0);
  if(W.lock){dir=vnorm(vsub(W.lock.pos,p.pos));const sel=W.w.aim120?'AIM120':W.w.python?'PYTHON':'GUN';if(W.w.sel!==sel)W.select(sel);
   const ok=sel==='GUN'?vdist(W.lock.pos,p.pos)<800:W.dlz&&W.dlz.R<W.dlz.rmax*0.5&&!W.missiles.some(m=>m.owner===p&&m.alive);W.trigger(sel==='GUN'&&!!ok,sel!=='GUN'&&!!ok,1/60);if(sel!=='GUN')W.trigger(false,false,1/60);}
  if(W.mwarn&&W.mwarn.R<9000){cm-=1/60;if(cm<=0){cm=0.5;W.dispense(p);}}
  if(p.agl<900)dir=vnorm(v3(dir.x,0.5,dir.z));apSteer(p,dir);p.ctl.throttle=1.3;W.step(1/60);
  for(const e of W.events)if(e.type==='msg')log.push((W.time|0)+'s '+e.text.slice(0,34));W.events.length=0;}
 console.log(plane,'duel:',W.over?W.over.title:'no result','migs',W.stats.mig,'t',W.time|0,'|',log.join(' / '));}
const W=new World({plane:'F16I'});console.log('strike F-16I: bombs',W.w.spice,W.plane.bomb.name,'bingo',W.bingo,'hp',W.player.hp,'gearY',(W.player.pos.y-60).toFixed(1));
{const D=new World({mission:'duel'});for(const m of D.migs)D.killAir(m);for(let t=0;t<6;t+=1/60){D.player.ctl.throttle=1;D.step(1/60);}console.log('duel win flow:',D.over&&D.over.title,'| ground targets',D.ground.length,'drones',D.drones.length,'bombs',D.w.spice);}
