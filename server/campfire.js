import {CAMP} from '../public/world.js';
export const FIRE_DURATION=90000;
export const nearCamp=p=>p&&Math.hypot(p.x-CAMP.x,p.z-CAMP.z)<5;
export function startKindling(player,now){
  return nearCamp(player)?{started:now,x:player.x,z:player.z}:null;
}
export function canIgnite(player,attempt,now,burningUntil){
  return Boolean(nearCamp(player)&&attempt&&now-attempt.started>=3000&&now-attempt.started<=15000&&Math.hypot(player.x-attempt.x,player.z-attempt.z)<.5&&burningUntil<=now);
}
