import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo } from 'apollo-angular';
import { of, Subject } from 'rxjs';
import { normalizeBackendUrl } from './backend-url';
import { World } from './game-logic';
import { GameService } from './game.service';

const world = (): World => ({
  name: 'Football Empire',
  logo: 'icones/football-empire.png',
  money: 1000,
  score: 0,
  totalangels: 0,
  activeangels: 0,
  angelbonus: 2,
  lastupdate: 0,
  products: [
    {
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
    },
  ],
  allunlocks: [],
  upgrades: [],
  angelupgrades: [],
  managers: [],
});

describe('normalizeBackendUrl', () => {
  it('normalizes common inputs and rejects non-http addresses', () => {
    expect(normalizeBackendUrl(' localhost:3000/ ')).toBe('http://localhost:3000');
    expect(normalizeBackendUrl('http://localhost:3000/graphql')).toBe('http://localhost:3000');
    expect(normalizeBackendUrl('https://api.example.com/game/')).toBe('https://api.example.com/game');
    expect(normalizeBackendUrl('ftp://localhost')).toBeNull();
    expect(normalizeBackendUrl('')).toBeNull();
    expect(normalizeBackendUrl('http://')).toBeNull();
  });
});

describe('GameService', () => {
  let game: GameService;
  /** Snackbar stub: each opened bar stays until dismissed (like the real one). */
  const snackbar = {
    open: vi.fn(() => {
      const closed = new Subject<void>();
      return {
        afterDismissed: () => closed,
        dismiss: vi.fn(() => {
          closed.next();
          closed.complete();
        }),
      };
    }),
  };
  const apollo = {
    query: vi.fn(() => of({ data: { getWorld: world() } })),
    mutate: vi.fn(() => of({ data: {} })),
  };

  beforeEach(async () => {
    localStorage.clear();
    snackbar.open.mockClear();
    apollo.query.mockClear();
    apollo.mutate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: Apollo, useValue: apollo },
        { provide: MatSnackBar, useValue: snackbar },
      ],
    });
    game = TestBed.inject(GameService);
    TestBed.tick();
    await game.loadWorld();
  });

  const messages = () => snackbar.open.mock.calls.map((call) => (call as unknown[])[0]);

  it('shows a snackbar for a successful product purchase and syncs it', async () => {
    expect(game.buy(1, 1)).toBe(true);
    expect(messages()).toContain('Bought 1 × Football for $4');
    await game.loadWorld();
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { user: game.user(), id: 1, quantite: 1 } }),
    );
  });

  it('starts a manual cycle at the click, not at the previous tick', () => {
    game.lastTick.set(performance.now() - 90); // clicked 90 ms after the last tick
    expect(game.launchProduction(1)).toBe(true);
    expect(game.world()!.products[0].timeleft).toBe(500);
    expect(performance.now() - game.lastTick()).toBeLessThan(20);
  });

  it('uses an edited backend address for images and reloads the world', async () => {
    expect(game.backendUrl()).toBe('http://localhost:3000');
    const loads = apollo.query.mock.calls.length;
    expect(game.setBackendUrl('localhost:4000/')).toBe(true);
    await game.loadWorld();
    expect(game.backendUrl()).toBe('http://localhost:4000');
    expect(game.imageUrl('icones/football.png')).toBe('http://localhost:4000/icones/football.png');
    expect(localStorage.getItem('isis-capitalist.backend')).toBe('http://localhost:4000');
    expect(apollo.query.mock.calls.length).toBeGreaterThan(loads);
    expect(game.setBackendUrl('ftp://nope')).toBe(false);
    expect(game.backendUrl()).toBe('http://localhost:4000');
  });

  it('replaces each snackbar after a short minimum instead of queueing behind it', async () => {
    game.notify('first');
    game.notify('second');
    game.notify('server error');
    expect(messages().at(-1)).toBe('first');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(messages().at(-1)).toBe('second');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(messages().at(-1)).toBe('server error');
  });
});
