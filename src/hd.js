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
    for(let i=0;i<9000;i++){const g=rr()<0.5?0:255;x.fillStyle=`rgba(${g},${g},${g},0.035)`;x.fillRect(rr()*w,rr()*w,2,2);}
    /* wear: fluid and exhaust streaks running aft, worn paint along panel edges, a few touched-up patches */
    for(let i=0;i<70;i++){const a=rr()*w,b=rr()*w,l=40+rr()*220,g=x.createLinearGradient(a,b,a+l,b);g.addColorStop(0,'rgba(25,22,18,0.16)');g.addColorStop(1,'rgba(25,22,18,0)');x.fillStyle=g;x.fillRect(a,b,l,2+rr()*4);}
    for(let i=0;i<260;i++){x.fillStyle=`rgba(210,210,200,${0.05+rr()*0.08})`;x.fillRect((rr()*16|0)/16*w+(rr()-0.5)*6,rr()*w,1+rr()*3,1+rr()*2);}
    for(let i=0;i<10;i++){x.fillStyle=`rgba(${rr()<0.5?255:0},${rr()<0.5?255:0},0,0.025)`;x.fillRect(rr()*w,rr()*w,20+rr()*50,14+rr()*30);}});}
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

/* M-346 Lavi: the advanced trainer. Slim fuselage, long tandem canopy with the rear seat raised, LERX, side intakes under them,
   twin engines side by side, one fin with the tiger stripes of 102 Squadron, Python training rounds on the wing tips */
function tigerTex(){return decalTex(256,128,(x,w,h)=>{x.fillStyle='#f08a1c';x.fillRect(0,0,w,h);x.fillStyle='#141414';for(let i=0;i<9;i++){const a=i*w/8.5-10;x.beginPath();x.moveTo(a,0);x.lineTo(a+22,0);x.lineTo(a+6+((i%2)?18:-6),h*0.55);x.lineTo(a+30,h);x.lineTo(a+14,h);x.lineTo(a-6,h*0.5);x.closePath();x.fill();}});}
function buildM346HD(){const G=new T.Group(),ud=G.userData,M=hdm(),body=stdMat({map:skin('gray'),roughness:0.55,metalness:0.12});ud.ab=[];ud.bombs=[];ud.aams=[];
  const fwd=[[-5.9,0.02,0.02,0.02,0],[-5.5,0.18,0.18,0.18,0],[-4.9,0.34,0.36,0.32,0],[-4.2,0.46,0.5,0.42,0.02],[-3.3,0.54,0.6,0.5,0.04],[-2.3,0.6,0.64,0.52,0.04]].map(([z,w,ht,hb,y])=>({z,w,ht,hb,y,n:2.2}));
  const nose=new T.Mesh(outward(loftGeo(fwd.slice(0,3),24)),M.radome),front=new T.Mesh(outward(loftGeo(fwd.slice(2),24)),body);G.add(nose,front);
  const aft=[[-2.4,0.6,0.64,0.52,0.04,2.2],[-1.0,0.8,0.62,0.56,0.02,2.5],[1.2,0.86,0.58,0.56,0,2.7],[3.4,0.78,0.5,0.52,0,2.6],[5.0,0.7,0.44,0.44,0,2.4],[5.75,0.66,0.4,0.4,0,2.2]].map(([z,w,ht,hb,y,n])=>({z,w,ht,hb,y,n}));
  G.add(new T.Mesh(outward(loftGeo(aft,28)),body));
  /* raised spine behind the rear seat */
  G.add(new T.Mesh(outward(loftGeo([[-1.5,0.05,0.02,0.02],[-0.6,0.3,0.26,0.05],[3.0,0.28,0.22,0.05],[4.6,0.05,0.03,0.02]].map(([z,w,ht,hb])=>({z,w,ht,hb,y:0.58,n:2.4})),16)),body));
  for(const s of[-1,1]){
    /* intake under the LERX, with a dark mouth */
    G.add(new T.Mesh(outward(loftGeo([[-1.7,0.3,0.36,0.34],[-0.6,0.34,0.4,0.38],[1.6,0.3,0.34,0.32],[2.8,0.08,0.1,0.1]].map(([z,w,ht,hb])=>({x:s*0.78,z,w,ht,hb,y:-0.12,n:3})),18)),body));
    const mo=part(new T.CircleGeometry(1,20),M.dark,s*0.78,-0.12,-1.72,G);mo.scale.set(0.28,0.33,1);mo.rotation.y=Math.PI;
    const wg=outward(foilGeo({span:0.8,y:0.12,le:-0.5,te:2.7,t:0.05},{span:4.8,y:0.08,le:1.9,te:3.0,t:0.04}));G.add(new T.Mesh(s>0?wg:mirX(wg),body));
    const lx=outward(foilGeo({span:0.6,y:0.14,le:-3.1,te:-0.4,t:0.03},{span:0.95,y:0.13,le:-0.7,te:-0.4,t:0.03}));G.add(new T.Mesh(s>0?lx:mirX(lx),body));
    const st=outward(foilGeo({span:0.6,y:0,le:-0.7,te:0.8,t:0.04},{span:2.25,y:0,le:0.35,te:1.05,t:0.035})),sh=new T.Group();sh.position.set(0,-0.08,4.8);sh.add(new T.Mesh(s>0?st:mirX(st),body));G.add(sh);(ud.stabs=ud.stabs||[]).push({h:sh,side:s});
    const rd=part(new T.CircleGeometry(0.55,24),new T.MeshLambertMaterial({map:roundel,polygonOffset:true,polygonOffsetFactor:-4}),s*3.1,0.12,2.25,G);rd.rotation.x=-Math.PI/2;
    /* wing-tip rail with a training Python, and an empty pylon */
    part(new T.BoxGeometry(0.08,0.1,2.0),M.dark,s*4.85,0.08,2.4,G);
    const py=hdMissile(3.0,0.08,M.white,true);py.position.set(s*4.92,0.09,2.4);py.userData.k='python';py.userData.th=s<0?0:1;G.add(py);ud.aams.push(py);
    part(new T.BoxGeometry(0.1,0.26,1.4),M.dark,s*2.6,-0.04,1.6,G);
    hdNozzle(G,s*0.4,-0.02,5.95,0.3,0.5,ud);
    part(new T.SphereGeometry(0.08,8,6),new T.MeshBasicMaterial({color:s<0?0xff3030:0x30ff60}),s*4.8,0.16,3.05,G);}
  /* fin with the tiger stripes and the squadron number */
  const fn=outward(foilGeo({span:0.45,x:0,le:2.4,te:5.5,t:0.05},{span:2.75,x:0,le:4.6,te:5.75,t:0.04},true));G.add(new T.Mesh(fn,body));
  for(const s of[-1,1]){const d=part(new T.PlaneGeometry(1.5,0.75),tigerTex(),s*0.075,2.3,5.05,G);d.rotation.y=s*Math.PI/2;}
  part(new T.PlaneGeometry(0.7,0.35),tailNo('612'),0.07,1.2,4.9,G).rotation.y=Math.PI/2;
  /* long canopy over two seats, the rear one higher */
  const can=part(new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2),M.glass,0,0.6,-3.05,G);can.scale.set(0.5,0.62,2.25);can.renderOrder=3;
  const fr=part(new T.TorusGeometry(0.48,0.03,6,20,Math.PI),M.dark,0,0.6,-3.0,G);G.userData.fr=fr;
  ud.front=[nose,front,can,fr,...hdPilot(G,-3.9,0.78),...hdPilot(G,-2.5,0.92)];
  ud.sb=new T.Group();G.add(ud.sb);
  dressJet(G,{tip:[4.8,0.16,3.05],nose:-5.9,spine:0.85,spineZ:1.5,noz:[],player:true,fins:[[-0.06,1.85,3.9,-Math.PI/2],[0.06,1.85,3.9,Math.PI/2]]});
  ud.gear=new T.Group();G.add(ud.gear);hdGearLeg(ud.gear,0,-3.7,-0.5,0.9,0.26,0.16,false);hdGearLeg(ud.gear,-1.15,1.25,-0.3,1.1,0.31,0.2,false);hdGearLeg(ud.gear,1.15,1.25,-0.3,1.1,0.31,0.2,false);
  return hdFinish(G);}

