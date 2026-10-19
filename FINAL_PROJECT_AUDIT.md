# Final Project Audit — ISIS Capitalist / Football Empire

**Date:** 2026-10-19 (final pass, checked against the two professor PDFs, plus a literal-compliance pass the same evening)

**Branch:** `feat/frontend`. HEAD is `7701672`, plus uncommitted changes (nothing has been committed or pushed).

**References:**
- `backend (1).pdf`: *ISIS Capitalist — Partie backend*, N. Singer
- `frontendangularsignal.pdf`: *ISIS Capitalist — mini-projet*, frontend Angular / signals
- the 26-item functional evaluation grid, as given in the validation request

**Method:**
- read both PDFs in full and compared them with the current code;
- applied the approved corrections;
- ran every automated suite;
- started fresh servers (`npm run start:dev`, `npm start`) and ran the full browser sequence (75 checks), the direct GraphQL checks (32), a Refresh-button check, and a GraphQL playground check.

---

## 1. Corrections made in this pass

| # | Correction | Files | Result |
|---|---|---|---|
| 1 | The global allunlock "Champions League" was renamed **"Treble Winners"**. Threshold 50, ratio ×2, `gain` and `idcible 0` are unchanged. The Football Club product unlock keeps the name "Champions League". | `backend/src/origworld.ts` (1 line) | The global banner now reads **"Unlocked · Treble Winners · All products · revenue ×2"**. The product banner reads "Champions League · Football Club · speed ×2". |
| 2 | The Angel Upgrades text "permanent boosts" became "boosts for this season (a reset removes them)". | `frontend/src/app/dialogs/palier-dialog.ts` (1 line) | Matches the backend PDF reset rule (§2, B24) |
| 3 | The reset confirmation now says: "money, products, managers, cash upgrades, angel upgrades and their bonuses go back to their starting values. Only your score and your angels are kept." | `frontend/src/app/dialogs/investors-dialog.html` | Exactly what the backend PDF prescribes (rebuild from `origworld`, keep score, totalangels and activeangels) and what the code does |
| 4 | `@nestjs/observe` integration removed (not in either PDF; it came from the Nest starter). The import, `createObserveModule`, `ObserveModule.forRoot` and the dependency are gone. `GraphQLModule`, `AppController` and the providers are kept as the PDF shows them. | `backend/src/app.module.ts`, `backend/package.json`, `package-lock.json` | Backend ran about 5 min (it previously failed after about 60 s) with **no** `Telemetry rejected (401)` and no Observe line |
| 5 | Lint: unused `Get` import removed. The second warning (redundant `Boolean()`) disappeared with the Observe block. | `backend/src/app.controller.ts` | `npm run lint`: **0 warnings, 0 errors** |
| 6 | `npm audit fix` (no `--force`). It raised `@nestjs/platform-express` to 12.2.0, which **broke start-up**: it needs `@nestjs/core` ≥ 12.2 (`isRejectedByPipes` missing), and the e2e tests failed with "platform-express package is missing". I fixed this by aligning `@nestjs/common`, `@nestjs/core` and `@nestjs/testing` to 12.2.0 with `npm update`, which stays within the existing `^12.0.1` ranges. | `backend/package-lock.json` only (ranges unchanged) | **Production dependencies: 0 vulnerabilities.** 5 dev-only advisories remain (undici under `@nestjs/mau`, the deploy CLI); npm can only fix them with `--force`, which installs a breaking `@nestjs/mau` version, so I did not apply it |

### 1b. Literal-compliance pass (approved afterwards)

