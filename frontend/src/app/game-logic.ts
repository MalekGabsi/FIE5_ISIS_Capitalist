import type { WorldFieldsFragment } from './graphql/generated';

// Model types are derived from the generated (readonly) GraphQL types.
// Every function below is pure: it returns new objects instead of mutating.
export type World = WorldFieldsFragment;
export type Product = World['products'][number];
export type Palier = World['managers'][number];

export type QtyMode = 1 | 10 | 100 | 'max';
export const QTY_MODES: readonly QtyMode[] = [1, 10, 100, 'max'];

/** idcible value meaning "every product" for upgrades and unlocks. */
export const ALL_PRODUCTS = 0;

export function angelMultiplier(world: World): number {
  return 1 + (world.activeangels * world.angelbonus) / 100;
}

/** Revenue produced by one completed production cycle of a product. */
export function cycleRevenue(world: World, product: Product): number {
  return product.revenu * product.quantite * angelMultiplier(world);
}

/** Cost of buying n units: x * (1 + c + ... + c^(n-1)). */
export function purchaseCost(product: Product, n: number): number {
  if (n <= 0) return 0;
  const { cout: x, croissance: c } = product;
  if (c === 1) return x * n;
  return (x * (Math.pow(c, n) - 1)) / (c - 1);
}

/** Largest n such that purchaseCost(product, n) <= money. */
export function maxAffordable(product: Product, money: number): number {
  const { cout: x, croissance: c } = product;
  if (x <= 0 || money < x) return 0;
  let n =
    c === 1 ? Math.floor(money / x) : Math.floor(Math.log(1 + (money * (c - 1)) / x) / Math.log(c));
  // Guard against floating point rounding on either side of the boundary.
  while (n > 0 && purchaseCost(product, n) > money) n--;
  while (purchaseCost(product, n + 1) <= money) n++;
  return n;
}

export function quantityFor(mode: QtyMode, product: Product, money: number): number {
  return mode === 'max' ? maxAffordable(product, money) : mode;
}

/** Angels obtainable by resetting now (same formula as the backend resolver). */
export function claimableAngels(world: World): number {
  return Math.max(0, Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels);
}

function boostProduct(product: Product, palier: Palier): Product {
  switch (palier.typeratio) {
    case 'gain':
      return { ...product, revenu: product.revenu * palier.ratio };
    case 'vitesse':
      // Scale the running cycle too, so progress stays consistent.
      return {
        ...product,
        vitesse: product.vitesse / palier.ratio,
        timeleft: product.timeleft / palier.ratio,
      };
    case 'ange':
      return product;
  }
}

/** Applies the bonus of an unlock/upgrade to the product(s) it targets. */
export function applyBonus(world: World, palier: Palier): World {
  if (palier.typeratio === 'ange') {
    return { ...world, angelbonus: world.angelbonus + palier.ratio };
  }
  return {
    ...world,
    products: world.products.map((p) =>
      palier.idcible === ALL_PRODUCTS || palier.idcible === p.id ? boostProduct(p, palier) : p,
    ),
  };
}

function markUnlocked(list: readonly Palier[], name: string): Palier[] {
  return list.map((p) => (p.name === name ? { ...p, unlocked: true } : p));
}

/**
 * Unlocks every product palier / global unlock whose threshold is now reached
 * and applies its bonus. Already unlocked items are never applied twice.
 */
export function applyReachedUnlocks(world: World): { world: World; unlocked: Palier[] } {
  const unlocked: Palier[] = [];
  let next = world;

  for (const product of world.products) {
    for (const palier of product.paliers) {
      if (palier.unlocked || product.quantite < palier.seuil) continue;
      unlocked.push(palier);
      next = {
        ...next,
        products: next.products.map((p) =>
          p.id === product.id
            ? boostProduct({ ...p, paliers: markUnlocked(p.paliers, palier.name) }, palier)
            : p,
        ),
      };
    }
  }

  for (const unlock of world.allunlocks) {
    if (unlock.unlocked || !world.products.every((p) => p.quantite >= unlock.seuil)) continue;
    unlocked.push(unlock);
    next = applyBonus(
      { ...next, allunlocks: markUnlocked(next.allunlocks, unlock.name) },
      { ...unlock, idcible: ALL_PRODUCTS },
    );
  }

  return { world: next, unlocked };
}

