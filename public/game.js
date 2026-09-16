import {EnvironmentSound} from './sound.js';
import {newRun,tickRun,record,nightTime,outcomes} from './survival.js';
import * as THREE from '/vendor/three.module.js';
import {SIZE,POIS,P,CAMP,creek,sources,movement,sample} from './world.js';
const ambience=new EnvironmentSound();
const $=s=>document.querySelector(s),canvas=$('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xadbcc6);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xadbcc6,.0013);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,4500);
scene.add(new THREE.HemisphereLight(0xe2efff,0x586267,2));const sun=new THREE.DirectionalLight(0xffefd7,2.3);sun.position.set(-500,700,-200);scene.add(sun);
let firstPerson=false,run=null,fireSeconds=0,lightingFire=0,finished=false,autoKindle=false,fireDeadline=0,awaitingFire=false;
let heights,ready=false,active=false,mapOpen=false,yaw=-1.15,pitch=.32,distance=6,storm=false,paused=false,dragging=false;
const keys={},velocity=new THREE.Vector2(),players=new Map();
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true});
const snowMat=mat(0xe2e8ed),wood=mat(0x51443a),leaf=mat(0x304641),coat=mat(0xb36a47),dark=mat(0x313d43);
function mesh(g,m,parent,x=0,y=0,z=0){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);parent.add(a);return a;}
function baseHeight(x,z){return heights?sample(heights,x,z):0;}
function creekDistance(x,z){let best=1e9;for(let i=1;i<creek.length;i++){const a=creek[i-1],b=creek[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best;}
function hAt(x,z){const d=creekDistance(x,z);return baseHeight(x,z)-4*Math.exp(-d*d/55);}
function avatar(color){const g=new THREE.Group(),body=new THREE.Group();g.add(body);const fabric=mat(color);mesh(new THREE.CapsuleGeometry(.27,.42,4,8),fabric,body,0,1.13);mesh(new THREE.SphereGeometry(.22,12,8),fabric,body,0,1.69);mesh(new THREE.SphereGeometry(.15,10,8),mat(0xcba88e),body,0,1.67,-.13);mesh(new THREE.BoxGeometry(.43,.58,.24),dark,body,0,1.15,.29);const limbs=[];for(const [x,y,r,len] of [[-.32,1.36,.09,.51],[.32,1.36,.09,.51],[-.14,.78,.115,.54],[.14,.78,.115,.54]]){const joint=new THREE.Group();joint.position.set(x,y,0);body.add(joint);mesh(new THREE.CapsuleGeometry(r,len,3,6),y>1?fabric:dark,joint,0,-len/2);if(y<1)mesh(new THREE.BoxGeometry(.22,.17,.36),dark,joint,0,-.65,-.07);limbs.push(joint);}g.userData={body,limbs,phase:0};scene.add(g);return g;}
function animate(g,speed,dt){const u=g.userData;u.phase+=speed*dt*2.4;const swing=Math.sin(u.phase)*Math.min(speed/5,.65);u.limbs.forEach((l,i)=>l.rotation.x=swing*([1,-1,-1,1][i]));u.body.position.y=Math.abs(Math.sin(u.phase))*Math.min(speed*.008,.04);}
const me=avatar(0x4e6370);me.visible=false;
function terrainPatch(x,z,width,steps){const geo=new THREE.PlaneGeometry(width,width,steps,steps);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const px=x+pos.getX(i),pz=z+pos.getZ(i);pos.setXYZ(i,px,hAt(px,pz),pz);}if(width===SIZE){const keep=[],index=geo.index.array;for(let i=0;i<index.length;i+=3){const ids=[index[i],index[i+1],index[i+2]];const inside=ids.every(k=>Math.abs(pos.getX(k)-P.ravine.x)<118&&Math.abs(pos.getZ(k)-P.ravine.z)<118);if(!inside)keep.push(...ids);}geo.setIndex(keep);}geo.computeVertexNormals();return mesh(geo,snowMat,scene);}
let seed=1959;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
function vegetation(){const count=1300,dummy=new THREE.Object3D();const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.23,1,5),wood,count),branches=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),leaf,count*5),caps=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),snowMat,count*5);let n=0;for(let i=0;i<count*8&&n<count;i++){const x=(rnd()-.5)*(SIZE-20),z=(rnd()-.5)*(SIZE-20),h=baseHeight(x,z);if(h>755||rnd()>(755-h)/70||creekDistance(x,z)<5)continue;const ht=3+rnd()*9;dummy.position.set(x,hAt(x,z)+ht/2,z);dummy.scale.set(1,ht,1);dummy.updateMatrix();trunks.setMatrixAt(n,dummy.matrix);for(let j=0;j<5;j++){const w=(1-j*.16)*ht*.23;dummy.position.set(x,hAt(x,z)+ht*(.38+j*.12),z);dummy.scale.set(w,ht*.33,w);dummy.rotation.y=rnd()*6.28;dummy.updateMatrix();branches.setMatrixAt(n*5+j,dummy.matrix);dummy.position.y+=ht*.075;dummy.scale.multiplyScalar(.88);dummy.updateMatrix();caps.setMatrixAt(n*5+j,dummy.matrix);}n++;}trunks.count=n;branches.count=caps.count=n*5;scene.add(trunks,branches,caps);}
function decorate(){vegetation();const tent=new THREE.Group();const tg=new THREE.CylinderGeometry(1.8,1.8,5.2,3,1,false);tg.rotateX(Math.PI/2);mesh(tg,mat(0x817c61),tent,0,1);tent.position.set(P.tent.x,hAt(P.tent.x,P.tent.z),P.tent.z);scene.add(tent);
for(const p of POIS){if(p.id==='tent')continue;const g=new THREE.Group();mesh(new THREE.CylinderGeometry(.06,.06,1.5,6),wood,g,0,.75);mesh(new THREE.BoxGeometry(.5,.28,.06),mat(p.source==='field'?0x87baba:0xd7ae62),g,0,1.5);g.position.set(p.x,hAt(p.x,p.z),p.z);scene.add(g);}
const cedar=new THREE.Group();mesh(new THREE.CylinderGeometry(.34,.55,12,8),wood,cedar,0,6);for(let i=0;i<12;i++){const a=i*2.4;const branch=mesh(new THREE.CylinderGeometry(.05,.16,3.5,5),wood,cedar,Math.cos(a)*1.2,4+i*.55,Math.sin(a)*1.2);branch.rotation.z=Math.cos(a)*.9;branch.rotation.x=Math.sin(a)*.9;mesh(new THREE.SphereGeometry(1.2,7,5),leaf,cedar,Math.cos(a)*1.9,5+i*.55,Math.sin(a)*1.9);}cedar.position.set(P.cedar.x,hAt(P.cedar.x,P.cedar.z),P.cedar.z);scene.add(cedar);
// A one-metre mesh resolves the illustrative incision; its width/depth are not surveyed.
const patch=terrainPatch(P.ravine.x,P.ravine.z,240,240);patch.position.y=.025;
const pts=[];for(let i=1;i<creek.length;i++){const a=creek[i-1],b=creek[i];for(let k=0;k<40;k++){const t=k/40,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);pts.push(new THREE.Vector3(x,hAt(x,z)+.1,z));}}
mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,.6,5,false),mat(0x7a929d),scene);
for(let i=0;i<65;i++){const p=pts[Math.floor(rnd()*pts.length)],x=p.x+(rnd()-.5)*8,z=p.z+(rnd()-.5)*8;const rock=mesh(new THREE.DodecahedronGeometry(.3+rnd()*.6),mat(0x899194),scene,x,hAt(x,z)+.15,z);rock.scale.y=.55;}
me.position.set(P.tent.x+5,hAt(P.tent.x+5,P.tent.z+7),P.tent.z+7);me.visible=true;ready=true;$('#go').disabled=false;$('#go').textContent='НАЧАТЬ МАРШРУТ';updateCamera(1);}
async function load(){try{const img=new Image();img.src='/data/terrain.png';await img.decode();const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,256,256).data;heights=new Float32Array(65536);for(let i=0;i<heights.length;i++)heights[i]=d[i*4]*256+d[i*4+1]+d[i*4+2]/256-32768;terrainPatch(0,0,SIZE,384);decorate();drawMaps();$('#loading').hidden=true;}catch(e){$('#loading').textContent='Не удалось загрузить рельеф. Обновите страницу.';console.error(e);}}
const footprint=new THREE.InstancedMesh(new THREE.PlaneGeometry(.18,.32),new THREE.MeshBasicMaterial({color:0x83949e,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),800);footprint.count=0;scene.add(footprint);let footIndex=0,walked=0;const stamp=new THREE.Object3D();function step(){const side=footIndex%2?-.14:.14,x=me.position.x+Math.cos(me.rotation.y)*side,z=me.position.z-Math.sin(me.rotation.y)*side;stamp.position.set(x,hAt(x,z)+.04,z);stamp.rotation.set(-Math.PI/2,0,-me.rotation.y);stamp.updateMatrix();footprint.setMatrixAt(footIndex%800,stamp.matrix);footIndex++;footprint.count=Math.min(800,footIndex);footprint.instanceMatrix.needsUpdate=true;footprint.computeBoundingSphere();}
const flakes=new Float32Array(2400*3);for(let i=0;i<flakes.length;i++)flakes[i]=(rnd()-.5)*60;const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(flakes,3));const snowfall=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xf6fbff,size:.085,transparent:true,opacity:.75,depthWrite:false}));scene.add(snowfall);
const socket=io();function join(){socket.emit('join',{room:(run?'N:':'A:')+$('#room').value.slice(0,18),name:$('#name').value,x:me.position.x,z:me.position.z,ry:me.rotation.y});}socket.on('connect',()=>{if(active)join();});socket.on('disconnect',()=>{$('#online').textContent='Нет связи · переподключение';clearPlayers();fireDeadline=0;awaitingFire=false;autoKindle=false;});function clearPlayers(){for(const g of players.values())scene.remove(g);players.clear();}
function remote(p){if(p.id===socket.id)return;let g=players.get(p.id);if(!g){g=avatar(0x688694);g.position.set(p.x,hAt(p.x,p.z),p.z);players.set(p.id,g);}g.userData.target=new THREE.Vector3(p.x,hAt(p.x,p.z),p.z);g.userData.ry=p.ry;return g;}
socket.on('fire',data=>{if(!run||!Number.isFinite(data?.remaining))return;const wasLit=fireSeconds>0;fireSeconds=Math.max(0,Math.min(90,data.remaining));fireDeadline=performance.now()+fireSeconds*1000;awaitingFire=false;if(!wasLit&&fireSeconds>0)record(run,'В комнате разожжён общий костёр.');});
socket.on('state',ps=>{clearPlayers();ps.forEach(remote);});socket.on('joined',remote);socket.on('move',remote);socket.on('left',id=>{const g=players.get(id);if(g)scene.remove(g);players.delete(id);});
function clearKeys(){Object.keys(keys).forEach(k=>delete keys[k]);velocity.set(0,0);}function lock(){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}}
$('#go').onclick=()=>{if(!ready)return;startRun();active=true;$('#intro').hidden=true;$('#hud').hidden=false;$('#minimap').hidden=false;join();lock();};
function toggleMap(){if(!active||run)return;mapOpen=!mapOpen;$('#bigmap').hidden=!mapOpen;clearKeys();if(mapOpen)document.exitPointerLock();else {paused=false;lock();}}
$('#closemap').onclick=toggleMap;$('#mapButton').onclick=toggleMap;$('#weather').onclick=()=>{storm=!storm;$('#weather').textContent=storm?'Погода: метель':'Погода: снег';};
canvas.onclick=()=>{if(active&&!mapOpen&&!finished){paused=false;lock();}};canvas.addEventListener('pointerdown',()=>dragging=true);addEventListener('pointerup',()=>dragging=false);addEventListener('keydown',e=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyM'&&!e.repeat)toggleMap();if(e.code==='KeyV'&&!e.repeat){firstPerson=!firstPerson;me.visible=!firstPerson;updateCamera(1);}if(e.code==='Escape'){if(mapOpen)toggleMap();else{paused=true;clearKeys();}}});addEventListener('keyup',e=>delete keys[e.code]);addEventListener('blur',()=>{paused=true;clearKeys();});document.addEventListener('visibilitychange',clearKeys);document.addEventListener('pointerlockchange',clearKeys);
addEventListener('mousemove',e=>{if((document.pointerLockElement===canvas||dragging)&&!mapOpen){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.002,-1.15,1.1);}});canvas.addEventListener('wheel',e=>{distance=THREE.MathUtils.clamp(distance+e.deltaY*.008,3,14);e.preventDefault();},{passive:false});
const look=new THREE.Vector3(),desired=new THREE.Vector3();function updateCamera(dt){if(firstPerson){camera.position.copy(me.position);camera.position.y+=1.67;const shake=run?(100-run.hands)*.00015*Math.sin(run.elapsed*9):0;look.set(camera.position.x-Math.sin(yaw)*Math.cos(pitch),camera.position.y-Math.sin(pitch)+shake,camera.position.z-Math.cos(yaw)*Math.cos(pitch));camera.lookAt(look);return;}look.copy(me.position);look.y+=1.35;desired.set(look.x+Math.sin(yaw)*Math.cos(pitch)*distance,look.y+Math.sin(pitch)*distance,look.z+Math.cos(yaw)*Math.cos(pitch)*distance);for(let t=.15;t<=1;t+=.05){const x=THREE.MathUtils.lerp(look.x,desired.x,t),z=THREE.MathUtils.lerp(look.z,desired.z,t),y=THREE.MathUtils.lerp(look.y,desired.y,t);if(y<hAt(x,z)+.35){desired.lerpVectors(look,desired,Math.max(.15,t-.06));break;}}camera.position.lerp(desired,1-Math.exp(-12*dt));camera.position.y=Math.max(camera.position.y,hAt(camera.position.x,camera.position.z)+.3);camera.lookAt(look);}
function drawMaps(){for(const c of document.querySelectorAll('.mapcanvas')){c.width=c.height=600;const ctx=c.getContext('2d'),im=ctx.createImageData(600,600);for(let y=0;y<600;y++)for(let x=0;x<600;x++){const wx=(x/600-.5)*SIZE,wz=(y/600-.5)*SIZE,h=baseHeight(wx,wz),s=baseHeight(wx+10,wz)-h,shade=THREE.MathUtils.clamp(130-s*3+(h-650)*.12,65,210),i=(y*600+x)*4,contour=h%20<1.1?.7:1;im.data[i]=shade*.69*contour;im.data[i+1]=shade*.86*contour;im.data[i+2]=shade*contour;im.data[i+3]=255;}ctx.putImageData(im,0,0);ctx.strokeStyle='#96d5e3';ctx.lineWidth=2;ctx.beginPath();creek.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x/SIZE+.5)*600,(p.z/SIZE+.5)*600));ctx.stroke();}
for(const container of document.querySelectorAll('.mapmarkers'))for(const p of POIS){const b=document.createElement('button');b.className='poi '+p.source;b.style.left=(p.x/SIZE+.5)*100+'%';b.style.top=(p.z/SIZE+.5)*100+'%';b.textContent=String(POIS.indexOf(p)+1);b.title=p.label;b.setAttribute('aria-label',p.label);b.onclick=()=>showPoi(p);container.append(b);}const list=$('#poiList');POIS.forEach((p,i)=>{const b=document.createElement('button');b.textContent=`${i+1}. ${p.label}`;b.onclick=()=>showPoi(p);list.append(b);});showPoi(P.tent);}
function showPoi(p){$('#poiTitle').textContent=p.label;$('#poiNote').textContent=`${p.note} ${p.lat.toFixed(6)}° N, ${p.lon.toFixed(6)}° E.`;$('#source').href=sources[p.source];$('#travel').onclick=()=>{me.position.set(p.x+4,hAt(p.x+4,p.z+4),p.z+4);clearKeys();toggleMap();updateCamera(1);};}
function mapPos(el){el.style.left=(me.position.x/SIZE+.5)*100+'%';el.style.top=(me.position.z/SIZE+.5)*100+'%';el.style.transform=`translate(-50%,-50%) rotate(${-me.rotation.y}rad)`;}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();let send=0,hudTime=0;function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(ready){if(active&&!mapOpen&&!paused&&!finished){const f=(keys.KeyW?1:0)-(keys.KeyS?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0),dir=movement(f,r,yaw),speed=keys.ShiftLeft||keys.ShiftRight?5.8:2.8;velocity.lerp(new THREE.Vector2(dir.x*speed,dir.z*speed),1-Math.exp(-12*dt));const nx=THREE.MathUtils.clamp(me.position.x+velocity.x*dt,-SIZE/2+8,SIZE/2-8),nz=THREE.MathUtils.clamp(me.position.z+velocity.y*dt,-SIZE/2+8,SIZE/2-8);walked+=Math.hypot(nx-me.position.x,nz-me.position.z);me.position.set(nx,hAt(nx,nz),nz);if(velocity.length()>.1){const angle=Math.atan2(-velocity.x,-velocity.y);me.rotation.y+=Math.atan2(Math.sin(angle-me.rotation.y),Math.cos(angle-me.rotation.y))*(1-Math.exp(-14*dt));}if(walked>.65){step();walked=0;}}updateSurvival(dt);animate(me,velocity.length(),dt);updateCamera(dt);for(const g of players.values()){const d=g.position.distanceTo(g.userData.target);g.position.lerp(g.userData.target,1-Math.exp(-12*dt));g.rotation.y+=Math.atan2(Math.sin(g.userData.ry-g.rotation.y),Math.cos(g.userData.ry-g.rotation.y))*(1-Math.exp(-12*dt));animate(g,Math.min(d*12,6),dt);}snowfall.position.copy(me.position);for(let i=0;i<flakes.length;i+=3){flakes[i]+=dt*(storm?11:2);flakes[i+1]-=dt*(storm?5:1.5);if(flakes[i]>30)flakes[i]=-30;if(flakes[i+1]<-20)flakes[i+1]=30;}snowGeo.attributes.position.needsUpdate=true;scene.fog.density=storm?.045:run?.003:.0013;
if(active){send+=dt;if(send>.075&&socket.connected){socket.emit('move',{x:me.position.x,z:me.position.z,ry:me.rotation.y});send=0;}hudTime+=dt;if(hudTime>.2){hudTime=0;mapPos($('#you'));mapPos($('#youBig'));const near=POIS.reduce((a,b)=>Math.hypot(me.position.x-a.x,me.position.z-a.z)<Math.hypot(me.position.x-b.x,me.position.z-b.z)?a:b);$('#place').textContent=`${near.label} · ${Math.round(Math.hypot(me.position.x-near.x,me.position.z-near.z))} м`;if(socket.connected)$('#online').textContent=`${players.size+1} в экспедиции`;$('#position').textContent=`Высота DEM ${Math.round(baseHeight(me.position.x,me.position.z))} м · ${paused?'Пауза · нажмите на сцену':document.pointerLockElement===canvas?'Esc — пауза':'Мышь с зажатой кнопкой — обзор'}`;}}}ambience.update(dt,{active:active&&!paused&&!mapOpen&&!finished,storm,speed:velocity.length(),fire:run&&fireSeconds>0?Math.max(0,1-Math.hypot(me.position.x-CAMP.x,me.position.z-CAMP.z)/18):0});renderer.render(scene,camera);}
const camp=CAMP;
const fireGroup=new THREE.Group();scene.add(fireGroup);
const ember=mesh(new THREE.ConeGeometry(.38,.85,5),new THREE.MeshBasicMaterial({color:0xffb54e}),fireGroup,0,.55);
const fireLight=new THREE.PointLight(0xffa347,0,24,1.3);fireGroup.add(fireLight);fireLight.position.y=1.1;
for(let i=0;i<5;i++){const log=mesh(new THREE.CylinderGeometry(.1,.13,1.2,5),wood,fireGroup,0,.12);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/5;}
function startRun(){
 ambience.enable().then(updateSoundButton);$('#sound').hidden=false;
 firstPerson=true;me.visible=false;finished=false;paused=false;pitch=.08;
 if($('#mode').value!=='survival')return;
 run=newRun();record(run,'Выход от лесного кострища. Цель — верхнее укрытие.');
 document.body.classList.add('survival');$('#survivalHud').hidden=false;
 me.position.set(camp.x+2,hAt(camp.x+2,camp.z+3),camp.z+3);
 yaw=Math.atan2(me.position.x-P.tent.x,me.position.z-P.tent.z);me.rotation.y=yaw;
 fireGroup.position.set(camp.x,hAt(camp.x,camp.z),camp.z);fireGroup.visible=true;
 updateCamera(1);
}
fireGroup.visible=false;
function finishRun(){
 finished=true;paused=true;clearKeys();document.exitPointerLock();
 const result=outcomes[run.outcome];record(run,result.title);
 $('#outcomeTitle').textContent=result.title;$('#outcomeNote').textContent=result.note;
 $('#runSummary').textContent=`${nightTime(run.elapsed)} · пройдено ${Math.round(run.elapsed)} с · до укрытия ${Math.round(Math.hypot(me.position.x-P.tent.x,me.position.z-P.tent.z))} м · на открытом ветру ${Math.round(run.exposure)} с`;
 const list=$('#eventList');list.replaceChildren();for(const e of run.events){const li=document.createElement('li');li.textContent=`${nightTime(e.time)} — ${e.text}`;list.append(li);}
 let collection=[];try{collection=JSON.parse(localStorage.getItem('1079-outcomes')||'[]');if(!Array.isArray(collection))collection=[];if(!collection.includes(run.outcome))collection.push(run.outcome);localStorage.setItem('1079-outcomes',JSON.stringify(collection));}catch{}
 $('#collection').textContent=`Архив на этом устройстве: ${collection.filter(k=>outcomes[k]).length} / 3 исхода прототипа. В полном концепте — девять версий.`;
 $('#protocol').hidden=false;
}
$('#lightFire').onclick=()=>{autoKindle=!autoKindle;paused=false;};
function updateSoundButton(){$('#sound').textContent=ambience.enabled?'Звук: вкл':'Звук: выкл';$('#sound').setAttribute('aria-pressed',String(ambience.enabled));}
$('#sound').onclick=async()=>{if(ambience.enabled)ambience.mute();else await ambience.enable();updateSoundButton();};
$('#again').onclick=()=>location.reload();
function updateSurvival(dt){
 if(!run||finished)return;
 fireSeconds=Math.max(0,(fireDeadline-performance.now())/1000);
 const nearFire=Math.hypot(me.position.x-camp.x,me.position.z-camp.z)<5;
 if(!paused&&!mapOpen){
   const oldStorm=storm;storm=run.elapsed>120&&Math.floor((run.elapsed-120)/150)%2===0;
   if(storm!==oldStorm)record(run,storm?'Видимость упала. Началась метель.':'Ветер ослаб.');

   if(nearFire&&(keys.KeyE||autoKindle)&&fireSeconds===0&&velocity.length()<.3&&socket.connected&&!awaitingFire){if(lightingFire===0)socket.emit('kindle');lightingFire+=dt;const needed=3.2+(100-run.hands)*.09;if(lightingFire>=needed){socket.emit('ignite');awaitingFire=true;setTimeout(()=>awaitingFire=false,2000);lightingFire=0;autoKindle=false;}}
   else {lightingFire=0;autoKindle=false;}
   const companion=[...players.values()].some(g=>g.position.distanceTo(me.position)<5);
   tickRun(run,dt,{moving:velocity.length()>.3,storm,fire:nearFire&&fireSeconds>0,companion,sheltered:baseHeight(me.position.x,me.position.z)<735,goal:Math.hypot(me.position.x-P.tent.x,me.position.z-P.tent.z)<12});
   if(run.outcome)finishRun();
 }
 ember.visible=fireSeconds>0;ember.scale.setScalar(1+Math.sin(run.elapsed*13)*.12);fireLight.intensity=fireSeconds>0?20+Math.sin(run.elapsed*17)*3:0;
 $('#lightFire').hidden=!nearFire||fireSeconds>0;$('#lightFire').textContent=autoKindle?'Прекратить розжиг':'Разжечь костёр';
 $('#runClock').textContent=nightTime(run.elapsed);
 const angle=Math.atan2(P.tent.x-me.position.x,P.tent.z-me.position.z)-yaw+Math.PI;
 const bearing=Math.atan2(Math.sin(angle),Math.cos(angle));
 $('#runDirection').textContent=`${Math.abs(bearing)<.3?'↑':bearing>0?'←':'→'} Верхнее укрытие · ${Math.round(Math.hypot(me.position.x-P.tent.x,me.position.z-P.tent.z))} м`;
 $('#runHint').textContent=!socket.connected?'Связь потеряна · общий костёр недоступен':paused?'Пауза · нажмите на сцену':nearFire?(fireSeconds>0?`У огня · ещё ${Math.ceil(fireSeconds)} с`:awaitingFire?'Проверяем костёр…':lightingFire>0?(autoKindle?'Разжигаете… не двигайтесь':'Разжигаете… держите E'):'Кострище · стойте и удерживайте E'):run.heat<30?'Холод мешает думать. Вернитесь к огню.':storm?'Метель. Держитесь рядом.':'Свет уходит. Выбирайте путь.';
 for(const key of ['heat','hands','clarity'])$('#'+key).value=run[key];
 $('#vitals').style.opacity=nearFire||run.heat<40?'1':'.35';
 $('#coldVeil').style.opacity=String((100-run.heat)/180);
 const night=Math.min(1,run.elapsed/220),sky=new THREE.Color().lerpColors(new THREE.Color(0x9dabb5),new THREE.Color(0x192c40),night);
 renderer.setClearColor(sky);scene.fog.color.copy(sky);sun.intensity=2.3-night*1.8;
}

load();loop();
