import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('GraphQL API (e2e)', () => {
  let app: INestApplication;
  let dir: string;

  const gql = (query: string, variables: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables }).expect(200);

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'userworlds-e2e-'));
    process.env.USERWORLDS_DIR = dir;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.USERWORLDS_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves a world and a typed product purchase', async () => {
    const world = await gql(
      'query($user: String!) { getWorld(user: $user) { name money lastupdate managers { name } } }',
      { user: 'e2e' },
    );
    expect(world.body.errors).toBeUndefined();
    expect(world.body.data.getWorld.managers).toHaveLength(6);
    expect(world.body.data.getWorld.lastupdate).toBeGreaterThan(2 ** 31);

    const bought = await gql(
      'mutation($user: String!) { acheterQtProduit(user: $user, id: 1, quantite: 2) { id quantite } }',
      { user: 'e2e' },
    );
    expect(bought.body.errors).toBeUndefined();
    expect(bought.body.data.acheterQtProduit).toEqual({ id: 1, quantite: 3 });
  });

  it('returns a readable error for an invalid user name', async () => {
    const res = await gql('query { getWorld(user: "../x") { name } }', {});
    expect(res.body.errors[0].message).toMatch(/Invalid user name/);
  });
});
