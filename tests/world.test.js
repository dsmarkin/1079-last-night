import {test} from 'node:test';import assert from 'node:assert/strict';import {SIZE,GRID,STEP,POIS,P,movement,sample,ll,unll,decodeHeights} from '../public/world.js';
const d=(a,b)=>Math.hypot(P[a].x-P[b].x,P[a].z-P[b].z);
test('camera-relative directions and normalized diagonal',()=>{assert.equal(movement(0,1,0).x,1);assert.ok(Math.abs(movement(0,1,0).z)<1e-12);assert.equal(movement(1,0,0).z,-1);const v=movement(1,1,1);assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-12);});
test('historical points fit the area and keep their documented distances',()=>{
 POIS.forEach(p=>assert.ok(Math.abs(p.x)<SIZE/2-50&&Math.abs(p.z)<SIZE/2-50,p.id));
 assert.ok(d('cedar','tent')>1450&&d('cedar','tent')<1580,'cedar–tent 1.5 km');
 assert.ok(d('cedar','ravine')<75);
 assert.ok(Math.abs(d('dyatlov','cedar')-300)<30&&Math.abs(d('slobodin','cedar')-480)<30&&Math.abs(d('kolmogorova','cedar')-630)<30);
 assert.ok(d('labaz','tent')>1500&&d('labaz','tent')<2100);
});
test('frame: x east, z south; projection round-trips',()=>{
 assert.ok(P.cedar.x>P.tent.x&&P.cedar.z<P.tent.z,'cedar is north-east of the tent');assert.ok(P.labaz.z>P.tent.z,'labaz is south');
 const p=ll(61.77,59.47),q=unll(p.x,p.z);assert.ok(Math.abs(q.lat-61.77)<1e-9&&Math.abs(q.lon-59.47)<1e-9);
});
test('grid sampling hits nodes, interpolates and clamps',()=>{
 const a=Float32Array.from({length:GRID*GRID},(_,i)=>i%GRID);
 assert.equal(sample(a,-SIZE/2,-SIZE/2),0);assert.equal(sample(a,-SIZE/2+STEP*1.5,0),1.5);assert.equal(sample(a,SIZE,0),GRID-1);
 assert.equal(decodeHeights(new Uint16Array([0,65535]))[1],1096);
});
