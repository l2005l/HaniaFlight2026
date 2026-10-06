'use strict';
(()=>{
const R=RAAM,{D2R,R2D,KT,FT,NM,clamp,lerp,sstep,v3,vadd,vsub,vmul,vdot,vlen,vnorm,vdist,qrot,qrotInv,FWD,UP,terrainH,TER,SITES,RWY}=R;
const $=id=>document.getElementById(id),T=window.THREE;
const glc=$('gl'),hudc=$('hud'),ctx=hudc.getContext('2d');
let renderer;
try{if(!T)throw 0;renderer=new T.WebGLRenderer({canvas:glc,antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}
catch(e){$('loadErr').hidden=false;$('startRwy').disabled=$('startAir').disabled=true;return;}
let W=null,state='menu',view=0,timeAcc=1,simAcc=0,muted=false,overT=0,gAcc=0,vw=1,vh=1,dpr=1,clock=0;
const rnd=(()=>{let a=1234567;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();
R.buildTerrain();

/* ================= scene ================= */
const scene=new T.Scene(),HAZE=0xc3d2d6;scene.fog=new T.FogExp2(HAZE,1.25e-5);scene.background=new T.Color(HAZE);
const camera=new T.PerspectiveCamera(62,1,0.8,500000);
const sunDir=new T.Vector3(-0.45,0.62,0.5).normalize();
const hemi=new T.HemisphereLight(0xdfeaf5,0x8a7a5c,0.78);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff2d8,0.85);sun.position.copy(sunDir);scene.add(sun);
const lam=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{}));
const part=(g,m,x,y,z,par)=>{const me=new T.Mesh(g,m);me.position.set(x||0,y||0,z||0);par.add(me);return me;};
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);return t;}
let sky,sunSp,sunHalo,seaMat,tod='day';const cloudMats=[],duskOnly=[];
const TOD={day:{zen:0x2c66ad,mid:0x86b4d6,hz:0xc3d2d6,hz2:0xc3d2d6,sun:[-0.45,0.62,0.5],sunCol:0xfff2d8,sunI:0.85,sky:0xdfeaf5,gnd:0x8a7a5c,hemiI:0.78,fog:1.25e-5,cloud:0xffffff,glow:0xfff6dc,halo:0.22,sea:0x2d6d8c},
  dusk:{zen:0x1f2f5c,mid:0x8e7f9c,hz:0xf2a868,hz2:0x6f7396,sun:[-0.9,0.11,0.3],sunCol:0xff9a55,sunI:1.15,sky:0xa3a6cc,gnd:0x6b5644,hemiI:0.78,fog:1.5e-5,cloud:0xffbf98,glow:0xff9a4a,halo:0.6,sea:0x2a4a6a}};
{const g=new T.SphereGeometry(300000,48,24);g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3),3));
  sky=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
  const puff=canvasTex(128,128,(x,w)=>{const gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.1,'rgba(255,255,255,0.9)');gr.addColorStop(0.35,'rgba(255,255,255,0.2)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,w);});
  const mk=(sc,op)=>{const sp=new T.Sprite(new T.SpriteMaterial({map:puff,blending:T.AdditiveBlending,fog:false,depthWrite:false,opacity:op}));sp.scale.setScalar(sc);sp.renderOrder=-9;scene.add(sp);return sp;};
  sunSp=mk(80000,1);sunHalo=mk(330000,0.25);}
function setTOD(k){tod=k;const c=TOD[k],pos=sky.geometry.attributes.position,col=sky.geometry.attributes.color,zen=new T.Color(c.zen),mid=new T.Color(c.mid),hz=new T.Color(c.hz),hz2=new T.Color(c.hz2),h=new T.Color(),o=new T.Color();
  sunDir.set(c.sun[0],c.sun[1],c.sun[2]).normalize();const sl=Math.hypot(sunDir.x,sunDir.z)||1;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i)/300000,z=pos.getZ(i),hl=Math.hypot(x,z)||1,f=(x*sunDir.x+z*sunDir.z)/(hl*sl)*0.5+0.5;
    h.copy(hz2).lerp(hz,f*f);if(y<=0)o.copy(h);else if(y<0.22)o.copy(h).lerp(mid,y/0.22);else o.copy(mid).lerp(zen,Math.min(1,(y-0.22)/0.55));col.setXYZ(i,o.r,o.g,o.b);}
  col.needsUpdate=true;h.copy(hz2).lerp(hz,0.45);scene.fog.color.copy(h);scene.fog.density=c.fog;scene.background.copy(h);
  sun.color.set(c.sunCol);sun.intensity=c.sunI;sun.position.copy(sunDir);hemi.color.set(c.sky);hemi.groundColor.set(c.gnd);hemi.intensity=c.hemiI;
  for(const m of cloudMats)m.color.set(c.cloud);sunSp.material.color.set(c.glow);sunHalo.material.color.set(c.glow);sunHalo.material.opacity=c.halo;if(seaMat)seaMat.color.set(c.sea);
  for(const d of duskOnly)d.visible=k==='dusk';
  for(const id of['todDay','todDusk'])$(id).setAttribute('aria-pressed',String((id==='todDusk')===(k==='dusk')));}
