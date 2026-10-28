import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createInvoice,
  createInvoiceItems,
  deleteInvoiceItemsForInvoice,
  findActiveInvoiceForJob,
  findActiveMembership,
  findCustomerInOrganization,
  findInvoiceInOrganization,
  findJobInOrganization,
  findOrganizationCurrency,
  listInvoicesForOrganization,
  listItemsForInvoice,
  listItemsForInvoices,
  listTechnicianVisibleJobIds,
  nextInvoiceNumber,
  updateInvoiceStatusInOrganization,
  updateInvoiceTotalsInOrganization,
} from '../db/queries/index.js';
import { db } from '../db/index.js';
import type { Invoice, InvoiceItem } from '../db/schema/invoice.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import type { CreateInvoiceDto, CreateInvoiceItemDto } from './dto/create-invoice.dto.js';
import type { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';
import type { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import {
  canTransitionInvoiceStatus,
  isImmutableStatus,
  isVoidableStatus,
} from './invoice-status.js';
import { CustomerNotificationsService } from '../notifications/customer-notifications.service.js';
import { AutomationIngressService } from '../automation/automation-ingress.service.js';
import { AuditAction, AuditEntityType } from '../audit/audit.actions.js';
import { AuditService } from '../audit/audit.service.js';
import {
  calculateInvoiceTotals,
  lineAmountCents,
  parseMoneyToCents,
  parseQuantityToHundredths,
  centsToMoneyString,
} from './money.js';

const INVOICE_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

type InvoiceManagerRole = (typeof INVOICE_MANAGER_ROLES)[number];

function isInvoiceManagerRole(
  role: OrganizationMemberRole,
): role is InvoiceManagerRole {
  return (INVOICE_MANAGER_ROLES as readonly string[]).includes(role);
}

function toItemDto(row: InvoiceItem) {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    type: row.type,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.amount,
  };
}

function toInvoiceDto(row: Invoice, items: InvoiceItem[]) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    jobId: row.jobId,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    subtotal: row.subtotal,
    discount: row.discount,
    tax: row.tax,
    total: row.total,
    amountPaid: row.amountPaid,
    amountDue: row.amountDue,
    currency: row.currency,
    issuedAt: row.issuedAt,
    dueAt: row.dueAt,
    paidAt: row.paidAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: items.map(toItemDto),
  };
}

