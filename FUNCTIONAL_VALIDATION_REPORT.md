# Functional validation report — ISIS Capitalist / Football Empire

- **Date:** 2026-10-12
- **Branch:** `feat/frontend` (base commit `7701672`, plus the validation fixes listed at the end)
- **Environment:** real NestJS backend (`http://localhost:3000`, `/graphql`), real Angular dev server (`http://localhost:4200`), and a real Chrome browser driven by Playwright.
- **What was observed:** the DOM, `localStorage`, every GraphQL response, network failures and the browser console.
- **How the server was checked:** after each action, the server state was read back through `getWorld`.
- **Expected values:** every figure in the Evidence column (costs, Max quantity, angels) was computed independently of the application code.

Each criterion was first audited on the unmodified code (an initial audit run). Three criteria failed and were fixed (see *Notes*). The table shows the result of the **final full run on the final code**.

## Professor's grid

| Section | Criterion | Result | Evidence | Notes |
|---------|-----------|--------|----------|-------|
| Production | 1. Clicking the product icon starts its progress bar | PASS | Football (owned, unmanaged): bar active 4 ms after the click; a `lancerProductionProduit` mutation was sent. | Unowned and managed products have their icon disabled. |
| Production | 2. Progress 0 → 100 % according to `vitesse` | PASS | 30 bar updates (recorded when the app writes them): 0.8 % at 5 ms … 48.2 % at 241 ms … 100 % at 509 ms. Strictly increasing; maximum deviation from elapsed/vitesse 0.2 %. Paid at 525 ms. | **Initially FAIL.** The bar started at about 20 %, was not strictly increasing, and a cycle could end up to 100 ms early or late. Fixed (see Fixes). |
| Production | 3. Gain added to `world.money` at 100 % | PASS | 2 Footballs × $1: money 996 → 998; server score 0 → 2 (then 4). | Gain = revenu × quantite × cycles × (1 + activeangels × angelbonus / 100). |
| Production | 4. `timeleft` decreases and ends in the idle state (manual + managed) | PASS | Manual: label 0.5s → 0.4 → 0.3 → 0.2 → 0.1 → 0.0s, then idle (bar inactive, label back to vitesse 0.5s; server `timeleft` 0). Managed: server `timeleft` 232 ms of 250 ms, always within (0, vitesse]. | |
| Purchase | 5. Multiplier cycles x1 → x10 → x100 → Max → x1 | PASS | Labels `×1 → ×10 → ×100 → Max → ×1`; the buttons follow with `Buy ×1 $4.28`, `Buy ×10 $59.13`, `Buy ×100 $52,994`, `Buy ×42 $987.11`, `Buy ×1`. | |
| Purchase | 6. Max quantity | PASS | Money $1000, cost $4.28, growth 1.07. UI shows ×42 for $987.11. Independent result: n = 42 (×42 costs 987.11, ×43 would cost 1060.48). After buying Max: money 12.89 on the UI and on the server, never negative. | |
| Purchase | 7. Displayed cost uses the geometric series | PASS | ×10: shown $59.13, geometric 59.13 (naive x·n would be 42.80). ×100: shown $52,994, geometric 52,993.51 (naive 428). | |
| Purchase | 8. Buy button enabled only when affordable | PASS | Exactly affordable (money 4, cost 4): enabled, and the server accepts it (qty 2, money 0). One cent below (4.27 vs 4.28): disabled. Max with $3: `Buy ×0`, disabled. With $1000: ×1 and ×10 enabled, ×100 disabled. | Edge cases were run on a dedicated test user (see Test data). |
| Purchase | 9. World updated after purchase and persisted | PASS | Buy 1 Football: qty 1 → 2, next cost 4.28, money 1000 → 996. After a browser refresh the server returns qty 2, cout 4.28, money 996. | |
| Managers | 10. Managers dialog lists only `unlocked == false` | PASS | 6 rows before hiring; after hiring Youth Coach there are 5 rows and Youth Coach is gone. | |
| Managers | 11. Badge = number of affordable locked managers, hidden at 0 | PASS | Money 12.89: badge hidden. Money 1500: badge `1` (only Youth Coach at $1000 is affordable). | |
| Managers | 12. Hiring: affordable only, deducts `seuil`, unlocks manager and product, persisted | PASS | Hire disabled while unaffordable. Hire: server money 1500 → 808 with +308 of managed income since, so exactly 1000 was deducted. `manager.unlocked` and `product.managerUnlocked` are true on the server. | |
| Managers | 13. Automatic production, consecutive cycles, offline production | PASS | No clicks: 9 money increases in 2 s; server +220 over about 1.25 s, consistent with 44 per cycle every 250 ms. Offline: page closed for 5.67 s, money shown 1556 → 2568 after reload (expected ≈ 2553, credited once). | |
| Upgrades | 14. Cash and Angel Upgrades reachable from the sidebar | PASS | Both open from the left menu (`nav.menu`). | |
| Upgrades | 15. Purchase conditions (money / active angels) and buttons | PASS | Money 2568: all 10 cash-upgrade Buy buttons disabled. 300 angels: angel upgrades costing 5/10/25/100/250 enabled, the one costing 1000 disabled. | |
| Upgrades | 16. Effects (`gain`, `vitesse`, `ange`; targeted and global; once only; persisted) | PASS | **gain, targeted (Pro Match Balls):** Football revenu 1 → 3, others unchanged. **vitesse, targeted (Fitness Program, during a running cycle):** Rising Player 12000 → 6000, Jersey unchanged; progress 29.4 % → 40.3 % over 683 ms (coherent), timeleft 8472 → 3583. **vitesse, global (Training Ground):** every product ÷2. **gain, global (Global Sponsorship):** every product ×3. **gain, angel (Divine Kick):** angels 300 → 295, Football revenu ×5. **ange (Loyal Fans):** angelbonus 2 → 3, multiplier shown ×9.55. A second purchase is refused ("already bought"). All effects survive a refresh. | |
| Reset | 17. Investors shows total and active angels and a reset button | PASS | "Active angels 0 · Total angels 0 · Revenue bonus ×1 · Gained by resetting +300", plus a "Reset for +300 angels" button. Independent result: floor(150·√(4e15/1e15)) − 0 = 300. | Reset asks for confirmation. |
| Reset | 18. Reset behaviour | PASS | Money 1000 and quantities 1/0/0/0/0/0, with costs, revenue and speed equal to a freshly created world. Managers, cash upgrades, unlocks (and angel upgrades) locked again. Total angels 0 → 300, active 0 → 300. Score preserved (4.0000e15). First Football cycle afterwards paid exactly 7 = 1 × $1 × (1 + 300 × 2 / 100). | Score is cumulative, as the backend specifies. Angel upgrades are part of the world and are reset with it. |
| Username | 19. Player ID text field | PASS | `.player` input in the header holds the name. | |
| Username | 20. Persistence in `localStorage` | PASS | `localStorage["isis-capitalist.username"] = "ValidationPlayer1"`; after a full reload the field shows ValidationPlayer1 again. | |
| Username | 21. Changing the username loads that user's world | PASS | ValidationPlayer2: fresh world ($1000, no angels); bought ×10, so Football 11 on the server. Back to ValidationPlayer1: Football 1 and 285 angels, unchanged. | |
| Feedback | 22. Snackbars: purchase, server error, manager hire, reset (and upgrades/unlocks) | PASS | Purchase: "Bought 1 × Football for $4". Purchase with an unlock: "Bought 42 × Football for $987.11 — Unlocked: First Kick (speed ×2)" plus an UNLOCKED banner. Server error: "Could not load the world: Http failure … localhost:3999" and "The server refused this action (Not enough money …). Resyncing…". Manager: "Youth Coach hired — Football now runs automatically!". Reset: "Fresh season! +300 angels recruited." plus a NEW SEASON banner. Upgrades: "Upgrade bought: …" and "Angel upgrade bought: …". | **Initially FAIL:** no message on a successful purchase. Fixed. Also fixed: messages no longer queue behind each other (an error used to wait 2–4 s). |
| Feedback | 23. Badges only when an action is possible | PASS | Managers: hidden at 12.89 → `1` at 1500. Cash Upgrades: hidden at 2568 → `1` at 30000. Angel Upgrades: `5` with 300 angels (5 of 6 affordable), hidden with 0 angels. Investors: `+300` when angels are claimable. | |
| Backend address | 24. Editable backend address field in the UI | PASS | Sidebar field "Backend server", default `http://localhost:3000`. Typing `localhost:3999/` normalizes to `http://localhost:3999`. GraphQL and images then use :3999, the error snackbar appears, the current world stays displayed and nothing crashes. Restoring `http://localhost:3000` reloads the world, and a later purchase persists. The address is saved in `localStorage["isis-capitalist.backend"]`. | **Initially FAIL:** the address was a constant (`BACKEND_URL`). Implemented. |
| Sync | 25. World properties preserved after reload | PASS | Card snapshot (quantity, next cost, revenue, AUTO), angels header and badges are identical before and after the refresh. Server quantities, costs, revenue, speed, product and global unlocks, managers, cash and angel upgrades, angels and angelbonus are identical. A running Rising Player cycle continues after the refresh (46 % → 62 %, still active). | |
| Sync | 26. Money evolution across refresh (no rollback, no duplicate payout) | PASS | Last money displayed 1556; reloaded 5.67 s later: 2568 (+1012, legitimate ≈ 997, within about one cycle of tolerance). Other refreshes: 996 → 996, 1000 → 1000, 1007 → 1007. | |

