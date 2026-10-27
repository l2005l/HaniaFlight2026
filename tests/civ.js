// Civil traffic: airliners are unknown until identified (3 s lock inside 25 NM, or seen inside 9 km); firing without ID is a
// violation; shooting one down ends the mission.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
{const W=new R.World({mission:'intercept',start:'air',civ:true}),p=W.player,c=W.civs[0];p.hp=p.hpMax=1e9;ok(W.civs.length>=2&&W.air.includes(c)&&c.side===2,'airliners in the sky, neutral');
  c.pos=R.vadd(p.pos,R.v3(30000,4000,0));c.vel=R.v3(-230,0,0);for(let i=0;i<30;i++)W.step(1/30);ok(W.ident(c,30000)==='UNKNOWN','unknown before identification');
  W.lock=c;for(let i=0;i<30*4;i++){c.pos=R.vadd(p.pos,R.v3(30000,4000,0));W.step(1/30);}ok(c.idd&&W.ident(c,30000)==='CIVIL','3 s lock inside 25 NM: CIVIL');
  const m=W.drones[0];m.pos=R.vadd(p.pos,R.v3(30000,0,0));m.idd=false;W.lock=m;W.events.length=0;W.launch(R.MSL.AIM120,p,m);ok(W.stats.roe===1&&W.events.some(e=>e.type==='msg'&&/בלי זיהוי/.test(e.text)),'shot without ID: violation');
  W.killAir(c);ok(W.over&&!W.over.win&&/אזרחי/.test(W.over.title),'airliner shot down: mission over');}
{const W=new R.World({mission:'intercept',start:'air',civ:true}),p=W.player,c=W.civs[0];c.pos=R.vadd(p.pos,R.v3(6000,200,0));W.step(0.3);ok(c.idd,'seen inside 9 km: identified');}
{const W=new R.World({mission:'intercept',start:'air'});ok(!W.civs.length&&!W.roe&&W.ident(W.drones[0],30000)===W.drones[0].type,'off: old rules');}
{const W=new R.World({mission:'strike',start:'air',civ:true,wing:true});const w=W.wing;w.mode='cover';W.migsActive=true;W.migs.forEach(m=>{m.alive=false;});w.update(0.1,W);ok(!(w.tgt&&w.tgt.civ),'number two does not go for airliners');}
process.exit(bad?1:0);
