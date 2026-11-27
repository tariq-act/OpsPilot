// ─── Imports ────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';
import { eq, inArray, or } from 'drizzle-orm';

import type { db } from './index.js';
import type { auth } from '../lib/auth.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import {
  user,
  organization,
  organizationMember,
  organizationInvitation,
  customer,
  serviceRequest,
  technician,
  job,
  jobAssignment,
  jobNote,
  jobActivity,
  invoice,
  invoiceItem,
  payment,
  customerFollowUp,
  customerNotification,
  automationRule,
  automationExecution,
  auditLog,
  type OrganizationMemberRole,
  type JobStatus,
  type ServiceRequestPriority,
  type InvoiceStatus,
} from './schema/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

type DemoUserKey = keyof typeof DEMO_USERS;
type DemoUsers = Record<DemoUserKey, string>;
type SeedDatabase = typeof db;
type SeedAuth = Pick<typeof auth.api, 'signUpEmail' | 'signOut'>;

type CustomerKey = (typeof customerFixtures)[number]['key'];

type WorkFixture = {
  key: string;
  customerKey: CustomerKey;
  title: string;
  priority: ServiceRequestPriority;
  status: JobStatus;
  /** Days relative to today (negative = past, 0 = today, positive = future). */
  day: number;
  /** UTC hour the job starts. */
  hour: number;
  /** Estimated duration in minutes. */
  duration: number;
  technicianKey?: 'technician' | 'technician2';
};

type InvoiceFixture = {
  key: string;
  status: InvoiceStatus;
  /** Labor charge in cents. */
  labor: number;
  /** Parts charge in cents. */
  parts: number;
  /** Amount already paid in cents. */
  paid: number;
  /** Day the invoice was issued (relative to today), or null if still draft. */
  issuedDay: number | null;
  /** Day the invoice is due (relative to today), or null if still draft. */
  dueDay: number | null;
  /** Day payment was received (relative to today). */
  paidDay?: number;
};

export class SeedError extends Error {}

// ─── Seed constants ───────────────────────────────────────────────────────────

/**
 * Stable namespace prefix keeps all fixture IDs grouped and prevents
 * accidental collisions with real data.
 */
const PREFIX = 'opspilot-demo-v1';

/** Builds a namespaced fixture ID. */
const id = (kind: string, key: string) => `${PREFIX}-${kind}-${key}`;

const primaryOrg = id('org', 'northstar');
const secondaryOrg = id('org', 'harbor');
const primarySlug = 'demo-northstar-field-services';
const secondarySlug = 'demo-harbor-maintenance';
const currency = 'CAD';

// ─── Demo users ───────────────────────────────────────────────────────────────

/**
 * One account per role.  All accounts share the password supplied via
 * DEMO_SEED_PASSWORD so a developer can test every permission level.
 */
const DEMO_USERS = {
  owner: {
    name: 'Alex Morgan',
    email: 'seed.owner@opspilot.test',
    role: 'OWNER',
  },
  admin: {
    name: 'Jordan Lee',
    email: 'seed.admin@opspilot.test',
    role: 'ADMIN',
  },
  dispatcher: {
    name: 'Sam Rivera',
    email: 'seed.dispatcher@opspilot.test',
    role: 'DISPATCHER',
  },
  technician: {
    name: 'Taylor Brooks',
    email: 'seed.technician@opspilot.test',
    role: 'TECHNICIAN',
  },
  technician2: {
    name: 'Casey Patel',
    email: 'seed.technician2@opspilot.test',
    role: 'TECHNICIAN',
  },
  otherOwner: {
    name: 'Riley Chen',
    email: 'seed.other-owner@opspilot.test',
    role: 'OWNER',
  },
} as const satisfies Record<
  string,
  { name: string; email: string; role: OrganizationMemberRole }
>;

// ─── Customer fixtures ────────────────────────────────────────────────────────

/** Fictional Toronto businesses used as service customers. */
const customerFixtures = [
  { key: 'oakridge',  name: 'Oakridge Dental',           street: '100 Oakridge Avenue' },
  { key: 'maple',    name: 'Maple Street Cafe',          street: '225 Maple Street'   },
  { key: 'riverside', name: 'Riverside Apartments',      street: '42 Riverside Drive' },
  { key: 'cedar',    name: 'Cedar Grove Office',         street: '80 Cedar Lane'      },
  { key: 'pine',     name: 'Pinecrest Pharmacy',         street: '310 Pinecrest Road' },
  { key: 'lakeside', name: 'Lakeside Community Center',  street: '75 Lakeside Way'    },
  { key: 'willow',   name: 'Willow Court Residence',     street: '12 Willow Court'    },
  { key: 'historic', name: 'Old Town Workshop',          street: '5 Foundry Lane'     },
] as const;

