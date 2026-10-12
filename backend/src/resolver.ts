import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService, gameError, purchaseCost } from './app.service.js';
import { Palier, Product, World } from './graphql.js';

/** Relative tolerance so float rounding never refuses an exactly affordable purchase. */
const EPSILON = 1e-9;

@Resolver('World')
export class GraphQlResolver {
  constructor(private service: AppService) {}

  @Query()
  async getWorld(@Args('user') user: string): Promise<World> {
    return this.service.withWorld(user, (world) => world);
  }

  @Mutation()
  async acheterQtProduit(
    @Args('user') user: string,
    @Args('id') id: number,
    @Args('quantite') quantite: number,
  ): Promise<Product> {
    if (!Number.isInteger(quantite) || quantite < 1) {
      throw gameError('Quantity must be a positive integer');
    }
    return this.service.withWorld(user, (world) => {
      const produit = findProduct(world, id);
      const cost = purchaseCost(produit, quantite);
      if (world.money < cost * (1 - EPSILON)) {
        throw gameError('Not enough money to purchase the product');
      }
      world.money = Math.max(0, world.money - cost);
      produit.quantite += quantite;
      produit.cout *= Math.pow(produit.croissance, quantite);
      this.service.checkUnlocks(world);
      return produit;
    });
  }

  @Mutation()
  async lancerProductionProduit(
    @Args('user') user: string,
    @Args('id') id: number,
  ): Promise<Product> {
    return this.service.withWorld(user, (world) => {
      const produit = findProduct(world, id);
      if (produit.quantite === 0) {
        throw gameError(`You don't own any ${produit.name} yet`);
      }
      // Managed products already loop; a running cycle is never restarted.
      if (!produit.managerUnlocked && produit.timeleft <= 0) {
        produit.timeleft = produit.vitesse;
      }
      return produit;
    });
  }

  @Mutation()
  async engagerManager(@Args('user') user: string, @Args('name') name: string): Promise<Palier> {
    return this.service.withWorld(user, (world) => {
      const manager = findPalier(world.managers, name, 'Manager');
      const produit = findProduct(world, manager.idcible);
      if (manager.unlocked) throw gameError(`${manager.name} is already hired`);
      if (world.money < manager.seuil * (1 - EPSILON)) {
        throw gameError('Not enough money to hire this manager');
      }
      world.money = Math.max(0, world.money - manager.seuil);
      manager.unlocked = true;
      produit.managerUnlocked = true;
      return manager;
    });
  }

  @Mutation()
  async acheterCashUpgrade(@Args('user') user: string, @Args('name') name: string): Promise<Palier> {
    return this.service.withWorld(user, (world) => {
      const upgrade = findPalier(world.upgrades, name, 'Upgrade');
      if (upgrade.unlocked) throw gameError(`${upgrade.name} is already bought`);
      if (world.money < upgrade.seuil * (1 - EPSILON)) {
        throw gameError('Not enough money to purchase the upgrade');
      }
      world.money = Math.max(0, world.money - upgrade.seuil);
      upgrade.unlocked = true;
      this.service.applyBonus(world, upgrade);
      return upgrade;
    });
  }

  @Mutation()
  async acheterAngelUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Promise<Palier> {
    return this.service.withWorld(user, (world) => {
      const upgrade = findPalier(world.angelupgrades, name, 'Angel upgrade');
      if (upgrade.unlocked) throw gameError(`${upgrade.name} is already bought`);
      if (world.activeangels < upgrade.seuil) {
        throw gameError('Not enough angels to purchase the upgrade');
      }
      world.activeangels -= upgrade.seuil;
      upgrade.unlocked = true;
      this.service.applyBonus(world, upgrade);
      return upgrade;
    });
  }

  /**
   * Starts a new season: the world is rebuilt from the original one, keeping
   * the cumulative score and the angels (including the ones earned now).
   */
  @Mutation()
  async resetWorld(@Args('user') user: string): Promise<World> {
    return this.service.withWorld(user, (world, now) => {
      const earned = Math.max(
        0,
        Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels,
      );
      Object.assign(world, this.service.getOriginalWorld(now), {
        score: world.score,
        totalangels: world.totalangels + earned,
        activeangels: world.activeangels + earned,
      });
      return world;
    });
  }
}

function findProduct(world: World, id: number): Product {
  const produit = world.products.find((p) => p.id === id);
  if (!produit) throw gameError(`Product with id ${id} not found`);
  return produit;
}

function findPalier(list: Palier[], name: string, label: string): Palier {
  const palier = list.find((p) => p.name === name);
  if (!palier) throw gameError(`${label} "${name}" not found`);
  return palier;
}
