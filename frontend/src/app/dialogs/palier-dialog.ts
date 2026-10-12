import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { BigNumberPipe } from '../format';
import { Palier } from '../game-logic';
import { bonusLabel, GameService } from '../game.service';

export type PalierDialogKind = 'managers' | 'upgrades' | 'angelupgrades' | 'unlocks';

interface KindConfig {
  title: string;
  intro: string;
  empty: string;
  action?: string;
}

interface Row {
  palier: Palier;
  target: string;
  /** Unlocks only: quantity reached toward the threshold. */
  reached?: number;
}

const KINDS: Record<PalierDialogKind, KindConfig> = {
  managers: {
    title: 'Managers',
    intro: 'Hire a manager and the product keeps producing on its own.',
    empty: 'No manager left to hire.',
    action: 'Hire',
  },
  upgrades: {
    title: 'Cash Upgrades',
    intro: 'Spend cash to boost revenue or speed.',
    empty: 'No cash upgrade available.',
    action: 'Buy',
  },
  angelupgrades: {
    title: 'Angel Upgrades',
    intro: 'Spend active angels on permanent boosts. Spent angels no longer add their bonus.',
    empty: 'No angel upgrade available.',
    action: 'Buy',
  },
  unlocks: {
    title: 'Unlocks',
    intro: 'Reach these quantities to unlock bonuses automatically.',
    empty: 'Every unlock has been reached!',
  },
};

@Component({
  selector: 'app-palier-dialog',
  imports: [MatDialogModule, MatButtonModule, BigNumberPipe],
  templateUrl: './palier-dialog.html',
  styleUrl: './dialogs.css',
})
export class PalierDialog {
  protected readonly game = inject(GameService);
  protected readonly kind = inject<PalierDialogKind>(MAT_DIALOG_DATA);
  protected readonly config = KINDS[this.kind];
  protected readonly bonusLabel = bonusLabel;

  protected readonly rows = computed<Row[]>(() => {
    const toRow = (palier: Palier): Row => ({ palier, target: this.game.targetLabel(palier) });
    switch (this.kind) {
      case 'managers':
        return this.game.lockedManagers().map(toRow);
      case 'upgrades':
        return this.game.lockedUpgrades().map(toRow);
      case 'angelupgrades':
        return this.game.lockedAngelUpgrades().map(toRow);
      case 'unlocks':
        return this.game.lockedUnlocks();
    }
  });

  /** Funds the items of this dialog are paid with. */
  private readonly funds = computed(() =>
    this.kind === 'angelupgrades' ? (this.game.world()?.activeangels ?? 0) : this.game.money(),
  );

  protected canAfford(palier: Palier): boolean {
    return palier.seuil <= this.funds();
  }

  protected act(palier: Palier): void {
    switch (this.kind) {
      case 'managers':
        return this.game.hireManager(palier.name);
      case 'upgrades':
        return this.game.buyCashUpgrade(palier.name);
      case 'angelupgrades':
        return this.game.buyAngelUpgrade(palier.name);
      case 'unlocks':
        return;
    }
  }
}
