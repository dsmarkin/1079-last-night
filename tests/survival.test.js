import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,tickRun,NIGHT_SECONDS,nightTime} from '../public/survival.js';
test('wind costs heat; shelter and a companion reduce the loss',()=>{
 const a=newRun(),b=newRun();tickRun(a,60,{storm:true});tickRun(b,60,{storm:true,sheltered:true,companion:true});assert.ok(a.heat<b.heat);assert.equal(a.exposure,60);assert.equal(b.exposure,0);
});
test('fire restores hands and heat within bounds',()=>{const r=newRun();r.heat=10;r.hands=1;tickRun(r,200,{fire:true});assert.equal(r.heat,100);assert.equal(r.hands,100);});
test('outcomes freeze the run and cold takes precedence over arrival',()=>{const r=newRun();r.heat=.01;tickRun(r,1,{goal:true});assert.equal(r.outcome,'cold');const t=r.elapsed;tickRun(r,100);assert.equal(r.elapsed,t);});
test('arrival and deadline produce distinct protocols',()=>{const a=newRun(),b=newRun();tickRun(a,1,{goal:true});tickRun(b,NIGHT_SECONDS,{fire:true});assert.equal(a.outcome,'arrival');assert.equal(b.outcome,'dawn');assert.equal(nightTime(0),'17:40');assert.equal(nightTime(NIGHT_SECONDS),'06:50');});
