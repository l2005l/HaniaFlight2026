// Formation: slot geometry, scoring, the leader's route in the lesson.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const W=new R.World({mission:'train',lesson:'form',plane:'F16I'}),p=W.player,L=W.formLead.ac;
ok(W.form&&W.form.lead===L&&W.friends.includes(L),'leader of the same type, pilot joined as number two');
/* hold the slot exactly for 20 s: in position all the time */
for(let i=0;i<20*60;i++){const s=W.formSlot(W.form);p.pos={...s};p.vel={...L.vel};p.q=L.q;W.step(1/60);}
ok(W.form.err.lvl===2&&W.form.inT/W.form.t>0.95,'held in the slot: '+Math.round(W.form.inT/W.form.t*100)+'%');
/* 60 m out: amber or red, the run broken */
const s=W.formSlot(W.form);p.pos=R.vadd(s,R.v3(0,0,60));p.vel={...L.vel};W.step(1/60);ok(W.form.err.lvl<2&&W.form.run===0,'60 m off: out of position');
/* the route goes on with calls; trail comes */
let calls=0;for(let i=0;i<60*150;i++){const s2=W.formSlot(W.form);p.pos={...s2};p.vel={...L.vel};p.q=L.q;W.step(1/60);calls+=W.events.filter(e=>e.type==='formcall').length;W.events.length=0;}
ok(calls>=4&&L.alive&&L.pos.y>500,'leader flies the route with calls: '+calls+' calls, kind now '+W.form.kind);
for(let i=0;i<60*260&&!W.flags.formDone;i++){const s2=W.formSlot(W.form);p.pos={...s2};p.vel={...L.vel};p.q=L.q;W.step(1/60);}
ok(W.flags.formDone&&W.stats.form&&W.stats.form.pct>90,'route done, score: '+JSON.stringify(W.stats.form));
for(let i=0;i<60*10&&!W.over;i++)W.step(1/60);ok(W.over&&W.over.win,'lesson complete');
process.exit(bad?1:0);
