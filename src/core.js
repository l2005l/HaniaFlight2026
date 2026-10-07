'use strict';
/* ===== RAAM core: math, atmosphere, terrain, flight model, weapons, AI, mission ===== */
const G0=9.80665,D2R=Math.PI/180,R2D=180/Math.PI,KT=1.94384,FT=3.28084,NM=1852;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(x,a,b)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const v3=(x=0,y=0,z=0)=>({x,y,z});
const vadd=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const vsub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const vmul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
const vdot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const vcross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const vlen=a=>Math.sqrt(a.x*a.x+a.y*a.y+a.z*a.z);
const vnorm=a=>{const l=vlen(a)||1;return{x:a.x/l,y:a.y/l,z:a.z/l};};
const vdist=(a,b)=>Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2);
const qmul=(a,b)=>({x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z});
const qrot=(q,v)=>{const x=v.x,y=v.y,z=v.z,qx=q.x,qy=q.y,qz=q.z,qw=q.w;
  const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;
  return{x:ix*qw-iw*qx-iy*qz+iz*qy,y:iy*qw-iw*qy-iz*qx+ix*qz,z:iz*qw-iw*qz-ix*qy+iy*qx};};
const qrotInv=(q,v)=>qrot({x:-q.x,y:-q.y,z:-q.z,w:q.w},v);
const qaxis=(x,y,z,a)=>{const s=Math.sin(a/2);return{x:x*s,y:y*s,z:z*s,w:Math.cos(a/2)};};
/* body axes: forward -Z, right +X, up +Y. heading 0 = north (-Z), 90deg = east (+X) */
const qeuler=(h,p,r)=>qmul(qmul(qaxis(0,1,0,-h),qaxis(1,0,0,p)),qaxis(0,0,1,-r));
const FWD=v3(0,0,-1),UP=v3(0,1,0),RIGHT=v3(1,0,0);

function atmo(h){h=clamp(h,0,26000);let T,p;
  if(h<11000){T=288.15-0.0065*h;p=101325*Math.pow(T/288.15,5.2559);}
  else{T=216.65;p=22632*Math.exp(-(h-11000)/6341.6);}
  return{rho:p/(287.05*T),a:Math.sqrt(401.87*T)};}

/* ---------- terrain ---------- */
const TER={x0:-70000,z0:-90000,cell:600,nx:521,nz:301,h:null};
const SITES={base:{x:0,z:0,r:4500},tgt:{x:126000,z:9000,r:2600},sam:{x:112000,z:-3000,r:1300}};
const RWY={x1:-1350,x2:1350,half:30},PARK={x:-320,z:474};   /* inside a hardened shelter on the apron, facing north */
/* two theatres share the code: the southern desert and a greener, steeper north with the target much closer */
const THEATRE={id:'south',base:'חצרים',cap:[40000,0],ipOff:[-64000,-5000],migOff:[32000,9000],duelX:66000};
function setTheatre(id){if(TER.h||id!=='north')return;Object.assign(THEATRE,{id:'north',base:'רמת דוד',cap:[34000,-4000],ipOff:[-50000,8000],migOff:[26000,-14000],duelX:60000});
  Object.assign(SITES.tgt,{x:106000,z:-26000});Object.assign(SITES.sam,{x:93000,z:-15000});}
function hash2(i,j){const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n);}
function vnoise(x,z){const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),w=fz*fz*(3-2*fz);
  return lerp(lerp(hash2(i,j),hash2(i+1,j),u),lerp(hash2(i,j+1),hash2(i+1,j+1),u),w);}
function fbm(x,z){let a=1,f=1,s=0,t=0;for(let o=0;o<5;o++){s+=a*vnoise(x*f,z*f);t+=a;a*=0.5;f*=2.03;}return s/t;}
function rawH(x,z){
  if(THEATRE.id==='north'){const coast=-11000+5200*(fbm(z/26000+8.3,1.5)*2-1),d=x-coast,n=fbm(x/19000+53.1,z/19000+17.7),r=1-Math.abs(2*fbm(x/8000+31.3,z/8000+25.9)-1),e=sstep(x,7000,52000),v=sstep(Math.abs(z+10000-x*0.2),2500,14000);
    let h=30+130*n+e*(250+1900*n*n*(0.45+r))*(0.25+0.75*v);const rr=1-Math.abs(2*fbm(x/4300+14.4,z/4300+39.1)-1);h+=e*700*rr*rr*(0.3+n)*(0.3+0.7*v);h+=36*(fbm(x/2300+9,z/2300)-0.5)*(1+e*3);
    return lerp(-40,h,sstep(d,-500,4500));}
  const coast=-16000+4500*(fbm(z/30000+2.3,5.5)*2-1),d=x-coast;
  const n=fbm(x/24000+3.1,z/24000+7.7),r=1-Math.abs(2*fbm(x/11000+11.3,z/11000+5.9)-1);
  const e=sstep(x,30000,95000);
  let h=45+90*n+e*(350+1500*n*n*(0.4+r));
  const rr=1-Math.abs(2*fbm(x/5200+4.4,z/5200+9.1)-1);h+=e*620*rr*rr*(0.35+n);
  h+=30*(fbm(x/2500,z/2500)-0.5)*(1+e*3);
  return lerp(-40,h,sstep(d,-500,5000));}
/* built in slices so a page can stay responsive while it loads; each yield reports progress 0..1 */
function* terrainSteps(){if(TER.h)return;const{nx,nz,cell,x0,z0}=TER,h=new Float32Array(nx*nz);
  for(let j=0;j<nz;j++){for(let i=0;i<nx;i++)h[j*nx+i]=rawH(x0+i*cell,z0+j*cell);if(j%12===11)yield j/nz;}
  for(const k in SITES){const s=SITES[k],hc=k==='base'?60:rawH(s.x,s.z);s.h=hc;
    const n=Math.ceil(s.r*2/cell)+1,ci=Math.round((s.x-x0)/cell),cj=Math.round((s.z-z0)/cell);
    for(let j=cj-n;j<=cj+n;j++)for(let i=ci-n;i<=ci+n;i++){if(i<0||j<0||i>=nx||j>=nz)continue;
      const dd=Math.hypot(x0+i*cell-s.x,z0+j*cell-s.z);h[j*nx+i]=lerp(hc,h[j*nx+i],sstep(dd,s.r,s.r*2));}}
  TER.h=h;}
function buildTerrain(){for(const p of terrainSteps());}
function terrainH(x,z){const{nx,nz,cell,x0,z0,h}=TER;
  let fx=clamp((x-x0)/cell,0,nx-1.001),fz=clamp((z-z0)/cell,0,nz-1.001);const i=fx|0,j=fz|0;fx-=i;fz-=j;const k=j*nx+i;
  const v=lerp(lerp(h[k],h[k+1],fx),lerp(h[k+nx],h[k+nx+1],fx),fz);return v>0?v:0;}

/* ---------- aircraft ---------- */
const TYPES={
  F15I:{name:'F-15I',S:56.5,mEmpty:15400,fuelMax:10200,Tmil:158e3,Tab:259e3,CLa:3.6,aStall:30*D2R,CD0:0.0225,K:0.13,nMax:9,gearH:2.4,pMax:4.0,rcs:10,hp:100},
  F16I:{name:'F-16I',S:27.87,mEmpty:10200,fuelMax:5400,Tmil:79e3,Tab:129.7e3,CLa:4.1,aStall:27*D2R,CD0:0.0235,K:0.117,nMax:9,gearH:1.9,pMax:5.0,rcs:4,hp:80,engines:1},
  F35I:{name:'F-35I',S:42.7,mEmpty:13300,fuelMax:8300,Tmil:125e3,Tab:191e3,CLa:3.7,aStall:32*D2R,CD0:0.0215,K:0.125,nMax:9,gearH:1.9,pMax:4.2,rcs:0.01,hp:90,engines:1},
  F15C:{name:'F-15C',S:56.5,mEmpty:12700,fuelMax:6100,Tmil:130e3,Tab:211e3,CLa:3.6,aStall:30*D2R,CD0:0.0215,K:0.13,nMax:9,gearH:2.4,pMax:4.4,rcs:10,hp:100},
  SU27:{name:'Su-27',S:62,mEmpty:16400,fuelMax:9400,Tmil:152e3,Tab:245e3,CLa:3.6,aStall:30*D2R,CD0:0.022,K:0.125,nMax:9,gearH:2.2,pMax:3.8,rcs:12,hp:80},
  MIG21:{name:'MiG-21',S:23,mEmpty:5900,fuelMax:2300,Tmil:40e3,Tab:70e3,CLa:3.0,aStall:25*D2R,CD0:0.022,K:0.21,nMax:7.5,gearH:1.7,pMax:3.6,rcs:3,hp:40,engines:1},
  MIG29:{name:'MiG-29',S:38,mEmpty:11600,fuelMax:3400,Tmil:100e3,Tab:162e3,CLa:3.5,aStall:28*D2R,CD0:0.023,K:0.14,nMax:8.5,gearH:1.9,pMax:4.2,rcs:5,hp:60}};
function clCurve(a,t){const s=a<0?-0.75:1,x=Math.abs(a),as=t.aStall,a1=as*0.75;let cl;
  if(x<=a1)cl=t.CLa*x;
  else if(x<=as){const d=x-a1;cl=t.CLa*a1+t.CLa*d-t.CLa*d*d/(2*(as-a1));}
  else cl=lerp(t.CLa*a1+0.5*t.CLa*(as-a1),1.05*Math.sin(2*x),sstep(x,as,as+0.2));
  return s*cl;}