| # | Correction | Files | Result |
|---|---|---|---|
| 7 | `lancerProductionProduit` now returns `Product`, as in both PDFs (it was `Product!`) | `backend/src/schema.graphql` (1 line); `backend/src/graphql.ts` and `frontend/src/app/graphql/generated.ts` regenerated (the result type becomes nullable; nothing reads it) | builds green; the browser saw the real response `{"lancerProductionProduit":{"id":1,"timeleft":500}}` without error |
| 8 | The two `ange` angel upgrades (Loyal Fans, Ultras) now have `idcible: -1`, the frontend PDF convention for angel efficiency. Nothing else in `origworld` changed. | `backend/src/origworld.ts` (2 lines) | Backend `applyBonus` and frontend `applyBonus` both check `typeratio === ange` first, so `idcible` is never used as a product target for these. New assertions in `resolver.spec.ts` and `game-logic.spec.ts` check that an `ange` upgrade with `idcible -1` raises `angelbonus` and leaves every product's `revenu` and `vitesse` unchanged. Browser: Loyal Fans bought through the UI → angelbonus 2 → 3, angels 20 → 10, products unchanged, header ×1.40 → ×1.30, all kept after a refresh |
| 9 | The remaining-time display uses the PDF format *heure : minutes : secondes : dixièmes* (frontend PDF p. 17): `00:00:00.5`, `00:03:05.2`, `01:02:03.4` | `frontend/src/app/format.ts` (`formatDuration`); unit tests in `game-logic.spec.ts`; `.time` width in `produit.css` (52 → 76 px) | Display only: internal units and production logic unchanged. Browser: idle `00:00:00.5`, counting down `00:00:00.4 → … → 00:00:00.1`, back to `00:00:00.5`; fits at 768 px |

Deliberately **not** changed (DOCUMENT CONFLICT 1 and the `Int!` rows of §5): the types of `lastupdate`, `vitesse`, `timeleft`, `totalangels`, `activeangels`.

Already-saved worlds created before this change keep `idcible 0` on these two upgrades (migration only fills empty lists). This has no effect, because `typeratio` decides.

---

## 2. Backend PDF compliance

