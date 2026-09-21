import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier, Product } from './graphql.js';

@Resolver('World')
export class GraphQlResolver {
    constructor(private service: AppService) { }
    @Query()
    async getWorld(@Args('user') user: string) {
        const world = this.service.readUserWorld(user);
        return world;
    }

    @Mutation()
    async acheterQtProduit(
        @Args('user') user: string,
        @Args('id') id: number,
        @Args('quantite') quantite: number,
    ) {
        const world = this.service.readUserWorld(user);
        const produit = world.products.find((p) => p.id === id);
        if (!produit) {
            throw new Error(`Produit with id ${id} not found`);
        }
        const totalCost = produit.cout * ((1 - Math.pow(produit.croissance, quantite)) / (1 - produit.croissance));

        if (world.money < totalCost) {
            throw new Error('Not enough money to purchase the product');
        }

        world.money -= totalCost;
        produit.quantite += quantite;
        produit.cout *= Math.pow(produit.croissance, quantite);
        this.service.checkUnlocks(world);
        this.service.saveWorld(user, world);

        return world;
    }
    @Mutation()
async lancerProductionProduit(@Args('user') user: string, @Args('id') id: number): Promise<Product> {
  const world = this.service.readUserWorld(user);
  const produit = world.products.find((p) => p.id === id);

  if (!produit) {
    throw new Error(`Produit with id ${id} not found`);
  }

  // Set the timeleft to the product's vitesse
  produit.timeleft = produit.vitesse;

  // Save the updated world
  this.service.saveWorld(user, world);

  // Return the updated product
  return produit;
}
    @Mutation()
    async engagerManager(@Args('user') user: string, @Args('managerName') managerName: string) {
        const world = this.service.readUserWorld(user);
        const manager = world.managers.find((m) => m.name === managerName);

        if (!manager) {
            throw new Error(`Manager with name ${managerName} not found`);
        }

        const produit = world.products.find((p) => p.id === manager.idcible);

        if (!produit) {
            throw new Error(`Produit with id ${manager.idcible} not found`);
        }

        manager.unlocked = true;
        produit.managerUnlocked = true;

        this.service.saveWorld(user, world);

        return world;
    }
    @Mutation()
async acheterCashUpgrade(@Args('user') user: string, @Args('name') name: string) {
  const world = this.service.readUserWorld(user);
  const upgrade = world.upgrades.find((item) => item.name === name);

  if (!upgrade) {
    throw new Error(`Upgrade with id ${name} not found`);
  }

  if (world.money < upgrade.seuil) {
    throw new Error('Not enough money to purchase the upgrade');
  }

  world.money -= upgrade.seuil;
  upgrade.unlocked = true;

  // Apply the bonus
  if (upgrade.typeratio === 'vitesse') {
    world.products.forEach((p) => (p.vitesse /= upgrade.ratio));
  } else if (upgrade.typeratio === 'gain') {
    world.products.forEach((p) => (p.revenu *= upgrade.ratio));
  }

  this.service.saveWorld(user, world);

  return world;
}

@Mutation()
async acheterAngelUpgrade(@Args('user') user: string, @Args('name') name: string) {
  const world = this.service.readUserWorld(user);
  const upgrade = world.angelupgrades.find((item) => item.name === name);

  if (!upgrade) {
    throw new Error(`Angel upgrade with id ${name} not found`);
  }

  if (world.activeangels < upgrade.seuil) {
    throw new Error('Not enough angels to purchase the upgrade');
  }

  world.activeangels -= upgrade.seuil;
  upgrade.unlocked = true;

  // Apply the bonus
  if (upgrade.typeratio === 'vitesse') {
    world.products.forEach((p) => (p.vitesse /= upgrade.ratio));
  } else if (upgrade.typeratio === 'gain') {
    world.products.forEach((p) => (p.revenu *= upgrade.ratio));
  }

  this.service.saveWorld(user, world);

  return world;
}
@Mutation()
async resetWorld(@Args('user') user: string) {
  const world = this.service.readUserWorld(user);

  // Calculate angels gained
  const angelsGained = Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels;
  if (angelsGained > 0) {
    world.totalangels += angelsGained;
    world.activeangels += angelsGained;
  }

  // Reset the world to its initial state
  const origWorld = this.service.getOriginalWorld(); // Assuming this method returns the original world
  origWorld.score = world.score; // Preserve the score
  origWorld.totalangels = world.totalangels; // Preserve total angels
  origWorld.activeangels = world.activeangels; // Preserve active angels

  this.service.saveWorld(user, origWorld);

  return origWorld;
}
}