class Aircraft{
  constructor(type,o){this.t=TYPES[type];this.type=this.t.name;this.kind='air';this.side=o.side||0;
    this.pos=v3(o.x,o.y,o.z);this.q=qeuler(o.hdg||0,o.pitch||0,0);this.vel=vmul(qrot(this.q,FWD),o.speed||0);
    this.om={p:0,q:0,r:0};this.fuel=o.fuel??this.t.fuelMax*0.8;this.storeMass=o.storeMass||0;this.storeCD=o.storeCD||0;
    this.ctl={pitch:0,roll:0,yaw:0,throttle:o.throttle??0.8,brake:false};this.eng=this.ctl.throttle;
    this.gear=!!o.gear;this.gearPos=this.gear?1:0;this.flaps=!!o.flaps;this.brakePos=0;this.onGround=!!o.onGround;
    /* per-engine state: rpm 0..1 (1 = running), engOK 1 healthy / 0.5 degraded / 0 dead; plus leak, hydraulics, fire */
    this.nEng=this.t.engines||2;this.rpm=Array(this.nEng).fill(1);this.engOK=Array(this.nEng).fill(1);this.fire=Array(this.nEng).fill(false);this.leak=0;this.hyd=1;this.extraCD=0;
    this.alive=true;this.hp=this.t.hp;this.rcs=this.t.rcs;this.g=1;this.alpha=0;this.beta=0;this.mach=0;this.V=o.speed||0;
    this.time=0;this.crash=null;this.agl=1000;this.ff=0;this.thrust=0;this.touchSink=0;this.wasAir=!this.onGround;this.lastCM=-99;}
  get mass(){return this.t.mEmpty+this.fuel+this.storeMass;}
  euler(){const f=qrot(this.q,FWD),r=qrot(this.q,RIGHT),u=qrot(this.q,UP);
    return{hdg:(Math.atan2(f.x,-f.z)+2*Math.PI)%(2*Math.PI),pitch:Math.asin(clamp(f.y,-1,1)),roll:Math.atan2(-r.y,u.y)};}
  die(why){if(!this.alive)return;this.alive=false;this.crash=why;}
  step(dt){
    if(!this.alive)return;const t=this.t,c=this.ctl;this.time+=dt;
    const fwd=qrot(this.q,FWD),up=qrot(this.q,UP),rt=qrot(this.q,RIGHT);
    const wk=this.wind?sstep(this.agl??99,2,40):0,va=wk?vsub(this.vel,vmul(this.wind,wk)):this.vel,at=atmo(this.pos.y),V=vlen(va),mach=V/at.a,qbar=0.5*at.rho*V*V,m=this.mass;
    /* engines */
    let tf=0,af=0;for(let i=0;i<this.nEng;i++)if(this.rpm[i]>=0.98){tf+=this.engOK[i];if(this.engOK[i]===1)af++;}tf/=this.nEng;af/=this.nEng;
    const lever=this.fuel>0&&tf>0?clamp(c.throttle,0,1.3):0;
    this.eng+=clamp(lever-this.eng,-dt*0.8,dt*0.6);
    const sig=Math.pow(at.rho/1.225,0.72);
    const Tm=t.Tmil*sig*(1-0.25*mach+0.13*mach*mach);
    let Ta=t.Tab*sig*(1+0.2*mach*mach);if(mach>2.2)Ta*=Math.max(0.3,1-(mach-2.2)*1.5);
    const mil=Math.min(this.eng,1),ab=clamp((this.eng-1)/0.3,0,1);
    const dAB=(Math.max(Ta,Tm)-Tm)*ab*af;
    const T=this.fuel>0?Tm*(0.025+0.975*mil)*tf+dAB:0;
    const ff=this.fuel>0&&tf>0?Math.max(0.22,Tm*mil*2.15e-5)*tf+(dAB>0?dAB*9e-5+ab*af:0):0;
    this.fuel=Math.max(0,this.fuel-(ff+this.leak)*dt);this.ff=ff;this.thrust=T;this.tf=tf;
    /* animate gear / brake */
    this.gearPos=clamp(this.gearPos+(this.gear?dt:-dt)/(this.hyd<1?8:3),0,1);
    this.brakePos=clamp(this.brakePos+(c.brake&&this.hyd>=1?dt:-dt)*2,0,1);
    /* aero angles */
    const vb=qrotInv(this.q,va);let alpha=0,beta=0;
    if(V>2){alpha=Math.atan2(-vb.y,-vb.z);beta=Math.asin(clamp(vb.x/V,-1,1));}
    const xa=Math.abs(alpha),a1=t.aStall*0.75;
    const fm=mach<0.9?1:mach<1.5?lerp(1,0.72,(mach-0.9)/0.6):lerp(0.72,0.5,clamp(mach-1.5,0,1));
    const cl=clCurve(alpha,t)*fm+(this.flaps?0.3*Math.cos(alpha):0);
    const wave=mach<0.85?0:mach<1.05?0.031*(mach-0.85)/0.2:lerp(0.031,0.018,clamp((mach-1.05)/1.4,0,1));
    const K=mach<0.9?t.K:lerp(t.K,0.36,clamp((mach-0.9)/1.3,0,1));
    const cd=t.CD0+this.storeCD+wave+K*cl*cl+this.gearPos*0.022+(this.flaps?0.035:0)+this.brakePos*0.07+this.extraCD+1.3*Math.sin(xa)**2*sstep(xa,a1,a1+0.25);
    const vhat=V>0.5?vmul(va,1/V):fwd;
    let ld=vcross(rt,vhat);const ll=vlen(ld);ld=ll>1e-4?vmul(ld,1/ll):up;
    const qS=qbar*t.S;
    let F=vmul(ld,qS*cl);F=vadd(F,vmul(vhat,-qS*cd));F=vadd(F,vmul(rt,-qS*1.1*clamp(beta,-0.6,0.6)));F=vadd(F,vmul(fwd,T));
    const nz=vdot(F,up)/(m*G0);
    /* control augmentation: stick commands pitch rate, limited by g and alpha */
    const A=clamp(qbar/5000,0,1)*(this.onGround?sstep(V,45,70):1);
    const Vc=Math.max(V,40),s=clamp(c.pitch,-1,1)*(0.6+0.4*this.hyd);
    let qc=s>=0?s*Math.min(0.5,(t.nMax-1)*G0/Vc*1.15+0.03):s*Math.min(0.35,4*G0/Vc);
    const dadn=m*G0/Math.max(1e3,t.CLa*fm*qS),qfp=(nz*G0-G0*up.y)/Vc,aLim=t.aStall-2*D2R;
    if(!this.onGround){
      qc=Math.min(qc,qfp+4*dadn*(t.nMax-nz),qfp+2.5*(aLim-alpha));
      qc=Math.max(qc,qfp+4*dadn*(-3-nz),qfp+2.5*(-0.26-alpha));}
    let qt=A*qc+(1-A)*clamp(-1.2*alpha,-0.6,0.6);
    if(xa>t.aStall)qt-=Math.sign(alpha)*(xa-t.aStall);
    const pmax=t.pMax*clamp(qbar/14000,0.12,1)*(1-0.55*clamp(xa/0.5,0,1))*(0.5+0.5*this.hyd);
    let pt=clamp(c.roll,-1,1)*pmax;
    if(xa>t.aStall&&!this.onGround)pt+=Math.sin(this.time*2.7)*0.5*clamp((xa-t.aStall)*6,0,1);
    const rtg=clamp(c.yaw,-1,1)*0.3*A+3*beta*clamp(qbar/4000,0,1.3);
    this.om.q+=(qt-this.om.q)*Math.min(1,dt/(0.16/Math.max(A,0.3)));
    this.om.p+=(pt-this.om.p)*Math.min(1,dt/0.22);
    this.om.r+=(rtg-this.om.r)*Math.min(1,dt/0.25);
    /* integrate */
    const acc=vmul(F,1/m);acc.y-=G0;
    let normal=0;
    if(this.onGround&&acc.y<0){normal=-acc.y;acc.y=0;}
    this.vel=vadd(this.vel,vmul(acc,dt));this.pos=vadd(this.pos,vmul(this.vel,dt));
    const w={x:this.om.q,y:-this.om.r,z:-this.om.p,w:0},dq=qmul(this.q,w),q=this.q;
    let nq={x:q.x+dq.x*0.5*dt,y:q.y+dq.y*0.5*dt,z:q.z+dq.z*0.5*dt,w:q.w+dq.w*0.5*dt};
    const nl=Math.hypot(nq.x,nq.y,nq.z,nq.w);this.q={x:nq.x/nl,y:nq.y/nl,z:nq.z/nl,w:nq.w/nl};
    /* ground contact */
    const gh=terrainH(this.pos.x,this.pos.z),ch=this.gearPos>0.9?t.gearH:1.0;this.agl=this.pos.y-gh;
    if(this.agl<=ch){
      if(!this.onGround){const sink=-this.vel.y,e=this.euler(),nearBase=Math.hypot(this.pos.x-SITES.base.x,this.pos.z-SITES.base.z)<SITES.base.r;
        if(!nearBase)this.die('התרסקות בקרקע');
        else if(this.gearPos<0.9)this.die('נגיעה בקרקע עם כן נסע מקופל');
        else if(sink>6.5)this.die('נחיתה קשה מדי — שיעור שקיעה גבוה');
        else if(Math.abs(e.roll)>0.26||e.pitch<-0.07||e.pitch>0.32)this.die('נגיעה בקרקע בזווית לא תקינה');
        else{this.onGround=true;this.touchSink=sink;}}
      if(this.alive){this.pos.y=gh+ch;if(this.vel.y<0)this.vel.y=0;}
    }else if(this.agl>ch+0.2){if(this.onGround)this.wasAir=true;this.onGround=false;}
    if(this.onGround&&this.alive){
      const e=this.euler();let p=clamp(e.pitch,0,0.25);
      if((p<=0&&this.om.q<0)||(p>=0.25&&this.om.q>0))this.om.q=0;
      const h=e.hdg+clamp(c.yaw,-1,1)*0.5*clamp(V/6,0,1)/(1+V/35)*dt;
      this.q=qeuler(h,p,0);this.om.p=0;this.om.r=0;
      const fh=v3(Math.sin(h),0,-Math.cos(h));let vf=vdot(this.vel,fh);
      const mu=0.03+(c.brake?0.45:0),dec=mu*Math.max(normal,0)*dt;
      vf=Math.abs(vf)<=dec?0:vf-Math.sign(vf)*dec;
      this.vel=v3(fh.x*vf,Math.max(this.vel.y,0),fh.z*vf);}
    this.g=this.onGround?nz+normal/G0:nz;this.alpha=alpha;this.beta=beta;this.mach=mach;this.V=V;this.qbar=qbar;this.rho=at.rho;
  }
}
/* autopilot: steer nose toward a world direction */
function apSteer(ac,dir,maxPull=0.85){
  const d=qrotInv(ac.q,dir),ang=Math.acos(clamp(-d.z,-1,1)),c=ac.ctl;
  if(ang<0.14){const e=ac.euler();c.roll=clamp((clamp(d.x*5,-1,1)-e.roll)*2,-1,1);c.pitch=clamp(d.y*6,-0.6,maxPull);c.yaw=clamp(d.x*3,-1,1);}
  else{const re=Math.atan2(d.x,d.y);c.roll=clamp(re*2.5,-1,1);c.yaw=0;
    c.pitch=Math.abs(re)<1.1?clamp(ang*2.5,0,maxPull)*Math.cos(re):Math.abs(re)>2.7&&ang<0.5?-0.25:0.03;}
}

/* ---------- missiles ---------- */
const MSL={
  AIM120:{name:'AIM-120C',mass:157,burn:8,dv:1050,kd:6.5e-5,gmax:32,N:4,seeker:'arh',active:16000,gimbal:65*D2R,life:95,lethal:9,cl:9e-4},
  PYTHON5:{name:'PYTHON-5',mass:105,burn:4.5,dv:720,kd:1.3e-4,gmax:50,N:4.5,seeker:'ir',gimbal:90*D2R,life:40,lethal:8,cl:1.4e-3},
  R27:{name:'R-27R',mass:253,burn:7,dv:900,kd:8e-5,gmax:22,N:4,seeker:'sarh',gimbal:55*D2R,life:70,lethal:10,cl:8e-4},
  R73:{name:'R-73',mass:105,burn:4,dv:650,kd:1.5e-4,gmax:40,N:4,seeker:'ir',gimbal:75*D2R,life:30,lethal:7,cl:1.2e-3},
  ARM:{name:'AGM-88',mass:360,burn:14,dv:1300,kd:4.2e-5,gmax:18,N:3.5,seeker:'arm',gimbal:2.6,life:170,lethal:16,cl:8e-4},
  SAM:{name:'SAM',mass:700,burn:9,dv:1150,kd:3.4e-5,gmax:22,N:4,seeker:'cmd',gimbal:4,life:75,lethal:16,cl:7e-4}};
class Missile{
  constructor(spec,owner,target,pos,vel){this.s=spec;this.owner=owner;this.target=target;this.pos={...pos};this.vel={...vel};this.t=0;this.alive=true;
    this.kind='msl';this.side=owner?owner.side:0;this.decoy=null;this.est=target?{p:target.pos,v:target.vel}:null;
    this.active=spec.seeker==='ir';this.lost=false;this.result=null;this.noSup=0;this.burning=true;}
  step(dt,W){
    const s=this.s;this.t+=dt;const at=atmo(this.pos.y),sp=vlen(this.vel),vh=vmul(this.vel,1/sp);
    let tp=null,tv=null;const T=this.target;
    if(this.decoy){const d=this.decoy;d.pos=vadd(d.pos,vmul(d.vel,dt));d.vel.y-=3*dt;tp=d.pos;tv=d.vel;}
    else if(T&&T.alive&&!this.lost){
      const r=vsub(T.pos,this.pos),R=vlen(r),off=Math.acos(clamp(vdot(r,vh)/R,-1,1));
      if(s.seeker==='arh'){
        if(!this.active&&R<s.active&&off<s.gimbal)this.active=true;
        if(this.active){if(off>s.gimbal)this.lost=true;else this.est={p:T.pos,v:T.vel};}
        else if(W.supports(this.owner,T))this.est={p:T.pos,v:T.vel};
        else this.est={p:vadd(this.est.p,vmul(this.est.v,dt)),v:this.est.v};
        if(!this.lost){tp=this.est.p;tv=this.est.v;}
      }else if(s.seeker==='arm'){tp=T.pos;tv=T.vel;
      }else if(s.seeker==='ir'){if(this.t>0.6&&(off>s.gimbal||!W.los(this.pos,T.pos)))this.lost=true;else{tp=T.pos;tv=T.vel;}}
      else{if(!W.supports(this.owner,T)){this.noSup+=dt;if(this.noSup>3)this.lost=true;}else this.noSup=0;
        if(this.t>1&&off>s.gimbal)this.lost=true;
        if(!this.lost&&this.noSup===0){tp=T.pos;tv=T.vel;}}
    }
    let aCmd=v3();
    if(tp){
      const r=vsub(tp,this.pos),vr=vsub(tv,this.vel),R2=vdot(r,r);
      if(!this.decoy){const tc=-vdot(r,vr)/Math.max(1,vdot(vr,vr));
        const dm=tc>=0&&tc<=dt?vlen(vadd(r,vmul(vr,tc))):Math.sqrt(R2);
        if(dm<s.lethal&&T&&T.alive){this.alive=false;this.result='hit';this.pos=vadd(this.pos,vmul(this.vel,clamp(tc,0,dt)));if(W.onHit)W.onHit(this,T);return;}}
      if(this.t>0.5){aCmd=vmul(vcross(vmul(vcross(r,vr),1/R2),this.vel),s.N);
        aCmd=vadd(aCmd,vsub(v3(0,G0,0),vmul(vh,vh.y*G0)));}
    }
    const aAvail=Math.min(s.gmax*G0,s.cl*at.rho*sp*sp);let al=vlen(aCmd);
    if(al>aAvail){aCmd=vmul(aCmd,aAvail/al);al=aAvail;}
    this.burning=this.t<s.burn;
    const ax=(this.burning?s.dv/s.burn:0)-s.kd*at.rho*sp*sp-al*0.3*(al/Math.max(aAvail,1));
    const acc=vadd(aCmd,vmul(vh,ax));acc.y-=G0;
    this.vel=vadd(this.vel,vmul(acc,dt));this.pos=vadd(this.pos,vmul(this.vel,dt));
    if(this.t>s.life||(this.t>s.burn&&sp<230)||((this.lost||(T&&!T.alive))&&this.t>s.burn+4)){this.alive=false;this.result='miss';}
    else if(W.real&&this.pos.y<terrainH(this.pos.x,this.pos.z)){this.alive=false;this.result='ground';}
  }
}
/* kinematic fly-out used for the HUD launch zone */
const FLY_W={supports:()=>true,los:()=>true,real:false};
function flyout(spec,sp,sv,tp,tv){
  const tgt={pos:{...tp},vel:tv,alive:true},m=new Missile(spec,null,tgt,sp,sv);m.active=true;
  const dt=0.1;for(let i=0;i<spec.life/dt&&m.alive;i++){tgt.pos=vadd(tgt.pos,vmul(tv,dt));if(m.est)m.est={p:tgt.pos,v:tv};m.step(dt,FLY_W);}
  return m.result==='hit'?m.t:0;}
function launchZone(spec,sp,sv,tp,tv){
  const r=vsub(tp,sp),R=vlen(r),u=vmul(r,1/R);let lo=800,hi=140000;
  for(let i=0;i<8;i++){const mid=(lo+hi)/2;if(flyout(spec,sp,sv,vadd(sp,vmul(u,mid)),tv))lo=mid;else hi=mid;}
  return{rmax:lo,R,tof:R<lo?flyout(spec,sp,sv,tp,tv):0};}