/* terrain */
{const{nx,nz,cell,x0,z0,h}=TER,P=new Float32Array(nx*nz*3),C=new Float32Array(nx*nz*3),U=new Float32Array(nx*nz*2);
  const mix=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  const sand=[0.80,0.71,0.52],green=[0.50,0.55,0.35],hill=[0.68,0.57,0.42],rock=[0.46,0.40,0.34],pale=[0.66,0.62,0.56],beach=[0.88,0.83,0.66];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=x0+i*cell,z=z0+j*cell,hh=h[k];P[k*3]=x;P[k*3+1]=hh;P[k*3+2]=z;U[k*2]=x/640;U[k*2+1]=z/640;
    const hx=h[j*nx+Math.min(i+1,nx-1)]-h[j*nx+Math.max(i-1,0)],hz=h[Math.min(j+1,nz-1)*nx+i]-h[Math.max(j-1,0)*nx+i],sl=Math.hypot(hx,hz)/(2*cell);
    const n=(Math.sin(i*12.9898+j*78.233)*43758.5453)%1,patch=0.5+0.5*Math.sin(x/3100+Math.sin(z/1900)*1.7)*Math.sin(z/2700+Math.sin(x/2300));
    let c=mix(sand,green,sstep(x,40000,-6000)*sstep(hh,3,30)*(0.25+0.75*patch)*0.85);
    c=mix(c,hill,sstep(hh,160,700));c=mix(c,rock,sstep(sl,0.1,0.42));c=mix(c,pale,sstep(hh,1300,2100)*0.6);c=mix(c,beach,sstep(hh,8,0));
    const p2=0.5+0.5*Math.sin(x/7300+Math.sin(z/5100)*2.1)*Math.sin(z/6100+Math.sin(x/4700)*1.3),cv=(h[j*nx+Math.min(i+1,nx-1)]+h[j*nx+Math.max(i-1,0)]+h[Math.min(j+1,nz-1)*nx+i]+h[Math.max(j-1,0)*nx+i])/4-hh,f=(0.93+0.1*Math.abs(n))*(0.84+0.22*p2)*(1-clamp(cv/45,-0.13,0.24));C[k*3]=c[0]*f;C[k*3+1]=c[1]*f;C[k*3+2]=c[2]*f;}
  const I=new Uint32Array((nx-1)*(nz-1)*6);let q=0;
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;I[q++]=a;I[q++]=c;I[q++]=b;I[q++]=b;I[q++]=c;I[q++]=d;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('color',new T.BufferAttribute(C,3));g.setAttribute('uv',new T.BufferAttribute(U,2));g.setIndex(new T.BufferAttribute(I,1));g.computeVertexNormals();
  const det=canvasTex(512,512,(x,w)=>{x.fillStyle='#e6e6e6';x.fillRect(0,0,w,w);
    for(let i=0;i<320;i++){const r=14+rnd()*60,c=rnd()<0.55?0:255;x.fillStyle=`rgba(${c},${c},${c},0.045)`;x.beginPath();x.arc(rnd()*w,rnd()*w,r,0,7);x.fill();}
    for(let i=0;i<26000;i++){const k=1+rnd()*2.2;x.fillStyle=rnd()<0.6?`rgba(30,30,30,${0.04+rnd()*0.14})`:`rgba(255,255,255,${0.1+rnd()*0.2})`;x.fillRect(rnd()*w,rnd()*w,k,k);}
    for(let i=0;i<700;i++){x.fillStyle=`rgba(45,45,45,${0.2+rnd()*0.3})`;x.beginPath();x.arc(rnd()*w,rnd()*w,0.8+rnd()*1.8,0,7);x.fill();}});
  det.wrapS=det.wrapT=T.RepeatWrapping;det.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const tmat=new T.MeshLambertMaterial({vertexColors:true,map:det});
  tmat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec2 u2=mat2(0.8,-0.6,0.6,0.8)*vUv;float dd=texture2D(map,vUv*9.0).g*texture2D(map,vUv).g*texture2D(map,u2*0.11+vec2(0.31,0.17)).g;diffuseColor.rgb*=dd*1.5;`);};
  const tm=new T.Mesh(g,tmat);tm.frustumCulled=false;scene.add(tm);
  seaMat=new T.MeshPhongMaterial({color:0x2d6d8c,specular:0x8a96a0,shininess:80});const sea=new T.Mesh(new T.PlaneGeometry(900000,900000),seaMat);sea.rotation.x=-Math.PI/2;sea.position.set(80000,0,0);scene.add(sea);}
/* base */
const BY=SITES.base.h;
{const rt=canvasTex(2048,64,(x,w,h)=>{x.fillStyle='#2e3032';x.fillRect(0,0,w,h);x.fillStyle='#d9d9d2';
    for(let i=120;i<w-120;i+=46)x.fillRect(i,31,24,2);x.fillRect(0,2,w,1.5);x.fillRect(0,h-3.5,w,1.5);
    for(const e of[18,w-48])for(let k=0;k<8;k++)x.fillRect(e,7+k*6.6,30,3.4);
    x.fillStyle='#17181a';for(let i=0;i<60;i++)x.fillRect(150+rnd()*240,26+rnd()*12,60+rnd()*120,1.5);for(let i=0;i<60;i++)x.fillRect(w-390+rnd()*240-150,26+rnd()*12,60+rnd()*120,1.5);
    x.fillStyle='#d9d9d2';x.font='bold 26px sans-serif';x.textAlign='center';x.textBaseline='middle';
    x.save();x.translate(78,32);x.rotate(Math.PI/2);x.fillText('09',0,0);x.restore();x.save();x.translate(w-78,32);x.rotate(-Math.PI/2);x.fillText('27',0,0);x.restore();});
  rt.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const flat=(w,d,m,x,z,y)=>{const p=part(new T.PlaneGeometry(w,d),m,x,BY+(y||0.3),z,scene);p.rotation.x=-Math.PI/2;return p;};
  flat(2700,60,new T.MeshLambertMaterial({map:rt}),0,0,0.35);
  const tar=lam(0x3b3d3d);flat(2700,24,tar,0,230);flat(24,230,tar,-1300,115);flat(24,230,tar,1300,115);flat(24,230,tar,0,115);flat(700,260,lam(0x4a4b49),-200,380);
  const shel=lam(0xb39e78),conc=lam(0xa9a595);
  for(let i=0;i<8;i++){const g=new T.CylinderGeometry(15,15,34,14,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.rotateY(Math.PI/2);part(g,shel,-480+i*80,BY,470,scene);}
  part(new T.BoxGeometry(9,30,9),conc,260,BY+15,330,scene);part(new T.BoxGeometry(15,6,15),lam(0x394a52),260,BY+33,330,scene);
  for(let i=0;i<10;i++)part(new T.BoxGeometry(30+rnd()*40,6+rnd()*8,20+rnd()*20),conc,350+rnd()*500,BY+4,340+rnd()*260,scene);
  /* towns */
  const tl=[],N=1700,im=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0xffffff}),N),d=new T.Object3D(),c=new T.Color();let n=0;
  for(let t=0;t<17;t++){const cx=-9000+rnd()*52000,cz=-60000+rnd()*120000;if(Math.hypot(cx,cz)<5000)continue;
    for(let i=0;i<100&&n<N;i++){const a=rnd()*7,r=Math.sqrt(rnd())*1000,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,y=terrainH(x,z);if(y<3)continue;
      const hh=4+rnd()*10;tl.push(x,y+hh,z);d.position.set(x,y+hh/2,z);d.scale.set(9+rnd()*16,hh,9+rnd()*16);d.rotation.y=rnd()*3;d.updateMatrix();im.setMatrixAt(n,d.matrix);
      c.setHSL(0.1,0.18,0.72+rnd()*0.2);im.setColorAt(n,c);n++;}}
  im.count=n;im.frustumCulled=false;scene.add(im);
  const mkPts=(arr,col,size)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(arr,3));const p=new T.Points(g,new T.PointsMaterial({color:col,size,sizeAttenuation:false}));p.frustumCulled=false;scene.add(p);duskOnly.push(p);};
  mkPts(tl,0xffc880,2.2);
  {const w=[],gr=[],rd=[];for(let x=RWY.x1;x<=RWY.x2;x+=60){w.push(x,BY+0.8,-31,x,BY+0.8,31);}for(let z=-28;z<=28;z+=7){gr.push(RWY.x1-4,BY+0.8,z,RWY.x2+4,BY+0.8,z);}
    for(let i=1;i<=14;i++){rd.push(RWY.x1-i*60,BY+1.5,0,RWY.x2+i*60,BY+1.5,0);}mkPts(w,0xfff4d6,2.6);mkPts(gr,0x58ff8a,2.6);mkPts(rd,0xffe0a0,3);}
  /* target and SAM pads */
  for(const s of[SITES.tgt,SITES.sam]){const p=part(new T.CircleGeometry(s===SITES.tgt?620:330,40),lam(0x94805f),s.x,s.h+0.4,s.z,scene);p.rotation.x=-Math.PI/2;
    if(s===SITES.tgt)for(let i=0;i<14;i++)part(new T.BoxGeometry(14+rnd()*20,5+rnd()*4,10+rnd()*12),lam(0x8f8a78),s.x-450+rnd()*900,s.h+3,s.z-450+rnd()*500,scene);}
  /* clouds */
  const ct=canvasTex(128,128,(x,w)=>{for(let i=0;i<9;i++){const px=30+rnd()*68,py=44+rnd()*40,r=18+rnd()*22,gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,'rgba(255,255,255,0.9)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,w);}});
  const cm=new T.SpriteMaterial({map:ct,transparent:true,opacity:0.82,depthWrite:false}),ci=new T.SpriteMaterial({map:ct,transparent:true,opacity:0.2,depthWrite:false});cloudMats.push(cm,ci);
  for(let i=0;i<58;i++){const cx=-40000+rnd()*260000,cy=3000+rnd()*2200,cz=-85000+rnd()*170000,big=1700+rnd()*2500,n=5+(rnd()*5|0);
    for(let j=0;j<n;j++){const s=new T.Sprite(cm),k=big*(0.6+rnd()*0.8);s.position.set(cx+(rnd()-0.5)*big*3.2,cy+(rnd()-0.3)*big*0.5,cz+(rnd()-0.5)*big*3.2);s.scale.set(k*1.6,k,1);scene.add(s);}}
  for(let i=0;i<26;i++){const s=new T.Sprite(ci);s.position.set(-60000+rnd()*300000,10800+rnd()*1500,-90000+rnd()*180000);const k=14000+rnd()*22000;s.scale.set(k*2.6,k*0.5,1);scene.add(s);}
}
/* ---------- aircraft models ---------- */
function shapeGeo(pts,th,fin){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));const g=new T.ExtrudeGeometry(s,{depth:th,bevelEnabled:false}),uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*0.09,uv.getY(i)*0.09);if(fin)g.rotateY(-Math.PI/2);else g.rotateX(Math.PI/2);return g;}
const flatGeo=(p,t)=>shapeGeo(p,t,false),finGeo=(p,t)=>shapeGeo(p,t,true);
function camoTex(a,b,c){const t=canvasTex(256,256,(x,w)=>{x.fillStyle=a;x.fillRect(0,0,w,w);
    for(const col of[b,c])for(let i=0;i<7;i++){const px=rnd()*w,py=rnd()*w;x.fillStyle=col;for(let k=0;k<6;k++){x.beginPath();x.ellipse(px+(rnd()-0.5)*70,py+(rnd()-0.5)*70,18+rnd()*34,12+rnd()*22,rnd()*3,0,7);x.fill();}}
    x.fillStyle='rgba(0,0,0,0.06)';for(let i=0;i<900;i++)x.fillRect(rnd()*w,rnd()*w,1+rnd()*2,1);x.strokeStyle='rgba(0,0,0,0.1)';x.lineWidth=1;for(let i=0;i<w;i+=64){x.strokeRect(i,0,64,w);}});
  t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const CAMO={il:camoTex('#c9ad7c','#93704a','#8a9462'),mig:camoTex('#8f979d','#6d7a85','#a7aeb3')};
const roundel=canvasTex(128,128,x=>{x.fillStyle='#f4f4f0';x.beginPath();x.arc(64,64,60,0,7);x.fill();x.strokeStyle='#1f4fa3';x.lineWidth=9;
  for(const s of[1,-1]){x.beginPath();for(let i=0;i<3;i++){const a=-Math.PI/2*s+i*2.0944;x[i?'lineTo':'moveTo'](64+Math.cos(a)*42,64+Math.sin(a)*42);}x.closePath();x.stroke();}});
function buildJet(o){const G=new T.Group(),body=new T.MeshLambertMaterial({map:CAMO[o.camo]}),wing=body,tail=body,dark=lam(0x2a2c2e),steel=lam(0x4a4d50),glass=new T.MeshPhongMaterial({color:0x16242b,shininess:110,specular:0xbbccdd});
  let g=new T.ConeGeometry(0.72,3.6,16);g.rotateX(-Math.PI/2);part(g,lam(o.nose),0,0,-7.9,G);
  g=new T.CylinderGeometry(0.72,1.0,4.2,16);g.rotateX(-Math.PI/2);part(g,body,0,0,-4.0,G);
  part(new T.SphereGeometry(1,16,12),glass,0,0.62,o.two?-4.2:-4.6,G).scale.set(0.6,0.68,o.two?2.7:1.9);
  part(new T.BoxGeometry(0.08,0.5,0.1),dark,0,1.08,o.two?-4.3:-4.7,G).scale.set(1,1,1);
  part(new T.BoxGeometry(3.0,1.5,9.5),body,0,0,2.2,G);
  g=new T.CylinderGeometry(0.75,0.95,7.5,10,1,false,-Math.PI/2,Math.PI);g.rotateX(-Math.PI/2);part(g,body,0,0.7,1.2,G).scale.set(1,0.45,1);
  const ud=G.userData;ud.ab=[];ud.bombs=[];ud.aams=[];
  ud.sb=new T.Group();ud.sb.position.set(0,1.15,-0.4);G.add(ud.sb);part(new T.BoxGeometry(1.5,0.07,3.2),body,0,0,1.6,ud.sb);
  const fl=(r,l,c,op)=>{const k=new T.ConeGeometry(r,l,12,1,true);k.rotateX(Math.PI/2);k.translate(0,0,l/2);return new T.Mesh(k,new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide}));};
  for(const s of[-1,1]){
    part(new T.BoxGeometry(1.0,1.45,3.6),body,s*1.45,-0.05,-1.9,G);part(new T.BoxGeometry(0.9,1.3,0.1),dark,s*1.45,-0.05,-3.72,G);
    if(o.cft)part(new T.BoxGeometry(0.55,0.95,6.5),body,s*1.95,-0.1,1.6,G);
    g=new T.CylinderGeometry(0.68,0.68,3.6,14);g.rotateX(Math.PI/2);part(g,body,s*0.8,0,7.4,G);
    g=new T.CylinderGeometry(0.64,0.5,1.0,14,1,true);g.rotateX(-Math.PI/2);part(g,steel,s*0.8,0,9.65,G).material.side=T.DoubleSide;
    part(flatGeo([[1.5,-1.6],[6.52,3.2],[6.52,5.0],[1.5,5.6]].map(p=>[p[0]*s,p[1]]),0.2),wing,0,0.3,0,G);
    part(flatGeo([[1.4,6.6],[4.3,8.6],[4.3,9.7],[1.4,9.4]].map(p=>[p[0]*s,p[1]]),0.14),wing,0,0.15,0,G);
    part(finGeo([[5.4,0.7],[8.9,0.7],[9.3,4.0],[8.0,4.0]],0.14),tail,s*1.75+0.07,0,0,G);
    part(new T.BoxGeometry(0.14,0.34,2.4),steel,s*3.4,-0.02,2.6,G);
    part(new T.SphereGeometry(0.13,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*6.5,0.25,4.7,G);
    for(const[r,l,c,op]of[[0.5,7,0xff9a45,0.75],[0.3,4.2,0xdfe8ff,0.9]]){const f=fl(r,l,c,op);f.position.set(s*0.8,0,10);f.visible=false;G.add(f);ud.ab.push(f);}
    if(o.player){
      const rd=part(new T.CircleGeometry(0.85,20),new T.MeshLambertMaterial({map:roundel}),s*4.3,0.32,3.3,G);rd.rotation.x=-Math.PI/2;
      for(const z of[-0.6,3.6]){g=new T.CylinderGeometry(0.3,0.3,3.6,10);g.rotateX(Math.PI/2);const b=part(g,lam(0x565a4c),s*2.0,-0.85,z,G);const nc=new T.ConeGeometry(0.3,0.8,10);nc.rotateX(-Math.PI/2);part(nc,lam(0x3d4036),0,0,-2.2,b);ud.bombs.push(b);}
      for(const[x,l]of[[3.4,3.6],[4.5,3.0]]){g=new T.CylinderGeometry(0.1,0.1,l,8);g.rotateX(Math.PI/2);const a=part(g,lam(0xe6e6e0),s*x,x<4?-0.32:-0.15,2.6,G);part(new T.BoxGeometry(0.6,0.03,0.4),lam(0xe6e6e0),0,0,l/2-0.3,a);part(new T.BoxGeometry(0.03,0.6,0.4),lam(0xe6e6e0),0,0,l/2-0.3,a);ud.aams.push(a);}
    }}
  ud.gear=new T.Group();G.add(ud.gear);
  for(const[x,z]of[[0,-5.5],[-1.4,1.6],[1.4,1.6]]){part(new T.CylinderGeometry(0.09,0.09,1.6,6),lam(0xc9c9c9),x,-1.5,z,ud.gear);const wg=new T.CylinderGeometry(0.42,0.42,0.3,12);wg.rotateZ(Math.PI/2);part(wg,dark,x,-1.98,z,ud.gear);}
  if(o.scale)G.scale.setScalar(o.scale);return G;}
function buildDrone(){const G=new T.Group(),m=lam(0xb9b5a6);let g=new T.CylinderGeometry(0.28,0.3,3.3,8);g.rotateX(Math.PI/2);part(g,m,0,0,0,G);
  part(flatGeo([[0,-1.3],[1.3,1.5],[-1.3,1.5]],0.12),m,0,0.05,0,G);for(const s of[-1,1])part(new T.BoxGeometry(0.06,0.7,0.6),m,s*1.25,0,1.2,G);return G;}
function buildGround(gt){const G=new T.Group(),ol=lam(0x5e6247),gr=lam(0x9a9a8e);
  if(gt.kind==='tel'){part(new T.BoxGeometry(13,2.4,3.2),ol,0,1.7,0,G);const m=part(new T.CylinderGeometry(0.5,0.5,11,8),gr,2.5,6.4,0,G);m.rotation.z=0.5;part(new T.BoxGeometry(3,2,3.2),ol,-5,3.6,0,G);}
  else if(gt.kind==='bunker'){part(new T.BoxGeometry(40,7,24),lam(0x9b978a),0,3.5,0,G);part(new T.BoxGeometry(46,3,30),lam(0x8d7b5c),0,1.5,0,G);part(new T.BoxGeometry(6,4,2),lam(0x33332f),0,2,12.1,G);}
  else if(gt.kind==='radar'){part(new T.BoxGeometry(8,3,3.5),ol,0,1.8,0,G);part(new T.CylinderGeometry(0.4,0.4,7,8),ol,0,6,0,G);const d=part(new T.BoxGeometry(7,5,0.6),gr,0,11,0,G);G.userData.dish=d;}
  else{part(new T.BoxGeometry(9,2.2,3.2),ol,0,1.6,0,G);for(let i=0;i<3;i++){const m=part(new T.CylinderGeometry(0.35,0.35,6,6),gr,1,4.4,-1+i,G);m.rotation.z=0.9;}}
  G.position.set(gt.pos.x,gt.pos.y,gt.pos.z);G.rotation.y=gt.pos.x%3;return G;}
/* ---------- particles ---------- */
const PM=9000,pp=new Float32Array(PM*3),pc=new Float32Array(PM*4),ps=new Float32Array(PM),P=[];let pHead=0;
for(let i=0;i<PM;i++)P.push({on:false});
const pgeo=new T.BufferGeometry();pgeo.setAttribute('position',new T.BufferAttribute(pp,3));pgeo.setAttribute('pcolor',new T.BufferAttribute(pc,4));pgeo.setAttribute('size',new T.BufferAttribute(ps,1));
const pmat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{scale:{value:500}},
  vertexShader:`attribute float size;attribute vec4 pcolor;varying vec4 vC;uniform float scale;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){vC=pcolor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*scale/max(-mv.z,1.0),0.0,700.0);
