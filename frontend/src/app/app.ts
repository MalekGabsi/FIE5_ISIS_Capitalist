import {
  afterRenderEffect,
  Component,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InvestorsDialog } from './dialogs/investors-dialog';
import { PalierDialog, PalierDialogKind } from './dialogs/palier-dialog';
import { BigNumberPipe } from './format';
import { GameService } from './game.service';
import { play } from './motion';
import { Produit } from './produit/produit';

/** The money display pulses at most this often, however fast products complete. */
const MONEY_PULSE_GAP_MS = 1200;

const DIALOG_CONFIG: MatDialogConfig = {
  maxWidth: '95vw',
  panelClass: 'fe-dialog',
  enterAnimationDuration: '220ms',
  exitAnimationDuration: '160ms',
};

@Component({
  selector: 'app-root',
  imports: [
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    BigNumberPipe,
    Produit,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly game = inject(GameService);
  private readonly dialog = inject(MatDialog);
  private readonly moneyDisplay = viewChild<ElementRef<HTMLElement>>('money');
  private readonly productCards = viewChildren(Produit, { read: ElementRef });

  /** Editable copy of the player name, reset whenever the real name changes. */
  protected readonly nameDraft = linkedSignal(() => this.game.user());
  protected readonly worldLogoFailed = signal(false);

  private lastFxId = 0;
  private lastPulseAt = 0;

  constructor() {
    // Staggered entrance when a different world is shown (first load, new
    // player, new season) — not on the regular game updates.
    afterRenderEffect(() => {
      this.game.replayKey();
      untracked(() => this.productCards()).forEach((card, i) =>
        play(
          card.nativeElement,
          [
            { opacity: 0, transform: 'translateY(18px) scale(0.97)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 420, delay: i * 55, fill: 'backwards', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        ),
      );
    });

    // Pulse the money display when production pays out (throttled).
    effect(() => {
      const events = this.game.fx();
      const paid = events.some((e) => e.id > this.lastFxId && e.kind === 'income');
      this.lastFxId = events.at(-1)?.id ?? this.lastFxId;
      const now = performance.now();
      if (!paid || now - this.lastPulseAt < MONEY_PULSE_GAP_MS) return;
      this.lastPulseAt = now;
      play(
        untracked(() => this.moneyDisplay())?.nativeElement,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.3 }, { transform: 'scale(1)' }],
        { duration: 420 },
      );
    });
  }

  protected submitName(): void {
    if (!this.game.setUser(this.nameDraft())) {
      this.nameDraft.set(this.game.user());
    }
  }

  protected open(kind: PalierDialogKind): void {
    this.dialog.open(PalierDialog, { ...DIALOG_CONFIG, data: kind, width: '560px' });
  }

  protected openInvestors(): void {
    this.dialog.open(InvestorsDialog, { ...DIALOG_CONFIG, width: '480px' });
  }

  protected celebrationDone(id: number, event: AnimationEvent): void {
    if (event.target === event.currentTarget) this.game.dismissCelebration(id);
  }
}
