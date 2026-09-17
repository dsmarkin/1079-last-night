import {createHiker,poseHiker,disposeHiker} from './character.js';
import {EnvironmentSound} from './sound.js';
import {nightTime,outcomes,pairOutcomes} from './survival.js';
import * as THREE from '/vendor/three.module.js';
import {SIZE,POIS,P,CAMP,creek,sources,movement,sample,decodeHeights,decodeTrees} from './world.js';
const ambience=new EnvironmentSound();
const $=s=>document.querySelector(s),canvas=$('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xadbcc6);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xadbcc6,.0013);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,4500);
scene.add(new THREE.HemisphereLight(0xe2efff,0x586267,2));const sun=new THREE.DirectionalLight(0xffefd7,2.3);sun.position.set(-500,700,-200);scene.add(sun);
let firstPerson=false,run=null,fireSeconds=0,lightingFire=0,finished=false,autoKindle=false,fireDeadline=0,kindling=false,kindleNeeded=0,runTime=0;
// Per-tab reconnect key: lets the server restore this participant's place in the night after a reload or a dropped connection. Never shared with other clients.
const token=(()=>{try{let t=sessionStorage.getItem('1079-token');if(!/^[A-Za-z0-9_-]{8,40}$/.test(t||'')){t=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('1079-token',t);}return t;}catch{return null;}})();
let heights,ready=false,active=false,mapOpen=false,yaw=-1.15,pitch=.32,distance=6,storm=false,paused=false,dragging=false;
const keys={},velocity=new THREE.Vector2(),players=new Map();
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true});
const snowMat=mat(0xe2e8ed),wood=mat(0x51443a),leaf=mat(0x304641),birchMat=mat(0x6d625e),coat=mat(0xb36a47),dark=mat(0x313d43);
function mesh(g,m,parent,x=0,y=0,z=0){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);parent.add(a);return a;}
function baseHeight(x,z){return heights?sample(heights,x,z):0;}
function creekDistance(x,z){let best=1e9;for(let i=1;i<creek.length;i++){const a=creek[i-1],b=creek[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best;}
function hAt(x,z){const d=creekDistance(x,z);return baseHeight(x,z)-3*Math.exp(-d*d/30);}
function avatar(color){const g=createHiker(THREE,{color});scene.add(g);return g;}
function animate(g,speed,dt,state={}){poseHiker(g,speed,dt,state);}
const me=avatar(0x4e6370);me.visible=false;
function terrainPatch(x,z,width,steps){const geo=new THREE.PlaneGeometry(width,width,steps,steps);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const px=x+pos.getX(i),pz=z+pos.getZ(i);pos.setXYZ(i,px,hAt(px,pz),pz);}if(width===SIZE){const keep=[],index=geo.index.array;for(let i=0;i<index.length;i+=3){const ids=[index[i],index[i+1],index[i+2]];const inside=ids.every(k=>Math.abs(pos.getX(k)-P.ravine.x)<118&&Math.abs(pos.getZ(k)-P.ravine.z)<118);if(!inside)keep.push(...ids);}geo.setIndex(keep);}geo.computeVertexNormals();return mesh(geo,snowMat,scene);}
let seed=1959;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
// Trees at the positions of the Meta/WRI canopy height model (local maxima ≥ 3 m); the species mix is a documented assumption (docs/MAP.md of the Unity repo).
function vegetation(trees){const conifers=trees.filter(t=>t.species!==2),birches=trees.filter(t=>t.species===2),dummy=new THREE.Object3D();
const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.2,1,5),wood,trees.length),tiers=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),leaf,conifers.length*3),caps=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),snowMat,conifers.length),crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),birchMat,birches.length);
let n=0,k=0,c=0,b=0;for(const t of trees){if(creekDistance(t.x,t.z)<2.2||Math.hypot(t.x-P.cedar.x,t.z-P.cedar.z)<3.5)continue;const y=hAt(t.x,t.z),ht=t.h;dummy.rotation.set(0,rnd()*6.28,0);dummy.position.set(t.x,y+ht*(t.species===2?.45:.3),t.z);dummy.scale.set(1,ht*(t.species===2?.9:.6),1);dummy.updateMatrix();trunks.setMatrixAt(n++,dummy.matrix);
if(t.species===2){dummy.position.set(t.x,y+ht*.62,t.z);dummy.scale.set(ht*.18,ht*.3,ht*.18);dummy.updateMatrix();crowns.setMatrixAt(b++,dummy.matrix);continue;}
const wide=t.species===3?.3:t.species===1?.17:.22;for(let j=0;j<3;j++){const w=(1-j*.25)*ht*wide;dummy.position.set(t.x,y+ht*(.12+j*.24)+ht*.2,t.z);dummy.scale.set(w,ht*.42,w);dummy.updateMatrix();tiers.setMatrixAt(k++,dummy.matrix);}
dummy.position.set(t.x,y+ht*.83,t.z);dummy.scale.set(ht*wide*.45,ht*.2,ht*wide*.45);dummy.updateMatrix();caps.setMatrixAt(c++,dummy.matrix);}
trunks.count=n;tiers.count=k;caps.count=c;crowns.count=b;scene.add(trunks,tiers,caps,crowns);}
// Tent of 1 Feb 1959: 4.33 × 2 m, ridge ≈1.05 m (height assumed), ridge along the contour, entrance toward the pass, levelled platform, skis under the floor.
function tentModel(){const g=new THREE.Group(),L=4.33,W=2,H=1.05,wall=.5,canvas=mat(0x77775a);
const shape=new THREE.Shape([new THREE.Vector2(-W/2,0),new THREE.Vector2(W/2,0),new THREE.Vector2(W/2,wall),new THREE.Vector2(0,H),new THREE.Vector2(-W/2,wall)]);
const body=new THREE.ExtrudeGeometry(shape,{depth:L,bevelEnabled:false});body.translate(0,0,-L/2);mesh(body,canvas,g,0,.04,0);
mesh(new THREE.BoxGeometry(W+2.2,1.3,L+1.6),snowMat,g,.5,-.62,0);for(let i=0;i<16;i++)mesh(new THREE.BoxGeometry(.075,.022,2.05),mat(0x8c6139),g,-W/2+.12+(i%8)*(W-.24)/7,.012,(i<8?-1:1)*1.07);
mesh(new THREE.PlaneGeometry(.7,.9),mat(0xe6e6de),g,0,.45,L/2+.03);const pole=new THREE.CylinderGeometry(.01,.01,1.4,5);for(const e of [-1,1])for(const sd of [-1,1]){const m=mesh(pole,wood,g,sd*.12,.6,e*(L/2+.06));m.rotation.z=sd*.28;}
const axe=mesh(new THREE.CylinderGeometry(.016,.016,.9,6),wood,g,.75,.2,L/2+.45);axe.rotation.z=.05;return g;}
function placeTent(){const t=P.tent,e=6,gx=(baseHeight(t.x+e,t.z)-baseHeight(t.x-e,t.z))/(2*e),gz=(baseHeight(t.x,t.z+e)-baseHeight(t.x,t.z-e))/(2*e),g=Math.hypot(gx,gz)||1,dx=-gx/g,dz=-gz/g;
let cx=-dz,cz=dx;if(cx*(P.saddle.x-t.x)+cz*(P.saddle.z-t.z)<0){cx=-cx;cz=-cz;}const tent=tentModel();tent.rotation.y=Math.atan2(cx,cz);
const right={x:Math.cos(tent.rotation.y),z:-Math.sin(tent.rotation.y)};if(right.x*dx+right.z*dz<0)tent.scale.x=-1;tent.position.set(t.x,hAt(t.x-dx*1.1,t.z-dz*1.1)-.05,t.z);scene.add(tent);}
// Labaz: birch-bark floor 1.5 × 1.0 m in a snow pit, covered with firewood and fir branches, marked by a ski with a torn gaiter.
function labazModel(){const g=new THREE.Group();for(let i=0;i<10;i++){const a=i/10*6.28;const m=mesh(new THREE.SphereGeometry(.55,8,5),snowMat,g,Math.cos(a)*1.3,0,Math.sin(a)*1.05);m.scale.y=1.3;}
mesh(new THREE.BoxGeometry(1.5,.02,1),mat(0xd9ccb3),g,0,.01,0);for(let i=0;i<5;i++){const log=mesh(new THREE.CylinderGeometry(.07,.07,1.7,7),wood,g,0,.32,-.45+i*.22);log.rotation.z=Math.PI/2;}
mesh(new THREE.BoxGeometry(.075,2.1,.022),mat(0x8c6139),g,-1.2,.7,-.9);mesh(new THREE.CylinderGeometry(.08,.09,.25,8),mat(0x3a4d72),g,-1.15,1.15,-.9);return g;}
// Hero cedar (Siberian pine): 18 m from the canopy model, branches broken up to 4.5 m on the side facing the tent; fire pit 1.5 m toward the tent.
function cedarModel(){const cedar=new THREE.Group(),toTent=Math.atan2(P.tent.x-P.cedar.x,P.tent.z-P.cedar.z);mesh(new THREE.CylinderGeometry(.18,.42,18,9),wood,cedar,0,9);
for(let i=0;i<34;i++){const a=i*2.4+rnd()*.3,y=1.2+i*.48,broken=y<4.5&&Math.abs(((a-toTent+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)<1.3;const len=broken?.3:Math.min(3.8,2.2+Math.sin(Math.PI*Math.min(1,y/16+.2))*1.8)*(1-y/22);
const br=mesh(new THREE.CylinderGeometry(.03,.07,len,5),wood,cedar,Math.sin(a)*len/2,y+len*.15,Math.cos(a)*len/2);br.rotation.set(Math.cos(a)*1.25,0,-Math.sin(a)*1.25);if(!broken&&y>2.2){const f=mesh(new THREE.SphereGeometry(len*.45,7,5),leaf,cedar,Math.sin(a)*len*.8,y+.3,Math.cos(a)*len*.8);f.scale.y=.45;}}
const fx=Math.sin(toTent)*1.5,fz=Math.cos(toTent)*1.5;mesh(new THREE.CircleGeometry(.45,12),mat(0x151311),cedar,fx,.02,fz).rotation.x=-Math.PI/2;for(let i=0;i<7;i++){const a=i/7*6.28;const b=mesh(new THREE.CylinderGeometry(.035,.04,.7,6),mat(0x222019),cedar,fx+Math.cos(a)*.3,.05,fz+Math.sin(a)*.3);b.rotation.set(Math.PI/2,0,-a);}
cedar.position.set(P.cedar.x,hAt(P.cedar.x,P.cedar.z)-.05,P.cedar.z);scene.add(cedar);}
function decorate(trees){vegetation(trees);placeTent();const labaz=labazModel();labaz.position.set(P.labaz.x,hAt(P.labaz.x,P.labaz.z),P.labaz.z);scene.add(labaz);cedarModel();
for(const p of POIS){if(p.id==='tent'||p.kind==='version')continue;const g=new THREE.Group();mesh(new THREE.CylinderGeometry(.06,.06,1.5,6),wood,g,0,.75);mesh(new THREE.BoxGeometry(.5,.28,.06),mat(p.kind==='event'?0xd7ae62:0x87baba),g,0,1.5);g.position.set(p.x+3,hAt(p.x+3,p.z),p.z);scene.add(g);}
// A one-metre mesh resolves the illustrative incision; its width/depth are not surveyed.
const patch=terrainPatch(P.ravine.x,P.ravine.z,240,240);patch.position.y=.025;
const pts=[];for(let i=1;i<creek.length;i++){const a=creek[i-1],b=creek[i];for(let k=0;k<40;k++){const t=k/40,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);pts.push(new THREE.Vector3(x,hAt(x,z)+.1,z));}}
mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,.6,5,false),mat(0x7a929d),scene);
for(let i=0;i<65;i++){const p=pts[Math.floor(rnd()*pts.length)],x=p.x+(rnd()-.5)*8,z=p.z+(rnd()-.5)*8;const rock=mesh(new THREE.DodecahedronGeometry(.3+rnd()*.6),mat(0x899194),scene,x,hAt(x,z)+.15,z);rock.scale.y=.55;}
me.position.set(P.tent.x+5,hAt(P.tent.x+5,P.tent.z+7),P.tent.z+7);me.visible=true;ready=true;$('#go').disabled=false;$('#go').textContent='НАЧАТЬ МАРШРУТ';updateCamera(1);}
async function load(){try{const [hb,tb]=await Promise.all(['/data/height_1025.r16','/data/trees.f32'].map(u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.arrayBuffer();})));heights=decodeHeights(new Uint16Array(hb));terrainPatch(0,0,SIZE,640);decorate(decodeTrees(new Float32Array(tb)));drawMaps();$('#loading').hidden=true;}catch(e){$('#loading').textContent='Не удалось загрузить рельеф. Обновите страницу.';console.error(e);}}
const footprint=new THREE.InstancedMesh(new THREE.PlaneGeometry(.18,.32),new THREE.MeshBasicMaterial({color:0x83949e,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),800);footprint.count=0;scene.add(footprint);let footIndex=0,walked=0;const stamp=new THREE.Object3D();function step(){const side=footIndex%2?-.14:.14,x=me.position.x+Math.cos(me.rotation.y)*side,z=me.position.z-Math.sin(me.rotation.y)*side;stamp.position.set(x,hAt(x,z)+.04,z);stamp.rotation.set(-Math.PI/2,0,-me.rotation.y);stamp.updateMatrix();footprint.setMatrixAt(footIndex%800,stamp.matrix);footIndex++;footprint.count=Math.min(800,footIndex);footprint.instanceMatrix.needsUpdate=true;footprint.computeBoundingSphere();}
const flakes=new Float32Array(2400*3);for(let i=0;i<flakes.length;i++)flakes[i]=(rnd()-.5)*60;const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(flakes,3));const snowfall=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xf6fbff,size:.085,transparent:true,opacity:.75,depthWrite:false}));scene.add(snowfall);
const socket=io();function join(){socket.emit('join',{room:(run?'N:':'A:')+$('#room').value.slice(0,18),name:$('#name').value,token,x:me.position.x,z:me.position.z,ry:me.rotation.y});}socket.on('connect',()=>{if(active)join();});socket.on('disconnect',()=>{$('#online').textContent='Нет связи · переподключение';clearPlayers();kindling=false;autoKindle=false;});function clearPlayers(){for(const g of players.values()){scene.remove(g);disposeHiker(g);}players.clear();}
function remote(p){if(p.id===socket.id)return;let g=players.get(p.id);if(!g){g=avatar(0x688694);g.position.set(p.x,hAt(p.x,p.z),p.z);players.set(p.id,g);}g.userData.target=new THREE.Vector3(p.x,hAt(p.x,p.z),p.z);g.userData.ry=p.ry;g.userData.action=p.action||'idle';return g;}
// The server owns the night: clock, weather, resources, fire and outcomes arrive as snapshots; the client only renders and sends intent.
socket.on('run',snap=>{if(!run||!snap||typeof snap!=='object'||(finished&&run.pair))return;
 run.elapsed=snap.elapsed;runTime=performance.now();storm=Boolean(snap.storm);run.events=Array.isArray(snap.events)?snap.events:run.events;run.pair=snap.outcome||null;run.players=Array.isArray(snap.players)?snap.players:[];
 fireDeadline=performance.now()+Math.max(0,snap.fire||0)*1000;
 const you=snap.you;if(you){for(const k of ['heat','hands','clarity','exposure'])if(Number.isFinite(you[k]))run[k]=you[k];run.outcome=you.outcome||null;if(you.kindling){lightingFire=you.kindling.progress;kindleNeeded=you.kindling.needed;}else{lightingFire=0;kindleNeeded=0;if(kindling&&!keys.KeyE&&!autoKindle)kindling=false;}}
 if(run.outcome&&!finished)finishRun();if(finished)showPair();});