#include <logdepthbuf_vertex>
}`,
  fragmentShader:`varying vec4 vC;
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
float r=length(gl_PointCoord-0.5)*2.0;float a=smoothstep(1.0,0.15,r)*vC.a;if(a<0.01)discard;gl_FragColor=vec4(vC.rgb,a);}`});
const pts=new T.Points(pgeo,pmat);pts.frustumCulled=false;pts.renderOrder=5;scene.add(pts);
function spawn(p,v,life,s0,s1,col,a0,o){const q=P[pHead];pHead=(pHead+1)%PM;q.on=true;q.x=p.x;q.y=p.y;q.z=p.z;q.vx=v.x;q.vy=v.y;q.vz=v.z;q.t=0;q.life=life;q.s0=s0;q.s1=s1;q.r=col[0];q.g=col[1];q.b=col[2];q.a=a0;q.grav=o&&o.grav||0;q.drag=o&&o.drag||0;q.fire=o&&o.fire||0;}
function updParticles(dt){for(let i=0;i<PM;i++){const q=P[i];if(!q.on){ps[i]=0;continue;}q.t+=dt;if(q.t>=q.life){q.on=false;ps[i]=0;pc[i*4+3]=0;continue;}
    const k=1-q.drag*dt;q.vx*=k;q.vy=q.vy*k+q.grav*dt;q.vz*=k;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;const t=q.t/q.life;
    pp[i*3]=q.x;pp[i*3+1]=q.y;pp[i*3+2]=q.z;ps[i]=lerp(q.s0,q.s1,t);
    if(q.fire){const f=clamp(1-t*q.fire,0,1);pc[i*4]=lerp(0.2,q.r,f);pc[i*4+1]=lerp(0.19,q.g,f);pc[i*4+2]=lerp(0.18,q.b,f);}else{pc[i*4]=q.r;pc[i*4+1]=q.g;pc[i*4+2]=q.b;}
    pc[i*4+3]=q.a*(1-t)*Math.min(1,t*12+0.3);}
  pgeo.attributes.position.needsUpdate=pgeo.attributes.pcolor.needsUpdate=pgeo.attributes.size.needsUpdate=true;}
const rv=s=>v3((rnd()-0.5)*s,(rnd()-0.5)*s,(rnd()-0.5)*s);
const rings=[];let ringI=0,shake=0;
for(let i=0;i<5;i++){const r=part(new T.RingGeometry(0.8,1,56),new T.MeshBasicMaterial({color:0xfff0d0,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,fog:false}),0,-9e5,0,scene);r.rotation.x=-Math.PI/2;r.userData.t=9;rings.push(r);}
function explosion(p,size,ground){const n=Math.round(26*Math.min(size,3)+10);
  spawn(p,v3(),0.3,110*size,190*size,[1,0.96,0.82],1);spawn(p,v3(),0.12,220*size,260*size,[1,1,0.95],0.7);
  for(let i=0;i<n;i++){const v=rv(60*size);if(ground)v.y=Math.abs(v.y)*1.6+8;spawn(vadd(p,rv(6*size)),v,2+rnd()*3*size,10*size,(40+rnd()*40)*size,[1,0.62+rnd()*0.25,0.2],0.9,{drag:1.2,fire:2.2,grav:ground?1:3});}
  for(let i=0;i<16;i++){const v=rv(140*Math.min(size,2));if(ground)v.y=Math.abs(v.y)+30;spawn(p,v,2.6+rnd()*1.5,2.6,1.4,[0.12,0.11,0.1],1,{grav:-30,drag:0.3});}
  if(ground){for(let i=0;i<n;i++){const v=rv(50*size);v.y=Math.abs(v.y)+10;spawn(vadd(p,rv(10*size)),v,5+rnd()*6,14*size,70*size,[0.62,0.55,0.42],0.55,{drag:0.9});}
    if(size>2){const r=rings[ringI++%5];r.position.set(p.x,p.y+2.5,p.z);r.userData.t=0;r.userData.s=size;}}}
const emitters=[];
/* tracers */
const TM=400,tp=new Float32Array(TM*6),tgeo=new T.BufferGeometry();tgeo.setAttribute('position',new T.BufferAttribute(tp,3));
const tracers=new T.LineSegments(tgeo,new T.LineBasicMaterial({color:0xffe9a0,fog:false}));tracers.frustumCulled=false;scene.add(tracers);
/* far-away visibility dots */
const dp=new Float32Array(16*3),dgeo=new T.BufferGeometry();dgeo.setAttribute('position',new T.BufferAttribute(dp,3));
const dots=new T.Points(dgeo,new T.PointsMaterial({size:2.6,sizeAttenuation:false,color:0x1b1d20,fog:false}));dots.frustumCulled=false;scene.add(dots);
const shadow=part(new T.PlaneGeometry(24,24),new T.MeshBasicMaterial({color:0,transparent:true,opacity:0.32,depthWrite:false,map:canvasTex(128,128,x=>{x.fillStyle='#fff';x.filter='blur(3px)';
  x.beginPath();x.moveTo(64,10);x.lineTo(69,40);x.lineTo(72,52);x.lineTo(99,84);x.lineTo(99,92);x.lineTo(74,92);x.lineTo(88,108);x.lineTo(88,114);x.lineTo(70,112);x.lineTo(68,116);x.lineTo(60,116);x.lineTo(58,112);x.lineTo(40,114);x.lineTo(40,108);x.lineTo(54,92);x.lineTo(29,92);x.lineTo(29,84);x.lineTo(56,52);x.lineTo(59,40);x.closePath();x.fill();})}),0,0,0,scene);shadow.rotation.x=-Math.PI/2;shadow.renderOrder=2;

/* ---------- dynamic objects ---------- */
const dyn=new T.Group();scene.add(dyn);let pMesh,meshOf=new Map(),camQ=new T.Quaternion(),mslGeo,bombGeo;
{mslGeo=new T.CylinderGeometry(0.11,0.11,3.6,6);mslGeo.rotateX(Math.PI/2);bombGeo=new T.CylinderGeometry(0.3,0.3,4.2,8);bombGeo.rotateX(Math.PI/2);}
function newGame(start){
  W=new R.World({start});while(dyn.children.length)dyn.remove(dyn.children[0]);meshOf=new Map();emitters.length=0;for(const q of P)q.on=false;
  pMesh=buildJet({camo:'il',nose:0x86857c,cft:true,two:true,player:true});dyn.add(pMesh);
  for(const m of W.migs){const g=buildJet({camo:'mig',nose:0x5b6166,scale:0.88});g.userData.gear.visible=false;dyn.add(g);meshOf.set(m,g);}
  for(const d of W.drones){const g=buildDrone();dyn.add(g);meshOf.set(d,g);}
  for(const g of W.ground){const m=buildGround(g);dyn.add(m);meshOf.set(g,m);}
  const p=W.player;camQ.set(p.q.x,p.q.y,p.q.z,p.q.w);timeAcc=1;simAcc=0;overT=0;gAcc=0;stick.x=stick.y=0;lever=p.ctl.throttle;radioQ.length=0;radioT=0;$('radio').textContent='';
}
/* ================= input ================= */
const keys={},stick={x:0,y:0,r:0},touch={on:false,x:0,y:0,fire:false,cm:false,brk:false};let lever=0,trig=false;const tap={fire:false,cm:false};
const WSEL=['AIM120','PYTHON','GUN','SPICE'];
function act(a){if(!W||state!=='fly')return;const p=W.player;
  if(a==='gear'){if(!p.onGround)p.gear=!p.gear;beep(440,0.06);}
  else if(a==='flaps'){p.flaps=!p.flaps;beep(500,0.05);}
  else if(a==='view')view^=1;
  else if(a==='tgt'){W.cycleTarget();beep(1200,0.04);}
  else if(a==='unlock')W.unlock();
  else if(a==='wpn'){W.select(WSEL[(WSEL.indexOf(W.w.sel)+1)%4]);beep(900,0.04);}
  else if(a==='time'){timeAcc=timeAcc>=8?1:timeAcc*2;}
  else if(a==='mute'){muted=!muted;if(muted)hush();if(Snd.master)Snd.master.gain.value=muted?0:0.9;}
  else if(a==='wp')W.wp=(W.wp+1)%W.wps.length;}
addEventListener('keydown',e=>{
  if(state==='pause'&&(e.code==='Escape'||e.code==='KeyP')){resume();return;}
  if(state!=='fly')return;
  if(/^(Space|Arrow|Tab|Enter)/.test(e.code))e.preventDefault();
  keys[e.code]=true;if(e.repeat)return;if(e.code==='Space')tap.fire=true;if(e.code==='KeyC')tap.cm=true;
  const m={KeyG:'gear',KeyL:'flaps',KeyV:'view',KeyT:'tgt',KeyU:'unlock',Enter:'wpn',KeyO:'time',KeyM:'mute',KeyN:'wp'}[e.code];
  if(m)act(m);else if(/^Digit[1-4]$/.test(e.code)){W.select(WSEL[+e.code[5]-1]);beep(900,0.04);}
  else if(e.code==='Escape'||e.code==='KeyP')pause();});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(state==='fly')pause();});
function readInput(dt){
  const k=keys,tx=(k.ArrowRight||k.KeyD?1:0)-(k.ArrowLeft||k.KeyA?1:0),ty=(k.ArrowDown||k.KeyS?1:0)-(k.ArrowUp||k.KeyW?1:0),tr=(k.KeyE?1:0)-(k.KeyQ?1:0);
  const ap=(c,t)=>{const rate=(t===0?5:3.2)*dt;return Math.abs(t-c)<rate?t:c+Math.sign(t-c)*rate;};
  if(touch.on){stick.x=touch.x;stick.y=touch.y;}else{stick.x=ap(stick.x,tx);stick.y=ap(stick.y,ty);}
  stick.r=ap(stick.r,tr);
  const up=k.ShiftLeft||k.ShiftRight||k.Equal||k.KeyR,dn=k.Minus||k.KeyF;
  if(up)lever=Math.min(1.3,lever+0.55*dt);if(dn)lever=Math.max(0,lever-0.55*dt);
  const c=W.player.ctl;c.roll=stick.x;c.pitch=stick.y;c.yaw=stick.r;c.throttle=lever;c.brake=!!k.KeyB||touch.brk;
  trig=!!k.Space||touch.fire||tap.fire;
  W.cmHeld=!!k.KeyC||touch.cm||tap.cm;}
/* touch controls */
{const tz=$('touch'),coarse=matchMedia('(pointer:coarse)').matches;if(coarse)tz.dataset.on='1';
  const st=$('tStick'),kn=$('tKnob'),th=$('tThr'),tk=$('tThrK');
  const mv=e=>{const r=st.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width*2-1,-1,1),y=clamp((e.clientY-r.top)/r.height*2-1,-1,1);touch.on=true;touch.x=x;touch.y=y;kn.style.transform=`translate(${x*36}px,${y*36}px)`;};
  st.addEventListener('pointerdown',e=>{st.setPointerCapture(e.pointerId);mv(e);});st.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')mv(e);});
  const end=()=>{touch.x=touch.y=0;kn.style.transform='';};st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  const tm=e=>{const r=th.getBoundingClientRect(),v=clamp(1-(e.clientY-r.top)/r.height,0,1);lever=v*1.3;};
  th.addEventListener('pointerdown',e=>{th.setPointerCapture(e.pointerId);tm(e);});th.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')tm(e);});
  setInterval(()=>{tk.style.bottom=(lever/1.3*100)+'%';},100);
  for(const b of tz.querySelectorAll('button')){const a=b.dataset.a;
    if(a==='fire'||a==='cm'||a==='brk'){b.addEventListener('pointerdown',e=>{e.preventDefault();touch[a]=true;});for(const ev of['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>{touch[a]=false;});}
    else b.addEventListener('click',()=>a==='pause'?pause():act(a));}}
/* ================= audio ================= */
const Snd={ac:null,master:null,
  init(){if(this.ac)return;try{const A=window.AudioContext||window.webkitAudioContext;const ac=this.ac=new A();this.master=ac.createGain();this.master.gain.value=muted?0:0.9;this.master.connect(ac.destination);
      const buf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=buf;
      const mk=(type,f,q)=>{const s=ac.createBufferSource();s.buffer=buf;s.loop=true;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||0.7;const g=ac.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(this.master);s.start();return{fl,g};};
      this.eng=mk('lowpass',300);this.wind=mk('bandpass',1200,0.5);this.gun=mk('lowpass',900);
      const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=480;const lf=ac.createOscillator();lf.frequency.value=28;const lg=ac.createGain();lg.gain.value=60;lf.connect(lg);lg.connect(o.frequency);this.tone=ac.createGain();this.tone.gain.value=0;o.connect(this.tone);this.tone.connect(this.master);o.start();lf.start();
    }catch(e){this.ac=null;}},
  set(n,v,t){if(this.ac)n.setTargetAtTime(v,this.ac.currentTime,t||0.1);},
  boom(vol){if(!this.ac)return;const ac=this.ac,s=ac.createBufferSource();s.buffer=this.noise;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=260;const g=ac.createGain();g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1.6);s.connect(f);f.connect(g);g.connect(this.master);s.start();s.stop(ac.currentTime+1.7);},
  whoosh(){if(!this.ac)return;const ac=this.ac,s=ac.createBufferSource();s.buffer=this.noise;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(2400,ac.currentTime);f.frequency.exponentialRampToValueAtTime(300,ac.currentTime+1.3);const g=ac.createGain();g.gain.setValueAtTime(0.5,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1.4);s.connect(f);f.connect(g);g.connect(this.master);s.start();s.stop(ac.currentTime+1.5);}};
function beep(f,d,v,type){const ac=Snd.ac;if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type=type||'square';o.frequency.value=f;g.gain.value=v||0.07;o.connect(g);g.connect(Snd.master);o.start();o.stop(ac.currentTime+d);}
let rwrT=0,warnT=0,gunSnd=0;
function updAudio(dt){if(!Snd.ac||!W)return;const p=W.player,fly=state==='fly'&&p.alive;
  Snd.set(Snd.eng.g.gain,fly?(0.05+0.12*Math.min(p.eng,1)+(p.eng>1?0.22:0))*(view?1:0.7)*(Voice.busy?0.45:1):0);Snd.set(Snd.eng.fl.frequency,180+500*Math.min(p.eng,1)+(p.eng>1?-150:0));
  Snd.set(Snd.wind.g.gain,fly?clamp(p.V/340,0,1.6)*0.07:0);
  gunSnd=Math.max(0,gunSnd-dt);Snd.set(Snd.gun.g.gain,gunSnd>0?0.5:0,0.02);
  Snd.set(Snd.tone.gain,fly&&W.w.sel==='PYTHON'&&W.irTgt?0.035:0,0.05);
  if(!fly)return;rwrT-=dt;warnT-=dt;
  const lvl=W.mwarn?3:Math.max(-1,...(W.threats||[]).map(t=>t.lvl));
  if(rwrT<=0&&lvl>=1){if(lvl>=3){beep(1900,0.06,0.07);rwrT=0.14;}else if(lvl===2){beep(1500,0.08,0.06);rwrT=0.3;}else{beep(900,0.07,0.04);rwrT=1.1;}}
  if(warnT<=0&&hudWarn.pull){beep(700,0.12,0.09);setTimeout(()=>beep(1000,0.12,0.09),150);warnT=0.5;}
  else if(warnT<=0&&hudWarn.stall){beep(300,0.2,0.06,'sawtooth');warnT=0.45;}}
/* ================= UI glue ================= */
const radioQ=[];let radioT=0;
/* spoken radio: the device's own Hebrew voice, when it has one */
const Voice={v:null,busy:false,t:0,api:typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined'};
function pickVoice(){let vs=[];try{if(Voice.api)vs=speechSynthesis.getVoices();}catch(e){}
  Voice.v=vs.find(v=>/^(he|iw)/i.test(v.lang))||null;
  $('voiceState').textContent=!Voice.api?'הדפדפן הזה לא תומך בהקראה.':Voice.v?'נמצא קול עברי: '+Voice.v.name:'לא נמצא קול עברי במכשיר הזה. הדיווחים יוצגו בכתב.';}
if(Voice.api){pickVoice();try{speechSynthesis.addEventListener('voiceschanged',pickVoice);}catch(e){}}else pickVoice();
function squelch(){const ac=Snd.ac;if(!ac||muted)return;const b=ac.createBufferSource();b.buffer=Snd.noise;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=2600;const g=ac.createGain();g.gain.value=0.12;b.connect(f);f.connect(g);g.connect(Snd.master);b.start();b.stop(ac.currentTime+0.07);}
function hush(){Voice.busy=false;try{if(Voice.api)speechSynthesis.cancel();}catch(e){}}
function say(text){if(muted||!Voice.v)return false;
  const t=text.replace(/^[^:]{2,14}:\s*/,'').replace(/כטב"מי/g,'כטבמי').replace(/כטב"מים/g,'כטבמים').replace(/כטב"ם/g,'כטבם').replace(/נ"מ/g,'נון מם').replace(/מכ"ם/g,'מכם').replace(/ק"מ/g,'קילומטר').replace(/SPICE/g,'ספייס').replace(/מיג-29/g,'מיג עשרים ותשע').replace(/מסלול 09/g,'מסלול אפס תשע');
  try{const ut=new SpeechSynthesisUtterance(t);ut.voice=Voice.v;ut.lang=Voice.v.lang;ut.rate=1.1;ut.pitch=/^מגדל/.test(text)?1.15:0.9;
    ut.onend=ut.onerror=()=>{if(Voice.busy){Voice.busy=false;squelch();}};speechSynthesis.cancel();squelch();speechSynthesis.speak(ut);Voice.busy=true;Voice.t=clock;return true;}catch(e){Voice.busy=false;return false;}}
function updRadio(dt){radioT-=dt;const el=$('radio'),talking=Voice.busy&&clock-Voice.t<25;if(!talking)Voice.busy=false;
  if(radioT<=0&&!talking){if(radioQ.length){const m=radioQ.shift();el.textContent=m;el.dataset.on='1';radioT=say(m)?3:6.5;if(!Voice.busy)beep(1400,0.04,0.03,'sine');}else el.dataset.on='';}}
function show(id,on){$(id).hidden=!on;}
function start(mode){hush();Snd.init();if(Snd.ac&&Snd.ac.state==='suspended')Snd.ac.resume();newGame(mode);view=0;state='fly';show('menu',false);show('pause',false);show('debrief',false);$('app').dataset.fly='1';}
function pause(){if(state!=='fly')return;hush();state='pause';show('pause',true);$('resume').focus();}
function resume(){state='fly';show('pause',false);last=performance.now();}
function toMenu(){hush();state='menu';show('pause',false);show('debrief',false);show('menu',true);$('app').dataset.fly='';newGame('runway');}
let lastMode='runway';
$('startRwy').onclick=()=>start(lastMode='runway');$('startAir').onclick=()=>start(lastMode='air');
$('resume').onclick=resume;$('restart').onclick=()=>start(lastMode);$('quit').onclick=toMenu;$('again').onclick=()=>start(lastMode);$('back').onclick=toMenu;
function debrief(){hush();state='debrief';const o=W.over,s=W.stats,p=W.player,mm=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  $('dTitle').textContent=o.title;$('dReason').textContent=o.reason||'';$('debrief').dataset.win=o.win?'1':'';
  const rows=[['כטב"מים שהופלו',`${s.uav} מתוך 4`+(s.leak?` (${s.leak} חדרו)`:'')],['מיג-29 שהופלו',`${s.mig} מתוך 2`],['מטרות אתר השיגור',`${s.tgt} מתוך 3`],['מכ"ם סוללת הנ"מ',s.sam?'הושמד':'לא הושמד'],['חימוש ששוגר',s.shots],['דלק שנותר',`${Math.round(p.fuel).toLocaleString()} ק"ג`],['זמן משימה',mm(W.time)]];
  if(s.sink!=null&&p.alive)rows.push(['שיעור שקיעה בנגיעה',`${Math.round(s.sink*196.85)} רגל לדקה`]);
  $('dStats').innerHTML=rows.map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');show('debrief',true);$('again').focus();}
