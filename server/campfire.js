import {CAMP} from '../public/world.js';
export const FIRE_DURATION=90000;
export const nearCamp=p=>p&&Math.hypot(p.x-CAMP.x,p.z-CAMP.z)<5;
export function startKindling(player,now){
  return nearCamp(player)?{started:now,x:player.x,z:player.z}:null;
}
