// Original procedural character, built from the project's concept sheet.
// Inject Three.js so the same skeleton can be tested/exported in Node and rendered in-browser.
export function createHiker(T,{color=0x596d7b}={}) {
  const root=new T.Group();root.name='ExpeditionHiker';
  const bones=[],rig={};
  function bone(name,parent,x,y,z=0){const b=new T.Bone();b.name=name;b.position.set(x,y,z);(parent||root).add(b);rig[name]=b;bones.push(b);return b;}
  const hips=bone('hips',null,0,.88),spine=bone('spine',hips,0,.30),chest=bone('chest',spine,0,.16),head=bone('head',chest,0,.33);
  bone('pack',chest,0,0,.27);
  for(const [side,sign] of [['L',-1],['R',1]]){
    const arm=bone('upperArm'+side,chest,sign*.32,.08);
    const forearm=bone('forearm'+side,arm,0,-.29);bone('hand'+side,forearm,0,-.25);
    const thigh=bone('thigh'+side,hips,sign*.145,-.02);
    const shin=bone('shin'+side,thigh,0,-.37);bone('foot'+side,shin,0,-.35);
  }
  root.updateMatrixWorld(true);
  const vertices=[],normals=[],colors=[],indices=[],weights=[];
  const palette={coat:color,pants:0x303c43,boot:0x565850,sole:0x222b30,lining:0x202b32,skin:0xad8c75,scarf:0xafa894,pack:0x5d6551,leather:0x655143,metal:0x83918f,snow:0xbecbd1};
  function part(geometry,shade,joint,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0],blend=null){
    const g=geometry.index?geometry.toNonIndexed():geometry;
    const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));g.applyMatrix4(matrix);g.computeVertexNormals();
    const p=g.attributes.position,n=g.attributes.normal,c=new T.Color(shade),bi=bones.indexOf(rig[joint]);
    for(let i=0;i<p.count;i++){
      vertices.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));
      // Subtle per-face tonal variation; lighting still supplies the large forms.
      const shadeFactor=1-((Math.floor(i/3)*13)%7)*.007;
      colors.push(c.r*shadeFactor,c.g*shadeFactor,c.b*shadeFactor);
      if(blend){const [a,b,t]=blend(p.getY(i));indices.push(bones.indexOf(rig[a]),bones.indexOf(rig[b]),0,0);weights.push(1-t,t,0,0);}
      else{indices.push(bi,0,0,0);weights.push(1,0,0,0);}
    }
    g.dispose();if(g!==geometry)geometry.dispose();
  }
  const box=(size,shade,joint,pos,rot)=>part(new T.BoxGeometry(...size),shade,joint,pos,undefined,rot);
  const oval=(size,shade,joint,pos)=>part(new T.SphereGeometry(1,10,6),shade,joint,pos,size);
  const cylinder=(r1,r2,h,shade,joint,pos,rot)=>part(new T.CylinderGeometry(r1,r2,h,8),shade,joint,pos,undefined,rot);
  function bar(a,b,r,shade,joint){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());part(new T.CylinderGeometry(r,r,d.length(),5),shade,joint,va.add(vb).multiplyScalar(.5).toArray(),undefined,new T.Euler().setFromQuaternion(q).toArray().slice(0,3));}
  const rings=[[.74,.335,.23],[.97,.28,.20],[1.13,.27,.205],[1.33,.30,.21],[1.43,.28,.19],[1.48,.19,.15]],points=[];
  const point=(r,j)=>[Math.cos(j/10*Math.PI*2)*r[1],r[0],Math.sin(j/10*Math.PI*2)*r[2]];
  for(let r=0;r<rings.length-1;r++)for(let j=0;j<10;j++){const a=point(rings[r],j),b=point(rings[r],j+1),c=point(rings[r+1],j),d=point(rings[r+1],j+1);points.push(...a,...c,...b,...b,...c,...d);}
  const torso=new T.BufferGeometry();torso.setAttribute('position',new T.Float32BufferAttribute(points,3));
  const torsoBlend=y=>y<1.18?['hips','spine',Math.max(0,Math.min(1,(y-.9)/.28))]:['spine','chest',Math.max(0,Math.min(1,(y-1.18)/.22))];
  part(torso,palette.coat,'spine',undefined,undefined,undefined,torsoBlend);
  cylinder(.19,.22,.1,palette.scarf,'head',[0,1.5,0]);
  oval([.245,.285,.23],palette.coat,'head',[0,1.69,.045]);
  oval([.173,.215,.035],palette.lining,'head',[0,1.685,-.185]);
  part(new T.TorusGeometry(.192,.049,5,10),palette.coat,'head',[0,1.69,-.17],[1,1.19,1]);
  oval([.127,.15,.035],palette.skin,'head',[0,1.68,-.219]);
  box([.27,.058,.045],palette.pants,'head',[0,1.79,-.22]);
  oval([.17,.106,.067],palette.scarf,'head',[0,1.59,-.225]);
  for(const x of [-.057,.057])box([.035,.012,.012],palette.lining,'head',[x,1.713,-.254]);
  oval([.027,.035,.034],palette.skin,'head',[0,1.67,-.252]);
  // Front placket, belt and two large lower pockets.
  box([.035,.39,.022],0x455963,'spine',[0,1.21,-.208]);
  box([.53,.048,.025],palette.leather,'spine',[0,1.05,-.206]);
  box([.07,.06,.03],palette.metal,'spine',[0,1.05,-.226]);
  for(const x of [-.16,.16]){box([.16,.145,.027],0x4b606e,'hips',[x,.875,-.208]);box([.175,.035,.035],color,'hips',[x,.948,-.228]);}
  for(const [side,sign] of [['L',-1],['R',1]]){
    oval([.14,.15,.155],color,'upperArm'+side,[sign*.32,1.39,0]);
    cylinder(.135,.108,.29,color,'upperArm'+side,[sign*.32,1.275,0]);
    oval([.108,.105,.113],color,'forearm'+side,[sign*.32,1.13,0]);
    cylinder(.112,.084,.23,color,'forearm'+side,[sign*.32,1.015,0]);
    cylinder(.091,.086,.055,palette.pants,'hand'+side,[sign*.32,.887,0]);
    oval([.087,.105,.07],palette.boot,'hand'+side,[sign*.32,.79,-.015]);
    oval([.038,.063,.044],palette.boot,'hand'+side,[sign*.27,.808,-.05]);
    cylinder(.126,.105,.34,palette.pants,'thigh'+side,[sign*.145,.68,0]);
    oval([.106,.1,.105],palette.pants,'shin'+side,[sign*.145,.49,0]);
    cylinder(.103,.091,.25,palette.pants,'shin'+side,[sign*.145,.365,0]);
    cylinder(.113,.103,.24,palette.boot,'foot'+side,[sign*.145,.26,.01]);
    box([.222,.15,.36],palette.boot,'foot'+side,[sign*.145,.12,-.057]);
    box([.23,.05,.385],palette.sole,'foot'+side,[sign*.145,.025,-.065]);
    cylinder(.116,.116,.028,palette.leather,'foot'+side,[sign*.145,.33,.01]);
    // Shoulder webbing and metal buckles.
    bar([sign*.20,1.44,-.16],[sign*.18,1.1,-.22],.027,palette.pack,'chest');
    box([.063,.061,.02],palette.metal,'chest',[sign*.187,1.27,-.238]);
    bar([sign*.235,1.56,.285],[sign*.235,.93,.30],.018,palette.metal,'pack');
  }
  bar([-.235,.94,.30],[.235,.94,.30],.018,palette.metal,'pack');
  oval([.265,.32,.15],palette.pack,'pack',[0,1.23,.32]);
  box([.47,.37,.255],palette.pack,'pack',[0,1.2,.35]);
  box([.50,.115,.29],0x727660,'pack',[0,1.405,.35],[.12,0,0]);
  box([.30,.22,.055],0x4a5445,'pack',[0,1.15,.493]);
  for(const x of [-.165,.165]){box([.035,.44,.02],palette.leather,'pack',[x,1.22,.503]);box([.058,.05,.025],palette.metal,'pack',[x,1.33,.52]);}
  cylinder(.115,.115,.60,0x7c827c,'pack',[0,1.555,.33],[0,0,Math.PI/2]);
  for(const x of [-.19,.19])part(new T.TorusGeometry(.118,.015,4,10),palette.leather,'pack',[x,1.555,.33],undefined,[0,Math.PI/2,0]);
  cylinder(.058,.051,.12,palette.metal,'pack',[.305,1.06,.31]);
  part(new T.TorusGeometry(.045,.009,4,8),palette.metal,'pack',[.367,1.073,.31],undefined,[0,Math.PI/2,0]);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const model=new T.SkinnedMesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));model.name='HikerMesh';root.add(model);root.updateMatrixWorld(true);model.bind(new T.Skeleton(bones));model.frustumCulled=false;
  root.userData={rig,model,phase:0,time:0,blend:{speed:0,cold:0,kindle:0}};
  return root;
}