/* ---------- glide bomb (SPICE-2000) ---------- */
const SPICE={name:'SPICE-2000',mass:950,ld:8};
function spiceRange(dh,V){return dh<=300?0:Math.max(0,5.8*dh+10*(V-180));}
class Bomb{
  constructor(owner,target,pos,vel,spec){this.ld=spec&&spec.ld||SPICE.ld;this.lgb=!!(spec&&spec.lgb);this.owner=owner;this.target=target;this.pos={...pos};this.vel={...vel};this.t=0;this.alive=true;this.kind='bomb';this.aim={x:target.pos.x+(Math.random()-0.5)*5,y:target.pos.y,z:target.pos.z+(Math.random()-0.5)*5};}
  step(dt,W){
    this.t+=dt;const at=atmo(this.pos.y);let sp=vlen(this.vel),vh=vmul(this.vel,1/sp);
    const r=vsub(this.aim,this.pos),hd=Math.hypot(r.x,r.z),elev=Math.atan2(r.y,hd);
    let nload=Math.max(0,Math.cos(Math.asin(clamp(vh.y,-1,1))));
    if(this.lgb){this.guided=W.lasing(this.target);if(this.guided){const tp=this.target.pos;this.aim={x:tp.x,y:tp.y,z:tp.z};}if(!this.guided&&this.t>0.8)this.lost=(this.lost||0)+dt;}
    if(this.t>0.8&&(!this.lgb||this.guided)){let des;
      if(elev<-0.62||hd<1200)des=vnorm(r);
      else{const g=sp>235?-0.02:-1/this.ld-clamp((170-sp)*0.004,0,0.25),ch=Math.cos(g);des=v3(r.x/hd*ch,Math.sin(g),r.z/hd*ch);}
      const ang=Math.acos(clamp(vdot(vh,des),-1,1));
      if(ang>1e-4){const step=Math.min(ang,3.5*G0/sp*dt),ax=vnorm(vcross(vh,des)),qq=qaxis(ax.x,ax.y,ax.z,step);vh=vnorm(qrot(qq,vh));nload+=step/dt*sp/G0*0.6;}
    }else{vh=vnorm(vadd(vh,v3(0,-G0*dt/sp,0)));nload=0;}
    const vs=160*Math.sqrt(1.225/at.rho)/1.6,dr=G0/this.ld*0.5*((sp/vs)**2+nload*nload*(vs/sp)**2);
    sp=Math.max(60,sp+(-G0*vh.y-dr)*dt);
    this.vel=vmul(vh,sp);this.pos=vadd(this.pos,vmul(this.vel,dt));
    if(this.pos.y<=terrainH(this.pos.x,this.pos.z)+1){this.alive=false;if(W.onBomb)W.onBomb(this);}
  }
}
/* ---------- attack drone ---------- */
class Drone{
  constructor(x,y,z,i,type='UAV'){const cm=type==='CM';this.spd=cm?215:51;this.orbit=false;this.pos=v3(x,y,z);this.vel=v3(-this.spd,0,0);this.alive=true;this.hp=2;this.kind='air';this.type=type;this.side=1;this.rcs=cm?0.3:0.08;this.t=i*7;this.cruise=y;this.leaked=false;this.q=qeuler(-Math.PI/2,0,0);this.eng=0;}
  step(dt){if(!this.alive)return;this.t+=dt;const tg=Math.max(this.cruise,terrainH(this.pos.x-600,this.pos.z)+420);
    const vy=clamp((tg-this.pos.y)*0.06,-4,this.spd>100?25:7);
    if(this.orbit){const a=this.t*0.02;this.vel=v3(-this.spd*Math.sin(a),vy,-this.spd*Math.cos(a));this.q=qeuler(Math.atan2(this.vel.x,-this.vel.z),0,0);}
    else this.vel=v3(-this.spd,vy,5*Math.sin(this.t*0.07));
    this.pos=vadd(this.pos,vmul(this.vel,dt));
    if(!this.orbit&&this.pos.x<16000){this.alive=false;this.leaked=true;}}
  die(){this.alive=false;}
}
/* ---------- tanker: flies a racetrack and passes fuel through a boom ---------- */
class Tanker{
  constructor(cx,cz,alt){this.kind='air';this.type='TANKER';this.side=0;this.alive=true;this.rcs=40;this.hp=1e9;this.eng=0.8;this.c=v3(cx,alt,cz);this.spd=175;this.leg=30000;this.r=6000;this.s=5000;this.pos=v3();this.vel=v3();this.q=qeuler(0,0,0);this.step(0);}
  step(dt){const L=this.leg,r=this.r,arc=Math.PI*r,per=2*L+2*arc,c=this.c;this.s=(this.s+this.spd*dt)%per;let s=this.s,x,z,h,bank=0;const bk=Math.atan(this.spd*this.spd/(G0*r));
    if(s<L){x=c.x-L/2+s;z=c.z-r;h=Math.PI/2;}
    else if(s<L+arc){const a=(s-L)/r;x=c.x+L/2+r*Math.sin(a);z=c.z-r*Math.cos(a);h=Math.PI/2+a;bank=bk;}
    else if(s<2*L+arc){x=c.x+L/2-(s-L-arc);z=c.z+r;h=1.5*Math.PI;}
    else{const a=(s-2*L-arc)/r;x=c.x-L/2-r*Math.sin(a);z=c.z+r*Math.cos(a);h=1.5*Math.PI+a;bank=bk;}
    this.pos=v3(x,c.y,z);this.vel=v3(Math.sin(h)*this.spd,0,-Math.cos(h)*this.spd);this.q=qeuler(h,0,bank);this.hdg=h;}
  die(){}
}
/* ---------- enemy fighter AI ---------- */
class MigAI{
  constructor(ac,home,idx){this.ac=ac;this.home=home;this.idx=idx;this.state='cap';this.r27=2;this.r73=2;this.cd=6+idx*5;this.cmT=0;this.track=false;this.gunT=0;this.capA=idx*Math.PI;this.shot=null;this.launching=false;this.trackR=75000;this.sym='29';this.tgt=null;this.pickT=0;}
  update(dt,W){
    const ac=this.ac;if(!ac.alive)return;this.cd-=dt;
    /* target: the nearest friendly aircraft; in the escort mission the strike aircraft count as closer than they are */
    this.pickT-=dt;if(this.pickT<=0||!this.tgt||!this.tgt.alive){this.pickT=4;let b=W.player,bd=1e12;
      for(const c of W.targetsFor()){const d=vdist(c.ac.pos,ac.pos)*c.w*(this.idx%2&&W.wing&&c.ac===W.wing.ac?0.7:1);if(d<bd){bd=d;b=c.ac;}}this.tgt=b;}
    const pl=this.tgt,isP=pl===W.player;
    const r=vsub(pl.pos,ac.pos),R=vlen(r),los=vmul(r,1/R),fwd=qrot(ac.q,FWD),off=Math.acos(clamp(vdot(fwd,los),-1,1));
    this.track=pl.alive&&W.migsActive&&R<this.trackR*(isP?W.sig:1)&&off<55*D2R&&W.los(ac.pos,pl.pos)&&!W.notched(ac.pos,pl,false);
    this.launching=!!(this.shot&&this.shot.alive&&!this.shot.lost);
    let thr=null,td=1e9;for(const m of W.missiles)if(m.alive&&m.target===ac&&!m.lost&&!m.decoy){const d=vdist(m.pos,ac.pos);if(d<td){td=d;thr=m;}}
    let dir,spd=250;const flat=(x,z,dy)=>{const l=Math.hypot(x,z)||1;return vnorm(v3(x/l,dy,z/l));};
    if(thr&&td<13000&&(thr.active||thr.s.seeker==='ir')){
      const ml=vsub(ac.pos,thr.pos);let b=vcross(ml,UP);if(vdot(b,fwd)<0)b=vmul(b,-1);dir=flat(b.x,b.z,ac.agl>1500?-0.15:0.05);spd=420;
      this.cmT-=dt;if(this.cmT<=0){this.cmT=1.1;W.dispense(ac);}this.state='defend';
    }else if(!W.migsActive||!pl.alive||this.hold){
      this.capA+=dt*0.028;const tx=this.home.x+Math.cos(this.capA)*9000,tz=this.home.z+Math.sin(this.capA)*9000;
      dir=flat(tx-ac.pos.x,tz-ac.pos.z,clamp((this.home.y-ac.pos.y)/3000,-0.3,0.3));spd=230;this.state='cap';
    }else if(R>11000){
      if(this.launching){const h=Math.atan2(los.x,-los.z)+(this.idx?1:-1)*40*D2R;dir=flat(Math.sin(h),-Math.cos(h),clamp(los.y,-0.2,0.2));spd=290;this.state='crank';}
      else{let aim=vadd(pl.pos,vmul(pl.vel,R/700*0.6));if(R>19000&&W.migs.filter(m=>m.alive).length>1){const k=(this.idx%2?1:-1)*Math.min(R*0.32,13000);aim=vadd(aim,v3(-los.z*k,0,los.x*k));}const a=vsub(aim,ac.pos);dir=flat(a.x,a.z,clamp(a.y/Math.hypot(a.x,a.z),-0.3,0.3));spd=330;this.state='intercept';
        if(this.track&&R<36000&&this.r27>0&&this.cd<=0&&off<25*D2R){this.shot=W.launch(MSL.R27,ac,pl);this.r27--;this.cd=16;}}
    }else{
      dir=vnorm(vsub(vadd(pl.pos,vmul(pl.vel,R/900)),ac.pos));spd=ac.V<170?500:300;this.state='merge';
      if(ac.V<130&&ac.agl>1500)dir=flat(dir.x,dir.z,-0.25);
      if(R<8500&&R>900&&off<25*D2R&&this.r73>0&&this.cd<=0&&W.los(ac.pos,pl.pos)){W.launch(MSL.R73,ac,pl);this.r73--;this.cd=10;}
      this.gunT-=dt;if(R<750&&off<3.5*D2R&&this.gunT<=0){this.gunT=0.06;if(isP)W.bullet(ac,870);else if(Math.random()<0.02)W.hitFriend(pl,'gun');}
    }
    const gh=terrainH(ac.pos.x+ac.vel.x*6,ac.pos.z+ac.vel.z*6);
    if(ac.pos.y+Math.min(0,ac.vel.y)*6<gh+600)dir=flat(fwd.x,fwd.z,0.6);
    apSteer(ac,dir,W.d.pull);ac.ctl.throttle=ac.V<spd?1.3:ac.V<spd+30?0.9:0.35;ac.ctl.brake=ac.V>spd+60;
  }
}
/* ---------- number two ---------- */
class WingAI{
  constructor(ac,plane){this.ac=ac;this.mode='form';this.tgt=null;this.aim120=plane.aim120;this.python=plane.python;this.bombs=plane.spice?2:0;this.cd=4;this.orb=0;}
  update(dt,W){const ac=this.ac;if(!ac.alive)return;const pl=W.player;this.cd-=dt;ac.fuel=ac.t.fuelMax*0.6;ac.hp=ac.t.hp;
    const fwd=qrot(ac.q,FWD),flat=(x,z,dy)=>{const l=Math.hypot(x,z)||1;return vnorm(v3(x/l,dy,z/l));};let dir,spd=250;
    if(this.mode==='cover'&&!(this.tgt&&this.tgt.alive)){let b=null,bd=70000;for(const e of W.air){if(!e.alive||e.side===0)continue;if(e.type!=='UAV'&&e.type!=='CM'&&!W.migsActive)continue;const d=vdist(e.pos,ac.pos);if(d<bd){bd=d;b=e;}}this.tgt=b;}
    if(this.mode==='attack'&&!(this.tgt&&this.tgt.alive)){this.mode='form';this.tgt=null;W.msg('שתיים: המטרה ירדה, חוזר למבנה.');}
    const T=this.mode==='form'?null:this.tgt;
    if(T&&T.kind==='air'){const r=vsub(T.pos,ac.pos),R=vlen(r),lead=vadd(T.pos,vmul(T.vel,R/900)),a=vsub(lead,ac.pos),off=Math.acos(clamp(vdot(fwd,vmul(r,1/R)),-1,1));
      dir=vnorm(a);spd=R>9000?330:270;const small=T.type==='UAV';
      if(this.cd<=0&&off<22*D2R&&W.los(ac.pos,T.pos)){if(this.aim120>0&&R<(small?16000:30000)&&R>3000){W.launch(MSL.AIM120,ac,T);this.aim120--;this.cd=14;W.msg('שתיים: פוקס שלוש.');}
        else if(this.python>0&&R<(small?5000:7000)&&R>700){W.launch(MSL.PYTHON5,ac,T);this.python--;this.cd=9;W.msg('שתיים: פוקס שתיים.');}
        else if(!this.aim120&&!this.python&&!this.winch){this.winch=true;this.mode='form';this.tgt=null;W.msg('שתיים: נגמרו לי הטילים, חוזר למבנה.');}}}
    else if(T){const r=vsub(T.pos,ac.pos),hd=Math.hypot(r.x,r.z);dir=flat(r.x,r.z,clamp((T.pos.y+6500-ac.pos.y)/4000,-0.25,0.25));spd=280;
      if(!this.bombs){this.mode='form';this.tgt=null;W.msg('שתיים: אין לי חימוש לקרקע.');}
      else if(this.cd<=0&&hd<spiceRange(ac.pos.y-T.pos.y,ac.V)*0.75&&hd>3000&&Math.acos(clamp((fwd.x*r.x+fwd.z*r.z)/(Math.hypot(fwd.x,fwd.z)*hd||1),-1,1))<30*D2R){
        W.bombs.push(new Bomb(ac,T,vadd(ac.pos,vmul(qrot(ac.q,UP),-2)),ac.vel));this.bombs--;this.cd=6;this.mode='form';this.tgt=null;W.events.push({type:'release'});W.msg('שתיים: פצצה שוחררה, חוזר למבנה.');}}
    else if(pl.onGround||!pl.alive||W.ejected){this.orb+=dt*0.03;const tx=Math.cos(this.orb)*4000,tz=2500+Math.sin(this.orb)*4000;dir=flat(tx-ac.pos.x,tz-ac.pos.z,clamp((SITES.base.h+1500-ac.pos.y)/2000,-0.2,0.2));spd=210;}
    else{/* right echelon: 50 m to the right, 22 m behind, a little high */
      const pf=qrot(pl.q,FWD),h=Math.atan2(pf.x,-pf.z),slot=vadd(pl.pos,v3(Math.cos(h)*50-Math.sin(h)*22,6,Math.sin(h)*50+Math.cos(h)*22)),e=vsub(slot,ac.pos),d=vlen(e),along=e.x*Math.sin(h)-e.z*Math.cos(h);
      const aim=vadd(vadd(slot,vmul(pl.vel,2.5)),vmul(pf,Math.max(250,d)));dir=vnorm(vsub(aim,ac.pos));spd=pl.V+clamp(along*0.25,-60,110);
      if(d>4000)spd=Math.max(spd,pl.V+90);}
    let thr=null,td=11000;for(const m of W.missiles)if(m.alive&&m.target===ac&&!m.lost&&!m.decoy){const d=vdist(m.pos,ac.pos);if(d<td){td=d;thr=m;}}
    if(thr){const ml=vsub(ac.pos,thr.pos);let b=vcross(ml,UP);if(vdot(b,fwd)<0)b=vmul(b,-1);dir=flat(b.x,b.z,ac.agl>1500?-0.12:0.05);spd=400;this.cmT=(this.cmT||0)-dt;if(this.cmT<=0){this.cmT=1;W.dispense(ac);}
      if(!this.said||W.time-this.said>25){this.said=W.time;W.msg('שתיים: טיל עליי, שובר!');}}
    const gh=terrainH(ac.pos.x+ac.vel.x*6,ac.pos.z+ac.vel.z*6);if(ac.pos.y+Math.min(0,ac.vel.y)*6<gh+450)dir=flat(fwd.x,fwd.z,0.6);
    apSteer(ac,dir,0.85);ac.ctl.throttle=ac.V<spd-4?1.3:ac.V<spd+3?0.75:0.15;ac.ctl.brake=ac.V>spd+25;ac.step(dt);}
}
/* ---------- strike aircraft that the player escorts: flies straight to the target, bombs, turns home ---------- */
class StrikerAI{
  constructor(ac,idx){this.ac=ac;this.idx=idx;this.bombs=2;this.phase='in';this.cmT=0;this.cd=0;}
  update(dt,W){const ac=this.ac;if(!ac.alive)return;ac.fuel=ac.t.fuelMax*0.6;this.cd-=dt;const fwd=qrot(ac.q,FWD),flat=(x,z,dy)=>{const l=Math.hypot(x,z)||1;return vnorm(v3(x/l,dy,z/l));};
    const tg=SITES.tgt,alt=7600+this.idx*250;let dir;
    for(const m of W.missiles)if(m.alive&&m.target===ac&&!m.lost&&!m.decoy&&vdist(m.pos,ac.pos)<9000){this.cmT-=dt;if(this.cmT<=0){this.cmT=1.3;W.dispense(ac);}break;}
    if(this.phase==='in'){const r=v3(tg.x-ac.pos.x,0,tg.z+(this.idx?900:-900)-ac.pos.z),hd=Math.hypot(r.x,r.z);dir=flat(r.x,r.z,clamp((alt-ac.pos.y)/3000,-0.2,0.2));
      const left=W.ground.filter(g=>g.primary&&g.alive);
      if(!left.length){this.phase='out';}
      else if(this.cd<=0&&hd<spiceRange(ac.pos.y-tg.h,ac.V)*0.7){const T=left[(this.idx+this.bombs)%left.length];W.bombs.push(new Bomb(ac,T,vadd(ac.pos,vmul(qrot(ac.q,UP),-2)),ac.vel));this.bombs--;this.cd=3;W.events.push({type:'release'});
        if(this.bombs<=0){this.phase='out';this.released=true;W.msg(`מוביל ${this.idx?'שתיים':'אחת'}: פצצות שוחררו, פונה הביתה.`);}}}
    else dir=flat(-ac.pos.x,-ac.pos.z+(this.idx?3000:-3000),clamp((alt-ac.pos.y)/3000,-0.2,0.2));
    const gh=terrainH(ac.pos.x+ac.vel.x*6,ac.pos.z+ac.vel.z*6);if(ac.pos.y+Math.min(0,ac.vel.y)*6<gh+500)dir=flat(fwd.x,fwd.z,0.6);
    apSteer(ac,dir,0.5);ac.ctl.throttle=ac.V<236?1.1:ac.V<244?0.8:0.3;ac.step(dt);}
}
/* ---------- SAM battery ---------- */
class SamSite{
  constructor(radar,rk=1,sym='SA',cdk=1){this.rk=rk;this.sym=sym;this.cdk=cdk;this.radar=radar;this.pos=radar.pos;this.side=1;this.kind='sam';this.left=8;this.cd=0;this.acq=0;this.tracking=false;this.search=false;this.inFlight=[];}
  get alive(){return this.radar.alive;}
  update(dt,W){
    if(!this.alive){this.tracking=this.search=false;return;}
    const pl=W.player,rp=vadd(this.pos,v3(0,18,0)),R=vdist(pl.pos,rp);
    const vis=pl.alive&&R<60000*W.sig*Math.min(1.25,this.rk+0.25)&&W.los(rp,pl.pos)&&!W.notched(rp,pl,true);
    this.acq=vis?Math.min(6,this.acq+dt):Math.max(0,this.acq-dt*2);this.search=vis;this.tracking=this.acq>4;
    this.cd-=dt;this.inFlight=this.inFlight.filter(m=>m.alive);
    if(this.tracking&&R<W.d.samR*this.rk&&R>4000&&this.left>0&&this.cd<=0&&this.inFlight.length<2){
      const l=vnorm(vsub(pl.pos,rp)),d=vnorm(v3(l.x,Math.max(l.y,0.7),l.z));
      this.inFlight.push(W.launch(MSL.SAM,this,pl,vadd(rp,v3(40,4,30)),vmul(d,40)));this.cd=W.d.samCd*this.cdk;this.left--;}
  }
}
/* ---------- world / mission ---------- */
const DIFF={easy:{decoy:1.8,pull:0.6,samCd:17,samR:40000,samN:4,r27:1,cm:90,hp:220},
  normal:{decoy:1,pull:0.85,samCd:11,samR:45000,samN:8,r27:2,cm:60,hp:100},
  hard:{decoy:0.7,pull:1,samCd:8,samR:48000,samN:10,r27:2,cm:60,hp:100}};