## PROFESSOR GRID SUMMARY

- Total criteria: **26**
- PASS: **26**
- FAIL: **0**
- PARTIAL: **0**
- NOT TESTED: **0**

(Initial audit on the unmodified code: 23 PASS, 3 FAIL — criteria 2, 22 and 24.)

## FINAL VERDICT

**READY FOR EVALUATION**

Every criterion of the grid was demonstrated on the real backend and frontend in a real browser, after the three fixes below.

## Fixes made during validation

1. **Criterion 24, editable backend address.**
   - New `BackendUrl` service (`frontend/src/app/backend-url.ts`): a signal holding the address, with normalization and persistence in `localStorage`.
   - Apollo's `HttpLink` reads the address on every request (`uri: () => backend.graphql()`), so the existing Apollo setup is unchanged.
   - Image URLs use the same signal.
   - "Backend server" field in the sidebar; Enter or the sync button applies it and reloads the world.
2. **Criterion 22, purchase snackbar.**
   - `GameService.buy` now shows "Bought N × Product for $cost"; when the purchase triggers unlocks, they are added to the same message.
   - The snackbar queue was changed: a new message replaces the current one once that has been visible for 0.9 s, and at most 3 messages wait. A server error is therefore never stuck behind routine messages.
3. **Criterion 2, progress timing.**
   - `GameService.tick()` now runs before every player action, like the server's `updateWorld`. Before, a cycle started mid-tick lost the time elapsed before the click (it could end up to 100 ms early).
   - The progress bar reads the product from the service's world signal, consistent with `lastTick`, instead of the component input, which lags one change detection.
   - When the bar reaches 100 % it triggers the central tick, so the payout matches the bar instead of arriving up to 100 ms later.