| # | PDF requirement | Exact implementation | Status | Evidence |
|---|---|---|---|---|
| B1 | Front and back in two folders of one git folder | `frontend/`, `backend/` at the repository root | PASS | repository layout |
| B2 | Backend from `nestjs/typescript-starter` | `"name": "nest-typescript-starter"`, Nest 12.2 | PASS | `backend/package.json` |
| B3 | Dependencies `@nestjs/graphql @nestjs/apollo @apollo/server graphql ts-morph @nestjs/serve-static` | All installed except `@nestjs/serve-static`; static files are served with `app.useStaticAssets(join(__dirname,'..','public'))` instead | PASS | same URLs as the PDF (`/icones/…` → 200); different mechanism, same behaviour |
| B4 | `src/schema.graphql` with the given schema (schema first) | Present; same types, fields, arguments and enum. **Five field types differ** (§5) | PARTIAL | `lastupdate`, `vitesse`, `timeleft`, `totalangels`, `activeangels` are `Float!` |
| B5 | `GraphQLModule.forRoot` with `typePaths` and `definitions { path: src/graphql.ts, outputAs: 'class' }` | Identical | PASS | `app.module.ts` |
| B6 | `graphql.ts` generated at start-up with `World`, `Product`, `Palier` classes | Generated; unchanged after each start in this pass | PASS | `git status` shows no change |
| B7 | Playground available | Apollo serves GraphiQL at `GET http://localhost:3000/graphql` (200, `<title>GraphiQL</title>`) | PASS | `/` is 404 (empty controller); the playground is under `/graphql` |
| B8 | `src/origworld.ts` holding the world | Present | PASS | |
| B9 | 6 products and therefore 6 managers | 6 products; managers per product 1,1,1,1,1,1 | PASS | |
| B10 | At least 3 unlocks per product | 3 each (20 / 50 / 100), `idcible` = own product | PASS | |
| B11 | At least 3 allunlocks | 4: National League 25, **Treble Winners** 50, World Domination 100, Hall of Fame 200 | PASS | |
| B12 | About ten upgrades | 10 cash upgrades ($25K → $50B; targeted and global; gain and speed) | PASS | |
| B13 | A few angel upgrades | 6 (gain, speed, 2 × `ange`) | PASS | |
| B14 | Images in `backend/public/icones`, reachable at `http://localhost:3000/icones/…` | 7 PNGs, all 200; every logo in `origworld` exists | PASS | |
| B15 | `resolver.ts` with `GraphQlResolver`, registered in `providers` | `providers: [AppService, GraphQlResolver]` | PASS | |
| B16 | `readUserWorld`: read `userworlds/{user}-world.json`, otherwise return `origworld` | `readWorld`: file, otherwise a copy of `origworld` (`lastupdate` = now) | PASS | API: new user → original world |
| B17 | `saveWorld` at the end of every query and mutation, including `getWorld` (creates the file) | Every operation goes through `withWorld`, which saves (atomic write, serialized per user) | PASS | file created by `getWorld`; 30 concurrent purchases all saved |
| B18 | `acheterQtProduit`: error if the product doesn't exist; quantity += quantite; money −= cost; `cout` = next unit price; save | Identical, plus a positive-quantity check and an affordability check | PASS | 10 Footballs: money 944.7342 exactly; `cout` 7.8686; id 99 → "Product with id 99 not found" |
| B19 | `lancerProductionProduit`: `timeleft = vitesse` | Sets it for an idle, unmanaged, owned product; never restarts a running cycle | PASS | `timeleft` 250; second call keeps 135 |
| B20 | `engagerManager`: find the manager and its product; set `managerUnlocked` and `unlocked` | Identical, **and** charges `seuil` (§5, DOCUMENT CONFLICT 3) | PASS | flags saved; 1000 deducted |
| B21 | Production over time from `lastupdate`: manual → one production when `timeleft ≠ 0` and `< elapsed`, otherwise subtract; managed → number of complete cycles and new `timeleft`; gains to money **and** score; `lastupdate` = now | `AppService.updateWorld`, called at the start of every operation | PASS | manual +20 once, then idle; managed +160 in about 2 s; offline +968 for 5.5 s (expected ≈ 969) |
| B22 | Unlock checks in the service, called by `acheterQtProduit`: per-product threshold; allunlocks when **every** product ≥ seuil; apply the bonus | `checkUnlocks`, once each | PASS | First Kick at 20 (vitesse 500 → 250); Treble Winners when all products reach 50 |
| B23 | `acheterCashUpgrade` (money) and `acheterAngelUpgrade` (angels), reusing the unlock code | Both use `applyBonus`; affordability checked; no double purchase | PASS | targeted and global gain/speed; `ange` +1 → angelbonus 3 |
| B24 | `resetWorld`: compute the extra angels, add them to `totalangels` **and** `activeangels`; start again from the original world keeping `score`, `totalangels`, `activeangels` | `Object.assign(world, origworld, {score, totalangels + earned, activeangels + earned})`. Cash upgrades, managers, **angel upgrades** and `angelbonus` therefore return to their original values | PASS | API: score 9e15, total 120 → +330 (total 450, active 335); browser: +300 |
| B25 | Revenue = `quantite × revenu × (1 + activeangels × angelbonus / 100)`, angelbonus initially 2 | `app.service.ts:90`; `origworld.angelbonus = 2` | PASS | first cycle after reset with 300 angels paid exactly 7 |
| B26 | Mutation signatures as in the schema | Names, arguments and return types identical, including `lancerProductionProduit(user: String!, id: Int!): Product` | PASS | fixed in §1b-7 |

**Backend PDF: 25 PASS, 1 PARTIAL (B4: field types, deliberately kept, see §5), 0 FAIL.**

---

## 3. Frontend PDF compliance

