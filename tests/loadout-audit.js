// Every mission can be finished by the player alone: enough air-to-ground weapons for the targets the gun cannot kill (plus a spare),
// and enough air-to-air shots (missiles plus the gun) for the threats that must be stopped.
const R=require('../src/core.js');let bad=0;
for(const m of['strike','sead','naval','convoy','intercept','escort','csar','duel','stealth'])for(const pl of['F15I','F16I','F35I','F15C'])for(const bo of['spice','lgb','jdam','delilah']){
  const W=new R.World({plane:pl,mission:m,start:'air',bomb:bo}),w=W.w,hard=W.ground.filter(g=>g.primary&&g.kind!=='truck').length;
  if(['strike','sead','naval'].includes(W.missionId)&&hard&&w.spice<hard+1){bad++;console.log('SHORT A/G',m,pl,bo,w.spice,'for',hard);}
  const aam=w.aim120+w.python,need=W.missionId==='intercept'?8:W.missionId==='duel'||W.missionId==='csar'?2:W.missionId==='escort'?2:0;
  if(aam+Math.floor(w.gun/90)<need){bad++;console.log('SHORT A/A',m,pl,aam,'missiles',w.gun,'rounds for',need);}}
console.log(bad?bad+' short loadouts':'loadouts ok');process.exit(bad?1:0);
