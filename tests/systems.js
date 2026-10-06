// Cold start, switches, battle damage, radar modes and boom refuelling.
const R=require('../src/core.js');const {World,v3,vadd,vmul,qrot,vdist,KT,D2R}=R;
const run=(W,sec,fn)=>{for(let t=0;t<sec;t+=1/60){if(fn)fn(t);W.step(1/60);}};
for(const plane of['F15I','F16I']){const W=new World({start:'cold',plane}),p=W.player,log=[];
  console.log(plane,'cold: power',W.power,'thrust factor after 2s at full throttle:',(run(W,2,()=>{p.ctl.throttle=1}),p.thrust|0),'| eng before JFS:',W.sw('eng0'),'| radar before engine:',W.sw('radar'));
  W.events.length=0;W.autoStart=true;let done=null;run(W,90,t=>{p.ctl.throttle=0;if(!done&&W.flags.ready)done=t.toFixed(0);});
  console.log('  auto start ready after',done,'s | checklist',W.checklist().map(c=>c.done?'+':'-').join(''),'| rpm',p.rpm.join(','),'jfsOn',W.sys.jfsOn,'radarOn',W.radarOn,'moved',vdist(p.pos,v3(R.PARK.x,p.pos.y,R.PARK.z)).toFixed(1));
  // taxi north to the runway, turn onto heading 090, take off
  let phase=0;run(W,150,()=>{const e=p.euler();p.ctl.brake=false;
    if(phase===0){p.ctl.throttle=p.V<12?0.3:0.05;p.ctl.yaw=0;if(p.pos.z<45)phase=1;}
    else if(phase===1){p.ctl.throttle=p.V<8?0.3:0.02;p.ctl.yaw=1;if(e.hdg>88*D2R&&e.hdg<200*D2R){phase=2;}}
    else{p.ctl.yaw=R.clamp((Math.PI/2-e.hdg)*3-p.pos.z*0.01,-1,1)*(p.onGround?1:0);p.ctl.throttle=1.3;p.ctl.pitch=p.V>82&&e.pitch<10*D2R?0.5:0;if(!p.onGround&&p.agl>30)p.gear=false;}});
  console.log('  taxi+takeoff: alive',p.alive,p.crash||'','alt',p.pos.y|0,'kt',p.V*KT|0,'z',p.pos.z|0,'hdg',(p.euler().hdg/D2R)|0,'arm',W.arm);}
{let died=0,sys={};for(let n=0;n<400;n++){const W=new World({start:'air'});W.hurt('msl','R-27R');if(!W.player.alive)died++;else for(const d of W.dmg)sys[d.t]=(sys[d.t]||0)+1;}
 console.log('400 missile hits (normal): destroyed',died,'| damage seen',JSON.stringify(sys));}
{const W=new World({start:'air'}),p=W.player;p.engOK[0]=0;p.rpm[0]=0;W.syncDmg();run(W,30,()=>{p.ctl.throttle=1.3;});const one=p.thrust;const W2=new World({start:'air'});run(W2,30,()=>{W2.player.ctl.throttle=1.3;});
 p.fire[1]=true;W.syncDmg();const hp0=p.hp;run(W,5);const burn=hp0-p.hp;W.sw('fire1');const hp1=p.hp;run(W,5);
 console.log('one engine out: thrust',(one/W2.player.thrust).toFixed(2),'of normal | fire drains',burn.toFixed(1),'hp in 5s, after handle',(hp1-p.hp).toFixed(1),'| dmg',W.dmg.map(d=>d.t).join(', '));}
{const W=new World({start:'air'}),p=W.player,k=W.tanker;run(W,1);
 console.log('radar: contacts',W.contacts.map(c=>c.id).join(','),'| mode',W.radar.mode,W.radar.rng);W.sw('rmode');W.sw('rrng');run(W,1);console.log('  ACM contacts',W.contacts.length,'rng',W.radar.rng);W.sys.radar=false;run(W,1);console.log('  radar off contacts',W.contacts.length);}
for(const diff of['normal','hard']){const W=new World({mission:'tanker',diff}),p=W.player,k=W.tanker;const f0=p.fuel;
  // put the jet at the contact point, matched to the tanker, door open
  const cp=vadd(k.pos,qrot(k.q,v3(0,-7.5,30)));p.pos=vadd(cp,v3(-1.5,0.5,1));p.vel={...k.vel};p.q=R.qeuler(Math.PI/2,0.07,0);W.sw('ardoor');
  // a simple pilot: hold height with pitch, hold station with throttle
  run(W,60,()=>{const a=W.ar.rel;p.ctl.pitch=R.clamp(-a.y*0.05-p.vel.y*0.08,-0.3,0.3);p.ctl.roll=R.clamp(-p.euler().roll*2-a.x*0.01,-0.5,0.5);p.ctl.throttle=R.clamp(0.6+a.z*0.04+(k.spd-p.V)*0.05,0.2,1.2);});
  console.log('tanker',diff,': state',W.ar.state,'taken',W.ar.taken|0,'fuel',f0|0,'->',p.fuel|0,'rel',[W.ar.rel.x,W.ar.rel.y,W.ar.rel.z].map(v=>v.toFixed(1)).join(','),'alive',p.alive,p.crash||'');
  if(W.ar.taken>1500){W.sw('ardoor');run(W,4,()=>{p.ctl.throttle=0.4;});console.log('  after disconnect:',W.over&&W.over.title);}}
{const W=new World({mission:'tanker'}),p=W.player;W.lock=W.tanker;W.arm=true;W.w.sel='AIM120';W.trigger(false,true,1/60);console.log('pickle on friendly:',W.events.filter(e=>e.type==='iff').length?'refused (IFF)':'LAUNCHED',W.missiles.length);}