socket.on('state',ps=>{clearPlayers();ps.forEach(remote);const mine=ps.find(p=>p.id===socket.id);if(mine&&run&&!finished&&Number.isFinite(mine.x)){me.position.set(mine.x,hAt(mine.x,mine.z),mine.z);updateCamera(1);}});socket.on('joined',remote);socket.on('move',remote);socket.on('left',id=>{const g=players.get(id);if(g){scene.remove(g);disposeHiker(g);}players.delete(id);});
function clearKeys(){Object.keys(keys).forEach(k=>delete keys[k]);velocity.set(0,0);}function lock(){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}}
$('#go').onclick=()=>{if(!ready)return;startRun();active=true;$('#intro').hidden=true;$('#hud').hidden=false;$('#minimap').hidden=false;join();lock();};
function toggleMap(){if(!active||run)return;mapOpen=!mapOpen;$('#bigmap').hidden=!mapOpen;clearKeys();if(mapOpen)document.exitPointerLock();else {paused=false;lock();}}
$('#closemap').onclick=toggleMap;$('#mapButton').onclick=toggleMap;$('#weather').onclick=()=>{storm=!storm;$('#weather').textContent=storm?'Погода: метель':'Погода: снег';};
canvas.onclick=()=>{if(active&&!mapOpen&&!finished){paused=false;lock();}};canvas.addEventListener('pointerdown',()=>dragging=true);addEventListener('pointerup',()=>dragging=false);addEventListener('keydown',e=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyM'&&!e.repeat)toggleMap();if(e.code==='KeyV'&&!e.repeat){firstPerson=!firstPerson;me.visible=!firstPerson;updateCamera(1);}if(e.code==='Escape'){if(mapOpen)toggleMap();else{paused=true;clearKeys();}}});addEventListener('keyup',e=>delete keys[e.code]);addEventListener('blur',()=>{paused=true;clearKeys();});document.addEventListener('visibilitychange',clearKeys);document.addEventListener('pointerlockchange',clearKeys);
addEventListener('mousemove',e=>{if((document.pointerLockElement===canvas||dragging)&&!mapOpen){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.002,-1.15,1.1);}});canvas.addEventListener('wheel',e=>{distance=THREE.MathUtils.clamp(distance+e.deltaY*.008,3,14);e.preventDefault();},{passive:false});
const look=new THREE.Vector3(),desired=new THREE.Vector3();function updateCamera(dt){if(firstPerson){camera.position.copy(me.position);camera.position.y+=1.72;const shake=run?(100-run.hands)*.00015*Math.sin(performance.now()*.009):0;look.set(camera.position.x-Math.sin(yaw)*Math.cos(pitch),camera.position.y-Math.sin(pitch)+shake,camera.position.z-Math.cos(yaw)*Math.cos(pitch));camera.lookAt(look);return;}look.copy(me.position);look.y+=1.35;desired.set(look.x+Math.sin(yaw)*Math.cos(pitch)*distance,look.y+Math.sin(pitch)*distance,look.z+Math.cos(yaw)*Math.cos(pitch)*distance);for(let t=.15;t<=1;t+=.05){const x=THREE.MathUtils.lerp(look.x,desired.x,t),z=THREE.MathUtils.lerp(look.z,desired.z,t),y=THREE.MathUtils.lerp(look.y,desired.y,t);if(y<hAt(x,z)+.35){desired.lerpVectors(look,desired,Math.max(.15,t-.06));break;}}camera.position.lerp(desired,1-Math.exp(-12*dt));camera.position.y=Math.max(camera.position.y,hAt(camera.position.x,camera.position.z)+.3);camera.lookAt(look);}
function drawMaps(){for(const c of document.querySelectorAll('.mapcanvas')){c.width=c.height=600;const ctx=c.getContext('2d'),im=ctx.createImageData(600,600);for(let y=0;y<600;y++)for(let x=0;x<600;x++){const wx=(x/600-.5)*SIZE,wz=(y/600-.5)*SIZE,h=baseHeight(wx,wz),s=baseHeight(wx+10,wz)-h,shade=THREE.MathUtils.clamp(130-s*3+(h-650)*.12,65,210),i=(y*600+x)*4,contour=h%20<1.1?.7:1;im.data[i]=shade*.69*contour;im.data[i+1]=shade*.86*contour;im.data[i+2]=shade*contour;im.data[i+3]=255;}ctx.putImageData(im,0,0);ctx.strokeStyle='#96d5e3';ctx.lineWidth=2;ctx.beginPath();creek.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x/SIZE+.5)*600,(p.z/SIZE+.5)*600));ctx.stroke();}
for(const container of document.querySelectorAll('.mapmarkers'))for(const p of POIS){const b=document.createElement('button');b.className='poi '+p.cls;b.style.left=(p.x/SIZE+.5)*100+'%';b.style.top=(p.z/SIZE+.5)*100+'%';b.textContent=String(POIS.indexOf(p)+1);b.title=p.label;b.setAttribute('aria-label',p.label);b.onclick=()=>showPoi(p);container.append(b);}const list=$('#poiList');POIS.forEach((p,i)=>{const b=document.createElement('button');b.textContent=`${i+1}. ${p.label}`;b.onclick=()=>showPoi(p);list.append(b);});showPoi(P.tent);}
function showPoi(p){$('#poiTitle').textContent=p.label;$('#poiNote').textContent=`${p.note} ${p.lat.toFixed(6)}° N, ${p.lon.toFixed(6)}° E.`;$('#source').href=sources[p.source];$('#travel').onclick=()=>{me.position.set(p.x+4,hAt(p.x+4,p.z+4),p.z+4);clearKeys();toggleMap();updateCamera(1);};}
function mapPos(el){el.style.left=(me.position.x/SIZE+.5)*100+'%';el.style.top=(me.position.z/SIZE+.5)*100+'%';el.style.transform=`translate(-50%,-50%) rotate(${-me.rotation.y}rad)`;}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();let send=0,hudTime=0;function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(ready){if(active&&!mapOpen&&!paused&&!finished){const f=(keys.KeyW?1:0)-(keys.KeyS?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0),dir=movement(f,r,yaw),speed=keys.ShiftLeft||keys.ShiftRight?5.8:2.8;velocity.lerp(new THREE.Vector2(dir.x*speed,dir.z*speed),1-Math.exp(-12*dt));const nx=THREE.MathUtils.clamp(me.position.x+velocity.x*dt,-SIZE/2+8,SIZE/2-8),nz=THREE.MathUtils.clamp(me.position.z+velocity.y*dt,-SIZE/2+8,SIZE/2-8);walked+=Math.hypot(nx-me.position.x,nz-me.position.z);me.position.set(nx,hAt(nx,nz),nz);if(velocity.length()>.1){const angle=Math.atan2(-velocity.x,-velocity.y);me.rotation.y+=Math.atan2(Math.sin(angle-me.rotation.y),Math.cos(angle-me.rotation.y))*(1-Math.exp(-14*dt));}if(walked>.65){step();walked=0;}}updateSurvival(dt);animate(me,velocity.length(),dt,{cold:run?Math.max(0,(60-run.heat)/60):0,kindle:lightingFire>0});updateCamera(dt);for(const g of players.values()){const d=g.position.distanceTo(g.userData.target);g.position.lerp(g.userData.target,1-Math.exp(-12*dt));g.rotation.y+=Math.atan2(Math.sin(g.userData.ry-g.rotation.y),Math.cos(g.userData.ry-g.rotation.y))*(1-Math.exp(-12*dt));animate(g,Math.min(d*12,6),dt,{cold:g.userData.action==='cold'?1:0,kindle:g.userData.action==='kindle'});}snowfall.position.copy(me.position);for(let i=0;i<flakes.length;i+=3){flakes[i]+=dt*(storm?11:2);flakes[i+1]-=dt*(storm?5:1.5);if(flakes[i]>30)flakes[i]=-30;if(flakes[i+1]<-20)flakes[i+1]=30;}snowGeo.attributes.position.needsUpdate=true;scene.fog.density=storm?.045:run?.003:.0013;
if(active){send+=dt;if(send>.075&&socket.connected){socket.emit('move',{x:me.position.x,z:me.position.z,ry:me.rotation.y,action:lightingFire>0?'kindle':run&&run.heat<40?'cold':'idle'});send=0;}hudTime+=dt;if(hudTime>.2){hudTime=0;mapPos($('#you'));mapPos($('#youBig'));const near=POIS.reduce((a,b)=>Math.hypot(me.position.x-a.x,me.position.z-a.z)<Math.hypot(me.position.x-b.x,me.position.z-b.z)?a:b);$('#place').textContent=`${near.label} · ${Math.round(Math.hypot(me.position.x-near.x,me.position.z-near.z))} м`;if(socket.connected)$('#online').textContent=`${players.size+1} в экспедиции`;$('#position').textContent=`Высота DEM ${Math.round(baseHeight(me.position.x,me.position.z))} м · ${paused?'Пауза · нажмите на сцену':document.pointerLockElement===canvas?'Esc — пауза':'Мышь с зажатой кнопкой — обзор'}`;}}}ambience.update(dt,{active:active&&!paused&&!mapOpen&&!finished,storm,speed:velocity.length(),fire:run&&fireSeconds>0?Math.max(0,1-Math.hypot(me.position.x-CAMP.x,me.position.z-CAMP.z)/18):0});renderer.render(scene,camera);}
const camp=CAMP;
const fireGroup=new THREE.Group();scene.add(fireGroup);
const ember=mesh(new THREE.ConeGeometry(.38,.85,5),new THREE.MeshBasicMaterial({color:0xffb54e}),fireGroup,0,.55);
const fireLight=new THREE.PointLight(0xffa347,0,24,1.3);fireGroup.add(fireLight);fireLight.position.y=1.1;
for(let i=0;i<5;i++){const log=mesh(new THREE.CylinderGeometry(.1,.13,1.2,5),wood,fireGroup,0,.12);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/5;}
function startRun(){
 ambience.enable().then(updateSoundButton);$('#sound').hidden=false;
 firstPerson=true;me.visible=false;finished=false;paused=false;pitch=.08;
 if($('#mode').value!=='survival')return;
 run={elapsed:0,heat:100,hands:100,clarity:100,exposure:0,events:[],outcome:null,pair:null,players:[]};runTime=performance.now();
 document.body.classList.add('survival');$('#survivalHud').hidden=false;
 me.position.set(camp.x+2,hAt(camp.x+2,camp.z+3),camp.z+3);
 yaw=Math.atan2(me.position.x-P.tent.x,me.position.z-P.tent.z);me.rotation.y=yaw;
 fireGroup.position.set(camp.x,hAt(camp.x,camp.z),camp.z);fireGroup.visible=true;
 updateCamera(1);
}
fireGroup.visible=false;
function finishRun(){
 finished=true;paused=true;clearKeys();document.exitPointerLock();
 const result=outcomes[run.outcome];
 $('#outcomeTitle').textContent=result.title;$('#outcomeNote').textContent=result.note;
 $('#runSummary').textContent=`${nightTime(run.elapsed)} · пройдено ${Math.round(run.elapsed)} с · до укрытия ${Math.round(Math.hypot(me.position.x-P.tent.x,me.position.z-P.tent.z))} м · на открытом ветру ${Math.round(run.exposure)} с`;
 renderEvents();showPair();
 let collection=[];try{collection=JSON.parse(localStorage.getItem('1079-outcomes')||'[]');if(!Array.isArray(collection))collection=[];if(!collection.includes(run.outcome))collection.push(run.outcome);localStorage.setItem('1079-outcomes',JSON.stringify(collection));}catch{}
 $('#collection').textContent=`Архив на этом устройстве: ${collection.filter(k=>outcomes[k]).length} / 3 исхода прототипа. В полном концепте — девять версий.`;
 $('#protocol').hidden=false;
}
function renderEvents(){const list=$('#eventList');if(list.childElementCount===run.events.length)return;list.replaceChildren();for(const e of run.events){const li=document.createElement('li');li.textContent=`${nightTime(e.time)} — ${e.text}`;list.append(li);}}
function showPair(){renderEvents();const others=run.players.filter(p=>!p.you);const el=$('#pairOutcome');
 if(run.pair){const r=pairOutcomes[run.pair]||outcomes[run.pair];el.textContent=others.length?`Итог ночи для комнаты: ${r.title}. ${r.note}`:'';return;}
 el.textContent=others.length?`Ночь комнаты продолжается: ${others.map(p=>`${p.name} — ${p.outcome?outcomes[p.outcome].title.toLowerCase():p.online?'ещё на склоне':'без связи'}`).join(', ')}.`:'';}