type ComputedLine = {
  type: CreateInvoiceItemDto['type'];
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  amountCents: bigint;
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly customerNotifications: CustomerNotificationsService,
    private readonly automationIngress: AutomationIngressService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorUserId: string,
    organizationId: string,
    dto: CreateInvoiceDto,
  ) {
    await this.requireInvoiceManager(organizationId, actorUserId);

    const customer = await findCustomerInOrganization(
      organizationId,
      dto.customerId,
    );
    if (!customer) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      });
    }

    const job = await findJobInOrganization(organizationId, dto.jobId);
    if (!job) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Job not found',
        error: 'Not Found',
      });
    }

    if (job.customerId !== dto.customerId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Customer does not match the job',
        error: 'Bad Request',
      });
    }

    if (job.status !== 'COMPLETED') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invoices can only be created for completed jobs',
        error: 'Bad Request',
      });
    }

    const existing = await findActiveInvoiceForJob(organizationId, dto.jobId);
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'An active invoice already exists for this job',
        error: 'Conflict',
      });
    }

    const currency = await findOrganizationCurrency(organizationId);
    if (!currency) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Organization not found',
        error: 'Not Found',
      });
    }

    let lines: ComputedLine[];
    let totals: ReturnType<typeof calculateInvoiceTotals>;
    try {
      lines = this.computeLines(dto.items);
      totals = calculateInvoiceTotals({
        lineAmountsCents: lines.map((line) => line.amountCents),
        discountCents: parseMoneyToCents(dto.discount ?? '0', 'discount'),
        taxCents: parseMoneyToCents(dto.tax ?? '0', 'tax'),
        amountPaidCents: 0n,
      });
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message:
          error instanceof Error ? error.message : 'Invalid invoice amounts',
        error: 'Bad Request',
      });
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'dueAt must be a valid ISO date string',
        error: 'Bad Request',
      });
    }

    try {
      const created = await db.transaction(async (tx) => {
        const invoiceNumber = await nextInvoiceNumber(organizationId, tx);
        const invoiceId = randomUUID();

        const row = await createInvoice(
          {
            id: invoiceId,
            organizationId,
            customerId: dto.customerId,
            jobId: dto.jobId,
            invoiceNumber,
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            total: totals.total,
            amountPaid: totals.amountPaid,
            amountDue: totals.amountDue,
            currency,
            dueAt,
            createdBy: actorUserId,
          },
          tx,
        );

        const items = await createInvoiceItems(
          lines.map((line) => ({
            id: randomUUID(),
            invoiceId,
            type: line.type,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
          })),
          tx,
        );

        return { row, items };
      });

      await this.audit.record({
        organizationId,
        actorUserId,
        action: AuditAction.INVOICE_CREATED,
        entityType: AuditEntityType.INVOICE,
        entityId: created.row.id,
        metadata: {
          invoiceNumber: created.row.invoiceNumber,
          status: created.row.status,
          total: created.row.total,
          jobId: created.row.jobId,
          customerId: created.row.customerId,
        },
      });

      return { invoice: toInvoiceDto(created.row, created.items) };
    } catch (error) {
      if (
        error instanceof Error &&
        /unique|duplicate/i.test(error.message)
      ) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Unable to create invoice due to a conflict',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to create invoice', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create invoice',
        error: 'Internal Server Error',
      });
    }
  }

  async list(
    actorUserId: string,
    organizationId: string,
    query: ListInvoicesQueryDto,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    // SENT and OVERDUE share a lazy transition: fetch both, then refilter.
    const statuses =
      query.status === 'SENT' || query.status === 'OVERDUE'
        ? (['SENT', 'OVERDUE'] as const)
        : query.status
          ? [query.status]
          : undefined;

    let rows = await listInvoicesForOrganization({
      organizationId,
      statuses: statuses ? [...statuses] : undefined,
      customerId: query.customerId,
      jobId: query.jobId,
    });

    if (membership.role === 'TECHNICIAN') {
      const visibleJobIds = await listTechnicianVisibleJobIds(
        organizationId,
        actorUserId,
      );
      const visible = new Set(visibleJobIds);
      rows = rows.filter((row) => visible.has(row.jobId));
    } else if (!isInvoiceManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not allowed to view invoices',
        error: 'Forbidden',
      });
    }

    rows = await this.applyOverdueTransitions(organizationId, rows);
    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    const items = await listItemsForInvoices(rows.map((row) => row.id));
    const itemsByInvoice = new Map<string, InvoiceItem[]>();
    for (const item of items) {
      const list = itemsByInvoice.get(item.invoiceId) ?? [];
      list.push(item);
      itemsByInvoice.set(item.invoiceId, list);
    }

    return {
      invoices: rows.map((row) =>
        toInvoiceDto(row, itemsByInvoice.get(row.id) ?? []),
      ),
    };
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    invoiceId: string,
  ) {
    const membership = await this.requireActiveMember(
      organizationId,
      actorUserId,
    );

    let row = await findInvoiceInOrganization(organizationId, invoiceId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    if (membership.role === 'TECHNICIAN') {
      const visibleJobIds = await listTechnicianVisibleJobIds(
        organizationId,
        actorUserId,
      );
      if (!visibleJobIds.includes(row.jobId)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Invoice not found',
          error: 'Not Found',
        });
      }
    } else if (!isInvoiceManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not allowed to view invoices',
        error: 'Forbidden',
      });
    }

    const [maybeUpdated] = await this.applyOverdueTransitions(organizationId, [
      row,
    ]);
    row = maybeUpdated ?? row;

    const items = await listItemsForInvoice(row.id);
    return { invoice: toInvoiceDto(row, items) };
  }

  async update(
    actorUserId: string,
    organizationId: string,
    invoiceId: string,
    dto: UpdateInvoiceDto,
  ) {
    await this.requireInvoiceManager(organizationId, actorUserId);

    if (
      dto.items === undefined &&
      dto.discount === undefined &&
      dto.tax === undefined &&
      dto.dueAt === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'At least one field is required',
        error: 'Bad Request',
      });
    }

    const existing = await findInvoiceInOrganization(organizationId, invoiceId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    if (isImmutableStatus(existing.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot modify an invoice in ${existing.status} status`,
        error: 'Conflict',
      });
    }

    const existingItems = await listItemsForInvoice(existing.id);

    let lines: ComputedLine[];
    let totals: ReturnType<typeof calculateInvoiceTotals>;
    try {
      if (dto.items) {
        lines = this.computeLines(dto.items);
      } else {
        lines = existingItems.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          amountCents: parseMoneyToCents(item.amount, 'amount'),
        }));
      }

      totals = calculateInvoiceTotals({
        lineAmountsCents: lines.map((line) => line.amountCents),
        discountCents: parseMoneyToCents(
          dto.discount ?? existing.discount,
          'discount',
        ),
        taxCents: parseMoneyToCents(dto.tax ?? existing.tax, 'tax'),
        amountPaidCents: parseMoneyToCents(existing.amountPaid, 'amountPaid'),
      });
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message:
          error instanceof Error ? error.message : 'Invalid invoice amounts',
        error: 'Bad Request',
      });
    }

    let dueAt: Date | null | undefined = undefined;
    if (dto.dueAt !== undefined) {
      if (dto.dueAt === null) {
        dueAt = null;
      } else {
        dueAt = new Date(dto.dueAt);
        if (Number.isNaN(dueAt.getTime())) {
          throw new BadRequestException({
            statusCode: 400,
            message: 'dueAt must be a valid ISO date string',
            error: 'Bad Request',
          });
        }
      }
    }

    try {
      const updated = await db.transaction(async (tx) => {
        if (dto.items) {
          await deleteInvoiceItemsForInvoice(existing.id, tx);
          await createInvoiceItems(
            lines.map((line) => ({
              id: randomUUID(),
              invoiceId: existing.id,
              type: line.type,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
            })),
            tx,
          );
        }

        const row = await updateInvoiceTotalsInOrganization(
          {
            organizationId,
            invoiceId: existing.id,
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            total: totals.total,
            amountPaid: totals.amountPaid,
            amountDue: totals.amountDue,
            dueAt,
          },
          tx,
        );

        if (!row) {
          throw new Error('Failed to update invoice');
        }

        const items = await listItemsForInvoice(row.id, tx);
        return { row, items };
      });

      return { invoice: toInvoiceDto(updated.row, updated.items) };
    } catch (error) {
      this.logger.error('Failed to update invoice', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to update invoice',
        error: 'Internal Server Error',
      });
    }
  }

  async send(
    actorUserId: string,
    organizationId: string,
    invoiceId: string,
  ) {
    await this.requireInvoiceManager(organizationId, actorUserId);

    const existing = await findInvoiceInOrganization(organizationId, invoiceId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    // Send is DRAFT → SENT only. Payment/refund balance code may reopen PAID
    // invoices to SENT, but clients must not "re-send" paid invoices that way.
    if (existing.status !== 'DRAFT') {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot send an invoice in ${existing.status} status`,
        error: 'Conflict',
      });
    }

    const items = await listItemsForInvoice(existing.id);
    if (items.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Cannot send an invoice with no line items',
        error: 'Bad Request',
      });
    }

    const updated = await updateInvoiceStatusInOrganization({
      organizationId,
      invoiceId: existing.id,
      status: 'SENT',
      issuedAt: existing.issuedAt ?? new Date(),
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    await this.customerNotifications.notifyFromEvent({
      organizationId,
      customerId: updated.customerId,
      eventType: 'INVOICE_SENT',
      idempotencyKey: `INVOICE_SENT:${updated.id}`,
      payload: {
        invoiceId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        total: updated.total,
        currency: updated.currency,
      },
    });

    await this.automationIngress.accept({
      organizationId,
      triggerEvent: 'INVOICE_SENT',
      eventId: updated.id,
      context: {
        customerId: updated.customerId,
        jobId: updated.jobId,
        invoiceId: updated.id,
        currency: updated.currency,
      },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: AuditAction.INVOICE_SENT,
      entityType: AuditEntityType.INVOICE,
      entityId: updated.id,
      metadata: {
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
        total: updated.total,
        jobId: updated.jobId,
        customerId: updated.customerId,
      },
    });

    return { invoice: toInvoiceDto(updated, items) };
  }

  async void(
    actorUserId: string,
    organizationId: string,
    invoiceId: string,
  ) {
    await this.requireInvoiceManager(organizationId, actorUserId);

    const existing = await findInvoiceInOrganization(organizationId, invoiceId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    if (!isVoidableStatus(existing.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot void an invoice in ${existing.status} status`,
        error: 'Conflict',
      });
    }

    if (!canTransitionInvoiceStatus(existing.status, 'VOID')) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot void an invoice in ${existing.status} status`,
        error: 'Conflict',
      });
    }

    const updated = await updateInvoiceStatusInOrganization({
      organizationId,
      invoiceId: existing.id,
      status: 'VOID',
    });

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    await this.audit.recordCritical({
      organizationId,
      actorUserId,
      action: AuditAction.INVOICE_VOIDED,
      entityType: AuditEntityType.INVOICE,
      entityId: updated.id,
      metadata: {
        before: { status: existing.status },
        after: { status: updated.status },
        invoiceNumber: updated.invoiceNumber,
        jobId: updated.jobId,
        customerId: updated.customerId,
      },
    });

    const items = await listItemsForInvoice(updated.id);
    return { invoice: toInvoiceDto(updated, items) };
  }

  private computeLines(items: CreateInvoiceItemDto[]): ComputedLine[] {
    return items.map((item, index) => {
      const quantityHundredths = parseQuantityToHundredths(
        item.quantity,
        `items[${index}].quantity`,
      );
      const unitPriceCents = parseMoneyToCents(
        item.unitPrice,
        `items[${index}].unitPrice`,
      );

      if (quantityHundredths <= 0n) {
        throw new Error(`items[${index}].quantity must be greater than zero`);
      }
      if (unitPriceCents < 0n) {
        throw new Error(
          `items[${index}].unitPrice must be non-negative`,
        );
      }

      const amountCents = lineAmountCents(quantityHundredths, unitPriceCents);
      return {
        type: item.type,
        description: item.description,
        quantity: centsToMoneyString(quantityHundredths),
        unitPrice: centsToMoneyString(unitPriceCents),
        amount: centsToMoneyString(amountCents),
        amountCents,
      };
    });
  }

  private async applyOverdueTransitions(
    organizationId: string,
    rows: Invoice[],
  ): Promise<Invoice[]> {
    const now = new Date();
    const result: Invoice[] = [];

    for (const row of rows) {
      const pastDue =
        Boolean(row.dueAt) && row.dueAt!.getTime() < now.getTime();
      // SENT past due → OVERDUE. PARTIALLY_PAID stays PARTIALLY_PAID so
      // payment UX remains clear; overdue amount is still amountDue.
      if (
        row.status === 'SENT' &&
        pastDue &&
        canTransitionInvoiceStatus(row.status, 'OVERDUE')
      ) {
        const updated = await updateInvoiceStatusInOrganization({
          organizationId,
          invoiceId: row.id,
          status: 'OVERDUE',
        });
        result.push(updated ?? row);
      } else {
        result.push(row);
      }
    }

    return result;
  }

  private async requireActiveMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await findActiveMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not a member of this organization',
        error: 'Forbidden',
      });
    }
    return membership;
  }

  private async requireInvoiceManager(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isInvoiceManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Only owners, admins, and dispatchers can manage invoices',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