/** Buys n units of a product locally. Returns null when unaffordable. */
export function buyProduct(
  world: World,
  productId: number,
  n: number,
): { world: World; cost: number; unlocked: Palier[] } | null {
  const product = world.products.find((p) => p.id === productId);
  if (!product || n <= 0) return null;
  const cost = purchaseCost(product, n);
  if (cost > world.money) return null;

  const bought: World = {
    ...world,
    money: world.money - cost,
    products: world.products.map((p) =>
      p.id === productId
        ? { ...p, quantite: p.quantite + n, cout: p.cout * Math.pow(p.croissance, n) }
        : p,
    ),
  };
  return { ...applyReachedUnlocks(bought), cost };
}

export type PalierList = 'managers' | 'upgrades' | 'angelupgrades';

/**
 * Buys a manager, cash upgrade or angel upgrade locally. Managers and cash
 * upgrades are paid with money, angel upgrades with active angels.
 * Returns null when the item is unknown, already owned, or unaffordable.
 */
export function buyPalier(world: World, list: PalierList, name: string): World | null {
  const palier = world[list].find((p) => p.name === name);
  if (!palier || palier.unlocked) return null;

  const payWithAngels = list === 'angelupgrades';
  const funds = payWithAngels ? world.activeangels : world.money;
  if (funds < palier.seuil) return null;

  const paid: World = {
    ...world,
    [list]: markUnlocked(world[list], name),
    money: payWithAngels ? world.money : world.money - palier.seuil,
    activeangels: payWithAngels ? world.activeangels - palier.seuil : world.activeangels,
  };

  if (list === 'managers') {
    return {
      ...paid,
      products: paid.products.map((p) =>
        p.id === palier.idcible ? { ...p, managerUnlocked: true } : p,
      ),
    };
  }
  return applyBonus(paid, palier);
}

/** Starts a manual production cycle. Returns null if it cannot start. */
export function startProduction(world: World, productId: number): World | null {
  const product = world.products.find((p) => p.id === productId);
  if (!product || product.quantite === 0 || product.timeleft > 0 || product.managerUnlocked) {
    return null;
  }
  return {
    ...world,
    products: world.products.map((p) =>
      p.id === productId ? { ...p, timeleft: p.vitesse } : p,
    ),
  };
}

export interface ProductionGain {
  productId: number;
  amount: number;
}

/**
 * Advances production by `elapsed` ms. Managed products loop continuously
 * (possibly completing several cycles in one step, e.g. after the tab was in
 * the background); manual products complete at most one cycle.
 * Returns the same world object (and no gains) when nothing changed.
 * Mirrors AppService.updateWorld on the backend.
 */
export function advanceProduction(
  world: World,
  elapsed: number,
): { world: World; gains: ProductionGain[] } {
  if (elapsed <= 0) return { world, gains: [] };
  const multiplier = angelMultiplier(world);
  const gains: ProductionGain[] = [];
  let changed = false;

  const products = world.products.map((p) => {
    if (p.quantite === 0 || p.vitesse <= 0) return p;
    if (!p.managerUnlocked && p.timeleft <= 0) return p;

    const remaining = (p.timeleft > 0 ? p.timeleft : p.vitesse) - elapsed;
    let completed = 0;
    let timeleft = remaining;
    if (remaining <= 0) {
      if (p.managerUnlocked) {
        const overshoot = -remaining;
        completed = 1 + Math.floor(overshoot / p.vitesse);
        timeleft = p.vitesse - (overshoot % p.vitesse);
      } else {
        completed = 1;
        timeleft = 0;
      }
      gains.push({ productId: p.id, amount: p.revenu * p.quantite * completed * multiplier });
    }

    changed = true;
    return { ...p, timeleft };
  });

  if (!changed) return { world, gains };
  const gain = gains.reduce((sum, g) => sum + g.amount, 0);
  return {
    world: { ...world, products, money: world.money + gain, score: world.score + gain },
    gains,
  };
}
