// Mission plan: moved route points, heights, a time over target, number two's target.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const W0=new R.World({mission:'strike',start:'air',wing:true});const wps=W0.wps.map(w=>[w.n,w.x,w.z,w.alt]);
const cap=wps.findIndex(w=>w[0]==='CAP'),tg=wps.findIndex(w=>w[0]==='TGT');
const P={wps:wps.map((w,i)=>i===cap?[w[0],w[1]+5000,w[2]-8000,4000]:i===tg?[w[0],0,0,7000]:w),tot:600,wing:W0.ground.findIndex(g=>g.primary&&g.kind!=='truck')};
const W=new R.World({mission:'strike',start:'air',wing:true,plan:P});
ok(W.planned&&Math.round(W.wps[cap].x)===Math.round(wps[cap][1]+5000)&&W.wps[cap].alt===4000,'CAP moved and lowered');
ok(Math.round(W.wps[tg].x)===Math.round(wps[tg][1])&&W.wps[tg].alt===7000,'TGT stays where the target is; its height is planned');
ok(W.planTot===600&&W.wps[tg].tot===600&&W.wps[cap].tot>0&&W.wps[cap].tot<600,'TOT and times at the points before it: '+W.wps.map(w=>w.n+':'+(w.tot||'-')).join(' '));
ok(W.wingTgt===W.ground[P.wing],'number two has its planned target');
const bad2=new R.World({mission:'strike',start:'air',plan:{wps:wps.slice(1),tot:500}});ok(!bad2.planned&&!bad2.planTot,'a plan for another route is ignored');
{const W2=new R.World({mission:'strike',start:'air',wing:true,plan:P}),w=W2.wing;const t=W2.wingTgt;w.ac.pos=R.v3(t.pos.x-30000,6000,t.pos.z);W2.events.length=0;w.update(0.1,W2);ok(w.mode==='attack'&&w.tgt===t&&W2.events.some(e=>e.type==='msg'&&/לפי התכנון/.test(e.text)),'within 40 km, number two goes for it');}
process.exit(bad?1:0);
