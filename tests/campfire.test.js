import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CAMP} from '../public/world.js';
import {startKindling,nearCamp} from '../server/campfire.js';
import {io} from 'socket.io-client';
test('kindling can only start at the camp',()=>{
 assert.equal(startKindling({x:0,z:0},1000),null);
 assert.deepEqual(startKindling(CAMP,1000),{started:1000,x:CAMP.x,z:CAMP.z});
 assert.equal(nearCamp({x:CAMP.x+4.9,z:CAMP.z}),true);assert.equal(nearCamp({x:CAMP.x+5.1,z:CAMP.z}),false);
});
const url=process.env.TEST_URL||'http://127.0.0.1:3000';
const event=(s,e,pred=()=>true,ms=8000)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{s.off(e,h);reject(new Error('Timeout '+e));},ms);const h=p=>{if(!pred(p))return;clearTimeout(t);s.off(e,h);resolve(p);};s.on(e,h);});
const token=()=>'t'+Math.random().toString(36).slice(2,14)+Math.random().toString(36).slice(2,8);
test('night run is authoritative: shared fire, isolated rooms, reconnect snapshot and pair outcome',{timeout:30000},async()=>{
 const clients=Array.from({length:3},()=>io(url,{autoConnect:false}));
 const [a,b,c]=clients,ta=token(),tb=token();try{
  await Promise.all(clients.map(async s=>{const wait=event(s,'connect');s.connect();await wait;}));
  const room='N:FIRE'+Date.now();
  const join=(s,r,t)=>{const wait=event(s,'run');s.emit('join',{room:r,name:'QA'+t.slice(1,3),token:t,...CAMP,ry:0});return wait;};
  const first=await join(a,room,ta);assert.equal(first.fire,0);assert.equal(first.you.heat,100);assert.equal(first.players.length,1);
  const second=await join(b,room,tb);assert.equal(second.players.length,2);
  await join(c,room+'X',token());let leaked=false;c.on('run',s=>{if(s.fire>0)leaked=true;});
  a.emit('kindle');
  const kindling=await event(a,'run',s=>s.you.kindling);assert.ok(kindling.you.kindling.needed>=3.2);
  const lit=await event(b,'run',s=>s.fire>0,10000);assert.ok(lit.fire>85&&lit.fire<=90);
  assert.ok(lit.events.some(e=>/разжигает общий костёр/.test(e.text)));
  await new Promise(r=>setTimeout(r,300));assert.equal(leaked,false);
  // Reconnect with the same token: the server restores the participant instead of creating a new one.
  b.disconnect();await new Promise(r=>setTimeout(r,200));const back=event(b,'connect');b.connect();await back;
  const restored=await join(b,room,tb);assert.equal(restored.players.length,2);assert.ok(restored.fire>80);
  // Move A to the upper shelter: personal arrival, then the room waits for B.
  const {P}=await import('../public/world.js');
  a.emit('move',{x:P.tent.x+2,z:P.tent.z+2,ry:0});
  const arrived=await event(a,'run',s=>s.you.outcome==='arrival');assert.equal(arrived.outcome,null);
  const waiting=await event(b,'run',s=>s.players.some(p=>p.outcome==='arrival'));assert.equal(waiting.you.outcome,null);
  b.emit('move',{x:P.tent.x-2,z:P.tent.z-2,ry:0});
  const pair=await event(a,'run',s=>s.outcome);assert.equal(pair.outcome,'together');
  assert.match(pair.events.at(-1).text,/вместе до укрытия/i);
 }finally{clients.forEach(s=>s.disconnect());}
});
