import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppService, purchaseCost } from './app.service.js';
import { World } from './graphql.js';
import { GraphQlResolver } from './resolver.js';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();

describe('ISIS Capitalist backend', () => {
  let dir: string;
  let service: AppService;
  let resolver: GraphQlResolver;

  const at = (ms: number) => vi.setSystemTime(T0 + ms);
  const saved = (user: string): World =>
    JSON.parse(readFileSync(join(dir, `${user}-world.json`), 'utf-8'));
  const seed = (user: string, edit: (w: World) => void) => {
    const world = service.getOriginalWorld(T0);
    edit(world);
    writeFileSync(join(dir, `${user}-world.json`), JSON.stringify(world));
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    at(0);
    dir = mkdtempSync(join(tmpdir(), 'userworlds-'));
    process.env.USERWORLDS_DIR = dir;
    service = new AppService();
    resolver = new GraphQlResolver(service);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.USERWORLDS_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  describe('getWorld', () => {
    it('creates a complete new world without offline payout', async () => {
      const world = await resolver.getWorld('alice');
      expect(world.money).toBe(1000);
      expect(world.lastupdate).toBe(T0);
      expect(world.managers).toHaveLength(world.products.length);
      expect(world.upgrades.length).toBeGreaterThanOrEqual(8);
      expect(world.allunlocks.length).toBeGreaterThanOrEqual(3);
      expect(world.angelupgrades.some((u) => u.typeratio === 'ange')).toBe(true);
      expect(saved('alice').lastupdate).toBe(T0);
    });

    it('gives a legacy world (lastupdate 0, empty lists) its content without a payout', async () => {
      seed('legacy', (w) => {
        w.lastupdate = 0;
        w.managers = [];
        w.upgrades = [];
        w.products[0].managerUnlocked = true;
      });
      at(60_000);
      const world = await resolver.getWorld('legacy');
      expect(world.money).toBe(1000);
      expect(world.managers.length).toBe(6);
      expect(world.upgrades.length).toBeGreaterThan(0);
    });

    it('credits offline production of managed products, with the angel bonus', async () => {
      seed('offline', (w) => {
        w.products[0].managerUnlocked = true; // 1 football, 1$/0.5s
        w.activeangels = 10; // x1.2 with angelbonus 2
      });
      at(10_250);
      const world = await resolver.getWorld('offline');
      expect(world.money).toBeCloseTo(1000 + 20 * 1.2);
      expect(world.score).toBeCloseTo(20 * 1.2);
      expect(world.products[0].timeleft).toBeCloseTo(250);
      expect(world.lastupdate).toBe(T0 + 10_250);
    });

    it('completes a started manual production exactly once', async () => {
      await resolver.lancerProductionProduit('manual', 1);
      at(200);
      expect((await resolver.getWorld('manual')).products[0].timeleft).toBeCloseTo(300);
      at(5_000);
      const world = await resolver.getWorld('manual');
      expect(world.money).toBe(1001);
      expect(world.products[0].timeleft).toBe(0);
    });

    it('rejects user names that could escape the worlds directory', async () => {
      for (const user of ['../evil', 'a/b', 'C:\\x', '', 'x'.repeat(31)]) {
        await expect(resolver.getWorld(user)).rejects.toThrow(/Invalid user name/);
      }
    });
  });

  describe('acheterQtProduit', () => {
    it('returns the product and applies the geometric cost', async () => {
      const product = await resolver.acheterQtProduit('bob', 1, 10);
      expect(product.id).toBe(1);
      expect(product.quantite).toBe(11);
      expect(product.cout).toBeCloseTo(4 * 1.07 ** 10);
      const expectedCost = 4 * ((1.07 ** 10 - 1) / 0.07);
      expect(saved('bob').money).toBeCloseTo(1000 - expectedCost);
    });

    it('refuses unaffordable or invalid quantities without saving', async () => {
      await expect(resolver.acheterQtProduit('bob', 6, 1)).rejects.toThrow(/Not enough money/);
      await expect(resolver.acheterQtProduit('bob', 1, 0)).rejects.toThrow(/positive integer/);
      await expect(resolver.acheterQtProduit('bob', 42, 1)).rejects.toThrow(/not found/);
    });

    it('applies a reached product unlock once', async () => {
      const product = await resolver.acheterQtProduit('carl', 1, 19);
      expect(product.quantite).toBe(20);
      expect(product.vitesse).toBe(250);
      expect(product.paliers[0].unlocked).toBe(true);
      const again = await resolver.acheterQtProduit('carl', 1, 1);
      expect(again.vitesse).toBe(250);
    });

    it('applies a global unlock when every product reaches the threshold', async () => {
      seed('dora', (w) => {
        w.money = 1e12;
        w.products.forEach((p) => (p.quantite = p.id === 6 ? 24 : 25));
      });
      const club = await resolver.acheterQtProduit('dora', 6, 1);
      const world = saved('dora');
      expect(world.allunlocks.find((u) => u.name === 'National League')?.unlocked).toBe(true);
      expect(club.vitesse).toBe(24_000); // global speed x2 (the club's 20-palier is a gain bonus)
      expect(world.products[1].vitesse).toBe(750); // boots: own 20-palier x2, then global x2
    });

    it('serializes concurrent purchases so none is lost', async () => {
      seed('rush', (w) => (w.money = 1e9));
      await Promise.all(Array.from({ length: 25 }, () => resolver.acheterQtProduit('rush', 2, 1)));
      const world = saved('rush');
      expect(world.products[1].quantite).toBe(25);
      expect(world.money).toBeCloseTo(1e9 - purchaseCost(service.getOriginalWorld().products[1], 25));
    });
  });

  describe('managers and upgrades', () => {
    it('hires a manager by name, charges it and returns the palier', async () => {
      seed('eve', (w) => (w.money = 5000));
      const manager = await resolver.engagerManager('eve', 'Youth Coach');
      expect(manager.name).toBe('Youth Coach');
      expect(manager.unlocked).toBe(true);
      const world = saved('eve');
      expect(world.money).toBe(4000);
      expect(world.products[0].managerUnlocked).toBe(true);
      await expect(resolver.engagerManager('eve', 'Youth Coach')).rejects.toThrow(/already/);
      await expect(resolver.engagerManager('eve', 'Club President')).rejects.toThrow(/Not enough/);
    });

    it('applies a targeted cash upgrade only to its product', async () => {
      seed('fred', (w) => (w.money = 1e6));
      const upgrade = await resolver.acheterCashUpgrade('fred', 'Boot Sponsorship');
      expect(upgrade.unlocked).toBe(true);
      const world = saved('fred');
      expect(world.money).toBe(900_000);
      expect(world.products.map((p) => p.revenu)).toEqual([1, 180, 540, 4320, 51840, 622080]);
      await expect(resolver.acheterCashUpgrade('fred', 'Boot Sponsorship')).rejects.toThrow(
        /already/,
      );
    });

    it('applies a global cash upgrade to every product', async () => {
      seed('gina', (w) => (w.money = 1e9));
      await resolver.acheterCashUpgrade('gina', 'Training Ground');
      expect(saved('gina').products.map((p) => p.vitesse)).toEqual([
        250, 1500, 3000, 6000, 12000, 24000,
      ]);
    });

    it('pays angel upgrades with active angels and handles the ange type', async () => {
      seed('hugo', (w) => (w.activeangels = 12));
      const upgrade = await resolver.acheterAngelUpgrade('hugo', 'Loyal Fans');
      expect(upgrade.typeratio).toBe('ange');
      const world = saved('hugo');
      expect(world.activeangels).toBe(2);
      expect(world.angelbonus).toBe(3);
      expect(world.money).toBe(1000);
      await expect(resolver.acheterAngelUpgrade('hugo', 'Lucky Charm')).rejects.toThrow(
        /Not enough angels/,
      );
    });
  });

  describe('resetWorld', () => {
    it('rebuilds the world and keeps score and angels, adding the earned ones', async () => {
      seed('ivan', (w) => {
        w.score = 4e15;
        w.totalangels = 10;
        w.activeangels = 4;
        w.money = 123456;
        w.products[0].quantite = 300;
        w.managers[0].unlocked = true;
      });
      at(1_000);
      const world = await resolver.resetWorld('ivan');
      expect(world.score).toBe(4e15);
      expect(world.totalangels).toBe(300);
      expect(world.activeangels).toBe(294);
      expect(world.money).toBe(1000);
      expect(world.products[0].quantite).toBe(1);
      expect(world.managers[0].unlocked).toBe(false);
      expect(world.lastupdate).toBe(T0 + 1_000);
      expect(saved('ivan').activeangels).toBe(294);
    });
  });
});
