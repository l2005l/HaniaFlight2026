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
const RWY={x1:-1350,x2:1350,half:30};
function hash2(i,j){const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n);}
function vnoise(x,z){const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),w=fz*fz*(3-2*fz);
  return lerp(lerp(hash2(i,j),hash2(i+1,j),u),lerp(hash2(i,j+1),hash2(i+1,j+1),u),w);}
function fbm(x,z){let a=1,f=1,s=0,t=0;for(let o=0;o<5;o++){s+=a*vnoise(x*f,z*f);t+=a;a*=0.5;f*=2.03;}return s/t;}
function rawH(x,z){
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
  F16I:{name:'F-16I',S:27.87,mEmpty:10200,fuelMax:5400,Tmil:79e3,Tab:129.7e3,CLa:4.1,aStall:27*D2R,CD0:0.0235,K:0.117,nMax:9,gearH:1.9,pMax:5.0,rcs:4,hp:80},
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
    this.alive=true;this.hp=this.t.hp;this.rcs=this.t.rcs;this.g=1;this.alpha=0;this.beta=0;this.mach=0;this.V=o.speed||0;
    this.time=0;this.crash=null;this.agl=1000;this.ff=0;this.thrust=0;this.touchSink=0;this.wasAir=!this.onGround;this.lastCM=-99;}
  get mass(){return this.t.mEmpty+this.fuel+this.storeMass;}
  euler(){const f=qrot(this.q,FWD),r=qrot(this.q,RIGHT),u=qrot(this.q,UP);
    return{hdg:(Math.atan2(f.x,-f.z)+2*Math.PI)%(2*Math.PI),pitch:Math.asin(clamp(f.y,-1,1)),roll:Math.atan2(-r.y,u.y)};}
  die(why){if(!this.alive)return;this.alive=false;this.crash=why;}
  step(dt){
    if(!this.alive)return;const t=this.t,c=this.ctl;this.time+=dt;
    const fwd=qrot(this.q,FWD),up=qrot(this.q,UP),rt=qrot(this.q,RIGHT);
    const at=atmo(this.pos.y),V=vlen(this.vel),mach=V/at.a,qbar=0.5*at.rho*V*V,m=this.mass;
    /* engines */
    const lever=this.fuel>0?clamp(c.throttle,0,1.3):0;
    this.eng+=clamp(lever-this.eng,-dt*0.8,dt*0.6);
    const sig=Math.pow(at.rho/1.225,0.72);
    const Tm=t.Tmil*sig*(1-0.25*mach+0.13*mach*mach);
    let Ta=t.Tab*sig*(1+0.2*mach*mach);if(mach>2.2)Ta*=Math.max(0.3,1-(mach-2.2)*1.5);
    const mil=Math.min(this.eng,1),ab=clamp((this.eng-1)/0.3,0,1);
    let T=Tm*(0.025+0.975*mil);if(ab>0)T=lerp(Tm,Math.max(Ta,Tm),ab);
    const ff=this.fuel>0?Math.max(0.22,Tm*mil*2.15e-5)+(ab>0?(T-Tm)*9e-5+ab:0):0;
    this.fuel=Math.max(0,this.fuel-ff*dt);this.ff=ff;this.thrust=T;
    /* animate gear / brake */
    this.gearPos=clamp(this.gearPos+(this.gear?dt:-dt)/3,0,1);
    this.brakePos=clamp(this.brakePos+(c.brake?dt:-dt)*2,0,1);
    /* aero angles */
    const vb=qrotInv(this.q,this.vel);let alpha=0,beta=0;
    if(V>2){alpha=Math.atan2(-vb.y,-vb.z);beta=Math.asin(clamp(vb.x/V,-1,1));}
    const xa=Math.abs(alpha),a1=t.aStall*0.75;
    const fm=mach<0.9?1:mach<1.5?lerp(1,0.72,(mach-0.9)/0.6):lerp(0.72,0.5,clamp(mach-1.5,0,1));
    const cl=clCurve(alpha,t)*fm+(this.flaps?0.3*Math.cos(alpha):0);
    const wave=mach<0.85?0:mach<1.05?0.031*(mach-0.85)/0.2:lerp(0.031,0.018,clamp((mach-1.05)/1.4,0,1));
    const K=mach<0.9?t.K:lerp(t.K,0.36,clamp((mach-0.9)/1.3,0,1));
    const cd=t.CD0+this.storeCD+wave+K*cl*cl+this.gearPos*0.022+(this.flaps?0.035:0)+this.brakePos*0.07+1.3*Math.sin(xa)**2*sstep(xa,a1,a1+0.25);
    const vhat=V>0.5?vmul(this.vel,1/V):fwd;
    let ld=vcross(rt,vhat);const ll=vlen(ld);ld=ll>1e-4?vmul(ld,1/ll):up;
    const qS=qbar*t.S;
    let F=vmul(ld,qS*cl);F=vadd(F,vmul(vhat,-qS*cd));F=vadd(F,vmul(rt,-qS*1.1*clamp(beta,-0.6,0.6)));F=vadd(F,vmul(fwd,T));
    const nz=vdot(F,up)/(m*G0);
    /* control augmentation: stick commands pitch rate, limited by g and alpha */
    const A=clamp(qbar/5000,0,1)*(this.onGround?sstep(V,45,70):1);
    const Vc=Math.max(V,40),s=clamp(c.pitch,-1,1);
    let qc=s>=0?s*Math.min(0.5,(t.nMax-1)*G0/Vc*1.15+0.03):s*Math.min(0.35,4*G0/Vc);
    const dadn=m*G0/Math.max(1e3,t.CLa*fm*qS),qfp=(nz*G0-G0*up.y)/Vc,aLim=t.aStall-2*D2R;
    if(!this.onGround){
      qc=Math.min(qc,qfp+4*dadn*(t.nMax-nz),qfp+2.5*(aLim-alpha));
      qc=Math.max(qc,qfp+4*dadn*(-3-nz),qfp+2.5*(-0.26-alpha));}
    let qt=A*qc+(1-A)*clamp(-1.2*alpha,-0.6,0.6);
    if(xa>t.aStall)qt-=Math.sign(alpha)*(xa-t.aStall);
    const pmax=t.pMax*clamp(qbar/14000,0.12,1)*(1-0.55*clamp(xa/0.5,0,1));
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
  constructor(owner,target,pos,vel){this.owner=owner;this.target=target;this.pos={...pos};this.vel={...vel};this.t=0;this.alive=true;this.kind='bomb';this.aim={x:target.pos.x+(Math.random()-0.5)*5,y:target.pos.y,z:target.pos.z+(Math.random()-0.5)*5};}
  step(dt,W){
    this.t+=dt;const at=atmo(this.pos.y);let sp=vlen(this.vel),vh=vmul(this.vel,1/sp);
    const r=vsub(this.aim,this.pos),hd=Math.hypot(r.x,r.z),elev=Math.atan2(r.y,hd);
    let nload=Math.max(0,Math.cos(Math.asin(clamp(vh.y,-1,1))));
    if(this.t>0.8){let des;
      if(elev<-0.62||hd<1200)des=vnorm(r);
      else{const g=sp>235?-0.02:-1/SPICE.ld-clamp((170-sp)*0.004,0,0.25),ch=Math.cos(g);des=v3(r.x/hd*ch,Math.sin(g),r.z/hd*ch);}
      const ang=Math.acos(clamp(vdot(vh,des),-1,1));
      if(ang>1e-4){const step=Math.min(ang,3.5*G0/sp*dt),ax=vnorm(vcross(vh,des)),qq=qaxis(ax.x,ax.y,ax.z,step);vh=vnorm(qrot(qq,vh));nload+=step/dt*sp/G0*0.6;}
    }else{vh=vnorm(vadd(vh,v3(0,-G0*dt/sp,0)));nload=0;}
    const vs=160*Math.sqrt(1.225/at.rho)/1.6,dr=G0/SPICE.ld*0.5*((sp/vs)**2+nload*nload*(vs/sp)**2);
    sp=Math.max(60,sp+(-G0*vh.y-dr)*dt);
    this.vel=vmul(vh,sp);this.pos=vadd(this.pos,vmul(this.vel,dt));
    if(this.pos.y<=terrainH(this.pos.x,this.pos.z)+1){this.alive=false;if(W.onBomb)W.onBomb(this);}
  }
}
/* ---------- attack drone ---------- */
class Drone{
  constructor(x,y,z,i){this.pos=v3(x,y,z);this.vel=v3(-51,0,0);this.alive=true;this.hp=2;this.kind='air';this.type='UAV';this.side=1;this.rcs=0.08;this.t=i*7;this.cruise=y;this.leaked=false;this.q=qeuler(-Math.PI/2,0,0);this.eng=0;}
  step(dt){if(!this.alive)return;this.t+=dt;const tg=Math.max(this.cruise,terrainH(this.pos.x-600,this.pos.z)+420);
    this.vel=v3(-51,clamp((tg-this.pos.y)*0.06,-4,7),5*Math.sin(this.t*0.07));this.pos=vadd(this.pos,vmul(this.vel,dt));
    if(this.pos.x<16000){this.alive=false;this.leaked=true;}}
  die(){this.alive=false;}
}
/* ---------- enemy fighter AI ---------- */
class MigAI{
  constructor(ac,home,idx){this.ac=ac;this.home=home;this.idx=idx;this.state='cap';this.r27=2;this.r73=2;this.cd=6+idx*5;this.cmT=0;this.track=false;this.gunT=0;this.capA=idx*Math.PI;this.shot=null;this.launching=false;}
  update(dt,W){
    const ac=this.ac;if(!ac.alive)return;const pl=W.player;this.cd-=dt;
    const r=vsub(pl.pos,ac.pos),R=vlen(r),los=vmul(r,1/R),fwd=qrot(ac.q,FWD),off=Math.acos(clamp(vdot(fwd,los),-1,1));
    this.track=pl.alive&&W.migsActive&&R<75000&&off<55*D2R&&W.los(ac.pos,pl.pos)&&!W.notched(ac.pos,pl,false);
    this.launching=!!(this.shot&&this.shot.alive&&!this.shot.lost);
    let thr=null,td=1e9;for(const m of W.missiles)if(m.alive&&m.target===ac&&!m.lost&&!m.decoy){const d=vdist(m.pos,ac.pos);if(d<td){td=d;thr=m;}}
    let dir,spd=250;const flat=(x,z,dy)=>{const l=Math.hypot(x,z)||1;return vnorm(v3(x/l,dy,z/l));};
    if(thr&&td<13000&&(thr.active||thr.s.seeker==='ir')){
      const ml=vsub(ac.pos,thr.pos);let b=vcross(ml,UP);if(vdot(b,fwd)<0)b=vmul(b,-1);dir=flat(b.x,b.z,ac.agl>1500?-0.15:0.05);spd=420;
      this.cmT-=dt;if(this.cmT<=0){this.cmT=1.1;W.dispense(ac);}this.state='defend';
    }else if(!W.migsActive||!pl.alive){
      this.capA+=dt*0.028;const tx=this.home.x+Math.cos(this.capA)*9000,tz=this.home.z+Math.sin(this.capA)*9000;
      dir=flat(tx-ac.pos.x,tz-ac.pos.z,clamp((this.home.y-ac.pos.y)/3000,-0.3,0.3));spd=230;this.state='cap';
    }else if(R>11000){
      if(this.launching){const h=Math.atan2(los.x,-los.z)+(this.idx?1:-1)*40*D2R;dir=flat(Math.sin(h),-Math.cos(h),clamp(los.y,-0.2,0.2));spd=290;this.state='crank';}
      else{const aim=vadd(pl.pos,vmul(pl.vel,R/700*0.6)),a=vsub(aim,ac.pos);dir=flat(a.x,a.z,clamp(a.y/Math.hypot(a.x,a.z),-0.3,0.3));spd=330;this.state='intercept';
        if(this.track&&R<36000&&this.r27>0&&this.cd<=0&&off<25*D2R){this.shot=W.launch(MSL.R27,ac,pl);this.r27--;this.cd=16;}}
    }else{
      dir=vnorm(vsub(vadd(pl.pos,vmul(pl.vel,R/900)),ac.pos));spd=ac.V<170?500:300;this.state='merge';
      if(ac.V<130&&ac.agl>1500)dir=flat(dir.x,dir.z,-0.25);
      if(R<8500&&R>900&&off<25*D2R&&this.r73>0&&this.cd<=0&&W.los(ac.pos,pl.pos)){W.launch(MSL.R73,ac,pl);this.r73--;this.cd=10;}
      this.gunT-=dt;if(R<750&&off<3.5*D2R&&this.gunT<=0){this.gunT=0.06;W.bullet(ac,870);}
    }
    const gh=terrainH(ac.pos.x+ac.vel.x*6,ac.pos.z+ac.vel.z*6);
    if(ac.pos.y+Math.min(0,ac.vel.y)*6<gh+600)dir=flat(fwd.x,fwd.z,0.6);
    apSteer(ac,dir,W.d.pull);ac.ctl.throttle=ac.V<spd?1.3:ac.V<spd+30?0.9:0.35;ac.ctl.brake=ac.V>spd+60;
  }
}
/* ---------- SAM battery ---------- */
class SamSite{
  constructor(radar){this.radar=radar;this.pos=radar.pos;this.side=1;this.kind='sam';this.left=8;this.cd=0;this.acq=0;this.tracking=false;this.search=false;this.inFlight=[];}
  get alive(){return this.radar.alive;}
  update(dt,W){
    if(!this.alive){this.tracking=this.search=false;return;}
    const pl=W.player,rp=vadd(this.pos,v3(0,18,0)),R=vdist(pl.pos,rp);
    const vis=pl.alive&&R<60000&&W.los(rp,pl.pos)&&!W.notched(rp,pl,true);
    this.acq=vis?Math.min(6,this.acq+dt):Math.max(0,this.acq-dt*2);this.search=vis;this.tracking=this.acq>4;
    this.cd-=dt;this.inFlight=this.inFlight.filter(m=>m.alive);
    if(this.tracking&&R<W.d.samR&&R>4000&&this.left>0&&this.cd<=0&&this.inFlight.length<2){
      const l=vnorm(vsub(pl.pos,rp)),d=vnorm(v3(l.x,Math.max(l.y,0.7),l.z));
      this.inFlight.push(W.launch(MSL.SAM,this,pl,vadd(rp,v3(40,4,30)),vmul(d,40)));this.cd=W.d.samCd;this.left--;}
  }
}
/* ---------- world / mission ---------- */
const DIFF={easy:{decoy:1.8,pull:0.6,samCd:17,samR:40000,samN:4,r27:1,cm:90,hp:220},
  normal:{decoy:1,pull:0.85,samCd:11,samR:45000,samN:8,r27:2,cm:60,hp:100},
  hard:{decoy:0.7,pull:1,samCd:8,samR:48000,samN:10,r27:2,cm:60,hp:100}};
