/* ================= technician's safety round =================
   A walk round a parked jet (F-15I or F-16I, the game's own models) before maintenance. The points and what to check at each are the
   user's own: in EDIT the camera circles the jet and a tap on the jet puts a point there, with a name and an instruction; the points
   can be reordered, edited and removed, and are kept in this browser only (and in a file, exported and imported by hand).
   PLAY: a technician walks from point to point round the jet (never through it), stops, turns to the point and points at it while
   the card shows what to check; automatic or step by step, with a camera that follows, looks through his eyes, or from above.
   PRACTICE: on foot yourself, in order; each point is confirmed when you are next to it. */
const MT={on:false,mode:'edit',plane:'F15I',pts:[],sel:-1,az:0.9,el:0.45,dist:24,drag:null,pinch:null,tech:null,path:[],step:0,phase:'idle',t:0,auto:true,speed:1,cam:'follow',
  marks:[],ring:null,walk:null,done:[]};
const MTTYPES=[['pin','פין בטיחות',0xff4030],['empty','וידוא חוסר',0xffb030],['cm','נורים ומוצים',0x40c0ff],['check','בדיקה',0x60ff90]];
const MTL={F15I:19.4,F16I:15,F15C:19.4,F35I:15.7,M346:11.5},MTW={F15I:1.7,F16I:1.25,F15C:1.7,F35I:1.5,M346:1.1};
function mtLoad(){try{const o=JSON.parse(localStorage.getItem('haniaflight-maint')||'{}');return o&&typeof o==='object'?o:{};}catch(e){return{};}}
function mtSave(){const o=mtLoad();o[MT.plane]=MT.pts;try{localStorage.setItem('haniaflight-maint',JSON.stringify(o));}catch(e){}$('mtSaved').textContent='נשמר במכשיר הזה';setTimeout(()=>{$('mtSaved').textContent='';},1800);}
/* a technician: coveralls, reflective vest, cap and ear defenders; legs and arms swing from the hips and shoulders */
function buildTech(){const G=new T.Group(),ud=G.userData,cov=lam(0x4a5a6a),vest=new T.MeshLambertMaterial({color:0xe8e020,emissive:0x222200}),sk=lam(0xc9a27e),dk=lam(0x22262a);
  for(const s of[-1,1]){const l=new T.Group();l.position.set(s*0.11,0.9,0);G.add(l);part(new T.BoxGeometry(0.17,0.86,0.2),cov,0,-0.43,0,l);part(new T.BoxGeometry(0.18,0.1,0.3),dk,0,-0.88,0.05,l);ud[s<0?'legR':'legL']=l;}
  part(new T.BoxGeometry(0.46,0.62,0.26),cov,0,1.2,0,G);part(new T.BoxGeometry(0.48,0.4,0.28),vest,0,1.28,0,G);for(const y of[1.18,1.36])part(new T.BoxGeometry(0.49,0.04,0.29),new T.MeshBasicMaterial({color:0xd8d8d0}),0,y,0,G);
  part(new T.SphereGeometry(0.12,12,10),sk,0,1.68,0,G);const cap=part(new T.SphereGeometry(0.13,12,8,0,Math.PI*2,0,Math.PI/2),lam(0x2a3a5a),0,1.71,0,G);part(new T.BoxGeometry(0.2,0.02,0.12),lam(0x2a3a5a),0,1.71,0.14,G);
  for(const s of[-1,1])part(new T.CylinderGeometry(0.06,0.06,0.05,10),lam(0xd02020),s*0.13,1.67,0,G).rotation.z=Math.PI/2;
  for(const s of[-1,1]){const a=new T.Group();a.position.set(s*0.29,1.46,0);G.add(a);part(new T.BoxGeometry(0.11,0.6,0.11),cov,0,-0.3,0,a);part(new T.SphereGeometry(0.055,8,6),sk,0,-0.63,0,a);ud[s<0?'armR':'armL']=a;}
  /* a torch in the right hand */
  part(new T.CylinderGeometry(0.03,0.03,0.2,8),dk,0,-0.68,0.06,ud.armR).rotation.x=Math.PI/2;return G;}