/* ================= cockpit dressing =================
   Textured panels with fasteners and legends, a padded glareshield, the HUD body, a data strip under it, live standby
   gauges, a warning-light panel, side consoles, the ejection handle, the pilot's legs and kneeboard, gloved hands on the
   stick and throttle, panel lighting at night, sun glare and rain on the canopy. */
const CKT={};
function ckTex(k,w,h,draw){if(CKT[k])return CKT[k];const t=canvasTex(w,h,draw);try{t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}catch(e){}return CKT[k]=t;}
function ckPanelTex(k,base,legends){return ckTex(k,512,256,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);
  for(let i=0;i<5000;i++){const g=Math.random()<0.5?0:255;x.fillStyle=`rgba(${g},${g},${g},0.03)`;x.fillRect(Math.random()*w,Math.random()*h,2,2);}
  const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,0.05)');gr.addColorStop(1,'rgba(0,0,0,0.25)');x.fillStyle=gr;x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(0,0,0,0.6)';x.lineWidth=3;x.strokeRect(8,8,w-16,h-16);x.strokeStyle='rgba(255,255,255,0.06)';x.lineWidth=1;x.strokeRect(11,11,w-22,h-22);
  const dz=(cx,cy)=>{x.fillStyle='#45494c';x.beginPath();x.arc(cx,cy,5.5,0,7);x.fill();x.fillStyle='rgba(0,0,0,0.5)';x.beginPath();x.arc(cx+1,cy+1,5.5,0,7);x.globalCompositeOperation='destination-over';x.fill();x.globalCompositeOperation='source-over';x.strokeStyle='#141516';x.lineWidth=1.6;x.beginPath();x.moveTo(cx-4,cy-1);x.lineTo(cx+4,cy+1);x.stroke();};
  for(let i=24;i<w-10;i+=64){dz(i,20);dz(i,h-20);}for(let j=70;j<h-40;j+=56){dz(20,j);dz(w-20,j);}
  if(legends){x.textAlign='center';x.textBaseline='middle';legends.forEach((r,ri)=>r.forEach((t,ci)=>{const cx=56+ci*(w-112)/Math.max(1,r.length-1),cy=58+ri*62;
    x.font='700 12px monospace';x.fillStyle='rgba(228,231,224,0.8)';x.fillText(t,cx,cy-16);x.fillStyle='#0d0e0f';x.fillRect(cx-11,cy-6,22,22);x.fillStyle='#8d9296';x.fillRect(cx-2.5,cy-11,5,15);x.fillStyle='#c9cdd0';x.beginPath();x.arc(cx,cy-11,4,0,7);x.fill();}));}});}
