// Authoritative night run for one survival room. Pure state machine: no sockets, no timers.
// Balance rules live in public/survival.js and are shared with the client for display only.
import {newRun,tickRun,NIGHT_SECONDS,nightTime,outcomes,pairOutcomes} from '../public/survival.js';
import {startKindling,nearCamp,FIRE_DURATION} from './campfire.js';
import {P,CAMP} from '../public/world.js';
import {heightAt} from './terrain.js';

export const GRACE_MS=120000;          // how long a disconnected player keeps a place in the night
export const TICK_MS=250;
export const START={x:CAMP.x+2,z:CAMP.z+3};
export const kindleSeconds=hands=>3.2+(100-hands)*.09;
export const stormAt=elapsed=>elapsed>120&&Math.floor((elapsed-120)/150)%2===0;
const shelteredAt=(x,z)=>heightAt(x,z)<735;
const atGoal=(x,z)=>Math.hypot(x-P.tent.x,z-P.tent.z)<12;

export function createRun(now){
  const run={startedAt:now,tickedAt:now,elapsed:0,storm:false,fire:0,events:[],players:new Map(),outcome:null,finishedAt:null};
  record(run,'Выход от лесного кострища. Цель — верхнее укрытие.');
  return run;
}
export function record(run,text){run.events.push({time:run.elapsed,text});}

export function addPlayer(run,token,name,now){
  let p=run.players.get(token);
  if(p){p.online=true;p.lastSeen=now;p.kindling=null;return p;}
  // Spread arrivals around the camp so a companion never spawns inside the first hiker.
  const k=run.players.size,spawn={x:START.x+Math.cos(k*2.1)*1.4*Math.min(k,1),z:START.z+Math.sin(k*2.1)*1.4*Math.min(k,1)};
  p={...newRun(),token,name,x:spawn.x,z:spawn.z,online:true,lastSeen:now,kindling:null,travel:0,joinedAt:run.elapsed};
  delete p.events;
  run.players.set(token,p);
  if(run.elapsed>5)record(run,`${name} присоединяется к ночи.`);
  return p;
}
export function setOffline(run,token,now){const p=run.players.get(token);if(!p)return;p.online=false;p.lastSeen=now;p.kindling=null;}
export function movePlayer(run,token,x,z,now){
  const p=run.players.get(token);if(!p||p.outcome)return;
  p.travel+=Math.hypot(x-p.x,z-p.z);p.x=x;p.z=z;p.lastSeen=now;
  if(p.kindling&&Math.hypot(x-p.kindling.x,z-p.kindling.z)>.5)p.kindling=null;
}
export function beginKindling(run,token,now){
  const p=run.players.get(token);if(!p||p.outcome||run.fire>now||run.outcome)return false;
  p.kindling=startKindling(p,now);return Boolean(p.kindling);
}
export function stopKindling(run,token){const p=run.players.get(token);if(p)p.kindling=null;}

function pairOutcome(players){
  const keys=players.map(p=>p.outcome);
  if(keys.length===1)return keys[0];
  if(keys.every(k=>k==='arrival'))return 'together';
  if(keys.every(k=>k==='cold'))return 'lost';
  if(keys.includes('arrival')&&keys.includes('cold'))return 'separated';
  return 'dawn';
}

// Advance the room to `now`. Returns true when something protocol-worthy changed.
export function stepRun(run,now){
  if(run.outcome)return false;
  const dt=Math.min(1,(now-run.tickedAt)/1000);run.tickedAt=now;run.elapsed=(now-run.startedAt)/1000;
  const before=run.events.length;
  const storm=stormAt(run.elapsed);
  if(storm!==run.storm){run.storm=storm;record(run,storm?'Видимость упала. Началась метель.':'Ветер ослаб.');}
  for(const [token,p] of run.players){
    if(!p.online&&now-p.lastSeen>GRACE_MS){run.players.delete(token);record(run,`${p.name} пропадает из связи и выбывает из ночи.`);continue;}
    if(!p.online||p.outcome)continue;
    const burning=run.fire>now,near=nearCamp(p);
    if(p.kindling){
      if(burning||!near)p.kindling=null;
      else if(now-p.kindling.started>=kindleSeconds(p.hands)*1000){p.kindling=null;run.fire=now+FIRE_DURATION;record(run,`${p.name} разжигает общий костёр${p.hands<55?' окоченевшими руками':''}.`);}
    }
    const companion=[...run.players.values()].some(o=>o!==p&&o.online&&!o.outcome&&Math.hypot(o.x-p.x,o.z-p.z)<5);
    const moving=p.travel/Math.max(dt,1e-3)>.3;p.travel=0;
    p.elapsed=run.elapsed-dt;
    tickRun(p,dt,{moving,storm,fire:near&&run.fire>now,companion,sheltered:shelteredAt(p.x,p.z),goal:atGoal(p.x,p.z)});
    if(p.outcome){p.kindling=null;record(run,`${p.name}: ${outcomes[p.outcome].title.toLowerCase()} (${nightTime(run.elapsed)}).`);}
  }
  const active=[...run.players.values()].filter(p=>p.online||now-p.lastSeen<=GRACE_MS);
  if(active.length&&active.every(p=>p.outcome)){
    run.outcome=pairOutcome(active);run.finishedAt=now;
    record(run,`Итог ночи: ${pairOutcomes[run.outcome].title.toLowerCase()}.`);
  }
  return run.events.length!==before||Boolean(run.outcome);
}

export function snapshot(run,token,now){
  const you=run.players.get(token)||null;
  return {
    elapsed:run.elapsed,storm:run.storm,fire:Math.max(0,(run.fire-now)/1000),outcome:run.outcome,
    night:NIGHT_SECONDS,events:run.events,
    players:[...run.players.values()].map(p=>({name:p.name,outcome:p.outcome,online:p.online,you:p===you})),
    you:you&&{heat:you.heat,hands:you.hands,clarity:you.clarity,exposure:you.exposure,outcome:you.outcome,
      kindling:you.kindling?{progress:(now-you.kindling.started)/1000,needed:kindleSeconds(you.hands)}:null}
  };
}