// ─── Work (service request + job) fixtures ────────────────────────────────────

/**
 * Each entry produces one service request and one job.
 * Statuses are spread across the full job lifecycle so every list view
 * and status filter renders with realistic data.
 */
const workFixtures: WorkFixture[] = [
  // ── Upcoming / active ──────────────────────────────────────────────────────
  {
    key: 'draft',
    customerKey: 'willow',
    title: 'Annual furnace inspection',
    priority: 'LOW',
    status: 'DRAFT',
    day: 1, hour: 13, duration: 60,
  },
  {
    key: 'today',
    customerKey: 'oakridge',
    title: 'HVAC preventive maintenance',
    priority: 'MEDIUM',
    status: 'CONFIRMED',
    day: 0, hour: 18, duration: 90,
    technicianKey: 'technician',
  },
  {
    key: 'tomorrow',
    customerKey: 'maple',
    title: 'Walk-in cooler repair',
    priority: 'HIGH',
    status: 'CONFIRMED',
    day: 1, hour: 14, duration: 120,
    technicianKey: 'technician2',
  },
  // ── In-flight ──────────────────────────────────────────────────────────────
  {
    key: 'en-route',
    customerKey: 'cedar',
    title: 'Emergency electrical inspection',
    priority: 'URGENT',
    status: 'EN_ROUTE',
    day: 0, hour: 14, duration: 60,
    technicianKey: 'technician2',
  },
  {
    key: 'progress',
    customerKey: 'riverside',
    title: 'Water heater diagnostics',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    day: 0, hour: 12, duration: 120,
    technicianKey: 'technician',
  },
  // ── Completed (various billing states) ────────────────────────────────────
  {
    key: 'paid',
    customerKey: 'pine',
    title: 'Replace circulation pump',
    priority: 'HIGH',
    status: 'COMPLETED',
    day: -3, hour: 14, duration: 120,
    technicianKey: 'technician',
  },
  {
    key: 'partial',
    customerKey: 'lakeside',
    title: 'Install new thermostat',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    day: -5, hour: 13, duration: 90,
    technicianKey: 'technician2',
  },
  {
    key: 'sent',
    customerKey: 'maple',
    title: 'Refrigeration tune-up',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    day: -7, hour: 15, duration: 120,
    technicianKey: 'technician',
  },
  {
    key: 'overdue',
    customerKey: 'riverside',
    title: 'Repair leaking valve',
    priority: 'HIGH',
    status: 'COMPLETED',
    day: -20, hour: 14, duration: 90,
    technicianKey: 'technician2',
  },
  {
    key: 'draft-invoice',
    customerKey: 'cedar',
    title: 'Air filter replacement',
    priority: 'LOW',
    status: 'COMPLETED',
    day: -1, hour: 15, duration: 60,
    technicianKey: 'technician',
  },
  {
    key: 'unbilled',
    customerKey: 'oakridge',
    title: 'Repair ventilation fan',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    day: -4, hour: 15, duration: 60,
    technicianKey: 'technician2',
  },
  // ── Terminal (non-happy-path) ──────────────────────────────────────────────
  {
    key: 'cancelled',
    customerKey: 'willow',
    title: 'Cancelled boiler service',
    priority: 'MEDIUM',
    status: 'CANCELLED',
    day: -2, hour: 13, duration: 60,
  },
];

// ─── Invoice fixtures ─────────────────────────────────────────────────────────

/**
 * Invoices mapped 1-to-1 with the completed work fixtures above.
 * Amounts are stored in cents and formatted to dollars on insert.
 */
