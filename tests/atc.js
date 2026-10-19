// Full tower: start-up, taxi, take-off and landing clearances, and violations when the pilot goes without them.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const msgs=W=>{const m=W.events.filter(e=>e.type==='msg').map(e=>e.text);W.events.length=0;return m;};
{const W=new R.World({mission:'intercept',start:'runway',atc:'full'});const p=W.player;let m=msgs(W);
  ok(m.some(t=>/מוכן להמראה/.test(t))&&!m.some(t=>/רשאי להמריא/.test(t)),'runway start: no automatic take-off clearance: '+m[0].slice(0,80));
  let n=W.atcNext();ok(n&&n.k==='to','next request: '+(n&&n.l));W.atcReq('to');for(let i=0;i<60*40&&!W.atc.to;i++)W.step(1/60);m=msgs(W);ok(W.atc.to&&m.some(t=>/רשאי להמריא/.test(t)),'cleared for take-off'+(W.atc.waited?' (after holding for traffic)':''));
  for(let t=0;t<40;t+=1/60){p.ctl.throttle=1.3;p.ctl.pitch=p.V>77&&p.euler().pitch<10*R.D2R?0.5:0;if(!p.onGround&&p.agl>20){p.gear=false;p.flaps=false;}W.step(1/60);}m=msgs(W);
  ok(W.atc.viol.length===0&&m.some(t=>/עבור לבקר/.test(t)),'airborne with clearance, handed to the controller');}
{const W=new R.World({mission:'intercept',start:'runway',atc:'full'});const p=W.player;msgs(W);
  for(let t=0;t<40;t+=1/60){p.ctl.throttle=1.3;p.ctl.pitch=p.V>77&&p.euler().pitch<10*R.D2R?0.5:0;W.step(1/60);}const m=msgs(W);
  ok(W.atc.viol.includes('to')&&m.some(t=>/בלי אישור המראה/.test(t)),'take-off without clearance is a violation');}
{const W=new R.World({mission:'intercept',start:'cold',atc:'full'});const m=msgs(W);ok(m.some(t=>/בקש אישור התנעה/.test(t)),'cold start: asks to request start-up');
  ok(W.atcNext().k==='start','first request is start-up');W.atcReq('start');ok(W.atcNext().k==='taxi','then taxi');W.atcReq('taxi');ok(W.atcNext().k==='to','then take-off');}
{/* landing: request, clearance at 5 miles on the ILS, touchdown without clearance is a violation */
  const W=new R.World({mission:'intercept',start:'air',atc:'full'});const p=W.player;W.flags.airborne=true;W.flags.airT=-100;p.pos=R.v3(R.RWY.x1-15000,R.SITES.base.h+700,0);W.step(0.05);
  ok(W.atcNext()&&W.atcNext().k==='land','within range: landing request offered');W.atcReq('land');p.pos=R.v3(R.RWY.x1-9000,R.SITES.base.h+450,0);for(let i=0;i<20;i++)W.step(0.05);const m=msgs(W);
  ok(W.atc.cl&&m.some(t=>/רשאי לנחות/.test(t)),'cleared to land inside 6 miles');
  const W2=new R.World({mission:'intercept',start:'air',atc:'full'});W2.flags.airborne=true;W2.flags.airT=-100;const q=W2.player;q.gear=true;q.gearPos=1;q.flaps=true;q.pos=R.v3(-800,R.SITES.base.h+2.4+0.4,0);q.vel=R.v3(72,-0.6,0);q.q=R.qeuler(Math.PI/2,0.1,0);q.ctl.throttle=0;for(let i=0;i<120;i++)W2.step(0.05);ok(W2.atc.viol.includes('land'),'landing without clearance is a violation');}
{const W=new R.World({mission:'intercept',start:'runway'});ok(!W.atcNext()&&msgs(W).some(t=>/רשאי להמריא/.test(t)),'simple mode unchanged');}
process.exit(bad?1:0);
