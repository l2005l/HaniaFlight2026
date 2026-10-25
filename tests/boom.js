// Boom operator: talks the receiver in by the biggest error, calls a breakaway on a fast closure.
const R=require('../src/core.js');let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}else console.log('ok  ',m);};
const msgs=W=>{const m=W.events.filter(e=>e.type==='msg').map(e=>e.text);const b=W.events.some(e=>e.type==='breakaway');W.events.length=0;return Object.assign(m,{b});};
const put=(W,off,cl)=>{const k=W.tanker,p=W.player;const cp=R.vadd(k.pos,R.qrot(k.q,R.v3(0,-7.5,30)));p.pos=R.vadd(cp,R.qrot(k.q,off));p.vel=R.vadd(k.vel,R.qrot(k.q,R.v3(0,0,-(cl||0))));p.q=k.q;};
{const W=new R.World({mission:'tanker',start:'air'});W.sys.arDoor=true;msgs(W);
  put(W,R.v3(0,-1,25));let m=[];for(let i=0;i<30;i++){put(W,R.v3(0,-1,25));W.step(0.2);m.push(...msgs(W));}
  ok(m.some(t=>/בום: קדימה 2\d/.test(t)),'25 m behind: "forward": '+m.filter(t=>/בום/.test(t))[0]);
  m=[];for(let i=0;i<30;i++){put(W,R.v3(0,-9,1));W.step(0.2);m.push(...msgs(W));}ok(m.some(t=>/בום: למעלה 9/.test(t)),'9 m low: "up 9"');
  m=[];for(let i=0;i<30;i++){put(W,R.v3(8,0,1));W.step(0.2);m.push(...msgs(W));}ok(m.some(t=>/בום: שמאלה 8/.test(t)),'8 m right: "left 8"');
  m=[];let b=false;for(let i=0;i<10;i++){put(W,R.v3(0,0,15),6);W.step(0.1);const q=msgs(W);b=b||q.b;m.push(...q);}ok(b&&m.some(t=>/ברייקאוויי/.test(t)),'6 m/s closure at 15 m: breakaway');}
process.exit(bad?1:0);
