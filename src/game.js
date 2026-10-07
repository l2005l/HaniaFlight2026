'use strict';
(async()=>{
const R=RAAM,{D2R,R2D,KT,FT,NM,clamp,lerp,sstep,v3,vadd,vsub,vmul,vdot,vlen,vnorm,vdist,qrot,qrotInv,FWD,UP,terrainH,TER,SITES,RWY}=R;
const $=id=>document.getElementById(id),T=window.THREE;
const glc=$('gl'),hudc=$('hud');let ctx=hudc.getContext('2d');
let renderer;
try{if(!T)throw 0;renderer=new T.WebGLRenderer({canvas:glc,antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}
catch(e){$('loadErr').hidden=false;$('loading').hidden=true;$('startRwy').disabled=$('startAir').disabled=true;return;}
let W=null,state='menu',view=0,timeAcc=1,simAcc=0,muted=false,overT=0,gAcc=0,vw=1,vh=1,dpr=1,clock=0;
const rnd=(()=>{let a=1234567;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();
/* loading is split into slices with a pause between them, so the page paints, the bar moves and taps register */
const tick=()=>new Promise(r=>setTimeout(r,0)),loadBar=document.querySelector('#loading .bar i');
const prog=p=>{if(loadBar){loadBar.style.animation='none';loadBar.style.width=Math.round(p*100)+'%';}return tick();};
let theatre0='south';try{const o=JSON.parse(localStorage.getItem('haniaflight-opts')||'{}');if(o.theatre==='north'){theatre0='north';R.setTheatre('north');}}catch(e){}
for(const p of R.terrainSteps())await prog(p*0.55);

/* ================= scene ================= */
const scene=new T.Scene(),HAZE=0xc3d2d6;scene.fog=new T.FogExp2(HAZE,1.25e-5);scene.background=new T.Color(HAZE);
const camera=new T.PerspectiveCamera(62,1,0.8,500000);
const sunDir=new T.Vector3(-0.45,0.62,0.5).normalize();
const hemi=new T.HemisphereLight(0xdfeaf5,0x8a7a5c,0.78);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff2d8,0.85);sun.position.copy(sunDir);scene.add(sun);
const lam=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{}));
const part=(g,m,x,y,z,par)=>{const me=new T.Mesh(g,m);me.position.set(x||0,y||0,z||0);par.add(me);return me;};
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);return t;}
let sky,sunSp,sunHalo,seaMat,tod='day';const cloudMats=[],duskOnly=[],cloudSp=[];
const TOD={day:{zen:0x2c66ad,mid:0x86b4d6,hz:0xc3d2d6,hz2:0xc3d2d6,sun:[-0.45,0.62,0.5],sunCol:0xfff2d8,sunI:0.85,sky:0xdfeaf5,gnd:0x8a7a5c,hemiI:0.78,fog:1.25e-5,cloud:0xffffff,glow:0xfff6dc,halo:0.22,sea:0x2d6d8c},
  dusk:{zen:0x1f2f5c,mid:0x8e7f9c,hz:0xf2a868,hz2:0x6f7396,sun:[-0.9,0.11,0.3],sunCol:0xff9a55,sunI:1.15,sky:0xa3a6cc,gnd:0x6b5644,hemiI:0.78,fog:1.5e-5,cloud:0xffbf98,glow:0xff9a4a,halo:0.6,sea:0x2a4a6a},
  night:{zen:0x03050c,mid:0x070b16,hz:0x101726,hz2:0x0a0f1a,sun:[0.35,0.55,-0.6],sunCol:0x8fa6d8,sunI:0.2,sky:0x2a3550,gnd:0x0c0e12,hemiI:0.2,fog:1.1e-5,cloud:0x1a2030,glow:0xcfdcff,halo:0.07,sea:0x070d16}};const nightOnly=[];
{const g=new T.SphereGeometry(300000,48,24);g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3),3));
  sky=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
  const puff=canvasTex(128,128,(x,w)=>{const gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.1,'rgba(255,255,255,0.9)');gr.addColorStop(0.35,'rgba(255,255,255,0.2)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,w);});
  const mk=(sc,op)=>{const sp=new T.Sprite(new T.SpriteMaterial({map:puff,blending:T.AdditiveBlending,fog:false,depthWrite:false,opacity:op}));sp.scale.setScalar(sc);sp.renderOrder=-9;scene.add(sp);return sp;};
  sunSp=mk(80000,1);sunHalo=mk(330000,0.25);}
let nvg=false;function setNVG(on){nvg=on;glc.style.filter=on?'grayscale(1) brightness(5) contrast(1.15) sepia(1) hue-rotate(62deg) saturate(3.2)':'';}
{const a=[];for(let i=0;i<1400;i++){const u=rnd()*2-1,t=rnd()*6.283,r=Math.sqrt(1-u*u),y=Math.abs(u)*0.97+0.03;a.push(r*Math.cos(t)*280000,y*280000,r*Math.sin(t)*280000);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));const st=new T.Points(g,new T.PointsMaterial({color:0xdfe6ff,size:1.6,sizeAttenuation:false,fog:false,depthWrite:false,transparent:true,opacity:0.85}));st.frustumCulled=false;st.renderOrder=-9;st.visible=false;scene.add(st);nightOnly.push(st);}
const DECK=2600,wxB={fog:1e-5,sunI:1,hemiI:1,col:new T.Color()};let deck;
{const t=canvasTex(256,256,(x,w)=>{x.fillStyle='#fff';x.fillRect(0,0,w,w);for(let i=0;i<260;i++){const g=150+rnd()*105|0;x.fillStyle=`rgba(${g},${g},${g+6},0.16)`;x.beginPath();x.arc(rnd()*w,rnd()*w,10+rnd()*34,0,7);x.fill();}});t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(70,70);
  deck=new T.Mesh(new T.PlaneGeometry(700000,700000),new T.MeshBasicMaterial({map:t,transparent:true,opacity:0.94,side:T.DoubleSide,depthWrite:false}));deck.rotation.x=-Math.PI/2;deck.position.set(100000,DECK,0);deck.visible=false;deck.renderOrder=-5;scene.add(deck);}
function updWx(){const st=!!W&&W.wx==='storm';if(deck.visible!==st)deck.visible=st;if(!st){if(updWx.on){updWx.on=false;scene.fog.density=wxB.fog;scene.fog.color.copy(wxB.col);sun.intensity=wxB.sunI;hemi.intensity=wxB.hemiI;sunSp.visible=sunHalo.visible=true;}return;}
  updWx.on=true;const y=camera.position.y,d=Math.abs(y-DECK),inC=clamp(1-d/260,0,1),below=y<DECK,night=tod==='night';
  deck.material.color.setScalar(night?0.1:below?(tod==='dusk'?0.5:0.62):1);if(tod==='dusk'&&!below)deck.material.color.setRGB(1,0.82,0.7);
  scene.fog.density=wxB.fog*(below?3.2:1.3)+inC*4e-3;tv.set(night?0.05:0.62,night?0.06:0.64,night?0.08:0.67);scene.fog.color.setRGB(lerp(wxB.col.r,tv.x,Math.max(below?0.55:0,inC)),lerp(wxB.col.g,tv.y,Math.max(below?0.55:0,inC)),lerp(wxB.col.b,tv.z,Math.max(below?0.55:0,inC)));
  sun.intensity=wxB.sunI*(below?0.35:1);hemi.intensity=wxB.hemiI*(below?0.85:1);sunSp.visible=sunHalo.visible=!below&&inC<0.5;}
function setTOD(k){tod=k;const c=TOD[k],pos=sky.geometry.attributes.position,col=sky.geometry.attributes.color,zen=new T.Color(c.zen),mid=new T.Color(c.mid),hz=new T.Color(c.hz),hz2=new T.Color(c.hz2),h=new T.Color(),o=new T.Color();
  sunDir.set(c.sun[0],c.sun[1],c.sun[2]).normalize();const sl=Math.hypot(sunDir.x,sunDir.z)||1;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i)/300000,z=pos.getZ(i),hl=Math.hypot(x,z)||1,f=(x*sunDir.x+z*sunDir.z)/(hl*sl)*0.5+0.5;
    h.copy(hz2).lerp(hz,f*f);if(y<=0)o.copy(h);else if(y<0.22)o.copy(h).lerp(mid,y/0.22);else o.copy(mid).lerp(zen,Math.min(1,(y-0.22)/0.55));col.setXYZ(i,o.r,o.g,o.b);}
  col.needsUpdate=true;h.copy(hz2).lerp(hz,0.45);scene.fog.color.copy(h);scene.fog.density=c.fog;scene.background.copy(h);
  sun.color.set(c.sunCol);sun.intensity=c.sunI;sun.position.copy(sunDir);hemi.color.set(c.sky);hemi.groundColor.set(c.gnd);hemi.intensity=c.hemiI;
  for(const m of cloudMats)m.color.set(c.cloud);sunSp.material.color.set(c.glow);sunHalo.material.color.set(c.glow);sunHalo.material.opacity=c.halo;if(seaMat)seaMat.color.set(c.sea);
  wxB.fog=c.fog;wxB.sunI=c.sunI;wxB.hemiI=c.hemiI;wxB.col.copy(scene.fog.color);updWx.on=true;
  for(const d of duskOnly)d.visible=k!=='day';for(const d of nightOnly)d.visible=k==='night';sunSp.scale.setScalar(k==='night'?26000:80000);if(k!=='night')setNVG(false);
}
await prog(0.58);
/* terrain */
{const{nx,nz,cell,x0,z0,h}=TER,P=new Float32Array(nx*nz*3),C=new Float32Array(nx*nz*3),U=new Float32Array(nx*nz*2);
  const mix=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  const sand=[0.80,0.71,0.52],green=[0.50,0.55,0.35],hill=[0.68,0.57,0.42],rock=[0.46,0.40,0.34],pale=[0.66,0.62,0.56],beach=[0.88,0.83,0.66];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=x0+i*cell,z=z0+j*cell,hh=h[k];P[k*3]=x;P[k*3+1]=hh;P[k*3+2]=z;U[k*2]=x/640;U[k*2+1]=z/640;
    const hx=h[j*nx+Math.min(i+1,nx-1)]-h[j*nx+Math.max(i-1,0)],hz=h[Math.min(j+1,nz-1)*nx+i]-h[Math.max(j-1,0)*nx+i],sl=Math.hypot(hx,hz)/(2*cell);
    const n=(Math.sin(i*12.9898+j*78.233)*43758.5453)%1,patch=0.5+0.5*Math.sin(x/3100+Math.sin(z/1900)*1.7)*Math.sin(z/2700+Math.sin(x/2300));
    let c=theatre0==='north'?mix(mix(sand,green,0.55),[0.36,0.47,0.27],sstep(hh,3,40)*(0.35+0.65*patch)*sstep(hh,1500,500)):mix(sand,green,sstep(x,40000,-6000)*sstep(hh,3,30)*(0.25+0.75*patch)*0.85);
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
await prog(0.74);
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
  const towns=[];for(let t=0;t<17;t++){const cx=-9000+rnd()*52000,cz=-60000+rnd()*120000;if(Math.hypot(cx,cz)<5000)continue;if(terrainH(cx,cz)>3)towns.push([cx,cz]);
    for(let i=0;i<100&&n<N;i++){const a=rnd()*7,r=Math.sqrt(rnd())*1000,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,y=terrainH(x,z);if(y<3)continue;
      const hh=4+rnd()*10;tl.push(x,y+hh,z);d.position.set(x,y+hh/2,z);d.scale.set(9+rnd()*16,hh,9+rnd()*16);d.rotation.y=rnd()*3;d.updateMatrix();im.setMatrixAt(n,d.matrix);
      c.setHSL(0.1,0.18,0.72+rnd()*0.2);im.setColorAt(n,c);n++;}}
  im.count=n;im.frustumCulled=false;scene.add(im);
  /* roads between the base and the towns, and farmed plots around them; both follow the terrain triangles exactly */
  {const{nx,nz,cell,x0,z0,h}=TER,mh=(x,z)=>{const gx=clamp((x-x0)/cell,0,nx-1.001),gz=clamp((z-z0)/cell,0,nz-1.001),i=gx|0,j=gz|0,fx=gx-i,fz=gz-j,k=j*nx+i,a=h[k],b=h[k+1],c2=h[k+nx],d2=h[k+nx+1];
      return Math.max(0,fx+fz<=1?a+(b-a)*fx+(c2-a)*fz:d2+(c2-d2)*(1-fx)+(b-d2)*(1-fz));};
    const V=[],C2=[],quad=(p,col)=>{for(const i of[0,1,2,2,1,3]){V.push(p[i][0],p[i][1],p[i][2]);C2.push(col[0],col[1],col[2]);}};
    const road=(x1,z1,x2,z2,w,col)=>{const L=Math.hypot(x2-x1,z2-z1),nseg=Math.max(1,Math.ceil(L/90)),nxn=-(z2-z1)/L*w/2,nzn=(x2-x1)/L*w/2;let pa=null;
      for(let i=0;i<=nseg;i++){const t=i/nseg,bend=Math.min(260,L*0.05)*Math.sin(t*Math.PI)*Math.sin(t*L/1700+x1),x=lerp(x1,x2,t)+nxn/w*2*bend,z=lerp(z1,z2,t)+nzn/w*2*bend;
        const l=[x-nxn,mh(x-nxn,z-nzn)+0.9,z-nzn],r=[x+nxn,mh(x+nxn,z+nzn)+0.9,z+nzn];if(pa&&l[1]>3&&r[1]>3)quad([pa[0],pa[1],l,r],col);pa=[l,r];}};
    const nodes=[[700,640]],asph=[0.2,0.2,0.2],dirt=[0.52,0.46,0.36];
    for(const[cx,cz]of towns){let best=nodes[0],bd=1e12;for(const q of nodes){const d=Math.hypot(q[0]-cx,q[1]-cz);if(d<bd){bd=d;best=q;}}road(best[0],best[1],cx,cz,11,asph);nodes.push([cx,cz]);
      for(let i=0;i<3;i++){const a=rnd()*7;road(cx,cz,cx+Math.cos(a)*1700,cz+Math.sin(a)*1700,6,dirt);}
      for(let i=0;i<26;i++){const a=rnd()*7,r=1100+rnd()*2600,fx=cx+Math.cos(a)*r,fz=cz+Math.sin(a)*r,w=160+rnd()*300,dd=160+rnd()*300,rot=rnd()*3,ca=Math.cos(rot),sa=Math.sin(rot),g=rnd(),col=g<0.5?[0.3+rnd()*0.1,0.42+rnd()*0.12,0.2]:g<0.8?[0.55,0.47,0.3]:[0.66,0.6,0.36];if(mh(fx,fz)<4)continue;
        const pt=(u,v)=>{const x=fx+(u*w*ca-v*dd*sa),z=fz+(u*w*sa+v*dd*ca);return[x,mh(x,z)+0.6,z];},N=4;
        for(let iu=0;iu<N;iu++)for(let iv=0;iv<N;iv++)quad([pt(iu/N-0.5,iv/N-0.5),pt((iu+1)/N-0.5,iv/N-0.5),pt(iu/N-0.5,(iv+1)/N-0.5),pt((iu+1)/N-0.5,(iv+1)/N-0.5)],col);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(V,3));g.setAttribute('color',new T.Float32BufferAttribute(C2,3));g.computeVertexNormals();
    const m=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));m.frustumCulled=false;scene.add(m);}
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
    for(let j=0;j<n;j++){const s=new T.Sprite(cm),k=big*(0.6+rnd()*0.8);s.position.set(cx+(rnd()-0.5)*big*3.2,cy+(rnd()-0.3)*big*0.5,cz+(rnd()-0.5)*big*3.2);s.scale.set(k*1.6,k,1);scene.add(s);cloudSp.push(s);}}
  for(let i=0;i<26;i++){const s=new T.Sprite(ci);s.position.set(-60000+rnd()*300000,10800+rnd()*1500,-90000+rnd()*180000);const k=14000+rnd()*22000;s.scale.set(k*2.6,k*0.5,1);scene.add(s);}
}
await prog(0.84);
/* ---------- aircraft models ---------- */
function shapeGeo(pts,th,fin){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));const g=new T.ExtrudeGeometry(s,{depth:th,bevelEnabled:false}),uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*0.09,uv.getY(i)*0.09);if(fin)g.rotateY(-Math.PI/2);else g.rotateX(Math.PI/2);return g;}
const flatGeo=(p,t)=>shapeGeo(p,t,false),finGeo=(p,t)=>shapeGeo(p,t,true);
function camoTex(a,b,c){const t=canvasTex(256,256,(x,w)=>{x.fillStyle=a;x.fillRect(0,0,w,w);
    for(const col of[b,c])for(let i=0;i<7;i++){const px=rnd()*w,py=rnd()*w;x.fillStyle=col;for(let k=0;k<6;k++){x.beginPath();x.ellipse(px+(rnd()-0.5)*70,py+(rnd()-0.5)*70,18+rnd()*34,12+rnd()*22,rnd()*3,0,7);x.fill();}}
    x.fillStyle='rgba(0,0,0,0.06)';for(let i=0;i<900;i++)x.fillRect(rnd()*w,rnd()*w,1+rnd()*2,1);x.strokeStyle='rgba(0,0,0,0.1)';x.lineWidth=1;for(let i=0;i<w;i+=64){x.strokeRect(i,0,64,w);}});
  t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const CAMO={il:camoTex('#c9ad7c','#93704a','#8a9462'),gray:camoTex('#9aa3ab','#8b949c','#a6aeb5'),mig:camoTex('#8f979d','#6d7a85','#a7aeb3')};
const roundel=canvasTex(128,128,x=>{x.fillStyle='#f4f4f0';x.beginPath();x.arc(64,64,60,0,7);x.fill();x.strokeStyle='#1f4fa3';x.lineWidth=9;
  for(const s of[1,-1]){x.beginPath();for(let i=0;i<3;i++){const a=-Math.PI/2*s+i*2.0944;x[i?'lineTo':'moveTo'](64+Math.cos(a)*42,64+Math.sin(a)*42);}x.closePath();x.stroke();}});
function buildJet(o){const G=new T.Group(),body=new T.MeshLambertMaterial({map:CAMO[o.camo]}),wing=body,tail=body,dark=lam(0x2a2c2e),steel=lam(0x4a4d50),glass=new T.MeshPhongMaterial({color:0x16242b,shininess:110,specular:0xbbccdd});
  let g=new T.ConeGeometry(0.72,3.6,16);g.rotateX(-Math.PI/2);part(g,lam(o.nose),0,0,-7.9,G);
  g=new T.CylinderGeometry(0.72,1.0,4.2,16);g.rotateX(-Math.PI/2);part(g,body,0,0,-4.0,G);
  part(new T.SphereGeometry(1,16,12),glass,0,0.62,o.two?-4.2:-4.6,G).scale.set(0.6,0.68,o.two?2.7:1.9);
  part(new T.BoxGeometry(0.08,0.5,0.1),dark,0,1.08,o.two?-4.3:-4.7,G).scale.set(1,1,1);
  part(new T.BoxGeometry(3.0,1.5,9.5),body,0,0,2.2,G);
  g=new T.CylinderGeometry(0.75,0.95,7.5,10,1,false,-Math.PI/2,Math.PI);g.rotateX(-Math.PI/2);part(g,body,0,0.7,1.2,G).scale.set(1,0.45,1);
  const ud=G.userData;ud.ab=[];ud.bombs=[];ud.aams=[];ud.front=G.children.slice(0,4);
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
      for(const[x,l]of[[3.4,3.6],[4.5,3.0]]){g=new T.CylinderGeometry(0.1,0.1,l,8);g.rotateX(Math.PI/2);const a=part(g,lam(0xe6e6e0),s*x,x<4?-0.32:-0.15,2.6,G);a.userData.k=x<4?'aim120':'python';a.userData.th=x<4?(s<0?0:2):(s<0?0:1);part(new T.BoxGeometry(0.6,0.03,0.4),lam(0xe6e6e0),0,0,l/2-0.3,a);part(new T.BoxGeometry(0.03,0.6,0.4),lam(0xe6e6e0),0,0,l/2-0.3,a);ud.aams.push(a);}
    }}
  ud.gear=new T.Group();G.add(ud.gear);
  for(const[x,z]of[[0,-5.5],[-1.4,1.6],[1.4,1.6]]){part(new T.CylinderGeometry(0.09,0.09,1.6,6),lam(0xc9c9c9),x,-1.5,z,ud.gear);const wg=new T.CylinderGeometry(0.42,0.42,0.3,12);wg.rotateZ(Math.PI/2);part(wg,dark,x,-1.98,z,ud.gear);}
  if(o.scale)G.scale.setScalar(o.scale);return G;}
