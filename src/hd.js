/* ================= high-detail aircraft =================
   Smooth fuselages lofted from cross-sections, wings and fins with real airfoil thickness, painted skins with panel lines,
   rivets and markings, glass that reflects the sky, pilots in the cockpit, detailed gear, nozzles and weapons. */
const ENV={tex:null,mats:[]};
/* the sky as a reflection map, rebuilt when the time of day changes */
function updEnv(c){try{const s=new T.Scene(),g=new T.SphereGeometry(100,32,16),col=new Float32Array(g.attributes.position.count*3),z=new T.Color(c.zen),m=new T.Color(c.mid),h=new T.Color(c.hz),gr=new T.Color(c.gnd),o=new T.Color();
  for(let i=0;i<g.attributes.position.count;i++){const y=g.attributes.position.getY(i)/100;if(y<0)o.copy(h).lerp(gr,Math.min(1,-y*4));else if(y<0.25)o.copy(h).lerp(m,y/0.25);else o.copy(m).lerp(z,Math.min(1,(y-0.25)/0.6));col[i*3]=o.r;col[i*3+1]=o.g;col[i*3+2]=o.b;}
  g.setAttribute('color',new T.BufferAttribute(col,3));s.add(new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));
  const sp=new T.Mesh(new T.SphereGeometry(6,12,8),new T.MeshBasicMaterial({color:new T.Color(c.sunCol).multiplyScalar(c.sunI*6)}));sp.position.set(c.sun[0]*90,c.sun[1]*90,c.sun[2]*90);s.add(sp);
  const pm=new T.PMREMGenerator(renderer),rt=pm.fromScene(s,0.03);if(ENV.tex)ENV.tex.dispose();ENV.tex=rt.texture;pm.dispose();for(const mt of ENV.mats){mt.envMap=ENV.tex;mt.needsUpdate=true;}}catch(e){}}
function stdMat(o){const m=new T.MeshStandardMaterial(Object.assign({roughness:0.6,metalness:0.1,envMapIntensity:0.55},o));if(ENV.tex)m.envMap=ENV.tex;ENV.mats.push(m);return m;}
/* painted skins: camouflage, panel lines, rivets, a little grime. u runs nose to tail on fuselages, span-wise on wings */
function skinTex(scheme,seed){let sd=seed||7;const rr=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};
  return canvasTex(1024,1024,(x,w)=>{const P={desert:['#c7a878',['#8f6a44','#7e8a5a']],gray:['#98a1a9',['#878f97']],ghost:['#5f666d',['#565d64']],mig:['#8c959b',['#6f7c86','#a5adb2']]}[scheme];
    x.fillStyle=P[0];x.fillRect(0,0,w,w);
    for(const c of P[1])for(let i=0;i<(scheme==='desert'?11:6);i++){x.fillStyle=c;x.beginPath();const cx=rr()*w,cy=rr()*w,r=60+rr()*150,n=9;for(let k=0;k<=n;k++){const a=k/n*7,q=r*(0.6+rr()*0.6);x[k?'lineTo':'moveTo'](cx+Math.cos(a)*q*1.5,cy+Math.sin(a)*q);}x.closePath();x.fill();}
    /* soften the blotch edges */
    x.globalAlpha=0.35;x.filter&&(x.filter='blur(3px)');x.drawImage(x.canvas,0,0);x.filter&&(x.filter='none');x.globalAlpha=1;
    if(scheme==='ghost'){x.fillStyle='rgba(60,66,72,0.25)';for(let i=0;i<40;i++)x.fillRect(rr()*w,rr()*w,30+rr()*90,8+rr()*30);}
    x.strokeStyle='rgba(30,30,28,0.22)';x.lineWidth=1;for(let i=1;i<22;i++){const u=i/22*w+(rr()-0.5)*16;x.beginPath();x.moveTo(u,0);x.lineTo(u,w);x.stroke();}
    for(let i=1;i<8;i++){const v=i/8*w,a=rr()*w*0.5;x.beginPath();x.moveTo(a,v+(rr()-0.5)*10);x.lineTo(a+w*(0.3+rr()*0.5),v+(rr()-0.5)*10);x.stroke();}
    x.strokeStyle='rgba(30,30,28,0.2)';for(let i=0;i<34;i++){const a=rr()*w,b=rr()*w,c=14+rr()*60,d=10+rr()*40;x.strokeRect(a,b,c,d);}
    x.fillStyle='rgba(20,20,18,0.22)';for(let i=0;i<5200;i++){const a=(rr()*16|0)/16*w+(rr()<0.5?3:-3),b=rr()*w;x.fillRect(a,b,1.6,1.6);}
    x.fillStyle='rgba(40,34,26,0.07)';for(let i=0;i<120;i++){x.fillRect(rr()*w,rr()*w,4+rr()*10,40+rr()*160);}
    for(let i=0;i<9000;i++){const g=rr()<0.5?0:255;x.fillStyle=`rgba(${g},${g},${g},0.035)`;x.fillRect(rr()*w,rr()*w,2,2);}});}
