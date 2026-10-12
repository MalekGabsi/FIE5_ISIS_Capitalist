import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { BACKEND_URL, TICK_MS, USERNAME_STORAGE_KEY } from './game.config';
import {
  ALL_PRODUCTS,
  advanceProduction,
  angelMultiplier,
  buyPalier,
  buyProduct,
  claimableAngels,
  Palier,
  PalierList,
  QTY_MODES,
  QtyMode,
  startProduction,
  World,
} from './game-logic';
import {
  AcheterAngelUpgradeDocument,
  AcheterCashUpgradeDocument,
  AcheterQtProduitDocument,
  EngagerManagerDocument,
  GetWorldDocument,
  LancerProductionProduitDocument,
  ResetWorldDocument,
} from './graphql/generated';

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;
const MAX_FX = 40;

export interface UnlockProgress {
  palier: Palier;
  target: string;
  /** Quantity owned toward the threshold (lowest product quantity for global unlocks). */
  reached: number;
}

/** Visual events for the views (floating income, card highlights). */
export type GameFx =
  | { id: number; kind: 'income'; productId: number; amount: number }
  | { id: number; kind: 'flash'; productId: number | 'all'; tone: 'buy' | 'manager' | 'upgrade' };

type NewFx = GameFx extends infer F ? (F extends GameFx ? Omit<F, 'id'> : never) : never;

/** Temporary banner (unlock reached, new season). */
export interface Celebration {
  id: number;
  title: string;
  name: string;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly apollo = inject(Apollo);
  private readonly snackBar = inject(MatSnackBar);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly backendUrl = BACKEND_URL;

  readonly user = signal(this.initialUser());
  readonly world = signal<World | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly qtyMode = signal<QtyMode>(1);

  /** performance.now() of the last production tick; lets views interpolate progress. */
  readonly lastTick = signal(0);

  /** Recent visual events, newest last; consumers remember the last id they handled. */
  readonly fx = signal<readonly GameFx[]>([]);
  readonly celebrations = signal<readonly Celebration[]>([]);
  /** Changes when a different world is shown (new player, new season): views replay their entrance. */
  readonly replayKey = signal(0);

  readonly money = computed(() => this.world()?.money ?? 0);
  readonly angelMultiplier = computed(() => {
    const world = this.world();
    return world ? angelMultiplier(world) : 1;
  });
  readonly claimableAngels = computed(() => {
    const world = this.world();
    return world ? claimableAngels(world) : 0;
  });

  readonly productNames = computed(
    () => new Map(this.world()?.products.map((p) => [p.id, p.name]) ?? []),
  );

  readonly lockedManagers = computed(() => this.locked('managers'));
  readonly lockedUpgrades = computed(() => this.locked('upgrades'));
  readonly lockedAngelUpgrades = computed(() => this.locked('angelupgrades'));
  /** Locked unlocks with the quantity currently reached toward their threshold. */
  readonly lockedUnlocks = computed<UnlockProgress[]>(() => {
    const world = this.world();
    if (!world) return [];
    const productUnlocks = world.products.flatMap((product) =>
      product.paliers
        .filter((u) => !u.unlocked)
        .map((palier) => ({ palier, target: product.name, reached: product.quantite })),
    );
    const lowestQuantity = world.products.length
      ? Math.min(...world.products.map((p) => p.quantite))
      : 0;
    const globalUnlocks = world.allunlocks
      .filter((u) => !u.unlocked)
      .map((palier) => ({ palier, target: 'All products', reached: lowestQuantity }));
    return [...productUnlocks, ...globalUnlocks].sort((a, b) => a.palier.seuil - b.palier.seuil);
  });

  readonly affordableManagers = computed(
    () => this.lockedManagers().filter((m) => m.seuil <= this.money()).length,
  );
  readonly affordableUpgrades = computed(
    () => this.lockedUpgrades().filter((u) => u.seuil <= this.money()).length,
  );
  readonly affordableAngelUpgrades = computed(() => {
    const angels = this.world()?.activeangels ?? 0;
    return this.lockedAngelUpgrades().filter((u) => u.seuil <= angels).length;
  });

