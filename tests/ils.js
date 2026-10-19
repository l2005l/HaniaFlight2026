// The instrument landing lesson can be flown on the ILS needles alone, from ten miles out to a stop on the runway.
const R=require('../src/core.js');const {World,D2R,R2D,KT,clamp}=R;let bad=0;
for(const plane of['F15I','F16I','F35I','M346']){
  const W=new World({mission:'train',lesson:'ils',plane,start:'air',wx:'fog'});const p=W.player;let msgs=[],td=null,aoa=[],maxDev=0;
  for(let t=0;t<600&&!W.over;t+=1/60){const e=p.euler(),I=W.ils();
    if(t>3){p.gear=true;p.flaps=true;}
    if(!p.onGround&&I){const hdgR=I.east?270:90,hd=e.hdg*R2D,want=hdgR+clamp(I.loc*10,-35,35);
      let dh=((want-hd)+540)%360-180;const rollD=clamp(dh*2.5,-30,30)*D2R;p.ctl.roll=clamp((rollD-e.roll)*2.2,-1,1);
      const gam=Math.asin(clamp(p.vel.y/p.V,-1,1))*R2D;let gd=I.gs>2.85?-3-clamp((I.gs-3)*3,-2.5,3):0;if(p.agl<25)gd=-0.4-2.6*p.agl/25;
      const dg=(gam-(p._g??gam))*60;p._g=gam;p.ctl.pitch=clamp((gd-gam)*(p.agl<25?0.5:0.35)-dg*0.12+(p.alpha*R2D>16?-0.2:0),-0.6,0.6);p.ctl.throttle=clamp(0.55+(78-p.V)*0.05,0.15,1.1);if(p.agl<6)p.ctl.throttle=0;
      if(p.gear&&p.agl<400&&p.agl>30){aoa.push(p.alpha*R2D);if(I.dme<6)maxDev=Math.max(maxDev,Math.abs(I.loc));}}
    else if(p.onGround){if(!td)td={x:p.pos.x|0,z:p.pos.z|0,kt:p.V*KT|0,sink:p.touchSink.toFixed(2)};p.ctl.pitch=0;p.ctl.throttle=0;p.ctl.brake=true;p.ctl.roll=0;}
    if(process.env.DBG&&(p.agl<60?Math.abs(t%0.5)<1/60:Math.abs(t%5)<1/60)){const I2=W.ils();console.log(t.toFixed(0),"x",p.pos.x|0,"z",p.pos.z|0,"agl",p.agl|0,"kt",p.V*KT|0,"hdg",(e.hdg*R2D)|0,"roll",(e.roll*R2D)|0,"pitch",(e.pitch*R2D).toFixed(1),I2&&("loc "+I2.loc.toFixed(2)+" gs "+I2.gs.toFixed(2)));}
    W.trigger(false,false,1/60);W.step(1/60);for(const ev of W.events)if(ev.type==='msg')msgs.push((W.time|0)+' '+ev.text.slice(0,45));W.events.length=0;}
  const avg=aoa.length?aoa.reduce((a,b)=>a+b)/aoa.length:0,ok=W.over&&W.over.win;
  console.log(plane,ok?'LESSON PASSED':'FAILED',JSON.stringify(td),'approach AoA',avg.toFixed(1),'max loc dev inside 6nm',maxDev.toFixed(2),W.over&&W.over.title,p.crash||'');
  if(!ok){bad++;console.log(msgs.join('\n'));}}
process.exit(bad?1:0);
