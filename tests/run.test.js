import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,addPlayer,setOffline,movePlayer,beginKindling,stopKindling,stepRun,snapshot,kindleSeconds,GRACE_MS,START} from '../server/run.js';
import {heightAt,decodePng} from '../server/terrain.js';
import {P,CAMP} from '../public/world.js';
import {NIGHT_SECONDS} from '../public/survival.js';

const advance=(run,from,seconds,step=250)=>{let t=from;for(let i=0;i<seconds*1000/step;i++){t+=step;stepRun(run,t);}return t;};

test('server DEM matches the client decoding and puts the camp below the tree line',()=>{
 assert.throws(()=>decodePng(Buffer.from('nope')));
 const camp=heightAt(CAMP.x,CAMP.z),tent=heightAt(P.tent.x,P.tent.z);
 assert.ok(camp>600&&camp<735,`camp ${camp}`);assert.ok(tent>camp,`tent ${tent}`);
});

test('the night clock, storm and personal resources are driven by the server',()=>{
 const run=createRun(1000);const a=addPlayer(run,'tokenaaaaaaa','А',1000);
 assert.equal(run.events.length,1);assert.deepEqual([a.x,a.z],[START.x,START.z]);
 let t=advance(run,1000,130);
 assert.ok(Math.abs(run.elapsed-130)<.001);assert.equal(run.storm,true);assert.ok(run.events.some(e=>/метель/.test(e.text)));
 assert.ok(a.heat<100&&a.heat>60);assert.equal(snapshot(run,'tokenaaaaaaa',t).you.heat,a.heat);
 assert.equal(snapshot(run,'nobody',t).you,null);
 t=advance(run,t,160);assert.equal(run.storm,false);
});

test('kindling is validated by the server: proximity, hands, stillness; fire is shared and stops kindling',()=>{
 const run=createRun(0);const a=addPlayer(run,'tokenaaaaaaa','А',0),b=addPlayer(run,'tokenbbbbbbb','Б',0);
 movePlayer(run,'tokenbbbbbbb',0,0,0);
 assert.equal(beginKindling(run,'tokenbbbbbbb',0),false);
 assert.equal(beginKindling(run,'tokenaaaaaaa',0),true);
 movePlayer(run,'tokenaaaaaaa',a.x+1,a.z,100);assert.equal(a.kindling,null,'moving cancels');
 assert.equal(beginKindling(run,'tokenaaaaaaa',200),true);stopKindling(run,'tokenaaaaaaa');assert.equal(a.kindling,null,'release cancels');
 a.hands=40;assert.equal(beginKindling(run,'tokenaaaaaaa',1000),true);
 const needed=kindleSeconds(40);assert.ok(needed>8);
 let t=advance(run,1000,needed-1);assert.equal(run.fire,0,'not yet');
 t=advance(run,t,1.5);assert.ok(run.fire>t,'lit');assert.equal(a.kindling,null);
 assert.ok(run.events.some(e=>/разжигает общий костёр окоченевшими руками/.test(e.text)));
 assert.equal(beginKindling(run,'tokenaaaaaaa',t),false,'already burning');
 const snapB=snapshot(run,'tokenbbbbbbb',t);assert.ok(snapB.fire>85&&snapB.fire<=90);
 const hands=a.hands;advance(run,t,20);assert.ok(a.hands>hands+20,'fire restores hands');assert.equal(a.heat,100);assert.ok(b.heat<100,'far player still cools');
});

test('personal outcomes, reconnect within grace, and the shared pair outcome',()=>{
 const run=createRun(0);const a=addPlayer(run,'tokenaaaaaaa','А',0),b=addPlayer(run,'tokenbbbbbbb','Б',0);
 movePlayer(run,'tokenaaaaaaa',P.tent.x+3,P.tent.z+3,0);
 let t=advance(run,0,1);assert.equal(a.outcome,'arrival');assert.equal(run.outcome,null,'room waits for the partner');
 setOffline(run,'tokenbbbbbbb',t);const heat=b.heat;t=advance(run,t,30);assert.equal(b.heat,heat,'offline players do not lose heat');
 const again=addPlayer(run,'tokenbbbbbbb','Б',t);assert.equal(again,b);assert.equal(b.online,true);
 b.heat=.1;t=advance(run,t,10);assert.equal(b.outcome,'cold');
 assert.equal(run.outcome,'separated');assert.match(run.events.at(-1).text,/разделённая пара/i);
 assert.equal(snapshot(run,'tokenaaaaaaa',t).players.find(p=>p.you).name,'А');
 assert.equal(stepRun(run,t+1000),false,'finished runs are frozen');
});

test('players offline beyond the grace period leave the night; dawn closes the room',()=>{
 const run=createRun(0);addPlayer(run,'tokenaaaaaaa','А',0);addPlayer(run,'tokenbbbbbbb','Б',0);
 setOffline(run,'tokenbbbbbbb',0);
 let t=advance(run,0,GRACE_MS/1000+1);assert.equal(run.players.size,1);assert.ok(run.events.some(e=>/выбывает/.test(e.text)));
 const a=run.players.get('tokenaaaaaaa');a.heat=100;
 // Keep the survivor warm so the deadline, not the cold, ends the night.
 while(run.elapsed<NIGHT_SECONDS&&!run.outcome){a.heat=100;t=advance(run,t,10,1000);}
 assert.equal(a.outcome,'dawn');assert.equal(run.outcome,'dawn');
});