function buildF16(){const G=new T.Group(),body=new T.MeshLambertMaterial({map:CAMO.il}),dark=lam(0x2a2c2e),steel=lam(0x4a4d50),white=lam(0xe6e6e0),glass=new T.MeshPhongMaterial({color:0x16242b,shininess:110,specular:0xbbccdd});
  let g=new T.ConeGeometry(0.5,2.6,16);g.rotateX(-Math.PI/2);part(g,lam(0x86857c),0,0,-6.2,G);
  g=new T.CylinderGeometry(0.5,0.85,3.6,16);g.rotateX(-Math.PI/2);part(g,body,0,0,-3.1,G);
  part(new T.SphereGeometry(1,16,12),glass,0,0.6,-3.3,G).scale.set(0.52,0.62,2.3);
  part(new T.BoxGeometry(1.9,1.3,7.5),body,0,0,1.6,G);part(new T.BoxGeometry(0.62,0.5,6.2),body,0,0.82,1.6,G);
  part(new T.BoxGeometry(1.25,0.62,3.2),body,0,-0.88,-1.4,G);part(new T.BoxGeometry(1.1,0.5,0.1),dark,0,-0.88,-3.02,G);
  g=new T.CylinderGeometry(0.66,0.66,2.6,14);g.rotateX(Math.PI/2);part(g,body,0,0,6.2,G);
  g=new T.CylinderGeometry(0.62,0.48,1.0,14,1,true);g.rotateX(-Math.PI/2);part(g,steel,0,0,7.95,G).material.side=T.DoubleSide;
  part(finGeo([[3.8,0.6],[7.1,0.6],[7.5,3.5],[6.4,3.5]],0.14),body,0.07,0,0,G);
  const ud=G.userData;ud.ab=[];ud.bombs=[];ud.aams=[];ud.front=G.children.slice(0,3);ud.sb=new T.Group();G.add(ud.sb);
  for(const[r,l,c,op]of[[0.5,6.5,0xff9a45,0.75],[0.3,4,0xdfe8ff,0.9]]){const k=new T.ConeGeometry(r,l,12,1,true);k.rotateX(Math.PI/2);k.translate(0,0,l/2);
    const f=new T.Mesh(k,new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide}));f.position.set(0,0,8.3);f.visible=false;G.add(f);ud.ab.push(f);}
  for(const s of[-1,1]){
    part(new T.BoxGeometry(0.5,0.55,5),body,s*1.08,0.52,0.9,G);
    part(flatGeo([[0.95,-1.2],[4.75,2.3],[4.75,3.4],[0.95,3.9]].map(p=>[p[0]*s,p[1]]),0.16),body,0,0.08,0,G);
    part(flatGeo([[0.9,-4.4],[0.95,-1.2],[1.7,-1.2]].map(p=>[p[0]*s,p[1]]),0.1),body,0,0.05,0,G);
    part(flatGeo([[0.9,5.2],[2.9,6.5],[2.9,7.3],[0.9,7.0]].map(p=>[p[0]*s,p[1]]),0.12),body,0,-0.1,0,G);
    part(finGeo([[5.6,-0.95],[6.9,-0.95],[6.7,-0.3],[5.6,-0.3]],0.08),body,s*0.55+0.04,0,0,G);
    part(new T.SphereGeometry(0.11,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*4.75,0.05,3.2,G);
    const rd=part(new T.CircleGeometry(0.7,20),new T.MeshLambertMaterial({map:roundel}),s*3.2,0.1,2.3,G);rd.rotation.x=-Math.PI/2;
    for(const x of[1.9,2.9]){g=new T.CylinderGeometry(0.24,0.24,3.0,10);g.rotateX(Math.PI/2);const b=part(g,lam(0x565a4c),s*x,-0.55,1.9,G);const nc=new T.ConeGeometry(0.24,0.7,10);nc.rotateX(-Math.PI/2);part(nc,lam(0x3d4036),0,0,-1.85,b);ud.bombs.push(b);part(new T.BoxGeometry(0.12,0.3,1.8),steel,s*x,-0.2,1.9,G);}
    for(const[x,y,l,k]of[[4.85,0.02,3.6,'aim120'],[3.85,-0.3,3.0,'python']]){g=new T.CylinderGeometry(0.09,0.09,l,8);g.rotateX(Math.PI/2);const a=part(g,white,s*x,y,2.6,G);a.userData.k=k;a.userData.th=s<0?0:1;
      part(new T.BoxGeometry(0.55,0.03,0.4),white,0,0,l/2-0.3,a);part(new T.BoxGeometry(0.03,0.55,0.4),white,0,0,l/2-0.3,a);ud.aams.push(a);}}
  ud.bombs.sort((a,b)=>Math.abs(b.position.x)-Math.abs(a.position.x));
  ud.gear=new T.Group();G.add(ud.gear);
  for(const[x,z]of[[0,-4.2],[-1.2,1.3],[1.2,1.3]]){part(new T.CylinderGeometry(0.08,0.08,1.0,6),lam(0xc9c9c9),x,-1.1,z,ud.gear);const wg=new T.CylinderGeometry(0.36,0.36,0.26,12);wg.rotateZ(Math.PI/2);part(wg,dark,x,-1.54,z,ud.gear);}
  return G;}
/* the working switches, in two rows: start-up on the first, flight on the second */
const SWITCHES=[[['batt','BATT'],['jfs','JFS'],['eng0','ENG L'],['eng1','ENG R'],['ins','INS'],['radar','RADAR'],['canopy','CANOPY'],['pbrake','P-BRAKE'],['lights','LIGHTS'],['auto','AUTO ST']],
  [['gear','GEAR'],['flaps','FLAPS'],['arm','M-ARM'],['ap','A/P'],['ardoor','AR DOOR'],['fire0','FIRE L'],['fire1','FIRE R'],['rmode','RDR MODE'],['rrngdn','RNG -'],['rrng','RNG +']]];
/* state of a switch for its lever and lamp: 0 off, 1 on, 2 working on it, 3 alarm */
function swState(id){const s=W.sys,p=W.player,i=+id.slice(-1);
  switch(id){case 'batt':return +s.batt;case 'jfs':return s.jfsOn?(s.jfs<1?2:1):0;case 'eng0':case 'eng1':return i>=p.nEng?0:s.start[i]?2:+(p.rpm[i]>=1);
    case 'ins':return s.ins>=1?1:s.insOn?2:0;case 'radar':return +W.radarOn;case 'canopy':return s.canopyOpen?0:s.canopy>0.05?2:1;case 'pbrake':return +s.pbrake;case 'lights':return +s.lights;case 'auto':return W.autoStart?2:0;
    case 'gear':return p.gear?(p.gearPos<0.95?2:1):0;case 'flaps':return +p.flaps;case 'arm':return W.arm?3:0;case 'ap':return +ap.on;case 'ardoor':return W.ar.state==='contact'?2:+s.arDoor;
    case 'fire0':case 'fire1':return i<p.nEng&&p.fire[i]?3:0;case 'rmode':return +(W.radar.mode==='ACM');}return 0;}