const SKIN={};function skin(s){return SKIN[s]||(SKIN[s]=skinTex(s,{desert:11,gray:23,ghost:37,mig:41}[s]));}
/* a body lofted through cross-sections: superellipses with separate top and bottom heights */
function loftGeo(secs,seg=28){const P=[],UV=[],I=[],z0=secs[0].z,L=secs[secs.length-1].z-z0||1;
  for(const s of secs)for(let j=0;j<=seg;j++){const a=j/seg*Math.PI*2,c=Math.cos(a),sn=Math.sin(a),e=2/(s.n||2.2),x=s.w*Math.sign(c)*Math.pow(Math.abs(c),e),y=(sn>=0?s.ht:s.hb)*Math.sign(sn)*Math.pow(Math.abs(sn),e);P.push((s.x||0)+x,(s.y||0)+y,s.z);UV.push((s.z-z0)/L,j/seg);}
  for(let i=0;i<secs.length-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+1,c=a+seg+1,d=c+1;I.push(a,b,c,b,d,c);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();return g;}
/* a lifting surface with a symmetric airfoil, from a root section to a tip section (span along x, or along y for a fin) */
function foilGeo(root,tip,vert){const NP=11,f=[...Array(NP)].map((_,k)=>(1-Math.cos(Math.PI*k/(NP-1)))/2),yt=t=>x=>5*t*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);
  const ring=s=>{const c=s.te-s.le,h=yt(s.t),pts=[];for(let k=NP-1;k>=0;k--)pts.push([s.le+f[k]*c,h(f[k])*c]);for(let k=1;k<NP;k++)pts.push([s.le+f[k]*c,-h(f[k])*c]);return pts;};
  const r0=ring(root),r1=ring(tip),n=r0.length,P=[],UV=[],I=[],zs=[root.le,root.te,tip.le,tip.te],zmin=Math.min(...zs),zmax=Math.max(...zs);
  const put=(s,p)=>{if(vert)P.push((s.x||0)+p[1],s.span,p[0]);else P.push(s.span,(s.y||0)+p[1],p[0]);UV.push((s.span-root.span)/((tip.span-root.span)||1),(p[0]-zmin)/(zmax-zmin));};
  for(const p of r0)put(root,p);for(const p of r1)put(tip,p);
  for(let k=0;k<n-1;k++){const a=k,b=k+1,c=n+k,d=n+k+1;I.push(a,c,b,b,c,d);}
  const ci=P.length/3;put(tip,[(tip.le+tip.te)/2,0]);for(let k=0;k<n-1;k++)I.push(n+k,ci,n+k+1);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();return g;}
function mirX(g){const m=g.clone();m.scale(-1,1,1);const ix=m.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i];ix[i]=ix[i+1];ix[i+1]=t;}m.index.needsUpdate=true;m.computeVertexNormals();return m;}
/* outward-facing check: flip the winding of a lofted body if its first face points inward */
function outward(g){const p=g.attributes.position,ix=g.index.array,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),cen=new T.Vector3();g.computeBoundingBox();g.boundingBox.getCenter(cen);
  let s=0;for(let i=0;i<Math.min(ix.length,600);i+=3){a.fromBufferAttribute(p,ix[i]);b.fromBufferAttribute(p,ix[i+1]);c.fromBufferAttribute(p,ix[i+2]);const n=b.clone().sub(a).cross(c.clone().sub(a)),m=a.clone().add(b).add(c).divideScalar(3);m.z=cen.z;s+=n.dot(m.sub(new T.Vector3(cen.x,cen.y,m.z)));}
  if(s<0){for(let i=0;i<ix.length;i+=3){const t=ix[i];ix[i]=ix[i+1];ix[i+1]=t;}g.index.needsUpdate=true;g.computeVertexNormals();}return g;}