function handleEvents(){const p=W.player,cp=camera.position;
  for(const e of W.events){
    if(e.type==='msg')radioQ.push(e.text);
    else if(e.type==='launch'){const m=new T.Mesh(mslGeo,lam(0xe8e8e2));dyn.add(m);meshOf.set(e.m,m);if(e.m.owner===p)Snd.whoosh();}
    else if(e.type==='release'){beep(160,0.12,0.12,'sine');}
    else if(e.type==='boom'){explosion(e.pos,e.size,e.ground);const d=Math.hypot(e.pos.x-cp.x,e.pos.y-cp.y,e.pos.z-cp.z);Snd.boom(clamp(0.9*e.size*800/(d+300),0.03,0.9));shake=Math.max(shake,clamp(e.size*700/(d+150),0,1.6));if(e.ground&&e.size>2)emitters.push({pos:{...e.pos},vel:v3(),until:clock+90,rate:0.12,t:0,smoke:true});}
    else if(e.type==='kill'){const m=meshOf.get(e.e);if(m)m.visible=false;emitters.push({pos:{...e.e.pos},vel:{...e.e.vel},until:clock+40,rate:0.03,t:0,fall:true});}
    else if(e.type==='gkill'){const m=meshOf.get(e.g);if(m){m.traverse(o=>{if(o.material)o.material=lam(0x1d1b19);});m.scale.y=0.55;}}
    else if(e.type==='cm'){for(let i=0;i<2;i++)spawn(e.pos,vadd(vmul(e.vel,0.6),v3((rnd()-0.5)*40,-25-rnd()*15,(rnd()-0.5)*40)),2.8,26,10,[1,0.9,0.6],1,{grav:-9,drag:0.5});
      for(let i=0;i<6;i++)spawn(e.pos,vadd(vmul(e.vel,0.5),rv(30)),1.6,5,30,[0.95,0.95,0.95],0.5,{drag:1.5});}
    else if(e.type==='gun')gunSnd=0.09;
    else if(e.type==='spark')spawn(e.pos,rv(20),0.4,10,22,[1,0.85,0.5],1);
    else if(e.type==='deny')beep(220,0.15,0.06);}
  W.events.length=0;}
