# 1079: Последняя ночь

Browser multiplayer exploration of the Dyatlov incident area. Three.js + Express + Socket.IO.

## Run

Node 20+, `npm ci`, `npm start`, then http://localhost:3000.
Run `npm test` while the server is running. Set TEST_URL to test another deployment.

WASD movement relative to camera, Shift run, mouse orbit (drag fallback if pointer lock is unavailable), wheel zoom, M map, Escape pause. Map offers quick travel for exploration. Same room code joins the same expedition.

## Geography and provenance

See public/sources.html and public/world.js. Cached Terrarium DEM; local metric projection with no vertical exaggeration. Expedition GPS and contested 2020 coordinates are separate markers. The ravine incision, interpolated stream, trees, weather and assets are illustrative. Not a forensic simulation or a claim of survey-level historical accuracy.

## Deployment

Existing Railway service: 1079-game, production. Start `node server/index.js`; healthcheck `/health`. Single replica because rooms are in memory. Dependencies and DEM are served locally; gameplay requires no external CDN. `/health` exposes version and Railway commit for release verification.
