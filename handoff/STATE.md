# Snapshot state

- Continuation snapshot v3 (2026-09-16, evening): v0.5.0 authoritative night run on top of the v0.4.0 character work.
- Published 2026-09-16 evening: GitHub `main` = `481efaa1addee00bb5204b93d9b0b066c8a3eb6b` (PR #1 merge `edd6d18` + concept PNG). Railway deployment `d1b22afa-f97a-46dc-8bcc-7544e8ae8fcb` SUCCESS; `/health` reports 0.5.0 / 481efaa. Service build command set to `npm run build` (generates the GLB; start command stays `node server/index.js`). The environment is not connected to a branch, so deploys are triggered explicitly with `serviceInstanceDeployV2(commitSha)`.
- Previous deployment: `93aa8db0-43dd-4412-8346-7fda012dbaa4` (v0.3.1).
- Tests: 17/17 pass with a local server (`TEST_URL=http://127.0.0.1:3000 npm test`). `tests/run.test.js`, `tests/character.test.js`, `tests/world.test.js`, `tests/survival.test.js` and the first case of `tests/campfire.test.js` run without a server.
- Browser checks done in headless Chromium (Playwright, swiftshader): `/character.html` renders the GLB; `/` renders the night; two clients in one room share the fire, HUD shows the partner, a reload in the same tab restores the participant, both protocols show the pair outcome. Production smoke test after deploy: kindling and shared fire work on the live server.
- `public/models/hiker-v1.glb` is not committed: `scripts/export-character.mjs` regenerates it deterministically before `start`/`test` and in the Railway build.
