import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Palier, Product, RatioType, World } from './graphql.js';
import { origworld } from './origworld.js';

/** idcible value meaning "every product" for upgrades and unlocks. */
export const ALL_PRODUCTS = 0;

const USER_NAME = /^[A-Za-z0-9_-]{1,30}$/;

/** Error shown to the client as-is (no stack trace, BAD_USER_INPUT code). */
export function gameError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/** Cost of buying n units: cout * (1 + c + ... + c^(n-1)). */
export function purchaseCost(product: Product, n: number): number {
  const c = product.croissance;
  return c === 1 ? product.cout * n : (product.cout * (Math.pow(c, n) - 1)) / (c - 1);
}

@Injectable()
export class AppService {
  private readonly worldsDir =
    process.env.USERWORLDS_DIR ?? path.join(process.cwd(), 'userworlds');

  /** Tail of the pending operations per world file (per-user mutual exclusion). */
  private readonly locks = new Map<string, Promise<unknown>>();

  /**
   * Loads the user's world, credits the production elapsed since the last
   * update, runs `action` and saves the result. Calls for the same user are
   * serialized, so concurrent requests can never overwrite each other.
   * When `action` throws, nothing is saved.
   */
  async withWorld<T>(user: string, action: (world: World, now: number) => T): Promise<T> {
    const file = this.worldFile(user);
    const previous = this.locks.get(file) ?? Promise.resolve();
    const run = previous
      .catch(() => undefined)
      .then(async () => {
        const now = Date.now();
        const world = await this.readWorld(file, now);
        this.updateWorld(world, now);
        const result = action(world, now);
        await this.writeWorld(file, world);
        return result;
      });
    this.locks.set(file, run);
    try {
      return await run;
    } finally {
      if (this.locks.get(file) === run) this.locks.delete(file);
    }
  }

  /** Path of the user's world file; rejects names that are not plain identifiers. */
  worldFile(user: string): string {
    const name = user.trim();
    if (!USER_NAME.test(name)) {
      throw gameError('Invalid user name: use 1-30 letters, digits, "-" or "_".');
    }
    const file = path.join(this.worldsDir, `${name}-world.json`);
    if (path.dirname(file) !== path.resolve(this.worldsDir)) {
      throw gameError('Invalid user name.');
    }
    return file;
  }

  getOriginalWorld(now = Date.now()): World {
    const world = JSON.parse(JSON.stringify(origworld)) as World;
    world.lastupdate = now;
    return world;
  }

  /**
   * Credits production since world.lastupdate. Managed products loop and may
   * complete several cycles (offline progress); manual products complete at
   * most the cycle that was started. Same rules as the frontend game loop.
   */
  updateWorld(world: World, now = Date.now()): void {
    // New/legacy world or clock moved backwards: start counting from now.
    if (!(world.lastupdate > 0) || now <= world.lastupdate) {
      world.lastupdate = now;
      return;
    }
    const elapsed = now - world.lastupdate;
    const multiplier = 1 + (world.activeangels * world.angelbonus) / 100;
    let gain = 0;

    for (const produit of world.products) {
      if (produit.quantite === 0 || produit.vitesse <= 0) continue;
      if (!produit.managerUnlocked && produit.timeleft <= 0) continue;

      const remaining = (produit.timeleft > 0 ? produit.timeleft : produit.vitesse) - elapsed;
      let completed = 0;
      if (remaining > 0) {
        produit.timeleft = remaining;
      } else if (produit.managerUnlocked) {
        const overshoot = -remaining;
        completed = 1 + Math.floor(overshoot / produit.vitesse);
        produit.timeleft = produit.vitesse - (overshoot % produit.vitesse);
      } else {
        completed = 1;
        produit.timeleft = 0;
      }
      gain += produit.revenu * produit.quantite * completed * multiplier;
    }

    world.money += gain;
    world.score += gain;
    world.lastupdate = now;
  }

  /** Applies an unlock/upgrade bonus to its target product(s) or to the angel bonus. */
  applyBonus(world: World, palier: Palier, idcible = palier.idcible): void {
    if (palier.typeratio === RatioType.ange) {
      world.angelbonus += palier.ratio;
      return;
    }
    for (const produit of world.products) {
      if (idcible !== ALL_PRODUCTS && produit.id !== idcible) continue;
      if (palier.typeratio === RatioType.gain) {
        produit.revenu *= palier.ratio;
      } else {
        // Scale the running cycle too, so its progress stays consistent.
        produit.vitesse /= palier.ratio;
        produit.timeleft /= palier.ratio;
      }
    }
  }

  /** Unlocks reached product paliers and global unlocks, each exactly once. */
  checkUnlocks(world: World): void {
    for (const produit of world.products) {
      for (const palier of produit.paliers) {
        if (!palier.unlocked && produit.quantite >= palier.seuil) {
          palier.unlocked = true;
          this.applyBonus(world, palier, produit.id);
        }
      }
    }
    for (const unlock of world.allunlocks) {
      if (!unlock.unlocked && world.products.every((p) => p.quantite >= unlock.seuil)) {
        unlock.unlocked = true;
        this.applyBonus(world, unlock, ALL_PRODUCTS);
      }
    }
  }

  private async readWorld(file: string, now: number): Promise<World> {
    let data: string;
    try {
      data = await fs.readFile(file, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return this.getOriginalWorld(now);
      throw error;
    }
    let world: World;
    try {
      world = JSON.parse(data) as World;
    } catch {
      // Never silently replace a player's world with a fresh one.
      throw new Error(`World file ${path.basename(file)} is corrupted`);
    }
    this.migrate(world);
    return world;
  }

  /** Worlds saved before the lists were filled in get the current content. */
  private migrate(world: World): void {
    const original = this.getOriginalWorld();
    for (const list of ['allunlocks', 'upgrades', 'angelupgrades', 'managers'] as const) {
      if (!world[list]?.length) world[list] = original[list];
    }
  }

  /** Atomic write: a crash mid-write can never leave a truncated world file. */
  private async writeWorld(file: string, world: World): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(world));
    await fs.rename(tmp, file);
  }
}