const decalTex=(w,h,draw)=>{const t=canvasTex(w,h,draw);return new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,fog:true});};
const tailNo=n=>decalTex(128,64,(x,w,h)=>{x.font='bold 46px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#1d1f20';x.fillText(String(n),w/2,h/2+2);});
/* shared parts: missiles, bombs, tanks, wheels, a pilot, nozzles */
const HDM={};function hdm(){if(HDM.ok)return HDM;Object.assign(HDM,{ok:true,white:stdMat({color:0xe8e8e2,roughness:0.5}),olive:stdMat({color:0x5d6150,roughness:0.7}),dark:stdMat({color:0x232526,roughness:0.6}),
  steel:stdMat({color:0x8a8d90,roughness:0.35,metalness:0.8}),tyre:stdMat({color:0x161616,roughness:0.9}),burnt:stdMat({color:0x6a5a4c,roughness:0.4,metalness:0.85}),helmet:stdMat({color:0xd8d6cc,roughness:0.4}),
  visor:stdMat({color:0x2a2010,roughness:0.08,metalness:0.9,envMapIntensity:1.4}),suit:stdMat({color:0x4b5440,roughness:0.85}),radome:stdMat({color:0x77776f,roughness:0.55}),
  glass:stdMat({color:0x0d1a22,roughness:0.04,metalness:0.6,transparent:true,opacity:0.38,envMapIntensity:1.6,depthWrite:false}),gold:stdMat({color:0x5a4218,roughness:0.04,metalness:0.8,transparent:true,opacity:0.5,envMapIntensity:1.7,depthWrite:false})});return HDM;}
function hdMissile(len,r,mat,canard){const G=new T.Group(),M=hdm();let g=new T.CylinderGeometry(r,r,len*0.78,12);g.rotateX(Math.PI/2);part(g,mat,0,0,len*0.11,G);g=new T.SphereGeometry(r,12,8,0,Math.PI*2,0,Math.PI/2);g.rotateX(-Math.PI/2);part(g,canard?M.dark:mat,0,0,-len*0.28,G).scale.z=2.6;
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,f=part(new T.BoxGeometry(0.012,r*3.4,len*0.12),mat,0,0,len*0.44,G);f.rotation.z=a;if(canard){const c=part(new T.BoxGeometry(0.012,r*2.6,len*0.07),mat,0,0,-len*0.2,G);c.rotation.z=a;}else{const m2=part(new T.BoxGeometry(0.012,r*2.2,len*0.16),mat,0,0,len*0.05,G);m2.rotation.z=a;}}
  part(new T.BoxGeometry(0.08,0.06,len*0.5),M.dark,0,r+0.03,0.1,G);return G;}
function hdBomb(len,r){const G=new T.Group(),M=hdm(),b=stdMat({color:0x5b5f4e,roughness:0.75});let g=new T.CylinderGeometry(r,r*0.75,len*0.62,14);g.rotateX(Math.PI/2);part(g,b,0,0,0.05*len,G);
  g=new T.SphereGeometry(r,14,8,0,Math.PI*2,0,Math.PI/2);g.rotateX(-Math.PI/2);part(g,b,0,0,-len*0.26,G).scale.z=1.9;part(new T.BoxGeometry(r*2.1,0.02,len*0.12),M.dark,0,0,-len*0.16,G);
  for(let i=0;i<4;i++){const f=part(new T.BoxGeometry(0.015,r*2.6,len*0.18),b,0,0,len*0.4,G);f.rotation.z=i*Math.PI/2+Math.PI/4;}part(new T.BoxGeometry(0.1,0.12,len*0.3),M.dark,0,r+0.06,0,G);return G;}
function hdWheel(r,w){const G=new T.Group(),M=hdm();let g=new T.TorusGeometry(r*0.78,r*0.24,10,20);g.rotateY(Math.PI/2);part(g,M.tyre,0,0,0,G).scale.x=w/(r*0.5);g=new T.CylinderGeometry(r*0.56,r*0.56,w*0.9,16);g.rotateZ(Math.PI/2);part(g,M.steel,0,0,0,G);return G;}
function hdGearLeg(G,x,z,y0,len,r,w,twin){const M=hdm(),grp=new T.Group();grp.position.set(x,y0,z);G.add(grp);let g=new T.CylinderGeometry(0.09,0.09,len*0.62,8);part(g,M.steel,0,-len*0.31,0,grp);
  g=new T.CylinderGeometry(0.065,0.065,len*0.5,8);part(g,stdMat({color:0xdadada,roughness:0.2,metalness:0.9}),0,-len*0.7,0,grp);part(new T.BoxGeometry(0.05,0.3,0.25),M.steel,0,-len*0.72,0.12,grp);
  for(const s of twin?[-1,1]:[0]){const wh=hdWheel(r,w);wh.position.set(s*(w*0.62),-len,0);grp.add(wh);}if(!twin){const ax=new T.CylinderGeometry(0.05,0.05,w*1.4,8);ax.rotateZ(Math.PI/2);part(ax,M.steel,0,-len,0,grp);}return grp;}
