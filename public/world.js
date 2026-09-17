// Geography shared by the browser client and the server. Same area, sources and points as the Unity client (docs/MAP.md there):
// 4096 × 4096 m around Kholat Syakhl, ArcticDEM v4.1 2 m mosaic resampled to 4 m for the browser.
// Frame: x = east, z = SOUTH (three.js is right-handed with y up), 1 unit = 1 metre. Unity uses z = north; the same point has z_unity = -z here.
export const ORIGIN={lat:61.756,lon:59.4425},SIZE=4096,GRID=1025,STEP=4,HMIN=496,HMAX=1096;
const A=6378137,F=1/298.257223563,E2=F*(2-F),D=Math.PI/180;
const M0=A*(1-E2)/Math.pow(1-E2*Math.sin(ORIGIN.lat*D)**2,1.5),Nr=lat=>A/Math.sqrt(1-E2*Math.sin(lat*D)**2);
export function ll(lat,lon){return {x:(lon-ORIGIN.lon)*D*Nr(lat)*Math.cos(lat*D),z:-(lat-ORIGIN.lat)*D*M0};}
export function unll(x,z){const lat=ORIGIN.lat-z/M0/D;return {lat,lon:ORIGIN.lon+x/(Nr(lat)*Math.cos(lat*D))/D};}
export const sources={
  mp1810:'https://dyatlovpass.com/tent-location',table2020:'https://dyatlovpass.com/investigation-materials',kan2012:'https://dyatlovpass.com/ravine-alekseenkov-and-kan',
  labaz2019:'https://dyatlovpass.com/labaz-by-konstantinov',case1959:'https://dyatlovpass.com/1959-search',arcticdem:'https://www.pgc.umn.edu/data/arcticdem/'};
const dms=(d,m,s)=>d+m/60+s/3600;
// kind: event (documented place), version (alternative placement of the same place), landmark (expedition reference), derived (computed from the DEM)
const row=(id,kind,label,lat,lon,source,note)=>({id,kind,label,lat,lon,...ll(lat,lon),source,note,cls:kind==='version'?'table':'field'});
export const POIS=[
row('tent','event','Палатка · МП 18.10',dms(61,45,30.82),dms(59,25,45.97),'mp1810','Место палатки 1–2 февраля 1959. Привязка по фото поисковиков (группа Константинова, 2012), проверена на местности в 2019–2023. Авторы заявляют 1–2 м; Буянов считает реальной точность ±50 м.'),
row('tentBorzenkov','version','Палатка · версия Борзенкова',61.759033,59.429417,'mp1810','Привязка по фото (В. Борзенков): 61°45,542′ 59°25,765′, 903,7 м.'),
row('tent2020','version','Палатка · таблица 2020',61.75962,59.43045,'table2020','Таблица расследования 2020 года, точность расстояний ±50 м.'),
row('kolmogorova','event','Зинаида Колмогорова',61.76217,59.44458,'table2020','Таблица 2020. Протоколы 1959: ~630 м от кедра выше по склону.'),
row('slobodin','event','Рустем Слободин',61.76266,59.44727,'table2020','Таблица 2020. Протоколы 1959: ~480 м от кедра, на линии палатка — кедр.'),
row('dyatlov','event','Игорь Дятлов',61.76351,59.45018,'table2020','Таблица 2020. Протоколы 1959: ~300 м от кедра, у берёзы.'),
row('cedar','event','Кедр · GPS КАН',dms(61,45,53.20),dms(59,27,17.80),'kan2012','Кедр у кромки леса: костёр в ямке, ветки обломаны до 4–5 м. Здесь найдены Юрий Дорошенко и Юрий Кривонищенко.'),
row('cedar2020','version','Кедр · таблица 2020',61.76494,59.45541,'table2020','Альтернативная привязка кедра.'),
row('ravine','event','Ручей · место четверых · GPS КАН',dms(61,45,53.93),dms(59,27,14.64),'kan2012','Людмила Дубинина, Александр Колеватов, Семён Золотарёв, Николай Тибо-Бриньоль — найдены в мае 1959 в русле, в нескольких метрах ниже настила. Индивидуальные GPS не установлены.'),
row('ravine2020','version','Четверо · таблица 2020',61.76451,59.45405,'table2020','Расходится с полевой привязкой КАН.'),
row('den','landmark','Камень P4 у настила · GPS КАН',dms(61,45,53.85),dms(59,27,14.47),'kan2012','Камень в 3 м выше настила по ручью. Положение самого настила не измерено.'),
row('labaz','event','Лабаз · 2019',dms(61,44,48.1),dms(59,26,58.0),'labaz2019','Склад продуктов (≈55 кг, мандолина, запасная обувь), оставленный 1 февраля 1959. Место найдено в 2019 по фото 1959; в 2022 раскопан настил из бересты 1,5 × 1,0 м.'),
row('summit','derived','Вершина Холатчахль',61.754457,59.417964,'arcticdem','Высшая точка по ArcticDEM (≈1095 м; официально 1096,7 м, на старых картах — «высота 1079»).'),
row('saddle','derived','Седловина перевала Дятлова',61.756323,59.463175,'arcticdem','Низшая точка гребня между Холатчахлем и высотой 905 по ArcticDEM (≈792 м).')];
export const P=Object.fromEntries(POIS.map(p=>[p.id,p]));
export const creek=[ll(61.7646,59.4544),P.den,P.ravine,ll(dms(61,45,55.66),dms(59,27,13.36)),ll(dms(61,45,59.40),dms(59,27,15.40))];
export function movement(f,r,yaw){const n=Math.hypot(f,r)||1;return {x:(-Math.sin(yaw)*f+Math.cos(yaw)*r)/n,z:(-Math.cos(yaw)*f-Math.sin(yaw)*r)/n};}
// Height grid: GRID × GRID nodes every STEP metres, row 0 = northern edge (z = -SIZE/2), column 0 = western edge; bilinear, clamped.
export function sample(data,x,z){const n=GRID-1,px=Math.max(0,Math.min(n,(x+SIZE/2)/STEP)),pz=Math.max(0,Math.min(n,(z+SIZE/2)/STEP));const a=Math.min(n-1,Math.floor(px)),b=Math.min(n-1,Math.floor(pz)),u=px-a,v=pz-b;return (data[b*GRID+a]*(1-u)+data[b*GRID+a+1]*u)*(1-v)+(data[(b+1)*GRID+a]*(1-u)+data[(b+1)*GRID+a+1]*u)*v;}
export function decodeHeights(u16){const h=new Float32Array(GRID*GRID),k=(HMAX-HMIN)/65535;for(let i=0;i<h.length;i++)h[i]=HMIN+u16[i]*k;return h;}
// Tree records from the Meta/WRI canopy height model: x, z_north, height, species (0 spruce, 1 fir, 2 birch, 3 Siberian pine).
export function decodeTrees(f32){const out=[];for(let i=0;i+3<f32.length;i+=4)out.push({x:f32[i],z:-f32[i+1],h:f32[i+2],species:f32[i+3]});return out;}
// Fictional camp for the survival route (16 m west, 12 m south of the cedar); not a historical fire-site coordinate.
export const CAMP={x:P.cedar.x-16,z:P.cedar.z+12};
