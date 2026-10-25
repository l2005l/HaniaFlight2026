// Weather that changes in the sortie: announced, then arriving over 40 s; a crosswind that builds and gusts.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
{const W=new R.World({mission:'intercept',start:'air'});ok(!W.wxPlan.length,'off by default');}
{const W=new R.World({mission:'intercept',start:'air',wxDyn:true});ok(W.wxPlan.length>=1&&W.wxPlan[0].at>=300,'planned: '+W.wxPlan.map(e=>e.k+'@'+Math.round(e.at)).join(', '));}
{const W=new R.World({mission:'intercept',start:'air',wxDyn:true});W.player.hp=W.player.hpMax=1e9;W.wxPlan=[{k:'fog',at:20,warn:5}];let m=[];
  for(let i=0;i<20*30;i++){W.step(0.05);m.push(...W.events.filter(e=>e.type==='msg').map(e=>e.text));W.events.length=0;}ok(W.wx==='fog'&&W.wxF>0.2&&W.wxF<0.4&&m.some(t=>/ערפל/.test(t)),'fog announced, then fading in: '+W.wxF.toFixed(2));}
{const W=new R.World({mission:'intercept',start:'air',wxDyn:true});W.player.hp=W.player.hpMax=1e9;W.wxPlan=[{k:'gust',at:2,warn:1}];const sp=[];
  for(let i=0;i<20*120;i++){W.step(0.05);if(i>20*60)sp.push(Math.hypot(W.wind.x,W.wind.z));}const mn=Math.min(...sp),mx=Math.max(...sp);
  ok(W.player.wind===W.wind&&mx*1.944>18&&mx/mn>1.2,`crosswind builds and gusts: ${Math.round(mn*1.944)}-${Math.round(mx*1.944)} kt`);}
{const W=new R.World({mission:'train',start:'air',wxDyn:true});ok(!W.wxPlan.length,'not in training');}
process.exit(bad?1:0);