$('#lightFire').onclick=()=>{autoKindle=!autoKindle;paused=false;};
function updateSoundButton(){$('#sound').textContent=ambience.enabled?'Звук: вкл':'Звук: выкл';$('#sound').setAttribute('aria-pressed',String(ambience.enabled));}
$('#sound').onclick=async()=>{if(ambience.enabled)ambience.mute();else await ambience.enable();updateSoundButton();};
$('#again').onclick=()=>{try{sessionStorage.removeItem('1079-token');}catch{}location.reload();};
function updateSurvival(dt){
 if(!run||finished)return;
 fireSeconds=Math.max(0,(fireDeadline-performance.now())/1000);
 const nearFire=Math.hypot(me.position.x-camp.x,me.position.z-camp.z)<5,t=(performance.now()-runTime)/1000+run.elapsed;
 const wantFire=!paused&&!mapOpen&&nearFire&&(keys.KeyE||autoKindle)&&fireSeconds===0&&velocity.length()<.3&&socket.connected;
 if(wantFire&&!kindling){socket.emit('kindle');kindling=true;}
 else if(!wantFire&&kindling){socket.emit('kindle:stop');kindling=false;lightingFire=0;autoKindle=false;}
 if(fireSeconds>0)autoKindle=false;
 ember.visible=fireSeconds>0;ember.scale.setScalar(1+Math.sin(t*13)*.12);fireLight.intensity=fireSeconds>0?20+Math.sin(t*17)*3:0;
 $('#lightFire').hidden=!nearFire||fireSeconds>0;$('#lightFire').textContent=autoKindle?'Прекратить розжиг':'Разжечь костёр';
 $('#runClock').textContent=nightTime(run.elapsed);
 const angle=Math.atan2(P.tent.x-me.position.x,P.tent.z-me.position.z)-yaw+Math.PI;
 const bearing=Math.atan2(Math.sin(angle),Math.cos(angle));
 $('#runDirection').textContent=`${Math.abs(bearing)<.3?'↑':bearing>0?'←':'→'} Верхнее укрытие · ${Math.round(Math.hypot(me.position.x-P.tent.x,me.position.z-P.tent.z))} м`;
 const kindleHint=kindleNeeded?` ${Math.min(99,Math.round(lightingFire/kindleNeeded*100))}%`:'';
 $('#runHint').textContent=!socket.connected?'Связь потеряна · ночь идёт на сервере, место сохраняется':paused?'Пауза · ночь продолжается, нажмите на сцену':nearFire?(fireSeconds>0?`У огня · ещё ${Math.ceil(fireSeconds)} с`:kindling?(autoKindle?`Разжигаете… не двигайтесь${kindleHint}`:`Разжигаете… держите E${kindleHint}`):'Кострище · стойте и удерживайте E'):run.heat<30?'Холод мешает думать. Вернитесь к огню.':storm?'Метель. Держитесь рядом.':'Свет уходит. Выбирайте путь.';
 for(const key of ['heat','hands','clarity'])$('#'+key).value=run[key];
 const others=run.players.filter(p=>!p.you);$('#runParty').textContent=others.length?others.map(p=>`${p.name}: ${p.outcome?outcomes[p.outcome].title.toLowerCase():p.online?'на склоне':'без связи'}`).join(' · '):'';
 $('#vitals').style.opacity=nearFire||run.heat<40?'1':'.35';
 $('#coldVeil').style.opacity=String((100-run.heat)/180);
 const night=Math.min(1,run.elapsed/220),sky=new THREE.Color().lerpColors(new THREE.Color(0x9dabb5),new THREE.Color(0x192c40),night);
 renderer.setClearColor(sky);scene.fog.color.copy(sky);sun.intensity=2.3-night*1.8;
}

load();loop();