/* ================= frame ================= */
const tv=new T.Vector3(),tq=new T.Quaternion(),tv2=new T.Vector3();
function setQ(o,q){o.quaternion.set(q.x,q.y,q.z,q.w);}
function aim(o,vel){tv.set(-vel.x,-vel.y,-vel.z).normalize();o.quaternion.setFromUnitVectors(tv2.set(0,0,1),tv);}
function syncScene(dt){
  const p=W.player,ud=pMesh.userData;
  pMesh.position.set(p.pos.x,p.pos.y,p.pos.z);setQ(pMesh,p.q);pMesh.visible=p.alive&&(view===1||state!=='fly');
  ud.gear.visible=p.gearPos>0.3;for(const f of ud.ab){f.visible=p.eng>1.02;f.scale.set(1,1,0.5+(p.eng-1)*2.2+rnd()*0.22);}ud.sb.rotation.x=-p.brakePos*0.75;
  const w=W.w;ud.bombs.forEach((b,i)=>b.visible=i<w.spice);ud.aams.forEach((b,i)=>b.visible=i%2===0?w.aim120>i:w.python>(i>>1));
  let di=0;const cp=camera.position;
  for(const[e,m]of meshOf){
    if(e.kind==='air'){if(!e.alive)continue;m.position.set(e.pos.x,e.pos.y,e.pos.z);setQ(m,e.q);
      if(m.userData.ab)for(const f of m.userData.ab)f.visible=e.eng>1.02;
      const d=Math.hypot(e.pos.x-cp.x,e.pos.y-cp.y,e.pos.z-cp.z);if(d>500&&d<(e.type==='UAV'?5000:15000)&&di<16){dp[di*3]=e.pos.x;dp[di*3+1]=e.pos.y;dp[di*3+2]=e.pos.z;di++;}}
    else if(e.kind==='msl'||e.kind==='bomb'){
      if(!e.alive){dyn.remove(m);meshOf.delete(e);continue;}
      m.position.set(e.pos.x,e.pos.y,e.pos.z);aim(m,e.vel);
      if(e.kind==='msl'){const n=e.burning?2:1,sp=vlen(e.vel);for(let i=0;i<n;i++)spawn(vadd(e.pos,vmul(e.vel,-i*dt*timeAcc/n-3/sp)),rv(3),e.burning?5:1.6,e.burning?3:2,e.burning?16:6,[0.93,0.93,0.93],e.burning?0.55:0.2);
        if(e.burning)spawn(vadd(e.pos,vmul(e.vel,-2.5/sp)),v3(),0.06,7,4,[1,0.8,0.4],1);}}
    else if(e.kind==='radar'&&e.alive&&m.userData.dish)m.userData.dish.rotation.y+=dt*2;}
  for(const b of W.bombs)if(!meshOf.has(b)){const m=new T.Mesh(bombGeo,lam(0x565a4c));dyn.add(m);meshOf.set(b,m);m.position.set(b.pos.x,b.pos.y,b.pos.z);}
  for(;di<16;di++){dp[di*3]=0;dp[di*3+1]=-9e5;dp[di*3+2]=0;}dgeo.attributes.position.needsUpdate=true;
  /* tracers */
  let ti=0;for(const b of W.bullets){if(ti>=TM||b.t>2.2)continue;const k=ti*6;tp[k]=b.pos.x;tp[k+1]=b.pos.y;tp[k+2]=b.pos.z;tp[k+3]=b.pos.x-b.vel.x*0.035;tp[k+4]=b.pos.y-b.vel.y*0.035;tp[k+5]=b.pos.z-b.vel.z*0.035;ti++;}
  tgeo.setDrawRange(0,ti*2);tgeo.attributes.position.needsUpdate=true;
  /* emitters */
  for(let i=emitters.length-1;i>=0;i--){const e=emitters[i];if(clock>e.until){emitters.splice(i,1);continue;}
    if(e.fall){e.vel.y-=6*dt;e.pos=vadd(e.pos,vmul(e.vel,dt));if(e.pos.y<terrainH(e.pos.x,e.pos.z)){explosion(e.pos,1.5,true);emitters.splice(i,1);continue;}}
    e.t-=dt;if(e.t<=0){e.t=e.rate;if(e.smoke&&e.until-clock>35)spawn(vadd(e.pos,rv(9)),v3(rnd()*2,7+rnd()*5,rnd()*2),0.9,20,7,[1,0.62,0.22],0.85);if(e.smoke)spawn(vadd(e.pos,rv(8)),v3(4+rnd()*3,14+rnd()*8,rnd()*3),14,18,130,[0.16,0.15,0.14],0.6);
      else{spawn(e.pos,rv(6),4,6,34,[0.2,0.19,0.18],0.6);spawn(e.pos,rv(4),0.5,9,5,[1,0.6,0.2],0.9);}}}
  /* exhaust heat smoke at mil+ and shadow */
  shadow.visible=p.alive&&p.agl<500&&!(state==='fly'&&view===0);if(shadow.visible){const off=Math.min(p.agl/Math.max(sunDir.y,0.08),2500),sx=p.pos.x-sunDir.x*off,sz=p.pos.z-sunDir.z*off;shadow.position.set(sx,terrainH(sx,sz)+0.5,sz);const k=1+p.agl/160;shadow.scale.set(k,k,k);shadow.material.opacity=0.36/k;shadow.rotation.z=-p.euler().hdg;}
  for(const r of rings){const d=r.userData;if(d.t<1.5){d.t+=dt;const k=d.t/1.5;r.scale.setScalar(25+k*95*d.s);r.material.opacity=(1-k)*0.5;}else r.material.opacity=0;}
  if(dt>0&&state==='fly'&&p.alive){const vap=p.g>5.5&&p.V>110?clamp((p.g-5.5)/3,0,1):0;
    if(vap>0)for(const s of[-6.5,6.5])spawn(vadd(p.pos,qrot(p.q,v3(s,0.3,4.6))),vmul(p.vel,0.03),0.5+vap*0.6,1.4,5,[1,1,1],0.3*vap);
    if(p.g>7.2&&rnd()<0.6)spawn(vadd(p.pos,qrot(p.q,v3((rnd()-0.5)*7,1.2,2.5))),vmul(p.vel,0.35),0.22,9,15,[1,1,1],0.14);
    const con=e=>{if(e.pos.y>8200&&e.eng>0.5)spawn(vadd(e.pos,qrot(e.q,v3(0,0,12))),rv(1.5),15,5,34,[1,1,1],0.3,{drag:0.05});};con(p);for(const mg of W.migs)if(mg.alive)con(mg);
    if(p.onGround&&p.V>25&&rnd()<0.5)spawn(vadd(p.pos,qrot(p.q,v3((rnd()-0.5)*3,-2.2,9))),v3(rnd()*4-2,2+rnd()*2,rnd()*4-2),1.6,4,16,[0.72,0.66,0.55],0.12*clamp(p.eng,0.3,1.3));
    const sk=Math.max(p.onGround?clamp(p.V/90,0,1)*0.12:0,p.alpha>18*D2R?clamp((p.alpha*R2D-18)/10,0,1)*0.3:0,p.eng>1.02?0.05:0,gunSnd>0?0.25:0,p.mach>0.97&&p.mach<1.05?0.2:0);if(sk>shake)shake=sk;}
  shake*=Math.exp(-4*Math.max(dt,0.001));
  /* camera */
  const pq=tq.set(p.q.x,p.q.y,p.q.z,p.q.w);
  if(state==='menu'){const a=clock*0.12+0.9;camera.position.set(p.pos.x+Math.cos(a)*34,p.pos.y+7+Math.sin(clock*0.2)*2,p.pos.z+Math.sin(a)*34);camera.up.set(0,1,0);camera.lookAt(p.pos.x,p.pos.y+0.6,p.pos.z);}
  else if(!p.alive){camera.up.set(0,1,0);tv.set(p.pos.x,p.pos.y,p.pos.z);if(camera.position.distanceTo(tv)<60)camera.position.set(p.pos.x-90,p.pos.y+40,p.pos.z+60);camera.lookAt(tv);}
  else if(view===0){const e=qrot(p.q,v3(0,1.15,-4.6));camera.position.set(p.pos.x+e.x,p.pos.y+e.y,p.pos.z+e.z);camera.quaternion.copy(pq);}
  else{camQ.slerp(pq,Math.min(1,dt*5));tv.set(0,8,34).applyQuaternion(camQ);camera.position.set(p.pos.x+tv.x,Math.max(p.pos.y+tv.y,terrainH(p.pos.x+tv.x,p.pos.z+tv.z)+1.5),p.pos.z+tv.z);
    tv.set(0,1,0).applyQuaternion(camQ);camera.up.copy(tv);const f=qrot(p.q,FWD);camera.lookAt(p.pos.x+f.x*90+tv.x*11,p.pos.y+f.y*90+tv.y*11,p.pos.z+f.z*90+tv.z*11);}
  if(shake>0.004&&state==='fly'&&p.alive){const a=shake*(view===0?1:0.5);camera.position.x+=(rnd()-0.5)*a*0.07;camera.position.y+=(rnd()-0.5)*a*0.07;camera.rotateX((rnd()-0.5)*a*0.006);camera.rotateZ((rnd()-0.5)*a*0.008);}
  sky.position.copy(camera.position);sunSp.position.copy(camera.position).addScaledVector(sunDir,280000);sunHalo.position.copy(sunSp.position);
}
function resize(){const r=$('app').getBoundingClientRect();vw=Math.max(200,r.width);vh=Math.max(200,r.height);dpr=Math.min(window.devicePixelRatio||1,2);
  renderer.setPixelRatio(dpr);renderer.setSize(vw,vh,false);camera.aspect=vw/vh;camera.fov=vw<vh?78:62;camera.updateProjectionMatrix();
  hudc.width=vw*dpr;hudc.height=vh*dpr;pmat.uniforms.scale.value=vh*dpr/(2*Math.tan(camera.fov*D2R/2));}
