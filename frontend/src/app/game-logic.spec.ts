import {
  advanceProduction,
  applyReachedUnlocks,
  buyPalier,
  buyProduct,
  claimableAngels,
  maxAffordable,
  Palier,
  Product,
  purchaseCost,
  World,
} from './game-logic';
import { formatBigNumber, formatCompact, formatDuration } from './format';

const palier = (over: Partial<Palier>): Palier => ({
  name: 'P',
  logo: 'icones/x.png',
  seuil: 10,
  idcible: 1,
  ratio: 2,
  typeratio: 'gain',
  unlocked: false,
  ...over,
});

const product = (over: Partial<Product>): Product => ({
  id: 1,
  name: 'Football',
  logo: 'icones/football.png',
  cout: 4,
  croissance: 1.07,
  revenu: 1,
  vitesse: 500,
  quantite: 1,
  timeleft: 0,
  managerUnlocked: false,
  paliers: [],
  ...over,
});

const world = (over: Partial<World>): World => ({
  name: 'Test',
  logo: 'icones/x.png',
  money: 1000,
  score: 0,
  totalangels: 0,
  activeangels: 0,
  angelbonus: 2,
  lastupdate: 0,
  products: [product({})],
  allunlocks: [],
  upgrades: [],
  angelupgrades: [],
  managers: [],
  ...over,
});

describe('purchase math', () => {
  it('sums the geometric series', () => {
    const p = product({ cout: 4, croissance: 1.07 });
    expect(purchaseCost(p, 1)).toBeCloseTo(4);
    expect(purchaseCost(p, 3)).toBeCloseTo(4 + 4 * 1.07 + 4 * 1.07 ** 2);
  });

  it('finds the maximum affordable quantity', () => {
    const p = product({ cout: 4, croissance: 1.07 });
    const n = maxAffordable(p, 1000);
    expect(purchaseCost(p, n)).toBeLessThanOrEqual(1000);
    expect(purchaseCost(p, n + 1)).toBeGreaterThan(1000);
    expect(maxAffordable(p, 3)).toBe(0);
  });

  it('refuses unaffordable purchases and updates cost/quantity otherwise', () => {
    const w = world({ money: 10 });
    expect(buyProduct(w, 1, 100)).toBeNull();
    const result = buyProduct(w, 1, 2)!;
    expect(result.world.products[0].quantite).toBe(3);
    expect(result.world.products[0].cout).toBeCloseTo(4 * 1.07 ** 2);
    expect(result.world.money).toBeCloseTo(10 - 4 - 4 * 1.07);
    expect(w.products[0].quantite).toBe(1);
  });
});

describe('unlocks', () => {
  it('applies a product unlock once when the threshold is reached', () => {
    const w = world({
      products: [product({ quantite: 10, paliers: [palier({ seuil: 10, typeratio: 'vitesse' })] })],
    });
    const first = applyReachedUnlocks(w);
    expect(first.unlocked.length).toBe(1);
    expect(first.world.products[0].vitesse).toBe(250);
    const second = applyReachedUnlocks(first.world);
    expect(second.unlocked.length).toBe(0);
    expect(second.world.products[0].vitesse).toBe(250);
  });

  it('applies a global unlock only when every product reaches it', () => {
    const allunlocks = [palier({ name: 'All', seuil: 5, ratio: 3 })];
    const notYet = world({
      products: [product({ id: 1, quantite: 5 }), product({ id: 2, quantite: 4 })],
      allunlocks,
    });
    expect(applyReachedUnlocks(notYet).unlocked.length).toBe(0);
    const reached = world({
      products: [product({ id: 1, quantite: 5 }), product({ id: 2, quantite: 5, revenu: 10 })],
      allunlocks,
    });
    const result = applyReachedUnlocks(reached).world;
    expect(result.products.map((p) => p.revenu)).toEqual([3, 30]);
    expect(result.allunlocks[0].unlocked).toBe(true);
  });
});

describe('managers and upgrades', () => {
  it('hires a manager and flags its product', () => {
    const w = world({ managers: [palier({ name: 'Coach', seuil: 500, idcible: 1 })] });
    const next = buyPalier(w, 'managers', 'Coach')!;
    expect(next.money).toBe(500);
    expect(next.managers[0].unlocked).toBe(true);
    expect(next.products[0].managerUnlocked).toBe(true);
    expect(buyPalier(next, 'managers', 'Coach')).toBeNull();
  });

  it('pays angel upgrades with active angels and handles the ange bonus', () => {
    const w = world({
      activeangels: 5,
      angelupgrades: [palier({ name: 'Halo', seuil: 3, typeratio: 'ange', ratio: 1, idcible: -1 })],
    });
    const next = buyPalier(w, 'angelupgrades', 'Halo')!;
    expect(next.activeangels).toBe(2);
    expect(next.angelbonus).toBe(3);
    expect(next.money).toBe(1000);
  });
});

describe('production', () => {
  it('completes a manual cycle once and stops', () => {
    const w = world({ products: [product({ quantite: 2, revenu: 5, timeleft: 100 })] });
    const { world: next, gains } = advanceProduction(w, 150);
    expect(next.money).toBe(1010);
    expect(next.score).toBe(10);
    expect(next.products[0].timeleft).toBe(0);
    expect(gains).toEqual([{ productId: 1, amount: 10 }]);
    const idle = advanceProduction(next, 1000);
    expect(idle.world).toBe(next);
    expect(idle.gains).toEqual([]);
  });

  it('runs several managed cycles with the angel multiplier', () => {
    const w = world({
      activeangels: 10,
      angelbonus: 2,
      products: [product({ quantite: 1, revenu: 1, vitesse: 500, managerUnlocked: true })],
    });
    const { world: next } = advanceProduction(w, 1600);
    expect(next.money).toBeCloseTo(1000 + 3 * 1.2);
    expect(next.products[0].timeleft).toBeCloseTo(400);
  });

  it('computes claimable angels like the backend', () => {
    expect(claimableAngels(world({ score: 1e15 }))).toBe(150);
    expect(claimableAngels(world({ score: 1e15, totalangels: 200 }))).toBe(0);
  });
});

describe('formatting', () => {
  it('formats money and durations readably', () => {
    expect(formatBigNumber(4.28)).toBe('4.28');
    expect(formatBigNumber(12345.678)).toBe('12,346');
    expect(formatBigNumber(4.2e9)).toBe('4.200 billion');
    expect(formatDuration(500)).toBe('0.5s');
    expect(formatDuration(185_000)).toBe('3m 05s');
    expect(formatDuration(7_390_000)).toBe('2h 03m 10s');
  });
});

describe('formatting edge cases', () => {
  it('hides floating point noise', () => {
    expect(formatBigNumber(207.0000000001)).toBe('207');
    expect(formatBigNumber(69.004)).toBe('69');
    expect(formatBigNumber(0.1 + 0.2)).toBe('0.30');
  });
});

describe('compact gains', () => {
  it('formats floating income like +$12 / +$2.4K / +$3.1M', () => {
    expect(formatCompact(12)).toBe('12');
    expect(formatCompact(1.256)).toBe('1.26');
    expect(formatCompact(2400)).toBe('2.4K');
    expect(formatCompact(3_100_000)).toBe('3.1M');
    expect(formatCompact(999_960)).toBe('1M');
    expect(formatCompact(4.2e12)).toBe('4.2T');
  });
});