function doSwitch(id){if(!W||state!=='fly')return;const cs=cockpit.userData.sw[id];if(cs)cs.clickT=clock;if(id==='ap')act('ap');else if(id==='auto'){W.autoStart=!W.autoStart;beep(900,0.04);}else W.sw(id);}
/* cockpit interior, built around the pilot's eye point (origin). Displays are canvas textures filled by drawHUD. */
function buildCockpit(kind){const G=new T.Group(),dk=lam(0x26292b),pn=lam(kind==='F15C'?0x1b2228:kind==='F35I'?0x131517:0x181a1c),blk=lam(0x0d0e0f),ud=G.userData;ud.cv={};ud.kind=kind;ud.helmet=kind==='F35I';
  const scr=(k,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.textBaseline='middle';x.direction='ltr';x.fillStyle='#020a06';x.fillRect(0,0,w,h);
    const t=new T.CanvasTexture(c);if(renderer.capabilities.isWebGL2||h===w){t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}else t.minFilter=T.LinearFilter;ud.cv[k]={ctx:x,tex:t};return new T.MeshBasicMaterial({map:t,fog:false});};
  part(new T.BoxGeometry(1.24,0.03,0.26),blk,0,-0.245,-0.75,G);part(new T.BoxGeometry(0.26,0.035,0.2),blk,0,-0.222,-0.74,G);
  const panel=new T.Group();panel.position.set(0,-0.53,-0.73);panel.rotation.x=-0.2;G.add(panel);part(new T.BoxGeometry(1.2,0.56,0.04),pn,0,0,0,panel);
  if(kind==='F35I'){/* one wide touch display across the whole panel */
    part(new T.BoxGeometry(1.02,0.36,0.02),blk,0,0.06,0.025,panel);part(new T.PlaneGeometry(0.96,0.32),scr('w',768,256),0,0.06,0.037,panel);
    for(const x of[-0.2,0.2])part(new T.BoxGeometry(0.05,0.05,0.012),dk,x,-0.17,0.024,panel);}
  else{
  for(const[k,x]of[['r',-0.31],['t',0.31]]){part(new T.BoxGeometry(0.27,0.27,0.02),blk,x,0.05,0.025,panel);part(new T.PlaneGeometry(0.22,0.22),scr(k,256,256),x,0.05,0.037,panel);
    for(let i=0;i<5;i++)for(const sd of[-1,1])part(new T.BoxGeometry(0.014,0.02,0.012),dk,x+sd*0.124,0.05+(i-2)*0.042,0.036,panel);}
  part(new T.BoxGeometry(0.3,0.19,0.02),blk,0,0.125,0.025,panel);part(new T.PlaneGeometry(0.24,0.15),scr('e',256,160),0,0.125,0.037,panel);
  const dial=canvasTex(64,64,x=>{x.fillStyle='#0b0c0d';x.beginPath();x.arc(32,32,31,0,7);x.fill();x.strokeStyle='#cfd3d1';x.lineWidth=2;for(let i=0;i<12;i++){const a=i*Math.PI/6;x.beginPath();x.moveTo(32+Math.cos(a)*24,32+Math.sin(a)*24);x.lineTo(32+Math.cos(a)*29,32+Math.sin(a)*29);x.stroke();}
    x.lineWidth=3;x.beginPath();x.moveTo(32,32);x.lineTo(46,18);x.stroke();});
  for(const x of[-0.11,0,0.11])part(new T.CircleGeometry(0.046,24),new T.MeshBasicMaterial({map:dial,fog:false,color:0x9aa0a0}),x,-0.1,0.022,panel);
  if(kind==='F15C')for(const x of[-0.5,-0.42,0.42,0.5])for(const y of[-0.1,-0.19])part(new T.CircleGeometry(0.034,20),new T.MeshBasicMaterial({map:dial,fog:false,color:0x8a9090}),x,y,0.022,panel);
  }
  ud.caution=part(new T.BoxGeometry(0.07,0.022,0.01),new T.MeshBasicMaterial({color:0x2a1500,fog:false}),0,-0.19,0.024,panel);
  for(const sd of[-1,1]){part(new T.BoxGeometry(0.06,0.07,1.7),dk,sd*0.58,-0.3,-0.25,G);part(new T.BoxGeometry(0.2,0.34,1.1),pn,sd*0.53,-0.63,0.02,G);
    for(let i=0;i<7;i++)part(new T.BoxGeometry(0.03,0.012,0.03),lam(0x4a4f52),sd*(0.44+rnd()*0.1),-0.455,-0.42+i*0.11,G);}
  if(kind!=='F16I'&&kind!=='F35I')part(new T.TorusGeometry(0.74,0.018,8,48,Math.PI),blk,0,-0.27,-1.1,G);part(new T.TorusGeometry(0.62,0.03,8,40,Math.PI),dk,0,-0.3,0.25,G);
  const fr=lam(0x101213);ud.postL=part(new T.BoxGeometry(0.012,1,0.012),fr,0,0,-0.62,G);ud.postR=part(new T.BoxGeometry(0.012,1,0.012),fr,0,0,-0.62,G);ud.bar=part(new T.BoxGeometry(1,0.012,0.012),fr,0,0,-0.62,G);
  ud.glass=part(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:0x7dffb0,transparent:true,opacity:0.045,depthWrite:false,fog:false}),0,0,-0.62,G);
  ud.stick=new T.Group();if(kind==='F16I'||kind==='F35I'){ud.stick.position.set(0.47,-0.62,-0.34);ud.stick.scale.setScalar(0.62);}else ud.stick.position.set(0,-0.86,-0.46);G.add(ud.stick);part(new T.CylinderGeometry(0.016,0.02,0.3,8),dk,0,0.15,0,ud.stick);part(new T.BoxGeometry(0.045,0.12,0.05),blk,0,0.34,0,ud.stick);
  ud.thr=part(new T.BoxGeometry(0.07,0.07,0.13),blk,-0.47,-0.43,-0.3,G);
  /* switch pedestal below the main panel: two rows of working switches, each with a label and a status lamp */
  const ped=new T.Group();ped.position.set(0,-0.81,-0.672);ped.rotation.x=-0.9;G.add(ped);part(new T.BoxGeometry(1.24,0.3,0.03),pn,0,-0.15,-0.016,ped);
  const lab=t=>{const tx=canvasTex(128,32,x=>{x.fillStyle='#17191b';x.fillRect(0,0,128,32);x.fillStyle='#d9dcd6';x.font='700 21px "Share Tech Mono",ui-monospace,Menlo,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(t,64,17);});tx.minFilter=T.LinearFilter;return new T.MeshBasicMaterial({map:tx,fog:false});};
  ud.sw={};ud.hits=[];const hitM=new T.MeshBasicMaterial({visible:false});
  /* each control is built like the real thing: lever switches, lit push-buttons, rotary selectors, the gear handle and pull handles */
  const KIND={jfs:'push',auto:'push',ap:'push',ins:'knob',radar:'knob',rmode:'knob',fire0:'pull',fire1:'pull',rrng:'tap',rrngdn:'tap',gear:'gear',arm:'guard'};
  const metal=lam(0xb8bcbc),knobM=lam(0x2c2f31),white=new T.MeshBasicMaterial({color:0xe8e8e0,fog:false});
  SWITCHES.forEach((row,ri)=>row.forEach(([id,name],ci)=>{const x=(ci-4.5)*0.088+(ci<5?-0.03:0.03),y=-0.075-ri*0.135,g=new T.Group(),kind=KIND[id]||'toggle';g.position.set(x,y,0);ped.add(g);
    part(new T.BoxGeometry(0.066,0.06,0.012),blk,0,-0.012,0.004,g);part(new T.PlaneGeometry(0.084,0.024),lab(name),0,0.04,0.002,g);
    const lev=new T.Group();g.add(lev);let lamp;
    const mkLamp=(lx,ly)=>part(new T.CircleGeometry(0.011,14),new T.MeshBasicMaterial({color:0x202422,fog:false}),lx,ly,0.012,g);
    if(kind==='push'){lev.position.set(0,-0.012,0.012);part(new T.BoxGeometry(0.04,0.036,0.012),knobM,0,0,0,lev);lamp=part(new T.PlaneGeometry(0.032,0.028),new T.MeshBasicMaterial({color:0x202422,fog:false}),0,0,0.0065,lev);}
    else if(kind==='tap'){lev.position.set(0,-0.012,0.012);const c=new T.CylinderGeometry(0.015,0.015,0.012,14);c.rotateX(Math.PI/2);part(c,metal,0,0,0,lev);lamp=mkLamp(0.026,-0.03);lamp.visible=false;}
    else if(kind==='knob'){lev.position.set(-0.008,-0.012,0.012);const c=new T.CylinderGeometry(0.019,0.022,0.02,18);c.rotateX(Math.PI/2);part(c,knobM,0,0,0.004,lev);part(new T.BoxGeometry(0.004,0.02,0.004),white,0,0.01,0.015,lev);
      for(const a of[-0.8,0,0.8])part(new T.BoxGeometry(0.003,0.006,0.001),white,-0.008+Math.sin(a)*0.028,-0.012+Math.cos(a)*0.028,0.011,g).rotation.z=-a;lamp=mkLamp(0.026,-0.03);}
    else if(kind==='pull'){lev.position.set(0,-0.012,0.014);part(new T.BoxGeometry(0.008,0.008,0.03),metal,0,0,-0.006,lev);part(new T.BoxGeometry(0.05,0.022,0.012),lam(0xc8a018),0,0,0.012,lev);for(const sx of[-0.015,0,0.015])part(new T.BoxGeometry(0.006,0.0225,0.0125),blk,sx,0,0.012,lev);lamp=mkLamp(0.022,-0.034);}
    else if(kind==='gear'){lev.position.set(-0.012,-0.012,0.01);part(new T.BoxGeometry(0.008,0.05,0.008),metal,0,0.012,0.014,lev);const c=new T.CylinderGeometry(0.014,0.014,0.012,14);c.rotateZ(Math.PI/2);part(c,lam(0xe8e8e0),0,0.04,0.014,lev);lamp=mkLamp(0.022,-0.012);}
    else{lev.position.set(-0.012,-0.012,0.01);part(new T.CylinderGeometry(0.004,0.007,0.05,8),metal,0,0.012,0.014,lev).rotation.x=Math.PI/2*0;part(new T.SphereGeometry(0.007,8,6),metal,0,0.038,0.014,lev);
      if(kind==='guard'){const gd=part(new T.BoxGeometry(0.03,0.05,0.004),new T.MeshLambertMaterial({color:0xc02818,transparent:true,opacity:0.75}),-0.012,0.004,0.034,g);g.userData.guard=gd;}
      lamp=mkLamp(0.022,-0.012);}
    const hit=part(new T.BoxGeometry(0.086,0.13,0.05),hitM,0,0.005,0.02,g);hit.userData.sw=id;ud.hits.push(hit);ud.sw[id]={lev,lamp,kind,g,clickT:-9,a:0,ins:id==='ins'};}));
  G.visible=false;return G;}
function buildTanker(){const G=new T.Group(),bd=lam(0xb4b8bc),dk=lam(0x4c5258);
  let g=new T.CylinderGeometry(1.9,1.9,40,18);g.rotateX(Math.PI/2);part(g,bd,0,0,0,G);
  g=new T.ConeGeometry(1.9,5,18);g.rotateX(-Math.PI/2);part(g,bd,0,0,-22.5,G);g=new T.CylinderGeometry(1.9,0.5,7,18);g.rotateX(-Math.PI/2);part(g,bd,0,0.5,23.5,G).rotation.x=0.09;
  part(new T.BoxGeometry(2.2,0.6,2.2),dk,0,0.9,-21.4,G);
  for(const s of[-1,1]){part(flatGeo([[1.6,-4],[21.5,8.5],[21.5,11],[1.6,5.5]].map(p=>[p[0]*s,p[1]]),0.5),bd,0,-0.7,0,G);
    part(flatGeo([[1,18],[8,22.5],[8,24.5],[1,23.5]].map(p=>[p[0]*s,p[1]]),0.3),bd,0,1.2,0,G);
    for(const[x,z]of[[7.5,1],[13.5,5.2]]){g=new T.CylinderGeometry(0.95,0.8,4.6,12);g.rotateX(Math.PI/2);part(g,dk,s*x,-1.9,z,G);part(new T.BoxGeometry(0.25,1.2,2.6),bd,s*x,-1.1,z+0.6,G);}
    part(new T.SphereGeometry(0.2,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*21.5,-0.5,10.4,G);}
  part(finGeo([[16,1.5],[23,1.5],[24.5,9.5],[21.5,9.5]],0.4),bd,0.2,0,0,G);
  /* refuelling boom, from the tail down to the contact position */
  const a=new T.Vector3(0,-1.6,20.5),b=new T.Vector3(0,-6.2,30),d=b.clone().sub(a),boom=part(new T.CylinderGeometry(0.22,0.16,d.length(),8),lam(0xd8d8d4),0,0,0,G);
  boom.position.copy(a).addScaledVector(d,0.5);boom.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());
  for(const s of[-1,1])part(new T.BoxGeometry(1.6,0.06,0.7),lam(0xd8d8d4),s*0.8,-5.5,28.6,G);
  for(let i=0;i<5;i++)part(new T.BoxGeometry(0.5,0.05,0.9),new T.MeshBasicMaterial({color:i===2?0x40ff70:0xffb040}),(i-2)*0.7,-1.92,-4+0,G).position.z=-6+i*0;
  return G;}
function buildDrone(){const G=new T.Group(),m=lam(0xb9b5a6);let g=new T.CylinderGeometry(0.28,0.3,3.3,8);g.rotateX(Math.PI/2);part(g,m,0,0,0,G);
  part(flatGeo([[0,-1.3],[1.3,1.5],[-1.3,1.5]],0.12),m,0,0.05,0,G);for(const s of[-1,1])part(new T.BoxGeometry(0.06,0.7,0.6),m,s*1.25,0,1.2,G);return G;}
function buildGround(gt){const G=new T.Group(),ol=lam(0x5e6247),gr=lam(0x9a9a8e);
  if(gt.kind==='truck'){part(new T.BoxGeometry(2.6,2.6,6.5),lam(0x6b6a55),0,2.1,0.8,G);part(new T.BoxGeometry(2.4,2,2.2),ol,0,1.8,-3.6,G);for(const z of[-3.4,-0.5,2.6])part(new T.BoxGeometry(2.8,1,1),lam(0x1c1c1a),0,0.5,z,G);G.userData.mover=true;}
  else if(gt.kind==='tel'){part(new T.BoxGeometry(13,2.4,3.2),ol,0,1.7,0,G);const m=part(new T.CylinderGeometry(0.5,0.5,11,8),gr,2.5,6.4,0,G);m.rotation.z=0.5;part(new T.BoxGeometry(3,2,3.2),ol,-5,3.6,0,G);}
  else if(gt.kind==='bunker'){part(new T.BoxGeometry(40,7,24),lam(0x9b978a),0,3.5,0,G);part(new T.BoxGeometry(46,3,30),lam(0x8d7b5c),0,1.5,0,G);part(new T.BoxGeometry(6,4,2),lam(0x33332f),0,2,12.1,G);}
  else if(gt.kind==='radar'){part(new T.BoxGeometry(8,3,3.5),ol,0,1.8,0,G);part(new T.CylinderGeometry(0.4,0.4,7,8),ol,0,6,0,G);const d=part(new T.BoxGeometry(7,5,0.6),gr,0,11,0,G);G.userData.dish=d;}
  else{part(new T.BoxGeometry(9,2.2,3.2),ol,0,1.6,0,G);for(let i=0;i<3;i++){const m=part(new T.CylinderGeometry(0.35,0.35,6,6),gr,1,4.4,-1+i,G);m.rotation.z=0.9;}}
  G.position.set(gt.pos.x,gt.pos.y,gt.pos.z);G.rotation.y=gt.pos.x%3;return G;}
await prog(0.9);
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

/* F-35I: blended body, chined nose, canted twin fins, one engine; everything is carried inside */
function buildF35(){const G=new T.Group(),body=lam(0x6d747b),dk=lam(0x555b61),dark=lam(0x2a2c2e),steel=lam(0x3c3f42),glass=new T.MeshPhongMaterial({color:0x3a2c12,shininess:120,specular:0xd8c090});
  let g=new T.ConeGeometry(0.62,3.0,4);g.rotateX(-Math.PI/2);g.rotateZ(Math.PI/4);part(g,dk,0,0,-6.3,G).scale.set(1.25,0.7,1);
  g=new T.CylinderGeometry(0.62,1.0,3.2,4);g.rotateX(-Math.PI/2);g.rotateZ(Math.PI/4);part(g,body,0,0,-3.2,G).scale.set(1.3,0.75,1);
  part(new T.SphereGeometry(1,16,12),glass,0,0.55,-3.4,G).scale.set(0.5,0.55,1.9);
  part(new T.BoxGeometry(3.0,1.25,8.2),body,0,0,2.1,G);part(new T.BoxGeometry(1.5,0.5,6.5),body,0,0.75,1.6,G);
  g=new T.CylinderGeometry(0.72,0.72,1.6,14);g.rotateX(Math.PI/2);part(g,body,0,0.05,6.9,G);
  g=new T.CylinderGeometry(0.66,0.52,1.0,14,1,true);g.rotateX(-Math.PI/2);part(g,steel,0,0.05,8.1,G).material.side=T.DoubleSide;
  const ud=G.userData;ud.ab=[];ud.bombs=[];ud.aams=[];ud.front=G.children.slice(0,3);ud.sb=new T.Group();G.add(ud.sb);
  for(const[r,l,c,op]of[[0.5,6.5,0xff9a45,0.75],[0.3,4,0xdfe8ff,0.9]]){const k=new T.ConeGeometry(r,l,12,1,true);k.rotateX(Math.PI/2);k.translate(0,0,l/2);
    const f=new T.Mesh(k,new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide}));f.position.set(0,0.05,8.5);f.visible=false;G.add(f);ud.ab.push(f);}
  for(const s of[-1,1]){
    part(new T.BoxGeometry(0.9,0.9,2.6),body,s*1.35,-0.1,-2.2,G);part(new T.BoxGeometry(0.8,0.75,0.1),dark,s*1.35,-0.1,-3.52,G);
    part(flatGeo([[1.4,-1.0],[5.35,3.4],[5.35,4.4],[1.4,5.6]].map(p=>[p[0]*s,p[1]]),0.18),body,0,0.15,0,G);
    part(flatGeo([[1.3,5.4],[3.5,7.4],[3.5,8.3],[1.3,8.0]].map(p=>[p[0]*s,p[1]]),0.13),body,0,0.1,0,G);
    const fin=part(finGeo([[4.6,0],[7.4,0],[8.2,2.9],[7.1,2.9]],0.13),body,s*1.25,0.55,0,G);fin.rotation.z=-s*0.42;
    part(new T.SphereGeometry(0.1,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*5.35,0.1,4.0,G);
    const rd=part(new T.CircleGeometry(0.6,20),new T.MeshLambertMaterial({map:roundel,color:0xb8bcc0}),s*3.4,0.17,3.1,G);rd.rotation.x=-Math.PI/2;}
  ud.gear=new T.Group();G.add(ud.gear);
  for(const[x,z]of[[0,-4.4],[-1.5,1.5],[1.5,1.5]]){part(new T.CylinderGeometry(0.08,0.08,1.1,6),lam(0xc9c9c9),x,-1.1,z,ud.gear);const wg=new T.CylinderGeometry(0.36,0.36,0.26,12);wg.rotateZ(Math.PI/2);part(wg,dark,x,-1.54,z,ud.gear);}
  return G;}
function buildCruise(){const G=new T.Group(),m=lam(0x8d9296);let g=new T.CylinderGeometry(0.3,0.3,5.2,8);g.rotateX(Math.PI/2);part(g,m,0,0,0,G);g=new T.ConeGeometry(0.3,0.9,8);g.rotateX(-Math.PI/2);part(g,m,0,0,-3.05,G);
  part(new T.BoxGeometry(3.0,0.06,0.6),m,0,0.1,0.2,G);part(new T.BoxGeometry(1.2,0.05,0.4),m,0,0,2.3,G);part(new T.BoxGeometry(0.05,0.6,0.4),m,0,0.3,2.3,G);G.userData.gear=new T.Group();return G;}
const mkPlayer=t=>t==='F16I'?buildF16():t==='F35I'?buildF35():t==='F15C'?buildJet({camo:'gray',nose:0x767d84,player:true}):buildJet({camo:'il',nose:0x86857c,cft:true,two:true,player:true});
const mkDrone=d=>d.type==='CM'?buildCruise():buildDrone();
/* ejection seat and parachute */
const chute=new T.Group();{const g=new T.SphereGeometry(3.4,14,8,0,Math.PI*2,0,Math.PI/2);chute.userData.can=part(g,new T.MeshLambertMaterial({color:0xe8e2d0,side:T.DoubleSide}),0,6.5,0,chute);part(new T.BoxGeometry(0.5,1.1,0.5),lam(0x3c4a36),0,0,0,chute);
  for(const[x,z]of[[2.6,0],[-2.6,0],[0,2.6],[0,-2.6]]){const l=part(new T.CylinderGeometry(0.02,0.02,6.6,4),lam(0xd0d0d0),x/2,3.4,z/2,chute);l.rotation.z=-Math.atan2(x,6.5);l.rotation.x=Math.atan2(z,6.5);}chute.visible=false;scene.add(chute);}
function updChute(dt){if(!chute.visible||dt<=0)return;const c=chute.userData.sim;if(!c)return;c.t+=dt;const open=clamp((c.t-1.2)/1.5,0,1);
  if(open<=0){c.vel.y-=9.8*dt;c.vel.x-=c.vel.x*0.3*dt;c.vel.z-=c.vel.z*0.3*dt;}else{const kk=Math.min(1,dt*(0.6+open*1.4));c.vel.x-=c.vel.x*kk;c.vel.z-=c.vel.z*kk;c.vel.y+=(-6.5-c.vel.y)*kk;}
  c.pos.x+=c.vel.x*dt;c.pos.y+=c.vel.y*dt;c.pos.z+=c.vel.z*dt;const gh=terrainH(c.pos.x,c.pos.z)+0.6;if(c.pos.y<gh){c.pos.y=gh;c.vel.x=c.vel.y=c.vel.z=0;}
  chute.position.set(c.pos.x,c.pos.y,c.pos.z);chute.userData.can.scale.set(0.15+0.85*open,0.3+0.7*open,0.15+0.85*open);chute.userData.can.visible=c.pos.y>gh+0.1||open<1;}
/* ---------- dynamic objects ---------- */
let rec=[],recObj=[],recEv=[],recT=0;
let cockpit=buildCockpit('F15I');scene.add(cockpit);
const dyn=new T.Group();scene.add(dyn);let pMesh,meshOf=new Map(),camQ=new T.Quaternion(),mslGeo,bombGeo;
{mslGeo=new T.CylinderGeometry(0.11,0.11,3.6,6);mslGeo.rotateX(Math.PI/2);bombGeo=new T.CylinderGeometry(0.3,0.3,4.2,8);bombGeo.rotateX(Math.PI/2);}
function newGame(start,preview){
  W=new R.World({start,diff:opts.diff,plane:opts.plane,mission:preview?'strike':opts.mission,wx:opts.wx,bomb:opts.bomb,fail:!preview&&opts.fail==='on',foe:opts.foe,wing:!preview&&opts.wing==='on',noSam:!preview&&camp.on&&readCamp().sead});
  if(cockpit.userData.kind!==W.plane.type){scene.remove(cockpit);cockpit=buildCockpit(W.plane.type);scene.add(cockpit);layout();}chute.visible=false;rec.length=0;recObj=[...W.air,...W.friends];recEv=[];recT=0;while(dyn.children.length)dyn.remove(dyn.children[0]);meshOf=new Map();emitters.length=0;for(const q of P)q.on=false;
  pMesh=mkPlayer(W.plane.type);dyn.add(pMesh);
  for(const m of W.migs){const g=buildJet({camo:'mig',nose:0x5b6166,scale:m.type==='Su-27'?1.05:m.type==='MiG-21'?0.62:0.88});g.userData.gear.visible=false;dyn.add(g);meshOf.set(m,g);}
  for(const d of W.drones){const g=mkDrone(d);dyn.add(g);meshOf.set(d,g);}
  for(const g of W.ground){const m=buildGround(g);dyn.add(m);meshOf.set(g,m);}
  for(const k of W.friends){const m=k.type==='TANKER'?buildTanker():mkPlayer(k.model||W.plane.type);if(k.type!=='TANKER'){m.userData.gear.visible=false;m.userData.wing=true;}dyn.add(m);meshOf.set(k,m);}
  look.panel=false;toastT=0;$('toast').dataset.on='';checkSig='';
  const p=W.player;camQ.set(p.q.x,p.q.y,p.q.z,p.q.w);timeAcc=1;simAcc=0;overT=0;gAcc=0;stick.x=stick.y=0;look.yaw=look.pitch=look.g=0;ap.on=false;lever=p.ctl.throttle;radioQ.length=0;radioT=0;$('radio').textContent='';
}
/* ================= input ================= */
const keys={},stick={x:0,y:0,r:0},touch={on:false,x:0,y:0,gun:false,cm:false,brk:false};let lever=0,trigG=false,trigP=false,safeT=-9;const tap={gun:false,pickle:false,cm:false},ap={on:false,alt:0,hdg:0},look={yaw:0,pitch:0,g:0,drag:false,id:null,px:0,py:0,panel:false};let toastT=0,checkSig='';
const WSEL=['AIM120','PYTHON','GUN','SPICE'];
let mapOn=false,mapBg=null,padlock=false,ejT=-9;
function act(a){if(!W||state!=='fly')return;const p=W.player;
  if(a==='gear'||a==='flaps'||a==='arm'||a==='ardoor'||a==='rmode'||a==='rrng'||a==='rrngdn')W.sw(a);
  else if(a==='panel'){if(view===0)look.panel=!look.panel;}
  else if(a==='view')view^=1;
  else if(a==='eject'){if(W.ejected||!p.alive)return;if(clock-ejT<1.6){if(W.eject()){look.panel=false;mapOn=false;}}else{ejT=clock;toast('נטישה: לחץ שוב לאישור');beep(1400,0.1,0.08);}}
  else if(a.startsWith('w_')){W.wingCmd(a.slice(2));beep(1100,0.04);}
  else if(a==='wing'){const w=W.wing;if(!w){toast('אין מספר שתיים במשימה הזאת');return;}const nx=w.mode==='form'?'attack':w.mode==='attack'?'cover':'form';W.wingCmd(nx==='attack'&&!(W.w.sel==='SPICE'?W.gtgt:(W.lock||W.irTgt))?'cover':nx);beep(1100,0.04);}
  else if(a==='map'){mapOn=!mapOn;beep(800,0.03);}
  else if(a==='padlock'){if(!padlock&&!(W.lock||W.irTgt)){toast('אין מטרה לעקוב אחריה. נעל מטרה קודם.');}else{padlock=!padlock;if(padlock){view=0;look.panel=false;}beep(1000,0.04);toast(padlock?'מבט נעול על המטרה':'מבט חופשי');}}
  else if(a==='nvg'){if(tod==='night'){setNVG(!nvg);beep(700,0.05);toast(nvg?'משקפת לילה פועלת':'משקפת לילה כבויה');}else toast('משקפת לילה מיועדת לטיסת לילה');}
  else if(a==='tgt'){W.cycleTarget();beep(1200,0.04);}
  else if(a==='unlock')W.unlock();
  else if(a==='wpn'){W.select(WSEL[(WSEL.indexOf(W.w.sel)+1)%4]);beep(900,0.04);}
  else if(a==='time'){timeAcc=timeAcc>=8?1:timeAcc*2;}
  else if(a==='mute'){muted=!muted;if(muted)hush();if(Snd.master)Snd.master.gain.value=muted?0:0.9;}
  else if(a==='wp')W.wp=(W.wp+1)%W.wps.length;
  else if(a==='ap'){if(ap.on)ap.on=false;else if(!p.onGround){ap.on=true;ap.alt=p.pos.y;ap.hdg=p.euler().hdg;}beep(ap.on?1100:600,0.06);}
  else if(a==='jett'){if(W.jettison())buzz(60);else beep(220,0.15,0.06);}}
/* free look: drag on the view (mouse or a spare finger); it springs back when released */
const ray=new T.Raycaster(),rayV=new T.Vector2();
glc.addEventListener('pointerdown',e=>{if(state!=='fly'||view!==0)return;look.drag=true;look.id=e.pointerId;look.px=e.clientX;look.py=e.clientY;look.sx=e.clientX;look.sy=e.clientY;look.st=performance.now();try{glc.setPointerCapture(e.pointerId);}catch(_){}});
glc.addEventListener('pointermove',e=>{if(!look.drag||e.pointerId!==look.id)return;look.yaw=clamp(look.yaw+(e.clientX-look.px)*0.0045,-2.6,2.6);look.pitch=clamp(look.pitch-(e.clientY-look.py)*0.0045,-0.75,1.3);look.px=e.clientX;look.py=e.clientY;});
for(const ev of['pointerup','pointercancel'])glc.addEventListener(ev,e=>{if(e.pointerId!==look.id||!look.drag)return;look.drag=false;
  if(ev==='pointerup'&&Math.hypot(e.clientX-look.sx,e.clientY-look.sy)<9&&performance.now()-look.st<450){const r=glc.getBoundingClientRect();rayV.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));
    ray.setFromCamera(rayV,camera);const h=ray.intersectObjects(cockpit.userData.hits,false)[0];if(h){doSwitch(h.object.userData.sw);buzz(12);}return;}
  /* looking well down at the panel holds the view there; looking back up releases it */
  if(!look.panel&&look.pitch<-0.36)look.panel=true;else if(look.panel&&look.pitch>(touchOn?-0.55:-0.3))look.panel=false;});