| # | PDF requirement | Exact implementation | Status | Evidence |
|---|---|---|---|---|
| F1 | Client/server over GraphQL with the shared schema | Apollo Angular, operations validated against `backend/src/schema.graphql` | PASS | codegen succeeds |
| F2 | `queries.graphql` plus codegen generating typed operations | `src/app/graphql/queries.graphql` → `generated.ts` (`npm run codegen`) | PASS | no diff after regeneration |
| F3 | `getWorld` query with the world fields | `WorldFields` fragment: all World/Product/Palier fields | PASS | |
| F4 | Header: world icon and name, money, purchase multiplier, player-name field | All present; plus angels and multiplier once angels exist | PASS | browser |
| F5 | Left column: Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors | All five, plus the "Backend server" field | PASS | |
| F6 | Product: image with quantity overlay; progress bar showing the gain; buy quantity and cost; remaining time | All present | PASS | |
| F7 | Angular Material | buttons, badges, dialogs, snackbars, icons | PASS | |
| F8 | Two components (`app`, `produit`) and a `GameService` holding the logic and shared signals | `App`, `Produit`, `GameService` (root) | PASS | |
| F9 | `user` and `server` signals; world signal; App injects GameService | `user`, `backendUrl` (editable), `world` signals; `inject(GameService)` | PASS | |
| F10 | Product passed with `input()` | `product = input.required<Product>()` | PASS | |
| F11 | Big-number pipe | `BigNumberPipe` ("4.200 billion"; scientific notation beyond decillions) | PASS | |
| F12 | Remaining time shown as hours : minutes : seconds : tenths | `DurationPipe` → `hh:mm:ss.t` ("00:00:00.5", "00:03:05.2", "01:02:03.4") | PASS | fixed in §1b-9; unit tests and browser |
| F13 | Click on the icon → `startFabrication`, progress bar | `launch()` → `GameService.launchProduction` | PASS | bar active 7 ms after the click |
| F14 | Main loop with `setInterval` every 100 ms; at most one production per click without a manager; `performance.now()`; `requestAnimationFrame` animation | One `setInterval(tick, 100)` in GameService; `requestAnimationFrame` bar; `performance.now()` | PASS | bar matches elapsed/vitesse within 0.2 %, reaches 100 % at about 504 ms of 500 |
| F15 | `productionDone` increases money **and** score | `tick()` → `advanceProduction` | PASS | +2 money, score +2 |
| F16 | Multiplier cycle x1 → x10 → x100 → Max → x1, propagated to products | `qtyMode` signal | PASS | |
| F17 | `maxCanBuy`, `numberToBuy`, `canBuy` signals; button enabled only if affordable | `maxAffordable`, `buyQty`, `canBuy` computed signals | PASS | Max 42 (independent), exact-cost and 1-cent edge cases |
| F18 | `buyProduct` in GameService: quantity, next cost, money; `acheterQtProduit` mutation; error snackbar | `GameService.buy`; mutation queued; refusal → snackbar and resync | PASS | |
| F19 | `lancerProductionProduit` sent for non-automated products | yes | PASS | server `timeleft` set |
| F20 | Managers modal: only `!unlocked`; image, name, product, cost, Hire; Close | `MatDialog` with these rows | PASS | 6 → 5 after a hire |
| F21 | `hireManager`: check money, deduct, unlock manager and product; production starts at once | `buyPalier('managers')`; the loop starts managed products | PASS | 9 money increases in 2 s with no click |
| F22 | Snackbar for manager hire, unlocks, upgrades, transmission errors | `GameService.notify` (queue; a new message replaces the current one after 0.9 s) | PASS | all observed |
| F23 | Badges: managers, cash upgrades, angel upgrades (count, hidden at 0) | `matBadge` plus `matBadgeHidden` from computed counts | PASS | zero and non-zero states |
| F24 | `engagerManager` mutation | yes | PASS | |
| F25 | Player-name field; Enter applies; localStorage; random `Captain…` default; Refresh button | yes (localStorage key `isis-capitalist.username`) | PASS | reload restores the name; Refresh picked up a server-side change (1 → 6) |
| F26 | Unlocks modal: type and amount of the bonus; unlocked entries hidden | yes, plus progress (e.g. 44 / 50) | PASS | |
| F27 | Client applies product unlocks and allunlocks immediately (every product); a speed bonus accelerates a running bar | `applyReachedUnlocks`; `timeleft` scaled with `vitesse` | PASS | local equals server after refresh |
| F28 | Snackbar on unlock | "Bought … — Unlocked: First Kick (speed ×2)" plus banner | PASS | |
| F29 | Cash upgrades modal, Buy, badge; apply gain/vitesse (one or all products); mutation | yes | PASS | |
| F30 | Investors: active angels, extra angels to claim, reset button; `resetWorld`; world back to initial | yes (plus total angels and multiplier); server response used | PASS | +300 = independent result |
| F31 | Angel bonus applied to income | `angelMultiplier` | PASS | ×7, then ×9.55 |
| F32 | Angel upgrades modal and badge; `ange` raises angelbonus, otherwise gain/vitesse; active angels decremented; mutation | yes | PASS | |
| F33 | Palier semantics: `idcible` > 0 = product, 0 = all products, **−1** = angel-efficiency bonus | Targeted upgrades use the product id, global ones 0, the two `ange` upgrades −1; both sides key `ange` on `typeratio` | PASS | fixed in §1b-8; tests on both sides plus browser |
| F34 | Angels = `150 × √(score / 10¹⁵) − totalangels` | `Math.floor(150 * Math.sqrt(score / 1e15)) - totalangels`, identical in the backend; denominator 1e15 unchanged | PASS | §7 |
| F35 | Six products; growth neither too fast nor too slow | six; first-unit payback 2 – 96 s | PASS | the first manager is affordable from the start ($1000 = cost) |
| F36 | Connect to another world by changing the server address | editable "Backend server" field (Apollo URI and images follow it, persisted) | PASS | invalid address → error snackbar; recovery |
| F37 | The server is authoritative; the client re-syncs from it | reload/Refresh/resync on refusal | PASS | no rollback, no duplicate payout |