## AUTOMATED TEST RESULTS

| Command | Result |
|---|---|
| `backend: npm run build` | exit 0 |
| `backend: npm test` | 15 / 15 passed |
| `backend: npm run test:e2e` | 2 / 2 passed |
| `frontend: npm run codegen` | success, `generated.ts` unchanged |
| `frontend: npx ng test --watch=false` | 18 / 18 passed (13 before validation + 5 new) |
| `frontend: npx ng build` | success, no warnings |

**What the tests cover** (functional behaviour, not just compilation):

- **Backend unit tests** run the real resolvers against real JSON files in a temporary folder:
  - new world without an offline payout; legacy world migration;
  - offline managed production with the angel bonus; a manual cycle completing once;
  - user-name path safety; geometric cost; refusals;
  - product and global unlocks applied once; 25 concurrent purchases (none lost);
  - manager charge and double-hire refusal; targeted and global upgrades; `ange`;
  - reset keeping score and angels.
- **Backend e2e tests** go over real HTTP: `lastupdate` larger than 2³¹, the `Product` return type, and a readable invalid-user error.
- **Frontend unit tests:**
  - cost, Max, purchase, unlocks, managers, angel upgrades, production loop, angel formula and number formatting;
  - `GameService`: the purchase snackbar and its mutation, a cycle starting at the click (this test fails if the timing fix is removed), backend address switching for Apollo and images, and snackbars replacing each other.
- **Not unit-tested:** Angular component templates (`Produit`, `App`, dialogs). They are covered by the browser run instead.

## END-TO-END RESULTS

