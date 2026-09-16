import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const app=express(); const server=http.createServer(app); const io=new Server(server);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname,'../public')));
app.get('/health',(req,res)=>res.json({ok:true,name:'1079-last-night'}));
const rooms=new Map();
io.on('connection',socket=>{
 socket.on('join',({room='PASS1959',name='Турист'}={})=>{room=String(room).slice(0,20).toUpperCase(); socket.join(room); socket.data.room=room; socket.data.name=String(name).slice(0,24); if(!rooms.has(room))rooms.set(room,new Map()); rooms.get(room).set(socket.id,{id:socket.id,name:socket.data.name,x:0,z:15,ry:0}); socket.emit('state',[...rooms.get(room).values()]); socket.to(room).emit('joined',rooms.get(room).get(socket.id));});
 socket.on('move',p=>{const r=rooms.get(socket.data.room); if(!r||!r.has(socket.id))return; const me=r.get(socket.id); me.x=Number(p.x)||0;me.z=Number(p.z)||0;me.ry=Number(p.ry)||0; socket.to(socket.data.room).emit('move',{id:socket.id,...me});});
 socket.on('disconnect',()=>{const room=socket.data.room,r=rooms.get(room);if(r){r.delete(socket.id);io.to(room).emit('left',socket.id);if(!r.size)rooms.delete(room);}});
});
const port=process.env.PORT||3000;server.listen(port,'0.0.0.0',()=>console.log('1079 listening',port));