function hdPilot(G,z,y){const M=hdm(),n0=G.children.length;part(new T.SphereGeometry(0.15,14,10),M.helmet,0,y,z,G);const v=part(new T.SphereGeometry(0.152,14,8,-Math.PI*0.32,Math.PI*0.64,Math.PI*0.32,Math.PI*0.3),M.visor,0,y,z,G);v.rotation.y=Math.PI;
  part(new T.BoxGeometry(0.42,0.36,0.3),M.suit,0,y-0.32,z+0.06,G);part(new T.BoxGeometry(0.5,0.75,0.12),M.dark,0,y-0.18,z+0.3,G);return G.children.slice(n0);}
function hdNozzle(G,x,y,z,r,len,ud){const M=hdm();let g=new T.CylinderGeometry(r,r*0.86,len,24,1,true);g.rotateX(-Math.PI/2);const n=part(g,M.burnt,x,y,z,G);n.material.side=T.DoubleSide;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=part(new T.BoxGeometry(0.02,0.04,len*0.9),M.dark,x+Math.cos(a)*r*0.93,y+Math.sin(a)*r*0.93,z,G);b.rotation.z=a;}
  g=new T.TorusGeometry(r*0.95,0.03,6,24);part(g,M.steel,x,y,z-len/2,G);const d=part(new T.CircleGeometry(r*0.7,20),M.dark,x,y,z-len*0.2,G);d.rotation.y=Math.PI;
  const fl=(rr,l,c,op)=>{const k=new T.ConeGeometry(rr,l,16,1,true);k.rotateX(Math.PI/2);k.translate(0,0,l/2);const m=new T.Mesh(k,new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide}));m.position.set(x,y,z+len/2);m.visible=false;G.add(m);ud.ab.push(m);};
  fl(r*0.82,r*11,0xff9a45,0.6);fl(r*0.55,r*6.5,0xdfe8ff,0.85);for(let k=1;k<=3;k++){const s=part(new T.SphereGeometry(r*0.32,8,6),new T.MeshBasicMaterial({color:0xffd8a8,transparent:true,opacity:0.55,blending:T.AdditiveBlending,depthWrite:false,fog:false}),x,y,z+len/2+k*r*2.2,G);s.scale.z=1.8;s.visible=false;ud.ab.push(s);}}
function hdFinish(G,o){/* shadows and the speed brake contract shared with the old models */G.traverse(m=>{if(m.isMesh&&!m.material.transparent){m.castShadow=true;m.receiveShadow=true;}});return G;}

