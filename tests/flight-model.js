const R=require('../src/core.js');const {Aircraft,apSteer,v3,vnorm,D2R,KT,FT,terrainH,buildTerrain,MSL,launchZone,Bomb,World,spiceRange}=R;
buildTerrain();
const stores={storeMass:628+210+3800+300,storeCD:6*0.0005+4*0.0022};
// 1 takeoff
{const a=new Aircraft('F15I',{x:-1240,y:62.4,z:0,hdg:Math.PI/2,gear:true,flaps:true,onGround:true,fuel:8000,throttle:0,...stores});
 a.ctl.throttle=1.3;let lift=null;
 for(let t=0;t<40;t+=1/120){a.ctl.pitch=a.V>77&&a.euler().pitch<10*D2R?0.5:0;if(!a.onGround&&!lift){lift={t,x:a.pos.x+1240,v:a.V*KT};a.gear=false;}a.step(1/120);if(!a.alive)break;}
 console.log('takeoff',lift,'after40s alt',a.pos.y|0,'V kt',a.V*KT|0,'pitch',a.euler().pitch/D2R|0,a.alive,a.crash,'mass',a.mass|0);}
// 2 level speed
function level(alt,thr,st,T=240,type='F15I'){const a=new Aircraft(type,{x:0,y:alt,z:0,hdg:Math.PI/2,speed:250,fuel:5000,throttle:thr,...st});
 for(let t=0;t<T;t+=1/60){const dy=R.clamp((alt-a.pos.y)/800,-0.3,0.3);apSteer(a,vnorm(v3(1,dy,0)));a.ctl.throttle=thr;a.step(1/60);}
 return `alt ${alt} thr ${thr} M ${a.mach.toFixed(2)} kt ${(a.V*KT)|0} alt ${a.pos.y|0} aoa ${(a.alpha/D2R).toFixed(1)} ff ${a.ff.toFixed(2)}`;}
for(const alt of [300,5000,11000])for(const thr of [1,1.3]){console.log('clean',level(alt,thr,{}));console.log('load ',level(alt,thr,stores));}
console.log('mig',level(300,1.3,{},240,'MIG29'),level(11000,1.3,{},240,'MIG29'));
// 3 turn
function turn(alt,v,st){const a=new Aircraft('F15I',{x:0,y:alt,z:0,hdg:0,speed:v,fuel:4000,throttle:1.3,...st});let h0=0,tot=0,gmax=0;let out=[];
 for(let t=0;t<30;t+=1/120){const e=a.euler();a.ctl.roll=R.clamp((80*D2R-e.roll)*3,-1,1);a.ctl.pitch=1;a.ctl.throttle=1.3;
  // hold alt via bank tweak
  a.ctl.roll=R.clamp(((78+R.clamp((a.pos.y-alt)/50,-8,8))*D2R-e.roll)*3,-1,1);
  a.step(1/120);gmax=Math.max(gmax,a.g);if(Math.abs(t-5)<0.005||Math.abs(t-15)<0.005||Math.abs(t-29)<0.005)out.push(`t${t|0} g ${a.g.toFixed(1)} kt ${(a.V*KT)|0} aoa ${(a.alpha/D2R).toFixed(0)} alt ${a.pos.y|0} rate ${(a.g*9.81/a.V/D2R).toFixed(1)}`);}
 return out.join(' | ')+' gmax '+gmax.toFixed(1);}
console.log('turn SL 230',turn(1000,230,{}));console.log('turn 5k 230 load',turn(5000,230,stores));
// 4 missiles
const lz=(spec,alt,vs,vt,R0)=>{const z=launchZone(spec,v3(0,alt,0),v3(vs,0,0),v3(R0,alt,0),v3(vt,0,0));return (z.rmax/1000).toFixed(1)+'km tof@'+R0/1000+'='+z.tof.toFixed(0);};
console.log('AIM120 head-on 10km',lz(MSL.AIM120,10000,280,-250,30000),'tail',lz(MSL.AIM120,10000,280,250,15000),'SL head',lz(MSL.AIM120,500,250,-250,10000),'5km head',lz(MSL.AIM120,5000,270,-51,10000));
console.log('PY5 head 5km',lz(MSL.PYTHON5,5000,250,-250,6000),'tail',lz(MSL.PYTHON5,5000,250,250,4000));
console.log('R27 head 8km',lz(MSL.R27,8000,300,-260,25000),'R73 head',lz(MSL.R73,5000,250,-250,5000));
console.log('SAM vs 9km alt @45km', (()=>{const z=launchZone(MSL.SAM,v3(0,800,0),v3(0,40,0),v3(45000,9000,0),v3(-250,0,0));return z.rmax/1000+' '+z.tof})(), 'outbound',(()=>{const z=launchZone(MSL.SAM,v3(0,800,0),v3(0,40,0),v3(30000,9000,0),v3(280,0,0));return z.rmax/1000+' '+z.tof})());
// 5 bombs
for(const [alt,v,d] of [[9000,260,45000],[9000,260,55000],[6000,250,28000],[6000,250,36000],[3000,240,12000],[3000,240,18000],[9000,300,4000],[1500,250,6000]]){
 const gx=R.SITES.tgt.x,gz=R.SITES.tgt.z,gy=terrainH(gx,gz);const tg={pos:v3(gx,gy,gz)};let res=null;
 const b=new Bomb(null,tg,v3(gx-d,gy+alt,gz),v3(v,0,0));const W={onBomb:b=>res=Math.hypot(b.pos.x-gx,b.pos.z-gz)};
 for(let t=0;t<600&&b.alive;t+=1/60)b.step(1/60,W);
 console.log(`bomb dh ${alt} v ${v} d ${d} pred ${spiceRange(alt,v)|0} miss ${res.toFixed(1)} tof ${b.t|0} impact spd ${R.vlen(b.vel)|0} ang ${(Math.asin(b.vel.y/R.vlen(b.vel))/D2R)|0}`);}
