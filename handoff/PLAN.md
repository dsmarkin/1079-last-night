# Continuation plan

## P0

- Publish v0.4.0 + v0.5.0 from the user's local repository (this archive has no `.git`): copy the tree over the checkout, review the diff, commit, push `main`, deploy that SHA to the existing Railway service, verify `/health` reports `0.5.0` and run `TEST_URL=<production> npm test`.
- Keep the procedural model as a fallback if GLB loading fails.

## P1

- ~~Move run clock, resources, fire and outcome into authoritative room state.~~ Done (v0.5.0).
- ~~Add shared pair outcome and reconnect snapshots.~~ Done (v0.5.0). Open: server-side speed check for `move`, optional lobby with a shared start.
- Add noise → hidden external-factor value → readable foreign tracks → protocol explanation.
- Add shared inventory and two-person fire-lighting with a solo fallback.

## P2/P3

- Four route segments, rope distance, voice attenuation, hand-held compass/clock, physical obstacles.
- Implement the six threat branches one at a time.
- Review the complete nine-outcome catalogue before UI work.
- Add server-backed aggregate statistics with clear telemetry labeling.

Every stage requires tests, browser checks, two clients, production health, and deployment of the exact commit SHA.
