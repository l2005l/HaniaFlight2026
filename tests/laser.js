// Laser codes: a laser-guided bomb follows only a spot with its own code; coordinates of a point.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const W=new R.World({mission:'strike',start:'air',bomb:'lgb'});ok(W.laserCode===1688,'default code 1688');
const p=W.player,b={owner:p,code:1688,aim:{x:1000,y:0,z:0}};W.laserSpot={x:1010,y:0,z:5};ok(W.laserFor(b),'same code: guided');
W.laserCode=1511;ok(!W.laserFor(b),'own spot on another code: not guided');
W.netLasers=[{x:1005,y:0,z:0,c:1688}];ok(W.laserFor(b),'a friend lasing on 1688: guided');W.netLasers=[{x:1005,y:0,z:0,c:1777}];ok(!W.laserFor(b),'a friend on 1777: not');
const W2=new R.World({mission:'strike',start:'air',laserCode:1745});ok(W2.laserCode===1745,'code from the options');
const L=R.llOf(0,0);ok(Math.abs(L.lat-31.233)<0.01&&Math.abs(L.lon-34.662)<0.01,'south map: home base at 31.23N 34.66E');const L2=R.llOf(0,-11057);ok(Math.abs(L2.lat-L.lat-0.1)<0.001,'10 km north: +0.1 degree');
process.exit(bad?1:0);
