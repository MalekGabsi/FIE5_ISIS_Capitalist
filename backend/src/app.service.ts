import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { World } from './graphql.js';
import { origworld } from './origworld.js';
@Injectable()
export class AppService {
  readUserWorld(user: string): World {
    try {
      const data = fs.readFileSync(
        path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      );
      return JSON.parse(data.toString());
    } catch (e: unknown) {
      
      console.log((e as Error).message);
      const newWorld = JSON.parse(JSON.stringify(origworld)); // Deep copy of the original world
      this.saveWorld(user, newWorld); // Save the new world file
      return newWorld;
    }
  }

  saveWorld(user: string, world: World) {
    fs.writeFile(
      path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      JSON.stringify(world),
      (err) => {
        if (err) {
          console.error(err);
          throw new Error(`Erreur d'écriture du monde coté serveur`);
        }
      },
    );
  }
  updateWorld(world: World) {
    const currentTime = Date.now();
    const elapsedTime = currentTime - world.lastupdate;
  
    world.products.forEach((produit) => {
      const angelBonusMultiplier = 1 + (world.activeangels * world.angelbonus) / 100;
  
      if (produit.managerUnlocked) {
        const productionCount = Math.floor(elapsedTime / produit.vitesse);
        world.money += productionCount * produit.revenu * produit.quantite * angelBonusMultiplier;
      } else if (produit.timeleft > 0) {
        if (elapsedTime >= produit.timeleft) {
          world.money += produit.revenu * produit.quantite * angelBonusMultiplier;
          produit.timeleft = 0;
        } else {
          produit.timeleft -= elapsedTime;
        }
      }
    });
  
    world.lastupdate = currentTime;
  }
  checkUnlocks(world: World) {
    // Check product-specific unlocks
    world.products.forEach((produit) => {
      produit.paliers.forEach((palier) => {
        if (!palier.unlocked && produit.quantite >= palier.seuil) {
          palier.unlocked = true;
  
          // Apply the bonus
          if (palier.typeratio === 'vitesse') {
            produit.vitesse /= palier.ratio;
          } else if (palier.typeratio === 'gain') {
            produit.revenu *= palier.ratio;
          }
        }
      });
    });
  
    // Check global unlocks
    world.allunlocks.forEach((unlock) => {
      if (!unlock.unlocked && world.products.every((p) => p.quantite >= unlock.seuil)) {
        unlock.unlocked = true;
  
        // Apply the bonus
        if (unlock.typeratio === 'vitesse') {
          world.products.forEach((p) => (p.vitesse /= unlock.ratio));
        } else if (unlock.typeratio === 'gain') {
          world.products.forEach((p) => (p.revenu *= unlock.ratio));
        }
      }
    });
  }
  getOriginalWorld(): World {
    return JSON.parse(JSON.stringify(origworld)); // Deep copy of the original world
  }
}