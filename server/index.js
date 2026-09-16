import {startKindling,canIgnite,FIRE_DURATION} from './campfire.js';
import express from 'express';
import http from 'node:http';
import {Server} from 'socket.io';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SIZE,P} from '../public/world.js';
const app=express(),server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:16384});
const root=path.dirname(fileURLToPath(import.meta.url));
app.use('/vendor',express.static(path.join(root,'../node_modules/three/build')));
app.use(express.static(path.join(root,'../public')));
app.get('/health',(req,res)=>res.json({ok:true,name:'1079-last-night',version:'0.3.1',commit:process.env.RAILWAY_GIT_COMMIT_SHA||'local'}));
const fires=new Map();
const rooms=new Map(),limit=SIZE/2-8;
const valid=p=>p&&typeof p==='object'&&[p.x,p.z,p.ry].every(Number.isFinite)&&Math.abs(p.x)<=limit&&Math.abs(p.z)<=limit;
function leave(socket){const room=socket.data.room,r=rooms.get(room);if(r){r.delete(socket.id);socket.to(room).emit('left',socket.id);if(!r.size){rooms.delete(room);fires.delete(room);}socket.leave(room);}socket.data.room=null;socket.data.kindling=null;}
io.on('connection',socket=>{
 socket.on('join',data=>{const p=data&&typeof data==='object'?data:{};leave(socket);const room=String(p.room||'PASS1959').trim().slice(0,20).toUpperCase()||'PASS1959';socket.join(room);socket.data.room=room;if(!rooms.has(room))rooms.set(room,new Map());const position=valid(p)?p:{x:P.tent.x+5,z:P.tent.z+7,ry:0};const me={id:socket.id,name:String(p.name||'Исследователь').slice(0,24),x:position.x,z:position.z,ry:position.ry};rooms.get(room).set(socket.id,me);socket.emit('state',[...rooms.get(room).values()]);socket.to(room).emit('joined',me);if(room.startsWith('N:'))socket.emit('fire',{remaining:Math.max(0,((fires.get(room)||0)-Date.now())/1000)});});
 socket.on('move',p=>{const r=rooms.get(socket.data.room);if(!r?.has(socket.id)||!valid(p))return;const now=Date.now();if(now-(socket.data.lastMove||0)<35)return;socket.data.lastMove=now;const me=r.get(socket.id);if(socket.data.kindling&&Math.hypot(p.x-socket.data.kindling.x,p.z-socket.data.kindling.z)>.5)socket.data.kindling=null;Object.assign(me,{x:p.x,z:p.z,ry:p.ry%(2*Math.PI)});socket.to(socket.data.room).emit('move',me);});
 socket.on('kindle',()=>{const room=socket.data.room,me=rooms.get(room)?.get(socket.id);if(!room?.startsWith('N:')||!me)return;const now=Date.now();if((fires.get(room)||0)>now)return;socket.data.kindling=startKindling(me,now);});
 socket.on('ignite',()=>{const room=socket.data.room,me=rooms.get(room)?.get(socket.id),now=Date.now();if(!room?.startsWith('N:')||!canIgnite(me,socket.data.kindling,now,fires.get(room)||0))return;socket.data.kindling=null;fires.set(room,now+FIRE_DURATION);io.to(room).emit('fire',{remaining:FIRE_DURATION/1000});});
 socket.on('disconnect',()=>leave(socket));
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('1079 v0.3.1 listening'));