$('lookBack').onclick=()=>{look.panel=false;};$('nvgBtn').onclick=()=>act('nvg');$('mapBtn').onclick=()=>act('map');$('wingBtn').onclick=()=>act('wing');$('padBtn').onclick=()=>act('padlock');
addEventListener('keydown',e=>{
  if(state==='pause'&&(e.code==='Escape'||e.code==='KeyP')){resume();return;}
  if(state!=='fly')return;
  if(/^(Space|Arrow|Tab|Enter|Backspace)/.test(e.code))e.preventDefault();
  keys[e.code]=true;if(e.repeat)return;if(e.code==='Space')tap.gun=true;if(e.code==='Enter'||e.code==='NumpadEnter')tap.pickle=true;if(e.code==='KeyC')tap.cm=true;
  const m={KeyG:'gear',KeyL:'flaps',KeyV:'view',KeyT:'tgt',KeyU:'unlock',KeyO:'time',KeyM:'arm',Digit0:'mute',KeyN:'wp',KeyH:'ap',KeyJ:'jett',KeyK:'ardoor',KeyY:'rmode',Period:'rrng',Comma:'rrngdn',Digit7:'w_attack',Digit8:'w_cover',Digit9:'w_form',KeyX:'panel',KeyI:'nvg',Tab:'map',KeyZ:'padlock',Backspace:'eject'}[e.code];
  if(m)act(m);else if(/^Digit[1-4]$/.test(e.code)){W.select(WSEL[+e.code[5]-1]);beep(900,0.04);}
  else if(e.code==='Escape'||e.code==='KeyP')pause();});
addEventListener('keyup',e=>{keys[e.code]=false;});
let startedAt=0;
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(state==='fly'&&!touchOn&&performance.now()-startedAt>1500)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='fly'&&performance.now()-startedAt>2500)pause();});
const gpPrev=[];let padUsed=false;
function readPad(dt){let gp=null;try{const l=navigator.getGamepads?navigator.getGamepads():[];for(const g of l)if(g&&g.connected){gp=g;break;}}catch(e){}if(!gp)return null;
  const dz=v=>{const a=Math.abs(v);return a<0.1?0:Math.sign(v)*Math.pow((a-0.1)/0.9,1.5);},b=i=>gp.buttons[i]?gp.buttons[i].value:0,std=gp.mapping==='standard';
  const hit=i=>{const on=b(i)>0.5,was=gpPrev[i];gpPrev[i]=on;return on&&!was;};
  if(hit(2))act('tgt');if(hit(3))act('wpn');
  if(hit(0))tap.pickle=true;
  if(std){lever=clamp(lever+(b(7)-b(6))*0.6*dt,0,1.3);if(hit(14))act('view');if(hit(15))act('arm');if(hit(12))act('gear');if(hit(13))act('flaps');if(hit(8))act('time');if(hit(9)){pause();return null;}}
  /* right stick looks around in the air and steers the nose wheel on the ground */
  return{x:dz(gp.axes[0]||0),y:dz(gp.axes[1]||0),lx:std?dz(gp.axes[2]||0):0,ly:std?dz(gp.axes[3]||0):0,gun:b(std?5:1)>0.5,cm:std&&b(1)>0.5,brk:std&&b(4)>0.5};}
function readInput(dt){const pad=readPad(dt);if(state!=='fly')return;
  const k=keys,tx=(k.ArrowRight||k.KeyD?1:0)-(k.ArrowLeft||k.KeyA?1:0),ty=(k.ArrowDown||k.KeyS?1:0)-(k.ArrowUp||k.KeyW?1:0),tr=(k.KeyE?1:0)-(k.KeyQ?1:0);
  const ap=(c,t)=>{const rate=(t===0?5:3.2)*dt;return Math.abs(t-c)<rate?t:c+Math.sign(t-c)*rate;};
  if(tx||ty||tr)padUsed=false;else if(pad&&(pad.x||pad.y))padUsed=true;
  if(pad&&!look.drag&&(pad.lx||pad.ly)&&!W.player.onGround){look.yaw+=(pad.lx*2.3-look.yaw)*Math.min(1,dt*8);look.pitch+=(-pad.ly*1.0-look.pitch)*Math.min(1,dt*8);look.pad=true;}else look.pad=false;
  if(padUsed&&pad){stick.x=pad.x;stick.y=pad.y;stick.r=W.player.onGround?pad.lx:0;}
  else{if(opts.tilt==='on'&&tilt.ok&&!touch.held){stick.x=tilt.x;stick.y=tilt.y;}else if(touch.on){stick.x=touch.x;stick.y=touch.y;}else{stick.x=ap(stick.x,tx);stick.y=ap(stick.y,ty);}stick.r=ap(stick.r,tr);}
  const up=k.ShiftLeft||k.ShiftRight||k.Equal||k.KeyR,dn=k.Minus||k.KeyF;
  if(up)lever=Math.min(1.3,lever+0.55*dt);if(dn)lever=Math.max(0,lever-0.55*dt);
  if(W.ejected){stick.x=stick.y=stick.r=0;return;}
  const c=W.player.ctl;c.roll=curve(stick.x);c.pitch=curve(stick.y)*(opts.inv==='on'?-1:1);c.yaw=stick.r;c.throttle=lever;c.brake=!!k.KeyB||touch.brk||!!(pad&&pad.brk);
  if(ap.on){if(Math.abs(stick.x)>0.25||Math.abs(stick.y)>0.25||W.player.onGround){ap.on=false;beep(600,0.06);}
    else R.apSteer(W.player,vnorm(v3(Math.sin(ap.hdg),clamp((ap.alt-W.player.pos.y)/1500,-0.2,0.2),-Math.cos(ap.hdg))),0.45);}
  trigG=!!k.Space||touch.gun||tap.gun||!!(pad&&pad.gun);trigP=!!k.Enter||!!k.NumpadEnter||tap.pickle;
  W.cmHeld=!!k.KeyC||touch.cm||tap.cm||!!(pad&&pad.cm);}
/* tilt to fly: the phone is the stick. Roll it like a wheel, tip the top edge towards you to pull. */
const tilt={ok:false,on:false,x:0,y:0,p0:null};
function onTilt(e){if(e.beta==null||e.gamma==null)return;const b=e.beta*D2R,g=e.gamma*D2R,ux=-Math.cos(b)*Math.sin(g),uy=Math.sin(b),uz=Math.cos(b)*Math.cos(g);
  const a=(((screen.orientation&&screen.orientation.angle)||window.orientation||0)+360)%360;let sx=ux,sy=uy;if(a===90){sx=-uy;sy=ux;}else if(a===270){sx=uy;sy=-ux;}else if(a===180){sx=-ux;sy=-uy;}
  const roll=-Math.atan2(sx,Math.hypot(sy,uz)),pit=Math.atan2(uz,sy);if(tilt.p0==null)tilt.p0=pit;tilt.ok=true;
  const dz=v=>Math.abs(v)<0.06?0:(v-Math.sign(v)*0.06)/0.94;tilt.x=dz(clamp(roll/(30*D2R),-1,1));tilt.y=dz(clamp((pit-tilt.p0)/(22*D2R),-1,1));}
function tiltOn(ask){const add=()=>{if(!tilt.on){tilt.on=true;window.addEventListener('deviceorientation',onTilt);}};
  try{const D=window.DeviceOrientationEvent;if(D&&typeof D.requestPermission==='function'){if(ask)D.requestPermission().then(r=>{if(r==='granted')add();else{opts.tilt='off';applyOpts();}}).catch(()=>{});}else add();}catch(e){}}
const curve=v=>Math.sign(v)*Math.pow(Math.abs(v),{low:1.9,normal:1.35,high:1}[opts.sens]||1);
/* touch controls */
{const tz=$('touch'),coarse=matchMedia('(pointer:coarse)').matches;if(coarse)tz.dataset.on='1';
  const st=$('tStick'),kn=$('tKnob'),th=$('tThr'),tk=$('tThrK');
  const mv=e=>{const r=st.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width*2-1,-1,1),y=clamp((e.clientY-r.top)/r.height*2-1,-1,1);touch.on=true;touch.held=true;touch.x=x;touch.y=y;kn.style.transform=`translate(${x*36}px,${y*36}px)`;};
  st.addEventListener('pointerdown',e=>{st.setPointerCapture(e.pointerId);mv(e);});st.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')mv(e);});
  const end=()=>{touch.held=false;touch.x=touch.y=0;kn.style.transform='';};st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  const tm=e=>{const r=th.getBoundingClientRect(),v=clamp(1-(e.clientY-r.top)/r.height,0,1);lever=v*1.3;};
  th.addEventListener('pointerdown',e=>{th.setPointerCapture(e.pointerId);tm(e);});th.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')tm(e);});
  setInterval(()=>{tk.style.bottom=(lever/1.3*100)+'%';},100);
  for(const b of tz.querySelectorAll('button')){const a=b.dataset.a;
    /* pointerdown, not click: a second finger does not produce a click while the first one holds the stick */
    const hold=a==='gun'||a==='cm'||a==='brk';
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.dataset.down='1';buzz(12);if(hold)touch[a]=true;else if(a==='pickle')tap.pickle=true;else if(a==='pause')pause();else act(a);});
    for(const ev of['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>{b.dataset.down='';if(hold)touch[a]=false;});
    b.addEventListener('contextmenu',e=>e.preventDefault());}}
let buzzT=0;function buzz(p){try{if(touchOn&&navigator.vibrate&&!muted)navigator.vibrate(p);}catch(e){}}
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
  const rpm=p.rpm.reduce((a,b)=>a+b,0)/p.nEng,spin=Math.max(rpm,W.sys.jfs*0.25);
  Snd.set(Snd.eng.g.gain,fly?(0.05+0.12*Math.min(p.eng,1)+(p.eng>1?0.22:0))*(view?1:0.7)*(Voice.busy?0.45:1)*Math.min(1,spin*1.2):0);Snd.set(Snd.eng.fl.frequency,(180+500*Math.min(p.eng,1)+(p.eng>1?-150:0))*(0.35+0.65*spin));
  Snd.set(Snd.wind.g.gain,fly?clamp(p.V/340,0,1.6)*0.07:0);
  {const og=p.onGround,gp=p.gearPos,a=updAudio;if(fly&&a.og===false&&og){Snd.boom(clamp(0.25+(p.touchSink||0)*0.12,0.25,0.9));beep(2600,0.18,0.035,'sawtooth');buzz(60);shake=Math.max(shake,0.7);}
    if(fly&&a.gp!=null&&Math.abs(gp-a.gp)>1e-4&&!a.gm){a.gm=true;beep(95,0.5,0.05,'sawtooth');}else if(a.gm&&(gp<=0.001||gp>=0.999)){a.gm=false;if(fly){Snd.boom(0.3);buzz(25);}}else if(a.gm&&fly&&(clock*2.2|0)!==a.gt){a.gt=clock*2.2|0;beep(95,0.45,0.05,'sawtooth');}
    a.og=og;a.gp=gp;}
  const buf=fly&&!p.onGround?clamp((p.alpha*R2D-16)/10,0,1)*clamp(p.V/120,0,1)+(p.brakePos>0.5?0.25:0)*clamp(p.V/250,0,1):0;
  if(buf>0.02){Snd.set(Snd.wind.g.gain,clamp(p.V/340,0,1.6)*0.07+buf*0.16);Snd.set(Snd.wind.fl.frequency,1200-buf*650);}else Snd.set(Snd.wind.fl.frequency,1200);
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
const NAT=window.HFNative||null;
const Voice={v:null,busy:false,t:0,api:!!NAT||typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined'};
window.__hfSpoke=()=>{if(Voice.busy){Voice.busy=false;squelch();}};
function pickVoice(){let vs=[];try{if(NAT){if(NAT.hasVoice())vs=[{name:'Android',lang:'he-IL'}];}else if(Voice.api)vs=speechSynthesis.getVoices();}catch(e){}
  Voice.v=vs.find(v=>/^(he|iw)/i.test(v.lang))||null;
  $('voiceState').textContent=!Voice.api?'הדפדפן הזה לא תומך בהקראה.':Voice.v?'נמצא קול עברי: '+Voice.v.name:'לא נמצא קול עברי במכשיר הזה. הדיווחים יוצגו בכתב.';}
if(NAT){pickVoice();setTimeout(pickVoice,2500);}else if(Voice.api){pickVoice();try{speechSynthesis.addEventListener('voiceschanged',pickVoice);}catch(e){}}else pickVoice();
function squelch(){const ac=Snd.ac;if(!ac||muted)return;const b=ac.createBufferSource();b.buffer=Snd.noise;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=2600;const g=ac.createGain();g.gain.value=0.12;b.connect(f);f.connect(g);g.connect(Snd.master);b.start();b.stop(ac.currentTime+0.07);}
function hush(){Voice.busy=false;try{if(NAT)NAT.stop();else if(Voice.api)speechSynthesis.cancel();}catch(e){}}
function say(text){if(NAT&&!Voice.v)pickVoice();if(muted||!Voice.v)return false;
  const t=text.replace(/^[^:]{2,14}:\s*/,'').replace(/כטב"מי/g,'כטבמי').replace(/כטב"מים/g,'כטבמים').replace(/כטב"ם/g,'כטבם').replace(/נ"מ/g,'נון מם').replace(/מכ"ם/g,'מכם').replace(/ק"מ/g,'קילומטר').replace(/SPICE/g,'ספייס').replace(/מיג-29/g,'מיג עשרים ותשע').replace(/מסלול 09/g,'מסלול אפס תשע');
  if(NAT){try{squelch();NAT.speak(t,/^מגדל/.test(text)?1.15:0.9,1.1);Voice.busy=true;Voice.t=clock;return true;}catch(e){Voice.busy=false;return false;}}
  try{const ut=new SpeechSynthesisUtterance(t);ut.voice=Voice.v;ut.lang=Voice.v.lang;ut.rate=1.1;ut.pitch=/^מגדל/.test(text)?1.15:0.9;
    ut.onend=ut.onerror=()=>{if(Voice.busy){Voice.busy=false;squelch();}};speechSynthesis.cancel();squelch();speechSynthesis.speak(ut);Voice.busy=true;Voice.t=clock;return true;}catch(e){Voice.busy=false;return false;}}
function updRadio(dt){radioT-=dt;const el=$('radio'),talking=Voice.busy&&clock-Voice.t<25;if(!talking)Voice.busy=false;
  if(radioT<=0&&!talking){if(radioQ.length){const m=radioQ.shift();el.textContent=m;el.dataset.on='1';radioT=say(m)?3:6.5;if(!Voice.busy)beep(1400,0.04,0.03,'sine');}else el.dataset.on='';}}
function show(id,on){$(id).hidden=!on;}
function toast(t){const el=$('toast');el.textContent=t;el.dataset.on='1';toastT=3.2;}
/* start-up checklist: every line is also a button that works the switch */
function updCheck(dt){if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').dataset.on='';}
  const el=$('check'),on=state==='fly'&&W&&W.stats.start==='cold'&&!W.flags.airborne&&W.player.alive&&!(W.flags.ready&&W.time-W.flags.readyT>6)&&!(W.flags.ready&&W.player.V>12)&&!(touchOn&&look.panel);
  if(el.hidden===on)el.hidden=!on;if(!on)return;
  const L=W.checklist(),sig=L.map(c=>c.done?'d':c.busy?'b'+Math.round((c.pct||0)*20):'-').join('')+(W.autoStart?'A':'');if(sig===checkSig)return;checkSig=sig;
  const nx=L.find(c=>!c.done);
  $('checkList').innerHTML=L.map(c=>`<li><button data-sw="${c.id}" class="${c.done?'done':c.busy?'busy':c===nx?'next':''}"><span>${c.done?'✓':c.busy?Math.round((c.pct||0)*100)+'%':'○'}</span>${c.t}</button></li>`).join('');
  $('autoStart').textContent=W.autoStart?'עצור':'התנעה אוטומטית';$('checkDone').hidden=!L.every(c=>c.done);}
$('checkList').addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(b&&W&&state==='fly'){e.preventDefault();W.sw(b.dataset.sw);buzz(12);}});
$('autoStart').onclick=()=>{if(W){W.autoStart=!W.autoStart;checkSig='';}};
function goImmersive(){if(touchOn&&!window.HFNative&&!document.fullscreenElement&&!matchMedia('(display-mode: fullscreen)').matches){try{const el=document.documentElement,pr=el.requestFullscreen&&el.requestFullscreen();if(pr&&pr.then)pr.then(()=>{try{const o=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(o&&o.catch)o.catch(()=>{});}catch(e){}}).catch(()=>{});}catch(e){}}
  try{if(navigator.wakeLock){const w=navigator.wakeLock.request('screen');if(w&&w.catch)w.catch(()=>{});}}catch(e){}}
