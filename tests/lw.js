// Loyal wingman: keeps the wing, draws the SAMs as a decoy, bombs a target, photographs a site.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const fly=(W,s,f)=>{for(let i=0;i<s*30;i++){W.step(1/30);if(f)f();}};
{const W=new R.World({mission:'strike',start:'air',lw:true}),p=W.player,lw=W.lw;p.hp=p.hpMax=1e9;ok(lw&&W.friends.includes(lw),'loyal wingman with the jet');
  fly(W,30);const r=R.qrotInv(p.q,R.vsub(lw.pos,p.pos));ok(lw.alive&&r.x>100&&r.x<450&&r.z>100&&r.z<600,'on the right wing: '+[r.x,r.z].map(Math.round));}
{const W=new R.World({mission:'sead',start:'air',lw:true,plane:'F16I'}),p=W.player,lw=W.lw;p.hp=p.hpMax=1e9;lw.order('decoy',W);ok(lw.mode==='decoy'&&lw.tgt,'decoy: heads for a battery');
  let atLw=0;fly(W,600,()=>{for(const e of W.events)if(e.type==='launch'&&e.m.target===lw)atLw++;W.events.length=0;});ok(atLw>=1,'SAMs fired at the decoy: '+atLw+(lw.alive?' (still flying)':' (lost)'));}
{const W=new R.World({mission:'strike',start:'air',lw:true}),p=W.player,lw=W.lw;p.hp=p.hpMax=1e9;W.sams.forEach(s=>{s.left=0;});const g=W.ground.find(q=>q.primary&&q.kind!=='truck');W.gtgt=g;lw.order('attack',W);
  fly(W,500);ok(lw.bombs===0&&!g.alive,'attack: bombs gone, target '+(g.alive?'still alive':'destroyed'));}
{const W=new R.World({mission:'recon',start:'air',lw:true}),p=W.player,lw=W.lw;p.hp=p.hpMax=1e9;W.sams.forEach(s=>{s.left=0;});const g=W.ground.find(q=>q.kind==='site');W.gtgt=g;lw.order('recon',W);
  fly(W,500);ok(g.shot&&g.spotted,'recon: site photographed');}
{const W=new R.World({mission:'strike',start:'air'});ok(!W.lw,'off by default');}
process.exit(bad?1:0);
