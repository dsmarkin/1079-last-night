# 1079 · Высота — handoff package

This package is a continuation snapshot for another coding agent. Read `handoff/AGENT_START.md` first, then `docs/ANTON_DIRECTION.md`, `docs/PROJECT_DOSSIER.md`, and the source files.

Snapshot date: 2026-09-16 (v3). Includes the v0.4.0 procedural hiker and viewer plus the v0.5.0 server-authoritative night run. The public Railway deployment is still v0.3.1; both versions must be published from a checkout with Git history and credentials.

## Repository and production

- GitHub: `https://github.com/dsmarkin/1079-last-night`
- Branch: `main`
- Public game: `https://1079-game-production.up.railway.app`
- Railway project ID: `c00125b7-3520-4a00-a5b6-178ae3eee849`
- Railway environment ID: `9085a96e-65f4-4a4a-8b8c-82007069e8ac`
- Railway service ID: `ae6abe62-d19d-44f7-a3d2-efe93062f884`
- Start: `node server/index.js`
- Health: `/health`

Do not create a new Railway service. Preserve the domain, port 3000, health path, and one-replica setup unless the user requests otherwise.

## What is in this snapshot

The browser prototype has a server-authoritative night run (clock, storm, resources, shared fire, pair outcome, reconnect within 120 s), a sourced DEM scene, historical archive mode, first-person and third-person cameras, Socket.IO rooms, shared server-side campfires, snow and storm, synthesised wind/footsteps/fire audio, three survival resources, and a run protocol. The new character is a procedural skinned low-poly hiker with hood, scarf, gloves, rucksack, blanket and cup. `public/models/hiker-v1.glb` exports five clips: `Idle`, `Walk`, `Run`, `Cold`, `Kindle`.

The reference concept sheet is `assets/characters/hiker-concept-v1.png`. It was generated from the prompt recorded in `handoff/PROMPTS.md`. It is an art reference, not a historical person.

## Important boundary

No API keys, GitHub tokens, Railway tokens, cookies, or browser credentials are included. The next agent must use the authenticated connectors or the user's own local login. Never place those secrets in Git, the archive, prompts, browser URLs, or chat.