function start(mode){tilt.p0=null;mapOn=false;padlock=false;startedAt=performance.now();goImmersive();hush();Snd.init();if(Snd.ac&&Snd.ac.state==='suspended')Snd.ac.resume();newGame(mode);view=0;state='fly';show('menu',false);show('pause',false);show('debrief',false);$('app').dataset.fly='1';}
function pause(){if(state!=='fly')return;hush();state='pause';show('pause',true);$('resume').focus();}
function resume(){tilt.p0=null;state='fly';show('pause',false);last=performance.now();}
function toMenu(){if(window.__hfPending){location.reload();return;}hush();state='menu';show('pause',false);show('debrief',false);show('menu',true);$('app').dataset.fly='';newGame('runway',true);}
let lastMode='runway';
$('startRwy').onclick=()=>{camp.on=false;start(lastMode='runway');};$('startAir').onclick=()=>{camp.on=false;start(lastMode='air');};$('startCold').onclick=()=>{camp.on=false;start(lastMode='cold');};
$('ejectBtn').onclick=()=>{resume();if(W.eject()){look.panel=false;mapOn=false;}};$('resume').onclick=resume;$('restart').onclick=()=>start(lastMode);$('quit').onclick=toMenu;$('again').onclick=()=>start(lastMode);$('back').onclick=toMenu;
/* pilot logbook, kept on this device */
function readLog(){try{return Object.assign({n:0,win:0,mig:0,uav:0,tgt:0,t:0,land:0},JSON.parse(localStorage.getItem('haniaflight-log')||'{}'));}catch(e){return{n:0,win:0,mig:0,uav:0,tgt:0,t:0,land:0};}}
function showLog(){const L=readLog(),el=$('logbook');if(!el)return;const h=Math.floor(L.t/3600),mi=Math.floor(L.t%3600/60),rank=L.win>=25?'מוביל מבנה':L.win>=10?'מוביל זוג':L.win>=3?'טייס מבצעי':L.n?'טייס צעיר':'חניך';
  el.innerHTML=[['דרגה',rank],['גיחות',L.n],['משימות שהושלמו',L.win],['הפלות מטוסים',L.mig],['כטב"מים וטילי שיוט',L.uav],['מטרות קרקע',L.tgt],['נחיתות',L.land],['שעות טיסה',`${h}:${String(mi).padStart(2,'0')}`]].map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');}
function writeLog(){const L=readLog(),s=W.stats;L.n++;if(W.over.win)L.win++;L.mig+=s.mig;if(W.missionId!=='train')L.uav+=s.uav;L.tgt+=s.tgt;L.t+=W.time;if(s.sink!=null&&W.player.alive)L.land++;try{localStorage.setItem('haniaflight-log',JSON.stringify(L));}catch(e){}showLog();}
/* flight recorder and replay */
const rp={t:0,i:0,ev:0,play:true,speed:1,az:0.7,el:0.22,dist:70,drag:false,px:0,py:0,pool:[],ui:-1};
function recFrame(){if(rec.length>36000)return;const p=W.player,o=new Float32Array(recObj.length*8);recObj.forEach((e,i)=>{const k=i*8;o[k]=e.pos.x;o[k+1]=e.pos.y;o[k+2]=e.pos.z;o[k+3]=e.q.x;o[k+4]=e.q.y;o[k+5]=e.q.z;o[k+6]=e.q.w;o[k+7]=e.alive?1:0;});
  const ms=[];for(const L of[W.missiles,W.bombs])for(const m of L)if(m.alive)ms.push(m.pos.x,m.pos.y,m.pos.z,m.vel.x,m.vel.y,m.vel.z);
  rec.push({t:W.time,p:[p.pos.x,p.pos.y,p.pos.z,p.q.x,p.q.y,p.q.z,p.q.w,p.eng,p.gearPos,p.alive?1:0,p.brakePos],o,m:ms});}
const mmss=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function startReplay(){if(rec.length<5)return;for(const L of[W.missiles,W.bombs])for(const m of L)m.alive=false;W.bullets=[];emitters.length=0;chute.visible=false;for(const q of P)q.on=false;
  rp.t=rec[0].t;rp.i=0;rp.ev=0;rp.play=true;rp.speed=1;rp.dist=70;rp.ui=-1;state='replay';show('debrief',false);show('replay',true);$('toast').dataset.on='';radioQ.length=0;$('radio').textContent='';$('rpPlay').textContent='השהה';$('rpSpeed').textContent='×1';}
function endReplay(){for(const m of rp.pool)m.visible=false;state='debrief';show('replay',false);show('debrief',true);}
function nq(a,i,b,j,k){let d=a[i]*b[j]+a[i+1]*b[j+1]+a[i+2]*b[j+2]+a[i+3]*b[j+3],sg=d<0?-1:1,x=lerp(a[i],b[j]*sg,k),y=lerp(a[i+1],b[j+1]*sg,k),z=lerp(a[i+2],b[j+2]*sg,k),w=lerp(a[i+3],b[j+3]*sg,k),l=Math.hypot(x,y,z,w)||1;return{x:x/l,y:y/l,z:z/l,w:w/l};}
function stepReplay(wall){const t1=rec[rec.length-1].t;if(rp.play){rp.t+=wall*rp.speed;if(rp.t>=t1){rp.t=t1;rp.play=false;$('rpPlay').textContent='נגן';}}
  while(rp.i<rec.length-2&&rec[rp.i+1].t<=rp.t)rp.i++;while(rp.i>0&&rec[rp.i].t>rp.t)rp.i--;
  const A=rec[rp.i],B=rec[Math.min(rp.i+1,rec.length-1)],k=B.t>A.t?clamp((rp.t-A.t)/(B.t-A.t),0,1):0,p=W.player;
  p.pos=v3(lerp(A.p[0],B.p[0],k),lerp(A.p[1],B.p[1],k),lerp(A.p[2],B.p[2],k));p.q=nq(A.p,3,B.p,3,k);p.eng=A.p[7];p.gearPos=A.p[8];p.alive=!!A.p[9];p.brakePos=A.p[10];p.agl=p.pos.y-terrainH(p.pos.x,p.pos.z);
  recObj.forEach((e,i)=>{const m=meshOf.get(e),j=i*8;if(j+7>=A.o.length){e.alive=false;if(m)m.visible=false;return;}const al=A.o[j+7]>0,Bo=B.o.length>j+7?B.o:A.o;e.alive=al;if(m)m.visible=al;if(!al)return;
    e.pos=v3(lerp(A.o[j],Bo[j],k),lerp(A.o[j+1],Bo[j+1],k),lerp(A.o[j+2],Bo[j+2],k));e.q=nq(A.o,j+3,Bo,j+3,k);});
  const n=A.m.length/6,dtm=rp.t-A.t;for(let i=0;i<n;i++){let m=rp.pool[i];if(!m){m=new T.Mesh(mslGeo,lam(0xe6e6e0));scene.add(m);rp.pool.push(m);}const j=i*6;m.visible=true;m.position.set(A.m[j]+A.m[j+3]*dtm,A.m[j+1]+A.m[j+4]*dtm,A.m[j+2]+A.m[j+5]*dtm);aim(m,{x:A.m[j+3],y:A.m[j+4],z:A.m[j+5]});
    if(rp.play&&rnd()<0.5)spawn(m.position,rv(1),1.6,1.5,7,[0.9,0.9,0.9],0.35);}
  for(let i=n;i<rp.pool.length;i++)rp.pool[i].visible=false;
  while(rp.ev>0&&recEv[rp.ev-1].t>rp.t)rp.ev--;while(rp.ev<recEv.length&&recEv[rp.ev].t<=rp.t){const e=recEv[rp.ev++];if(rp.play&&rp.t-e.t<1.5)explosion(e.pos,e.size,e.ground);}
  const ui=rp.t*4|0;if(ui!==rp.ui){rp.ui=ui;const t0=rec[0].t;if(document.activeElement!==$('rpSeek'))$('rpSeek').value=String(Math.round((rp.t-t0)/Math.max(0.1,t1-t0)*1000));$('rpTime').textContent=mmss(rp.t)+' / '+mmss(t1);}}
$('watch').onclick=startReplay;$('rpExit').onclick=endReplay;$('rpPlay').onclick=()=>{if(!rp.play&&rp.t>=rec[rec.length-1].t-0.05){rp.t=rec[0].t;rp.ev=0;}rp.play=!rp.play;$('rpPlay').textContent=rp.play?'השהה':'נגן';};
$('rpSpeed').onclick=()=>{rp.speed=rp.speed>=8?1:rp.speed*2;$('rpSpeed').textContent='×'+rp.speed;};$('rpIn').onclick=()=>{rp.dist=Math.max(18,rp.dist*0.7);};$('rpOut').onclick=()=>{rp.dist=Math.min(4000,rp.dist*1.45);};
$('rpSeek').oninput=e=>{const t0=rec[0].t,t1=rec[rec.length-1].t;rp.t=t0+(+e.target.value/1000)*(t1-t0);};
glc.addEventListener('pointerdown',e=>{if(state!=='replay')return;rp.drag=true;rp.px=e.clientX;rp.py=e.clientY;try{glc.setPointerCapture(e.pointerId);}catch(_){}});
glc.addEventListener('pointermove',e=>{if(state!=='replay'||!rp.drag)return;rp.az-=(e.clientX-rp.px)*0.006;rp.el=clamp(rp.el+(e.clientY-rp.py)*0.005,-0.3,1.4);rp.px=e.clientX;rp.py=e.clientY;});
for(const ev of['pointerup','pointercancel'])glc.addEventListener(ev,()=>{rp.drag=false;});
glc.addEventListener('wheel',e=>{if(state!=='replay')return;e.preventDefault();rp.dist=clamp(rp.dist*(e.deltaY>0?1.15:0.87),18,4000);},{passive:false});
/* campaign: five linked sorties; what you destroy in one carries into the next */
const CAMP=[['intercept','הגנת שמיים','הלילה הראשון: מטח כטב"מים וטילי שיוט.'],['duel','קרב אוויר','מטוסי האויב עולים לאוויר. השג עליונות.'],['sead','דיכוי הגנה אווירית','פתח מסדרון למבנה התקיפה. אם תשמיד את כל הסוללות, אתר השיגור יישאר בלי הגנה.'],['strike','פטיש ברזל','השמדת אתר השיגור.'],['convoy','סיור חמוש','מה שנשאר נסוג בשיירה. עצור אותה.']],camp={on:false};
function readCamp(){try{return Object.assign({i:0,sead:false,done:0},JSON.parse(localStorage.getItem('haniaflight-camp')||'{}'));}catch(e){return{i:0,sead:false,done:0};}}
function saveCamp(c){try{localStorage.setItem('haniaflight-camp',JSON.stringify(c));}catch(e){}showCamp();}
function showCamp(){const c=readCamp(),st=CAMP[Math.min(c.i,CAMP.length-1)];$('campStage').textContent=`שלב ${c.i+1} מתוך ${CAMP.length}: ${st[1]}`;$('campText').textContent=st[2]+(c.i===3?(c.sead?' הסוללה שהגנה עליו הושמדה בגיחה הקודמת.':' הסוללה שמגינה עליו עדיין פעילה.'):'')+(c.done?` המערכה הושלמה ${c.done} פעמים.`:'');}
function campResult(){if(!camp.on)return'';const c=readCamp(),id=CAMP[c.i][0];if(W.missionId!==id)return'';if(!W.over.win)return'המערכה: השלב לא הושלם. אפשר לנסות שוב.';
  if(id==='sead')c.sead=true;c.i++;let t;if(c.i>=CAMP.length){c.i=0;c.sead=false;c.done++;t='המערכה הושלמה! כל חמשת השלבים מאחוריך.';}else t=`המערכה: עברת לשלב ${c.i+1}, ${CAMP[c.i][1]}.`;saveCamp(c);return t;}
$('campGo').onclick=()=>{const c=readCamp(),st=CAMP[c.i],pl=R.PLANES[opts.plane];if(!pl.spice&&(st[0]==='sead'||st[0]==='strike')){toast('לשלב הזה צריך מטוס תקיפה. בחר רעם, סופה או אדיר.');$('toast').dataset.on='1';return;}
  opts.mission=st[0];if(st[0]==='duel')opts.foe=c.done?'su27':'mig29';applyOpts();camp.on=true;start(lastMode=st[0]==='duel'?'air':'runway');};
$('campReset').onclick=()=>{saveCamp({i:0,sead:false,done:readCamp().done});};
function debrief(){hush();state='debrief';writeLog();$('dCamp').textContent=campResult();if(rec.length)recFrame();$('watch').hidden=rec.length<20;const o=W.over,s=W.stats,p=W.player,mm=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  $('dTitle').textContent=o.title;$('dReason').textContent=o.reason||'';$('debrief').dataset.win=o.win?'1':'';
  const rows=W.missionId==='tanker'?[['דלק שהתקבל',`${Math.round(W.ar.taken).toLocaleString('en')} ק"ג`]]:W.missionId==='duel'?[[W.foeName+' שהופלו',`${s.mig} מתוך ${W.migs.length}`]]:W.missionId==='escort'?[['מטוסי תקיפה ששרדו',`${W.strikers.filter(k=>k.ac.alive).length} מתוך ${W.strikers.length}`],['מטרות שהושמדו',`${s.tgt} מתוך ${W.nPrimary}`],['מטוסי אויב שהופלו',`${s.mig} מתוך ${W.migs.length}`]]:W.missionId==='sead'?[['סוללות ששותקו',`${s.tgt} מתוך ${W.nPrimary}`],[W.foeName+' שהופלו',`${s.mig} מתוך ${W.migs.length}`]]:W.missionId==='convoy'?[['כלי רכב שהושמדו',`${s.tgt} מתוך ${W.nPrimary}`],['סוללת הליווי',s.sam?'הושמדה':'לא הושמדה']]:W.missionId==='train'?[['מטרות אימון שהופלו',`${s.uav} מתוך 2`]]:W.missionId==='intercept'?[['איומים שהופלו',`${s.uav} מתוך ${W.nDrone}`],['חדרו',s.leak]]:[['כטב"מים שהופלו',`${s.uav} מתוך 4`+(s.leak?` (${s.leak} חדרו)`:'')],['מיג-29 שהופלו',`${s.mig} מתוך 2`],['מטרות אתר השיגור',`${s.tgt} מתוך 3`],['מכ"ם סוללת הנ"מ',s.sam?'הושמד':'לא הושמד']];
  rows.push(['מטוס',W.plane.name],['רמת קושי',{easy:'קל',normal:'רגיל',hard:'קשה'}[W.diff]],['חימוש ששוגר',s.shots],['נזק',W.dmg.length?W.dmg.map(d=>d.t).join(', '):'אין'],['דלק שנותר',`${Math.round(p.fuel).toLocaleString()} ק"ג`],['זמן משימה',mm(W.time)]);
  if(s.sink!=null&&p.alive)rows.push(['שיעור שקיעה בנגיעה',`${Math.round(s.sink*196.85)} רגל לדקה`]);
  $('dStats').innerHTML=rows.map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');show('debrief',true);$('again').focus();}
function handleEvents(){const p=W.player,cp=camera.position;
  for(const e of W.events){
    if(e.type==='msg')radioQ.push(e.text);
    else if(e.type==='launch'){const m=new T.Mesh(mslGeo,lam(0xe8e8e2));dyn.add(m);meshOf.set(e.m,m);if(e.m.owner===p){Snd.whoosh();buzz(45);}}
    else if(e.type==='release'){beep(160,0.12,0.12,'sine');buzz(45);}
    else if(e.type==='boom'){recEv.push({t:W.time,pos:{...e.pos},size:e.size,ground:e.ground});explosion(e.pos,e.size,e.ground);const d=Math.hypot(e.pos.x-cp.x,e.pos.y-cp.y,e.pos.z-cp.z);Snd.boom(clamp(0.9*e.size*800/(d+300),0.03,0.9));shake=Math.max(shake,clamp(e.size*700/(d+150),0,1.6));if(shake>0.3)buzz(Math.round(40+shake*60));if(e.ground&&e.size>2)emitters.push({pos:{...e.pos},vel:v3(),until:clock+90,rate:0.12,t:0,smoke:true});}
    else if(e.type==='eject'){const j=W.ejected;chute.userData.sim={pos:{...j.pos},vel:{...j.vel},t:0};chute.visible=true;Snd.boom(0.7);Snd.whoosh();buzz([80,40,160]);shake=1.5;hush();}
    else if(e.type==='fail'){beep(880,0.15,0.09);setTimeout(()=>beep(880,0.15,0.09),260);buzz(80);}
    else if(e.type==='spawn'){recObj.push(e.e);const g=mkDrone(e.e);dyn.add(g);meshOf.set(e.e,g);}
    else if(e.type==='kill'){const m=meshOf.get(e.e);if(m)m.visible=false;emitters.push({pos:{...e.e.pos},vel:{...e.e.vel},until:clock+40,rate:0.03,t:0,fall:true});}
    else if(e.type==='gkill'){const m=meshOf.get(e.g);if(m){m.traverse(o=>{if(o.material)o.material=lam(0x1d1b19);});m.scale.y=0.55;}}
    else if(e.type==='cm'){for(let i=0;i<2;i++)spawn(e.pos,vadd(vmul(e.vel,0.6),v3((rnd()-0.5)*40,-25-rnd()*15,(rnd()-0.5)*40)),2.8,26,10,[1,0.9,0.6],1,{grav:-9,drag:0.5});
      for(let i=0;i<6;i++)spawn(e.pos,vadd(vmul(e.vel,0.5),rv(30)),1.6,5,30,[0.95,0.95,0.95],0.5,{drag:1.5});}
    else if(e.type==='gun'){gunSnd=0.09;if(clock-buzzT>0.09){buzzT=clock;buzz(25);}}
    else if(e.type==='spark')spawn(e.pos,rv(20),0.4,10,22,[1,0.85,0.5],1);
    else if(e.type==='safe'){safeT=clock;beep(300,0.12,0.06);buzz([15,40,15]);}
    else if(e.type==='sw'){beep(e.on?950:620,0.035,0.05);}
    else if(e.type==='swfail'){toast(e.why);beep(240,0.12,0.06);}
    else if(e.type==='iff'){toast('זיהוי עמית־טורף: המטרה ידידותית. השיגור נחסם.');beep(240,0.2,0.07);}
    else if(e.type==='hurt'){shake=2;buzz([120,60,120]);for(let i=0;i<3;i++)setTimeout(()=>beep(880,0.12,0.09),i*220);}
    else if(e.type==='contact'||e.type==='lock'){beep(1300,0.08,0.06);buzz(30);}
    else if(e.type==='deny'){beep(220,0.15,0.06);buzz([20,50,20]);}}
  W.events.length=0;}
/* ================= frame ================= */
const tv=new T.Vector3(),tq=new T.Quaternion(),tv2=new T.Vector3(),tq2=new T.Quaternion(),headE=new T.Euler(),HEAD_PITCH=-0.17;let camMode=1,hudM=400;
function setQ(o,q){o.quaternion.set(q.x,q.y,q.z,q.w);}
function aim(o,vel){tv.set(-vel.x,-vel.y,-vel.z).normalize();o.quaternion.setFromUnitVectors(tv2.set(0,0,1),tv);}
function syncScene(dt){
  const p=W.player,ud=pMesh.userData;
  pMesh.position.set(p.pos.x,p.pos.y,p.pos.z);setQ(pMesh,p.q);pMesh.visible=p.alive;const inPit=view===0&&(state==='fly'||state==='pause')&&p.alive&&!W.ejected;updChute(dt);for(const o of ud.front)o.visible=!inPit;
  ud.gear.visible=p.gearPos>0.3;for(const f of ud.ab){f.visible=p.eng>1.02;f.scale.set(1,1,0.5+(p.eng-1)*2.2+rnd()*0.22);}ud.sb.rotation.x=-p.brakePos*0.75;
  const w=W.w;ud.bombs.forEach((b,i)=>b.visible=i<w.spice);ud.aams.forEach(b=>b.visible=w[b.userData.k]>b.userData.th);
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
    else if(e.kind==='radar'&&e.alive&&m.userData.dish)m.userData.dish.rotation.y+=dt*2;
    else if(e.kind==='truck'&&e.alive){m.position.set(e.pos.x,e.pos.y,e.pos.z);m.rotation.y=Math.atan2(-e.vel.x,-e.vel.z);if(dt>0&&state==='fly'&&rnd()<0.25)spawn(vadd(e.pos,v3(4,0.5,0)),v3(2,2,rnd()*2-1),3,3,14,[0.7,0.64,0.52],0.25);}}
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
  if(dt>0&&state==='fly'&&p.alive&&W.dmg.length&&rnd()<0.6){const tl=vadd(p.pos,qrot(p.q,v3((rnd()-0.5)*2,0.3,9)));spawn(tl,rv(3),2.2,4,22,[0.2,0.19,0.18],0.45);if(p.fire.some(Boolean))spawn(tl,rv(2),0.35,7,3,[1,0.6,0.2],0.9);}
  if(dt>0&&state==='fly'&&p.alive){const vap=p.g>5.5&&p.V>110?clamp((p.g-5.5)/3,0,1):0;
    if(vap>0&&opts.q==='high')for(const s of[-6.5,6.5])spawn(vadd(p.pos,qrot(p.q,v3(s,0.3,4.6))),vmul(p.vel,0.03),0.5+vap*0.6,1.4,5,[1,1,1],0.3*vap);
    if(p.g>7.2&&rnd()<0.6)spawn(vadd(p.pos,qrot(p.q,v3((rnd()-0.5)*7,1.2,2.5))),vmul(p.vel,0.35),0.22,9,15,[1,1,1],0.14);
    const con=e=>{if(opts.q==='high'&&e.pos.y>8200&&e.eng>0.5)spawn(vadd(e.pos,qrot(e.q,v3(0,0,12))),rv(1.5),15,5,34,[1,1,1],0.3,{drag:0.05});};con(p);for(const mg of W.migs)if(mg.alive)con(mg);
    if(p.onGround&&p.V>25&&rnd()<0.5)spawn(vadd(p.pos,qrot(p.q,v3((rnd()-0.5)*3,-2.2,9))),v3(rnd()*4-2,2+rnd()*2,rnd()*4-2),1.6,4,16,[0.72,0.66,0.55],0.12*clamp(p.eng,0.3,1.3));
    const sk=Math.max(p.onGround?clamp(p.V/90,0,1)*0.12:0,p.alpha>18*D2R?clamp((p.alpha*R2D-18)/10,0,1)*0.3:0,p.eng>1.02?0.05:0,gunSnd>0?0.25:0,p.mach>0.97&&p.mach<1.05?0.2:0);if(sk>shake)shake=sk;}
  shake*=Math.exp(-4*Math.max(dt,0.001));
  /* camera */
  const pq=tq.set(p.q.x,p.q.y,p.q.z,p.q.w);
  if(W.ejected&&chute.userData.sim&&state!=='replay'){const c=chute.userData.sim.pos,a=clock*0.15;camera.up.set(0,1,0);camera.position.set(c.x+Math.cos(a)*26,Math.max(c.y+5,terrainH(c.x+Math.cos(a)*26,c.z+Math.sin(a)*26)+2),c.z+Math.sin(a)*26);camera.lookAt(c.x,c.y+3,c.z);}
  else if(state==='replay'){const a=rp.az,el=rp.el,ce=Math.cos(el);camera.up.set(0,1,0);const x=p.pos.x+Math.sin(a)*ce*rp.dist,z=p.pos.z+Math.cos(a)*ce*rp.dist;camera.position.set(x,Math.max(p.pos.y+Math.sin(el)*rp.dist,terrainH(x,z)+2),z);camera.lookAt(p.pos.x,p.pos.y,p.pos.z);}
  else if(state==='menu'){const a=clock*0.12+0.9;camera.position.set(p.pos.x+Math.cos(a)*34,p.pos.y+7+Math.sin(clock*0.2)*2,p.pos.z+Math.sin(a)*34);camera.up.set(0,1,0);camera.lookAt(p.pos.x,p.pos.y+0.6,p.pos.z);}
  else if(!p.alive){camera.up.set(0,1,0);tv.set(p.pos.x,p.pos.y,p.pos.z);if(camera.position.distanceTo(tv)<60)camera.position.set(p.pos.x-90,p.pos.y+40,p.pos.z+60);camera.lookAt(tv);}
  else if(view===0){const ey=W.plane.eye,e=qrot(p.q,v3(ey[0],ey[1],ey[2])),bob=clamp((p.g-1)*0.006,-0.02,0.05),up=qrot(p.q,UP);
    const pt=padlock&&!look.panel?(W.lock||W.irTgt):null;if(padlock&&!pt&&!look.panel)padlock=false;
    if(pt&&!look.drag){const d=qrotInv(p.q,vsub(pt.pos,p.pos)),ty=clamp(Math.atan2(d.x,-d.z),-2.5,2.5),tp2=clamp(Math.atan2(d.y,Math.hypot(d.x,d.z))-HEAD_PITCH,-0.6,1.35),k=Math.min(1,dt*6);look.yaw+=(ty-look.yaw)*k;look.pitch+=(tp2-look.pitch)*k;}
    else if(!look.drag&&!look.pad){const k=Math.exp(-5*Math.max(dt,0.001)),tp=look.panel?(touchOn?-0.8:-0.56):0;look.yaw*=k;look.pitch=tp+(look.pitch-tp)*k;}
    look.g+=(clamp((p.g-1)*0.021,-0.07,0.16)-look.g)*Math.min(1,dt*3);
    camera.position.set(p.pos.x+e.x-up.x*bob,p.pos.y+e.y-up.y*bob,p.pos.z+e.z-up.z*bob);
    headE.set(HEAD_PITCH+look.pitch+look.g,-look.yaw,0,'YXZ');camera.quaternion.copy(pq).multiply(tq2.setFromEuler(headE));
    cockpit.position.set(p.pos.x+e.x,p.pos.y+e.y,p.pos.z+e.z);cockpit.quaternion.copy(pq);const cu=cockpit.userData;
    cu.stick.rotation.x=stick.y*0.24;cu.stick.rotation.z=-stick.x*0.24;cu.thr.position.z=-0.26-lever/1.3*0.14;cu.caution.material.color.setHex((hudWarn.pull||hudWarn.stall||W.mwarn)&&(clock*4|0)%2?0xffa020:0x2a1500);}
  else{camQ.slerp(pq,Math.min(1,dt*5));tv.set(0,W.plane.chase[0],W.plane.chase[1]).applyQuaternion(camQ);camera.position.set(p.pos.x+tv.x,Math.max(p.pos.y+tv.y,terrainH(p.pos.x+tv.x,p.pos.z+tv.z)+1.5),p.pos.z+tv.z);
    tv.set(0,1,0).applyQuaternion(camQ);camera.up.copy(tv);const f=qrot(p.q,FWD);camera.lookAt(p.pos.x+f.x*90+tv.x*11,p.pos.y+f.y*90+tv.y*11,p.pos.z+f.z*90+tv.z*11);}
  if(shake>0.004&&state==='fly'&&p.alive){const a=shake*(view===0?1:0.5);const t=clock,n1=Math.sin(t*31)+Math.sin(t*47.3+1)*0.6,n2=Math.sin(t*37.1+2)+Math.sin(t*53.9)*0.6,k=view===0?0.35:1;camera.position.x+=n1*a*0.016*k;camera.position.y+=n2*a*0.016*k;camera.rotateX(n2*a*0.003);camera.rotateZ(n1*a*0.004);}
  cockpit.visible=inPit;const cm=inPit?(look.panel?2:0):1;if(cm!==camMode){camMode=cm;layout();$('touch').dataset.panel=cm===2?'1':'';$('lookBack').hidden=cm!==2;}
  {const nb=$('nvgBtn'),h=!(state==='fly'&&tod==='night');if(nb.hidden!==h)nb.hidden=h;const ch=$('chips'),hc=state!=='fly'||cm===2;if(ch.hidden!==hc)ch.hidden=hc;{const wb=$('wingBtn'),hw=!(W&&W.wing);if(wb.hidden!==hw)wb.hidden=hw;if(!hw){const t='שתיים: '+{form:'במבנה',attack:'תוקף',cover:'ציד חופשי'}[W.wing.mode];if(wb.textContent!==t)wb.textContent=t;}}if(padlock!==($('padBtn').dataset.on==='1'))$('padBtn').dataset.on=padlock?'1':'';if(state!=='fly'&&nvg)setNVG(false);}
  if(inPit){const cs=cockpit.userData.sw;for(const id in cs){const v=swState(id),o=cs[id],k=o.kind,ease=Math.min(1,Math.max(dt,0.016)*14),since=clock-o.clickT;
      if(k==='push'||k==='tap'){const tz=(k==='push'&&v)||since<0.18?0.006:0.012;o.lev.position.z+=(tz-o.lev.position.z)*ease*1.6;}
      else if(k==='knob'){const ta=o.ins?(v===1?0.8:v===2?0:-0.8):(v?0.8:-0.8);o.a+=(ta-o.a)*ease;o.lev.rotation.z=-o.a;}
      else if(k==='pull'){const tz=since<1.1?0.04:0.014;o.lev.position.z+=(tz-o.lev.position.z)*ease;}
      else{const ta=v?-0.45:0.45;o.a+=(ta-o.a)*ease;o.lev.rotation.x=o.a;if(o.g.userData.guard)o.g.userData.guard.rotation.x=v?-1.1:0;}
      o.lamp.material.color.setHex(v===1?0x39e06a:v===2?((clock*3|0)%2?0xffb040:0x4a3410):v===3?((clock*4|0)%2?0xff4030:0x501410):0x202422);}}
  sky.position.copy(camera.position);sunSp.position.copy(camera.position).addScaledVector(sunDir,280000);sunHalo.position.copy(sunSp.position);
}
/* camera lens and the HUD glass: the 3D combiner frame is sized to enclose the HUD symbology */
function layout(){const pit=camMode!==1;camera.near=pit?0.12:0.8;camera.fov=camMode===2?(vw<vh?70:touchOn?36:50):vw<vh?78:pit?66:62;camera.updateProjectionMatrix();
  const rpx=renderer.getPixelRatio(),f=vh/2/Math.tan(camera.fov*D2R/2);pmat.uniforms.scale.value=vh*rpx/(2*Math.tan(camera.fov*D2R/2));
  hudM=clamp(Math.min(vw,vh)*0.62,300,560);const cu=cockpit.userData,hw=0.62*0.46*hudM/f,top=0.62*0.5*hudM/f,bot=-0.235,hh=top-bot;
  cu.postL.position.set(-hw,bot+hh/2,-0.62);cu.postR.position.set(hw,bot+hh/2,-0.62);cu.postL.scale.y=cu.postR.scale.y=hh;cu.bar.position.set(0,top,-0.62);cu.bar.scale.x=hw*2;
  cu.glass.position.set(0,bot+hh/2,-0.621);cu.glass.scale.set(hw*2,hh,1);cu.postL.visible=cu.postR.visible=cu.bar.visible=cu.glass.visible=!cu.helmet;}
function resize(){const r=$('app').getBoundingClientRect();vw=Math.max(200,r.width);vh=Math.max(200,r.height);dpr=Math.min(window.devicePixelRatio||1,2);
  const rp=opts.q==='low'?Math.min(dpr,1):dpr;renderer.setPixelRatio(rp);renderer.setSize(vw,vh,false);camera.aspect=vw/vh;hudc.width=vw*dpr;hudc.height=vh*dpr;layout();}
addEventListener('resize',resize);
let last=performance.now();
let slowT=0;
function frame(now){requestAnimationFrame(frame);const wall=Math.min(1,(now-last)/1000),dt=Math.min(0.05,Math.max(0.001,(now-last)/1000));last=now;clock+=dt;
  if(state==='fly'&&opts.q==='high'){slowT=wall>1/24?slowT+wall:Math.max(0,slowT-wall*2);if(slowT>5){opts.q='low';applyOpts();radioQ.push('המחשב: הגרפיקה הועברה למצב חסכוני כדי לשפר את הקצב.');}}
  if(state==='fly'){
    readInput(dt);if(W.mwarn&&timeAcc>1)timeAcc=1;
    simAcc+=dt*timeAcc;const h=1/120;let n=0;
    while(simAcc>=h&&n<48){W.trigger(trigG,trigP,h);if(W.cmHeld){W.cmT-=h;if(W.cmT<=0){W.cmT=0.3;W.dispense(W.player);}}else W.cmT=0;W.step(h);simAcc-=h;n++;}
    if(n===48)simAcc=0;if(n>0)tap.gun=tap.pickle=tap.cm=false;
    handleEvents();recT+=dt*timeAcc;if(recT>=0.1){recT=0;recFrame();}
    const p=W.player;gAcc=clamp(gAcc+(Math.max(0,p.g-6.5)*0.1-(p.g<5?0.3:0))*dt*timeAcc,0,1);
    if(W.over){overT+=wall;if(overT>(p.alive?1.5:4))debrief();}
  }
  if(state==='replay')stepReplay(wall);
  const sdt=state==='fly'?dt*timeAcc:state==='pause'?0:dt;
  if(sdt>0)updParticles(sdt);syncScene(sdt);updWx();updRadio(dt);updCheck(dt);updAudio(dt);
  renderer.render(scene,camera);renderTgp();drawHUD();}
/* ================= HUD ================= */
const HUDC='#74ff96',AMB='#ffbe55',RED='#ff5c4f',hudWarn={pull:false,stall:false};let u=1;
function proj(x,y,z){tv.set(x,y,z).project(camera);const b=tv.z>1;return{x:(tv.x*0.5+0.5)*vw,y:(-tv.y*0.5+0.5)*vh,ok:!b&&tv.z>-1,b};}
const projD=d=>proj(camera.position.x+d.x*9000,camera.position.y+d.y*9000,camera.position.z+d.z*9000);
function font(s,b){ctx.font=`${b?'700 ':''}${Math.round(s*u)}px "Share Tech Mono",ui-monospace,Menlo,Consolas,monospace`;}
function txt(s,x,y,al,sz,col){font(sz||15);ctx.textAlign=al||'left';ctx.fillStyle=col||HUDC;ctx.fillText(s,x,y);}
function line(...a){ctx.beginPath();ctx.moveTo(a[0],a[1]);for(let i=2;i<a.length;i+=2)ctx.lineTo(a[i],a[i+1]);ctx.stroke();}
const dirAE=(az,el)=>v3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));
/* tactical map: north up, the whole theatre. Shows only what the pilot would know. */
function drawMap(p,e){const{nx,nz,cell,x0,z0}=TER,WX=(nx-1)*cell,WZ=(nz-1)*cell;
  if(!mapBg){mapBg=document.createElement('canvas');mapBg.width=312;mapBg.height=180;const x=mapBg.getContext('2d'),im=x.createImageData(312,180),d=im.data;
    for(let j=0;j<180;j++)for(let i=0;i<312;i++){const h=terrainH(x0+i/311*WX,z0+j/179*WZ),hr=terrainH(x0+(i+1)/311*WX,z0+j/179*WZ),k=(j*312+i)*4,t=clamp(h/1500,0,1),sh=clamp((h-hr)/90,-1,1)*26;
      if(h<2){d[k]=20;d[k+1]=46;d[k+2]=66;}else{d[k]=70+t*62+sh;d[k+1]=68+t*44+sh;d[k+2]=50+t*26+sh;}d[k+3]=255;}x.putImageData(im,0,0);}
  const top=touchOn?8:46,bot=touchOn?(opts.ui==='large'?166:136):20,s=Math.min((vw-24)/WX,(vh-top-bot)/WZ),mw=WX*s,mh2=WZ*s,ox=(vw-mw)/2,oy=top+(vh-top-bot-mh2)/2,X=x=>ox+(x-x0)*s,Y=z=>oy+(z-z0)*s,su=u;u=clamp(vw/900,0.7,1.1);
  ctx.save();ctx.shadowBlur=0;ctx.fillStyle='rgba(2,6,8,0.6)';ctx.fillRect(0,0,vw,vh);ctx.globalAlpha=0.93;ctx.imageSmoothingEnabled=true;ctx.drawImage(mapBg,ox,oy,mw,mh2);ctx.globalAlpha=1;
  ctx.lineWidth=1.3;ctx.strokeStyle='rgba(235,230,214,0.6)';ctx.strokeRect(ox+0.5,oy+0.5,mw-1,mh2-1);ctx.beginPath();ctx.rect(ox,oy,mw,mh2);ctx.clip();
  ctx.strokeStyle='rgba(235,230,214,0.12)';for(let gx=Math.ceil(x0/50000)*50000;gx<x0+WX;gx+=50000)line(X(gx),oy,X(gx),oy+mh2);for(let gz=Math.ceil(z0/50000)*50000;gz<z0+WZ;gz+=50000)line(ox,Y(gz),ox+mw,Y(gz));
  const SND='#d2b47c';
  if(W.missionId==='strike'||W.missionId==='intercept'){ctx.strokeStyle=AMB;ctx.setLineDash([5,5]);line(X(16000),oy,X(16000),oy+mh2);ctx.setLineDash([]);txt('DEFENCE LINE',X(16000)+5,oy+12,'left',10,AMB);}
  for(const q of W.sams){if(!q.alive)continue;const r=Math.min(W.d.samR*q.rk,60000*W.sig*Math.min(1.25,q.rk+0.25))*s;ctx.strokeStyle=RED;ctx.fillStyle='rgba(255,92,79,0.13)';ctx.beginPath();ctx.arc(X(q.pos.x),Y(q.pos.z),r,0,7);ctx.fill();ctx.stroke();txt(q.sym==='SA'?'SAM':'SA-'+q.sym,X(q.pos.x),Y(q.pos.z)-r-8,'center',10,RED);}
  for(const g of W.ground){if(!g.alive||g.kind==='launcher')continue;ctx.strokeStyle=g.kind==='radar'?RED:AMB;ctx.strokeRect(X(g.pos.x)-3,Y(g.pos.z)-3,6,6);}
  ctx.strokeStyle=SND;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(X(p.pos.x),Y(p.pos.z));for(let i=W.wp;i<W.wps.length;i++)ctx.lineTo(X(W.wps[i].x),Y(W.wps[i].z));ctx.stroke();ctx.setLineDash([]);
  W.wps.forEach((q,i)=>{const cur=i===W.wp;ctx.strokeStyle=cur?HUDC:SND;ctx.lineWidth=cur?2:1.3;ctx.beginPath();ctx.arc(X(q.x),Y(q.z),5,0,7);ctx.stroke();txt(q.n,X(q.x),Y(q.z)-13,'center',11,cur?HUDC:SND);});ctx.lineWidth=1.3;
  ctx.fillStyle=SND;ctx.fillRect(X(RWY.x1),Y(0)-1.5,Math.max(8,(RWY.x2-RWY.x1)*s),3);
  for(const k of W.friends){if(!k.alive)continue;ctx.strokeStyle=HUDC;ctx.beginPath();ctx.arc(X(k.pos.x),Y(k.pos.z),5,0,7);ctx.stroke();txt(k.type==='TANKER'?'TANKER':k.label||'2',X(k.pos.x),Y(k.pos.z)+14,'center',10);}
  for(const c of W.contacts){if(c.fr)continue;ctx.fillStyle=RED;ctx.fillRect(X(c.e.pos.x)-4,Y(c.e.pos.z)-2,8,4);if(c.e===W.lock){ctx.strokeStyle=RED;ctx.beginPath();ctx.arc(X(c.e.pos.x),Y(c.e.pos.z),8,0,7);ctx.stroke();}}
  ctx.translate(X(p.pos.x),Y(p.pos.z));ctx.rotate(e.hdg);ctx.fillStyle=HUDC;ctx.strokeStyle='#04140a';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();ctx.shadowBlur=0;const wp=W.wps[W.wp],dw=Math.hypot(wp.x-p.pos.x,wp.z-p.pos.z),bw=(Math.atan2(wp.x-p.pos.x,-(wp.z-p.pos.z))*R2D+360)%360;
  txt(`MAP · N UP · GRID 50 KM`,ox+6,oy+mh2-10,'left',11,'#ebe6d6');txt(`${wp.n}  ${String(Math.round(bw)%360).padStart(3,'0')}° / ${(dw/NM).toFixed(0)} NM`,ox+mw-6,oy+mh2-10,'right',12,HUDC);u=su;}