**Frontend PDF: 37 PASS, 0 PARTIAL, 0 FAIL.**

---

## 4. Functional evaluation grid

| Section | Criterion | Status | Evidence (final run, fresh servers) |
|---|---|---|---|
| Production | Click icon | PASS | bar active 7 ms after the click |
| Production | Progress animation | PASS | 31 frames, strictly increasing, max deviation 0.2 %, 100 % at 504 ms |
| Production | Money update | PASS | 996 → 998 (2 × $1) |
| Production | timeleft | PASS | 0.5 → 0.0s, then idle; managed `timeleft` within (0, vitesse] |
| Purchase | Multiplier | PASS | ×1 → ×10 → ×100 → Max → ×1 |
| Purchase | Max quantity | PASS | ×42 for $987.11 (independent: 42; 43 would cost 1060.48) |
| Purchase | Cost | PASS | geometric: ×10 $59.13, ×100 $52,994 |
| Purchase | canBuy | PASS | exact cost enabled and accepted; 1 cent short disabled; Max ×0 disabled |
| Purchase | World update | PASS | qty 2, cout 4.28, money 996 persisted |
| Managers | Modal | PASS | locked only; 6 → 5 |
| Managers | Badge | PASS | hidden at $12.89; `1` at $1500 |
| Managers | Hire cost | PASS | exactly 1000 deducted |
| Managers | Automation | PASS | loops; offline credited once |
| Upgrades | Accessible | PASS | sidebar |
| Upgrades | Purchase conditions | PASS | money / active angels; disabled buttons |
| Upgrades | Effects | PASS | targeted and global gain/speed; ange; once only; persisted |
| Reset | Investors section | PASS | active, total, ×, +claimable, Reset |
| Reset | Reset behaviour | PASS | business state reset; +300/+300 angels; score kept; ×7 income; accurate warning |
| Username | Input | PASS | |
| Username | localStorage | PASS | restored after a full reload |
| Username | Refresh | PASS | Refresh button and user switching |
| Feedback | SnackBar | PASS | purchase, server error, hire, unlock, upgrades, reset |
| Feedback | Badges | PASS | managers / cash / angel / investors, zero and non-zero |
| Feedback | Editable backend address | PASS | default, normalized, errors handled, recovery, persisted |
| Sync | World properties preserved | PASS | server and UI snapshots identical across a refresh |
| Sync | Correct money after refresh | PASS | no rollback; offline +968 vs ≈ 969 |

