import 'reflect-metadata';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import request from 'supertest';

const pg = new PGlite();
const testDb = drizzle({ client: pg });
jest.unstable_mockModule('../src/db/index.js', () => ({ db: testDb }));

const { SearchService } = await import('../src/search/search.service.js');
const { SearchQueryDto } =
  await import('../src/search/dto/search-query.dto.js');
const service = new SearchService();

beforeAll(async () => {
  // Only columns used by search and membership resolution are needed here.
  // This database lives in memory and never connects to DATABASE_URL.
  await pg.exec(`
    CREATE TABLE organization_member (id text PRIMARY KEY, organization_id text, user_id text, role text, status text, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now());
    CREATE TABLE "user" (id text PRIMARY KEY, name text, email text);
    CREATE TABLE customer (id text PRIMARY KEY, organization_id text, name text, phone text, email text, status text);
    CREATE TABLE service_request (id text PRIMARY KEY, organization_id text, customer_id text, title text, description text, status text);
    CREATE TABLE job (id text PRIMARY KEY, organization_id text, customer_id text, request_id text, title text, description text, location text, status text);
    CREATE TABLE technician (id text PRIMARY KEY, organization_id text, user_id text, employee_code text, phone text, status text);
    CREATE TABLE job_assignment (id text PRIMARY KEY, organization_id text, job_id text, technician_id text, status text);
    CREATE TABLE invoice (id text PRIMARY KEY, organization_id text, customer_id text, job_id text, invoice_number text, total numeric, currency text, status text);
  `);
}, 30000);

beforeEach(async () => {
  await pg.exec(`
    TRUNCATE organization_member, "user", customer, service_request, job, technician, job_assignment, invoice;
    INSERT INTO organization_member (id, organization_id, user_id, role, status) VALUES
      ('m-owner', 'a', 'owner', 'OWNER', 'ACTIVE'), ('m-admin', 'a', 'admin', 'ADMIN', 'ACTIVE'),
      ('m-dispatcher', 'a', 'dispatcher', 'DISPATCHER', 'ACTIVE'), ('m-tech', 'a', 'tech-user', 'TECHNICIAN', 'ACTIVE'),
      ('m-suspended', 'a', 'suspended', 'OWNER', 'SUSPENDED'), ('m-invited', 'a', 'invited', 'ADMIN', 'INVITED'),
      ('m-other', 'b', 'other-owner', 'OWNER', 'ACTIVE');
    INSERT INTO "user" VALUES ('tech-user', 'Alex Technician', 'alex@example.test'), ('other-tech', 'Alex Other', 'other@example.test');
    INSERT INTO customer VALUES ('c-a', 'a', 'Alex Customer', '5551234567', 'customer@example.test', 'ACTIVE'),
      ('c-hidden', 'a', 'Alex Hidden', '5557654321', null, 'ACTIVE'), ('c-b', 'b', 'Alex Foreign', '5559990000', null, 'ACTIVE');
    INSERT INTO service_request VALUES ('r-a', 'a', 'c-a', 'Alex Request', 'Repair a pump', 'ACCEPTED'),
      ('r-hidden', 'a', 'c-hidden', 'Alex Hidden Request', null, 'NEW'), ('r-b', 'b', 'c-b', 'Alex Foreign Request', null, 'ACCEPTED');
    INSERT INTO job VALUES ('j-a', 'a', 'c-a', 'r-a', 'Alex Job', 'Inspect pump', 'Warehouse', 'CONFIRMED'),
      ('j-hidden', 'a', 'c-hidden', 'r-hidden', 'Alex Hidden Job', null, null, 'DRAFT'),
      ('j-b', 'b', 'c-b', 'r-b', 'Alex Foreign Job', null, null, 'CONFIRMED');
    INSERT INTO technician VALUES ('t-a', 'a', 'tech-user', 'EMP-001', '5551112222', 'ACTIVE'),
      ('t-hidden', 'a', 'other-tech', 'EMP-002', null, 'ACTIVE'), ('t-b', 'b', 'tech-user', 'EMP-003', null, 'ACTIVE');
    INSERT INTO job_assignment VALUES ('assignment-a', 'a', 'j-a', 't-a', 'ASSIGNED');
    INSERT INTO invoice VALUES ('i-a', 'a', 'c-a', 'j-a', 'INV-001', 100, 'USD', 'SENT'),
      ('i-hidden', 'a', 'c-hidden', 'j-hidden', 'INV-002', 200, 'USD', 'DRAFT'),
      ('i-b', 'b', 'c-b', 'j-b', 'INV-003', 300, 'USD', 'SENT');
  `);
});

