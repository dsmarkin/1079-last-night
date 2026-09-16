# Snapshot state

- Continuation snapshot v2 → v3 (2026-09-16, evening): v0.5.0 authoritative night run added on top of the local v0.4.0 character work. No `.git` in this archive; the local repository was not available in this session, so nothing has been pushed or deployed.
- Public main/deployed state: still v0.3.1, commit `fd6ed0be2a2147ce6f0389e993283dd017b30c98` (`/health` verified 2026-09-16). GitHub `main` HEAD is the same commit.
- Last successful Railway deployment recorded: `93aa8db0-43dd-4412-8346-7fda012dbaa4`.
- Tests: 17/17 pass with a local server (`TEST_URL=http://127.0.0.1:3000 npm test`). `tests/run.test.js`, `tests/character.test.js`, `tests/world.test.js`, `tests/survival.test.js` and the first case of `tests/campfire.test.js` run without a server.
- Browser checks done in headless Chromium (Playwright, swiftshader): `/character.html` renders the GLB; `/` renders the night; two clients in one room share the fire, HUD shows the partner, a reload in the same tab restores the participant, both protocols show the pair outcome. Only a `favicon.ico` 404 is logged.
- Existing untracked scratch files are `output/` and `scripts/build_project_pdf.py`; the archive excludes `tmp/`, `node_modules/` and `.git`.