The full Part 2 sequence (steps 1–78) was automated in Chrome against the running servers, together with the grid checks: **71 / 71 checks passed** on the final run. The final code was run several times. Highlights by step:

| Steps | Result |
|---|---|
| 1–5 load, 6 products, logo and icons (7 images, no 404), initial values | PASS |
| 6–9 buy 1 Football, purchase snackbar, persisted after refresh | PASS |
| 10–14 manual production timing, payout, floating income, persisted money/score | PASS |
| 15–19 multiplier cycle, displayed costs, Max = independent maximum, no negative money | PASS |
| 20–23 First Kick unlock (speed ×2) once, snackbar and banner, Unlocks progress (44 / 50, 0 / 25) | PASS |
| 24–34 managers dialog/badge, hire, AUTO, consecutive automatic cycles, persisted | PASS |
| 35–38 5.7 s offline: credited once | PASS |
| 39–44 cash upgrade badge (hidden/visible), purchase, targeted effect, card flash, persisted | PASS |
| 45–53 Investors (+300 = independent formula), reset, angels 300/300, ×7 production | PASS |
| 54–60 angel badge 5, Divine Kick (−5 angels, ×5), Loyal Fans (angelbonus 3, ×9.55), persisted | PASS |
| 61–67 ValidationPlayer2 independent, back to ValidationPlayer1 unchanged, username restored from localStorage | PASS |
| 68–69 all 5 dialogs: animated entrance, close, no leftover overlay, game still interactive | PASS |
| 70–74 backend address → `localhost:3999`: error snackbar, no crash; restored: normal operation | PASS |
| 75–76 1024 px and 768 px: no horizontal scroll; header, sidebar, cards and dialogs usable | PASS |
| 77–78 console (below) | PASS |

## BROWSER CONSOLE RESULT

- **Normal operation:** no uncaught exceptions, no Angular errors or warnings, no animation errors, no failed requests and no 404s.
- **One expected `console.error`,** produced by the deliberate server-refusal test: `[GameService] acheterQtProduit failed … Not enough money`. It is the matching GraphQL error, and the UI resynced to the server state.
- **During the unreachable-backend test only** (`localhost:3999`): `ERR_CONNECTION_REFUSED` for GraphQL and images, and `[GameService] getWorld failed …`, as expected. None appeared after the address was restored.

## TEST DATA MODIFICATIONS

Only dedicated test users' JSON files in `backend/userworlds/` were edited, and only between requests. Neither `origworld.ts` nor any game constant was changed.

| User | Change | Reason |
|---|---|---|
| ValidationPlayer1 | money = 1500 | afford the first manager (normal play would take minutes) |
| ValidationPlayer1 | money = 30000 | afford the first cash upgrade |
| ValidationPlayer1 | money = 1e10 | test targeted/global speed and gain upgrades during a running cycle |
| ValidationPlayer1 | score = 4e15 | reach the angel threshold (normal play would take hours) |
| ValidationPlayer1 | money = 1, without reloading the page | force a server-side refusal (server-error snackbar and resync) |
| ValidationEdge | money = 4, then 4.27, then 3 | Buy-button edge cases (exact cost, one cent below, Max with little money) |

All test users' worlds were deleted afterwards. That includes ValidationPlayer1/2, ValidationEdge, and the new-player worlds created when the scripts first opened the app. The players' existing worlds were left untouched.

## FILES CHANGED DURING VALIDATION

| File | Change |
|---|---|
| `frontend/src/app/backend-url.ts` (new) | `BackendUrl` service + `normalizeBackendUrl` |
| `frontend/src/app/app.config.ts` | Apollo `uri` read from `BackendUrl` per request |
| `frontend/src/app/game.config.ts` | `BACKEND_STORAGE_KEY`; `GRAPHQL_URL` constant removed |
| `frontend/src/app/game.service.ts` | backend address, purchase snackbar, snackbar replacement, `tick()` before actions |
| `frontend/src/app/produit/produit.ts` | bar reads the service world; payout at 100 % |
| `frontend/src/app/app.ts`, `app.html`, `app.css` | "Backend server" field in the sidebar; logo retried for a new address |
| `frontend/src/app/game.service.spec.ts` (new) | 5 tests for the fixes |
| `FUNCTIONAL_VALIDATION_REPORT.md` (new) | this report |

No backend file was changed during validation.