const ckMat=(k,base,leg,o)=>stdMat(Object.assign({map:ckPanelTex(k,base,leg),roughness:0.86,metalness:0.06},o||{}));
/* the live gauges: drawn on small canvases a few times a second */
function ckGauge(ud,k,size){const c=document.createElement('canvas');c.width=c.height=size||128;const t=new T.CanvasTexture(c);t.minFilter=T.LinearFilter;const m=new T.MeshBasicMaterial({map:t,fog:false});(ud.gauges=ud.gauges||[]).push({k,ctx:c.getContext('2d'),tex:t,n:c.width,m});return m;}
function ckDrawGauge(g,p,W){const x=g.ctx,n=g.n,c=n/2,r=n/2-3;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,n,n);
  const bezel=()=>{x.fillStyle='#08090a';x.beginPath();x.arc(c,c,c,0,7);x.fill();x.strokeStyle='#3b3f42';x.lineWidth=3;x.beginPath();x.arc(c,c,c-1.5,0,7);x.stroke();};
  const ticks=(nT,big,lab,a0=-Math.PI*0.75,span=Math.PI*1.5)=>{x.strokeStyle='#e4e6e0';x.fillStyle='#e4e6e0';x.textAlign='center';x.textBaseline='middle';x.font=`700 ${Math.round(n*0.11)}px monospace`;
    for(let i=0;i<=nT;i++){const a=a0+span*i/nT-Math.PI/2,b=i%big===0;x.lineWidth=b?2.4:1.2;x.beginPath();x.moveTo(c+Math.cos(a)*(r-(b?11:6)),c+Math.sin(a)*(r-(b?11:6)));x.lineTo(c+Math.cos(a)*r,c+Math.sin(a)*r);x.stroke();if(b&&lab)x.fillText(lab(i),c+Math.cos(a)*(r-22),c+Math.sin(a)*(r-22));}};
  const needle=(a,len,col)=>{x.strokeStyle=col||'#f2f2ec';x.lineWidth=n*0.035;x.lineCap='round';x.beginPath();x.moveTo(c-Math.cos(a)*n*0.08,c-Math.sin(a)*n*0.08);x.lineTo(c+Math.cos(a)*len,c+Math.sin(a)*len);x.stroke();x.fillStyle='#202224';x.beginPath();x.arc(c,c,n*0.05,0,7);x.fill();};
  const cap=t=>{x.fillStyle='#bfc3c0';x.font=`700 ${Math.round(n*0.085)}px monospace`;x.textAlign='center';x.fillText(t,c,c+n*0.22);};
  if(g.k==='adi'||g.k==='isfd'){/* attitude: sky and ground behind the fixed aircraft symbol */
    const e=p.euler();x.save();x.beginPath();x.arc(c,c,r,0,7);x.clip();x.translate(c,c);x.rotate(-e.roll);const py=e.pitch*R2D*n*0.012;
    x.fillStyle='#3d7fbf';x.fillRect(-n,-n*2+py,n*2,n*2);x.fillStyle='#6b4a2b';x.fillRect(-n,py,n*2,n*2);x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(-n,py);x.lineTo(n,py);x.stroke();
    x.lineWidth=1.2;for(const d of[-20,-10,10,20]){const y=py-d*n*0.012;x.beginPath();x.moveTo(-n*0.12,y);x.lineTo(n*0.12,y);x.stroke();}x.restore();
    x.strokeStyle='#ffd23a';x.lineWidth=n*0.04;x.beginPath();x.moveTo(c-n*0.28,c);x.lineTo(c-n*0.09,c);x.lineTo(c-n*0.05,c+n*0.05);x.moveTo(c+n*0.28,c);x.lineTo(c+n*0.09,c);x.lineTo(c+n*0.05,c+n*0.05);x.stroke();
    x.strokeStyle='#3b3f42';x.lineWidth=4;x.beginPath();x.arc(c,c,r,0,7);x.stroke();
    if(g.k==='isfd'){x.fillStyle='rgba(0,0,0,0.6)';x.fillRect(2,c-11,n*0.3,22);x.fillRect(n-2-n*0.34,c-11,n*0.34,22);x.fillStyle='#fff';x.font=`700 ${Math.round(n*0.1)}px monospace`;x.textAlign='left';x.fillText(String(Math.round(p.V*KT)),5,c+1);x.textAlign='right';x.fillText(String(Math.round(p.pos.y*FT/10)*10),n-5,c+1);}return;}
  bezel();
  if(g.k==='asi'){ticks(16,2,i=>String(i*50));needle(-Math.PI*0.75+Math.PI*1.5*clamp(p.V*KT/800,0,1)-Math.PI/2,r-10);cap('KNOTS');}
  else if(g.k==='alt'){const ft=p.pos.y*FT;ticks(50,5,i=>String(i/5));needle((ft%1000)/1000*Math.PI*2-Math.PI/2,r-10);x.fillStyle='#000';x.fillRect(c-n*0.2,c+n*0.1,n*0.4,n*0.15);x.fillStyle='#eee';x.font=`700 ${Math.round(n*0.12)}px monospace`;x.textAlign='center';x.fillText(String(Math.floor(ft/1000)).padStart(2,'0'),c,c+n*0.18);}
  else if(g.k==='rpm'||g.k==='rpm1'){const v=(p.rpm[g.k==='rpm1'?1:0]||0)*100;ticks(10,2,i=>String(i*10),-Math.PI*0.75,Math.PI*1.5);needle(-Math.PI*0.75+Math.PI*1.5*clamp(v/110,0,1)-Math.PI/2,r-10,v>102?'#ff6040':'#f2f2ec');cap('RPM');}
  else if(g.k==='fuel'){const f=clamp(W.fuelShown/p.t.fuelMax,0,1.3);ticks(10,2,i=>String(i),-Math.PI*0.75,Math.PI*1.5);needle(-Math.PI*0.75+Math.PI*1.5*clamp(f/1.3*10/10,0,1)-Math.PI/2,r-10,f<0.15?'#ff6040':'#f2f2ec');cap('FUEL');}
  else if(g.k==='clk'){const t=W.time;ticks(60,5,i=>i%15===0?String(i/5||12):'');needle(((t/3600)%12)/12*Math.PI*2-Math.PI/2,r*0.5);needle(((t/60)%60)/60*Math.PI*2-Math.PI/2,r*0.78);x.strokeStyle='#ff5040';x.lineWidth=1.5;const s=(t%60)/60*Math.PI*2-Math.PI/2;x.beginPath();x.moveTo(c,c);x.lineTo(c+Math.cos(s)*r*0.85,c+Math.sin(s)*r*0.85);x.stroke();}
  else if(g.k==='aoa'){ticks(12,3,i=>String(i*3));needle(-Math.PI*0.75+Math.PI*1.5*clamp(p.alpha*R2D/36,0,1)-Math.PI/2,r-10);cap('AOA');}}
/* warning lights */
const CKL=[['FIRE L',(p)=>p.fire[0]],['FIRE R',(p)=>p.fire[1]],['ENG',(p)=>p.rpm.some((r,i)=>r<0.5&&!p.onGround)||p.flame&&p.flame.some(Boolean)],['HYD',(p)=>p.hyd<1],
  ['FUEL LOW',(p,W)=>W.fuelShown<W.bingo*0.5],['BINGO',(p,W)=>W.fuelShown<W.bingo],['GEN',(p,W)=>!W.power],['CANOPY',(p,W)=>W.sys.canopy>0.02],
  ['RADAR',(p,W)=>W.dmgRadar||!!W.flt.radar],['EW',(p,W)=>W.dmgRwr||!!W.flt.ew],['NAV',(p,W)=>!!(W.flt.ins||W.flt.gps)],['MSL',(p,W)=>!!W.mwarn]];
function ckLamps(ud){const c=document.createElement('canvas');c.width=256;c.height=128;const t=new T.CanvasTexture(c);t.minFilter=T.LinearFilter;ud.lamps={ctx:c.getContext('2d'),tex:t,sig:null};return new T.MeshBasicMaterial({map:t,fog:false});}
function ckDrawLamps(L,p,W,single){const on=CKL.map(([n,f],i)=>{if(single&&i===1)return false;try{return!!f(p,W);}catch(e){return false;}}),blink=(clock*3|0)%2,sig=on.join()+blink;if(sig===L.sig)return false;L.sig=sig;
  const x=L.ctx;x.fillStyle='#050505';x.fillRect(0,0,256,128);x.font='700 15px monospace';x.textAlign='center';x.textBaseline='middle';
  CKL.forEach(([n],i)=>{const cx=4+(i%3)*84,cy=4+(i/3|0)*31,lit=on[i],red=i<3||i===11;x.fillStyle=lit?(red?(blink||i>1?'#ff3a28':'#7a1408'):'#ffb020'):'#161616';x.fillRect(cx,cy,80,27);x.fillStyle=lit?'#1a0a00':'#3b3b36';x.fillText(single&&i===0?'FIRE':n,cx+40,cy+14);});return true;}