const invoiceFixtures: InvoiceFixture[] = [
  { key: 'paid',         status: 'PAID',           labor: 30000, parts: 15000, paid: 45000, issuedDay: -3,  dueDay: 11, paidDay: -2 },
  { key: 'partial',      status: 'PARTIALLY_PAID', labor: 20000, parts: 18000, paid: 15000, issuedDay: -5,  dueDay:  9, paidDay: -4 },
  { key: 'sent',         status: 'SENT',           labor: 25000, parts:  8500, paid:     0, issuedDay: -7,  dueDay:  7              },
  { key: 'overdue',      status: 'OVERDUE',        labor: 18000, parts:  9500, paid:     0, issuedDay: -20, dueDay: -6              },
  { key: 'draft-invoice', status: 'DRAFT',         labor: 12500, parts:  4500, paid:     0, issuedDay: null, dueDay: null           },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats cents as a fixed-point dollar string (e.g. 4500 → "45.00"). */
const money = (cents: number) => (cents / 100).toFixed(2);

/** Returns a new Date that is `minutes` minutes after `date`. */
const minutesAfter = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

/**
 * Returns a UTC Date offset by `day` days from today, at the given UTC `hour`.
 * Negative `day` values produce past dates; positive values produce future dates.
 */
function calendarDate(day: number, hour = 12): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + day);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

// Convenience ID builders so call-sites read like plain English.
const customerId = (key: CustomerKey) => id('customer', key);
const jobId     = (key: string)      => id('job',      key);
const invoiceId = (key: string)      => id('invoice',  key);

// ─── User provisioning ────────────────────────────────────────────────────────

/**
 * Creates (or reuses) one Better Auth account per demo user.
 *
 * Reuse is only allowed when the account is not yet assigned to any
 * organization — this lets a developer retry after a partially-failed seed
 * without having to recreate the database.
 */
async function ensureDemoUsers(
  database: SeedDatabase,
  authApi: SeedAuth,
  password: string,
): Promise<DemoUsers> {
  const result = {} as DemoUsers;

  for (const key of Object.keys(DEMO_USERS) as DemoUserKey[]) {
    const fixture = DEMO_USERS[key];

    const [existing] = await database
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.email, fixture.email))
      .limit(1);

    if (existing) {
      // Never silently reuse an account that already belongs to an org.
      const [membership] = await database
        .select({ id: organizationMember.id })
        .from(organizationMember)
        .where(eq(organizationMember.userId, existing.id))
        .limit(1);

      if (membership || existing.name !== fixture.name) {
        throw new SeedError(
          `Demo account ${fixture.email} already exists outside the seed; it will not be modified.`,
        );
      }

      result[key] = existing.id;
      console.log(
        `Reusing existing unassigned demo account: ${fixture.email} (password unchanged).`,
      );
      continue;
    }

    // Delegate password hashing and credential creation to Better Auth.
    const signup = await authApi.signUpEmail({
      body: { name: fixture.name, email: fixture.email, password },
      returnHeaders: true,
    });
    result[key] = signup.response.user.id;

    // Immediately sign out so the seed does not leave orphaned sessions.
    const cookie = signup.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    if (cookie) await authApi.signOut({ headers: new Headers({ cookie }) });
  }

  return result;
}

// ─── Guard: prevent double-seeding ───────────────────────────────────────────

/**
 * Returns true if both demo organizations are already present (seed already
 * ran), throws if only partial state is detected (slug conflict or one org
 * missing), and returns false when the database is clean.
 */
async function checkExistingOrganizations(database: SeedDatabase): Promise<boolean> {
  const existing = await database
    .select({ id: organization.id })
    .from(organization)
    .where(
      or(
        inArray(organization.id,   [primaryOrg,   secondaryOrg]),
        inArray(organization.slug, [primarySlug, secondarySlug]),
      ),
    );

  const hasPrimary   = existing.some((row) => row.id === primaryOrg);
  const hasSecondary = existing.some((row) => row.id === secondaryOrg);

  if (hasPrimary && hasSecondary) {
    console.log('OpsPilot demo organizations already exist. No records changed.');
    return true;
  }

  if (existing.length > 0) {
    throw new SeedError(
      'A demo organization already exists or its slug is in use. ' +
      'Use a fresh local database to avoid overwriting existing data.',
    );
  }

  return false;
}

// ─── Transaction helpers ──────────────────────────────────────────────────────

type Transaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

async function insertOrganizations(tx: Transaction) {
  await tx.insert(organization).values([
    {
      id: primaryOrg,
      name: 'Northstar Field Services (Demo)',
      slug: primarySlug,
      timezone: 'America/Toronto',
      currency,
      email: 'office@northstar.opspilot.test',
      phone: '+1 416 555 0100',
      address: '100 Example Avenue, Toronto, ON',
      createdAt: calendarDate(-60),
    },
    {
      id: secondaryOrg,
      name: 'Harbor Maintenance (Demo)',
      slug: secondarySlug,
      timezone: 'America/Toronto',
      currency,
      email: 'office@harbor.opspilot.test',
      createdAt: calendarDate(-30),
    },
  ]);
}

