import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHiker,poseHiker,disposeHiker} from '../public/character.js';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
test('hiker skin weights and animated geometry remain finite and human-sized',()=>{
 const actor=createHiker(T),mesh=actor.userData.model,g=mesh.geometry;
 assert.equal(mesh.skeleton.bones.length,17);assert.ok(g.attributes.position.count<30000);
 for(let i=0;i<g.attributes.skinWeight.count;i++){const w=g.attributes.skinWeight;assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6);assert.ok(g.attributes.skinIndex.getX(i)<17);}
 for(const state of [{speed:0},{speed:2.8},{speed:5.8},{speed:0,cold:1},{speed:0,kindle:true}]){
  for(let j=0;j<90;j++)poseHiker(actor,state.speed,1/30,state);actor.updateMatrixWorld(true);mesh.skeleton.update();
  const box=new T.Box3(),p=new T.Vector3();for(let i=0;i<g.attributes.position.count;i++){p.fromBufferAttribute(g.attributes.position,i);mesh.applyBoneTransform(i,p);assert.ok(p.toArray().every(Number.isFinite));box.expandByPoint(p);}
  const size=box.getSize(new T.Vector3());assert.ok(size.y>1.5&&size.y<2.3);assert.ok(size.x<1.5&&size.z<1.8);
 }
 disposeHiker(actor);
});
test('exported GLB loads with a skinned mesh and five playable animation clips',async()=>{
 const file=await readFile(new URL('../public/models/hiker-v1.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
 assert.deepEqual(gltf.animations.map(a=>a.name),['Idle','Walk','Run','Cold','Kindle']);
 let skins=0;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skins++;});assert.equal(skins,1);
 const mixer=new T.AnimationMixer(gltf.scene);for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).play();mixer.update(.3);}assert.ok(gltf.animations.every(c=>c.duration>0));
});