/* player aircraft: airframe type, load-out and the bomb it carries */
const PLANES={
  F15I:{type:'F15I',name:'F-15I רעם',unit:'טייסת 69 · הפטישים',call:'פטיש',aim120:4,python:2,spice:4,bomb:{name:'SPICE-2000',mass:950,soft:55,hard:14},fuelRwy:8000,fuelAir:7800,base:300,eye:[0,1.15,-4.6],chase:[8,34]},
  F16I:{type:'F16I',name:'F-16I סופה',unit:'טייסת 107 · אבירי הזנב הכתום',call:'אביר',aim120:2,python:2,spice:4,bomb:{name:'SPICE-1000',mass:500,soft:38,hard:9},fuelRwy:5200,fuelAir:5000,base:250,eye:[0,1.0,-3.5],chase:[6.5,27]},
  /* the Adir carries everything inside to stay hard to see; the Baz is a pure fighter */
  F35I:{type:'F35I',name:'F-35I אדיר',unit:'טייסת 140 · נשר הזהב',call:'אדיר',aim120:2,python:0,spice:8,gun:180,internal:true,bomb:{name:'GBU-39',mass:130,soft:20,hard:6},fuelRwy:8000,fuelAir:7600,base:0,eye:[0,1.05,-3.9],chase:[7,29]},
  F15C:{type:'F15C',name:'F-15 בז',unit:'טייסת 133 · אבירי הזנב הכפול',call:'בז',aim120:4,python:4,spice:0,gun:940,bomb:{name:'SPICE',mass:0,soft:0,hard:0},fuelRwy:6000,fuelAir:5800,base:150,eye:[0,1.15,-4.6],chase:[8,34]}};