/* a glove: palm, four fingers curled round a grip, a thumb, the cuff and the sleeve going back to the pilot */
/* the pilot: fabric and leather textures, a hand with jointed fingers curled round a grip, a sleeve with folds, legs with knees,
   a G-suit over the thighs and flying boots. Everything is smooth-shaded so it reads as cloth and leather, not boxes. */
function ckFabric(k,base,dark,opt){return ckTex(k,256,256,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);
  for(let i=0;i<9000;i++){const v=Math.random();x.fillStyle=v<0.5?`rgba(0,0,0,${0.05*Math.random()})`:`rgba(255,255,255,${0.04*Math.random()})`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1);}
  for(let y=0;y<h;y+=3){x.fillStyle='rgba(0,0,0,0.035)';x.fillRect(0,y,w,1);}
  x.strokeStyle=dark;x.lineWidth=1.4;x.setLineDash([3,2]);for(const sx of opt&&opt.seams||[]){x.beginPath();x.moveTo(sx*w,0);x.lineTo(sx*w,h);x.stroke();}x.setLineDash([]);
  if(opt&&opt.pocket){x.strokeStyle=dark;x.lineWidth=2;x.strokeRect(w*0.55,h*0.25,w*0.3,h*0.35);x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(w*0.55,h*0.25,w*0.3,h*0.05);x.fillStyle='#777';x.fillRect(w*0.56,h*0.255,w*0.28,2);}
  if(opt&&opt.lace){x.strokeStyle='rgba(20,20,16,0.7)';x.lineWidth=1.5;for(let y=10;y<h;y+=14){x.beginPath();x.moveTo(w*0.46,y);x.lineTo(w*0.54,y+7);x.moveTo(w*0.54,y);x.lineTo(w*0.46,y+7);x.stroke();}}
  if(opt&&opt.leather){for(let i=0;i<500;i++){x.strokeStyle=`rgba(0,0,0,${0.06*Math.random()})`;x.beginPath();const a=Math.random()*w,b=Math.random()*h;x.moveTo(a,b);x.lineTo(a+Math.random()*10-5,b+Math.random()*4);x.stroke();}}});}
const tube=(pts,r,mat,seg)=>new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(q[0],q[1],q[2]))),seg||14,r,10,false),mat);
const ball=(r,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat);m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);return m;};
function lathe(prof,mat,seg){const g=new T.LatheGeometry(prof.map(q=>new T.Vector2(q[0],q[1])),seg||20);return new T.Mesh(g,mat);}
/* a hand in its own frame: palm down at the origin, fingers towards -z, curling down round an axis along x at y=-0.02, z=-0.045;
   the thumb on -x for a right hand (mirror for the left) */
function ckGlove(mirror,mat,sleeve,curl){const G=new T.Group(),s=mirror?-1:1,R=0.021,c=curl??1;
  const palmMat=mat.leather,backMat=mat.back;
  G.add(ball(0.046,backMat,0,0.004,-0.006,1,0.42,1.12));G.add(ball(0.043,palmMat,0,-0.006,-0.004,0.96,0.34,1.08));
  [[-0.025,0.062,0.0088],[-0.0085,0.07,0.0094],[0.0085,0.066,0.009],[0.024,0.052,0.0082]].forEach(([fx,L,r])=>{fx*=-s;const a=L/R*c,P=[];for(let k=0;k<=8;k++){const t=a*k/8;P.push([fx,-R+R*Math.cos(t)+0.002,-0.045-R*Math.sin(t)]);}
    P.unshift([fx,0.002,-0.03]);G.add(tube(P,r,backMat,16));G.add(ball(r*1.02,backMat,P[P.length-1][0],P[P.length-1][1],P[P.length-1][2]));G.add(ball(r*1.15,backMat,fx,0.006,-0.042));
    G.add(ball(r*1.18,palmMat,fx,-0.004,-0.05,1,0.7,0.8));});
  const tx=0.038*s;G.add(tube([[tx*0.6,-0.004,0.01],[tx,-0.01,-0.012],[tx*1.05,-0.022,-0.034],[tx*0.75,-0.032,-0.05],[tx*0.45,-0.036,-0.06]],0.0105,palmMat,14));G.add(ball(0.0108,palmMat,tx*0.45,-0.036,-0.06));
  const cu=lathe([[0.0,0],[0.036,0],[0.04,0.01],[0.041,0.05],[0.038,0.06],[0,0.06]],backMat,18);cu.rotation.x=Math.PI/2;cu.position.set(0,0.0,0.035);G.add(cu);
  return G;}
/* a sleeve (or any limb) from a to b with folds along it */
function ckLimb(a,b,r0,r1,mat,folds){const d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=d.length(),P=[];const n=folds?18:6;
  for(let i=0;i<=n;i++){const t=i/n,r=r0+(r1-r0)*t+(folds?Math.sin(t*Math.PI*folds)*0.004*(1-Math.abs(0.5-t)):0);P.push([r,t*L]);}P.unshift([0.001,0]);P.push([0.001,L]);
  const m=lathe(P,mat,20);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());m.quaternion.copy(q);m.position.set(a[0],a[1],a[2]);return m;}