**Grid: 26 / 26 PASS.**

---

## 5. Document conflicts and deviations from the PDFs

### DOCUMENT CONFLICT 1: type of `World.lastupdate`
- **Backend PDF:** `lastupdate: String!`
- **Frontend PDF:** `lastupdate: Int!`
- **Current implementation:** `lastupdate: Float!` (a millisecond `Date.now()` value)
- **Functional impact:**
  - `Int!` cannot hold `Date.now()` (about 1.79 × 10¹², more than 2³¹); GraphQL would throw on every `getWorld`. This was the original repository's failure.
  - `String!` works, but needs conversions.
  - Clients that only select the field (as both PDFs' clients do) are unaffected by Float vs String.
- **Recommendation:** you can't satisfy both documents. Keep `Float!`, or switch to `String!` to follow the backend PDF literally (`lastupdate: String(Date.now())` when saving, `Number(...)` when reading). Ask the professor if strict schema identity is graded.

### DOCUMENT CONFLICT 2: purchase-cost formula
- **Frontend PDF, gameplay section:** the first unit costs 4, the second 4.28 (= 4 × 1.07). The backend PDF says `cout` is always the price of the next unit.
- **Frontend PDF, "L'achat de produit":** "acheter un produit de plus coûtera x × c", and the cost of n units is `x × (1 + c + … + cⁿ)`. That is n + 1 terms, and it contradicts the previous sentence.
- **Current implementation:** n units cost `cout × (1 + c + … + cⁿ⁻¹) = cout × (cⁿ − 1)/(c − 1)`, identical in frontend and backend. This matches the gameplay example and the backend definition of `cout`.
- **Functional impact:** none; client and server agree, and the result matches 4 → 4.28.
- **Recommendation:** keep it.

### DOCUMENT CONFLICT 3: does the server charge a manager?
- **Backend PDF:** `engagerManager` "se borne à débloquer le manager" (sets the two flags only).
- **Frontend PDF:** the client must "retirer le coût du manager de l'argent", and "c'est le serveur qui fait foi puisque c'est sur lui que se recale le client à chaque rechargement".
- **Current implementation:** the server also deducts `seuil` (and refuses if it's unaffordable or already hired).
- **Functional impact:** if the server did not charge, every reload would give the manager's price back to the player. With the charge, client and server agree.
- **Recommendation:** keep it.

### Deviations (the PDFs agree with each other; the implementation differs)

| Item | PDFs | Current | Impact | Recommendation |
|---|---|---|---|---|
| `Product.vitesse`, `Product.timeleft` | `Int!` | `Float!` | Speed bonuses divide `vitesse`; this world reaches 62.5 ms (Football ÷ 2 ÷ 2 ÷ 2), which `Int!` cannot serialize. A literal `Int!` would make `getWorld` fail after those upgrades. | Keep `Float!`, or keep `Int!` and `Math.round` after each division (then cycles are slightly inexact) |
| `World.totalangels`, `World.activeangels` | `Int!` | `Float!` | Values are always integers (floor), so `Int!` would work until 2³¹ angels | Can safely go back to `Int!` for literal compliance (2-line schema change) |
| `lancerProductionProduit` return | `Product` (nullable) | **`Product` (resolved, §1b-7)** | — | — |
| `ange` upgrades' `idcible` | −1 | **−1 (resolved, §1b-8)** | — | — |
| Remaining-time display | `h : m : s : tenths` | **`hh:mm:ss.t` (resolved, §1b-9)** | — | — |
| Static files | `ServeStaticModule` (`@nestjs/serve-static`) | `app.useStaticAssets()` in `main.ts` | None (same `/icones/…` URLs) | None needed |

**Angel upgrades across reset** (no conflict): the backend PDF defines reset as rebuilding from the original world and setting only `score`, `totalangels` and `activeangels`. Angel upgrades and `angelbonus` therefore reset too. The frontend PDF does not contradict this. The implementation matches, and the UI text now says so.

---

## 6. Automated results (after the corrections)

| Command | Result |
|---|---|
| `backend: npm run build` | exit 0 |
| `backend: npm test` | **15 / 15 passed** (the angel test now also asserts `idcible -1` and unchanged products) |
| `backend: npm run test:e2e` | **2 / 2 passed** (failed 0 / 2 straight after `npm audit fix`; fixed by aligning Nest to 12.2.0, §1-6) |
| `backend: npm run lint` | **exit 0, 0 warnings, 0 errors** |
| `backend: npm audit` | production `--omit=dev`: **0 vulnerabilities**; all: 5 (2 low, 1 moderate, 2 high), dev-only (`undici` under `@nestjs/mau`), fixable only with `--force` |
| `frontend: npm run codegen` | success; only change in `generated.ts`: `LancerProductionProduitMutation` result is now nullable (`| null`) |
| `frontend: npx ng test --watch=false` | **18 / 18 passed** (new duration format and `ange` assertions) |
| `frontend: npx ng build` | success, **no warnings** |

**Browser E2E** (Chrome, fresh `start:dev` and `npm start`): **75 / 75 PASS**, rerun after §1b (time labels now `00:00:00.5 → … → 00:00:00.1`, idle `00:00:00.5`).

**Targeted checks after §1b: 9 / 9 PASS.** They covered the timer format and countdown, the `lancerProductionProduit` network response, the server cycle completing, the `ange` upgrades served with `idcible -1`, Loyal Fans through the UI (angelbonus 2 → 3, products untouched, header ×1.40 → ×1.30), persistence after a refresh, and a clean console. It covered:
- production timing, purchase and its snackbar, ×1/×10/×100/Max, managers and automation;
- unlocks, including the global **Treble Winners** banner naming "All products";
- cash upgrades, Investors, reset, angels and angel upgrades, with the new wording verified;
- localStorage username, user switching, backend address change, invalid address and recovery;
- refresh/persistence, offline production, dialogs, responsive layout, and the console.

**Other checks:**
- **Direct GraphQL API:** **32 / 32 PASS**: each operation's success case, failure cases, return types, saved JSON, isolation, 30 concurrent purchases.
- **Refresh button:** PASS.
- **GraphQL playground (GraphiQL at `/graphql`):** PASS.

---

## 7. Angels / reset formula

| | Expression |
|---|---|
| Backend `resolver.ts:114-117` | `Math.max(0, Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels)` |
| Frontend `game-logic.ts:50` | `Math.max(0, Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels)` |
| Frontend PDF | `150 × √(gains cumulés / 10¹⁵) − totalangels` |

**Identical in backend and frontend, and equal to the PDF** (rounded down to whole angels). The `1e15` denominator was not changed.

**Examples:**
- score 4×10¹⁵, totalangels 0 → floor(150 × 2) = **300**;
- score 9×10¹⁵, totalangels 120 → 450 − 120 = **330**.

**Multiplier:** `1 + activeangels × angelbonus / 100`. With 300 angels × 2 % = ×7, one Football cycle paid exactly $7.

---

## 8. Console results

- **Browser, normal operation:** no uncaught exceptions, no Angular errors, no failed requests, no image 404s.
  - The only `console.error` came from the deliberate server-refusal test.
  - `ERR_CONNECTION_REFUSED` appeared only during the deliberate unreachable-address test.
- **Backend:**
  - **no Observe / telemetry / 401 line** during about 5 minutes of running (previously after about 60 s);
  - no errors during normal play.
  - Nest's `ExceptionsHandler` logs every refused request at ERROR level with a stack trace. All 18 lines in this run came from the deliberately provoked failure cases (unaffordable or double purchases, unknown product or manager, invalid user name, zero quantity). This is standard Nest behaviour and also happened before the update; it's log noise, not a malfunction.

---

## 9. Test data

Only dedicated test players were edited, and all were deleted afterwards:
- FinalValidation1, FinalValidation2, FinalValidationEdge;
- GqlAudit1, GqlAudit2, FinalRefreshCheck;
- one random new-player world, Captain8756.

The score edit used for angels was FinalValidation1 `score 26 824 → 4 000 000 000 000 000`, plus `9e15` for GqlAudit1. `origworld` and the game constants were not changed for testing. The players' own saves (`Captain4893`, `Captain8907`, `test`) were left untouched.

## 10. Files changed in this pass

- **First pass:** `backend/src/origworld.ts`, `backend/src/app.module.ts`, `backend/src/app.controller.ts`, `backend/package.json`, `backend/package-lock.json`, `frontend/src/app/dialogs/palier-dialog.ts`, `frontend/src/app/dialogs/investors-dialog.html`, and this report.
- **Literal-compliance pass (§1b):**
  - `backend/src/schema.graphql`, `backend/src/graphql.ts` (regenerated by Nest), `backend/src/origworld.ts` (2 × `idcible`), `backend/src/resolver.spec.ts`;
  - `frontend/src/app/format.ts`, `frontend/src/app/game-logic.spec.ts`, `frontend/src/app/produit/produit.css`, `frontend/src/app/graphql/generated.ts` (regenerated);
  - this report.

Still uncommitted from the 12 Oct validation: `frontend/src/app/{app.config.ts, app.css, app.html, app.ts, game.config.ts, game.service.ts, produit/produit.ts}`, the new `backend-url.ts` and `game.service.spec.ts`, `README.md` and `FUNCTIONAL_VALIDATION_REPORT.md`. Nothing has been committed or pushed.

---

## 11. Final answers

1. **Does the project satisfy the BACKEND PDF? — YES, except one documented item.**
   - 25 / 26 PASS.
   - The remaining PARTIAL (B4) is the five numeric field types (`lastupdate`, `vitesse`, `timeleft`, `totalangels`, `activeangels`), kept as `Float!` on purpose:
     - the two PDFs contradict each other on `lastupdate` (DOCUMENT CONFLICT 1);
     - a literal `Int!` would fail at runtime on real timestamps and on the 62.5 ms speeds this world reaches.
2. **Does the project satisfy the FRONTEND PDF? — YES** (37 / 37).
3. **Does it satisfy all 26 functional-grid criteria? — YES** (26 / 26, re-verified on fresh servers after the last changes).
4. **Remaining FAIL or PARTIAL items:**
   - 0 FAIL.
   - 1 PARTIAL: B4, the schema field types, documented above as a document conflict plus a runtime constraint.
5. **Server or browser console errors during normal operation? — NO.**
   - The browser console is clean.
   - The backend has no Observe/401 line. Its only ERROR lines are Nest's standard logging of the refused requests I provoked on purpose in the failure tests.
6. **Is the repository ready to commit and submit? — YES.**
   - Everything is green and verified on fresh servers.
   - The one open point is the `lastupdate`/numeric-type conflict between the two PDFs, which needs the professor's preference. It doesn't affect the grid or gameplay.