/* targeting pod picture: a second, zoomed camera drawn into a corner of the view */
let tgpR=null;const tgpCam=new T.PerspectiveCamera(3,1,20,260000),tgpFx=document.createElement('div');
tgpFx.style.cssText='position:absolute;pointer-events:none;display:none;backdrop-filter:grayscale(1) contrast(1.3) brightness(0.82);-webkit-backdrop-filter:grayscale(1) contrast(1.3) brightness(0.82)';hudc.parentNode.insertBefore(tgpFx,hudc);
function renderTgp(){const on=!!tgpR&&state==='fly'&&!!W.gtgt;tgpFx.style.display=on?'block':'none';if(!on)return;const p=W.player,g=W.gtgt,r=tgpR,R0=vdist(g.pos,p.pos),dn=qrot(p.q,UP);
  tgpFx.style.left=r.x+'px';tgpFx.style.top=r.y+'px';tgpFx.style.width=tgpFx.style.height=r.s+'px';
  tgpCam.fov=clamp(2*Math.atan(110/R0)*R2D,0.35,14);tgpCam.updateProjectionMatrix();tgpCam.position.set(p.pos.x-dn.x*2.5,p.pos.y-dn.y*2.5,p.pos.z-dn.z*2.5);tgpCam.up.set(0,1,0);tgpCam.lookAt(g.pos.x,g.pos.y+3,g.pos.z);
  const cv=cockpit.visible,pv=pMesh.visible,y=vh-r.y-r.s;cockpit.visible=false;pMesh.visible=false;renderer.setScissorTest(true);renderer.setScissor(r.x,y,r.s,r.s);renderer.setViewport(r.x,y,r.s,r.s);renderer.render(scene,tgpCam);
  renderer.setScissorTest(false);renderer.setViewport(0,0,vw,vh);cockpit.visible=cv;pMesh.visible=pv;}
