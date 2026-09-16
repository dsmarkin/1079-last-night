import {createRun,addPlayer,setOffline,movePlayer,beginKindling,stopKindling,stepRun,snapshot,START,GRACE_MS,TICK_MS} from './run.js';
import express from 'express';
import http from 'node:http';
import {Server} from 'socket.io';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SIZE,P} from '../public/world.js';
export const VERSION='0.5.0';
const app=express(),server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:16384});
const root=path.dirname(fileURLToPath(import.meta.url));
app.use('/vendor',express.static(path.join(root,'../node_modules/three/build')));
app.use(express.static(path.join(root,'../public')));
app.get('/health',(req,res)=>res.json({ok:true,name:'1079-last-night',version:VERSION,commit:process.env.RAILWAY_GIT_COMMIT_SHA||'local',rooms:rooms.size}));
// room → {members: socket.id → presence, run: night state for N: rooms, timer, expiry}
const rooms=new Map(),limit=SIZE/2-8;
const valid=p=>p&&typeof p==='object'&&[p.x,p.z,p.ry].every(Number.isFinite)&&Math.abs(p.x)<=limit&&Math.abs(p.z)<=limit;
const isNight=room=>room.startsWith('N:');
function getRoom(name){let r=rooms.get(name);if(!r){r={members:new Map(),run:null,timer:null,expiry:null};rooms.set(name,r);}if(r.expiry){clearTimeout(r.expiry);r.expiry=null;}return r;}
function publish(name,r,now){for(const [id,me] of r.members){const s=io.sockets.sockets.get(id);if(s)s.emit('run',snapshot(r.run,me.token,now));}}
function tick(name){const r=rooms.get(name);if(!r?.run)return;const now=Date.now();stepRun(r.run,now);publish(name,r,now);if(r.run.outcome&&!r.members.size)dispose(name);}
function dispose(name){const r=rooms.get(name);if(!r)return;clearInterval(r.timer);clearTimeout(r.expiry);rooms.delete(name);}
function leave(socket){
  const name=socket.data.room,r=rooms.get(name);socket.data.room=null;
  if(!r)return;
  const me=r.members.get(socket.id);r.members.delete(socket.id);socket.to(name).emit('left',socket.id);socket.leave(name);
  if(r.run&&me&&![...r.members.values()].some(o=>o.token===me.token))setOffline(r.run,me.token,Date.now());
  if(!r.members.size){if(r.run&&!r.run.outcome)r.expiry=setTimeout(()=>dispose(name),GRACE_MS);else dispose(name);}
}
io.on('connection',socket=>{
 socket.on('join',data=>{
  const p=data&&typeof data==='object'?data:{};leave(socket);
  const name=String(p.room||'PASS1959').trim().slice(0,20).toUpperCase()||'PASS1959';
  socket.join(name);socket.data.room=name;const r=getRoom(name),now=Date.now();
  const token=/^[A-Za-z0-9_-]{8,40}$/.test(p.token||'')?p.token:socket.id;
  const label=String(p.name||'Исследователь').slice(0,24)||'Путник';
  let position=valid(p)?p:{x:P.tent.x+5,z:P.tent.z+7,ry:0};
  if(isNight(name)){
    if(!r.run){r.run=createRun(now);r.timer=setInterval(()=>tick(name),TICK_MS);}
    else if(r.run.outcome)r.run=createRun(now); // the previous night is over; a new participant starts a fresh one
    const known=r.run.players.has(token);
    const player=addPlayer(r.run,token,label,now);
    position=known&&valid(p)?p:{x:player.x,z:player.z,ry:position.ry};
    movePlayer(r.run,token,position.x,position.z,now);player.travel=0;
  }
  const me={id:socket.id,name:label,x:position.x,z:position.z,ry:position.ry};Object.defineProperty(me,'token',{value:token});
  r.members.set(socket.id,me);
  socket.emit('state',[...r.members.values()]);socket.to(name).emit('joined',me);
  if(r.run)socket.emit('run',snapshot(r.run,token,now));
 });
 socket.on('move',p=>{
  const name=socket.data.room,r=rooms.get(name);if(!r?.members.has(socket.id)||!valid(p))return;
  const now=Date.now();if(now-(socket.data.lastMove||0)<35)return;socket.data.lastMove=now;
  const me=r.members.get(socket.id);
  if(r.run){const player=r.run.players.get(me.token);if(player?.outcome||r.run.outcome)return;movePlayer(r.run,me.token,p.x,p.z,now);}
  Object.assign(me,{x:p.x,z:p.z,ry:p.ry%(2*Math.PI),action:['idle','cold','kindle'].includes(p.action)?p.action:'idle'});
  socket.to(name).emit('move',me);
 });
 socket.on('kindle',()=>{const r=rooms.get(socket.data.room),me=r?.members.get(socket.id);if(r?.run&&me)beginKindling(r.run,me.token,Date.now());});
 socket.on('kindle:stop',()=>{const r=rooms.get(socket.data.room),me=r?.members.get(socket.id);if(r?.run&&me)stopKindling(r.run,me.token);});
 socket.on('disconnect',()=>leave(socket));
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log(`1079 v${VERSION} listening`));