function mtLabel(n,col){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#'+col.toString(16).padStart(6,'0');x.beginPath();x.arc(32,32,28,0,7);x.fill();x.strokeStyle='#101418';x.lineWidth=4;x.stroke();
  x.fillStyle='#101418';x.font='bold 30px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),32,34);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(0.4,0.4,1);s.renderOrder=12;return s;}
function mtMarks(){for(const m of MT.marks)scene.remove(m);MT.marks=[];pMesh.updateMatrixWorld(true);
  MT.pts.forEach((q,i)=>{const ty=MTTYPES.find(t=>t[0]===q.type)||MTTYPES[3],done=MT.mode!=='edit'&&MT.done[i],cur=MT.mode!=='edit'&&i===MT.step,col=MT.mode==='edit'?ty[2]:done?0x40ff70:cur?ty[2]:0x8a9098;
    const g=new T.Group(),s=mtLabel(i+1,col);s.position.set(0,0.45,0);g.add(s);g.add(new T.Mesh(new T.SphereGeometry(0.07,10,8),new T.MeshBasicMaterial({color:col,depthTest:false})));g.children[1].renderOrder=11;
    const ln=new T.Mesh(new T.CylinderGeometry(0.01,0.01,0.4,4),new T.MeshBasicMaterial({color:col,depthTest:false}));ln.position.y=0.22;ln.renderOrder=11;g.add(ln);
    g.position.copy(pMesh.localToWorld(new T.Vector3(q.x,q.y,q.z)));if(i===MT.sel&&MT.mode==='edit')g.scale.setScalar(1.35);scene.add(g);MT.marks.push(g);});}
/* where the technician stands for a point: below it, out of the fuselage, a little back from it */
function mtStand(q,prev){const L=(MTL[MT.plane]||16)/2,Wd=(MTW[MT.plane]||1.5)+0.45;let x=q.x,z=q.z;if(Math.abs(x)<Wd&&z>-L-0.5&&z<L+0.5){const s=Math.abs(x)>0.2?Math.sign(x):prev?Math.sign(prev.x)||-1:-1;x=s*(Wd+0.25);}
  else if(Math.abs(x)>=Wd){x+=Math.sign(x)*0.5;}if(z<-L-0.5)z-=0.6;else if(z>L+0.5)z+=0.6;return{x,z};}
/* the walk from one stand to the next, round the nose or the tail when it would cross the fuselage */
function mtRoute(a,b){const L=(MTL[MT.plane]||16)/2+1.6,Wd=(MTW[MT.plane]||1.5)+0.7,P=[a];const crosses=Math.sign(a.x)!==Math.sign(b.x)&&Math.max(a.z,b.z)>-L&&Math.min(a.z,b.z)<L&&Math.abs(a.x)>0.1&&Math.abs(b.x)>0.1;
  if(crosses){const front=Math.abs(a.z+L)+Math.abs(b.z+L),back=Math.abs(a.z-L)+Math.abs(b.z-L),zc=front<=back?-L-1.2:L+1.8;P.push({x:Math.sign(a.x)*Wd,z:zc},{x:Math.sign(b.x)*Wd,z:zc});}
  P.push(b);return P;}
function mtW(p){return pMesh.localToWorld(new T.Vector3(p.x,0,p.z));}
function mtBegin(plane){MT.plane=plane||MT.plane;opts.plane=MT.plane;opts.mission='strike';applyOpts();newGame('cold');state='maint';MT.on=true;$('app').dataset.maint='1';show('menu',false);show('maint',true);
  for(const m of window.HF_SHELL||[])m.visible=false;const P=W.player;pMesh.position.set(P.pos.x,P.pos.y,P.pos.z);setQ(pMesh,P.q);pMesh.updateMatrixWorld(true);crew.g.visible=false;
  MT.pts=(mtLoad()[MT.plane]||[]).map(q=>({...q}));MT.sel=-1;if(!MT.tech){MT.tech=buildTech();scene.add(MT.tech);}MT.tech.visible=false;
  if(!MT.ring){MT.ring=new T.Mesh(new T.TorusGeometry(0.35,0.03,8,28),new T.MeshBasicMaterial({color:0xffffff,depthTest:false,transparent:true}));MT.ring.renderOrder=12;scene.add(MT.ring);}MT.ring.visible=false;
  for(const b of document.querySelectorAll('[data-mtp]'))b.setAttribute('aria-pressed',b.dataset.mtp===MT.plane?'true':'false');mtMode('edit');}
function mtExit(){MT.on=false;for(const m of window.HF_SHELL||[])m.visible=true;for(const m of MT.marks)scene.remove(m);MT.marks=[];if(MT.tech)MT.tech.visible=false;if(MT.ring)MT.ring.visible=false;$('app').dataset.maint='';$('app').dataset.mtw='';show('maint',false);show('mtCard',false);show('mtDlg',false);toMenu();}
function mtMode(m){MT.mode=m;MT.focus=null;MT.camP=null;$('app').dataset.mtw=m==='practice'?'1':'';MT.done=MT.pts.map(()=>false);MT.step=0;MT.phase='idle';MT.walk=null;show('mtCard',false);show('mtDlg',false);
  for(const b of document.querySelectorAll('[data-mtm]'))b.setAttribute('aria-pressed',b.dataset.mtm===m?'true':'false');
  $('mtEdit').hidden=m!=='edit';$('mtPlay').hidden=m==='edit';$('mtPlayBtns').hidden=m!=='play';MT.tech.visible=m==='play';
  if(m!=='edit'&&!MT.pts.length){toast('אין נקודות. הוסף נקודות בעריכה: לחיצה על המטוס.');mtMode('edit');return;}
  if(m==='play'){const s=mtStand(MT.pts[0]),st={x:s.x-2,z:-(MTL[MT.plane]||16)/2-5};const w=mtW(st);MT.tech.position.set(w.x,terrainH(w.x,w.z),w.z);MT.cur={...st};MT.path=mtRoute(st,mtStand(MT.pts[0],st));MT.pi=1;MT.phase='walk';MT.paused=false;$('mtPause').textContent='עצור';}
  if(m==='practice'){const L=(MTL[MT.plane]||16)/2,w=mtW({x:-2.5,z:-L-6});MT.walk={pos:new T.Vector3(w.x,terrainH(w.x,w.z)+1.7,w.z),yaw:0,pitch:-0.15};const c=pMesh.position;MT.walk.yaw=Math.atan2(c.x-w.x,-(c.z-w.z));}
  mtList();mtMarks();mtCardUpd();}
function mtList(){const el=$('mtList');el.innerHTML=MT.pts.length?MT.pts.map((q,i)=>{const ty=MTTYPES.find(t=>t[0]===q.type)||MTTYPES[3];return`<li data-i="${i}" class="${i===MT.sel?'sel':''}"><b style="color:#${ty[2].toString(16).padStart(6,'0')}">${i+1}</b> <span>${esc(q.name||'נקודה')}</span><small>${esc(ty[1])}</small>
    <button data-a="up" aria-label="הזז למעלה">▲</button><button data-a="dn" aria-label="הזז למטה">▼</button><button data-a="ed" aria-label="ערוך">✎</button><button data-a="rm" aria-label="מחק">✕</button></li>`;}).join(''):'<li class="note">עוד אין נקודות. לחץ על המטוס במקום שצריך לבדוק.</li>';
  for(const li of el.querySelectorAll('li[data-i]')){const i=+li.dataset.i;li.onclick=e=>{const a=e.target.dataset&&e.target.dataset.a;if(a==='up'&&i>0){[MT.pts[i-1],MT.pts[i]]=[MT.pts[i],MT.pts[i-1]];MT.sel=i-1;mtSave();}
      else if(a==='dn'&&i<MT.pts.length-1){[MT.pts[i+1],MT.pts[i]]=[MT.pts[i],MT.pts[i+1]];MT.sel=i+1;mtSave();}else if(a==='ed'){MT.sel=i;mtDlg(i);}else if(a==='rm'){if(confirm(`למחוק את נקודה ${i+1}?`)){MT.pts.splice(i,1);MT.sel=-1;mtSave();}}
      else{MT.sel=i;const w=pMesh.localToWorld(new T.Vector3(MT.pts[i].x,MT.pts[i].y,MT.pts[i].z)),c=pMesh.position;MT.az=Math.atan2(w.x-c.x,w.z-c.z);MT.focus=w;}mtList();mtMarks();};}}
/* the point form: what it is, what to check there */
function mtDlg(i,pos){const q=i!=null?MT.pts[i]:{name:'',text:'',type:'pin',...pos};MT.dlgI=i;MT.dlgP=q;$('mtName').value=q.name||'';$('mtText').value=q.text||'';$('mtType').innerHTML=MTTYPES.map(t=>`<option value="${t[0]}"${t[0]===q.type?' selected':''}>${t[1]}</option>`).join('');
  $('mtDlgT').textContent=i!=null?`נקודה ${i+1}`:'נקודה חדשה';$('mtDel').hidden=i==null;show('mtDlg',true);setTimeout(()=>$('mtName').focus(),50);}
$('mtOk').onclick=()=>{const q=MT.dlgP;q.name=$('mtName').value.trim().slice(0,60)||'נקודה';q.text=$('mtText').value.trim().slice(0,400);q.type=$('mtType').value;if(MT.dlgI==null){MT.pts.push(q);MT.sel=MT.pts.length-1;}mtSave();show('mtDlg',false);mtList();mtMarks();};
$('mtCancel').onclick=()=>show('mtDlg',false);$('mtDel').onclick=()=>{if(MT.dlgI!=null){MT.pts.splice(MT.dlgI,1);MT.sel=-1;mtSave();}show('mtDlg',false);mtList();mtMarks();};
/* the card in play and practice */
function mtCardUpd(){if(MT.mode==='edit'){show('mtCard',false);return;}const n=MT.pts.length,i=Math.min(MT.step,n-1),q=MT.pts[i],ty=MTTYPES.find(t=>t[0]===q.type)||MTTYPES[3];show('mtCard',true);
  if(MT.step>=n){$('mtCardN').textContent='הסיבוב הושלם';$('mtCardT').textContent=MT.mode==='practice'?'עברת על כל הנקודות.':'הטכנאי עבר על כל הנקודות. המטוס בטוח לאחזקה לפי הרשימה.';$('mtCardX').textContent='';$('mtCardY').textContent='';return;}
  $('mtCardN').textContent=`נקודה ${i+1} מתוך ${n}`;$('mtCardY').textContent=ty[1];$('mtCardY').style.color='#'+ty[2].toString(16).padStart(6,'0');$('mtCardT').textContent=q.name;
  $('mtCardX').textContent=q.text||'';$('mtNext').hidden=MT.mode!=='practice'&&MT.auto;}
function mtArrive(){MT.phase='look';MT.t=0;mtCardUpd();click(1);mtMarks();}
function mtAdvance(){if(MT.step>=MT.pts.length)return;MT.done[MT.step]=true;MT.step++;if(MT.step>=MT.pts.length){MT.phase='end';mtMarks();mtCardUpd();beep(1300,0.08,0.06);setTimeout(()=>beep(1700,0.12,0.06),150);return;}
  if(MT.mode==='play'){const a=MT.cur,b=mtStand(MT.pts[MT.step],a);MT.path=mtRoute(a,b);MT.pi=1;MT.phase='walk';}mtMarks();mtCardUpd();}
$('mtNext').onclick=()=>{if(MT.mode==='practice'){const q=MT.pts[MT.step];if(!q)return;const w=pMesh.localToWorld(new T.Vector3(q.x,q.y,q.z));if(Math.hypot(MT.walk.pos.x-w.x,MT.walk.pos.z-w.z)>3.2){toast('התקרב לנקודה המסומנת');return;}}
  else if(MT.phase==='walk')return;mtAdvance();};
$('mtPrev').onclick=()=>{if(MT.mode!=='play'||MT.step===0)return;MT.step--;MT.done[MT.step]=false;const b=mtStand(MT.pts[MT.step],MT.cur);MT.path=mtRoute(MT.cur,b);MT.pi=1;MT.phase='walk';mtMarks();mtCardUpd();};
$('mtPause').onclick=()=>{MT.paused=!MT.paused;$('mtPause').textContent=MT.paused?'המשך':'עצור';};
$('mtAuto').onclick=()=>{MT.auto=!MT.auto;$('mtAuto').textContent=MT.auto?'מעבר אוטומטי':'צעד אחר צעד';mtCardUpd();};
$('mtSpd').onclick=()=>{MT.speed=MT.speed>=2?0.5:MT.speed*2;$('mtSpd').textContent='×'+MT.speed;};
$('mtCam').onclick=()=>{MT.cam=({follow:'eyes',eyes:'top',top:'follow'})[MT.cam];$('mtCam').textContent='מצלמה: '+({follow:'מאחור',eyes:'עיני הטכנאי',top:'מלמעלה'})[MT.cam];};
for(const b of document.querySelectorAll('[data-mtm]'))b.onclick=()=>mtMode(b.dataset.mtm);
for(const b of document.querySelectorAll('[data-mtp]'))b.onclick=()=>{if(b.dataset.mtp!==MT.plane)mtBegin(b.dataset.mtp);};
$('mtExit').onclick=mtExit;$('maintGo').onclick=()=>{Snd.init();mtBegin(opts.plane==='F16I'?'F16I':'F15I');};
/* export and import: a JSON file with the points of both jets */
$('mtExport').onclick=()=>{mtSave();const o=mtLoad(),b=new Blob([JSON.stringify({app:'HaniaFlight maintenance round',v:1,points:o},null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='safety-round.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),20000);};
$('mtImport').onclick=()=>$('mtFile').click();
$('mtFile').onchange=()=>{const f=$('mtFile').files[0];if(!f)return;f.text().then(t=>{const o=JSON.parse(t),P=o&&o.points;if(!P||typeof P!=='object')throw 0;const cur=mtLoad();
    for(const k of Object.keys(P))if(Array.isArray(P[k]))cur[k]=P[k].filter(q=>q&&isFinite(q.x)&&isFinite(q.y)&&isFinite(q.z)).map(q=>({x:+q.x,y:+q.y,z:+q.z,name:String(q.name||'').slice(0,60),text:String(q.text||'').slice(0,400),type:MTTYPES.some(t=>t[0]===q.type)?q.type:'check'}));
    localStorage.setItem('haniaflight-maint',JSON.stringify(cur));MT.pts=(cur[MT.plane]||[]).map(q=>({...q}));mtMode('edit');toast('הנקודות נטענו מהקובץ');}).catch(()=>toast('הקובץ לא תקין'));$('mtFile').value='';};
/* camera and input */
glc.addEventListener('pointerdown',e=>{if(state!=='maint')return;MT.drag={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,id:e.pointerId};});
glc.addEventListener('pointermove',e=>{if(state!=='maint'||!MT.drag)return;const dx=e.clientX-MT.drag.x,dy=e.clientY-MT.drag.y;MT.drag.x=e.clientX;MT.drag.y=e.clientY;
  if(MT.mode==='practice'&&MT.walk){MT.walk.yaw+=dx*0.006;MT.walk.pitch=clamp(MT.walk.pitch-dy*0.005,-1.2,1);}else{MT.az-=dx*0.007;MT.el=clamp(MT.el+dy*0.005,0.05,1.45);}});
glc.addEventListener('pointerup',e=>{if(state!=='maint'||!MT.drag)return;const d=MT.drag;MT.drag=null;if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>6||MT.mode!=='edit')return;
  /* a tap on the jet: a new point there */
  const r=glc.getBoundingClientRect(),ndc=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),rc=new T.Raycaster();rc.setFromCamera(ndc,camera);
  const hits=rc.intersectObject(pMesh,true).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});const h=hits[0];if(!h){toast('לחץ על המטוס עצמו');return;}
  const l=pMesh.worldToLocal(h.point.clone());mtDlg(null,{x:+l.x.toFixed(2),y:+l.y.toFixed(2),z:+l.z.toFixed(2)});});
glc.addEventListener('wheel',e=>{if(state!=='maint'||MT.mode==='practice')return;e.preventDefault();MT.dist=clamp(MT.dist*(e.deltaY>0?1.12:0.9),5,60);},{passive:false});
$('mtIn').onclick=()=>{MT.dist=clamp(MT.dist*0.8,5,60);};$('mtOut').onclick=()=>{MT.dist=clamp(MT.dist*1.25,5,60);};
function maintStep(dt){if(!MT.on)return;if(crew.g.visible)crew.g.visible=false;const tech=MT.tech,ud=tech.userData;
  if(MT.ring&&MT.mode!=='edit'&&MT.step<MT.pts.length){const q=MT.pts[MT.step];MT.ring.visible=true;MT.ring.position.copy(pMesh.localToWorld(new T.Vector3(q.x,q.y,q.z)));MT.ring.lookAt(camera.position);const k=1+0.25*Math.sin(clock*5);MT.ring.scale.setScalar(k);}else if(MT.ring)MT.ring.visible=false;
  if(MT.mode==='play'&&!MT.paused){const sp=1.35*MT.speed;
    if(MT.phase==='walk'){const tgt=MT.path[MT.pi];if(!tgt){mtArrive();return;}const dx=tgt.x-MT.cur.x,dz=tgt.z-MT.cur.z,d=Math.hypot(dx,dz);
      if(d<0.05){MT.pi++;if(MT.pi>=MT.path.length)mtArrive();}else{const st=Math.min(d,sp*dt);MT.cur.x+=dx/d*st;MT.cur.z+=dz/d*st;MT.walkT=(MT.walkT||0)+st*3.2;
        const w=mtW(MT.cur),wd=mtW({x:MT.cur.x+dx,z:MT.cur.z+dz});tech.position.set(w.x,terrainH(w.x,w.z),w.z);tech.rotation.y=Math.atan2(wd.x-w.x,wd.z-w.z);
        const s=Math.sin(MT.walkT)*0.45;ud.legL.rotation.x=s;ud.legR.rotation.x=-s;ud.armL.rotation.x=-s*0.8;ud.armR.rotation.x=s*0.8;}}
    else if(MT.phase==='look'){MT.t+=dt*MT.speed;const q=MT.pts[MT.step],w=pMesh.localToWorld(new T.Vector3(q.x,q.y,q.z)),tp=tech.position;tech.rotation.y=Math.atan2(w.x-tp.x,w.z-tp.z);
      ud.legL.rotation.x*=0.8;ud.legR.rotation.x*=0.8;ud.armL.rotation.x*=0.8;const up=clamp(Math.atan2(w.y-(tp.y+1.4),Math.hypot(w.x-tp.x,w.z-tp.z)),-0.9,1.3);ud.armR.rotation.x+=((-Math.PI/2-up)-ud.armR.rotation.x)*0.15;
      if(MT.auto&&MT.t>5)mtAdvance();}}
  if(MT.mode==='practice'&&MT.walk){const k=keys,f=((k.KeyW||k.ArrowUp)?1:0)-((k.KeyS||k.ArrowDown)?1:0)-(touch.held?touch.y:0),sd=((k.KeyD||k.ArrowRight)?1:0)-((k.KeyA||k.ArrowLeft)?1:0)+(touch.held?touch.x:0),sp=(k.ShiftLeft?3:1.5)*dt,W2=MT.walk;
    W2.pos.x+=(Math.sin(W2.yaw)*clamp(f,-1,1)+Math.cos(W2.yaw)*clamp(sd,-1,1))*sp;W2.pos.z+=(-Math.cos(W2.yaw)*clamp(f,-1,1)+Math.sin(W2.yaw)*clamp(sd,-1,1))*sp;
    const L=(MTL[MT.plane]||16)/2,lp=pMesh.worldToLocal(W2.pos.clone()),Wd=(MTW[MT.plane]||1.5)+0.3;if(Math.abs(lp.z)<L&&Math.abs(lp.x)<Wd){lp.x=Math.sign(lp.x||1)*Wd;W2.pos.copy(pMesh.localToWorld(lp));}W2.pos.y=terrainH(W2.pos.x,W2.pos.z)+1.7;
    const q=MT.pts[MT.step];if(q){const w=pMesh.localToWorld(new T.Vector3(q.x,q.y,q.z)),near=Math.hypot(W2.pos.x-w.x,W2.pos.z-w.z)<3.2;$('mtNext').dataset.on=near?'1':'';$('mtNext').textContent=near?'✓ בוצע':'התקרב לנקודה';}}}
function maintCam(){if(!MT.on)return;if(crew.g.visible)crew.g.visible=false;const c=pMesh.position;camera.up.set(0,1,0);
  if(MT.mode==='practice'&&MT.walk){const w=MT.walk;camera.position.copy(w.pos);camera.lookAt(w.pos.x+Math.sin(w.yaw)*Math.cos(w.pitch),w.pos.y+Math.sin(w.pitch),w.pos.z-Math.cos(w.yaw)*Math.cos(w.pitch));return;}
  if(MT.mode==='play'){const t=MT.tech.position,q=MT.pts[Math.min(MT.step,MT.pts.length-1)],pw=q?pMesh.localToWorld(new T.Vector3(q.x,q.y,q.z)):c;
    if(MT.cam==='eyes'){camera.position.set(t.x,t.y+1.65,t.z);const lk=MT.phase==='look'?pw:new T.Vector3(t.x+Math.sin(MT.tech.rotation.y),t.y+1.5,t.z+Math.cos(MT.tech.rotation.y));camera.lookAt(lk);return;}
    if(MT.cam==='top'){camera.position.set(c.x+0.01,c.y+28,c.z+6);camera.lookAt(c.x,c.y,c.z);return;}
    const back=new T.Vector3(t.x-pw.x,0,t.z-pw.z);if(back.length()<0.1)back.set(1,0,0);back.normalize().multiplyScalar(4.2);const want=new T.Vector3(t.x+back.x,t.y+2.6,t.z+back.z);
    MT.camP=MT.camP||want.clone();MT.camP.lerp(want,0.06);camera.position.copy(MT.camP);const look=new T.Vector3((t.x+pw.x)/2,(t.y+1.2+pw.y)/2,(t.z+pw.z)/2);camera.lookAt(look);return;}
  const f=MT.focus||c,ce=Math.cos(MT.el);camera.position.set(f.x+Math.sin(MT.az)*ce*MT.dist,Math.max(f.y+MT.dist*Math.sin(MT.el),terrainH(f.x,f.z)+0.6),f.z+Math.cos(MT.az)*ce*MT.dist);camera.lookAt(f.x,f.y,f.z);}
if(/[?&]maint\b/.test(location.search)||window.HF_MAINT)setTimeout(()=>{if(state==='menu')mtBegin('F15I');},1200);
window.__mt=MT;
