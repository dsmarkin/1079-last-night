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
app.get('/health',(req,res)=>res.json({ok:true,name:'1079-last-night',version:'0.2.0',commit:process.env.RAILWAY_GIT_COMMIT_SHA||'local'}));
const rooms=new Map(),limit=SIZE/2-8;
const valid=p=>p&&typeof p==='object'&&[p.x,p.z,p.ry].every(Number.isFinite)&&Math.abs(p.x)<=limit&&Math.abs(p.z)<=limit;
function leave(socket){const room=socket.data.room,r=rooms.get(room);if(r){r.delete(socket.id);socket.to(room).emit('left',socket.id);if(!r.size)rooms.delete(room);socket.leave(room);}socket.data.room=null;}
io.on('connection',socket=>{
 socket.on('join',data=>{const p=data&&typeof data==='object'?data:{};leave(socket);const room=String(p.room||'PASS1959').trim().slice(0,20).toUpperCase()||'PASS1959';socket.join(room);socket.data.room=room;if(!rooms.has(room))rooms.set(room,new Map());const position=valid(p)?p:{x:P.tent.x+5,z:P.tent.z+7,ry:0};const me={id:socket.id,name:String(p.name||'Исследователь').slice(0,24),x:position.x,z:position.z,ry:position.ry};rooms.get(room).set(socket.id,me);socket.emit('state',[...rooms.get(room).values()]);socket.to(room).emit('joined',me);});
 socket.on('move',p=>{const r=rooms.get(socket.data.room);if(!r?.has(socket.id)||!valid(p))return;const now=Date.now();if(now-(socket.data.lastMove||0)<35)return;socket.data.lastMove=now;const me=r.get(socket.id);Object.assign(me,{x:p.x,z:p.z,ry:p.ry%(2*Math.PI)});socket.to(socket.data.room).emit('move',me);});
 socket.on('disconnect',()=>leave(socket));
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('1079 v0.2.0 listening'));