async function insertMembers(
  tx: Transaction,
  users: DemoUsers,
  primaryMembers: readonly DemoUserKey[],
) {
  await tx.insert(organizationMember).values([
    // Northstar members — one per demo role.
    ...primaryMembers.map((key) => ({
      id: id('member', key),
      organizationId: primaryOrg,
      userId: users[key],
      role: DEMO_USERS[key].role,
      status: 'ACTIVE' as const,
      createdAt: calendarDate(-60),
    })),
    // Harbor owner.
    {
      id: id('member', 'other-owner'),
      organizationId: secondaryOrg,
      userId: users.otherOwner,
      role: 'OWNER',
      status: 'ACTIVE',
      createdAt: calendarDate(-30),
    },
    // Admin belongs to both orgs so we can test cross-org permission boundaries.
    {
      id: id('member', 'harbor-dispatcher'),
      organizationId: secondaryOrg,
      userId: users.admin,
      role: 'DISPATCHER',
      status: 'ACTIVE',
      createdAt: calendarDate(-25),
    },
  ]);
}

async function insertInvitations(
  tx: Transaction,
  users: DemoUsers,
  primaryMembers: readonly DemoUserKey[],
  ownerId: string,
) {
  await tx.insert(organizationInvitation).values([
    // Accepted invitations that brought the current members in.
    ...primaryMembers
      .filter((key) => key !== 'owner')
      .map((key) => ({
        id: id('invitation', key),
        organizationId: primaryOrg,
        email: DEMO_USERS[key].email,
        // The dispatcher was originally invited as Admin, then had their role changed.
        role: key === 'dispatcher' ? ('ADMIN' as const) : DEMO_USERS[key].role,
        status: 'ACCEPTED' as const,
        token: randomBytes(32).toString('hex'),
        invitedByUserId: ownerId,
        acceptedUserId: users[key],
        acceptedAt: calendarDate(-59),
        expiresAt: calendarDate(-53),
        createdAt: calendarDate(-60),
      })),
    // Open / historical invitations to exercise every invitation status.
    ...(
      [
        { key: 'pending', status: 'PENDING', expiration:  7, created:  0 },
        { key: 'expired', status: 'EXPIRED', expiration: -2, created: -9 },
        { key: 'revoked', status: 'REVOKED', expiration:  4, created: -3 },
      ] as const
    ).map((entry) => ({
      id: id('invitation', entry.key),
      organizationId: primaryOrg,
      email: `seed.${entry.key}@opspilot.test`,
      role: 'TECHNICIAN' as const,
      status: entry.status,
      token: randomBytes(32).toString('hex'),
      invitedByUserId: ownerId,
      expiresAt: calendarDate(entry.expiration),
      createdAt: calendarDate(entry.created),
    })),
  ]);
}

async function insertTechnicians(tx: Transaction, users: DemoUsers) {
  await tx.insert(technician).values(
    (['technician', 'technician2'] as const).map((key, index) => ({
      id: id('technician', key),
      organizationId: primaryOrg,
      userId: users[key],
      employeeCode: `DEMO-TECH-00${index + 1}`,
      phone: `+1 416 555 010${index + 1}`,
      bio:
        index === 0
          ? 'HVAC and plumbing service specialist.'
          : 'Electrical and refrigeration specialist.',
      status: 'ACTIVE' as const,
      hireDate: calendarDate(-45),
      createdAt: calendarDate(-45),
    })),
  );
}

async function insertCustomers(tx: Transaction) {
  await tx.insert(customer).values([
    // Northstar customers — one per fixture entry.
    ...customerFixtures.map((fixture, index) => ({
      id: customerId(fixture.key),
      organizationId: primaryOrg,
      name: fixture.name,
      email: `${fixture.key}@customers.opspilot.test`,
      phone: `+1 416 555 01${String(index + 10).padStart(2, '0')}`,
      address: fixture.street,
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5V 2T6',
      // "historic" is kept inactive to test filtered views.
      status: fixture.key === 'historic' ? ('INACTIVE' as const) : ('ACTIVE' as const),
      notes: 'Fictional development customer.',
      createdAt: calendarDate(-35 - index),
    })),
    // One Harbor customer so isolation between orgs can be verified.
    {
      id: id('customer', 'harbor-only'),
      organizationId: secondaryOrg,
      name: 'Harbor-only Demo Customer',
      email: 'contact@harbor.opspilot.test',
      phone: '+1 902 555 0100',
      address: '10 Example Wharf',
      city: 'Halifax',
      state: 'NS',
      status: 'ACTIVE',
      createdAt: calendarDate(-20),
    },
  ]);
}