addEventListener('resize',resize);
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const wall=Math.min(1,(now-last)/1000),dt=Math.min(0.05,Math.max(0.001,(now-last)/1000));last=now;clock+=dt;
  if(state==='fly'){
    readInput(dt);if(W.mwarn&&timeAcc>1)timeAcc=1;
    simAcc+=dt*timeAcc;const h=1/120;let n=0;
    while(simAcc>=h&&n<48){W.trigger(trig,h);if(W.cmHeld){W.cmT-=h;if(W.cmT<=0){W.cmT=0.3;W.dispense(W.player);}}else W.cmT=0;W.step(h);simAcc-=h;n++;}
    if(n===48)simAcc=0;if(n>0)tap.fire=tap.cm=false;
    handleEvents();
    const p=W.player;gAcc=clamp(gAcc+(Math.max(0,p.g-6.5)*0.1-(p.g<5?0.3:0))*dt*timeAcc,0,1);
    if(W.over){overT+=wall;if(overT>(p.alive?1.5:4))debrief();}
  }
  const sdt=state==='fly'?dt*timeAcc:state==='pause'?0:dt;
  if(sdt>0)updParticles(sdt);syncScene(sdt);updRadio(dt);updAudio(dt);
  renderer.render(scene,camera);drawHUD();}
