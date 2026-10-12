import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { BigNumberPipe, DurationPipe, formatCompact } from '../format';
import { cycleRevenue, Product, purchaseCost, quantityFor } from '../game-logic';
import { GameFx, GameService } from '../game.service';
import { play } from '../motion';

/** Below this cycle time a managed bar would just flicker: it is shown as a full "turbo" bar. */
const TURBO_MS = 300;
/** Minimum gap between two floating gains of one product (fast cycles are summed). */
const FLOAT_GAP_MS = 450;
const MAX_FLOATS = 4;

interface FloatingGain {
  id: number;
  text: string;
  /** Small horizontal offset so consecutive gains do not overlap exactly. */
  dx: number;
}

@Component({
  selector: 'app-produit',
  imports: [MatButtonModule, BigNumberPipe, DurationPipe],
  templateUrl: './produit.html',
  styleUrl: './produit.css',
})
export class Produit {
  protected readonly game = inject(GameService);

  readonly product = input.required<Product>();

  private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');
  private readonly logo = viewChild.required<ElementRef<HTMLElement>>('logo');
  private readonly qty = viewChild.required<ElementRef<HTMLElement>>('qty');
  private readonly flash = viewChild.required<ElementRef<HTMLElement>>('flash');
  private readonly fill = viewChild.required<ElementRef<HTMLElement>>('fill');

  protected readonly floats = signal<readonly FloatingGain[]>([]);

  protected readonly owned = computed(() => this.product().quantite > 0);
  protected readonly automated = computed(() => this.product().managerUnlocked);
  protected readonly producing = computed(() => this.owned() && this.product().timeleft > 0);
  protected readonly turbo = computed(
    () => this.producing() && this.automated() && this.product().vitesse < TURBO_MS,
  );

  protected readonly revenue = computed(() => {
    const world = this.game.world();
    return world ? cycleRevenue(world, this.product()) : 0;
  });

  protected readonly buyQty = computed(() =>
    quantityFor(this.game.qtyMode(), this.product(), this.game.money()),
  );
  protected readonly buyCost = computed(() => purchaseCost(this.product(), this.buyQty()));
  protected readonly canBuy = computed(
    () => this.buyQty() > 0 && this.buyCost() <= this.game.money(),
  );

  /** Progress at tick resolution, for the time label and assistive technologies. */
  protected readonly progressPct = computed(() => {
    const { timeleft, vitesse } = this.product();
    return this.producing() && vitesse > 0 ? Math.round(100 * (1 - timeleft / vitesse)) : 0;
  });

  private lastFxId = untracked(() => this.game.fx().at(-1)?.id ?? 0);
  private pendingGain = 0;
  private lastFloatAt = 0;
  private nextFloatId = 0;

  constructor() {
    // Smooth bar: interpolates between game ticks on each animation frame and
    // writes the clip directly (no signal write, no change detection per frame).
    effect((onCleanup) => {
      const fill = this.fill().nativeElement;
      if (!this.producing() || this.turbo() || typeof requestAnimationFrame === 'undefined') {
        fill.style.clipPath = '';
        return;
      }
      let handle = 0;
      const frame = () => {
        const { timeleft, vitesse } = this.product();
        const sinceTick = Math.max(0, performance.now() - this.game.lastTick());
        const progress = vitesse > 0 ? 1 - Math.max(0, timeleft - sinceTick) / vitesse : 0;
        fill.style.clipPath = `inset(0 ${(100 * (1 - progress)).toFixed(2)}% 0 0)`;
        handle = requestAnimationFrame(frame);
      };
      handle = requestAnimationFrame(frame);
      onCleanup(() => cancelAnimationFrame(handle));
    });

    // A different world is shown (new season, new player): drop old floating gains.
    effect(() => {
      this.game.replayKey();
      untracked(() => this.floats.set([]));
    });

    // React to new game events that concern this product.
    effect(() => {
      const events = this.game.fx();
      const id = untracked(() => this.product().id);
      for (const event of events) {
        if (event.id <= this.lastFxId) continue;
        this.lastFxId = event.id;
        if (event.kind === 'income' && event.productId === id) this.onIncome(event.amount);
        if (event.kind === 'flash' && (event.productId === id || event.productId === 'all')) {
          this.onFlash(event);
        }
      }
    });
  }

  protected launch(): void {
    if (!this.game.launchProduction(this.product().id)) return;
    play(
      this.logo().nativeElement,
      [
        { transform: 'scale(1)' },
        { transform: 'scale(0.88) rotate(-8deg)', offset: 0.35 },
        { transform: 'scale(1.08) rotate(4deg)', offset: 0.7 },
        { transform: 'scale(1)' },
      ],
      { duration: 360 },
    );
  }

  protected buy(): void {
    if (this.canBuy()) this.game.buy(this.product().id, this.buyQty());
  }

  protected removeFloat(id: number, event: AnimationEvent): void {
    if (event.target !== event.currentTarget) return;
    this.floats.update((list) => list.filter((f) => f.id !== id));
  }

  private onIncome(amount: number): void {
    this.pendingGain += amount;
    const now = performance.now();
    if (now - this.lastFloatAt < FLOAT_GAP_MS) return;
    this.lastFloatAt = now;
    const gain: FloatingGain = {
      id: this.nextFloatId++,
      text: `+$${formatCompact(this.pendingGain)}`,
      dx: ((this.nextFloatId * 7) % 5) * 6 - 12,
    };
    this.pendingGain = 0;
    this.floats.update((list) => [...list, gain].slice(-MAX_FLOATS));
  }

  private onFlash(event: Extract<GameFx, { kind: 'flash' }>): void {
    const flash = this.flash().nativeElement;
    flash.dataset['tone'] = event.tone;
    const strength = event.productId === 'all' ? 0.35 : 0.7;
    play(flash, [{ opacity: 0 }, { opacity: strength, offset: 0.25 }, { opacity: 0 }], {
      duration: event.productId === 'all' ? 900 : 650,
    });
    if (event.tone === 'buy') {
      play(
        this.qty().nativeElement,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.4 }, { transform: 'scale(1)' }],
        { duration: 380 },
      );
    }
    if (event.tone === 'manager') {
      play(
        this.card().nativeElement,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.025)', offset: 0.4 }, { transform: 'scale(1)' }],
        { duration: 500 },
      );
    }
  }
}
