import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createHiker,poseHiker} from '../public/character.js';
import {writeFile,mkdir} from 'node:fs/promises';
// GLTFExporter uses FileReader for packing a Blob; no DOM, textures or canvas needed.
if(!globalThis.FileReader)globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result='data:application/octet-stream;base64,'+Buffer.from(data).toString('base64');this.onloadend?.();});}
};
const model=createHiker(THREE),clips=[];
for(const [name,speed,state] of [['Idle',0,{}],['Walk',2.8,{}],['Run',5.8,{}],['Cold',0,{cold:1}],['Kindle',0,{kindle:true}]]){
 const actor=createHiker(THREE);for(let i=0;i<90;i++)poseHiker(actor,speed,1/30,state);
 const duration=speed?2*Math.PI/(3+speed*1.5):name==='Kindle'?2*Math.PI/9:name==='Cold'?2*Math.PI:2*Math.PI/2.1;
 const steps=60,times=[],rotations={},positions={};
 for(const key of Object.keys(actor.userData.rig)){rotations[key]=[];positions[key]=[];}
 for(let i=0;i<=steps;i++){
  actor.userData.phase=speed?i/steps*2*Math.PI:0;actor.userData.time=i/steps*duration;poseHiker(actor,speed,0,state);times.push(i/steps*duration);
  for(const [key,b] of Object.entries(actor.userData.rig)){rotations[key].push(...b.quaternion.toArray());positions[key].push(...b.position.toArray());}
 }
 const tracks=[];for(const key of Object.keys(rotations)){tracks.push(new THREE.QuaternionKeyframeTrack(key+'.quaternion',times,rotations[key]));if(key==='hips'||key==='chest')tracks.push(new THREE.VectorKeyframeTrack(key+'.position',times,positions[key]));}
 clips.push(new THREE.AnimationClip(name,duration,tracks));
}
model.userData={};model.updateMatrixWorld(true);
const result=await new GLTFExporter().parseAsync(model,{binary:true,animations:clips});
await mkdir('public/models',{recursive:true});await writeFile('public/models/hiker-v1.glb',Buffer.from(result));
console.log(`Exported hiker-v1.glb: ${result.byteLength} bytes, ${clips.length} animation clips`);