function dressCockpit(G,kind,panel){const n0=G.children.length,ud=G.userData,f35=kind==='F35I',f16=kind==='F16I',side=f16||f35,classic=kind==='F15C';
  const base=classic?'#1d2329':f35?'#16181a':kind==='M346'?'#25282a':'#1b1d1f';
  /* the panel faces and the consoles get textures */
  panel.children[0].material=ckMat('pn'+kind,base);
  const cons=ckMat('cons'+kind,base,[['ANT','IFF','TACAN','ILS','UHF'],['EXT LT','INTR LT','OXY','ANTI-G','SEAT'],['TRIM','FCS','PITOT','DEFOG','ECS']]);
  G.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'){const pr=o.geometry.parameters;if(Math.abs(pr.width-0.2)<1e-3&&Math.abs(pr.height-0.34)<1e-3)o.material=cons;}});
  /* glareshield: a padded hood over the panel */
  const hood=new T.CylinderGeometry(0.16,0.16,1.2,24,1,true,Math.PI*1.5,Math.PI);hood.rotateZ(Math.PI/2);const hm=stdMat({map:ckTex('hood',256,64,(x,w,h)=>{x.fillStyle='#0d0e0f';x.fillRect(0,0,w,h);for(let i=0;i<1400;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*0.03})`;x.fillRect(Math.random()*w,Math.random()*h,2,2);}x.strokeStyle='rgba(80,84,88,0.5)';x.setLineDash([3,3]);x.beginPath();x.moveTo(0,h-6);x.lineTo(w,h-6);x.stroke();}),roughness:1,metalness:0,side:T.DoubleSide});
  const hd=part(hood,hm,0,-0.232,-0.84,G);hd.scale.set(1,0.3,0.8);
  /* HUD body under the combiner, with its control face */
  if(!f35){part(new T.BoxGeometry(0.17,0.05,0.16),stdMat({color:0x1a1c1e,roughness:0.6,metalness:0.3}),0,-0.235,-0.72,G);part(new T.PlaneGeometry(0.15,0.036),new T.MeshBasicMaterial({map:ckTex('hudface',128,32,(x,w,h)=>{x.fillStyle='#121314';x.fillRect(0,0,w,h);x.fillStyle='#cfd3d0';x.font='700 11px monospace';x.textAlign='center';x.fillText('HUD  BRT  NIGHT  DCLT',w/2,13);for(let i=0;i<4;i++){x.fillStyle='#333';x.beginPath();x.arc(20+i*29,24,5,0,7);x.fill();}}),fog:false}),0,-0.236,-0.639,G);}
  /* a data strip under the centre display: the F-16's DED, the up-front display elsewhere */
  if(!f35){const c=document.createElement('canvas');c.width=256;c.height=48;const t=new T.CanvasTexture(c);t.minFilter=T.LinearFilter;ud.ded={ctx:c.getContext('2d'),tex:t};part(new T.BoxGeometry(0.25,0.055,0.012),stdMat({color:0x0b0c0d,roughness:0.5}),0,-0.012,0.024,panel);part(new T.PlaneGeometry(0.23,0.043),new T.MeshBasicMaterial({map:t,fog:false}),0,-0.012,0.031,panel);}
  /* live standby gauges replace the painted dials */
  const dials=panel.children.filter(o=>o.geometry&&o.geometry.type==='CircleGeometry');for(const d of dials)panel.remove(d);
  if(!f35){[['asi',-0.11],['adi',0],['alt',0.11]].forEach(([k,x])=>part(new T.CircleGeometry(0.046,28),ckGauge(ud,k),x,-0.105,0.022,panel));
    if(classic)[['rpm',-0.5,-0.1],['rpm1',-0.42,-0.1],['fuel',0.42,-0.1],['clk',0.5,-0.1],['aoa',-0.5,-0.19]].forEach(([k,x,y])=>part(new T.CircleGeometry(0.034,24),ckGauge(ud,k,96),x,y,0.022,panel));
    else{part(new T.CircleGeometry(0.042,26),ckGauge(ud,'clk',96),-0.52,0.13,0.022,panel);part(new T.CircleGeometry(0.042,26),ckGauge(ud,'fuel',96),-0.52,0.0,0.022,panel);part(new T.CircleGeometry(0.042,26),ckGauge(ud,'aoa',96),-0.52,-0.13,0.022,panel);}}
  else part(new T.PlaneGeometry(0.11,0.11),ckGauge(ud,'isfd'),0,-0.2,0.03,panel);
  /* warning-light panel */
  {const w=classic?0.16:0.14;const x0=classic?0.5:f35?0.36:0.52,y0=classic?-0.2:f35?-0.2:0.06;part(new T.BoxGeometry(w+0.01,w*0.5+0.01,0.012),stdMat({color:0x0a0a0a}),x0,y0,0.022,panel);part(new T.PlaneGeometry(w,w*0.5),ckLamps(ud),x0,y0,0.03,panel);}
  /* ejection handle, legs in flight-suit green and a kneeboard on the right thigh with the route */
  const suit=stdMat({map:ckFabric('suit','#56604a','rgba(30,34,24,0.7)',{seams:[0.5],pocket:true}),roughness:0.97}),gsuit=stdMat({map:ckFabric('gsuit','#4a5040','rgba(25,28,20,0.8)',{lace:true}),roughness:0.95}),
    boot=stdMat({map:ckFabric('boot','#1c1b19','rgba(0,0,0,0.6)',{leather:true}),roughness:0.55,metalness:0.05});
  {const h=new T.TorusGeometry(0.05,0.009,8,20,Math.PI);const hm2=stdMat({map:ckTex('eject',64,8,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#111':'#e8c020';x.fillRect(i*8,0,8,h);}}),roughness:0.6});const e=part(h,hm2,0,-0.8,-0.06,G);e.rotation.x=-0.3;}
  for(const s of[-1,1]){const hip=[s*0.15,-0.98,0.12],knee=[s*0.16,-0.86,-0.36],ank=[s*0.15,-1.22,-0.62];
    G.add(ckLimb(hip,knee,0.085,0.062,suit,3));G.add(ckLimb([hip[0],hip[1]+0.005,hip[2]-0.04],[knee[0],knee[1]+0.004,knee[2]+0.06],0.093,0.072,gsuit,0));
    G.add(ball(0.066,suit,knee[0],knee[1],knee[2],1,0.95,1.05));G.add(ckLimb(knee,ank,0.06,0.045,suit,4));
    G.add(ckLimb([ank[0],ank[1]+0.1,ank[2]+0.06],ank,0.055,0.052,boot,0));G.add(ball(0.06,boot,ank[0],ank[1]-0.03,ank[2]-0.09,0.9,0.6,1.8));}
  {const c=document.createElement('canvas');c.width=192;c.height=256;const t=new T.CanvasTexture(c);t.minFilter=T.LinearFilter;ud.knee={ctx:c.getContext('2d'),tex:t,sig:null};const kb=part(new T.PlaneGeometry(0.13,0.18),new T.MeshLambertMaterial({map:t}),0.155,-0.79,-0.17,G);kb.rotation.x=-Math.PI/2+0.25;
    const strap=part(new T.BoxGeometry(0.2,0.004,0.025),stdMat({color:0x202018,roughness:0.9}),0.155,-0.79,-0.1,G);strap.rotation.x=0.25;}
  const glove={back:stdMat({map:ckFabric('gback','#6f6d55','rgba(30,30,20,0.6)',{seams:[0.3,0.7]}),roughness:0.95}),leather:stdMat({map:ckFabric('gpalm','#9a8462','rgba(40,30,20,0.6)',{leather:true}),roughness:0.75})};
  {const r=ckGlove(false,glove,suit,1.05),k=side?1/0.62:1;r.rotation.set(0,0,-Math.PI/2);r.scale.setScalar(k*0.95);const gy=side?0.1:0.36;r.position.set(0.02*k,gy,0.045*k);ud.stick.add(r);
    const w=[0.02*k,gy,0.1*k],el=side?[0.2*k,-0.15*k,0.42*k]:[0.14,gy-0.32,0.36];ud.stick.add(ckLimb(w,el,0.04*k,0.05*k,suit,4));}
  {const l=ckGlove(true,glove,suit,0.8);l.scale.setScalar(0.92);l.position.set(0,0.034,0.016);ud.thr.add(l);ud.thr.add(ckLimb([0,0.034,0.07],[-0.08,-0.2,0.4],0.04,0.05,suit,4));}
  ud.body=[...G.children.slice(n0).filter(o=>o.isMesh&&(o.material===suit||o.material===gsuit||o.material===boot)),...ud.stick.children.slice(-2),...ud.thr.children.slice(-2)];
  if(PILOT.gltf)applyPilot(G);
  /* panel lights at night, and the canopy: sun glare and rain */
  ud.plight=new T.PointLight(0x9fd8b0,0,1.8,1.5);ud.plight.position.set(0,-0.25,-0.35);G.add(ud.plight);
  ud.glare=part(new T.PlaneGeometry(2.4,1.3),new T.MeshBasicMaterial({map:ckTex('glare',256,128,(x,w,h)=>{const g=x.createRadialGradient(w*0.7,h*0.25,2,w*0.7,h*0.25,w*0.6);g.addColorStop(0,'rgba(255,250,235,0.9)');g.addColorStop(0.2,'rgba(255,245,225,0.25)');g.addColorStop(1,'rgba(255,245,225,0)');x.fillStyle=g;x.fillRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,0.12)';x.lineWidth=6;x.beginPath();x.moveTo(w*0.1,h*0.9);x.lineTo(w*0.5,h*0.1);x.stroke();}),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,fog:false}),0,0.05,-0.66,G);ud.glare.renderOrder=6;
  {const t=canvasTex(256,256,(x,w,h)=>{for(let i=0;i<170;i++){const cx=Math.random()*w,cy=Math.random()*h,r=1+Math.random()*3.5;x.fillStyle='rgba(200,210,220,0.28)';x.beginPath();x.ellipse(cx,cy,r,r*1.3,0,0,7);x.fill();x.fillStyle='rgba(255,255,255,0.55)';x.beginPath();x.arc(cx-r*0.3,cy-r*0.4,r*0.35,0,7);x.fill();if(Math.random()<0.25){x.strokeStyle='rgba(210,220,230,0.18)';x.lineWidth=r*0.8;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+(Math.random()-0.5)*6,cy+12+Math.random()*30);x.stroke();}}});t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,2);
    ud.rain=part(new T.PlaneGeometry(2.4,1.3),new T.MeshBasicMaterial({map:t,transparent:true,opacity:0,depthWrite:false,fog:false}),0,0.05,-0.65,G);ud.rain.renderOrder=7;}}
/* per frame, in the cockpit view */
let ckT=0,ckK=0;
function updCockpit(dt,p,W,cu){if(!cu.gauges)return;ckT+=dt;
  if(ckT>0.08){ckT=0;ckK=(ckK+1)%3;for(let i=0;i<cu.gauges.length;i++){const g=cu.gauges[i];if(g.k!=='adi'&&g.k!=='isfd'&&i%3!==ckK)continue;ckDrawGauge(g,p,W);g.tex.needsUpdate=true;}
    if(cu.lamps&&ckDrawLamps(cu.lamps,p,W,cu.kind==='F16I'||cu.kind==='F35I'))cu.lamps.tex.needsUpdate=true;
    if(cu.ded&&ckK===0){const x=cu.ded.ctx,wp=W.wps[W.wp],np=W.navPos(),d=Math.hypot(wp.x-np.x,wp.z-np.z)/1852,eta=d*1852/Math.max(p.V,30);x.fillStyle='#020804';x.fillRect(0,0,256,48);x.fillStyle='#7dff9a';x.font='700 15px monospace';x.textAlign='left';x.textBaseline='middle';
      x.fillText(`STPT ${String(W.wp+1).padStart(2)} ${wp.n.padEnd(6)} ${d.toFixed(1).padStart(5)}NM`,6,14);x.fillText(`UHF 251.00  ${String(Math.floor(eta/60)).padStart(2,'0')}:${String(Math.floor(eta%60)).padStart(2,'0')}  ${W.arm?'ARM':'SAFE'}`,6,34);cu.ded.tex.needsUpdate=true;}
    if(cu.knee){const sig=W.missionId+W.wp;if(sig!==cu.knee.sig){cu.knee.sig=sig;const x=cu.knee.ctx;x.fillStyle='#f1eee4';x.fillRect(0,0,192,256);x.fillStyle='#202020';x.font='700 15px monospace';x.textAlign='left';x.fillText((W.call||'')+' 1',10,22);x.font='12px monospace';
      x.fillText(String(W.missionId).toUpperCase(),110,22);x.strokeStyle='#888';x.beginPath();x.moveTo(8,30);x.lineTo(184,30);x.stroke();W.wps.forEach((w,i)=>{x.fillStyle=i===W.wp?'#b00':'#202020';x.fillText(`${i+1} ${w.n.padEnd(6)} ${String(Math.round((w.alt||0)*3.281/100)*100).padStart(5)}`+(w.tot?` ${Math.floor(w.tot/60)}:${String(w.tot%60).padStart(2,'0')}`:''),10,50+i*20);});
      x.fillStyle='#202020';x.fillText('BINGO '+W.bingo,10,236);x.fillText('UHF 251.00',100,236);cu.knee.tex.needsUpdate=true;}}}
  /* panel lighting: on at dusk and night */
  const nl=tod==='night'?0.9:tod==='dusk'?0.4:0;if(cu.plight.intensity!==nl){cu.plight.intensity=nl;for(const g of cu.gauges)g.m.color.setHex(nl>0.5?0x8fc79a:nl>0?0xcfe3d2:0xffffff);}
  /* glare when looking towards the sun in daylight; rain on the canopy in a storm or a cloud of one */
  const f=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion),sd=Math.max(0,f.dot(sunDir));cu.glare.material.opacity=tod==='night'?0:Math.pow(sd,4)*0.35*(tod==='dusk'?1.3:1);
  const wet=W.wx==='storm'&&(camera.position.y<DECK||(typeof cloudIn==='function'&&cloudIn(camera.position,true).s));cu.rain.material.opacity+=((wet?0.75:0)-cu.rain.material.opacity)*Math.min(1,dt*(wet?2:0.4));
  if(cu.rain.material.opacity>0.01){cu.rain.material.map.offset.y+=dt*(0.05+p.V/400);cu.rain.material.map.offset.x+=dt*0.01;}}

/* ================= moving parts outside: ailerons or flaperons, flaps, rudders, an opening canopy and a boarding ladder ================= */
const CSPEC={F15:{w:[1.3,5.7,0.28,6.52,5.0,0.18],ail:[4.7,6.3],flap:[1.6,4.4],ch:0.55,fins:[[-1.82,0.7,8.9,4.0,9.3],[1.82,0.7,8.9,4.0,9.3]],ry:[0.35,0.85]},
  F16:{w:[0.9,3.9,0.06,4.75,3.4,0.06],ail:[1.0,3.7],flaperon:true,ch:0.5,fins:[[0,0.85,7.2,3.55,7.5]],ry:[0.3,0.9]},
  F35:{w:[1.4,5.6,0.12,5.35,4.4,0.12],ail:[1.7,4.7],flaperon:true,ch:0.55,fins:[]},
  M346:{w:[0.8,2.7,0.12,4.8,3.0,0.08],ail:[3.0,4.6],flap:[1.0,2.9],ch:0.42,fins:[[0,0.45,5.5,2.75,5.75]],ry:[0.3,0.85]}};
function addMoving(G,key){const S=CSPEC[key],ud=G.userData;if(!S)return G;let body=null;G.traverse(o=>{if(!body&&o.isMesh&&o.material&&o.material.map&&o.material.map===(SKIN.desert||SKIN.gray||SKIN.ghost||SKIN.mig)&&o.material.map)body=o.material;});
  if(!body)G.traverse(o=>{if(!body&&o.isMesh&&o.material&&o.material.map)body=o.material;});const w=S.w,te=x=>w[1]+(w[4]-w[1])*(x-w[0])/(w[3]-w[0]),yy=x=>w[2]+(w[5]-w[2])*(x-w[0])/(w[3]-w[0]);
  const surf=(x0,x1,s,list)=>{const z0=te(x0),z1=te(x1),o=new T.Group(),h=new T.Group(),L=x1-x0;o.position.set(s*(x0+x1)/2,yy((x0+x1)/2)+0.005,(z0+z1)/2-S.ch);o.rotation.y=-s*Math.atan2(z1-z0,L);G.add(o);o.add(h);
    const m=part(new T.BoxGeometry(L,0.035,S.ch),body,0,0,S.ch/2,h);m.castShadow=true;part(new T.BoxGeometry(L,0.012,0.012),stdMat({color:0x1a1b1c}),0,0.019,0.004,h);list.push({h,side:s});};
  ud.ail=[];ud.flap=[];ud.rud=[];for(const s of[-1,1]){surf(S.ail[0],S.ail[1],s,ud.ail);if(S.flap)surf(S.flap[0],S.flap[1],s,ud.flap);}ud.flaperon=!!S.flaperon;
  for(const[fx,r0,t0,r1,t1]of S.fins){const ya=r0+(r1-r0)*S.ry[0],yb=r0+(r1-r0)*S.ry[1],za=t0+(t1-t0)*S.ry[0],zb=t0+(t1-t0)*S.ry[1],ch=0.6,o=new T.Group(),h=new T.Group();o.position.set(fx,(ya+yb)/2,(za+zb)/2-ch);o.rotation.x=Math.atan2(zb-za,yb-ya);G.add(o);o.add(h);
    const m=part(new T.BoxGeometry(0.05,yb-ya,ch),body,0,0,ch/2,h);m.castShadow=true;ud.rud.push({h});}
  /* canopy on a hinge at its rear; a ladder that hangs on the left when the jet is parked open */
  let can=null;G.traverse(o=>{if(!can&&o.isMesh&&o.geometry.type==='SphereGeometry'&&(o.material===HDM.glass||o.material===HDM.gold)&&o.scale.z>1.5)can=o;});
  if(can){const cz0=can.position.z,hz=can.position.z+can.scale.z*0.92,hy=can.position.y,hg=new T.Group();hg.position.set(0,hy,hz);G.add(hg);for(const o of[can,ud.fr].filter(Boolean)){o.position.y-=hy;o.position.z-=hz;G.remove(o);hg.add(o);}ud.hinge=hg;
    const lad=new T.Group(),mt=stdMat({color:0xc8c8c0,roughness:0.4,metalness:0.6}),top=hy-0.25,bot=-2.4,lx=-0.95;for(const dz of[-0.18,0.18])part(new T.BoxGeometry(0.03,top-bot,0.03),mt,lx,(top+bot)/2,cz0+dz,lad);
    for(let i=1;i<7;i++)part(new T.BoxGeometry(0.03,0.025,0.36),mt,lx,bot+(top-bot)*i/7,cz0,lad);lad.rotation.z=-0.12;lad.visible=false;G.add(lad);ud.ladder=lad;}
  return G;}
function animMoving(ud,p,c,flaps,canOpen,parked){const k=0.25;if(ud.ail)for(const q of ud.ail){const t=q.side*clamp(c.roll,-1,1)*0.35+(ud.flaperon&&flaps?0.3:0);q.h.rotation.x+=(t-q.h.rotation.x)*k;}
  if(ud.flap)for(const q of ud.flap)q.h.rotation.x+=((flaps?0.55:0)-q.h.rotation.x)*k*0.4;
  if(ud.rud)for(const q of ud.rud)q.h.rotation.y+=(clamp(c.yaw,-1,1)*-0.4-q.h.rotation.y)*k;
  if(ud.hinge)ud.hinge.rotation.x+=((canOpen?-0.85:0)-ud.hinge.rotation.x)*0.06;if(ud.ladder)ud.ladder.visible=!!parked&&canOpen;}


/* ================= a pilot model from a file =================
   If the site has models/pilot.glb (a glTF model of a seated pilot), it replaces the pilot built in code: the legs, arms and
   gloves. The camera sits inside the model's head, so the head is not seen. An animation in the file (one named like sit, seat,
   pilot or idle, else the first) is played. */
const PILOT={gltf:null,mixer:null,url:'models/pilot.glb'};
function loadPilot(){if(location.protocol==='file:'||opts.q==='eco')return;
  const go=()=>{try{new T.GLTFLoader().load(PILOT.url,g=>{PILOT.gltf=g;if(cockpit)applyPilot(cockpit);},undefined,()=>{});}catch(e){}};
  if(T.GLTFLoader)go();else{const s=document.createElement('script');s.src='vendor/GLTFLoader.js';s.onload=go;s.onerror=()=>{};document.head.appendChild(s);}}
/* bend a standing (A-pose) pilot into the seated pose, by moving vertices round the hips, knees, shoulders and elbows.
   The model is first scaled to 1.78 m, feet at y=0, facing +z, with its right hand on -x. */
function poseSeated(root,o){o=o||{};const T3=T,H=1.78;root.updateMatrixWorld(true);const bb=new T3.Box3().setFromObject(root),h=bb.max.y-bb.min.y,k=H/h,cx=(bb.min.x+bb.max.x)/2,cz=(bb.min.z+bb.max.z)/2;
  const toM=new T3.Matrix4().makeScale(k,k,k).multiply(new T3.Matrix4().makeTranslation(-cx,-bb.min.y,-cz));
  const J={hip:0.93,knee:0.5,sh:1.42,shx:0.17,el:0.3};const hipA=o.hip??-1.48,kneeA=o.knee??1.38;
  const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const rx=(v,p,a)=>{const y=v.y-p.y,z=v.z-p.z,c=Math.cos(a),s=Math.sin(a);v.y=p.y+y*c-z*s;v.z=p.z+y*s+z*c;};
  const rz=(v,p,a)=>{const x=v.x-p.x,y=v.y-p.y,c=Math.cos(a),s=Math.sin(a);v.x=p.x+x*c-y*s;v.y=p.y+x*s+y*c;};
  const meshes=[];root.traverse(m=>{if(m.isMesh)meshes.push(m);});
  for(const m of meshes){const g=m.geometry=m.geometry.clone();g.applyMatrix4(new T3.Matrix4().multiplyMatrices(toM,m.matrixWorld));const P=g.attributes.position,v=new T3.Vector3(),q=new T3.Vector3();
    for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);const y0=v.y,ax=Math.abs(v.x),sd=Math.sign(v.x)||1;
      if(y0<J.hip+0.06&&ax<0.3){/* legs: knee first, then the hip */const bk=ss(J.knee+0.05,J.knee-0.05,y0),bh=ss(J.hip+0.06,J.hip-0.06,y0);
        if(bk>0)rx(v,{y:J.knee,z:0.02},kneeA*bk);if(bh>0)rx(v,{y:J.hip,z:0},hipA*bh);}
      else if(ax>J.shx-0.01&&y0>0.75&&y0<J.sh+0.1){/* arms: down from the A-pose, elbow bent, upper arm forward, a little inward */
        const sp={x:sd*J.shx,y:J.sh,z:0},t=Math.hypot(v.x-sp.x,v.y-sp.y),bs=ss(0.02,0.11,t)*ss(J.sh+0.1,J.sh-0.03,y0),right=sd<0;if(bs<=0)continue;
        rz(v,sp,-sd*(o.aA??0.9)*bs);const be=ss(J.el-0.04,J.el+0.05,t);if(be>0)rx(v,{y:J.sh-J.el,z:0},(right?o.re??-1.25:o.le??-1.1)*be);
        rx(v,{y:J.sh,z:0},(right?o.rf??-0.45:o.lf??-0.35)*bs);rz(v,sp,sd*(right?o.ri??0.22:o.li??-0.05)*bs);}
      P.setXYZ(i,v.x,v.y,v.z);}
    P.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();m.matrix.identity();m.matrixAutoUpdate=false;m.matrixWorldNeedsUpdate=true;}
  /* the meshes now hold model-space positions: hang them all directly on a fresh group */
  const out=new T3.Group();for(const m of meshes){if(m.parent)m.parent.remove(m);m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.set(1,1,1);m.updateMatrix();out.add(m);}return out;}

/* the model, posed once for each kind of stick and kept */
function pilotPosed(side){const k=side?'side':'center';if(PILOT[k])return PILOT[k];const o=side?{rf:-0.35,re:-1.0,ri:1.0,lf:-0.45,le:-0.8,li:1.0}:{rf:-0.45,re:-0.85,ri:0.1,lf:-0.45,le:-0.8,li:1.0};
  const m=poseSeated(PILOT.gltf.scene.clone(true),Object.assign({hip:-1.36,knee:0.95},o));let hel=null,gl=null;m.children.forEach(c=>{if(/HELMET/.test(c.name))hel=c;if(/GLOVES/.test(c.name))gl=c;if(/H-(HELMET|VISOR|STRAPS|FACEMASK|PIPE)/.test(c.name))c.visible=false;c.castShadow=false;c.frustumCulled=false;
    /* the trousers come out near black in the cockpit light: same olive flight suit as the jacket */
    if(c.material&&/PANTS/i.test(c.material.name||'')){c.material=c.material.clone();c.material.map=null;c.material.color.setRGB(0.24,0.26,0.2);c.material.needsUpdate=true;}});
  /* the eyes: just above the top of the oxygen mask, a few cm behind its front (the helmet's box also holds the hose, so it is no use here) */
  let fm=null;m.children.forEach(c=>{if(/FACEMASK/.test(c.name))fm=c;});const fb=new T.Box3().setFromObject(fm||hel),eye=new T.Vector3((fb.min.x+fb.max.x)/2,fb.max.y-0.01,fb.max.z-0.08);
  /* where the hands are, in the cockpit (camera at the eye, forward -z, right +x) */
  const P=gl.geometry.attributes.position,R=[0,0,0,0],L=[0,0,0,0];for(let i=0;i<P.count;i++){const y=P.getY(i);if(y<0.75)continue;const x=P.getX(i),A=x<0?R:L;A[0]+=x;A[1]+=y;A[2]+=P.getZ(i);A[3]++;}
  const hand=A=>A[3]?new T.Vector3(-(A[0]/A[3]-eye.x),A[1]/A[3]-eye.y,-(A[2]/A[3]-eye.z)):null;
  const g=new T.Group();m.rotation.y=Math.PI;m.position.set(eye.x,-eye.y,eye.z);g.add(m);return PILOT[k]={g,R:hand(R),L:hand(L)};}
function applyPilot(G){const ud=G.userData;if(!PILOT.gltf||ud.pilotModel)return;const side=ud.kind==='F16I'||ud.kind==='F35I',P=pilotPosed(side);if(P.g.parent)P.g.parent.remove(P.g);G.add(P.g);ud.pilotModel=P.g;
  for(const o of ud.body||[])o.visible=false;
  /* the stick and the throttle are brought to where the hands are (grip centre: centre stick 0.33 up, side stick 0.1 of its small group) */
  if(P.R){if(side){ud.stick.position.set(P.R.x-0.01,P.R.y-0.1*0.62,P.R.z);}else ud.stick.position.set(P.R.x-0.03,P.R.y-0.33,P.R.z);}
  if(P.L&&ud.thr){ud.thr.position.x=P.L.x;ud.thr.position.y=P.L.y-0.03;ud.thrZ=P.L.z;}}
