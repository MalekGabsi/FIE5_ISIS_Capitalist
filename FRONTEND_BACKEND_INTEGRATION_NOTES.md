# Frontend ↔ Backend integration notes

Status of every contract problem found between `backend/src/schema.graphql`,
`backend/src/resolver.ts` / `backend/src/app.service.ts` and the Angular
frontend. All items were reproduced against the running backend before the fix
and re-verified after it (backend unit + e2e tests, browser end-to-end run).

**All 12 issues are RESOLVED.** No open issue is currently known.

---

## ✅ 1. `acheterQtProduit` returned a `World` instead of a `Product` — RESOLVED

Every purchase failed with `Cannot return null for non-nullable field Product.id`
although the purchase was saved. The resolver now returns the updated product,
validates `quantite` (positive integer), uses the geometric cost formula,
credits elapsed production first, checks unlocks and saves atomically.

## ✅ 2. `engagerManager` read `managerName` instead of `name` — RESOLVED

`@Args('name')` is used; the manager is now also **charged** (`seuil`), refused
when unaffordable or already hired, and the `Palier` is returned.

## ✅ 3. Cash / angel upgrades returned a `World` instead of a `Palier` — RESOLVED

Both return the bought `Palier` and refuse a second purchase.

## ✅ 4. Upgrades ignored `idcible` and the `ange` type — RESOLVED

Shared `AppService.applyBonus`: `idcible > 0` → that product, `idcible == 0` →
every product; `gain` multiplies `revenu`, `vitesse` divides `vitesse` (and the
running `timeleft`), `ange` adds `ratio` to `angelbonus`. Same rules as the
frontend (`game-logic.ts`).

## ✅ 5. `updateWorld` was never called — RESOLVED

Every query/mutation now runs `updateWorld` first (`AppService.withWorld`):
manual cycles complete once, managed products loop (several cycles offline),
`money` **and** `score` are credited with the angel multiplier
`1 + activeangels × angelbonus / 100`, `timeleft` and `lastupdate` are updated.
A world with `lastupdate == 0` (new or legacy) starts counting from now: no
huge offline payout.

## ✅ 6. `lastupdate: Int!` could not hold `Date.now()` — RESOLVED

Schema types changed (see below). Timestamps are real milliseconds again.

## ✅ 7. `vitesse` / `timeleft` were `Int!` but divided by ratios — RESOLVED

Now `Float!`.

## ✅ 8. Managers / upgrades / angel upgrades / global unlocks were empty — RESOLVED

`origworld.ts` now has 6 managers (one per product), 4 global unlocks
(25/50/100/200 of every product), 10 cash upgrades (targeted and global, gain
and speed, $25K → $50B) and 6 angel upgrades (gain, speed and two `ange`).
Worlds saved before this change receive these lists on their next load (empty
lists are filled from the original world; progress is untouched).

## ✅ 9. World logo `icones/football-empire.png` was missing — RESOLVED

Added a 25 KB crest (`backend/public/icones/football-empire.png`). Every logo
referenced by `origworld.ts` resolves from `http://localhost:3000/<path>`.

## ✅ 10. Unsafe persistence — RESOLVED

`fs/promises`, a per-user lock (calls for the same user run one after the other,
so concurrent requests cannot overwrite each other — covered by a test firing 25
parallel purchases), atomic writes (temp file + rename), a refused action saves
nothing, and a corrupted file raises an error instead of silently replacing the
player's world.

## ✅ 11. `lancerProductionProduit` timeleft never consumed — RESOLVED

Consumed by `updateWorld`. The mutation also refuses unowned products and never
restarts a running or managed cycle.

## ✅ 12. User name used verbatim in a file path — RESOLVED

Names must match `[A-Za-z0-9_-]{1,30}` (same rule as the frontend); anything
else (`../`, slashes, drive letters, empty) is refused with a readable
`BAD_USER_INPUT` error, and the resolved path is checked to stay inside
`userworlds/`.

---

## GraphQL schema changes

| Field | Before | After | Why |
|---|---|---|---|
| `World.lastupdate` | `Int!` | `Float!` | ms timestamps exceed 32-bit Int |
| `Product.vitesse` | `Int!` | `Float!` | divided by speed bonuses |
| `Product.timeleft` | `Int!` | `Float!` | same |
| `World.totalangels` | `Int!` | `Float!` | grows with √score, avoid 32-bit overflow |
| `World.activeangels` | `Int!` | `Float!` | same |

All these map to `number` in TypeScript, so `backend/src/graphql.ts` and the
frontend generated operations are unchanged in shape (`npm run codegen` passes).

## How the frontend uses the backend

- `GameService` keeps the world in signals and applies actions optimistically
  with the same rules as the server, then sends the mutation.
- All server calls (loads and mutations) go through one ordered queue, so a
  refresh always includes the mutations sent before it.
- If the server refuses an action (e.g. another tab spent the money), the player
  sees "The server refused this action … Resyncing…" and the world is reloaded
  from the server, which is authoritative.
- Reset: the world returned by `resetWorld` is used as-is.

## Design notes (not defects)

- Angel upgrades are part of the world and are reset with it (like cash
  upgrades); score and angels are kept, as in the course rules.
- Product icons in `backend/public/icones/` are ~1.5 MB PNGs each; resizing
  them (e.g. 256×256) would make the first load much lighter.
