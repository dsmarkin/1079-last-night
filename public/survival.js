// Game balance, not a medical model or a reconstruction of the 1959 deaths.
export const NIGHT_SECONDS = 1200;
export function newRun() {
  return {elapsed:0,heat:100,hands:100,clarity:100,exposure:0,events:[],outcome:null};
}
export function record(run,text) {
  run.events.push({time:run.elapsed,text});
}
export function nightTime(seconds) {
  const minutes=Math.floor(17*60+40+seconds/NIGHT_SECONDS*790)%1440;
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
}
export function tickRun(run,dt,{moving=false,storm=false,fire=false,companion=false,sheltered=false,goal=false}={}) {
  if(run.outcome)return;
  run.elapsed+=dt;
  const clamp=v=>Math.max(0,Math.min(100,v));
  const loss=(storm?.15:.07)*(sheltered?.45:1)*(companion?.65:1)*(moving?.8:1);
  run.heat=clamp(run.heat+dt*(fire?.9:-loss));
  run.hands=clamp(run.hands+dt*(fire?1.4:run.heat<55?-.15:-.025));
  run.clarity=clamp(run.clarity+dt*(fire?.3:run.heat<30?-.12:0));
  if(storm&&!sheltered&&!fire)run.exposure+=dt;
  if(run.heat<=0)run.outcome='cold';
  else if(goal)run.outcome='arrival';
  else if(run.elapsed>=NIGHT_SECONDS)run.outcome='dawn';
}
export const outcomes={
  cold:{title:'Стихия · холод',note:'Тепло иссякло до выхода к укрытию. Долгое пребывание на ветру увеличивало потери; движение и близость напарника замедляли их. Это игровой исход, а не версия гибели реальных людей.'},
  arrival:{title:'До рассвета',note:'Вы дошли до верхнего укрытия. Этот прототип завершает маршрут для каждого участника отдельно; совместный исход пары ещё в разработке.'},
  dawn:{title:'Незавершённый маршрут',note:'Наступил рассвет. Вы пережили ночь, но не достигли верхнего укрытия за отведённое время.'}
};
