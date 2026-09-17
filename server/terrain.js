// Server-side copy of the height grid (public/data/height_1025.r16) so shelter and goal checks are authoritative.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GRID,sample,decodeHeights} from '../public/world.js';

export function loadHeights(file=fileURLToPath(new URL('../public/data/height_1025.r16',import.meta.url))){
  const buf=readFileSync(file);
  if(buf.length!==GRID*GRID*2)throw new Error(`height grid must be ${GRID}² uint16`);
  const u16=new Uint16Array(GRID*GRID);for(let i=0;i<u16.length;i++)u16[i]=buf.readUInt16LE(i*2);
  return decodeHeights(u16);
}

let cached=null;
export function heightAt(x,z){cached??=loadHeights();return sample(cached,x,z);}