async function insertServiceRequests(tx: Transaction, users: DemoUsers) {
  await tx.insert(serviceRequest).values([
    // One ACCEPTED request per work fixture (each will become a job below).
    ...workFixtures.map((work) => ({
      id: id('request', work.key),
      organizationId: primaryOrg,
      customerId: customerId(work.customerKey),
      title: work.title,
      description: `Service requested: ${work.title}.`,
      priority: work.priority,
      status: 'ACCEPTED' as const,
      source: 'PHONE' as const,
      createdBy: users.dispatcher,
      preferredDate: calendarDate(work.day),
      preferredTime: `${work.hour}:00`,
      createdAt: calendarDate(Math.min(work.day - 2, -1)),
    })),
    // Additional requests in non-ACCEPTED states for inbox / triage views.
    ...(
      [
        { key: 'new',      customerKey: 'oakridge', title: 'Request for ventilation quote',  status: 'NEW',       priority: 'MEDIUM', source: 'WEBSITE' },
        { key: 'review',   customerKey: 'pine',     title: 'Intermittent electrical fault',  status: 'IN_REVIEW', priority: 'HIGH',   source: 'EMAIL'   },
        { key: 'rejected', customerKey: 'lakeside', title: 'Out-of-area service inquiry',    status: 'REJECTED',  priority: 'LOW',    source: 'PHONE'   },
      ] as const
    ).map((request) => ({
      id: id('request', request.key),
      organizationId: primaryOrg,
      customerId: customerId(request.customerKey),
      title: request.title,
      status: request.status,
      priority: request.priority,
      source: request.source,
      createdBy: users.dispatcher,
      createdAt: calendarDate(-1),
    })),
    // Harbor-org request (must NOT appear in Northstar views).
    {
      id: id('request', 'harbor-only'),
      organizationId: secondaryOrg,
      customerId: id('customer', 'harbor-only'),
      title: 'Harbor-only inspection',
      status: 'ACCEPTED',
      priority: 'MEDIUM',
      source: 'PHONE',
      createdBy: users.otherOwner,
      createdAt: calendarDate(-1),
    },
  ]);
}

async function insertJobs(tx: Transaction, users: DemoUsers, now: Date) {
  /**
   * Derives realistic scheduled/actual timestamps from each work fixture.
   * - IN_PROGRESS jobs started 30 min ago.
   * - EN_ROUTE jobs depart 30 min from now.
   * - The "today" job starts 3 hours from now.
   * - All other jobs use the fixture's calendar day/hour.
   */
  const scheduledJobs = workFixtures.map((work) => {
    const start =
      work.status === 'IN_PROGRESS' ? minutesAfter(now, -30) :
      work.status === 'EN_ROUTE'    ? minutesAfter(now,  30) :
      work.key    === 'today'       ? minutesAfter(now, 180) :
                                      calendarDate(work.day, work.hour);

    const end = minutesAfter(start, work.duration);
    const isCompleted = work.status === 'COMPLETED';

    return {
      id: jobId(work.key),
      organizationId: primaryOrg,
      customerId: customerId(work.customerKey),
      requestId: id('request', work.key),
      title: work.title,
      priority: work.priority,
      description: `Field service: ${work.title}.`,
      status: work.status,
      createdBy: users.dispatcher,
      location: customerFixtures.find((c) => c.key === work.customerKey)!.street,
      scheduledStart: work.status === 'DRAFT' ? null : start,
      scheduledEnd:   work.status === 'DRAFT' ? null : end,
      estimatedDuration: work.duration,
      actualStart: (isCompleted || work.status === 'IN_PROGRESS') ? start : null,
      actualEnd:   isCompleted ? end : null,
      completedAt: isCompleted ? end : null,
      completionSummary: isCompleted ? 'Service completed and equipment tested.' : null,
      createdAt: calendarDate(Math.min(work.day - 1, -1)),
    };
  });

  await tx.insert(job).values([
    ...scheduledJobs,
    // Harbor isolation fixture.
    {
      id: jobId('harbor-only'),
      organizationId: secondaryOrg,
      customerId: id('customer', 'harbor-only'),
      requestId: id('request', 'harbor-only'),
      title: 'Harbor-only inspection',
      status: 'DRAFT',
      createdBy: users.otherOwner,
      createdAt: calendarDate(-1),
    },
  ]);
}