export function poseHiker(character,speed,dt,{cold=0,kindle=false}={}) {
  const u=character.userData,b=u.rig,blend=u.blend,k=1-Math.exp(-9*dt);
  blend.speed+=(speed-blend.speed)*k;blend.cold+=(cold-blend.cold)*k;blend.kindle+=((kindle?1:0)-blend.kindle)*k;
  const move=Math.min(1,blend.speed/2),run=Math.max(0,Math.min(1,(blend.speed-3)/3)),c=blend.cold,fire=blend.kindle;
  u.phase+=dt*(3+blend.speed*1.5)*move;u.time+=dt;
  const s=Math.sin(u.phase),breath=Math.sin(u.time*2.1),shiver=Math.sin(u.time*29)*.015*c;
  for(const joint of Object.values(b))joint.rotation.set(0,0,0);
  b.hips.position.y=.88-Math.abs(s)*.022*move-fire*.025;
  b.spine.rotation.x=-.04-run*.12-c*.09-fire*.17;
  b.spine.rotation.z=s*.025*move+shiver;b.chest.rotation.y=s*.035*move;
  b.chest.position.y=.16+breath*.003;
  b.head.rotation.x=.035+c*.09+fire*.25;b.head.rotation.y=Math.sin(u.time*.5)*.025*(1-move);
  b.pack.rotation.x=s*.025*move;b.pack.rotation.z=-s*.02*move;
  for(const [side,sign] of [['L',1],['R',-1]]){
    b['thigh'+side].rotation.x=s*sign*(.42+run*.28)*move;
    b['shin'+side].rotation.x=-Math.max(0,-s*sign)*(.58+run*.55)*move;
    b['foot'+side].rotation.x=Math.max(0,s*sign)*.16*move;
    b['upperArm'+side].rotation.x=-s*sign*(.30+run*.3)*move+fire*.63+c*.12;
    b['upperArm'+side].rotation.z=sign*(.07+c*.07+fire*.18);
    b['forearm'+side].rotation.x=.13+run*.60+c*.7+fire*(.9+Math.sin(u.time*9+sign)*.13);
    b['forearm'+side].rotation.z=sign*(c*.25+fire*.25);
    b['hand'+side].rotation.y=fire*sign*.35;
  }
}

export function disposeHiker(character){const {model}=character.userData;model.geometry.dispose();model.material.dispose();model.skeleton.dispose();}