afterAll(async () => {
  await pg.close();
});

describe('global search permissions and SQL', () => {
  it.each(['owner', 'admin', 'dispatcher'])(
    'searches all five groups for %s, excluding every foreign organization row',
    async (actor) => {
      const result = await service.search(actor, 'a', '  aLeX  ');
      expect(result.query).toBe('aLeX');
      expect(
        result.groups.map((group) => group.results.map((row) => row.id).sort()),
      ).toEqual([
        ['c-a', 'c-hidden'],
        ['r-a', 'r-hidden'],
        ['j-a', 'j-hidden'],
        ['t-a', 't-hidden'],
        ['i-a', 'i-hidden'],
      ]);
      expect(JSON.stringify(result)).not.toContain('Foreign');
      expect(result.groups[0]!.results[0]).toEqual({
        id: 'c-a',
        title: 'Alex Customer',
        description: '5551234567 · customer@example.test',
        status: 'ACTIVE',
      });
    },
  );

  it('restricts technicians to assigned records and their own profile', async () => {
    const result = await service.search('tech-user', 'a', 'Alex');
    expect(
      result.groups.map((group) => group.results.map((row) => row.id)),
    ).toEqual([['c-a'], ['r-a'], ['j-a'], ['t-a'], ['i-a']]);
  });

  it.each(['RELEASED', 'CANCELLED'])(
    'revokes linked visibility for %s assignments',
    async (status) => {
      await pg.query('UPDATE job_assignment SET status = $1', [status]);
      const result = await service.search('tech-user', 'a', 'Alex');
      expect(
        result.groups.map((group) => group.results.map((row) => row.id)),
      ).toEqual([[], [], [], ['t-a'], []]);
    },
  );

  it('does not grant access through assignment or technician rows from another organization', async () => {
    await pg.exec(
      `UPDATE job_assignment SET organization_id = 'b'; INSERT INTO job_assignment VALUES ('wrong-tech-org', 'a', 'j-hidden', 't-b', 'ASSIGNED');`,
    );
    const result = await service.search('tech-user', 'a', 'Alex');
    expect(
      result.groups.map((group) => group.results.map((row) => row.id)),
    ).toEqual([[], [], [], ['t-a'], []]);
  });

  it.each(['outsider', 'suspended', 'invited'])(
    'denies %s even when a matching organization header is provided',
    async (actor) => {
      await expect(service.search(actor, 'a', 'Alex')).rejects.toMatchObject({
        status: 403,
      });
    },
  );

  it('denies an active member searching a different organization', async () => {
    await expect(service.search('owner', 'b', 'Alex')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('fails closed for an unsupported role', async () => {
    await pg.exec(
      `UPDATE organization_member SET role = 'VIEWER' WHERE user_id = 'owner'`,
    );
    await expect(service.search('owner', 'a', 'Alex')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('returns five ordered results and signals more matches without loading a full list', async () => {
    for (let i = 0; i < 8; i++)
      await pg.query(
        `INSERT INTO customer VALUES ($1, 'a', $2, '123', null, 'ACTIVE')`,
        [`extra-${i}`, `Limit ${i}`],
      );
    const result = await service.search('owner', 'a', 'Limit');
    expect(result.limitPerGroup).toBe(5);
    expect(result.groups[0]!.hasMore).toBe(true);
    expect(result.groups[0]!.results.map((row) => row.title)).toEqual([
      'Limit 0',
      'Limit 1',
      'Limit 2',
      'Limit 3',
      'Limit 4',
    ]);
  });

  it.each(['%_', '\\%', "' OR true --"])(
    'treats %s as literal text rather than SQL or wildcards',
    async (term) => {
      await pg.query('UPDATE customer SET name = $1 WHERE id = $2', [
        `Literal ${term} match`,
        'c-a',
      ]);
      const result = await service.search('owner', 'a', term);
      expect(result.groups[0]!.results.map((row) => row.id)).toEqual(['c-a']);
    },
  );

  it.each(['555123', 'customer@example', 'c-a'])(
    'searches customer contact information and IDs with %s',
    async (term) => {
      const result = await service.search('owner', 'a', term);
      expect(result.groups[0]!.results.map((row) => row.id)).toEqual(['c-a']);
    },
  );

  it('searches request descriptions, job locations, technician codes and invoice numbers', async () => {
    for (const [term, group, id] of [
      ['pump', 1, 'r-a'],
      ['Warehouse', 2, 'j-a'],
      ['EMP-001', 3, 't-a'],
      ['INV-001', 4, 'i-a'],
    ] as const) {
      expect(
        (await service.search('owner', 'a', term)).groups[group]!.results.map(
          (row) => row.id,
        ),
      ).toEqual([id]);
    }
  });

  it('returns empty groups for an unmatched term', async () => {
    const result = await service.search('owner', 'a', 'unmatched');
    expect(
      result.groups.every(
        (group) => group.results.length === 0 && !group.hasMore,
      ),
    ).toBe(true);
  });
});

describe('search validation', () => {
  it.each([undefined, '', ' ', 'a', ' a ', ['Alex'], 42, 'a'.repeat(101)])(
    'rejects invalid query %p',
    async (q) => {
      expect(
        (await validate(plainToInstance(SearchQueryDto, { q }))).length,
      ).toBeGreaterThan(0);
    },
  );

  it.each(['  ab  ', 'a'.repeat(100)])(
    'accepts valid query bounds',
    async (q) => {
      expect(await validate(plainToInstance(SearchQueryDto, { q }))).toEqual(
        [],
      );
    },
  );
});

describe('GET /search', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { SearchModule } = await import('../src/search/search.module.js');
    const module = await Test.createTestingModule({
      imports: [SearchModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // Exercise the real application auth guard, stubbing only its session provider.
    const options = {
      auth: {
        api: {
          getSession: async ({ headers }: { headers: Headers }) => {
            const token = headers.get('cookie');
            const actor =
              token === 'session=owner'
                ? 'owner'
                : token === 'session=tech'
                  ? 'tech-user'
                  : null;
            return actor
              ? { user: { id: actor }, session: { id: `session-${actor}` } }
              : null;
          },
        },
      },
    } as unknown as ConstructorParameters<typeof AuthGuard>[1];
    app.useGlobalGuards(new AuthGuard(new Reflector(), options));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the documented grouped response and disables shared caching', async () => {
    const result = await request(app.getHttpServer())
      .get('/search')
      .query({ q: ' Alex ' })
      .set('Cookie', 'session=owner')
      .set('x-organization-id', 'a')
      .expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({ query: 'Alex', limitPerGroup: 5 });
    expect(result.body.groups).toHaveLength(5);
  });

  it.each(['', 'session=invalid', 'session=expired'])(
    'requires a valid authenticated session for cookie %s',
    async (cookie) => {
      await request(app.getHttpServer())
        .get('/search?q=Alex')
        .set('Cookie', cookie)
        .set('x-organization-id', 'a')
        .expect(401);
    },
  );

  it('requires the organization header', async () => {
    await request(app.getHttpServer())
      .get('/search?q=Alex')
      .set('Cookie', 'session=owner')
      .expect(400);
  });

  it('rejects a forged organization context', async () => {
    await request(app.getHttpServer())
      .get('/search?q=Alex')
      .set('Cookie', 'session=owner')
      .set('x-organization-id', 'b')
      .expect(403);
  });

  it.each([
    '',
    '?q=a',
    `?q=${'a'.repeat(101)}`,
    '?q=Alex&q=Other',
    '?q=Alex&organizationId=b',
  ])('rejects invalid query parameters %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/search${query}`)
      .set('Cookie', 'session=owner')
      .set('x-organization-id', 'a')
      .expect(400);
  });

  it('applies technician permissions through the actual route', async () => {
    const result = await request(app.getHttpServer())
      .get('/search?q=Alex')
      .set('Cookie', 'session=tech')
      .set('x-organization-id', 'a')
      .expect(200);
    expect(
      result.body.groups.map((group: { results: { id: string }[] }) =>
        group.results.map((row) => row.id),
      ),
    ).toEqual([['c-a'], ['r-a'], ['j-a'], ['t-a'], ['i-a']]);
  });
});