async function insertJobAssignments(tx: Transaction, users: DemoUsers) {
  await tx.insert(jobAssignment).values(
    workFixtures.flatMap((work) =>
      work.technicianKey
        ? [{
            id: id('assignment', work.key),
            organizationId: primaryOrg,
            jobId: jobId(work.key),
            technicianId: id('technician', work.technicianKey),
            status: 'ASSIGNED' as const,
            assignedBy: users.dispatcher,
            assignedAt: calendarDate(Math.min(work.day - 1, -1)),
            createdAt:  calendarDate(Math.min(work.day - 1, -1)),
          }]
        : [],
    ),
  );
}

async function insertJobNotesAndActivity(tx: Transaction, users: DemoUsers, now: Date) {
  await tx.insert(jobNote).values([
    {
      id: id('note', 'progress'),
      organizationId: primaryOrg,
      jobId: jobId('progress'),
      body: 'Arrived onsite and started initial diagnostics.',
      createdBy: users.technician,
      createdAt: minutesAfter(now, -20),
    },
    {
      id: id('note', 'paid'),
      organizationId: primaryOrg,
      jobId: jobId('paid'),
      body: 'New pump installed. Pressure and leak tests passed.',
      createdBy: users.technician,
      createdAt: calendarDate(-3, 15),
    },
  ]);

  await tx.insert(jobActivity).values([
    {
      id: id('activity', 'progress'),
      organizationId: primaryOrg,
      jobId: jobId('progress'),
      action: 'STATUS_CHANGED',
      fromStatus: 'ARRIVED',
      toStatus: 'IN_PROGRESS',
      actorUserId: users.technician,
      createdAt: minutesAfter(now, -30),
    },
    {
      id: id('activity', 'paid'),
      organizationId: primaryOrg,
      jobId: jobId('paid'),
      action: 'COMPLETED',
      fromStatus: 'IN_PROGRESS',
      toStatus: 'COMPLETED',
      message: 'Service completed and equipment tested.',
      actorUserId: users.technician,
      createdAt: calendarDate(-3, 16),
    },
  ]);
}

async function insertInvoicesAndPayments(
  tx: Transaction,
  users: DemoUsers,
  workByKey: Map<string, WorkFixture>,
) {
  // ── Invoices ──────────────────────────────────────────────────────────────
  await tx.insert(invoice).values(
    invoiceFixtures.map((fixture, index) => {
      const work  = workByKey.get(fixture.key)!;
      const total = fixture.labor + fixture.parts;
      return {
        id: invoiceId(fixture.key),
        organizationId: primaryOrg,
        customerId: customerId(work.customerKey),
        jobId: jobId(fixture.key),
        invoiceNumber: `INV-${String(index + 1).padStart(6, '0')}`,
        status: fixture.status,
        subtotal:   money(total),
        discount:   '0.00',
        tax:        '0.00',
        total:      money(total),
        amountPaid: money(fixture.paid),
        amountDue:  money(total - fixture.paid),
        currency,
        issuedAt: fixture.issuedDay !== null ? calendarDate(fixture.issuedDay, 18) : null,
        dueAt:    fixture.dueDay    !== null ? calendarDate(fixture.dueDay,    18) : null,
        paidAt:   fixture.status === 'PAID' && fixture.paidDay !== undefined
          ? calendarDate(fixture.paidDay, 18)
          : null,
        createdBy: users.admin,
        createdAt: calendarDate(work.day, 18),
      };
    }),
  );

  // ── Invoice line items (labor + parts per invoice) ────────────────────────
  await tx.insert(invoiceItem).values(
    invoiceFixtures.flatMap((fixture) => [
      {
        id: id('invoice-item', `${fixture.key}-labor`),
        invoiceId: invoiceId(fixture.key),
        type: 'LABOR' as const,
        description: 'On-site service and labor',
        quantity: '1.00',
        unitPrice: money(fixture.labor),
        amount:    money(fixture.labor),
      },
      {
        id: id('invoice-item', `${fixture.key}-parts`),
        invoiceId: invoiceId(fixture.key),
        type: 'PARTS' as const,
        description: 'Replacement parts and supplies',
        quantity: '1.00',
        unitPrice: money(fixture.parts),
        amount:    money(fixture.parts),
      },
    ]),
  );

  // ── Payments (only for invoices that received money) ──────────────────────
  await tx.insert(payment).values(
    invoiceFixtures.flatMap((fixture) =>
      fixture.paid > 0 && fixture.paidDay !== undefined
        ? [{
            id: id('payment', fixture.key),
            organizationId: primaryOrg,
            invoiceId: invoiceId(fixture.key),
            customerId: customerId(workByKey.get(fixture.key)!.customerKey),
            amount: money(fixture.paid),
            currency,
            method: 'BANK_TRANSFER' as const,
            status: 'SUCCEEDED' as const,
            transactionId: `DEMO-${fixture.key.toUpperCase()}`,
            paidAt:    calendarDate(fixture.paidDay, 18),
            createdAt: calendarDate(fixture.paidDay, 18),
          }]
        : [],
    ),
  );
}