function drawHUD(){tgpR=null;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.direction='ltr';ctx.clearRect(0,0,vw,vh);if(state!=='fly'&&state!=='pause'||!W)return;
  const p=W.player,w=W.w,m=Math.min(vw,vh),cx=vw/2,cy=vh/2;u=clamp(m/700,touchOn?0.72:0.62,1.3);
  const e=p.euler(),kcas=p.V*Math.sqrt((p.rho||1.225)/1.225)*KT,altF=p.pos.y*FT,blink=(clock*4|0)%2===0;
  ctx.lineWidth=1.6*u;ctx.strokeStyle=HUDC;ctx.fillStyle=HUDC;ctx.textBaseline='middle';ctx.shadowColor='rgba(0,25,5,0.85)';ctx.shadowBlur=3;
  if(!p.alive||W.ejected){ctx.shadowBlur=0;return;}
  const pw=W.power,sy=W.sys;
  /* the HUD is collimated: in the cockpit it stays on the aircraft boresight and inside the combiner glass as the head moves */
  const ms=clamp(m*0.27,104,230),bs=projD(qrot(p.q,FWD));let hx=cx,hy=cy,mh=m,hudOn=true,mfdSolid=false;
  if(view===0&&cockpit.userData.helmet){hy=cy-m*0.09;mh=hudM;u=clamp(hudM*1.3/700,touchOn?0.72:0.62,1.3);ctx.lineWidth=1.6*u;}
  else if(view===0){hx=bs.x;hy=bs.y;mh=hudM;hudOn=bs.ok;u=clamp(hudM*1.3/700,touchOn?0.72:0.62,1.3);ctx.lineWidth=1.6*u;}
  if(!pw)hudOn=false;   /* no electrical power: the HUD and the displays stay dark */
  ctx.save();ctx.beginPath();if(!hudOn)ctx.rect(0,0,0,0);else if(view===0)ctx.rect(hx-mh*0.46,hy-mh*0.5,mh*0.92,mh*0.98);else ctx.rect(0,0,vw,vh);ctx.clip();
  /* pitch ladder */
  const fw=qrot(p.q,FWD),vhat=p.V>15?vmul(p.vel,1/p.V):fw;
  ctx.save();ctx.beginPath();ctx.arc(hx,hy-mh*0.02,mh*0.33,0,7);ctx.clip();
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
  const ty=Math.max(34*u,hy-mh*0.41),ppd=5.2*u,hd=e.hdg*R2D;
  ctx.save();ctx.beginPath();ctx.rect(hx-22*ppd,ty-22*u,44*ppd,44*u);ctx.clip();
  for(let d=Math.floor((hd-24)/5)*5;d<=hd+24;d+=5){const x=hx+(d-hd)*ppd,dd=((d%360)+360)%360;line(x,ty,x,ty+(dd%10?5:9)*u);if(dd%10===0)txt(String(dd/10).padStart(2,'0'),x,ty-10*u,'center',14);}
  ctx.restore();line(hx-6*u,ty+20*u,hx,ty+11*u,hx+6*u,ty+20*u);
  const wp=W.wps[W.wp],wb=Math.atan2(wp.x-p.pos.x,-(wp.z-p.pos.z)),wd=Math.hypot(wp.x-p.pos.x,wp.z-p.pos.z);
  let rb=((wb-e.hdg)*R2D+540)%360-180;const wx=hx+clamp(rb,-21,21)*ppd;ctx.strokeStyle=ctx.fillStyle=HUDC;line(wx,ty+10*u,wx-5*u,ty+19*u,wx+5*u,ty+19*u,wx,ty+10*u);line(wx,ty+19*u,wx,ty+26*u);
  /* speed / altitude */
  const sx=hx-mh*0.33,ax=hx+mh*0.33;
  ctx.strokeRect(sx-34*u,hy-13*u,68*u,26*u);txt(String(Math.round(kcas)),sx+28*u,hy+1,'right',20);
  txt('M '+p.mach.toFixed(2),sx-34*u,hy+30*u,'left',14);txt('G '+p.g.toFixed(1),sx-34*u,hy+48*u,'left',14,p.g>8.5?AMB:HUDC);txt('α '+(p.alpha*R2D).toFixed(1),sx-34*u,hy+66*u,'left',14,p.alpha>24*D2R?AMB:HUDC);
  ctx.strokeRect(ax-40*u,hy-13*u,80*u,26*u);txt(String(Math.round(altF/10)*10),ax+34*u,hy+1,'right',20);
  if(p.agl<1500)txt('R '+Math.round(p.agl*FT/10)*10,ax+40*u,hy+30*u,'right',14);txt('VS '+Math.round(p.vel.y*196.85/100)*100,ax+40*u,hy+48*u,'right',14);
  /* nav */
  const by=hy+mh*0.27,eta=wd/Math.max(p.V,30);
  if(sy.ins<1){txt('INS ALIGN',ax+40*u,by,'right',14,AMB);txt(Math.round(sy.ins*100)+'%',ax+40*u,by+18*u,'right',14,AMB);}
  else{txt(`WP${W.wp+1} ${wp.n}`,ax+40*u,by,'right',14);txt(`${(wd/NM).toFixed(1)}NM  ${Math.floor(eta/60)}:${String(Math.floor(eta%60)).padStart(2,'0')}`,ax+40*u,by+18*u,'right',14);}
  const names={AIM120:'MRM AIM-120',PYTHON:'SRM PYTHON-5',GUN:'GUN M61',SPICE:'A/G '+W.plane.bomb.name},cnt={AIM120:w.aim120,PYTHON:w.python,GUN:w.gun,SPICE:w.spice};
  txt(names[w.sel],sx-34*u,by,'left',14);txt('×'+cnt[w.sel]+(!cnt[w.sel]?'  EMPTY':W.arm?'  ARM':'  SAFE'),sx-34*u,by+18*u,'left',14,cnt[w.sel]&&W.arm?HUDC:AMB);
  /* target symbology */
  const bar=(R0,rmax,rne,label)=>{const x=hx+mh*0.24,y0=hy-mh*0.15,y1=hy+mh*0.15,top=Math.max(rmax*1.25,R0*1.08,1),Y=r=>y1-(y1-y0)*clamp(r/top,0,1);
    line(x,y0,x,y1);line(x,Y(rmax),x+10*u,Y(rmax));if(rne)line(x,Y(rne),x+7*u,Y(rne));const yc=Y(R0);line(x-11*u,yc-5*u,x-2*u,yc,x-11*u,yc+5*u);txt(label,x-14*u,yc,'right',13);};
  const locate=(s)=>{let dx=s.x-hx,dy=s.y-hy;if(s.b){dx=-dx;dy=-dy;}const L=Math.hypot(dx,dy)||1;if(s.ok&&s.x>0&&s.x<vw&&s.y>0&&s.y<vh)return true;
    const rr=mh*0.2;line(hx+dx/L*rr*0.5,hy+dy/L*rr*0.5,hx+dx/L*rr,hy+dy/L*rr);ctx.beginPath();ctx.arc(hx+dx/L*rr,hy+dy/L*rr,3*u,0,7);ctx.fill();return false;};
  const L=W.lock;
  if(w.sel!=='SPICE'){
    if(L&&L.alive){const s=proj(L.pos.x,L.pos.y,L.pos.z),r=vsub(L.pos,p.pos),Rg=vlen(r),vc=-vdot(vsub(L.vel,p.vel),vmul(r,1/Rg));
      if(locate(s)){const b=12*u;ctx.strokeRect(s.x-b,s.y-b,2*b,2*b);}
      const ix=ax+40*u,iy=hy+78*u;txt(W.ident(L,Rg),ix,iy,'right',14);txt((Rg/NM).toFixed(1)+' NM',ix,iy+17*u,'right',14);txt('VC '+Math.round(vc*KT),ix,iy+34*u,'right',14);txt('ALT '+(L.pos.y*FT/1000).toFixed(1)+'K',ix,iy+51*u,'right',14);
      if(w.sel==='AIM120'&&W.dlz){const z=W.dlz;bar(Rg,z.rmax,z.rmax*0.42,(Rg/NM).toFixed(1));
        if(Rg<z.rmax&&w.aim120>0&&!p.onGround&&(Rg<z.rmax*0.42||blink))txt('SHOOT',hx,hy+mh*0.2,'center',20);if(z.tof)txt('TOF '+Math.round(z.tof),hx+mh*0.24,hy+mh*0.15+14*u,'center',13);}}
    if(w.sel==='PYTHON'){const I=W.irTgt;if(I){const s=proj(I.pos.x,I.pos.y,I.pos.z);if(s.ok){ctx.beginPath();ctx.arc(s.x,s.y,17*u,0,7);ctx.stroke();}
        const Rg=vdist(I.pos,p.pos);if(W.dlz){bar(Rg,W.dlz.rmax,W.dlz.rmax*0.5,(Rg/NM).toFixed(1));if(Rg<W.dlz.rmax&&w.python>0&&blink)txt('SHOOT',hx,hy+mh*0.2,'center',20);}}
      else{ctx.setLineDash([4*u,6*u]);ctx.beginPath();ctx.arc(wl.x,wl.y,mh*0.2,0,7);ctx.stroke();ctx.setLineDash([]);}}
    if(w.sel==='GUN'){let tof=0.55,tvl=v3();if(L&&L.alive){const Rg=vdist(L.pos,p.pos);if(Rg<3500){tof=Rg/(1030+Math.max(0,-vdot(vsub(L.vel,p.vel),vnorm(vsub(L.pos,p.pos)))));tvl=L.vel;}}
      const bp=vadd(vadd(camera.position,vmul(vadd(vsub(p.vel,tvl),vmul(fw,1030)),tof)),v3(0,-4.9*tof*tof,0)),s=proj(bp.x,bp.y,bp.z);
      if(s.ok){ctx.beginPath();ctx.arc(s.x,s.y,15*u,0,7);ctx.stroke();ctx.beginPath();ctx.arc(s.x,s.y,1.6*u,0,7);ctx.fill();if(wl.ok){ctx.setLineDash([3*u,5*u]);line(wl.x,wl.y,s.x,s.y);ctx.setLineDash([]);}}}
    if(!L&&W.contacts.length&&blink&&w.sel!=='GUN')txt('CONTACT  T = LOCK',hx,hy+mh*0.2,'center',13);
  }else{const g=W.gtgt,b=W.bombSol();
    if(g&&b){const s=proj(g.pos.x,g.pos.y+4,g.pos.z);if(locate(s)){const d=11*u;line(s.x,s.y-d,s.x+d,s.y,s.x,s.y+d,s.x-d,s.y,s.x,s.y-d);}
      const ix=ax+40*u,iy=hy+78*u;txt(g.name,ix,iy,'right',14);txt((b.hd/NM).toFixed(1)+' NM',ix,iy+17*u,'right',14);txt('MAX '+(b.rmax/NM).toFixed(1),ix,iy+34*u,'right',14);
      bar(b.hd,b.rmax,b.rmin,(b.hd/NM).toFixed(1));
      txt(b.ok?'IN RNG':b.emit===false?'NO EMISSION':b.hd>b.rmax?'OUT RNG':b.hd<b.rmin?'TOO CLOSE':'STEER TO TGT',hx,hy+mh*0.2,'center',b.ok?20:15,b.ok?HUDC:AMB);}
    else txt('NO TARGET',hx,hy+mh*0.2,'center',15,AMB);
    for(const b2 of W.bombs){const s=proj(b2.pos.x,b2.pos.y,b2.pos.z);if(s.ok){ctx.beginPath();ctx.arc(s.x,s.y,3*u,0,7);ctx.stroke();}}}
  /* waypoint marker */
  {const s=proj(wp.x,W.wp===3?BY:Math.max(terrainH(wp.x,wp.z),wp.alt||0),wp.z);if(s.ok&&wd>3000){ctx.beginPath();ctx.arc(s.x,s.y,5*u,0,7);ctx.stroke();txt(String(W.wp+1),s.x+9*u,s.y-9*u,'left',12);}}
  /* ILS */
  if(W.wp===3&&wd<32000&&!p.onGround){const east=p.pos.x>0,tx=east?RWY.x2-250:RWY.x1+250,dx=Math.abs(p.pos.x-tx),ga=Math.atan2(p.pos.y-BY,dx)*R2D,la=Math.atan2(p.pos.z,dx)*R2D*(east?1:-1);
    const k=14*u,gx=hx+clamp(la,-4,4)*k,gy=hy+clamp(ga-3,-3,3)*k*1.4;ctx.strokeStyle=AMB;line(gx,hy-48*u,gx,hy+48*u);line(hx-48*u,gy,hx+48*u,gy);ctx.strokeStyle=HUDC;
    txt(`ILS ${east?'27':'09'}  GS ${ga.toFixed(1)}°`,hx,hy+mh*0.27,'center',13,AMB);
    const c=[[RWY.x1,-30],[RWY.x2,-30],[RWY.x2,30],[RWY.x1,30]].map(q=>proj(q[0],BY+0.4,q[1]));if(c.every(q=>q.ok)){ctx.beginPath();c.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.stroke();}}
  /* refuelling: steering to the tanker, then a director box showing where the contact position is */
  if(sy.arDoor&&W.tanker){const a=W.ar,k=W.tanker,sp=proj(k.pos.x,k.pos.y,k.pos.z),far=a.range>500;if(locate(sp)&&far){ctx.beginPath();ctx.arc(sp.x,sp.y,9*u,0,7);ctx.stroke();}
    txt(a.state==='contact'?'CONTACT  +'+Math.round(a.taken)+' KG':far?'TANKER '+(a.range/NM).toFixed(1)+' NM':'PRE-CONTACT '+Math.round(a.dist)+' M',hx,hy-mh*0.3,'center',15,a.state==='contact'?HUDC:AMB);
    if(!far){const bx=hx-mh*0.19,by2=hy+mh*0.13,r=30*u,dx=clamp(-a.rel.x/15,-1,1)*r,dy=clamp(a.rel.y/15,-1,1)*r,dz=clamp(a.rel.z/40,-1,1)*r;
      ctx.strokeRect(bx-r,by2-r,2*r,2*r);line(bx-6*u,by2,bx+6*u,by2);line(bx,by2-6*u,bx,by2+6*u);ctx.beginPath();ctx.arc(bx+dx,by2+dy,5*u,0,7);ctx.fill();
      line(bx+r+10*u,by2-r,bx+r+10*u,by2+r);line(bx+r+5*u,by2,bx+r+15*u,by2);ctx.fillRect(bx+r+6*u,by2+dz-2*u,8*u,4*u);txt('FWD',bx+r+10*u,by2-r-9*u,'center',10);txt('AFT',bx+r+10*u,by2+r+9*u,'center',10);}}
  ctx.restore();
  /* warnings */
  const ahead=terrainH(p.pos.x+p.vel.x*5,p.pos.z+p.vel.z*5);
  hudWarn.pull=!p.onGround&&p.gearPos<0.5&&p.pos.y+p.vel.y*5<ahead+40;hudWarn.stall=!p.onGround&&(p.alpha>26.5*D2R||kcas<105&&p.gearPos<0.5);
  const wr=[];for(const d of W.dmg)if(d.lvl<2||blink)wr.push([d.t,d.lvl===2?RED:AMB]);if(sy.canopy>0.05&&pw)wr.push(['CANOPY',AMB]);if(sy.pbrake&&lever>0.25)wr.push(['PARKING BRAKE',AMB]);
  if(W.mwarn){const oc=((Math.round(W.mwarn.brg*R2D/30)+12)%12)||12;wr.push([`MISSILE ${oc} O'CLOCK  ${(W.mwarn.R/1000).toFixed(1)}KM`,RED]);}
  if(hudWarn.pull)wr.push(['PULL UP',RED]);if(hudWarn.stall)wr.push(['STALL',AMB]);
  if(!p.onGround&&p.gearPos<0.5&&p.agl<260&&kcas<210)wr.push(['GEAR',AMB]);if(p.fuel<W.bingo)wr.push(['BINGO FUEL',AMB]);if(p.gearPos>0.5&&kcas>300)wr.push(['GEAR SPEED',AMB]);
  if(clock-safeT<1.8)wr.push(['MASTER ARM SAFE — M',AMB]);
  if(p.onGround&&W.time<25&&lever<0.05&&W.stats.start==='runway')wr.push(['HOLD SHIFT — THROTTLE UP',HUDC]);
  if(pw||touchOn||view===1)wr.forEach((q,i)=>{if(q[1]!==RED||blink)txt(q[0],cx,cy-m*0.25+i*24*u,'center',19,q[1]);});
  if(timeAcc>1)txt('TIME ×'+timeAcc,cx,cy-m*0.33,'center',14,AMB);if(ap.on)txt('AP  ALT '+Math.round(ap.alt*FT/100)*100+'  HDG '+String(Math.round(ap.hdg*R2D)%360).padStart(3,'0'),cx,cy-m*0.33+18*u,'center',14);
  /* displays: drawn into the cockpit panel's screens, and as an overlay in the chase view and on touch devices */
  ctx.shadowBlur=0;
  const thr=p.eng>1.01?'AB '+Math.round((p.eng-1)/0.3*100)+'%':Math.round(p.eng*100)+'%';
  const bg=(x,y0,bw,bh,title)=>{ctx.fillStyle=mfdSolid?'#020a06':'rgba(4,14,9,0.78)';ctx.fillRect(x,y0,bw,bh);ctx.strokeStyle='rgba(116,255,150,0.55)';ctx.lineWidth=1.2*u;ctx.strokeRect(x+0.5,y0+0.5,bw-1,bh-1);if(title)txt(title,x+5*u,y0+10*u,'left',11);};
  const dark=(x,y0,bw,bh)=>{ctx.fillStyle='#030504';ctx.fillRect(x,y0,bw,bh);ctx.strokeStyle='rgba(116,255,150,0.2)';ctx.lineWidth=1.2*u;ctx.strokeRect(x+0.5,y0+0.5,bw-1,bh-1);};
  const mfdRadar=(x,y0,ms)=>{if(!pw)return dark(x,y0,ms,ms);const rd=W.radar,sc=rd.rng,Rm=sc*NM,on=W.radarOn;bg(x,y0,ms,ms,(on?rd.mode:W.dmgRadar?'FAIL':'OFF')+' '+sc+'NM');
    const X=az=>x+ms/2+az/(60*D2R)*(ms/2-7*u),Y=r=>y0+ms-8*u-clamp(r/Rm,0,1)*(ms-26*u);
    ctx.strokeStyle='rgba(116,255,150,0.22)';for(const f of[0.25,0.5,0.75,1])line(x+4,Y(Rm*f),x+ms-4,Y(Rm*f));for(const a of[-30,0,30])line(X(a*D2R),Y(0),X(a*D2R),Y(Rm));
    if(!on){txt(W.dmgRadar?'RADAR FAIL':'RADAR OFF',x+ms/2,y0+ms/2,'center',14,AMB);return;}
    ctx.strokeStyle=ctx.fillStyle=HUDC;const lim=rd.mode==='ACM'?30:60,sw=((clock*(rd.mode==='ACM'?3:1.3))%2),sa=(sw<1?sw*2-1:3-sw*2)*lim*D2R;ctx.globalAlpha=0.4;line(X(sa),Y(0),X(sa),Y(Rm));ctx.globalAlpha=1;
    if(rd.mode==='ACM'){ctx.setLineDash([3*u,4*u]);line(X(-30*D2R),Y(0),X(-30*D2R),Y(10*NM),X(30*D2R),Y(10*NM),X(30*D2R),Y(0));ctx.setLineDash([]);}
    /* hostile and unknown contacts are filled bricks, friendly ones are open circles; the locked one carries a velocity stick */
    for(const c of W.contacts){if(c.R>Rm||Math.abs(c.az)>60*D2R)continue;const px=X(c.az),py=Y(c.R);
      if(c.fr){ctx.beginPath();ctx.arc(px,py,4.5*u,0,7);ctx.stroke();}else ctx.fillRect(px-4*u,py-2*u,8*u,4*u);
      if(c.e===L){ctx.beginPath();ctx.arc(px,py,8*u,0,7);ctx.stroke();const a=Math.atan2(c.vel.x,-c.vel.z)-e.hdg;line(px,py,px+Math.sin(a)*15*u,py-Math.cos(a)*15*u);txt(c.id+' '+Math.round(c.e.pos.y*FT/1000),px,py+15*u,'center',10);}}
    const gb=(pos)=>{const az=((Math.atan2(pos.x-p.pos.x,-(pos.z-p.pos.z))-e.hdg)+9*Math.PI)%(2*Math.PI)-Math.PI,r=Math.hypot(pos.x-p.pos.x,pos.z-p.pos.z);return Math.abs(az)<60*D2R&&r<Rm?[X(az),Y(r)]:null;};
    for(const g of W.ground){if(!g.alive||g.kind==='launcher')continue;const q=gb(g.pos);if(!q)continue;ctx.strokeStyle=g.kind==='radar'?RED:AMB;const d=4*u;ctx.strokeRect(q[0]-d,q[1]-d,2*d,2*d);if(g===W.gtgt&&w.sel==='SPICE'){ctx.beginPath();ctx.arc(q[0],q[1],8*u,0,7);ctx.stroke();}}
    ctx.strokeStyle=HUDC;const q=gb(wp);if(q&&sy.ins>=1){ctx.beginPath();ctx.arc(q[0],q[1],4*u,0,7);ctx.stroke();}};
  const mfdRwr=(x,y0,ms)=>{if(!pw)return dark(x,y0,ms,ms);bg(x,y0,ms,ms,W.dmgRwr?'TEWS FAIL':'TEWS');const ox=x+ms/2,oy=y0+ms/2+4*u,rr=ms/2-12*u;ctx.strokeStyle='rgba(116,255,150,0.3)';ctx.beginPath();ctx.arc(ox,oy,rr,0,7);ctx.stroke();ctx.beginPath();ctx.arc(ox,oy,rr*0.5,0,7);ctx.stroke();line(ox,oy-6*u,ox,oy+6*u);line(ox-6*u,oy,ox+6*u,oy);
    for(const t of W.threats||[]){const r=rr*[0.86,0.66,0.46,0.3][t.lvl],px=ox+Math.sin(t.brg)*r,py=oy-Math.cos(t.brg)*r,col=t.lvl>=3?RED:t.lvl===2?RED:t.lvl===1?AMB:HUDC;
      if(t.lvl>=2&&!blink&&t.sym!=='M')continue;txt(t.sym,px,py,'center',13,col);ctx.strokeStyle=col;if(t.lvl>=1){const d=10*u;line(px,py-d,px+d,py,px,py+d,px-d,py,px,py-d);}}
    txt('CH '+w.chaff,x+5*u,y0+ms-9*u,'left',11);txt('FL '+w.flare,x+ms-5*u,y0+ms-9*u,'right',11);};
  const mfdEng=(x,y0,bw,bh)=>{if(!pw)return dark(x,y0,bw,bh);bg(x,y0,bw,bh);const xc=x+bw/2,r=bh/5,wide=bw>205*u;
    txt(`FUEL ${Math.round(p.fuel)} KG`+(wide?`  FF ${(p.ff*3.6).toFixed(1)}`:''),xc,y0+r*0.55,'center',13,p.fuel<W.bingo?AMB:HUDC);txt('THR '+thr+'   RPM '+p.rpm.map(v=>Math.round(v*100)).join('/'),xc,y0+r*1.5,'center',wide?14:12,p.eng>1.01?AMB:HUDC);
    let tx=xc-bw*0.36;for(const q of[['GEAR',p.gearPos>0.9,p.gearPos>0.05&&p.gearPos<=0.9],['FLAPS',p.flaps],['BRK',p.brakePos>0.5]]){txt(q[0],tx,y0+r*2.45,'left',13,q[2]?AMB:q[1]?HUDC:'rgba(116,255,150,0.28)');tx+=bw*0.27;}
    txt('MASTER '+(W.arm?'ARM':'SAFE')+(ap.on?'  AP':'')+(sy.pbrake?'  PBRK':'')+(sy.arDoor?'  AR':''),xc,y0+r*3.4,'center',13,W.arm?RED:HUDC);
    let s2='';for(const k of WSEL)s2+=(k===w.sel?'>':' ')+{AIM120:'120',PYTHON:'PY5',GUN:'GUN',SPICE:'SPC'}[k]+' '+cnt[k]+' ';if(wide)txt(s2.trim(),xc,y0+r*4.35,'center',12);};
  const ag=w.sel==='SPICE'&&!!W.gtgt&&W.gtgt.alive&&pw;
  const mfdTgp=(x,y0,ms)=>{const g=W.gtgt,sees=W.podSees(g),c0=x+ms/2,c1=y0+ms/2,gp=ms*0.07,ln=ms*0.2;if(sees)tgpR={x,y:y0,s:ms};else{ctx.fillStyle='#030504';ctx.fillRect(x,y0,ms,ms);}
    ctx.strokeStyle='rgba(116,255,150,0.6)';ctx.lineWidth=1.2*u;ctx.strokeRect(x+0.5,y0+0.5,ms-1,ms-1);ctx.strokeStyle='#f2f2ea';line(c0-ln,c1,c0-gp,c1);line(c0+gp,c1,c0+ln,c1);line(c0,c1-ln,c0,c1-gp);line(c0,c1+gp,c0,c1+ln);
    txt('TGP',x+5*u,y0+10*u,'left',11,'#f2f2ea');txt((vdist(g.pos,p.pos)/NM).toFixed(1)+' NM',x+ms-5*u,y0+10*u,'right',11,'#f2f2ea');txt(g.name,x+5*u,y0+ms-9*u,'left',10,'#f2f2ea');
    const lg=W.plane.bomb.lgb,fl=W.bombs.length>0;txt(sees?(lg?(fl?'LASING':'LASER RDY'):'TRACK'):'MASKED',x+ms-5*u,y0+ms-9*u,'right',11,sees?(lg&&fl&&blink?RED:'#f2f2ea'):AMB);};
  if(ag&&view===0&&!touchOn)mfdTgp(10*u,vh-clamp(m*0.27,104,230)-10*u,clamp(m*0.27,104,230));
  if(view===0&&(opts.q==='high'||(clock*30|0)%2===0)){const main=ctx,su=u,cv=cockpit.userData.cv;mfdSolid=true;u=1.3;
    if(cv.w){ctx=cv.w.ctx;mfdRadar(0,0,256);mfdEng(256,0,256,256);mfdRwr(512,0,256);cv.w.tex.needsUpdate=true;}
    else{ctx=cv.r.ctx;mfdRadar(0,0,256);cv.r.tex.needsUpdate=true;ctx=cv.t.ctx;mfdRwr(0,0,256);cv.t.tex.needsUpdate=true;ctx=cv.e.ctx;mfdEng(0,0,256,160);cv.e.tex.needsUpdate=true;}
    ctx=main;u=su;mfdSolid=false;}
  if(view===1||touchOn){const pad=10*u,y0=touchOn?pad+2+(document.fullscreenElement||fsMode?0:22):vh-ms-pad;(ag?mfdTgp:mfdRadar)(pad,y0,ms);mfdRwr(vw-ms-pad,y0,ms);
    if(touchOn){const ty2=y0+ms+16*u;ctx.fillStyle='rgba(4,14,9,0.62)';ctx.fillRect(pad-4*u,ty2-10*u,ms+8*u,36*u);ctx.fillRect(vw-pad-ms-4*u,ty2-10*u,ms+8*u,36*u);
      txt('THR '+thr,pad,ty2,'left',13,p.eng>1.01?AMB:HUDC);let tx=pad;
      for(const q of[['GEAR',p.gearPos>0.9,p.gearPos>0.05&&p.gearPos<=0.9],['FLAP',p.flaps],['BRK',p.brakePos>0.5]]){txt(q[0],tx,ty2+17*u,'left',12,q[2]?AMB:q[1]?HUDC:'rgba(116,255,150,0.3)');tx+=46*u;}
      txt('FUEL '+Math.round(p.fuel),vw-pad,ty2,'right',13,p.fuel<W.bingo?AMB:HUDC);txt(`120:${w.aim120} PY:${w.python} SP:${w.spice}`,vw-pad,ty2+17*u,'right',12);}
    else{const bw=Math.min(340*u,vw-2*(ms+pad)-16*u);if(bw>150*u)mfdEng(cx-bw/2,vh-pad-80*u,bw,80*u);}}
  if(touchOn&&(clock*4|0)!==drawHUD.a){drawHUD.a=clock*4|0;$('tbArm').dataset.on=W.arm?'1':'';}
  /* sun glare: looking towards the sun washes the view out */
  if(tod!=='night'&&!mapOn){const sp=projD(sunDir);tv.set(0,0,-1).applyQuaternion(camera.quaternion);const k=Math.pow(Math.max(0,tv.x*sunDir.x+tv.y*sunDir.y+tv.z*sunDir.z),6);
    if(sp.ok&&k>0.02){const r=m*(0.5+k*0.9),g=ctx.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,r),c=tod==='dusk'?'255,190,120':'255,248,225';g.addColorStop(0,`rgba(${c},${0.55*k})`);g.addColorStop(0.25,`rgba(${c},${0.22*k})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);}}
  if(mapOn)drawMap(p,e);
  /* g vignette */
  if(gAcc>0.02){const g=ctx.createRadialGradient(cx,cy,m*(0.75-gAcc*0.62),cx,cy,m*(0.95-gAcc*0.4));g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${Math.min(1,gAcc*1.5)})`);ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);}
  /* objectives */
  if((clock*2|0)!==drawHUD.t){drawHUD.t=clock*2|0;const s=W.stats;$('obj').textContent=W.missionId==='tanker'?`דלק שהתקבל ${Math.round(W.ar.taken)} ק"ג`:W.missionId==='duel'?`הפלות ${s.mig}/${W.migs.length}`:W.missionId==='escort'?`מובילים ${W.strikers.filter(k=>k.ac.alive).length}/${W.strikers.length} · מטרות ${s.tgt}/${W.nPrimary} · הפלות ${s.mig}/${W.migs.length}`:W.missionId==='sead'?`סוללות ${s.tgt}/${W.nPrimary}`:W.missionId==='convoy'?`כלי רכב ${s.tgt}/${W.nPrimary}`:W.missionId==='train'?`הדרכה · שלב ${Math.min((W.trainStep||0)+1,W.trainN||6)} מתוך ${W.trainN||6}`:W.missionId==='intercept'?`הופלו ${s.uav}/${W.nDrone} · חדרו ${s.leak}`:`כטב"מים ${s.uav}/4 · מטרות ${s.tgt}/3 · מיגים ${s.mig}/2`;}
}
const touchOn=matchMedia('(pointer:coarse)').matches,fsMode=matchMedia('(display-mode: fullscreen)').matches||!!window.HFNative;
$('voiceTest').onclick=()=>{Snd.init();if(Snd.ac&&Snd.ac.state==='suspended')Snd.ac.resume();if(!Voice.v)pickVoice();if(!say('בקר: פטיש אחת, שומע אותך חמש על חמש.'))pickVoice();};
const opts={diff:'normal',tod:'day',q:touchOn?'low':'high',plane:'F15I',mission:'strike',sens:'normal',inv:'off',tilt:'off',ui:'normal',wx:'clear',fail:'off',bomb:'spice',theatre:theatre0,foe:'mig29',wing:'on'};
try{const o=JSON.parse(localStorage.getItem('haniaflight-opts')||'{}');for(const k in opts)if(typeof o[k]==='string')opts[k]=o[k];}catch(e){}
if(!R.PLANES[opts.plane])opts.plane='F15I';if(!['strike','intercept','sead','convoy','escort','duel','tanker','train'].includes(opts.mission))opts.mission='strike';if(!TOD[opts.tod])opts.tod='day';if(!R.DIFF[opts.diff])opts.diff='normal';if(opts.q!=='low')opts.q=opts.q==='high'?'high':'low';
if(!['low','normal','high'].includes(opts.sens))opts.sens='normal';for(const k of['inv','tilt'])if(opts[k]!=='on')opts[k]='off';if(opts.ui!=='large')opts.ui='normal';if(!['clear','wind','storm'].includes(opts.wx))opts.wx='clear';if(opts.fail!=='on')opts.fail='off';if(opts.bomb!=='lgb')opts.bomb='spice';opts.theatre=theatre0;if(!['mig29','su27','mig21'].includes(opts.foe))opts.foe='mig29';if(opts.wing!=='off')opts.wing='on';
function fillBrief(){const pl=R.PLANES[opts.plane];if(!pl.spice&&opts.mission==='strike')opts.mission='intercept';$('mStrike').disabled=!pl.spice;if(!pl.spice&&opts.mission==='sead')opts.mission='intercept';$('mSead').disabled=!pl.spice;const m=opts.mission,air=m==='duel'||m==='tanker'||m==='train'||m==='escort';$('foeRow').hidden=m!=='duel';$('wingRow').hidden=m==='tanker'||m==='train';
  $('unit').textContent=pl.name+' · '+pl.unit;for(const[k,id]of[['strike','briefStrike'],['duel','briefDuel'],['tanker','briefTanker'],['intercept','briefIcpt'],['train','briefTrain'],['sead','briefSead'],['convoy','briefConvoy'],['escort','briefEscort']])$(id).hidden=m!==k;$('startRwy').hidden=$('startCold').hidden=air;
  $('startAir').classList.toggle('go',air);$('startAir').textContent=m==='duel'?'לקרב':m==='tanker'?'אל המתדלק':m==='train'?'להדרכה':m==='escort'?'אל המבנה':'התחלה באוויר';
  const rows=[['טילי אוויר־אוויר מכ"מיים',pl.aim120+' × AIM-120C']];if(pl.python)rows.push(['טילי אוויר־אוויר תרמיים',pl.python+' × PYTHON-5']);
  const lg=opts.bomb==='lgb'&&!pl.internal;$('bombRow').hidden=(m!=='strike'&&m!=='convoy')||!!pl.internal||!pl.spice;if(m==='sead'&&!pl.internal)rows.push(['טילים נגד מכ"ם','4 × AGM-88']);else if(m==='sead'||m==='convoy'&&pl.spice)rows.push(['פצצות מונחות',pl.spice+' × '+pl.bomb.name]);if(m==='strike')rows.push(lg?['פצצות מונחות לייזר',(pl.spice+2)+' × GBU-12']:['פצצות דאייה מונחות',pl.spice+' × '+pl.bomb.name]);if(pl.internal)rows.push(['חתימת מכ"ם','נמוכה מאוד · חימוש פנימי']);rows.push(['תותח',(pl.internal?'GAU-22 · ':'M61A1 · ')+(pl.gun||510)],['דלק',(m==='tanker'?Math.round(R.TYPES[pl.type].fuelMax*0.3):air?pl.fuelAir:pl.fuelRwy).toLocaleString('en')+' kg']);
  $('loadout').innerHTML=rows.map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');}
function applyOpts(){fillBrief();if(W&&state==='menu'&&(W.plane.type!==opts.plane||W.wx!==opts.wx))newGame('runway',true);for(const b of document.querySelectorAll('[data-opt]'))b.setAttribute('aria-pressed',String(opts[b.dataset.opt]===b.dataset.val));
  if(tod!==opts.tod||!applyOpts.done)setTOD(opts.tod);applyOpts.done=true;$('touch').dataset.big=opts.ui==='large'?'1':'';$('app').dataset.big=opts.ui==='large'&&touchOn?'1':'';$('tiltRow').hidden=!touchOn;$('uiRow').hidden=!touchOn;showLog();showCamp();cloudSp.forEach((c,i)=>c.visible=opts.q==='high'||i%2===0);resize();
  try{localStorage.setItem('haniaflight-opts',JSON.stringify(opts));}catch(e){}}
for(const b of document.querySelectorAll('[data-opt]'))b.onclick=()=>{opts[b.dataset.opt]=b.dataset.val;if(b.dataset.opt==='theatre'&&b.dataset.val!==theatre0){try{localStorage.setItem('haniaflight-opts',JSON.stringify(opts));}catch(e){}$('loadText')&&($('loading').hidden=false,$('loadText').textContent='טוען את הזירה…');location.reload();return;}if(b.dataset.opt==='tilt'&&b.dataset.val==='on')tiltOn(true);applyOpts();};if(opts.tilt==='on')tiltOn(false);
/* Android back button, called by the app shell: pause a flight, resume from pause, otherwise let the app close */
window.__hfBack=()=>{if(state==='fly'){pause();return true;}if(state==='pause'){resume();return true;}if(state==='debrief'){toMenu();return true;}return false;};
/* on Android the native app opens faster than a browser-installed one, so offer that instead */
const android=/Android/i.test(navigator.userAgent)&&!window.HFNative;$('apk').hidden=!android;
let instEv=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();if(android)return;instEv=e;$('install').hidden=false;});
$('install').onclick=()=>{if(instEv){instEv.prompt();instEv=null;$('install').hidden=true;}};
await prog(0.96);
applyOpts();newGame('runway',true);requestAnimationFrame(frame);
{const n=$('loadMs');if(n)n.textContent=(performance.now()/1000).toFixed(1);}
window.__raam={get W(){return W;},start,keys,setTOD,get cockpit(){return cockpit;},camera,act,opts,get state(){return state;},ready:true};
$('loading').hidden=true;$('guide2').innerHTML=$('guide').innerHTML;
/* a start button tapped while the world was still loading starts the flight now */
{const q=window.__hfQueue&&window.__hfQueue();if(q&&!$(q).hidden)start(lastMode={startAir:'air',startRwy:'runway',startCold:'cold'}[q]);}
addEventListener('pointerdown',()=>{if(Snd.ac&&Snd.ac.state==='suspended')Snd.ac.resume();},true);
})();
