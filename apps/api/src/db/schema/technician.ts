import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { organization } from './organization.js';

/**
 * Technician profile linked to an organization member with role TECHNICIAN.
 * Soft-deactivate via status (INACTIVE / SUSPENDED). One profile per user per org.
 */

export const technicianStatusEnum = pgEnum('technician_status', [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
]);

export const technician = pgTable.withRLS(
  'technician',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    employeeCode: text('employee_code').notNull(),
    phone: text('phone'),
    bio: text('bio'),
    status: technicianStatusEnum('status').default('ACTIVE').notNull(),
    hireDate: timestamp('hire_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('technician_org_user_uidx').on(table.organizationId, table.userId),
    unique('technician_org_employee_code_uidx').on(
      table.organizationId,
      table.employeeCode,
    ),
    index('technician_organizationId_idx').on(table.organizationId),
    index('technician_userId_idx').on(table.userId),
    index('technician_status_idx').on(table.status),
    index('technician_employeeCode_idx').on(table.employeeCode),
  ],
);

export type Technician = typeof technician.$inferSelect;
export type TechnicianStatus =
  (typeof technicianStatusEnum.enumValues)[number];