class World{
  constructor(o={}){
    buildTerrain();this.time=0;this.real=true;this.diff=DIFF[o.diff]?o.diff:'normal';this.d=DIFF[this.diff];this.events=[];this.missiles=[];this.bombs=[];this.bullets=[];
    const pl0=PLANES[o.plane]||PLANES.F15I,M=o.mission,duel=M==='duel',tank=M==='tanker',train=M==='train',conv=M==='convoy',esc=M==='escort',sead=M==='sead'&&!!pl0.spice,icpt=M==='intercept'||(!pl0.spice&&!duel&&!tank&&!train&&!conv&&!esc),
      strike=!duel&&!tank&&!train&&!conv&&!sead&&!icpt&&!esc,
      pl=this.plane=sead&&!pl0.internal?Object.assign({},pl0,{spice:4,bomb:{name:'AGM-88',mass:360,soft:0,hard:0,arm:true}}):o.bomb==='lgb'&&pl0.spice&&!pl0.internal?Object.assign({},pl0,{spice:pl0.spice+2,bomb:{name:'GBU-12',mass:230,soft:30,hard:9,lgb:true,ld:3.4}}):pl0,
      air=o.start==='air'||duel||tank||train||esc,cold=o.start==='cold'&&!air,quiet=duel||tank||train||icpt||esc,TH=THEATRE;
    this.missionId=duel?'duel':tank?'tanker':train?'train':icpt?'intercept':esc?'escort':sead?'sead':conv?'convoy':'strike';this.call=pl.call;
    this.player=new Aircraft(pl.type,air?{x:duel?20000:9000,y:duel?6500:5500,z:0,hdg:Math.PI/2,pitch:0.055,speed:250,throttle:0.9,fuel:pl.fuelAir}
      :cold?{x:PARK.x,y:SITES.base.h+TYPES[pl.type].gearH,z:PARK.z,hdg:0,speed:0,throttle:0,gear:true,flaps:true,onGround:true,fuel:pl.fuelRwy}
      :{x:RWY.x1+110,y:SITES.base.h+TYPES[pl.type].gearH,z:0,hdg:Math.PI/2,speed:0,throttle:0,gear:true,flaps:true,onGround:true,fuel:pl.fuelRwy});
    /* aircraft systems. A cold start begins with everything off, parked short of the runway. */
    this.sys={batt:!cold,jfs:0,jfsOn:false,start:[false,false],cut:[false,false],ins:cold?0:1,insOn:!cold,radar:!cold,canopyOpen:cold,canopy:cold?1:0,pbrake:cold,lights:!cold,arDoor:false};
    if(cold)this.player.rpm.fill(0);
    /* ground crew for a start from the shelter: clears each engine, pulls the chocks, marshals the jet out and salutes */
    this.crew=cold?{phase:'pre',t:0,warned:0}:null;this.sys.chocks=cold;this.autoStart=false;this.autoT=0;this.dmg=[];this.dmgRadar=false;this.dmgRwr=false;
    this.radar={mode:'RWS',rng:40};this.ar={state:'none',t:0,taken:0,rel:v3(),dist:1e9,range:1e9};
    this.tanker=duel||train?null:new Tanker(26000,-24000,6000);this.friends=this.tanker?[this.tanker]:[];
    if(air)this.player.vel=v3(250,0,0);
    if(tank){const k=this.tanker,p=this.player;p.pos=v3(k.pos.x-2200,k.pos.y-70,k.pos.z);p.vel=v3(190,0,0);p.fuel=Math.round(p.t.fuelMax*0.3);p.ctl.throttle=p.eng=0.75;}
    this.player.hpMax=0;this.bingo=Math.round(pl.fuelRwy*0.22/100)*100;
    this.w={sel:'AIM120',aim120:pl.aim120,python:pl.python,gun:pl.gun||510,spice:quiet?0:pl.spice,chaff:this.d.cm,flare:this.d.cm};this.player.hp=this.player.hpMax=this.d.hp*TYPES[pl.type].hp/100;this.syncStores();
    const tg=SITES.tgt,sm=SITES.sam;
    this.wps=esc?[{n:'TGT',x:tg.x,z:tg.z,alt:7600},{n:'BASE',x:0,z:0,alt:1000}]:sead?[{n:'CAP',x:TH.cap[0],z:TH.cap[1],alt:7000},{n:'SAM',x:sm.x-40000,z:sm.z,alt:8000},{n:'BASE',x:0,z:0,alt:1000}]:conv?[{n:'ROAD',x:46000,z:-6000,alt:3000},{n:'BASE',x:0,z:0,alt:1000}]:train?[{n:'TRAIN',x:40000,z:0,alt:6500},{n:'BASE',x:0,z:0,alt:1000}]:icpt?[{n:'CAP',x:45000,z:0,alt:3000},{n:'BASE',x:0,z:0,alt:1000}]:tank?[{n:'TANKER',x:this.tanker.pos.x,z:this.tanker.pos.z,alt:6000},{n:'BASE',x:0,z:0,alt:1000}]:duel?[{n:'MERGE',x:TH.duelX-4000,z:0,alt:6500},{n:'BASE',x:0,z:0,alt:1000}]
      :[{n:'CAP',x:TH.cap[0],z:TH.cap[1],alt:6000},{n:'IP',x:tg.x+TH.ipOff[0],z:tg.z+TH.ipOff[1],alt:9000},{n:'TGT',x:SITES.tgt.x,z:SITES.tgt.z,alt:9000},{n:'BASE',x:0,z:0,alt:1000}];this.wp=0;
    this.drones=[];if(strike)for(let i=0;i<4;i++)this.drones.push(new Drone(64000+i*2500,1500,-9000+i*6000,i));
    /* air defence: two waves of attack drones, then two fast low cruise missiles */
    if(icpt){for(let i=0;i<8;i++)this.drones.push(new Drone((i<4?58000:74000)+(i%4)*2200,1200+(i%3)*250,-13500+(i%4)*9000+(i<4?0:3500),i));
      for(let i=0;i<2;i++)this.drones.push(new Drone(150000+i*9000,600,i?7000:-6000,i,'CM'));}
    this.nDrone=this.drones.length;
    /* enemy fighters: type and number depend on the mission */
    this.migs=[];this.migAI=[];const home=duel?v3(TH.duelX,6500,0):v3(tg.x+TH.migOff[0],7500,tg.z+TH.migOff[1]),
      foe=duel?(o.foe==='su27'?'SU27':o.foe==='mig21'?'MIG21':'MIG29'):sead?'MIG21':'MIG29',nFoe=duel?(foe==='MIG21'?3:2):esc?(o.noMigs?2:4):strike?(o.noMigs?0:2):sead?2:0;
    this.foeName={SU27:'סוחוי-27',MIG21:'מיג-21',MIG29:'מיג-29'}[foe];
    for(let i=0;i<nFoe;i++){const ft=esc&&i>=2?'MIG21':foe;const m=new Aircraft(ft,duel?{side:1,x:home.x+i*2500,y:home.y+i*400,z:[-2600,2600,0][i],hdg:-Math.PI/2,speed:250,fuel:3000,storeCD:0.002}
        :{side:1,x:home.x+i*3000,y:home.y+i*300,z:home.z+9000*(i%2?-1:1),hdg:i%2?Math.PI/2:-Math.PI/2,speed:230,fuel:3000,storeCD:0.002});
      this.migs.push(m);const ai=new MigAI(m,home,i);ai.r27=ft==='MIG21'?0:ft==='SU27'?this.d.r27*2:this.d.r27;ai.trackR=ft==='MIG21'?32000:ft==='SU27'?95000:75000;ai.sym={SU27:'27',MIG21:'21',MIG29:'29'}[ft];ai.wave=esc&&i>=2?2:1;this.migAI.push(ai);}
    this.air=[...this.drones,...this.migs];
    const G=(n,dx,dz,kind,primary,hp)=>{const s=kind==='radar'||kind==='launcher'?SITES.sam:SITES.tgt,x=s.x+dx,z=s.z+dz;return{name:n,kind,primary,hp,alive:true,side:1,pos:v3(x,terrainH(x,z),z),vel:v3()};};
    const G2=(n,x,z,kind,primary,hp)=>({name:n,kind,primary,hp,alive:true,side:1,pos:v3(x,terrainH(x,z),z),vel:v3()});
    this.ground=esc?[G('TEL-1',260,-140,'tel',true,1),G('TEL-2',-310,190,'tel',true,1),G('BUNKER',20,430,'bunker',true,1)]:strike?[G('SAM RADAR',0,0,'radar',false,1),G('TEL-1',260,-140,'tel',true,1),G('TEL-2',-310,190,'tel',true,1),G('BUNKER',20,430,'bunker',true,1),
      G('LNCH',160,120,'launcher',false,1),G('LNCH',-170,90,'launcher',false,1),G('LNCH',10,-190,'launcher',false,1)]
      :sead?[G('SA-10 RADAR',0,0,'radar',true,1),G2('SA-6 RADAR',tg.x,tg.z,'radar',true,1),G2('SA-6 RADAR',sm.x-17000,sm.z+19000,'radar',true,1),G('LNCH',160,120,'launcher',false,1),G('LNCH',-170,90,'launcher',false,1)]
      :conv?[...Array.from({length:6},(_,i)=>Object.assign(G2('TRUCK-'+(i+1),62000+i*70,-6000,'truck',true,3),{vel:v3(-13,0,0)})),G2('SA-8 RADAR',54000,-2500,'radar',false,1)]:[];
    /* air defence batteries: a long-range one, medium SA-6 and short SA-8 */
    this.sams=strike?[new SamSite(this.ground[0])]:sead?[new SamSite(this.ground[0],1.25,'10',1.1),new SamSite(this.ground[1],0.55,'6',0.7),new SamSite(this.ground[2],0.55,'6',0.7)]:conv?[new SamSite(this.ground[6],0.36,'8',0.6)]:[];
    for(const q of this.sams)q.left=q.rk<1?Math.ceil(this.d.samN*0.6):this.d.samN;
    if(strike&&o.noSam){this.ground[0].alive=false;this.stats0sam=true;}
    this.sam=this.sams[0]||new SamSite({alive:false,pos:v3(sm.x,sm.h,sm.z)});
    /* number two: flies on your wing and takes three orders */
    /* the escorted pair starts ahead of the player, already on its way */
    this.strikers=[];if(esc)for(let i=0;i<2;i++){const sa=new Aircraft('F16I',{x:this.player.pos.x+2500+i*250,y:7600+i*250,z:i?700:-700,hdg:Math.atan2(tg.x-11500,-tg.z),pitch:0.04,speed:240,throttle:0.8});sa.model='F16I';sa.label='S'+(i+1);this.strikers.push(new StrikerAI(sa,i));this.friends.push(sa);}
    this.wing=null;if(o.wing&&(strike||icpt||duel||sead||conv||esc)){const p=this.player,gnd=p.onGround,wa=new Aircraft(pl.type,gnd?{x:-2500,y:SITES.base.h+1500,z:2500,hdg:Math.PI/2,speed:200,throttle:0.8}:{x:p.pos.x-22,y:p.pos.y+6,z:p.pos.z+50,hdg:Math.PI/2,pitch:0.05,speed:250,throttle:0.9});
      this.wing=new WingAI(wa,pl);this.friends.push(wa);}
    this.wx=o.wx==='wind'||o.wx==='storm'?o.wx:'clear';this.wind=this.wx==='storm'?v3(-3,0,9):this.wx==='wind'?v3(-2,0,7):null;this.player.wind=this.wind;
    this.failT=o.fail?150+Math.random()*420:null;this.sig=Math.min(1,Math.pow(this.player.rcs/5,0.25));this.arm=air&&!train;this.contacts=[];this.lock=null;this.gtgt=null;this.irTgt=null;this.dlz=null;this.migsActive=duel;
    this.stats={uav:0,leak:0,mig:0,tgt:0,sam:!!this.stats0sam,shots:0,start:air?'air':cold?'cold':'runway'};this.over=null;this.flags={};this.tS=0;this.tM=0;this.tD=0;this.gunT=0;this.cmT=0;this.stopT=0;
    this.nPrimary=this.ground.filter(g=>g.primary).length;
    this.msg(esc?'בקר: פטיש אחת, זוג המובילים לפניך בדרכו לאתר השיגור. הסוללה שותקה. מיירטים צפויים לעלות מולם, שמור עליהם עד לשחרור.':sead?(air?'בקר: פטיש אחת, משימת דיכוי הגנה אווירית. שלוש סוללות לפניך: אחת ארוכת טווח ושתיים בינוניות. הטיל ננעל רק על מכ"ם שמשדר. רשאי אש.':'מגדל חצרים: פטיש אחת, רשאי להמריא. משימת דיכוי הגנה אווירית, שלוש סוללות.'):conv?(air?'בקר: פטיש אחת, שיירת משאיות נעה מערבה על הציר, מלווה בסוללה קצרת טווח. עצור אותה לפני שתגיע לקו. מטרות נעות, פצצת לייזר או תותח.':'מגדל חצרים: פטיש אחת, רשאי להמריא. שיירה נעה מערבה על הציר.'):train?'מדריך: ברוך הבא, פטיש אחת. נתחיל בפשוט: משוך מעט את הסטיק וטפס מעל עשרים אלף רגל.':icpt?(air?'בקר: פטיש אחת, מטח כטב"מי תקיפה חוצה את הגבול מערבה בגובה נמוך, שני גלים. אחריהם טילי שיוט. אל תיתן להם לעבור. רשאי אש.':cold?'מגדל חצרים: פטיש אחת, הזנקה! התנע והמרא, מטח כטב"מים בדרך.':'מגדל חצרים: פטיש אחת, הזנקה! רשאי להמריא ממסלול 09. מטח כטב"מים בדרך.'):tank?'בקר: פטיש אחת, המתדלק לפניך, שני קילומטר. פתח דלת תדלוק והתקרב לעמדת המגע.':cold?'מגדל חצרים: פטיש אחת, רשאי להתניע. בצע רשימת תיוג ודווח מוכן.':duel?`בקר: פטיש אחת, ${this.migs.length===3?'שלישיית':'זוג'} ${this.foeName} מולך, 45 קילומטר, באותו גובה. רשאי אש.`:air?'בקר: פטיש אחת, אתה בדרך לנקודה 1. ארבעה כטב"מי תקיפה נעים מערבה בגובה נמוך. רשאי אש.':'מגדל חצרים: פטיש אחת, רשאי להמריא ממסלול 09. מבער מלא, הרמת אף ב-150 קשר.');
    if(air)this.flags.airborne=true;
  }
  msg(text){if(THEATRE.id!=='south')text=text.replace('חצרים',THEATRE.base);if(this.wind)text=text.replace('רוח שקטה',`רוח צד מצפון, ${Math.round(vlen(this.wind)*KT)} קשר`).replace('מבער מלא, הרמת אף','רוח צד מצפון. מבער מלא, הרמת אף');this.events.push({type:'msg',text:text.replace(/פטיש אחת/g,this.call+' אחת').replace(/SPICE/g,this.plane.bomb.name)});}
  syncStores(){const w=this.w,p=this.player;p.storeMass=w.aim120*157+w.python*105+w.spice*this.plane.bomb.mass+this.plane.base;p.storeCD=(w.aim120+w.python)*0.0005+w.spice*0.0022;}
  los(a,b){for(let i=1;i<16;i++){const t=i/16;if(terrainH(lerp(a.x,b.x,t),lerp(a.z,b.z,t))>lerp(a.y,b.y,t))return false;}return true;}
  notched(obs,tgt,ground){if(!(ground||obs.y>tgt.pos.y+200))return false;const l=vnorm(vsub(tgt.pos,obs));
    return Math.abs(vdot(tgt.vel,l))<(this.time-(tgt.lastCM??-99)<4?85:30);}
  supports(owner,T){if(owner===this.player)return this.lock===T;if(owner===this.sam)return this.sam.alive&&this.sam.tracking;
    if(this.wing&&owner===this.wing.ac)return owner.alive;if(owner!==this.sam&&this.sams.includes(owner))return owner.alive&&owner.tracking;const ai=this.migAI.find(a=>a.ac===owner);return !!(ai&&owner.alive&&ai.track);}
  launch(spec,owner,target,pos,vel){
    const m=new Missile(spec,owner,target,pos||vadd(owner.pos,vmul(qrot(owner.q,UP),-1.6)),vel||vadd(owner.vel,vmul(qrot(owner.q,UP),-4)));
    this.missiles.push(m);this.events.push({type:'launch',m});return m;}
  bullet(owner,mv){const f=qrot(owner.q,FWD),j=()=>(Math.random()-0.5)*0.004;
    this.bullets.push({pos:vadd(owner.pos,vmul(f,8)),vel:vadd(owner.vel,vmul(vnorm(v3(f.x+j(),f.y+j(),f.z+j())),mv)),t:0,owner});}
  dispense(ac){
    if(ac===this.player){const w=this.w;if(w.chaff<=0&&w.flare<=0)return;w.chaff=Math.max(0,w.chaff-1);w.flare=Math.max(0,w.flare-1);}
    ac.lastCM=this.time;this.events.push({type:'cm',pos:ac.pos,vel:ac.vel});
    for(const m of this.missiles){if(!m.alive||m.target!==ac||m.decoy||m.lost)continue;const r=vsub(ac.pos,m.pos),R=vlen(r);if(R>12000)continue;
      let p;const good=m.owner===this.player;
      if(m.s.seeker==='ir')p=(good?0.05:0.22)*(ac.eng>1.02?0.5:1.2);
      else p=(good?0.03:0.06)+(good?0.22:0.42)*sstep(1-Math.abs(vdot(vnorm(ac.vel),vmul(r,1/R))),0.6,0.97);
      if(ac===this.player)p*=this.d.decoy;if(Math.random()<p)m.decoy={pos:{...ac.pos},vel:vmul(ac.vel,0.3)};}}
  onHit(m,T){
    this.events.push({type:'boom',pos:T.pos,size:1});
    if(T===this.player){this.hurt(m.s===MSL.SAM?'sam':'msl',m.s.name);return;}
    if(this.ground.includes(T)){this.killGround(T);return;}
    if(T.side===0){this.hitFriend(T,'msl');return;}
    this.killAir(T);}
  /* friendly aircraft: number two survives one hit, a strike aircraft does not */
  targetsFor(){const L=[{ac:this.player,w:this.missionId==='escort'?1.15:0.8}];if(this.wing&&this.wing.ac.alive)L.push({ac:this.wing.ac,w:1});
    for(const k of this.strikers)if(k.ac.alive)L.push({ac:k.ac,w:0.6});return L.filter(c=>c.ac.alive);}
  hitFriend(T,how){if(!T.alive||T.type==='TANKER')return;T.hits=(T.hits||0)+1;const two=this.wing&&T===this.wing.ac,name=two?'שתיים':T.label==='S1'?'מוביל אחת':'מוביל שתיים';
    if(two&&T.hits<2){this.msg('שתיים: נפגעתי! המטוס עוד טס, ממשיך.');return;}
    T.alive=false;T.crash='shot';this.events.push({type:'boom',pos:T.pos,size:1.4});this.events.push({type:'kill',e:T});this.stats.lost=(this.stats.lost||0)+1;
    this.msg(two?'שתיים: נפגעתי קשה, נוטש!':`בקר: ${name} הופל.`);if(this.lock===T)this.lock=null;}
  killAir(T){if(!T.alive)return;T.alive=false;T.crash='shot';this.events.push({type:'kill',e:T});
    if(this.missionId==='train'){this.stats.uav++;}
    else if(T.type==='CM'){this.stats.uav++;this.msg('בקר: טיל שיוט הופל. עבודה יפה.');}
    else if(T.type==='UAV'&&this.missionId==='intercept'){this.stats.uav++;const left=this.drones.filter(d=>d.alive&&d.type==='UAV').length;if(left%2===0||left<3)this.msg(left?`בקר: כטב"ם הופל, נותרו ${left}.`:'בקר: כל הכטב"מים הופלו.');}
    else if(T.type==='UAV'){this.stats.uav++;const left=this.drones.filter(d=>d.alive).length;this.msg(left?`בקר: פגיעה. כטב"ם הופל, נותרו ${left}.`:'בקר: כל הכטב"מים טופלו. המשך לנקודת הכניסה.');}
    else{this.stats.mig++;const n=this.migs.filter(x=>x.alive).length;this.msg(n?`בקר: הפלה! ${this.foeName} ירד. ${n===1?'אחד עדיין':n+' עדיין'} באוויר.`:'בקר: כל מטוסי האויב הופלו. השמיים נקיים.');}
    if(this.lock===T)this.lock=null;}
  killGround(g){if(!g.alive)return;g.alive=false;this.events.push({type:'gkill',g});const left=this.ground.filter(x=>x.primary&&x.alive).length,id=this.missionId;
    if(g.kind==='radar')this.stats.sam=true;
    if(g.primary){this.stats.tgt++;
      if(id==='sead'){this.msg(left?`בקר: מכ"ם הושמד. נותרו ${left} סוללות.`:'בקר: כל הסוללות שותקו. השמיים פתוחים למבנה התקיפה.');if(!this.migsActive&&this.migs.length){this.migsActive=true;this.msg(`בקר: זהירות, זוג ${this.foeName} הוזנק לעברך.`);}}
      else if(id==='convoy')this.msg(left?`בקר: רכב הושמד. נותרו ${left}.`:'בקר: השיירה הושמדה.');
      else this.msg(left?`בקר: פגיעה טובה ב-${g.name}. נותרו ${left} מטרות.`:'בקר: כל המטרות הושמדו. חזור לבסיס לנחיתה.');}
    else if(g.kind==='radar')this.msg('בקר: מכ"ם הסוללה הושמד. איום הנ"מ הוסר.');
    if(this.gtgt===g)this.gtgt=null;}
  onBomb(b){
    this.events.push({type:'boom',pos:b.pos,size:5,ground:true});const bs=b.owner&&b.owner!==this.player?{soft:45,hard:12}:this.plane.bomb;
    for(const g of this.ground){if(!g.alive)continue;if(vdist(g.pos,b.pos)<(g.kind==='bunker'?bs.hard:bs.soft))this.killGround(g);}}
  /* player actions */
  select(s){this.w.sel=s;this.dlz=null;if(s==='SPICE'&&!this.gtgt)this.cycleTarget();}
  cycleTarget(){
    if(this.w.sel==='SPICE'){const gs=this.ground.filter(g=>g.alive&&g.kind!=='launcher');if(!gs.length){this.gtgt=null;return;}
      this.gtgt=gs[(gs.indexOf(this.gtgt)+1)%gs.length];return;}
    const cs=this.contacts;if(!cs.length){this.lock=null;return;}
    if(!this.lock){let b=cs[0],ba=9;for(const c of cs){const a=Math.hypot(c.az,c.el);if(a<ba){ba=a;b=c;}}this.lock=b.e;}
    else this.lock=cs[(cs.findIndex(c=>c.e===this.lock)+1)%cs.length].e;this.dlz=null;}
  unlock(){this.lock=null;this.dlz=null;}
  get power(){return this.sys.batt||this.player.rpm.some(r=>r>=0.98);}
  get radarOn(){return this.sys.radar&&!this.dmgRadar&&this.power;}
  ident(e,R){return e.side===0?'FRIEND':R<46000?e.type:'UNKNOWN';}
  /* every cockpit switch goes through here; returns whether it moved and reports why not */
  sw(id){const s=this.sys,p=this.player,ev=on=>{this.events.push({type:'sw',id,on});return true;},no=why=>{this.events.push({type:'swfail',id,why});return false;};
    if(!p.alive)return false;
    switch(id){
      case 'batt':s.batt=!s.batt;return ev(s.batt);
      case 'jfs':if(!this.power)return no('אין מתח. הדלק מצבר.');s.jfsOn=!s.jfsOn;return ev(s.jfsOn);
      case 'eng0':case 'eng1':{const i=+id[3];if(i>=p.nEng)return no('אין מנוע כזה במטוס הזה.');
        if(p.rpm[i]>=1||s.start[i]){if(!p.onGround)return no('באוויר מכבים מנוע רק בידית האש.');s.start[i]=false;s.cut[i]=true;return ev(false);}
        if(p.engOK[i]===0)return no('המנוע מושבת.');if(s.jfs<1)return no('המתנע עוד לא מוכן.');if(p.fuel<=0)return no('אין דלק.');
        s.cut[i]=false;s.start[i]=true;if(this.crew&&this.crew.phase==='pre')this.msg(`ראש צוות: מנוע ${p.nEng===1?'':i===1?'ימין ':'שמאל '}נקי מאחור. רשאי להתניע.`.replace('  ',' '));return ev(true);}
      case 'ins':if(!this.power)return no('אין מתח.');if(s.ins>=1)return no('מערכת הניווט כבר מיושרת.');s.insOn=!s.insOn;return ev(s.insOn);
      case 'radar':if(this.dmgRadar)return no('המכ"ם תקול.');if(!s.radar&&!p.rpm.some(r=>r>=1))return no('המכ"ם דורש מנוע פועל.');s.radar=!s.radar;return ev(s.radar);
      case 'canopy':if(!s.canopyOpen&&p.V>25)return no('אי אפשר לפתוח חופה בתנועה.');s.canopyOpen=!s.canopyOpen;return ev(!s.canopyOpen);
      case 'pbrake':if(!s.pbrake&&!p.onGround)return no('בלם חניה פועל רק על הקרקע.');s.pbrake=!s.pbrake;return ev(s.pbrake);
      case 'lights':s.lights=!s.lights;return ev(s.lights);
      case 'gear':if(p.onGround)return no('כן הנסע נעול על הקרקע.');p.gear=!p.gear;return ev(p.gear);
      case 'flaps':if(p.hyd<1&&!p.flaps)return no('אין לחץ הידראולי.');p.flaps=!p.flaps;return ev(p.flaps);
      case 'arm':if(!this.power)return no('אין מתח.');this.arm=!this.arm;return ev(this.arm);
      case 'ardoor':s.arDoor=!s.arDoor;return ev(s.arDoor);
      case 'fire0':case 'fire1':{const i=+id[4];if(i>=p.nEng)return no('אין מנוע כזה במטוס הזה.');p.fire[i]=false;p.engOK[i]=0;p.rpm[i]=0;s.start[i]=false;this.syncDmg();return ev(true);}
      case 'rmode':this.radar.mode=this.radar.mode==='RWS'?'ACM':'RWS';return ev(true);
      case 'rrng':case 'rrngdn':{const o=[10,20,40,80,160],k=o.indexOf(this.radar.rng)+(id==='rrng'?1:-1);this.radar.rng=o[clamp(k,0,o.length-1)];return ev(true);}
    }return false;}
  /* start-up checklist, in the order a pilot runs it */
  checklist(){const s=this.sys,p=this.player,eng=(i,t)=>({id:'eng'+i,t,done:p.rpm[i]>=1,busy:s.start[i],pct:p.rpm[i]}),L=[];
    L.push({id:'batt',t:'מצבר',done:s.batt});
    L.push({id:'jfs',t:'מתנע עזר',done:s.jfs>=1||p.rpm.every(r=>r>=1),busy:s.jfsOn&&s.jfs<1,pct:s.jfs});
    if(p.nEng===2){L.push(eng(1,'התנעת מנוע ימין'));L.push(eng(0,'התנעת מנוע שמאל'));}else L.push(eng(0,'התנעת מנוע'));
    L.push({id:'ins',t:'יישור מערכת ניווט',done:s.ins>=1,busy:s.insOn&&s.ins<1,pct:s.ins});
    L.push({id:'radar',t:'מכ"ם',done:s.radar});
    L.push({id:'canopy',t:'סגירת חופה',done:!s.canopyOpen&&s.canopy<0.05,busy:!s.canopyOpen&&s.canopy>=0.05,pct:1-s.canopy});
    L.push({id:'pbrake',t:'שחרור בלם חניה',done:!s.pbrake});return L;}
  crewStep(dt){const c=this.crew,s=this.sys,p=this.player;if(!c||c.phase==='done')return;c.t+=dt;
    const set=ph=>{c.phase=ph;c.t=0;};
    if(s.chocks){p.vel=v3();p.pos.x=PARK.x;p.pos.z=PARK.z;
      if(!s.pbrake&&p.ctl.throttle>0.12&&this.time-c.warned>8){c.warned=this.time;this.msg('ראש צוות: עצור! הסדים עדיין במקום. המתן לסימון.');}}
    if(c.phase==='pre'){const L=this.checklist();if(L.filter(x=>x.id!=='pbrake').every(x=>x.done)){set('chocks');this.msg('ראש צוות: מנועים יציבים. מוציאים סדים ופיני ביטחון.');}}
    else if(c.phase==='chocks'&&c.t>7){s.chocks=false;set('marshal');this.msg('ראש צוות: סדים ופינים בחוץ, המטוס נקי. שחרר בלם חניה וסע אחרי המכווין.');}
    else if(c.phase==='marshal'&&p.pos.z<PARK.z-40){set('salute');this.msg('ראש צוות: טיסה טובה ונחיתה בטוחה. המשך ישר לנתיב ההסעה ופנה שמאלה.');}
    else if(c.phase==='salute'&&c.t>9)set('done');}
  systems(dt){const s=this.sys,p=this.player;if(!p.alive)return;this.crewStep(dt);
    s.jfs=s.jfsOn&&this.power?Math.min(1,s.jfs+dt/4):Math.max(0,s.jfs-dt/2);
    for(let i=0;i<p.nEng;i++){
      if(s.start[i]&&(s.jfs>=1||p.rpm[i]>0.6)){p.rpm[i]=Math.min(1,p.rpm[i]+dt/12);if(p.rpm[i]>=1){s.start[i]=false;this.events.push({type:'sw',id:'eng'+i,on:true,done:true});}}
      else if(s.cut[i])p.rpm[i]=Math.max(0,p.rpm[i]-dt/4);
      if(p.fire[i]){p.hp-=1.6*dt;if(p.hp<=0)p.die('אש במנוע');}}
    if(s.jfsOn&&p.rpm.every((r,i)=>r>=1||p.engOK[i]===0))s.jfsOn=false;
    if(s.insOn&&this.power&&s.ins<1&&p.V<2)s.ins=Math.min(1,s.ins+dt/22);
    s.canopy+=clamp((s.canopyOpen?1:0)-s.canopy,-dt/3,dt/3);
    if(s.pbrake&&p.onGround)p.ctl.brake=true;
    p.extraCD=s.arDoor?0.002:0;
    if(this.autoStart){if(this.power&&!s.insOn&&s.ins<1)this.sw('ins');this.autoT-=dt;if(this.autoT<=0){this.autoT=0.8;const n=this.checklist().find(c=>!c.done);if(!n)this.autoStart=false;else if(!n.busy)this.sw(n.id);}}
    if(this.stats.start==='cold'&&!this.flags.ready&&this.checklist().every(c=>c.done)){this.flags.ready=true;this.flags.readyT=this.time;this.msg('מגדל חצרים: פטיש אחת, רשאי להסיע למסלול 09 ולהמריא. רוח שקטה.');}
    if(this.failT!=null&&this.flags.airborne&&!p.onGround&&!this.ejected){this.failT-=dt;if(this.failT<=0){const n=this.dmg.length;this.breakSys();
      if(this.dmg.length>n){this.events.push({type:'fail'});if(!p.fire.some(Boolean))this.msg('אזהרה ראשית: תקלה ב'+({'ENG':'מנוע','FUEL':'מערכת הדלק','HYD':'הידראוליקה','RADAR':'מכ"ם','RWR':'מערכת ההתרעה'}[this.dmg[this.dmg.length-1].t.split(' ')[0]]||'מערכת')+'. בדוק את לוח האזהרות ושקול חזרה לבסיס.');}
      this.failT=Math.random()<0.35?240+Math.random()*400:null;}}
    this.refuel(dt);}
  /* battle damage: a hit may destroy the jet or break one or two systems */
  hurt(kind,name){const p=this.player;if(!p.alive)return;
    if(kind==='gun'){p.hp-=9;if(p.hp<=0){p.die('נפגעת מאש תותח');return;}if(Math.random()<0.15)this.breakSys();return;}
    const k={easy:0.1,normal:0.28,hard:0.5}[this.diff]*(kind==='sam'?1.35:1);
    if(p.hp<p.hpMax*0.45||Math.random()<k){p.die('נפגעת מטיל '+name);return;}
    p.hp-=p.hpMax*(0.45+Math.random()*0.15);this.breakSys();if(Math.random()<0.6)this.breakSys();
    this.events.push({type:'hurt'});this.msg('בקר: פטיש אחת, נפגעת. בדוק מערכות ושקול חזרה לבסיס.');}
  breakSys(){const p=this.player,o=[];
    for(let i=0;i<p.nEng;i++)if(p.engOK[i]===1){const last=p.nEng===1||p.engOK.every((v,k)=>k===i||v<1);
      o.push(()=>{p.engOK[i]=last?0.5:0;if(!last)p.rpm[i]=0;});o.push(()=>{p.fire[i]=true;p.engOK[i]=0.5;this.msg('אש במנוע! משוך את ידית האש.');});}
    if(!p.leak)o.push(()=>{p.leak=3+Math.random()*5;});if(!this.dmgRadar)o.push(()=>{this.dmgRadar=true;this.sys.radar=false;this.lock=null;});
    if(p.hyd===1)o.push(()=>{p.hyd=0.4;});if(!this.dmgRwr)o.push(()=>{this.dmgRwr=true;});
    if(o.length)o[Math.random()*o.length|0]();this.syncDmg();}
  syncDmg(){const p=this.player,L=[],nm=p.nEng===2?['ENG L','ENG R']:['ENG'];
    for(let i=0;i<p.nEng;i++){if(p.fire[i])L.push({t:nm[i]+' FIRE',lvl:2,id:'fire'+i});else if(p.engOK[i]===0)L.push({t:nm[i]+' OUT',lvl:1});else if(p.engOK[i]<1)L.push({t:nm[i]+' DEGRADED',lvl:1});}
    if(p.leak)L.push({t:'FUEL LEAK',lvl:1});if(p.hyd<1)L.push({t:'HYD FAIL',lvl:1});if(this.dmgRadar)L.push({t:'RADAR FAIL',lvl:1});if(this.dmgRwr)L.push({t:'RWR FAIL',lvl:1});this.dmg=L;}
  /* boom refuelling: hold the contact position behind and below the tanker with the door open */
  refuel(dt){const tk=this.tanker,a=this.ar,p=this.player;if(!tk)return;
    const cp=vadd(tk.pos,qrot(tk.q,v3(0,-7.5,30))),relW=vsub(p.pos,cp),rv=vsub(p.vel,tk.vel);
    a.rel=qrotInv(tk.q,relW);a.dist=vlen(relW);a.range=vdist(p.pos,tk.pos);const rel=a.rel;
    const body=qrotInv(tk.q,vsub(p.pos,tk.pos));if(Math.abs(body.x)<3.5&&Math.abs(body.y)<4&&Math.abs(body.z)<23||Math.abs(body.x)<21&&Math.abs(body.y)<2.5&&Math.abs(body.z+2)<5){p.die('התנגשות במתדלק');return;}
    if(!this.sys.arDoor||p.onGround){if(a.state==='contact')this.msg('מתדלק: ניתוק.');a.state='none';a.t=0;return;}
    const assist=this.diff==='hard'?0:1;
    if(a.state!=='contact'){
      if(a.dist<700&&!a.called){a.called=true;this.msg('מתדלק: רואה אותך. התקרב לעמדת המגע, מאחורי הזנב ומתחתיו.');}
      if(Math.abs(rel.x)<5&&Math.abs(rel.y)<4&&Math.abs(rel.z)<7&&vlen(rv)<7){a.t+=dt;if(a.t>1.5){a.state='contact';a.full=false;this.msg('מתדלק: מגע. דלק זורם.');this.events.push({type:'contact'});}}else a.t=0;
      if(assist&&a.dist<28)p.vel=vadd(p.vel,vadd(vmul(rv,-1.1*dt),vmul(relW,-0.22*dt)));
    }else{
      if(Math.abs(rel.x)>8||Math.abs(rel.y)>6.5||Math.abs(rel.z)>11){a.state='none';a.t=0;this.msg('מתדלק: ניתוק. חזור לעמדה.');return;}
      if(assist)p.vel=vadd(p.vel,vadd(vmul(rv,-2.2*dt),vmul(relW,-0.5*dt)));
      const q=Math.min(p.t.fuelMax-p.fuel,32*dt);p.fuel+=q;a.taken+=q;
      if(p.t.fuelMax-p.fuel<1&&!a.full){a.full=true;this.msg('מתדלק: מלא. סגור דלת תדלוק והתנתק.');}
    }}
  /* trigger fires the gun; pickle (weapon release) sends the selected missile or bomb. Nothing leaves the jet with master arm SAFE. */
  trigger(gun,pickle,dt){
    const w=this.w,p=this.player;if(!p.alive){this.pickHeld=false;return;}
    if(!this.arm||!this.power){if((gun||pickle&&!this.pickHeld)&&this.time-(this.safeT??-9)>1.2){this.safeT=this.time;this.events.push({type:'safe'});}this.pickHeld=pickle;return;}
    if(gun&&!p.onGround){this.gunT-=dt;while(this.gunT<=0&&w.gun>0){this.gunT+=0.02;w.gun=Math.max(0,w.gun-2);this.bullet(p,1030);this.events.push({type:'gun'});}if(this.gunT<0)this.gunT=0;}
    if(!pickle){this.pickHeld=false;return;}
    if(this.pickHeld)return;this.pickHeld=true;
    if(p.onGround||w.sel==='GUN'){this.events.push({type:'deny'});return;}
    if(w.sel==='AIM120'){if(this.lock&&this.lock.side===0)this.events.push({type:'iff'});else if(w.aim120>0&&this.lock){this.launch(MSL.AIM120,p,this.lock);w.aim120--;this.stats.shots++;}else this.events.push({type:'deny'});}
    else if(w.sel==='PYTHON'){if(w.python>0&&this.irTgt){this.launch(MSL.PYTHON5,p,this.irTgt);w.python--;this.stats.shots++;}else this.events.push({type:'deny'});}
    else if(w.sel==='SPICE'&&this.plane.bomb.arm){const b=this.bombSol();if(w.spice>0&&b&&b.ok){this.launch(MSL.ARM,p,this.gtgt);w.spice--;this.stats.shots++;this.syncStores();}else this.events.push({type:'deny'});}
    else if(w.sel==='SPICE'){const b=this.bombSol();if(w.spice>0&&b&&b.ok){this.bombs.push(new Bomb(p,this.gtgt,vadd(p.pos,vmul(qrot(p.q,UP),-2)),p.vel,this.plane.bomb));w.spice--;this.stats.shots++;this.events.push({type:'release'});}else this.events.push({type:'deny'});}
    this.syncStores();}
  /* emergency jettison of the air-to-ground stores */
  jettison(){const w=this.w,p=this.player;if(!p.alive||p.onGround||!w.spice)return false;w.spice=0;this.gtgt=null;this.syncStores();this.events.push({type:'release'});this.msg('בקר: קיבלתי, השלכת את חימוש האוויר־קרקע.');return true;}
  wingCmd(c){const w=this.wing;if(!w||!w.ac.alive){this.msg('אין מספר שתיים במשימה הזאת.');return;}
    if(c==='attack'){const T=this.w.sel==='SPICE'?this.gtgt:(this.lock||this.irTgt);if(!T||T.side===0){this.msg('שתיים: אין לי מטרה. נעל מטרה ותן פקודה שוב.');return;}w.mode='attack';w.tgt=T;this.msg('שתיים: קיבלתי, תוקף את המטרה שלך.');}
    else if(c==='cover'){w.mode='cover';w.tgt=null;this.msg('שתיים: קיבלתי, מחפש ותוקף חופשי.');}
    else{w.mode='form';w.tgt=null;this.msg('שתיים: חוזר למבנה.');}}
  /* targeting pod: sees the selected ground target unless terrain or the aircraft's own body is in the way */
  podSees(g){const p=this.player;if(!g||!g.alive||!p.alive||!this.power)return false;const r=vsub(g.pos,p.pos),R=vlen(r),d=qrotInv(p.q,r);
    return R<46000&&d.y/R<0.26&&this.los(p.pos,vadd(g.pos,v3(0,6,0)));}
  lasing(g){return g===this.gtgt&&this.podSees(g);}
  /* leaving the aircraft: the seat works anywhere except very low while descending fast or inverted */
  eject(){const p=this.player;if(!p.alive||this.over||this.ejected)return false;const up=qrot(p.q,UP);
    this.ejected={t:this.time,pos:{...p.pos},vel:vadd(p.vel,vmul(up,22)),safe:p.onGround?p.V<5||true:(p.agl+up.y*60+Math.min(0,p.vel.y)*2>25)};
    p.ctl.throttle=0;p.ctl.pitch=p.ctl.roll=p.ctl.yaw=0;this.autoStart=false;this.events.push({type:'eject'});return true;}
  bombSol(){const g=this.gtgt,p=this.player;if(!g||!g.alive)return null;
    if(this.plane.bomb.arm){const r=vsub(g.pos,p.pos),hd=Math.hypot(r.x,r.z),f=qrot(p.q,FWD),brg=Math.acos(clamp((f.x*r.x+f.z*r.z)/(Math.hypot(f.x,f.z)*hd||1),-1,1)),rmax=22000+Math.max(0,-r.y)*4.2+(p.V-200)*30,em=g.kind==='radar'&&this.sams.some(q=>q.radar===g&&q.search);
      return{hd,rmax,rmin:5000,brg,emit:em,ok:em&&hd<rmax&&hd>5000&&brg<40*D2R&&this.los(p.pos,vadd(g.pos,v3(0,15,0))),tof:hd/600};}const r=vsub(g.pos,p.pos),hd=Math.hypot(r.x,r.z),lg=this.plane.bomb.lgb,rmax=spiceRange(-r.y,p.V)*(lg?0.4:1);
    const f=qrot(p.q,FWD),brg=Math.acos(clamp((f.x*r.x+f.z*r.z)/(Math.hypot(f.x,f.z)*hd||1),-1,1));
    return{hd,rmax,rmin:2500,brg,ok:hd<rmax&&hd>2500&&brg<(lg?25:50)*D2R&&Math.abs(p.euler().roll)<1.05,tof:hd/250};}
  /* sensors */
  sensors(){
    const p=this.player,cs=[],on=this.radarOn,acm=this.radar.mode==='ACM';
    /* RWS scans +-60 degrees out to the radar horizon; ACM looks only close ahead and locks the first hostile by itself */
    if(on)for(const e of[...this.air,...this.friends]){if(!e.alive)continue;const r=vsub(e.pos,p.pos),R=vlen(r),d=qrotInv(p.q,r),az=Math.atan2(d.x,-d.z),el=Math.atan2(d.y,Math.hypot(d.x,d.z));
      if(Math.abs(az)<(acm?30:60)*D2R&&Math.abs(el)<(acm?45:50)*D2R&&R<(acm?18500:115000*Math.pow(e.rcs/5,0.25))&&this.los(p.pos,e.pos)&&!this.notched(p.pos,e,false))e.seenT=this.time;
      if(this.time-(e.seenT??-99)<2.5)cs.push({e,R,az,el,fr:e.side===0,id:this.ident(e,R),vel:e.vel});}
    cs.sort((a,b)=>a.R-b.R);this.contacts=cs;
    if(this.lock&&(!this.lock.alive||!cs.find(c=>c.e===this.lock)))this.lock=null;
    if(on&&acm&&!this.lock){const h=cs.find(c=>!c.fr);if(h){this.lock=h.e;this.events.push({type:'lock'});}}
    /* IR seeker */
    let ir=null;const f=qrot(p.q,FWD);
    const cone=(e,lim,rng)=>{const r=vsub(e.pos,p.pos),R=vlen(r);return e.alive&&R<rng&&Math.acos(clamp(vdot(r,f)/R,-1,1))<lim&&this.los(p.pos,e.pos)?R:0;};
    if(this.lock&&cone(this.lock,60*D2R,this.lock.type==='UAV'?7000:18000))ir=this.lock;
    else{let br=1e9;for(const e of this.air){const R=cone(e,22*D2R,e.type==='UAV'?6000:13000);if(R&&R<br){br=R;ir=e;}}}
    this.irTgt=ir;
    /* threats for RWR */
    const th=[];const rel=(pos)=>{const d=qrotInv(p.q,vsub(pos,p.pos));return Math.atan2(d.x,-d.z);};
    for(const ai of this.migAI)if(ai.ac.alive&&ai.track&&ai.tgt===p)th.push({sym:ai.sym,brg:rel(ai.ac.pos),lvl:ai.launching?2:1,R:vdist(ai.ac.pos,p.pos)});
    for(const q of this.sams)if(q.alive&&q.search)th.push({sym:q.sym,brg:rel(q.pos),lvl:q.inFlight.length?2:q.tracking?1:0,R:vdist(q.pos,p.pos)});
    let mw=null;
    for(const m of this.missiles)if(m.alive&&m.target===p&&!m.lost){const R=vdist(m.pos,p.pos);if(R<25000){th.push({sym:'M',brg:rel(m.pos),lvl:3,R});if(!mw||R<mw.R)mw={R,brg:rel(m.pos),decoy:!!m.decoy};}}
    this.threats=this.dmgRwr||!this.power?[]:th;this.mwarn=mw;
  }
  mission(){
    const p=this.player,f=this.flags,S=this.stats;
    if(this.ejected){if(this.time-this.ejected.t>7&&!this.over)this.over={win:false,title:'נטישה',reason:this.ejected.safe?'המושב פעל והמצנח נפתח. צוות חילוץ בדרך אליך.':'הנטישה בוצעה מחוץ למעטפת המושב.'};return;}
    if(!f.airborne&&!p.onGround&&p.agl>150){f.airborne=true;this.msg(this.missionId==='intercept'?'בקר: פטיש אחת, קלטתי אותך. כן נסע ומדפים למעלה, חמש את מערכת הנשק. פנה מזרחה לנקודה 1, הכטב"מים נמוכים, חפש אותם במכ"ם.':'בקר: פטיש אחת, קלטתי אותך. כן נסע ומדפים למעלה, חמש את מערכת הנשק. פנה לנקודה 1, ארבעה כטב"מי תקיפה נעים מערבה בגובה נמוך. רשאי אש.');}
    if(this.missionId==='train'){this.train();return;}
    if(this.missionId==='escort'){const live=this.strikers.filter(k=>k.ac.alive),left=this.ground.filter(g=>g.primary&&g.alive).length,lead=live[0]||this.strikers[0];
      if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק.');}
      if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
      const dT=Math.hypot(SITES.tgt.x-lead.ac.pos.x,SITES.tgt.z-lead.ac.pos.z);
      if(!this.migsActive&&dT<95000){this.migsActive=true;this.msg(`בקר: זוג ${this.foeName} עולה מול המבנה. הם הולכים על המובילים.`);}
      if(!f.wave2&&dT<45000){f.wave2=true;this.msg('בקר: זוג שני, מיג-21, ממריא מהצפון־מזרח.');}
      for(const ai of this.migAI)if(ai.wave===2&&!f.wave2)ai.hold=true;else ai.hold=false;
      const bombsOut=this.bombs.some(b=>b.alive);
      if(!live.length&&left&&!bombsOut){if(!this.over)this.over={win:false,title:'המבנה אבד',reason:`שני מטוסי התקיפה הופלו. הושמדו ${S.tgt} מתוך ${this.nPrimary} מטרות.`};return;}
      if(!left){this.wp=1;this.stopT+=0.5;if(this.stopT>4&&!this.over)this.over={win:live.length>0,title:live.length?'הליווי הצליח':'המטרות הושמדו, המבנה אבד',reason:`${live.length} מתוך 2 מטוסי תקיפה שרדו, ${S.mig} מטוסי אויב הופלו.`};}
      else if(this.strikers.every(k=>!k.ac.alive||k.phase==='out')&&!bombsOut){this.stopT+=0.5;if(this.stopT>6&&!this.over)this.over={win:false,title:'התקיפה לא הושלמה',reason:`הושמדו ${S.tgt} מתוך ${this.nPrimary} מטרות.`};}
      return;}
    if(this.missionId==='sead'||this.missionId==='convoy'){const sd=this.missionId==='sead',left=this.ground.filter(g=>g.primary&&g.alive).length;
      if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק.');}
      if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
      if(sd&&this.wp===0&&Math.hypot(this.wps[0].x-p.pos.x,this.wps[0].z-p.pos.z)<6000)this.wp=1;
      if(!f.sam&&this.sams.some(q=>q.tracking)){f.sam=true;this.msg(sd?'בקר: סוללה עוקבת אחריך. זה הזמן, היא משדרת. נעל ושגר.':'בקר: הסוללה שמלווה את השיירה עוקבת אחריך. היא קצרת טווח, הישאר מעל 15 קילומטר או השמד אותה.');}
      if(!sd){const lead=this.ground.find(g=>g.kind==='truck'&&g.alive);if(lead){this.wps[0].x=lead.pos.x;this.wps[0].z=lead.pos.z;}
        if(lead&&lead.pos.x<20000&&!this.over)this.over={win:false,title:'השיירה הגיעה ליעדה',reason:`הושמדו ${S.tgt} מתוך ${this.nPrimary} כלי רכב.`};}
      if(!f.winch&&!sd&&!f.w2&&this.w.spice===0&&left&&!this.bombs.length){f.w2=true;this.msg('בקר: נגמרו הפצצות. נשאר לך התותח, רד נמוך ותקוף מאחור.');}
      if(sd&&!f.w2&&this.w.spice===0&&left&&!this.missiles.some(m=>m.alive&&m.owner===p)){f.w2=true;this.stopT=0;}
      if(sd&&f.w2&&left&&!this.over){this.stopT+=0.5;if(this.stopT>20)this.over={win:false,title:'נגמר החימוש',reason:`שותקו ${S.tgt} מתוך ${this.nPrimary} סוללות.`};}
      if(left===0){this.wp=this.wps.length-1;this.stopT=(f.done?this.stopT:0)+0.5;f.done=true;if(this.stopT>3&&!this.over)this.over={win:true,title:sd?'ההגנה האווירית שותקה':'השיירה נעצרה',reason:sd?`כל ${this.nPrimary} הסוללות הושמדו.`:`כל ${this.nPrimary} כלי הרכב הושמדו.`};}
      return;}
    if(this.missionId==='intercept'){
      if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק.');}
      if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
      for(const d of this.drones)if(d.leaked&&!d.counted){d.counted=true;S.leak++;this.msg(d.type==='CM'?'בקר: טיל שיוט חדר! ההגנה האווירית מנסה ליירט.':'בקר: כטב"ם חדר את קו ההגנה.');}
      const cm=this.drones.filter(d=>d.type==='CM'&&d.alive);
      if(!f.cm&&cm.some(d=>d.pos.x<115000)){f.cm=true;this.msg('בקר: שני טילי שיוט ממזרח, מהירים ונמוכים מאוד. יירט אותם מהחזית, אין זמן למרדף.');}
      if(this.drones.every(d=>!d.alive)){this.wp=1;this.stopT+=0.5;if(this.stopT>3&&!this.over){const win=S.leak<=2;
        this.over={win,title:win?'היירוט הושלם':'ההגנה נפרצה',reason:`הופלו ${S.uav} מתוך ${this.nDrone} איומים, ${S.leak} חדרו.`};}}
      return;}
    if(this.missionId==='tanker'){const k=this.tanker,a=this.ar;this.wps[0].x=k.pos.x;this.wps[0].z=k.pos.z;
      if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
      if(p.fuel<=0&&!this.over)this.over={win:false,title:'נגמר הדלק',reason:'לא הספקת להתחבר למתדלק.'};
      if(a.taken>=1500&&a.state==='none'&&!this.sys.arDoor){this.stopT+=0.5;if(this.stopT>2&&!this.over)this.over={win:true,title:'התדלוק הושלם',reason:`קיבלת ${Math.round(a.taken).toLocaleString('en')} ק"ג דלק והתנתקת בבטחה.`};}
      return;}
    if(this.missionId==='duel'){
      if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק.');}
      if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
      if(this.migs.every(m=>!m.alive)){this.wp=1;this.stopT+=0.5;if(this.stopT>3&&!this.over)this.over={win:true,title:'ניצחון בקרב האוויר',reason:'כל מטוסי האויב הופלו.'};}
      return;}
    const wp=this.wps[this.wp],dwp=Math.hypot(wp.x-p.pos.x,wp.z-p.pos.z);
    const uavLeft=this.drones.filter(d=>d.alive).length;
    for(const d of this.drones)if(d.leaked&&!d.counted){d.counted=true;S.leak++;this.msg('בקר: כטב"ם חדר את קו ההגנה. ההגנה האווירית תטפל בו.');}
    if(this.wp===0&&(uavLeft===0||dwp<5000&&p.pos.x>wp.x))this.wp=1;
    else if(this.wp===1&&dwp<9000){this.wp=2;this.msg('בקר: נקודת כניסה. SPICE מגיעה רחוק יותר ככל שמשחררים גבוה ומהר. בחר חימוש 4 ונעל מטרה.');}
    if(this.wp<3&&this.ground.every(g=>!g.primary||!g.alive)){this.wp=3;f.rtb=true;}
    if(!this.migsActive&&p.pos.x>THEATRE.cap[0]+8000){this.migsActive=true;this.msg(`בקר: זהירות, זוג ${this.foeName} פונה אליך ממזרח.`);}
    if(!f.sam&&this.sams.some(q=>q.tracking)){f.sam=true;this.msg('בקר: סוללת נ"מ עוקבת אחריך. טווח יירוט כ-45 ק"מ ממנה. שקול להשמיד את המכ"ם מרחוק.');}
    if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק. חזור לבסיס, או פתח דלת תדלוק לקבלת כיוון אל המתדלק.');}
    if(!f.winch&&f.airborne&&this.w.spice===0&&!f.rtb&&!this.bombs.length){f.winch=true;this.wp=3;this.msg('בקר: נגמר החימוש לקרקע. חזור לבסיס.');}
    if(!p.alive){if(!this.over){this.over={win:false,title:'המטוס אבד',reason:p.crash};}return;}
    if(p.onGround&&f.airborne&&p.wasAir){
      S.sink=p.touchSink;if(!f.touch){f.touch=true;this.msg('מגדל: נגיעה. בלמים.');}
      if(p.V<2){this.stopT+=0.5;if(this.stopT>1.5){const all=S.tgt===3;
        this.over={win:all,title:all?'המשימה הושלמה':'נחיתה לפני השלמת המשימה',reason:all?'כל מטרות אתר השיגור הושמדו והמטוס חזר בשלום.':`הושמדו ${S.tgt} מתוך 3 מטרות.`};}}
    }
  }
  /* guided first flight: one small task at a time, each acknowledged by the instructor */
  train(){const p=this.player,f=this.flags,fw=qrot(p.q,FWD),hd=(Math.atan2(fw.x,-fw.z)*R2D+360)%360;
    if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
    const tgt=(d)=>{const a=Math.atan2(fw.x,-fw.z),t=new Drone(p.pos.x+Math.sin(a)*d,Math.max(p.pos.y-300,terrainH(p.pos.x,p.pos.z)+900),p.pos.z-Math.cos(a)*d,0);t.orbit=true;t.spd=45;this.drones.push(t);this.air.push(t);this.events.push({type:'spawn',e:t});return t;};
    const S=[
      ['',()=>p.pos.y>6096],
      ['מדריך: יפה. עכשיו הטה את הסטיק שמאלה, משוך בעדינות ופנה לכיוון צפון, שלוש שש אפס. הכיוון מופיע בראש התצוגה העילית.',()=>Math.min(hd,360-hd)<8&&Math.abs(p.euler().roll)<0.5],
      ['מדריך: מצוין. שמתי לך כטב"ם מטרה מלפנים, שמונה מייל. חפש אותו במסך המכ"ם ונעל עליו.',()=>this.lock&&this.lock.type==='UAV',()=>{f.t1=tgt(15000);}],
      ['מדריך: נעול. חמש את מערכת הנשק, ודא שנבחר טיל מכ"מי, וכשמופיע SHOOT לחץ על הפיקל.',()=>f.t1&&!f.t1.alive],
      ['מדריך: הפלה. מטרה שנייה לפניך, קרובה. בחר תותח, התקרב עד שהיא גדולה בכוונת, ולחץ על ההדק.',()=>f.t2&&!f.t2.alive,()=>{f.t2=tgt(5000);}],
      ['מדריך: פגיעה יפה. דבר אחרון: נצור את הנשק והורד את המצערת לשיוט.',()=>!this.arm&&p.ctl.throttle<0.9]];
    f.step=f.step||0;const st=S[f.step];
    if(st&&st[1]()){f.step++;const n=S[f.step];if(n){this.msg(n[0]);if(n[2])n[2]();}else{this.msg('מדריך: זהו, סיימת את ההדרכה. אתה מוכן למשימה אמיתית.');f.done=true;}}
    this.trainStep=f.step;this.trainN=S.length;
    if(f.done){this.stopT+=0.5;if(this.stopT>5&&!this.over)this.over={win:true,title:'ההדרכה הושלמה',reason:'טיפוס, פנייה, נעילה, שיגור טיל, תותח ונצירה.'};}}
  step(dt){
    this.time+=dt;const p=this.player;
    this.systems(dt);p.step(dt);for(const k of this.friends)if(k.type==='TANKER')k.step(dt);
    for(const ai of this.migAI)ai.update(dt,this);
    for(const m of this.migs){m.step(dt);if(!m.alive&&m.crash&&m.crash!=='shot'){m.crash='shot';this.killAir(Object.assign(m,{alive:true}));}}
    for(const d of this.drones)d.step(dt);
    for(const q of this.sams)q.update(dt,this);if(this.wing)this.wing.update(dt,this);for(const k of this.strikers)k.update(dt,this);
    for(const g of this.ground)if(g.alive&&g.kind==='truck'){g.pos.x+=g.vel.x*dt;g.pos.z+=g.vel.z*dt;g.pos.y=terrainH(g.pos.x,g.pos.z);}
    for(const m of this.missiles)if(m.alive)m.step(dt,this);
    for(const b of this.bombs)if(b.alive)b.step(dt,this);
    for(const b of this.bullets){b.t+=dt;const np=vadd(b.pos,vmul(b.vel,dt));b.vel.y-=G0*dt;
      const tg=b.owner===p?this.air:[p];
      for(const e of tg){if(!e.alive)continue;const r=vsub(e.pos,b.pos);if(Math.abs(r.x)+Math.abs(r.y)+Math.abs(r.z)>120)continue;
        const sv=vsub(np,b.pos),tt=clamp(vdot(r,sv)/vdot(sv,sv),0,1);
        if(vdist(vadd(b.pos,vmul(sv,tt)),e.pos)<(e.type==='UAV'?5:8)){b.t=9;this.events.push({type:'spark',pos:e.pos});
          if(e===p)this.hurt('gun');else{e.hp-=e.type==='UAV'?1:10;if(e.hp<=0){this.stats.gunKill=(this.stats.gunKill||0)+1;this.events.push({type:'boom',pos:e.pos,size:1});this.killAir(e);}}}}
      if(b.owner===p&&b.t<9)for(const g of this.ground){if(!g.alive||g.kind!=='truck')continue;const r=vsub(g.pos,b.pos);if(Math.abs(r.x)+Math.abs(r.y)+Math.abs(r.z)>140)continue;
        const sv=vsub(np,b.pos),tt=clamp(vdot(r,sv)/vdot(sv,sv),0,1);if(vdist(vadd(b.pos,vmul(sv,tt)),vadd(g.pos,v3(0,1.5,0)))<7){b.t=9;this.events.push({type:'spark',pos:g.pos});if(--g.hp<=0){this.events.push({type:'boom',pos:g.pos,size:1.5,ground:true});this.killGround(g);}}}
      b.pos=np;if(b.t<9&&np.y<terrainH(np.x,np.z))b.t=9;}
    if(this.bullets.length&&this.bullets[0].t>2.2)this.bullets=this.bullets.filter(b=>b.t<=2.2);
    this.missiles=this.missiles.filter(m=>{if(!m.alive&&m.result!=='hit'&&!m.done){m.done=true;if(m.result==='ground')this.events.push({type:'boom',pos:m.pos,size:0.6,ground:true});}return m.alive;});
    this.bombs=this.bombs.filter(b=>b.alive);
    this.tS+=dt;if(this.tS>=0.2){this.tS=0;this.sensors();}
    this.tM+=dt;if(this.tM>=0.5){this.tM=0;this.mission();}
    this.tD+=dt;if(this.tD>=0.6){this.tD=0;const s=this.w.sel,T=s==='AIM120'?this.lock:s==='PYTHON'?this.irTgt:null;
      this.dlz=T&&p.alive?launchZone(s==='AIM120'?MSL.AIM120:MSL.PYTHON5,p.pos,p.vel,T.pos,T.vel):null;}
  }
}
const RAAM={StrikerAI,THEATRE,setTheatre,WingAI,DIFF,PLANES,PARK,Tanker,G0,D2R,R2D,KT,FT,NM,clamp,lerp,sstep,v3,vadd,vsub,vmul,vdot,vcross,vlen,vnorm,vdist,qmul,qrot,qrotInv,qaxis,qeuler,FWD,UP,RIGHT,atmo,TER,SITES,RWY,buildTerrain,terrainSteps,terrainH,TYPES,Aircraft,apSteer,MSL,Missile,flyout,launchZone,SPICE,spiceRange,Bomb,Drone,MigAI,SamSite,World};
if(typeof module!=='undefined')module.exports=RAAM;
