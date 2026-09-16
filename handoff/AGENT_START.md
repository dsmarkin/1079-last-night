# Start here

1. Work in the repository root. Install dependencies with `npm ci` if `node_modules` is absent.
2. Read `docs/ANTON_DIRECTION.md`, then `docs/PROJECT_DOSSIER.md`.
3. Run `node --check public/game.js`, `node --check public/character.js`, and `node --test tests/run.test.js tests/character.test.js tests/world.test.js tests/survival.test.js`.
4. With a running server, run `TEST_URL=http://127.0.0.1:3000 npm test`.
5. Open `/character.html` to inspect the model and `/` to test both modes, `V`, `M`, `E`, sound, and protocol.
6. Before production changes, inspect GitHub `main` and Railway; deploy the exact commit SHA with `deployService`, preserving the existing service and domain.

## Current implementation map

- `public/game.js`: Three.js terrain, cameras, HUD, map, multiplayer and survival loop.
- `public/character.js`: procedural 17-bone skinned hiker and poses.
- `public/models/hiker-v1.glb`: model with Idle, Walk, Run, Cold and Kindle clips.
- `public/character.html`: standalone interactive character viewer.
- `public/survival.js`: resource/outcome rules shared by server and client; `pairOutcomes` for the room result.
- `server/run.js`: authoritative night state (clock, storm, per-player resources, kindling, outcomes, reconnect grace); `server/terrain.js`: server-side DEM decode.
- `public/sound.js`: synthesised wind, footsteps and fire sounds.
- `server/index.js`, `server/campfire.js`: Express, Socket.IO transport, room/member bookkeeping, camp proximity.
- `tests/run.test.js`: pure night-state checks; `tests/campfire.test.js`, `tests/multiplayer.test.js`: Socket.IO integration (server required).

## Honest scope

Time, resources, fire and outcomes are now server-authoritative with a pair outcome and reconnect, but there is no lobby and no movement-speed validation. The full Anton concept still calls for six threat branches, four route segments, a shared pair outcome, voice/proximity communication, rope, shared inventory, world statistics, and nine reviewed outcomes. These are not complete. Historical places remain archive data; survival characters and outcomes are fictional.