/* F-15I Ra'am (o.cft, o.two) and F-15 Baz: twin engines, twin fins, big wing */
function buildF15HD(o){const G=new T.Group(),ud=G.userData,M=hdm(),sk=skin(o.camo==='gray'?'gray':o.camo==='mig'?'mig':'desert'),body=stdMat({map:sk,roughness:0.62,metalness:0.12});ud.ab=[];ud.bombs=[];ud.aams=[];
  const fwd=[[-9.7,0.02,0.02,0.02,0],[-9.2,0.27,0.27,0.27,0],[-8.4,0.5,0.5,0.5,0],[-7.4,0.66,0.68,0.66,0.02],[-6.4,0.76,0.8,0.74,0.05],[-5.6,0.82,0.88,0.78,0.08],[-4.6,0.86,0.92,0.8,0.1],[-3.6,0.9,0.95,0.82,0.1],[-2.6,0.95,0.97,0.84,0.1]].map(([z,w,ht,hb,y])=>({z,w,ht,hb,y,n:2.3}));
  const nose=new T.Mesh(outward(loftGeo(fwd.slice(0,4),28)),M.radome),front=new T.Mesh(outward(loftGeo(fwd.slice(3),28)),body);G.add(nose,front);
  const aft=[[-3.0,0.92,0.96,0.84,0.1,2.4],[-1.5,1.25,0.86,0.8,0.1,3],[0.5,1.5,0.78,0.75,0.05,3.5],[3.0,1.52,0.74,0.74,0,3.5],[5.5,1.45,0.7,0.72,0,3.2],[7.0,1.3,0.6,0.66,0,3],[8.2,0.9,0.34,0.45,0,2.4],[9.1,0.3,0.14,0.2,0,2.2]].map(([z,w,ht,hb,y,n])=>({z,w,ht,hb,y,n}));
  G.add(new T.Mesh(outward(loftGeo(aft,32)),body));
  for(const s of[-1,1]){
    /* intake trunks with the dark mouth, engines, nozzles */
    const it=[[-3.8,0.5,0.72,0.72,-0.05],[-2.2,0.54,0.74,0.74,-0.05],[0,0.5,0.7,0.72,-0.05],[1.6,0.34,0.5,0.6,-0.05]].map(([z,w,ht,hb,y])=>({x:s*1.45,z,w,ht,hb,y,n:5}));G.add(new T.Mesh(outward(loftGeo(it,24)),body));
    const mouth=part(new T.PlaneGeometry(0.92,1.3),stdMat({color:0x101214,roughness:0.9}),s*1.45,-0.05,-3.6,G);mouth.rotation.y=Math.PI;const lip=part(new T.TorusGeometry(0.62,0.05,6,4),M.steel,s*1.45,-0.05,-3.8,G);lip.rotation.z=Math.PI/4;lip.scale.set(0.82,1.18,1);part(new T.BoxGeometry(1.02,0.08,0.9),body,s*1.45,0.66,-3.55,G).rotation.x=0.18;
    const en=[[3.6,0.5],[5.8,0.66],[8.6,0.66],[9.2,0.63]].map(([z,r])=>({x:s*0.8,z,w:r,ht:r,hb:r,y:0,n:2}));G.add(new T.Mesh(outward(loftGeo(en,22)),body));
    hdNozzle(G,s*0.8,0,9.7,0.63,1.0,ud);
    if(o.cft){const cf=[[-0.6,0.12,0.2,0.1],[0.4,0.42,0.5,0.3],[4.6,0.42,0.48,0.3],[5.6,0.1,0.18,0.08]].map(([z,w,ht,hb])=>({x:s*1.85,z,w,ht,hb,y:0.3,n:3.2}));G.add(new T.Mesh(outward(loftGeo(cf,20)),body));}
    /* wing, stabilator on its pivot, fin, with decals */
    const wg=outward(foilGeo({span:1.3,y:0.28,le:-1.9,te:5.7,t:0.05},{span:6.52,y:0.18,le:3.2,te:5.0,t:0.035}));G.add(new T.Mesh(s>0?wg:mirX(wg),body));
    const st=outward(foilGeo({span:1.3,y:0,le:6.7-8.4,te:9.4-8.4,t:0.045},{span:4.3,y:0,le:8.6-8.4,te:9.7-8.4,t:0.035})),sh=new T.Group();sh.position.set(0,0.15,8.4);sh.add(new T.Mesh(s>0?st:mirX(st),body));G.add(sh);(ud.stabs=ud.stabs||[]).push({h:sh,side:s});
    const fn=outward(foilGeo({span:0.7,x:s*1.82,le:5.4,te:8.9,t:0.045},{span:4.0,x:s*1.82,le:8.0,te:9.3,t:0.035},true));G.add(new T.Mesh(fn,body));
    if(o.player){const rd=part(new T.CircleGeometry(0.85,24),new T.MeshLambertMaterial({map:roundel,polygonOffset:true,polygonOffsetFactor:-4}),s*4.3,0.33,3.4,G);rd.rotation.x=-Math.PI/2;
      const no=part(new T.PlaneGeometry(0.9,0.45),tailNo(o.no||'228'),s*1.86,1.6,7.4,G);no.rotation.y=s*Math.PI/2;}
    /* pylons, missiles, bombs */
    part(new T.BoxGeometry(0.14,0.36,2.4),M.dark,s*3.4,0.0,2.6,G);
    if(o.player){for(const[z,th]of[[-1.0,s<0?0:1],[3.2,s<0?2:3]]){const a=hdMissile(3.65,0.09,M.white);a.position.set(s*1.2,-0.86,z);a.userData.k='aim120';a.userData.th=th;G.add(a);ud.aams.push(a);}
      const py=hdMissile(3.0,0.08,M.white,true);py.position.set(s*3.86,-0.3,2.4);py.userData.k='python';py.userData.th=s<0?0:1;G.add(py);ud.aams.push(py);
      for(const z of[0.4,1.9,3.4]){const b=hdBomb(3.9,0.29);b.position.set(s*1.85,-0.35,z);G.add(b);ud.bombs.push(b);}}
    part(new T.SphereGeometry(0.1,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*6.5,0.2,4.6,G);}
  ud.bombs.sort((a,b)=>a.position.z-b.position.z);
  /* canopy, frame, seats and crew */
  const cz=o.two?-4.3:-4.7,cl=o.two?2.7:1.85,can=part(new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2),M.glass,0,0.86,cz,G);can.scale.set(0.6,0.56,cl);can.renderOrder=3;const frames=[];
  for(const z of o.two?[cz-cl*0.7,cz+0.1]:[cz-cl*0.7]){const zz=(z-cz)/cl,r=Math.sqrt(Math.max(0,1-zz*zz));const fr=part(new T.TorusGeometry(1,0.03,6,24,Math.PI),M.dark,0,0.86,z,G);fr.scale.set(0.6*r,0.56*r,1);frames.push(fr);}
  const crew=[...hdPilot(G,o.two?-4.95:-4.75,1.05),...(o.two?hdPilot(G,-3.65,1.08):[])];
  ud.front=[nose,front,can,...frames,...crew];
  /* speed brake on the spine, hinged at its front edge */
  ud.sb=new T.Group();ud.sb.position.set(0,0.98,-0.8);G.add(ud.sb);const sbg=new T.BoxGeometry(1.35,0.05,2.6);sbg.translate(0,0,1.3);ud.sb.add(new T.Mesh(sbg,body));
  dressJet(G,{noPitot:true,tip:[6.5,0.2,4.6],nose:-9.7,spine:1.0,spineZ:2.5,noz:[],player:o.player,tanks:o.player?[[0,-1.18,1.2,5.4,0.44],[-3.4,-0.95,2.0,5.0,0.42],[3.4,-0.95,2.0,5.0,0.42]]:[],fins:[[-1.9,3.0,8.5,-Math.PI/2],[1.9,3.0,8.5,Math.PI/2]]});
  ud.gear=new T.Group();G.add(ud.gear);hdGearLeg(ud.gear,0,-5.5,-0.6,1.42,0.38,0.24,false);hdGearLeg(ud.gear,-1.4,1.6,-0.5,1.45,0.45,0.3,false);hdGearLeg(ud.gear,1.4,1.6,-0.5,1.45,0.45,0.3,false);
  for(const s of[-1,1]){const d=part(new T.BoxGeometry(0.04,0.9,1.6),body,s*1.15,-1.05,1.6,ud.gear);d.rotation.z=s*0.15;}part(new T.BoxGeometry(0.04,0.6,1.2),body,0.25,-1.0,-5.4,ud.gear);
  if(o.scale)G.scale.setScalar(o.scale);return hdFinish(G,o);}