async function insertFollowUpsAndNotifications(tx: Transaction, users: DemoUsers) {
  await tx.insert(customerFollowUp).values([
    {
      id: id('follow-up', 'feedback'),
      organizationId: primaryOrg,
      customerId: customerId('pine'),
      jobId: jobId('paid'),
      type: 'FEEDBACK',
      status: 'COMPLETED',
      dueAt: calendarDate(-1),
      notes: 'Customer confirmed service was satisfactory.',
      createdBy: users.admin,
      createdAt: calendarDate(-3),
    },
    {
      id: id('follow-up', 'maintenance'),
      organizationId: primaryOrg,
      customerId: customerId('maple'),
      jobId: jobId('sent'),
      type: 'MAINTENANCE_REMINDER',
      status: 'PENDING',
      dueAt: calendarDate(30),
      notes: 'Schedule the next preventive service.',
      createdBy: users.admin,
      createdAt: calendarDate(-7),
    },
    {
      id: id('follow-up', 'scheduled'),
      organizationId: primaryOrg,
      customerId: customerId('lakeside'),
      jobId: jobId('partial'),
      type: 'FEEDBACK',
      status: 'SCHEDULED',
      dueAt: calendarDate(7),
      notes: 'Confirm thermostat performance.',
      createdBy: users.admin,
      createdAt: calendarDate(-5),
    },
  ]);

  // Terminal records only — no actual email/SMS/WhatsApp messages are dispatched.
  await tx.insert(customerNotification).values([
    {
      id: id('notification', 'completed'),
      organizationId: primaryOrg,
      customerId: customerId('pine'),
      eventType: 'JOB_COMPLETED',
      channel: 'EMAIL',
      status: 'SENT',
      recipient: 'pine@customers.opspilot.test',
      payload: { jobId: jobId('paid') },
      idempotencyKey: id('notify', 'completed'),
      attemptCount: 1,
      sentAt:    calendarDate(-3, 17),
      createdAt: calendarDate(-3, 17),
    },
    {
      id: id('notification', 'invoice'),
      organizationId: primaryOrg,
      customerId: customerId('maple'),
      eventType: 'INVOICE_SENT',
      channel: 'EMAIL',
      status: 'FAILED',
      recipient: 'maple@customers.opspilot.test',
      payload: { invoiceId: invoiceId('sent'), invoiceNumber: 'INV-000003' },
      idempotencyKey: id('notify', 'invoice'),
      attemptCount: 1,
      lastError: 'Example delivery failure (demo data).',
      createdAt: calendarDate(-7, 18),
    },
  ]);
}

