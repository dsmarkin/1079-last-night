import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CAMP} from '../public/world.js';
import {startKindling,canIgnite} from '../server/campfire.js';
import {io} from 'socket.io-client';
test('kindling requires proximity, time, stillness, and an unlit fire',()=>{
 const a=startKindling(CAMP,1000);
 assert.equal(startKindling({x:0,z:0},1000),null);
 assert.equal(canIgnite(CAMP,a,3999,0),false);
 assert.equal(canIgnite(CAMP,a,4000,0),true);
 assert.equal(canIgnite({...CAMP,x:CAMP.x+1},a,4000,0),false);
 assert.equal(canIgnite(CAMP,a,4000,5000),false);
 assert.equal(canIgnite(CAMP,a,17000,0),false);
});
const event=(s,e)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Timeout '+e)),6000);s.once(e,p=>{clearTimeout(t);resolve(p);});});
test('campfire is shared, isolated by room and restored on late join',{timeout:15000},async()=>{
 const clients=Array.from({length:3},()=>io(process.env.TEST_URL||'http://127.0.0.1:3000',{autoConnect:false}));
 const [a,b,c]=clients;try{
  await Promise.all(clients.map(async s=>{const wait=event(s,'connect');s.connect();await wait;}));
  const room='N:FIRE'+Date.now();
  async function join(s,r){const wait=event(s,'fire');s.emit('join',{room:r,name:'QA',...CAMP,ry:0});return wait;}
  assert.equal((await join(a,room)).remaining,0);await join(b,room);await join(c,room+'X');
  let leaked=false;c.on('fire',()=>leaked=true);
  a.emit('kindle');await new Promise(r=>setTimeout(r,3200));
  const mine=event(a,'fire'),shared=event(b,'fire');a.emit('ignite');
  assert.equal((await mine).remaining,90);assert.equal((await shared).remaining,90);assert.equal(leaked,false);
  c.removeAllListeners('fire');const restored=await join(c,room);assert.ok(restored.remaining>85&&restored.remaining<=90);
 }finally{clients.forEach(s=>s.disconnect());}
});