/* F-16I Sufa: chin intake, bubble canopy, big dorsal spine and conformal tanks */
function buildF16HD(){const G=new T.Group(),ud=G.userData,M=hdm(),body=stdMat({map:skin('desert'),roughness:0.62,metalness:0.12});ud.ab=[];ud.bombs=[];ud.aams=[];
  const fwd=[[-7.5,0.02,0.02,0.02,0],[-7.0,0.24,0.24,0.24,0],[-6.2,0.42,0.42,0.42,0],[-5.2,0.56,0.6,0.55,0.03],[-4.2,0.66,0.72,0.62,0.06],[-3.2,0.74,0.8,0.68,0.08],[-2.2,0.82,0.84,0.72,0.08]].map(([z,w,ht,hb,y])=>({z,w,ht,hb,y,n:2.2}));
  const nose=new T.Mesh(outward(loftGeo(fwd.slice(0,4),26)),M.radome),front=new T.Mesh(outward(loftGeo(fwd.slice(3),26)),body);G.add(nose,front);
  const aft=[[-2.6,0.8,0.84,0.72,0.08,2.3],[-0.8,1.05,0.95,0.66,0.06,2.6],[1.5,1.08,1.0,0.62,0.02,2.8],[4.0,1.0,0.9,0.62,0,2.6],[6.0,0.78,0.72,0.62,0,2.3],[7.4,0.66,0.6,0.6,0,2]].map(([z,w,ht,hb,y,n])=>({z,w,ht,hb,y,n}));
  G.add(new T.Mesh(outward(loftGeo(aft,30)),body));
  /* the chin intake */
  const it=[[-3.15,0.62,0.4,0.42,-0.86],[-1.6,0.66,0.42,0.42,-0.8],[0.6,0.6,0.35,0.36,-0.62],[2.0,0.4,0.2,0.2,-0.45]].map(([z,w,ht,hb,y])=>({z,w,ht,hb,y,n:3}));G.add(new T.Mesh(outward(loftGeo(it,22)),body));
  const mo=part(new T.CircleGeometry(1,22),M.dark,0,-0.86,-3.14,G);mo.scale.set(0.58,0.37,1);mo.rotation.y=Math.PI;
  /* dorsal spine of the two-seater, and the conformal tanks */
  G.add(new T.Mesh(outward(loftGeo([[-2.4,0.05,0.02,0.02],[-1.4,0.36,0.32,0.05],[3.5,0.36,0.34,0.05],[6.2,0.05,0.04,0.02]].map(([z,w,ht,hb])=>({z,w,ht,hb,y:0.92,n:2.4})),18)),body));
  hdNozzle(G,0,0,7.95,0.6,1.0,ud);
  for(const s of[-1,1]){
    G.add(new T.Mesh(outward(loftGeo([[-0.6,0.1,0.18,0.1],[0.4,0.3,0.42,0.22],[4.2,0.3,0.4,0.22],[5.2,0.08,0.14,0.08]].map(([z,w,ht,hb])=>({x:s*1.0,z,w,ht,hb,y:0.45,n:3})),18)),body));
    const wg=outward(foilGeo({span:0.9,y:0.06,le:-1.4,te:3.9,t:0.04},{span:4.75,y:0.06,le:2.3,te:3.4,t:0.04}));G.add(new T.Mesh(s>0?wg:mirX(wg),body));
    const lx=outward(foilGeo({span:0.75,y:0.05,le:-4.4,te:-1.2,t:0.03},{span:1.0,y:0.05,le:-1.4,te:-1.1,t:0.03}));G.add(new T.Mesh(s>0?lx:mirX(lx),body));
    const st=outward(foilGeo({span:0.85,y:0,le:5.1-6.5,te:7.1-6.5,t:0.04},{span:2.9,y:0,le:6.4-6.5,te:7.3-6.5,t:0.035})),sh=new T.Group();sh.position.set(0,-0.1,6.5);sh.add(new T.Mesh(s>0?st:mirX(st),body));G.add(sh);(ud.stabs=ud.stabs||[]).push({h:sh,side:s});
    const vf=part(new T.BoxGeometry(0.05,0.55,1.2),body,s*0.55,-0.75,6.0,G);vf.rotation.z=s*0.5;
    const rd=part(new T.CircleGeometry(0.66,24),new T.MeshLambertMaterial({map:roundel,polygonOffset:true,polygonOffsetFactor:-4}),s*3.2,0.11,2.4,G);rd.rotation.x=-Math.PI/2;
    /* wing-tip rail and missiles, pylons, bombs */
    part(new T.BoxGeometry(0.1,0.12,2.6),M.dark,s*4.8,0.05,2.6,G);
    const a=hdMissile(3.65,0.085,M.white);a.position.set(s*4.86,0.06,2.6);a.userData.k='aim120';a.userData.th=s<0?0:1;G.add(a);ud.aams.push(a);
    const py=hdMissile(3.0,0.08,M.white,true);py.position.set(s*3.85,-0.3,2.6);py.userData.k='python';py.userData.th=s<0?0:1;G.add(py);ud.aams.push(py);
    for(const x of[1.9,2.9]){part(new T.BoxGeometry(0.12,0.3,1.8),M.dark,s*x,-0.12,1.9,G);const b=hdBomb(3.1,0.24);b.position.set(s*x,-0.52,1.9);G.add(b);ud.bombs.push(b);}
    part(new T.SphereGeometry(0.1,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*4.75,0.15,3.3,G);}
  ud.bombs.sort((a,b)=>Math.abs(b.position.x)-Math.abs(a.position.x));
  const fn=outward(foilGeo({span:0.85,x:0,le:3.6,te:7.2,t:0.045},{span:3.55,x:0,le:6.3,te:7.5,t:0.035},true));G.add(new T.Mesh(fn,body));part(new T.PlaneGeometry(0.8,0.4),tailNo('412'),0.08,1.6,6.2,G).rotation.y=Math.PI/2;
  const can=part(new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2),M.gold,0,0.78,-3.6,G);can.scale.set(0.52,0.58,2.5);can.renderOrder=3;const fr=part(new T.TorusGeometry(0.5,0.03,6,20,Math.PI),M.dark,0,0.78,-3.0,G);G.userData.fr=fr;
  ud.front=[nose,front,can,fr,...hdPilot(G,-4.3,0.98),...hdPilot(G,-3.1,1.02)];
  ud.sb=new T.Group();G.add(ud.sb);
  dressJet(G,{tip:[4.75,0.15,3.3],nose:-7.5,spine:1.1,spineZ:2.0,noz:[],player:true,tanks:[[-2.4,-0.62,1.7,4.6,0.36],[2.4,-0.62,1.7,4.6,0.36]],fins:[[-0.06,2.6,6.6,-Math.PI/2],[0.06,2.6,6.6,Math.PI/2]]});
  ud.gear=new T.Group();G.add(ud.gear);hdGearLeg(ud.gear,0,-4.2,-0.75,0.82,0.33,0.2,false);hdGearLeg(ud.gear,-1.2,1.3,-0.5,1.05,0.36,0.24,false);hdGearLeg(ud.gear,1.2,1.3,-0.5,1.05,0.36,0.24,false);
  return hdFinish(G);}