/* ================= HUD ================= */
const HUDC='#74ff96',AMB='#ffbe55',RED='#ff5c4f',hudWarn={pull:false,stall:false};let u=1;
function proj(x,y,z){tv.set(x,y,z).project(camera);const b=tv.z>1;return{x:(tv.x*0.5+0.5)*vw,y:(-tv.y*0.5+0.5)*vh,ok:!b&&tv.z>-1,b};}
const projD=d=>proj(camera.position.x+d.x*9000,camera.position.y+d.y*9000,camera.position.z+d.z*9000);
function font(s,b){ctx.font=`${b?'700 ':''}${Math.round(s*u)}px "Share Tech Mono",ui-monospace,Menlo,Consolas,monospace`;}
function txt(s,x,y,al,sz,col){font(sz||15);ctx.textAlign=al||'left';ctx.fillStyle=col||HUDC;ctx.fillText(s,x,y);}
function line(...a){ctx.beginPath();ctx.moveTo(a[0],a[1]);for(let i=2;i<a.length;i+=2)ctx.lineTo(a[i],a[i+1]);ctx.stroke();}
const dirAE=(az,el)=>v3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));
function drawHUD(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.direction='ltr';ctx.clearRect(0,0,vw,vh);if(state!=='fly'&&state!=='pause'||!W)return;
  const p=W.player,w=W.w,m=Math.min(vw,vh),cx=vw/2,cy=vh/2;u=clamp(m/700,0.62,1.3);
  const e=p.euler(),kcas=p.V*Math.sqrt((p.rho||1.225)/1.225)*KT,altF=p.pos.y*FT,blink=(clock*4|0)%2===0;
  ctx.lineWidth=1.6*u;ctx.strokeStyle=HUDC;ctx.fillStyle=HUDC;ctx.textBaseline='middle';ctx.shadowColor='rgba(0,25,5,0.85)';ctx.shadowBlur=3;
  if(!p.alive){ctx.shadowBlur=0;return;}
  /* cockpit frame */
  const ms=clamp(m*0.27,104,230),panelH=ms+18;
  if(view===0){ctx.save();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(13,15,16,0.97)';ctx.lineWidth=24*u;ctx.beginPath();ctx.ellipse(cx,vh*0.95,vw*0.62,vh*1.05,0,Math.PI,2*Math.PI);ctx.stroke();
    ctx.strokeStyle='rgba(96,104,108,0.4)';ctx.lineWidth=1.5*u;ctx.beginPath();ctx.ellipse(cx,vh*0.95,vw*0.62-11*u,vh*1.05-11*u,0,Math.PI,2*Math.PI);ctx.stroke();
    const hw=m*0.37,hy0=cy-m*0.47,hy1=vh-panelH*0.86;ctx.fillStyle='rgba(120,255,170,0.03)';ctx.fillRect(cx-hw,hy0,2*hw,hy1-hy0);
    ctx.strokeStyle='rgba(15,17,18,0.93)';ctx.lineWidth=5*u;line(cx-hw,hy1,cx-hw,hy0,cx+hw,hy0,cx+hw,hy1);
    ctx.strokeStyle='rgba(110,120,124,0.4)';ctx.lineWidth=1*u;line(cx-hw+3.5*u,hy1,cx-hw+3.5*u,hy0+3.5*u,cx+hw-3.5*u,hy0+3.5*u,cx+hw-3.5*u,hy1);
    const g=ctx.createLinearGradient(0,vh-panelH-36,0,vh);g.addColorStop(0,'rgba(38,41,42,0.98)');g.addColorStop(0.22,'rgba(23,26,27,0.99)');g.addColorStop(1,'rgba(8,10,11,1)');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,vh);ctx.lineTo(0,vh-panelH*0.72);ctx.quadraticCurveTo(cx,vh-panelH-36,vw,vh-panelH*0.72);ctx.lineTo(vw,vh);ctx.fill();
    ctx.strokeStyle='rgba(125,134,138,0.38)';ctx.lineWidth=1.5*u;ctx.beginPath();ctx.moveTo(0,vh-panelH*0.72);ctx.quadraticCurveTo(cx,vh-panelH-36,vw,vh-panelH*0.72);ctx.stroke();
    ctx.restore();}
  /* pitch ladder */
  const fw=qrot(p.q,FWD),vhat=p.V>15?vmul(p.vel,1/p.V):fw;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy-m*0.02,m*0.33,0,7);ctx.clip();
  const pd=e.pitch*R2D;
  for(let a=-90;a<=90;a+=5){if(Math.abs(a-pd)>23)continue;const el=a*D2R,ce=Math.max(0.05,Math.cos(el)),o=(a===0?17:7.5)*D2R/ce,gp=2.4*D2R/ce;
    const l1=projD(dirAE(e.hdg-o,el)),l2=projD(dirAE(e.hdg-gp,el)),r1=projD(dirAE(e.hdg+gp,el)),r2=projD(dirAE(e.hdg+o,el));
    if(!l1.ok||!r2.ok)continue;ctx.setLineDash(a<0?[7*u,5*u]:[]);line(l1.x,l1.y,l2.x,l2.y);line(r1.x,r1.y,r2.x,r2.y);ctx.setLineDash([]);
    if(a!==0){const dx=r2.x-l1.x,dy=r2.y-l1.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,s=(a>0?1:-1)*7*u;line(l1.x,l1.y,l1.x+nx*s,l1.y+ny*s);line(r2.x,r2.y,r2.x+nx*s,r2.y+ny*s);
      txt(String(Math.abs(a)),l1.x-dx/L*14*u,l1.y-dy/L*14*u,'center',12);txt(String(Math.abs(a)),r2.x+dx/L*14*u,r2.y+dy/L*14*u,'center',12);}}
  ctx.restore();
  /* waterline and flight path marker */
  const wl=projD(fw);if(wl.ok){const s=6*u;line(wl.x-3*s,wl.y,wl.x-s,wl.y,wl.x-s/2,wl.y+s,wl.x,wl.y,wl.x+s/2,wl.y+s,wl.x+s,wl.y,wl.x+3*s,wl.y);}
  const fp=projD(vhat);if(fp.ok&&p.V>15){const r=7*u;ctx.beginPath();ctx.arc(fp.x,fp.y,r,0,7);ctx.stroke();line(fp.x-r,fp.y,fp.x-r*2.8,fp.y);line(fp.x+r,fp.y,fp.x+r*2.8,fp.y);line(fp.x,fp.y-r,fp.x,fp.y-r*2);}
  /* heading tape */
  const ty=Math.max(34*u,cy-m*0.41),ppd=5.2*u,hd=e.hdg*R2D;
  ctx.save();ctx.beginPath();ctx.rect(cx-22*ppd,ty-22*u,44*ppd,44*u);ctx.clip();
  for(let d=Math.floor((hd-24)/5)*5;d<=hd+24;d+=5){const x=cx+(d-hd)*ppd,dd=((d%360)+360)%360;line(x,ty,x,ty+(dd%10?5:9)*u);if(dd%10===0)txt(String(dd/10).padStart(2,'0'),x,ty-10*u,'center',14);}
  ctx.restore();line(cx-6*u,ty+20*u,cx,ty+11*u,cx+6*u,ty+20*u);
  const wp=W.wps[W.wp],wb=Math.atan2(wp.x-p.pos.x,-(wp.z-p.pos.z)),wd=Math.hypot(wp.x-p.pos.x,wp.z-p.pos.z);
  let rb=((wb-e.hdg)*R2D+540)%360-180;const wx=cx+clamp(rb,-21,21)*ppd;ctx.strokeStyle=ctx.fillStyle=HUDC;line(wx,ty+10*u,wx-5*u,ty+19*u,wx+5*u,ty+19*u,wx,ty+10*u);line(wx,ty+19*u,wx,ty+26*u);
  /* speed / altitude */
  const sx=cx-m*0.33,ax=cx+m*0.33;
  ctx.strokeRect(sx-34*u,cy-13*u,68*u,26*u);txt(String(Math.round(kcas)),sx+28*u,cy+1,'right',20);
  txt('M '+p.mach.toFixed(2),sx-34*u,cy+30*u,'left',14);txt('G '+p.g.toFixed(1),sx-34*u,cy+48*u,'left',14,p.g>8.5?AMB:HUDC);txt('α '+(p.alpha*R2D).toFixed(1),sx-34*u,cy+66*u,'left',14,p.alpha>24*D2R?AMB:HUDC);
  ctx.strokeRect(ax-40*u,cy-13*u,80*u,26*u);txt(String(Math.round(altF/10)*10),ax+34*u,cy+1,'right',20);
  if(p.agl<1500)txt('R '+Math.round(p.agl*FT/10)*10,ax+40*u,cy+30*u,'right',14);txt('VS '+Math.round(p.vel.y*196.85/100)*100,ax+40*u,cy+48*u,'right',14);
  /* nav */
  const by=cy+m*0.27,eta=wd/Math.max(p.V,30);
  txt(`WP${W.wp+1} ${wp.n}`,ax+40*u,by,'right',14);txt(`${(wd/NM).toFixed(1)}NM  ${Math.floor(eta/60)}:${String(Math.floor(eta%60)).padStart(2,'0')}`,ax+40*u,by+18*u,'right',14);
  const names={AIM120:'MRM AIM-120',PYTHON:'SRM PYTHON-5',GUN:'GUN M61',SPICE:'A/G SPICE-2000'},cnt={AIM120:w.aim120,PYTHON:w.python,GUN:w.gun,SPICE:w.spice};
  txt(names[w.sel],sx-34*u,by,'left',14);txt('×'+cnt[w.sel]+(cnt[w.sel]?'  ARM':'  EMPTY'),sx-34*u,by+18*u,'left',14,cnt[w.sel]?HUDC:AMB);
  /* target symbology */
  const bar=(R0,rmax,rne,label)=>{const x=cx+m*0.24,y0=cy-m*0.15,y1=cy+m*0.15,top=Math.max(rmax*1.25,R0*1.08,1),Y=r=>y1-(y1-y0)*clamp(r/top,0,1);
    line(x,y0,x,y1);line(x,Y(rmax),x+10*u,Y(rmax));if(rne)line(x,Y(rne),x+7*u,Y(rne));const yc=Y(R0);line(x-11*u,yc-5*u,x-2*u,yc,x-11*u,yc+5*u);txt(label,x-14*u,yc,'right',13);};
  const locate=(s)=>{let dx=s.x-cx,dy=s.y-cy;if(s.b){dx=-dx;dy=-dy;}const L=Math.hypot(dx,dy)||1;if(s.ok&&s.x>0&&s.x<vw&&s.y>0&&s.y<vh)return true;
    const rr=m*0.2;line(cx+dx/L*rr*0.5,cy+dy/L*rr*0.5,cx+dx/L*rr,cy+dy/L*rr);ctx.beginPath();ctx.arc(cx+dx/L*rr,cy+dy/L*rr,3*u,0,7);ctx.fill();return false;};
  const L=W.lock;
  if(w.sel!=='SPICE'){
    if(L&&L.alive){const s=proj(L.pos.x,L.pos.y,L.pos.z),r=vsub(L.pos,p.pos),Rg=vlen(r),vc=-vdot(vsub(L.vel,p.vel),vmul(r,1/Rg));
      if(locate(s)){const b=12*u;ctx.strokeRect(s.x-b,s.y-b,2*b,2*b);}
      const ix=ax+40*u,iy=cy+78*u;txt(L.type,ix,iy,'right',14);txt((Rg/NM).toFixed(1)+' NM',ix,iy+17*u,'right',14);txt('VC '+Math.round(vc*KT),ix,iy+34*u,'right',14);txt('ALT '+(L.pos.y*FT/1000).toFixed(1)+'K',ix,iy+51*u,'right',14);
      if(w.sel==='AIM120'&&W.dlz){const z=W.dlz;bar(Rg,z.rmax,z.rmax*0.42,(Rg/NM).toFixed(1));
        if(Rg<z.rmax&&w.aim120>0&&!p.onGround&&(Rg<z.rmax*0.42||blink))txt('SHOOT',cx,cy+m*0.2,'center',20);if(z.tof)txt('TOF '+Math.round(z.tof),cx+m*0.24,cy+m*0.15+14*u,'center',13);}}
    if(w.sel==='PYTHON'){const I=W.irTgt;if(I){const s=proj(I.pos.x,I.pos.y,I.pos.z);if(s.ok){ctx.beginPath();ctx.arc(s.x,s.y,17*u,0,7);ctx.stroke();}
        const Rg=vdist(I.pos,p.pos);if(W.dlz){bar(Rg,W.dlz.rmax,W.dlz.rmax*0.5,(Rg/NM).toFixed(1));if(Rg<W.dlz.rmax&&w.python>0&&blink)txt('SHOOT',cx,cy+m*0.2,'center',20);}}
      else{ctx.setLineDash([4*u,6*u]);ctx.beginPath();ctx.arc(wl.x,wl.y,m*0.2,0,7);ctx.stroke();ctx.setLineDash([]);}}
    if(w.sel==='GUN'){let tof=0.55,tvl=v3();if(L&&L.alive){const Rg=vdist(L.pos,p.pos);if(Rg<3500){tof=Rg/(1030+Math.max(0,-vdot(vsub(L.vel,p.vel),vnorm(vsub(L.pos,p.pos)))));tvl=L.vel;}}
      const bp=vadd(vadd(camera.position,vmul(vadd(vsub(p.vel,tvl),vmul(fw,1030)),tof)),v3(0,-4.9*tof*tof,0)),s=proj(bp.x,bp.y,bp.z);
      if(s.ok){ctx.beginPath();ctx.arc(s.x,s.y,15*u,0,7);ctx.stroke();ctx.beginPath();ctx.arc(s.x,s.y,1.6*u,0,7);ctx.fill();if(wl.ok){ctx.setLineDash([3*u,5*u]);line(wl.x,wl.y,s.x,s.y);ctx.setLineDash([]);}}}
    if(!L&&W.contacts.length&&blink&&w.sel!=='GUN')txt('CONTACT  T = LOCK',cx,cy+m*0.2,'center',13);
  }else{const g=W.gtgt,b=W.bombSol();
    if(g&&b){const s=proj(g.pos.x,g.pos.y+4,g.pos.z);if(locate(s)){const d=11*u;line(s.x,s.y-d,s.x+d,s.y,s.x,s.y+d,s.x-d,s.y,s.x,s.y-d);}
      const ix=ax+40*u,iy=cy+78*u;txt(g.name,ix,iy,'right',14);txt((b.hd/NM).toFixed(1)+' NM',ix,iy+17*u,'right',14);txt('MAX '+(b.rmax/NM).toFixed(1),ix,iy+34*u,'right',14);
      bar(b.hd,b.rmax,b.rmin,(b.hd/NM).toFixed(1));
      txt(b.ok?'IN RNG':b.hd>b.rmax?'OUT RNG':b.hd<b.rmin?'TOO CLOSE':'STEER TO TGT',cx,cy+m*0.2,'center',b.ok?20:15,b.ok?HUDC:AMB);}
    else txt('NO TARGET',cx,cy+m*0.2,'center',15,AMB);
    for(const b2 of W.bombs){const s=proj(b2.pos.x,b2.pos.y,b2.pos.z);if(s.ok){ctx.beginPath();ctx.arc(s.x,s.y,3*u,0,7);ctx.stroke();}}}
  /* waypoint marker */
  {const s=proj(wp.x,W.wp===3?BY:Math.max(terrainH(wp.x,wp.z),wp.alt||0),wp.z);if(s.ok&&wd>3000){ctx.beginPath();ctx.arc(s.x,s.y,5*u,0,7);ctx.stroke();txt(String(W.wp+1),s.x+9*u,s.y-9*u,'left',12);}}
  /* ILS */
  if(W.wp===3&&wd<32000&&!p.onGround){const east=p.pos.x>0,tx=east?RWY.x2-250:RWY.x1+250,dx=Math.abs(p.pos.x-tx),ga=Math.atan2(p.pos.y-BY,dx)*R2D,la=Math.atan2(p.pos.z,dx)*R2D*(east?1:-1);
    const k=14*u,gx=cx+clamp(la,-4,4)*k,gy=cy+clamp(ga-3,-3,3)*k*1.4;ctx.strokeStyle=AMB;line(gx,cy-48*u,gx,cy+48*u);line(cx-48*u,gy,cx+48*u,gy);ctx.strokeStyle=HUDC;
    txt(`ILS ${east?'27':'09'}  GS ${ga.toFixed(1)}°`,cx,cy+m*0.27,'center',13,AMB);
    const c=[[RWY.x1,-30],[RWY.x2,-30],[RWY.x2,30],[RWY.x1,30]].map(q=>proj(q[0],BY+0.4,q[1]));if(c.every(q=>q.ok)){ctx.beginPath();c.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.stroke();}}
  /* warnings */
  const ahead=terrainH(p.pos.x+p.vel.x*5,p.pos.z+p.vel.z*5);
  hudWarn.pull=!p.onGround&&p.gearPos<0.5&&p.pos.y+p.vel.y*5<ahead+40;hudWarn.stall=!p.onGround&&(p.alpha>26.5*D2R||kcas<105&&p.gearPos<0.5);
  const wr=[];if(W.mwarn){const oc=((Math.round(W.mwarn.brg*R2D/30)+12)%12)||12;wr.push([`MISSILE ${oc} O'CLOCK  ${(W.mwarn.R/1000).toFixed(1)}KM`,RED]);}
  if(hudWarn.pull)wr.push(['PULL UP',RED]);if(hudWarn.stall)wr.push(['STALL',AMB]);
  if(!p.onGround&&p.gearPos<0.5&&p.agl<260&&kcas<210)wr.push(['GEAR',AMB]);if(p.fuel<1800)wr.push(['BINGO FUEL',AMB]);if(p.gearPos>0.5&&kcas>300)wr.push(['GEAR SPEED',AMB]);
  if(p.onGround&&W.time<25&&lever<0.05&&W.stats.start==='runway')wr.push(['HOLD SHIFT — THROTTLE UP',HUDC]);
  wr.forEach((q,i)=>{if(q[1]!==RED||blink)txt(q[0],cx,cy-m*0.25+i*24*u,'center',19,q[1]);});
  if(timeAcc>1)txt('TIME ×'+timeAcc,cx,ty+44*u,'center',14,AMB);
  /* MFDs */
  ctx.shadowBlur=0;const pad=10*u,y0=vh-ms-pad-(touchOn?132:0);
  const box=(x,title)=>{if(view===0){const b=9*u;ctx.fillStyle='#1a1d1f';ctx.strokeStyle='#3a4043';ctx.lineWidth=1.5*u;ctx.beginPath();ctx.rect(x-b,y0-b,ms+2*b,ms+2*b);ctx.fill();ctx.stroke();ctx.fillStyle='#30363a';
      for(let i=0;i<5;i++){const t=y0+ms*(i+0.5)/5-3*u,q=x+ms*(i+0.5)/5-5*u;ctx.fillRect(x-b+1.5*u,t,5*u,6*u);ctx.fillRect(x+ms+b-6.5*u,t,5*u,6*u);ctx.fillRect(q,y0-b+1.5*u,10*u,5*u);}}
    ctx.fillStyle=view===0?'rgba(2,10,6,0.97)':'rgba(4,14,9,0.78)';ctx.fillRect(x,y0,ms,ms);ctx.strokeStyle='rgba(116,255,150,0.55)';ctx.lineWidth=1.2*u;ctx.strokeRect(x,y0,ms,ms);txt(title,x+5*u,y0+10*u,'left',11);};
  /* radar B-scope */
  {const x=pad;let need=40*NM;if(w.sel==='SPICE'&&W.gtgt)need=vdist(W.gtgt.pos,p.pos)*1.2;else if(L)need=vdist(L.pos,p.pos)*1.25;else if(W.contacts.length)need=W.contacts[W.contacts.length-1].R*1.1;
    const sc=[10,20,40,80].find(v=>v*NM>=need)||80,Rm=sc*NM;box(x,'RDR '+sc+'NM');
    const X=az=>x+ms/2+az/(60*D2R)*(ms/2-7*u),Y=r=>y0+ms-8*u-clamp(r/Rm,0,1)*(ms-26*u);
    ctx.strokeStyle='rgba(116,255,150,0.22)';for(const f of[0.25,0.5,0.75,1])line(x+4,Y(Rm*f),x+ms-4,Y(Rm*f));for(const a of[-30,0,30])line(X(a*D2R),Y(0),X(a*D2R),Y(Rm));
    ctx.strokeStyle=ctx.fillStyle=HUDC;const sw=((clock*1.3)%2);const sa=(sw<1?sw*2-1:3-sw*2)*60*D2R;ctx.globalAlpha=0.4;line(X(sa),Y(0),X(sa),Y(Rm));ctx.globalAlpha=1;
    for(const c of W.contacts){if(c.R>Rm||Math.abs(c.az)>60*D2R)continue;const px=X(c.az),py=Y(c.R);ctx.fillRect(px-4*u,py-2*u,8*u,4*u);if(c.e===L){ctx.beginPath();ctx.arc(px,py,8*u,0,7);ctx.stroke();}}
    const gb=(pos)=>{const az=((Math.atan2(pos.x-p.pos.x,-(pos.z-p.pos.z))-e.hdg)+9*Math.PI)%(2*Math.PI)-Math.PI,r=Math.hypot(pos.x-p.pos.x,pos.z-p.pos.z);return Math.abs(az)<60*D2R&&r<Rm?[X(az),Y(r)]:null;};
    for(const g of W.ground){if(!g.alive||g.kind==='launcher')continue;const q=gb(g.pos);if(!q)continue;ctx.strokeStyle=g.kind==='radar'?RED:AMB;const d=4*u;ctx.strokeRect(q[0]-d,q[1]-d,2*d,2*d);if(g===W.gtgt&&w.sel==='SPICE'){ctx.beginPath();ctx.arc(q[0],q[1],8*u,0,7);ctx.stroke();}}
    ctx.strokeStyle=HUDC;const q=gb(wp);if(q){ctx.beginPath();ctx.arc(q[0],q[1],4*u,0,7);ctx.stroke();}}
  /* RWR */
  {const x=vw-ms-pad;box(x,'TEWS');const ox=x+ms/2,oy=y0+ms/2+4*u,rr=ms/2-12*u;ctx.strokeStyle='rgba(116,255,150,0.3)';ctx.beginPath();ctx.arc(ox,oy,rr,0,7);ctx.stroke();ctx.beginPath();ctx.arc(ox,oy,rr*0.5,0,7);ctx.stroke();line(ox,oy-6*u,ox,oy+6*u);line(ox-6*u,oy,ox+6*u,oy);
    for(const t of W.threats||[]){const r=rr*[0.86,0.66,0.46,0.3][t.lvl],px=ox+Math.sin(t.brg)*r,py=oy-Math.cos(t.brg)*r,col=t.lvl>=3?RED:t.lvl===2?RED:t.lvl===1?AMB:HUDC;
      if(t.lvl>=2&&!blink&&t.sym!=='M')continue;txt(t.sym,px,py,'center',13,col);ctx.strokeStyle=col;if(t.lvl>=1){const d=10*u;line(px,py-d,px+d,py,px,py+d,px-d,py,px,py-d);}}
    txt('CH '+w.chaff,x+5*u,y0+ms-9*u,'left',11);txt('FL '+w.flare,x+ms-5*u,y0+ms-9*u,'right',11);}
  /* status strip */
  {const sw2=vw-2*(ms+pad)-16*u,xc=cx,yb=vh-pad-(touchOn?132:0);if(sw2>150*u){
    if(view===0){const bw=Math.min(sw2,sw2>330*u?340*u:230*u);ctx.fillStyle='#14171a';ctx.strokeStyle='#3a4043';ctx.lineWidth=1.5*u;ctx.beginPath();ctx.rect(xc-bw/2,yb-72*u,bw,78*u);ctx.fill();ctx.stroke();ctx.fillStyle='#30363a';for(const sx of[-1,1]){ctx.beginPath();ctx.arc(xc+sx*(bw/2-9*u),yb-63*u,3*u,0,7);ctx.fill();ctx.beginPath();ctx.arc(xc+sx*(bw/2-9*u),yb-3*u,3*u,0,7);ctx.fill();}}
    const thr=p.eng>1.01?'AB '+Math.round((p.eng-1)/0.3*100)+'%':Math.round(p.eng*100)+'%';
    txt(`FUEL ${Math.round(p.fuel)} KG   FF ${(p.ff*3.6).toFixed(1)} T/H`,xc,yb-58*u,'center',13,p.fuel<1800?AMB:HUDC);
    txt(`THR ${thr}`,xc,yb-40*u,'center',14,p.eng>1.01?AMB:HUDC);
    const it=[['GEAR',p.gearPos>0.9,p.gearPos>0.05&&p.gearPos<=0.9],['FLAPS',p.flaps],['BRK',p.brakePos>0.5]];let tx=xc-78*u;
    for(const q of it){txt(q[0],tx,yb-21*u,'left',13,q[2]?AMB:q[1]?HUDC:'rgba(116,255,150,0.28)');tx+=60*u;}
    if(sw2>330*u){let s2='';for(const k of WSEL)s2+=(k===w.sel?'▸':' ')+{AIM120:'120',PYTHON:'PY5',GUN:'GUN',SPICE:'SPC'}[k]+' '+cnt[k]+'  ';txt(s2.trim(),xc,yb-4*u,'center',12);}}}
  /* g vignette */
  if(gAcc>0.02){const g=ctx.createRadialGradient(cx,cy,m*(0.75-gAcc*0.62),cx,cy,m*(0.95-gAcc*0.4));g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${Math.min(1,gAcc*1.5)})`);ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);}
  /* objectives */
  if((clock*2|0)!==drawHUD.t){drawHUD.t=clock*2|0;const s=W.stats;$('obj').textContent=`כטב"מים ${s.uav}/4 · מטרות ${s.tgt}/3 · מיגים ${s.mig}/2`;}
}
const touchOn=matchMedia('(pointer:coarse)').matches;
$('voiceTest').onclick=()=>{Snd.init();if(Snd.ac&&Snd.ac.state==='suspended')Snd.ac.resume();if(!Voice.v)pickVoice();if(!say('בקר: פטיש אחת, שומע אותך חמש על חמש.'))pickVoice();};
$('todDay').onclick=()=>setTOD('day');$('todDusk').onclick=()=>setTOD('dusk');
resize();setTOD('day');newGame('runway');requestAnimationFrame(frame);
window.__raam={get W(){return W;},start,keys,setTOD,get state(){return state;}};
})();
