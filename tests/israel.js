/* the real map of Israel: heights at known places, and every mission runs on it */
const fs=require('fs'),R=require('../src/core.js');const b=fs.readFileSync(__dirname+'/../data/israel-dem.bin');
R.setTheatre('israel',new Int16Array(b.buffer,b.byteOffset,b.length/2),process.argv[2]||'ramatdavid');R.buildTerrain();
const at=(la,lo)=>{const q=R.ISR.xy(la,lo);return Math.round(R.terrainH(q.x,q.z));};
console.log('heights: Hermon',at(33.416,35.857),'Meron',at(32.99,35.41),'Jerusalem',at(31.78,35.22),'Dead Sea',at(31.5,35.5),'Kinneret',at(32.8,35.59),'Ramon',at(30.6,34.8),'base',Math.round(R.SITES.base.h));
const run=(W,t,f)=>{for(let i=0;i<t*60&&!W.over;i++){if(f)f();W.step(1/60);}};
for(const m of['strike','intercept','sead','convoy','escort','duel','tanker','train','csar','recon','stealth']){const W=new R.World({mission:m,start:'air',plane:'F15I',wing:true});const p=W.player;
  run(W,240,()=>{p.fuel=8000;R.apSteer(p,R.vnorm(R.v3(1,(6000-p.pos.y)/3000,0)),0.5);});
  const dead=[...W.migs,...W.drones,...W.friends].filter(e=>e.crash&&e.crash!=='shot'&&e.crash!=='rtb').length;
  console.log(m.padEnd(9),'player',p.alive?'ok':p.crash,'| AI that hit the ground',dead,'| over',W.over?W.over.title:'-');}
{const W=new R.World({start:'runway',mission:'intercept'});const p=W.player;run(W,60,()=>{const e=p.euler();p.ctl.throttle=1.3;p.ctl.pitch=p.V>W.vr/R.KT&&e.pitch<10*R.D2R?0.5:0;if(!p.onGround&&p.agl>30)p.gear=false;});console.log('take-off at home ('+R.ISR.home[0]+'): alt',Math.round(p.pos.y),'alive',p.alive);}
// touching down at another base is a landing, not a crash
{const W=new R.World({start:'air',mission:'intercept'});const p=W.player,b=R.ISR.alt[2],h=R.SITES['ab_'+b.id].h;p.pos=R.v3(b.x,h+4,b.z);p.q=R.qeuler(b.hdg,0.05,0);p.vel=R.v3(Math.sin(b.hdg)*75,-1.5,-Math.cos(b.hdg)*75);p.gear=true;p.gearPos=1;
 run(W,20,()=>{p.ctl.throttle=0;p.ctl.brake=p.onGround;});console.log('landing at',b.id,': on ground',p.onGround,'alive',p.alive,p.crash||'');}
console.log('home base',R.ISR.home[0],'alternates',R.ISR.alt.map(a=>a.id).join(' '));
