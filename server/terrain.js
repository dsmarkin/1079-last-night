// Server-side copy of the cached Terrarium DEM so shelter and goal checks are authoritative.
// Minimal PNG reader: 8-bit RGB/RGBA, non-interlaced, which is how public/data/terrain.png is stored.
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {sample} from '../public/world.js';

export function decodePng(buffer){
  if(buffer.readUInt32BE(0)!==0x89504e47)throw new Error('Not a PNG');
  let offset=8,width=0,height=0,channels=0,bitDepth=0;const idat=[];
  while(offset<buffer.length){
    const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8),data=buffer.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];const color=data[9];channels={0:1,2:3,4:2,6:4}[color];if(bitDepth!==8||!channels||data[12]!==0)throw new Error('Unsupported PNG layout');}
    else if(type==='IDAT')idat.push(data);
    else if(type==='IEND')break;
    offset+=12+length;
  }
  const raw=inflateSync(Buffer.concat(idat)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)],src=y*(stride+1)+1,dst=y*stride;
    for(let i=0;i<stride;i++){
      const x=raw[src+i],a=i>=channels?pixels[dst+i-channels]:0,b=y>0?pixels[dst-stride+i]:0,c=y>0&&i>=channels?pixels[dst-stride+i-channels]:0;
      let v;
      if(filter===0)v=x;else if(filter===1)v=x+a;else if(filter===2)v=x+b;else if(filter===3)v=x+((a+b)>>1);
      else {const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v=x+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}
      pixels[dst+i]=v&255;
    }
  }
  return {width,height,channels,pixels};
}

export function loadHeights(file=fileURLToPath(new URL('../public/data/terrain.png',import.meta.url))){
  const {width,height,channels,pixels}=decodePng(readFileSync(file));
  if(width!==256||height!==256)throw new Error('DEM must be 256×256');
  const heights=new Float32Array(width*height);
  for(let i=0;i<heights.length;i++)heights[i]=pixels[i*channels]*256+pixels[i*channels+1]+pixels[i*channels+2]/256-32768;
  return heights;
}

let cached=null;
export function heightAt(x,z){cached??=loadHeights();return sample(cached,x,z);}