  /**
   * Every server call (loads and mutations) runs through this queue, in order,
   * so a reload always reflects the mutations sent before it.
   */
  private queue: Promise<unknown> = Promise.resolve();
  /** Number of optimistic local actions so far; detects edits made while a load is in flight. */
  private localEdits = 0;
  private loadRequest = 0;
  private loadedUser: string | null = null;
  private resyncQueued = false;
  private nextId = 1;
  private readonly pendingMessages: string[] = [];

  constructor() {
    if (!this.isBrowser) return;

    // Persist the player name and (re)load their world whenever it changes.
    effect(() => {
      const user = this.user();
      try {
        localStorage.setItem(USERNAME_STORAGE_KEY, user);
      } catch (error) {
        console.warn('[GameService] could not persist the player name', error);
      }
      untracked(() => this.loadWorld());
    });

    this.lastTick.set(performance.now());
    const timer = setInterval(() => this.tick(), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  imageUrl(logo: string): string {
    return `${this.backendUrl}/${logo.replace(/^\/+/, '')}`;
  }

  targetLabel(palier: Palier): string {
    if (palier.typeratio === 'ange') return 'Investors';
    if (palier.idcible === ALL_PRODUCTS) return 'All products';
    return this.productNames().get(palier.idcible) ?? `Product #${palier.idcible}`;
  }

  cycleQtyMode(): void {
    this.qtyMode.update((mode) => QTY_MODES[(QTY_MODES.indexOf(mode) + 1) % QTY_MODES.length]);
  }

  /** Returns false (and notifies) when the name is not acceptable. */
  setUser(name: string): boolean {
    const trimmed = name.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      this.notify('Name must be 1–30 letters, digits, "-" or "_".');
      return false;
    }
    if (trimmed === this.user()) {
      this.loadWorld();
    } else {
      this.user.set(trimmed);
    }
    return true;
  }

  /** Fetches the authoritative world (the server credits offline production first). */
  loadWorld(): Promise<void> {
    const user = this.user();
    const request = ++this.loadRequest;
    this.loading.set(true);
    return this.enqueue(async () => {
      const editsAtSend = this.localEdits;
      try {
        const result = await firstValueFrom(
          this.apollo.query({ query: GetWorldDocument, variables: { user } }),
        );
        if (request !== this.loadRequest) return;
        const world = result.data?.getWorld;
        if (!world) throw new Error('getWorld returned no world');
        this.setWorld(world, user);
        this.loadError.set(null);
        // Actions taken during the request are not in this snapshot: their
        // mutations are queued behind it, so fetch once more after them.
        if (this.localEdits !== editsAtSend) this.resync();
      } catch (error) {
        if (request !== this.loadRequest) return;
        console.error(`[GameService] getWorld failed for "${user}"`, error);
        this.loadError.set(errorMessage(error));
        this.notify(`Could not load the world: ${errorMessage(error)}`);
      } finally {
        if (request === this.loadRequest) this.loading.set(false);
      }
    });
  }

  /** Returns true when the purchase was made. */
  buy(productId: number, quantity: number): boolean {
    const world = this.world();
    if (!world) return false;
    const result = buyProduct(world, productId, quantity);
    if (!result) {
      this.notify('Not enough money for this purchase.');
      return false;
    }
    this.world.set(result.world);
    this.emit({ kind: 'flash', productId, tone: 'buy' });
    for (const unlock of result.unlocked) {
      this.celebrate('Unlocked', unlock.name, `${this.targetFor(unlock)} · ${bonusLabel(unlock)}`);
    }
    if (result.unlocked.length) {
      this.notify(`Unlocked: ${result.unlocked.map((u) => `${u.name} (${bonusLabel(u)})`).join(', ')}`);
    }
    const user = this.user();
    this.sync('acheterQtProduit', () =>
      this.apollo.mutate({
        mutation: AcheterQtProduitDocument,
        variables: { user, id: productId, quantite: quantity },
      }),
    );
    return true;
  }

  /** Returns true when a production cycle was started. */
  launchProduction(productId: number): boolean {
    const world = this.world();
    const next = world && startProduction(world, productId);
    if (!next) return false;
    this.world.set(next);
    const user = this.user();
    this.sync('lancerProductionProduit', () =>
      this.apollo.mutate({
        mutation: LancerProductionProduitDocument,
        variables: { user, id: productId },
      }),
    );
    return true;
  }

  hireManager(name: string): void {
    if (!this.buyPalierLocally('managers', name)) return;
    const manager = this.findPalier('managers', name);
    const product = this.productNames().get(manager?.idcible ?? -1);
    if (manager) this.emit({ kind: 'flash', productId: manager.idcible, tone: 'manager' });
    this.notify(`${name} hired${product ? ` — ${product} now runs automatically` : ''}!`);
    const user = this.user();
    this.sync('engagerManager', () =>
      this.apollo.mutate({ mutation: EngagerManagerDocument, variables: { user, name } }),
    );
  }

  buyCashUpgrade(name: string): void {
    if (!this.buyPalierLocally('upgrades', name)) return;
    this.flashTarget(this.findPalier('upgrades', name));
    this.notify(`Upgrade bought: ${name}`);
    const user = this.user();
    this.sync('acheterCashUpgrade', () =>
      this.apollo.mutate({ mutation: AcheterCashUpgradeDocument, variables: { user, name } }),
    );
  }

  buyAngelUpgrade(name: string): void {
    if (!this.buyPalierLocally('angelupgrades', name)) return;
    this.flashTarget(this.findPalier('angelupgrades', name));
    this.notify(`Angel upgrade bought: ${name}`);
    const user = this.user();
    this.sync('acheterAngelUpgrade', () =>
      this.apollo.mutate({ mutation: AcheterAngelUpgradeDocument, variables: { user, name } }),
    );
  }

  /** Resets the world on the server; the server's response is authoritative. */
  resetWorld(): Promise<void> {
    const user = this.user();
    // Queued behind pending mutations, so the server resets the latest state.
    return this.enqueue(async () => {
      try {
        const before = this.world();
        const result = await firstValueFrom(
          this.apollo.mutate({ mutation: ResetWorldDocument, variables: { user } }),
        );
        const world = result.data?.resetWorld;
        if (!world) throw new Error('resetWorld returned no world');
        const earned = world.totalangels - (before?.totalangels ?? world.totalangels);
        this.setWorld(world, user, true);
        this.celebrate(
          'New season',
          earned > 0 ? `+${earned} angels` : 'Fresh start',
          `Revenue bonus ×${angelMultiplier(world).toFixed(2)}`,
          true,
        );
        this.notify(earned > 0 ? `Fresh season! +${earned} angels recruited.` : 'Fresh season started!');
      } catch (error) {
        console.error('[GameService] resetWorld failed', error);
        this.notify(`Reset failed: ${errorMessage(error)}`);
      }
    });
  }

  dismissCelebration(id: number): void {
    this.celebrations.update((list) => list.filter((c) => c.id !== id));
  }

  /** Shows snackbars one after another so a sync error never hides an unlock message. */
  notify(message: string): void {
    if (this.pendingMessages.includes(message)) return;
    this.pendingMessages.push(message);
    // Keep the one on screen plus the 3 most recent: never lag behind the game.
    if (this.pendingMessages.length > 4) this.pendingMessages.splice(1, 1);
    if (this.pendingMessages.length === 1) this.showNextMessage();
  }

  private showNextMessage(): void {
    const message = this.pendingMessages[0];
    if (message === undefined) return;
    const duration = this.pendingMessages.length > 1 ? 2000 : 3500;
    this.snackBar
      .open(message, 'OK', { duration })
      .afterDismissed()
      .subscribe(() => {
        this.pendingMessages.shift();
        this.showNextMessage();
      });
  }

  private tick(): void {
    const now = performance.now();
    const elapsed = now - this.lastTick();
    this.lastTick.set(now);
    const world = this.world();
    if (!world) return;
    const { world: next, gains } = advanceProduction(world, elapsed);
    if (next !== world) this.world.set(next);
    if (gains.length) this.emit(...gains.map((g) => ({ kind: 'income' as const, ...g })));
  }

  private setWorld(world: World, user: string, replay = false): void {
    if (replay || user !== this.loadedUser) {
      this.replayKey.update((k) => k + 1);
      // Messages about the previous world are no longer relevant.
      this.pendingMessages.splice(1);
    }
    this.loadedUser = user;
    this.lastTick.set(performance.now());
    this.world.set(world);
  }

  private emit(...events: NewFx[]): void {
    const stamped = events.map((e) => ({ ...e, id: this.nextId++ }) as GameFx);
    this.fx.update((list) => [...list, ...stamped].slice(-MAX_FX));
  }

  /** Queues a banner; `replace` drops older ones (a new season makes them irrelevant). */
  private celebrate(title: string, name: string, detail: string, replace = false): void {
    const banner = { id: this.nextId++, title, name, detail };
    this.celebrations.update((list) => (replace ? [banner] : [...list, banner].slice(-3)));
  }

  private flashTarget(palier: Palier | undefined): void {
    if (!palier) return;
    const productId =
      palier.typeratio === 'ange' || palier.idcible === ALL_PRODUCTS ? 'all' : palier.idcible;
    this.emit({ kind: 'flash', productId, tone: 'upgrade' });
  }

  private targetFor(palier: Palier): string {
    const owner = this.world()?.products.find((p) => p.paliers.some((u) => u.name === palier.name));
    return owner?.name ?? 'All products';
  }

  private locked(list: PalierList): Palier[] {
    return (this.world()?.[list] ?? [])
      .filter((p) => !p.unlocked)
      .sort((a, b) => a.seuil - b.seuil);
  }

  private findPalier(list: PalierList, name: string): Palier | undefined {
    return this.world()?.[list].find((p) => p.name === name);
  }

  private buyPalierLocally(list: PalierList, name: string): boolean {
    const world = this.world();
    const next = world && buyPalier(world, list, name);
    if (!next) {
      this.notify(list === 'angelupgrades' ? 'Not enough angels.' : 'Not enough money.');
      return false;
    }
    this.world.set(next);
    return true;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /**
   * Sends a mutation for an action already applied locally (optimistic update).
   * If the server refuses it, the server state wins: the world is reloaded.
   */
  private sync(operation: string, request: () => Observable<unknown>): void {
    this.localEdits++;
    void this.enqueue(async () => {
      try {
        await firstValueFrom(request());
      } catch (error) {
        console.error(`[GameService] ${operation} failed`, error);
        this.notify(`The server refused this action (${errorMessage(error)}). Resyncing…`);
        this.resync();
      }
    });
  }

  /** Reloads once after the queued calls, however many failures asked for it. */
  private resync(): void {
    if (this.resyncQueued) return;
    this.resyncQueued = true;
    void this.enqueue(async () => {
      this.resyncQueued = false;
    }).then(() => this.loadWorld());
  }

  private initialUser(): string {
    if (!this.isBrowser) return '';
    try {
      const stored = localStorage.getItem(USERNAME_STORAGE_KEY);
      if (stored && USERNAME_PATTERN.test(stored)) return stored;
    } catch (error) {
      console.warn('[GameService] localStorage unavailable', error);
    }
    return `Captain${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export function bonusLabel(palier: Palier): string {
  switch (palier.typeratio) {
    case 'gain':
      return `revenue ×${palier.ratio}`;
    case 'vitesse':
      return `speed ×${palier.ratio}`;
    case 'ange':
      return `angel bonus +${palier.ratio}%`;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
