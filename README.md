> v0.5.0: ночь стала серверной — часы, погода, тепло/руки/ясность, костёр и исходы считает сервер комнаты; пара получает общий итог, а переподключение в той же вкладке возвращает место в ночи. Пауза больше не останавливает ночь.

> v0.4.0: новое направление «1079 · Высота» по материалам Антона — см. [ТЗ и границы прототипа](docs/ANTON_DIRECTION.md). Выживание и исторический архив выбираются при входе. V — переключить камеру, E — удерживать для розжига у кострища (или нажать кнопку). Костёр общий для комнаты; звук можно выключить кнопкой. Для совместной игры нужны одинаковый режим и код комнаты. Персонаж получил зимнюю экипировку, риг и пять анимаций; 3D-просмотр доступен на `/character.html`.

# 1079: Последняя ночь

Browser multiplayer exploration of the Dyatlov incident area. Three.js + Express + Socket.IO.

## Run

Node 20+, `npm ci`, `npm start`, then http://localhost:3000. `public/models/hiker-v1.glb` is generated deterministically from `public/character.js` by `scripts/export-character.mjs` (runs before `start` and `test`), so it is not committed.
Run `npm test` while the server is running (`tests/run.test.js` and the pure checks work without it). Set TEST_URL to test another deployment.

WASD movement relative to camera, Shift run, mouse orbit (drag fallback if pointer lock is unavailable), wheel zoom, M map, Escape pause. Map offers quick travel for exploration. Same room code joins the same expedition.

## Geography and provenance

See public/sources.html and public/world.js. Cached Terrarium DEM; local metric projection with no vertical exaggeration. Expedition GPS and contested 2020 coordinates are separate markers. The ravine incision, interpolated stream, trees, weather and assets are illustrative. Not a forensic simulation or a claim of survey-level historical accuracy.

## Deployment

Existing Railway service: 1079-game, production. Start `node server/index.js`; healthcheck `/health`. Single replica because rooms and night runs are in memory (a disconnected participant keeps a place for 120 s). Dependencies and DEM are served locally; gameplay requires no external CDN. `/health` exposes version and Railway commit for release verification.
