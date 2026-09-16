export const Z=13, TX=5448, TY=2296, SIZE=40075016.686*Math.cos(61.762*Math.PI/180)/2**Z;
export function ll(lat,lon){const n=2**Z;return {x:((lon+180)/360*n-TX-.5)*SIZE,z:((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-TY-.5)*SIZE};}
export const sources={table:'https://dyatlovpass.com/investigation-materials',field:'https://dyatlovpass.com/ravine-alekseenkov-and-kan'};
const row=(id,label,lat,lon,source,note)=>({id,label,lat,lon,...ll(lat,lon),source,note});
export const POIS=[
row('tent','Палатка · версия 2020',61.75962,59.43045,'table','Спорная привязка. В публикации точность расстояний ±50 м.'),
row('kolmogorova','Зинаида Колмогорова',61.76217,59.44458,'table','Место обнаружения: современная географическая реконструкция.'),
row('slobodin','Рустем Слободин',61.76266,59.44727,'table','Место обнаружения: современная географическая реконструкция.'),
row('dyatlov','Игорь Дятлов',61.76351,59.45018,'table','Место обнаружения: современная географическая реконструкция.'),
row('cedar2020','Кедр · версия 2020',61.76494,59.45541,'table','Юрий Дорошенко и Юрий Кривонищенко. Альтернативная привязка.'),
row('ravine2020','Четверо · версия 2020',61.76451,59.45405,'table','Расходится с полевой реконструкцией; не отдельное место гибели.'),
row('cedar','Кедр · GPS экспедиции',61+45/60+53.20/3600,59+27/60+17.80/3600,'field','Район обнаружения Юрия Дорошенко и Юрия Кривонищенко. GPS KAN 2012.'),
row('ravine','Овраг · GPS экспедиции',61+45/60+53.93/3600,59+27/60+14.64/3600,'field','Район обнаружения Людмилы Дубининой, Александра Колеватова, Семёна Золотарёва и Николая Тибо-Бриньоля. Индивидуальные GPS не установлены.'),
row('den','Ориентир P4 у настила',61+45/60+53.85/3600,59+27/60+14.47/3600,'field','Камень P4: по экспедиции в 3 м выше настила по ручью. Положение настила отдельно не измерено.')];
export const P=Object.fromEntries(POIS.map(p=>[p.id,p]));
export const creek=[ll(61.7646,59.4544),P.den,P.ravine,ll(61+45/60+55.66/3600,59+27/60+13.36/3600),ll(61+45/60+59.40/3600,59+27/60+15.40/3600)];
export function movement(f,r,yaw){const n=Math.hypot(f,r)||1;return {x:(-Math.sin(yaw)*f+Math.cos(yaw)*r)/n,z:(-Math.cos(yaw)*f-Math.sin(yaw)*r)/n};}
export function sample(data,x,z){const px=Math.max(0,Math.min(255,(x/SIZE+.5)*256-.5)),py=Math.max(0,Math.min(255,(z/SIZE+.5)*256-.5));const a=Math.floor(px),b=Math.floor(py),c=Math.min(255,a+1),d=Math.min(255,b+1),u=px-a,v=py-b;return (data[b*256+a]*(1-u)+data[b*256+c]*u)*(1-v)+(data[d*256+a]*(1-u)+data[d*256+c]*u)*v;}
// Fictional camp for the survival route; not a historical fire-site coordinate.
export const CAMP={x:P.cedar.x-16,z:P.cedar.z+12};