/* player aircraft: airframe type, load-out and the bomb it carries */
const PLANES={
  F15I:{type:'F15I',name:'F-15I רעם',unit:'טייסת 69 · הפטישים',call:'פטיש',aim120:4,python:2,spice:4,bomb:{name:'SPICE-2000',mass:950,soft:55,hard:14},fuelRwy:8000,fuelAir:7800,base:300,eye:[0,1.15,-4.6],chase:[8,34]},
  F16I:{type:'F16I',name:'F-16I סופה',unit:'טייסת 107 · אבירי הזנב הכתום',call:'אביר',aim120:2,python:2,spice:4,bomb:{name:'SPICE-1000',mass:500,soft:38,hard:9},fuelRwy:5200,fuelAir:5000,base:250,eye:[0,1.0,-3.5],chase:[6.5,27]}};
class World{
  constructor(o={}){
    buildTerrain();this.time=0;this.real=true;this.diff=DIFF[o.diff]?o.diff:'normal';this.d=DIFF[this.diff];this.events=[];this.missiles=[];this.bombs=[];this.bullets=[];
    const pl=this.plane=PLANES[o.plane]||PLANES.F15I,duel=o.mission==='duel',air=o.start==='air'||duel;this.missionId=duel?'duel':'strike';this.call=pl.call;
    this.player=new Aircraft(pl.type,air?{x:duel?20000:9000,y:duel?6500:5500,z:0,hdg:Math.PI/2,pitch:0.055,speed:250,throttle:0.9,fuel:pl.fuelAir}
      :{x:RWY.x1+110,y:SITES.base.h+TYPES[pl.type].gearH,z:0,hdg:Math.PI/2,speed:0,throttle:0,gear:true,flaps:true,onGround:true,fuel:pl.fuelRwy});
    if(air)this.player.vel=v3(250,0,0);this.bingo=Math.round(pl.fuelRwy*0.22/100)*100;
    this.w={sel:'AIM120',aim120:pl.aim120,python:pl.python,gun:510,spice:duel?0:pl.spice,chaff:this.d.cm,flare:this.d.cm};this.player.hp=this.d.hp*TYPES[pl.type].hp/100;this.syncStores();
    this.wps=duel?[{n:'MERGE',x:62000,z:0,alt:6500},{n:'BASE',x:0,z:0,alt:1000}]
      :[{n:'CAP',x:40000,z:0,alt:6000},{n:'IP',x:62000,z:4000,alt:9000},{n:'TGT',x:SITES.tgt.x,z:SITES.tgt.z,alt:9000},{n:'BASE',x:0,z:0,alt:1000}];this.wp=0;
    this.drones=[];if(!duel)for(let i=0;i<4;i++)this.drones.push(new Drone(64000+i*2500,1500,-9000+i*6000,i));
    this.migs=[];this.migAI=[];const home=duel?v3(66000,6500,0):v3(158000,7500,18000);
    for(let i=0;i<2;i++){const m=new Aircraft('MIG29',duel?{side:1,x:home.x+i*2500,y:home.y+i*400,z:i?2600:-2600,hdg:-Math.PI/2,speed:250,fuel:3000,storeCD:0.002}
        :{side:1,x:home.x+i*3000,y:home.y+i*300,z:home.z+9000*(i?-1:1),hdg:i?Math.PI/2:-Math.PI/2,speed:230,fuel:3000,storeCD:0.002});
      this.migs.push(m);const ai=new MigAI(m,home,i);ai.r27=this.d.r27;this.migAI.push(ai);}
    this.air=[...this.drones,...this.migs];
    const G=(n,dx,dz,kind,primary,hp)=>{const s=kind==='radar'||kind==='launcher'?SITES.sam:SITES.tgt,x=s.x+dx,z=s.z+dz;return{name:n,kind,primary,hp,alive:true,side:1,pos:v3(x,terrainH(x,z),z),vel:v3()};};
    this.ground=duel?[]:[G('SAM RADAR',0,0,'radar',false,1),G('TEL-1',260,-140,'tel',true,1),G('TEL-2',-310,190,'tel',true,1),G('BUNKER',20,430,'bunker',true,1),
      G('LNCH',160,120,'launcher',false,1),G('LNCH',-170,90,'launcher',false,1),G('LNCH',10,-190,'launcher',false,1)];
    this.sam=new SamSite(duel?{alive:false,pos:v3(SITES.sam.x,SITES.sam.h,SITES.sam.z)}:this.ground[0]);this.sam.left=this.d.samN;
    this.arm=air;this.contacts=[];this.lock=null;this.gtgt=null;this.irTgt=null;this.dlz=null;this.migsActive=duel;
    this.stats={uav:0,leak:0,mig:0,tgt:0,sam:false,shots:0,start:air?'air':'runway'};this.over=null;this.flags={};this.tS=0;this.tM=0;this.tD=0;this.gunT=0;this.cmT=0;this.stopT=0;
    this.msg(duel?'בקר: פטיש אחת, זוג מיג-29 מולך, 45 קילומטר, באותו גובה. רשאי אש.':air?'בקר: פטיש אחת, אתה בדרך לנקודה 1. ארבעה כטב"מי תקיפה נעים מערבה בגובה נמוך. רשאי אש.':'מגדל חצרים: פטיש אחת, רשאי להמריא ממסלול 09. מבער מלא, הרמת אף ב-150 קשר.');
    if(air)this.flags.airborne=true;
  }
  msg(text){this.events.push({type:'msg',text:text.replace(/פטיש אחת/g,this.call+' אחת').replace(/SPICE/g,this.plane.bomb.name)});}
  syncStores(){const w=this.w,p=this.player;p.storeMass=w.aim120*157+w.python*105+w.spice*this.plane.bomb.mass+this.plane.base;p.storeCD=(w.aim120+w.python)*0.0005+w.spice*0.0022;}
  los(a,b){for(let i=1;i<16;i++){const t=i/16;if(terrainH(lerp(a.x,b.x,t),lerp(a.z,b.z,t))>lerp(a.y,b.y,t))return false;}return true;}
  notched(obs,tgt,ground){if(!(ground||obs.y>tgt.pos.y+200))return false;const l=vnorm(vsub(tgt.pos,obs));
    return Math.abs(vdot(tgt.vel,l))<(this.time-(tgt.lastCM??-99)<4?85:30);}
  supports(owner,T){if(owner===this.player)return this.lock===T;if(owner===this.sam)return this.sam.alive&&this.sam.tracking;
    const ai=this.migAI.find(a=>a.ac===owner);return !!(ai&&owner.alive&&ai.track);}
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
    if(T===this.player){T.die('נפגעת מטיל '+m.s.name);return;}
    this.killAir(T);}
  killAir(T){if(!T.alive)return;T.alive=false;T.crash='shot';this.events.push({type:'kill',e:T});
    if(T.type==='UAV'){this.stats.uav++;const left=this.drones.filter(d=>d.alive).length;this.msg(left?`בקר: פגיעה. כטב"ם הופל, נותרו ${left}.`:'בקר: כל הכטב"מים טופלו. המשך לנקודת הכניסה.');}
    else{this.stats.mig++;this.msg(this.migs.some(x=>x.alive)?'בקר: הפלה! מיג אחד ירד. השני עדיין באוויר.':'בקר: שני המיגים הופלו. השמיים נקיים.');}
    if(this.lock===T)this.lock=null;}
  onBomb(b){
    this.events.push({type:'boom',pos:b.pos,size:5,ground:true});
    for(const g of this.ground){if(!g.alive)continue;const d=vdist(g.pos,b.pos);
      if(d<(g.kind==='bunker'?this.plane.bomb.hard:this.plane.bomb.soft)){g.alive=false;this.events.push({type:'gkill',g});
        if(g.primary){this.stats.tgt++;const left=this.ground.filter(x=>x.primary&&x.alive).length;this.msg(left?`בקר: פגיעה טובה ב-${g.name}. נותרו ${left} מטרות.`:'בקר: כל המטרות הושמדו. חזור לבסיס לנחיתה.');}
        else if(g.kind==='radar'){this.stats.sam=true;this.msg('בקר: מכ"ם הסוללה הושמד. איום הנ"מ הוסר.');}
        if(this.gtgt===g)this.gtgt=null;}}}
  /* player actions */
  select(s){this.w.sel=s;this.dlz=null;if(s==='SPICE'&&!this.gtgt)this.cycleTarget();}
  cycleTarget(){
    if(this.w.sel==='SPICE'){const gs=this.ground.filter(g=>g.alive&&g.kind!=='launcher');if(!gs.length){this.gtgt=null;return;}
      this.gtgt=gs[(gs.indexOf(this.gtgt)+1)%gs.length];return;}
    const cs=this.contacts;if(!cs.length){this.lock=null;return;}
    if(!this.lock){let b=cs[0],ba=9;for(const c of cs){const a=Math.hypot(c.az,c.el);if(a<ba){ba=a;b=c;}}this.lock=b.e;}
    else this.lock=cs[(cs.findIndex(c=>c.e===this.lock)+1)%cs.length].e;this.dlz=null;}
  unlock(){this.lock=null;this.dlz=null;}
  /* trigger fires the gun; pickle (weapon release) sends the selected missile or bomb. Nothing leaves the jet with master arm SAFE. */
  trigger(gun,pickle,dt){
    const w=this.w,p=this.player;if(!p.alive){this.pickHeld=false;return;}
    if(!this.arm){if((gun||pickle&&!this.pickHeld)&&this.time-(this.safeT??-9)>1.2){this.safeT=this.time;this.events.push({type:'safe'});}this.pickHeld=pickle;return;}
    if(gun&&!p.onGround){this.gunT-=dt;while(this.gunT<=0&&w.gun>0){this.gunT+=0.02;w.gun=Math.max(0,w.gun-2);this.bullet(p,1030);this.events.push({type:'gun'});}if(this.gunT<0)this.gunT=0;}
    if(!pickle){this.pickHeld=false;return;}
    if(this.pickHeld)return;this.pickHeld=true;
    if(p.onGround||w.sel==='GUN'){this.events.push({type:'deny'});return;}
    if(w.sel==='AIM120'){if(w.aim120>0&&this.lock){this.launch(MSL.AIM120,p,this.lock);w.aim120--;this.stats.shots++;}else this.events.push({type:'deny'});}
    else if(w.sel==='PYTHON'){if(w.python>0&&this.irTgt){this.launch(MSL.PYTHON5,p,this.irTgt);w.python--;this.stats.shots++;}else this.events.push({type:'deny'});}
    else if(w.sel==='SPICE'){const b=this.bombSol();if(w.spice>0&&b&&b.ok){this.bombs.push(new Bomb(p,this.gtgt,vadd(p.pos,vmul(qrot(p.q,UP),-2)),p.vel));w.spice--;this.stats.shots++;this.events.push({type:'release'});}else this.events.push({type:'deny'});}
    this.syncStores();}
  /* emergency jettison of the air-to-ground stores */
  jettison(){const w=this.w,p=this.player;if(!p.alive||p.onGround||!w.spice)return false;w.spice=0;this.gtgt=null;this.syncStores();this.events.push({type:'release'});this.msg('בקר: קיבלתי, השלכת את חימוש האוויר־קרקע.');return true;}
  bombSol(){const g=this.gtgt,p=this.player;if(!g||!g.alive)return null;const r=vsub(g.pos,p.pos),hd=Math.hypot(r.x,r.z),rmax=spiceRange(-r.y,p.V);
    const f=qrot(p.q,FWD),brg=Math.acos(clamp((f.x*r.x+f.z*r.z)/(Math.hypot(f.x,f.z)*hd||1),-1,1));
    return{hd,rmax,rmin:2500,brg,ok:hd<rmax&&hd>2500&&brg<50*D2R&&Math.abs(p.euler().roll)<1.05,tof:hd/250};}
  /* sensors */
  sensors(){
    const p=this.player,cs=[];
    for(const e of this.air){if(!e.alive)continue;const r=vsub(e.pos,p.pos),R=vlen(r),d=qrotInv(p.q,r),az=Math.atan2(d.x,-d.z),el=Math.atan2(d.y,Math.hypot(d.x,d.z));
      if(Math.abs(az)<60*D2R&&Math.abs(el)<50*D2R&&R<115000*Math.pow(e.rcs/5,0.25)&&this.los(p.pos,e.pos)&&!this.notched(p.pos,e,false))e.seenT=this.time;
      if(this.time-(e.seenT??-99)<2.5)cs.push({e,R,az,el});}
    cs.sort((a,b)=>a.R-b.R);this.contacts=cs;
    if(this.lock&&(!this.lock.alive||!cs.find(c=>c.e===this.lock)))this.lock=null;
    /* IR seeker */
    let ir=null;const f=qrot(p.q,FWD);
    const cone=(e,lim,rng)=>{const r=vsub(e.pos,p.pos),R=vlen(r);return e.alive&&R<rng&&Math.acos(clamp(vdot(r,f)/R,-1,1))<lim&&this.los(p.pos,e.pos)?R:0;};
    if(this.lock&&cone(this.lock,60*D2R,this.lock.type==='UAV'?7000:18000))ir=this.lock;
    else{let br=1e9;for(const e of this.air){const R=cone(e,22*D2R,e.type==='UAV'?6000:13000);if(R&&R<br){br=R;ir=e;}}}
    this.irTgt=ir;
    /* threats for RWR */
    const th=[];const rel=(pos)=>{const d=qrotInv(p.q,vsub(pos,p.pos));return Math.atan2(d.x,-d.z);};
    for(const ai of this.migAI)if(ai.ac.alive&&ai.track)th.push({sym:'29',brg:rel(ai.ac.pos),lvl:ai.launching?2:1,R:vdist(ai.ac.pos,p.pos)});
    if(this.sam.alive&&this.sam.search)th.push({sym:'SA',brg:rel(this.sam.pos),lvl:this.sam.inFlight.length?2:this.sam.tracking?1:0,R:vdist(this.sam.pos,p.pos)});
    let mw=null;
    for(const m of this.missiles)if(m.alive&&m.target===p&&!m.lost){const R=vdist(m.pos,p.pos);if(R<25000){th.push({sym:'M',brg:rel(m.pos),lvl:3,R});if(!mw||R<mw.R)mw={R,brg:rel(m.pos),decoy:!!m.decoy};}}
    this.threats=th;this.mwarn=mw;
  }
  mission(){
    const p=this.player,f=this.flags,S=this.stats;
    if(!f.airborne&&!p.onGround&&p.agl>150){f.airborne=true;this.msg('בקר: פטיש אחת, קלטתי אותך. כן נסע ומדפים למעלה, חמש את מערכת הנשק. פנה לנקודה 1, ארבעה כטב"מי תקיפה נעים מערבה בגובה נמוך. רשאי אש.');}
    if(this.missionId==='duel'){
      if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק.');}
      if(!p.alive){if(!this.over)this.over={win:false,title:'המטוס אבד',reason:p.crash};return;}
      if(this.migs.every(m=>!m.alive)){this.wp=1;this.stopT+=0.5;if(this.stopT>3&&!this.over)this.over={win:true,title:'ניצחון בקרב האוויר',reason:'שני המיגים הופלו.'};}
      return;}
    const wp=this.wps[this.wp],dwp=Math.hypot(wp.x-p.pos.x,wp.z-p.pos.z);
    const uavLeft=this.drones.filter(d=>d.alive).length;
    for(const d of this.drones)if(d.leaked&&!d.counted){d.counted=true;S.leak++;this.msg('בקר: כטב"ם חדר את קו ההגנה. ההגנה האווירית תטפל בו.');}
    if(this.wp===0&&(uavLeft===0||dwp<5000&&p.pos.x>wp.x))this.wp=1;
    else if(this.wp===1&&dwp<9000){this.wp=2;this.msg('בקר: נקודת כניסה. SPICE מגיעה רחוק יותר ככל שמשחררים גבוה ומהר. בחר חימוש 4 ונעל מטרה.');}
    if(this.wp<3&&this.ground.every(g=>!g.primary||!g.alive)){this.wp=3;f.rtb=true;}
    if(!this.migsActive&&p.pos.x>48000){this.migsActive=true;this.msg('בקר: זהירות, זוג מיג-29 פונה אליך ממזרח. טווח כ-90 קילומטר.');}
    if(!f.sam&&this.sam.tracking){f.sam=true;this.msg('בקר: סוללת נ"מ עוקבת אחריך. טווח יירוט כ-45 ק"מ ממנה. שקול להשמיד את המכ"ם מרחוק.');}
    if(!f.bingo&&p.fuel<this.bingo){f.bingo=true;this.msg('בינגו דלק. חזור לבסיס.');}
    if(!f.winch&&f.airborne&&this.w.spice===0&&!f.rtb&&!this.bombs.length){f.winch=true;this.wp=3;this.msg('בקר: נגמר החימוש לקרקע. חזור לבסיס.');}
    if(!p.alive){if(!this.over){this.over={win:false,title:'המטוס אבד',reason:p.crash};}return;}
    if(p.onGround&&f.airborne&&p.wasAir){
      S.sink=p.touchSink;if(!f.touch){f.touch=true;this.msg('מגדל: נגיעה. בלמים.');}
      if(p.V<2){this.stopT+=0.5;if(this.stopT>1.5){const all=S.tgt===3;
        this.over={win:all,title:all?'המשימה הושלמה':'נחיתה לפני השלמת המשימה',reason:all?'כל מטרות אתר השיגור הושמדו והמטוס חזר בשלום.':`הושמדו ${S.tgt} מתוך 3 מטרות.`};}}
    }
  }
  step(dt){
    if(this.over&&!this.player.alive)dt*=1;this.time+=dt;const p=this.player;
    p.step(dt);
    for(const ai of this.migAI)ai.update(dt,this);
    for(const m of this.migs){m.step(dt);if(!m.alive&&m.crash&&m.crash!=='shot'){m.crash='shot';this.killAir(Object.assign(m,{alive:true}));}}
    for(const d of this.drones)d.step(dt);
    this.sam.update(dt,this);
    for(const m of this.missiles)if(m.alive)m.step(dt,this);
    for(const b of this.bombs)if(b.alive)b.step(dt,this);
    for(const b of this.bullets){b.t+=dt;const np=vadd(b.pos,vmul(b.vel,dt));b.vel.y-=G0*dt;
      const tg=b.owner===p?this.air:[p];
      for(const e of tg){if(!e.alive)continue;const r=vsub(e.pos,b.pos);if(Math.abs(r.x)+Math.abs(r.y)+Math.abs(r.z)>120)continue;
        const sv=vsub(np,b.pos),tt=clamp(vdot(r,sv)/vdot(sv,sv),0,1);
        if(vdist(vadd(b.pos,vmul(sv,tt)),e.pos)<(e.type==='UAV'?5:8)){b.t=9;this.events.push({type:'spark',pos:e.pos});
          if(e===p){p.hp-=14;if(p.hp<=0)p.die('נפגעת מאש תותח');}else{e.hp-=e.type==='UAV'?1:10;if(e.hp<=0){this.events.push({type:'boom',pos:e.pos,size:1});this.killAir(e);}}}}
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
const RAAM={DIFF,PLANES,G0,D2R,R2D,KT,FT,NM,clamp,lerp,sstep,v3,vadd,vsub,vmul,vdot,vcross,vlen,vnorm,vdist,qmul,qrot,qrotInv,qaxis,qeuler,FWD,UP,RIGHT,atmo,TER,SITES,RWY,buildTerrain,terrainSteps,terrainH,TYPES,Aircraft,apSteer,MSL,Missile,flyout,launchZone,SPICE,spiceRange,Bomb,Drone,MigAI,SamSite,World};
if(typeof module!=='undefined')module.exports=RAAM;
