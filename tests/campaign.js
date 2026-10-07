/* second theatre, SEAD with anti-radar missiles, the convoy, number two and the new enemy types */
const R=require('../src/core.js');if(process.argv[2]==='north')R.setTheatre('north');
const {World,apSteer,vsub,vadd,vnorm,vlen,v3,vdist,MSL,terrainH}=R;
const run=(W,t,f)=>{for(let i=0;i<t*60&&!W.over;i++){if(f)f(i/60);W.step(1/60);}};
const msgs=W=>{const a=[];return{a,pump(){for(const e of W.events)if(e.type==='msg')a.push(Math.round(W.time)+' '+e.text.slice(0,46));W.events.length=0;}};};
R.buildTerrain();console.log('theatre',R.THEATRE.id,'target',R.SITES.tgt.x,R.SITES.tgt.z,'h',Math.round(R.SITES.tgt.h||0));
{let mx=0,sea=0,n=0;for(let x=-60000;x<230000;x+=3000)for(let z=-80000;z<80000;z+=3000){const h=terrainH(x,z);mx=Math.max(mx,h);if(h<1)sea++;n++;}console.log(' terrain max',Math.round(mx),'sea share',(sea/n).toFixed(2),'base h',Math.round(terrainH(0,0)));}
// strike take-off and climb in this theatre, wingman joins
{const W=new World({plane:'F15I',start:'runway',mission:'strike',wing:true});const p=W.player,w=W.wing.ac;let dmin=1e9;
  run(W,200,(t)=>{const e=p.euler();p.ctl.throttle=p.pos.y>2500?0.8:1.3;if(p.onGround||p.agl<300)p.ctl.pitch=p.V>82&&e.pitch<10*R.D2R?0.5:0;else apSteer(p,v3(1,(3000-p.pos.y)/3000,0),0.5);if(!p.onGround&&p.agl>30)p.gear=false;if(t>150)dmin=Math.min(dmin,vdist(w.pos,p.pos));});
  console.log(' takeoff alive',p.alive,'alt',Math.round(p.pos.y),'| wingman alive',w.alive,'distance to leader',Math.round(vdist(w.pos,p.pos)),'closest',Math.round(dmin));}
// SEAD: fly at the long-range site, shoot when it emits
{const W=new World({plane:'F16I',start:'air',mission:'sead',wing:false,diff:'easy'});const p=W.player,M=msgs(W);W.select('SPICE');let shots=0,cd=0;
  run(W,1500,()=>{M.pump();p.fuel=4000;const g=W.gtgt||(W.cycleTarget(),W.gtgt);if(!g)return;const r=vsub(g.pos,p.pos),d=vnorm(v3(r.x,0,r.z)),away=cd>0&&cd<70;
    apSteer(p,v3(away?-d.x:d.x,(8500-p.pos.y)/4000,away?-d.z:d.z),0.7);p.ctl.throttle=1;W.arm=true;cd-=1/60;
    const b=W.bombSol();if(b&&b.ok&&cd<=0&&W.w.spice>0){W.trigger(false,true,1/60);shots++;cd=75;}if(W.mwarn)W.dispense(p);});
  console.log(' SEAD',W.plane.bomb.name,'shots',shots,'->',W.over&&W.over.title,'| radars left',W.ground.filter(g=>g.primary&&g.alive).length,'alive',p.alive,'t',Math.round(W.time));console.log('  '+M.a.slice(0,7).join('\n  '));}
// convoy: trucks move, and a strafing pass from behind destroys them
{const W=new World({plane:'F15C',start:'air',mission:'convoy'});const p=W.player,g=W.ground[0],x0=g.pos.x;W.ground[6].alive=false;run(W,10);const moved=Math.round(x0-g.pos.x);
  p.pos=v3(g.pos.x+900,terrainH(g.pos.x+900,g.pos.z)+220,g.pos.z);const d=vnorm(vsub(vadd(g.pos,v3(-12,3,0)),p.pos));p.q=R.qeuler(Math.atan2(d.x,-d.z),Math.asin(d.y),0);p.vel=R.vmul(d,150);W.select('GUN');W.arm=true;
  for(let i=0;i<100&&p.alive;i++){W.trigger(true,false,1/60);W.step(1/60);}console.log(' convoy: moved',moved,'m in 10 s | strafing pass destroyed',W.stats.tgt,'trucks, rounds used',940-W.w.gun);}
// number two attacks on order and by himself
{const W=new World({plane:'F15I',start:'air',mission:'duel',foe:'su27',wing:true});const p=W.player,M=msgs(W);let ord=false;
  run(W,400,()=>{M.pump();p.fuel=7000;p.hp=p.hpMax;apSteer(p,v3(-1,0.02,0.2),0.5);if(!ord&&W.time>3){ord=true;W.wingCmd('cover');}if(W.mwarn)W.dispense(p);});
  console.log(' duel vs',W.foeName,'x',W.migs.length,'with number two on free hunt: enemy alive',W.migs.filter(m=>m.alive).length,'| wingman missiles left',W.wing.aim120,W.wing.python,'|',W.over&&W.over.title);console.log('  '+M.a.slice(0,8).join('\n  '));}
{const W=new World({plane:'F15I',start:'air',mission:'duel',foe:'mig21'});console.log(' foe mig21:',W.migs.length,W.migs[0].type,'r27',W.migAI[0].r27,'| campaign strike without SAM:',new World({mission:'strike',noSam:true}).sams[0].alive);}
// escort: left alone the strike pair is attacked; with the fighters removed it bombs the target
for(const guard of [false,true]){const W=new World({plane:'F15C',start:'air',mission:'escort',wing:false});const p=W.player,M=msgs(W);
  run(W,1500,()=>{M.pump();p.fuel=5000;p.hp=p.hpMax;apSteer(p,v3(guard?1:-1,(6000-p.pos.y)/3000,0),0.4);if(guard&&W.migsActive)for(const m of W.migs)if(m.alive&&Math.random()<0.002)W.killAir(m);});
  console.log(' escort',guard?'(enemy fighters removed)':'(pair left alone)','->',W.over&&W.over.title,'|',W.over&&W.over.reason,'t',Math.round(W.time));if(!guard)console.log('  '+M.a.slice(0,6).join('\n  '));}
// the enemy now also goes for number two, who can be shot down
{const W=new World({plane:'F15I',start:'air',mission:'duel',foe:'su27',wing:true});const p=W.player;let tg=0;
  run(W,300,()=>{p.fuel=7000;p.hp=p.hpMax;apSteer(p,v3(-1,0.02,0.4),0.5);W.over=null;if(W.migAI.some(a=>a.tgt===W.wing.ac))tg++;});
  console.log(' wingman targeted by the enemy for',Math.round(tg/60),'s | hits taken',W.wing.ac.hits||0,'alive',W.wing.ac.alive);}