/* F-35I Adir: blended body with chines, caret intakes, canted twin tails, one engine, nothing hanging outside */
function buildF35HD(){const G=new T.Group(),ud=G.userData,M=hdm(),body=stdMat({map:skin('ghost'),roughness:0.7,metalness:0.08});ud.ab=[];ud.bombs=[];ud.aams=[];
  const fwd=[[-7.7,0.02,0.01,0.01,0,2],[-7.1,0.32,0.18,0.18,0,1.6],[-6.2,0.62,0.34,0.3,0,1.55],[-5.2,0.86,0.5,0.4,0.03,1.6],[-4.2,1.0,0.66,0.46,0.06,1.7],[-3.0,1.15,0.74,0.5,0.06,1.8]].map(([z,w,ht,hb,y,n])=>({z,w,ht,hb,y,n}));
  const nose=new T.Mesh(outward(loftGeo(fwd.slice(0,4),28)),body),front=new T.Mesh(outward(loftGeo(fwd.slice(3),28)),body);G.add(nose,front);
  const aft=[[-3.4,1.1,0.72,0.5,0.06,1.8],[-1.5,1.55,0.78,0.6,0.04,2.4],[1.0,1.7,0.74,0.62,0.02,2.8],[4.0,1.6,0.68,0.6,0.04,2.8],[6.0,1.25,0.6,0.6,0.05,2.5],[7.3,0.8,0.56,0.56,0.05,2.1],[7.8,0.7,0.56,0.56,0.05,2]].map(([z,w,ht,hb,y,n])=>({z,w,ht,hb,y,n}));
  G.add(new T.Mesh(outward(loftGeo(aft,30)),body));hdNozzle(G,0,0.05,8.3,0.6,0.9,ud);
  for(const s of[-1,1]){
    const it=[[-3.0,0.42,0.5,0.5,-0.05],[-1.2,0.48,0.52,0.5,-0.05],[1.0,0.36,0.4,0.42,-0.05]].map(([z,w,ht,hb,y])=>({x:s*1.42,z,w,ht,hb,y,n:2.6}));G.add(new T.Mesh(outward(loftGeo(it,22)),body));
    const mo=part(new T.CircleGeometry(1,16),M.dark,s*1.42,-0.05,-2.99,G);mo.scale.set(0.38,0.46,1);mo.rotation.y=Math.PI;
    const wg=outward(foilGeo({span:1.4,y:0.12,le:-1.2,te:5.6,t:0.045},{span:5.35,y:0.12,le:3.4,te:4.4,t:0.035}));G.add(new T.Mesh(s>0?wg:mirX(wg),body));
    const st=outward(foilGeo({span:1.3,y:0,le:5.4-7.2,te:8.0-7.2,t:0.04},{span:3.5,y:0,le:7.4-7.2,te:8.3-7.2,t:0.035})),sh=new T.Group();sh.position.set(0,0.1,7.2);sh.add(new T.Mesh(s>0?st:mirX(st),body));G.add(sh);(ud.stabs=ud.stabs||[]).push({h:sh,side:s});
    const fg=new T.Group();fg.position.set(s*1.2,0.55,0);fg.rotation.z=-s*0.42;fg.add(new T.Mesh(outward(foilGeo({span:0,x:0,le:4.6,te:7.4,t:0.045},{span:2.9,x:0,le:7.1,te:8.2,t:0.035},true)),body));G.add(fg);
    const rd=part(new T.CircleGeometry(0.6,24),new T.MeshLambertMaterial({map:roundel,color:0xb8bcc0,polygonOffset:true,polygonOffsetFactor:-4}),s*3.4,0.19,3.1,G);rd.rotation.x=-Math.PI/2;
    part(new T.SphereGeometry(0.09,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*5.35,0.14,4.0,G);
    /* weapons bay doors along the belly */
    part(new T.BoxGeometry(0.9,0.02,3.6),stdMat({color:0x5f666c,roughness:0.75}),s*0.62,-0.6,1.4,G);}
  const can=part(new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2),M.gold,0,0.7,-3.9,G);can.scale.set(0.5,0.46,2.2);can.renderOrder=3;
  ud.front=[nose,front,can,...hdPilot(G,-4.2,0.98)];ud.sb=new T.Group();G.add(ud.sb);
  dressJet(G,{noPitot:true,tip:[5.3,0.14,4.0],nose:-7.7,spine:1.05,spineZ:2.2,noz:[],player:true,tanks:[],fins:[]});
  ud.gear=new T.Group();G.add(ud.gear);hdGearLeg(ud.gear,0,-4.4,-0.55,1.0,0.33,0.2,false);hdGearLeg(ud.gear,-1.5,1.5,-0.5,1.04,0.36,0.25,false);hdGearLeg(ud.gear,1.5,1.5,-0.5,1.04,0.36,0.25,false);
  return hdFinish(G);}
