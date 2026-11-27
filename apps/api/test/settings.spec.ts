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
import { readFileSync } from 'node:fs';

const pg = new PGlite();
const testDb = drizzle({ client: pg });
jest.unstable_mockModule('../src/db/index.js', () => ({ db: testDb }));
process.env.BETTER_AUTH_SECRET =
  'settings-test-only-secret-at-least-32-characters';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.WEB_ORIGIN = 'http://localhost:3001';

const { OrganizationsService } =
  await import('../src/organizations/organizations.service.js');
const { AuditService } = await import('../src/audit/audit.service.js');
const { UpdateOrganizationDto } =
  await import('../src/organizations/dto/update-organization.dto.js');
const { UpdateMemberDto } =
  await import('../src/organizations/dto/update-member.dto.js');
const { auth } = await import('../src/lib/auth.js');
const service = new OrganizationsService(new AuditService());

beforeAll(async () => {
  for (const migration of [
    '20260919204226_colossal_logan',
    '20260920142313_dear_arachne',
    '20260923123541_odd_misty_knight',
    '20261013151326_audit_logging',
  ]) {
    await pg.exec(
      readFileSync(
        new URL(
          `../src/db/migrations/${migration}/migration.sql`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
  }
  // Only the invoice columns used by the settings currency guard are needed.
  await pg.exec(
    'CREATE TABLE invoice (id text PRIMARY KEY, organization_id text NOT NULL)',
  );
}, 30000);

beforeEach(async () => {
  await pg.exec(`
    TRUNCATE "user", organization, invoice CASCADE;
    INSERT INTO "user" (id, name, email) VALUES
      ('owner', 'Owner', 'owner@example.test'), ('admin', 'Admin', 'admin@example.test'),
      ('dispatcher', 'Dispatcher', 'dispatcher@example.test'), ('tech', 'Tech', 'tech@example.test'),
      ('suspended', 'Suspended', 'suspended@example.test'), ('invited', 'Invited', 'invited@example.test'),
      ('other', 'Other', 'other@example.test'), ('invitee', 'Invitee', 'invitee@example.test');
    INSERT INTO organization (id, name, slug, timezone, currency) VALUES
      ('a', 'Alpha', 'alpha', 'UTC', 'USD'), ('b', 'Beta', 'beta', 'UTC', 'USD');
    INSERT INTO organization_member (id, organization_id, user_id, role, status) VALUES
      ('m-owner', 'a', 'owner', 'OWNER', 'ACTIVE'), ('m-admin', 'a', 'admin', 'ADMIN', 'ACTIVE'),
      ('m-dispatcher', 'a', 'dispatcher', 'DISPATCHER', 'ACTIVE'), ('m-tech', 'a', 'tech', 'TECHNICIAN', 'ACTIVE'),
      ('m-suspended', 'a', 'suspended', 'ADMIN', 'SUSPENDED'), ('m-invited', 'a', 'invited', 'ADMIN', 'INVITED'),
      ('m-other', 'b', 'other', 'OWNER', 'ACTIVE');
  `);
});

afterAll(async () => {
  await pg.close();
});

describe('organization settings', () => {
  it.each(['owner', 'admin'])(
    'allows active %s to update fields and clear optional values',
    async (actor) => {
      await service.update(actor, 'a', {
        name: 'Updated',
        email: 'ops@example.test',
        timezone: 'America/Toronto',
        currency: 'CAD',
      });
      const result = await service.update(actor, 'a', { email: null });
      expect(result.organization).toMatchObject({
        name: 'Updated',
        email: null,
        timezone: 'America/Toronto',
        currency: 'CAD',
      });
      expect(
        (await service.listForUser('other')).organizations[0],
      ).toMatchObject({ name: 'Beta', currency: 'USD' });
      const audit = await pg.query<{ action: string }>(
        'SELECT action FROM audit_log WHERE organization_id = $1',
        ['a'],
      );
      expect(audit.rows.map((row) => row.action)).toEqual([
        'ORGANIZATION_UPDATED',
        'ORGANIZATION_UPDATED',
      ]);
    },
  );

  it.each(['dispatcher', 'tech', 'suspended', 'invited', 'other'])(
    'denies organization and team management to %s',
    async (actor) => {
      await expect(
        service.update(actor, 'a', { name: 'Forbidden' }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(service.listInvitations(actor, 'a')).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        service.createInvitation(actor, 'a', {
          email: 'new@example.test',
          role: 'ADMIN',
        }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.updateMember(actor, 'a', 'm-tech', { status: 'SUSPENDED' }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.removeMember(actor, 'a', 'm-tech'),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.revokeInvitation(actor, 'a', 'missing'),
      ).rejects.toMatchObject({ status: 403 });
    },
  );

  it('does not list inactive memberships, rejects duplicate slugs and empty updates', async () => {
    expect((await service.listForUser('suspended')).organizations).toEqual([]);
    expect((await service.listForUser('invited')).organizations).toEqual([]);
    await expect(
      service.update('owner', 'a', { slug: 'beta' }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(service.update('owner', 'a', {})).rejects.toMatchObject({
      status: 400,
    });
  });

  it('protects existing financial currency without blocking other settings', async () => {
    await pg.exec("INSERT INTO invoice VALUES ('invoice-a', 'a')");
    await expect(
      service.update('owner', 'a', { currency: 'CAD' }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.update('owner', 'a', {
        currency: 'USD',
        timezone: 'America/Toronto',
      }),
    ).resolves.toMatchObject({
      organization: { currency: 'USD', timezone: 'America/Toronto' },
    });
    await expect(
      service.update('other', 'b', { currency: 'CAD' }),
    ).resolves.toMatchObject({ organization: { currency: 'CAD' } });
  });

  it('validates required, nullable and supported preference fields', async () => {
    const dto = plainToInstance(UpdateOrganizationDto, {
      name: '  Example  ',
      email: null,
      timezone: 'UTC',
      currency: 'cad',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ name: 'Example', currency: 'CAD' });
    for (const patch of [
      { name: null },
      { name: ' ' },
      { slug: 'Not valid' },
      { timezone: 'invalid' },
      { currency: 'ZZZ' },
      { logo: 'http://example.test/logo.png' },
    ]) {
      expect(
        await validate(plainToInstance(UpdateOrganizationDto, patch)),
      ).not.toHaveLength(0);
    }
    expect(
      await validate(plainToInstance(UpdateMemberDto, { role: null })),
    ).not.toHaveLength(0);
    expect(
      await validate(plainToInstance(UpdateMemberDto, { role: 'OWNER' })),
    ).not.toHaveLength(0);
  });
});

describe('team management', () => {
  it('protects the owner, the current member and foreign members; suspends, reactivates and removes within the organization', async () => {
    await expect(
      service.updateMember('admin', 'a', 'm-owner', { role: 'ADMIN' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.removeMember('admin', 'a', 'm-owner'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.updateMember('admin', 'a', 'm-admin', { status: 'SUSPENDED' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.updateMember('admin', 'a', 'm-invited', { status: 'ACTIVE' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.updateMember('owner', 'a', 'm-other', { role: 'ADMIN' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.removeMember('owner', 'a', 'm-other'),
    ).rejects.toMatchObject({ status: 404 });
    await service.updateMember('admin', 'a', 'm-tech', {
      role: 'DISPATCHER',
      status: 'SUSPENDED',
    });
    await expect(service.listMembers('tech', 'a')).rejects.toMatchObject({
      status: 403,
    });
    await service.updateMember('owner', 'a', 'm-tech', { status: 'ACTIVE' });
    await expect(service.listMembers('tech', 'a')).resolves.toBeDefined();
    await service.removeMember('owner', 'a', 'm-tech');
    await expect(service.listMembers('tech', 'a')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('creates, lists without tokens, restricts and revokes invitations', async () => {
    const { invitation } = await service.createInvitation('admin', 'a', {
      email: 'invitee@example.test',
      role: 'DISPATCHER',
    });
    const list = await service.listInvitations('owner', 'a');
    expect(list.invitations[0]).toMatchObject({
      id: invitation.id,
      status: 'PENDING',
    });
    expect(list.invitations[0]).not.toHaveProperty('token');
    await expect(service.listInvitations('other', 'b')).resolves.toEqual({
      invitations: [],
    });
    await expect(
      service.revokeInvitation('other', 'b', invitation.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.acceptInvitation('other', 'other@example.test', invitation.token),
    ).rejects.toMatchObject({ status: 403 });
    await service.revokeInvitation('owner', 'a', invitation.id);
    await expect(
      service.acceptInvitation(
        'invitee',
        'invitee@example.test',
        invitation.token,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const replacement = await service.createInvitation('owner', 'a', {
      email: 'invitee@example.test',
      role: 'TECHNICIAN',
    });
    await expect(
      service.acceptInvitation(
        'invitee',
        'invitee@example.test',
        replacement.invitation.token,
      ),
    ).resolves.toMatchObject({
      membership: { role: 'TECHNICIAN', status: 'ACTIVE', organizationId: 'a' },
    });
  });
});

describe('invitation expiry', () => {
  it('rejects duplicate pending invites, reports expiry and allows a replacement', async () => {
    const { invitation } = await service.createInvitation('owner', 'a', {
      email: 'invitee@example.test',
      role: 'TECHNICIAN',
    });
    await expect(
      service.createInvitation('admin', 'a', {
        email: 'invitee@example.test',
        role: 'ADMIN',
      }),
    ).rejects.toMatchObject({ status: 409 });
    await pg.query(
      "UPDATE organization_invitation SET expires_at = now() - interval '1 day' WHERE id = $1",
      [invitation.id],
    );
    expect(
      (await service.listInvitations('owner', 'a')).invitations[0]?.status,
    ).toBe('EXPIRED');
    await expect(
      service.acceptInvitation(
        'invitee',
        'invitee@example.test',
        invitation.token,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.createInvitation('owner', 'a', {
        email: 'invitee@example.test',
        role: 'TECHNICIAN',
      }),
    ).resolves.toMatchObject({ invitation: { status: 'PENDING' } });
  });
});

describe('Better Auth account settings', () => {
  it('validates profile updates, changes the current user only, and revokes other sessions on password change', async () => {
    const signUp = await auth.api.signUpEmail({
      body: {
        name: 'Account',
        email: 'account@example.test',
        password: 'OldPassword123',
      },
      returnHeaders: true,
    });
    const cookie = signUp.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const otherSession = await auth.api.signInEmail({
      body: { email: 'account@example.test', password: 'OldPassword123' },
      returnHeaders: true,
    });
    const otherCookie = otherSession.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const headers = new Headers({ cookie, origin: 'http://localhost:3001' });
    await expect(
      auth.api.updateUser({ headers, body: { name: '  ' } }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      auth.api.updateUser({
        headers,
        body: { image: 'http://example.test/avatar.png' },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await auth.api.updateUser({
      headers,
      body: { name: '  New Name  ', image: 'https://example.test/avatar.png' },
    });
    const profile = await auth.api.getSession({ headers });
    expect(profile?.user).toMatchObject({
      name: 'New Name',
      image: 'https://example.test/avatar.png',
      email: 'account@example.test',
    });
    expect(
      (
        await pg.query<{ name: string }>(
          'SELECT name FROM "user" WHERE id = $1',
          ['owner'],
        )
      ).rows[0]?.name,
    ).toBe('Owner');
    await expect(
      auth.api.changePassword({
        headers,
        body: {
          currentPassword: 'Incorrect123',
          newPassword: 'NewPassword123',
          revokeOtherSessions: true,
        },
      }),
    ).rejects.toBeDefined();
    await auth.api.changePassword({
      headers,
      body: {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        revokeOtherSessions: true,
      },
    });
    expect(
      await auth.api.getSession({
        headers: new Headers({ cookie: otherCookie }),
      }),
    ).toBeNull();
    await expect(
      auth.api.signInEmail({
        body: { email: 'account@example.test', password: 'NewPassword123' },
      }),
    ).resolves.toBeDefined();
  }, 30000);
});