async function insertAutomation(tx: Transaction, ownerId: string) {
  await tx.insert(automationRule).values([
    {
      id: id('automation', 'follow-up'),
      organizationId: primaryOrg,
      name: 'Demo: schedule feedback after job completion',
      triggerEvent: 'JOB_COMPLETED',
      conditions: { match: 'all', rules: [] },
      actions: [{ type: 'SCHEDULE_FOLLOW_UP', followUpType: 'FEEDBACK', dueInDays: 2 }],
      isActive: false,
      createdBy: ownerId,
      createdAt: calendarDate(-10),
    },
    {
      id: id('automation', 'payment'),
      organizationId: primaryOrg,
      name: 'Demo: send payment confirmation',
      triggerEvent: 'PAYMENT_RECEIVED',
      conditions: { match: 'all', rules: [] },
      actions: [{ type: 'SEND_NOTIFICATION', channel: 'EMAIL' }],
      isActive: false,
      createdBy: ownerId,
      createdAt: calendarDate(-10),
    },
  ]);

  await tx.insert(automationExecution).values({
    id: id('execution', 'feedback'),
    organizationId: primaryOrg,
    ruleId: id('automation', 'follow-up'),
    eventId: jobId('paid'),
    status: 'SUCCEEDED',
    idempotencyKey: id('execution-key', 'feedback'),
    attemptCount: 1,
    input: {
      triggerEvent: 'JOB_COMPLETED',
      eventId:      jobId('paid'),
      customerId:   customerId('pine'),
      jobId:        jobId('paid'),
      invoiceId:    null,
      paymentId:    null,
      followUpId:   null,
      followUpType: null,
      currency:     null,
      method:       null,
    },
    result: {
      outcome: 'completed',
      actions: [{
        index:  0,
        type:   'SCHEDULE_FOLLOW_UP',
        status: 'SUCCEEDED',
        output: { followUpId: id('follow-up', 'feedback') },
      }],
    },
    startedAt:   calendarDate(-3, 17),
    completedAt: calendarDate(-3, 17),
    createdAt:   calendarDate(-3, 17),
  });
}

async function insertAuditLog(tx: Transaction, users: DemoUsers, ownerId: string) {
  await tx.insert(auditLog).values([
    {
      id: id('audit', 'org-created'),
      organizationId: primaryOrg,
      actorUserId: ownerId,
      action: AuditAction.ORGANIZATION_CREATED,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: primaryOrg,
      metadata: { source: 'demo seed' },
      createdAt: calendarDate(-60),
    },
    {
      id: id('audit', 'member-role'),
      organizationId: primaryOrg,
      actorUserId: ownerId,
      action: AuditAction.MEMBER_UPDATED,
      entityType: AuditEntityType.MEMBER,
      entityId: id('member', 'dispatcher'),
      metadata: {
        source: 'demo seed',
        before: { role: 'ADMIN',       status: 'ACTIVE' },
        after:  { role: 'DISPATCHER',  status: 'ACTIVE' },
      },
      createdAt: calendarDate(-58),
    },
    {
      id: id('audit', 'job-completed'),
      organizationId: primaryOrg,
      actorUserId: users.technician,
      action: AuditAction.JOB_COMPLETED,
      entityType: AuditEntityType.JOB,
      entityId: jobId('paid'),
      metadata: { source: 'demo seed' },
      createdAt: calendarDate(-3, 16),
    },
    {
      id: id('audit', 'payment-recorded'),
      organizationId: primaryOrg,
      actorUserId: users.admin,
      action: AuditAction.PAYMENT_RECORDED,
      entityType: AuditEntityType.PAYMENT,
      entityId: id('payment', 'paid'),
      metadata: { source: 'demo seed', amount: '450.00', currency },
      createdAt: calendarDate(-2, 18),
    },
  ]);
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Seeds both demo organizations and all associated fixtures inside a single
 * database transaction.  The function is idempotent: if both organizations
 * already exist it exits early without touching any data.
 */
export async function seedDemoData(
  database: SeedDatabase,
  authApi: SeedAuth,
  password: string,
): Promise<void> {
  const alreadySeeded = await checkExistingOrganizations(database);
  if (alreadySeeded) return;

  const users = await ensureDemoUsers(database, authApi, password);
  const now   = new Date();
  const ownerId = users.owner;

  const primaryMembers = ['owner', 'admin', 'dispatcher', 'technician', 'technician2'] as const;
  const workByKey = new Map(workFixtures.map((work) => [work.key, work]));

  await database.transaction(async (tx) => {
    await insertOrganizations(tx);
    await insertMembers(tx, users, primaryMembers);
    await insertInvitations(tx, users, primaryMembers, ownerId);
    await insertTechnicians(tx, users);
    await insertCustomers(tx);
    await insertServiceRequests(tx, users);
    await insertJobs(tx, users, now);
    await insertJobAssignments(tx, users);
    await insertJobNotesAndActivity(tx, users, now);
    await insertInvoicesAndPayments(tx, users, workByKey);
    await insertFollowUpsAndNotifications(tx, users);
    await insertAutomation(tx, ownerId);
    await insertAuditLog(tx, users, ownerId);
  });

  console.log(
    'Created demo organizations, members, customers, requests, jobs, invoices, payments, and operational history.',
  );
  console.table(Object.values(DEMO_USERS).map(({ email, role }) => ({ email, role })));
  console.log('Sign in with the password supplied in DEMO_SEED_PASSWORD.');
}
