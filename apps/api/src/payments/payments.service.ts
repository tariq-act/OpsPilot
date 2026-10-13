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
  createPayment,
  findActiveMembership,
  findInvoiceInOrganization,
  findPaymentByTransactionId,
  findPaymentInOrganization,
  listPaymentsForInvoice,
  listSucceededPaymentsForInvoice,
  updateInvoiceBalanceInOrganization,
  updatePaymentStatusInOrganization,
} from '../db/queries/index.js';
import { db } from '../db/index.js';
import type { Invoice } from '../db/schema/invoice.js';
import type { Payment } from '../db/schema/payment.js';
import type {
  OrganizationMember,
  OrganizationMemberRole,
} from '../db/schema/organization.js';
import {
  deriveInvoiceBalanceAfterPayment,
  isPayableInvoiceStatus,
} from '../invoices/invoice-balance.js';
import { canTransitionInvoiceStatus } from '../invoices/invoice-status.js';
import {
  centsToMoneyString,
  parseMoneyToCents,
} from '../invoices/money.js';
import { CustomerNotificationsService } from '../notifications/customer-notifications.service.js';
import { AutomationIngressService } from '../automation/automation-ingress.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import { MANUAL_PAYMENT_METHODS } from './dto/create-payment.dto.js';

const PAYMENT_MANAGER_ROLES = [
  'OWNER',
  'ADMIN',
  'DISPATCHER',
] as const satisfies readonly OrganizationMemberRole[];

const PAYMENT_REFUND_ROLES = [
  'OWNER',
  'ADMIN',
] as const satisfies readonly OrganizationMemberRole[];

type PaymentManagerRole = (typeof PAYMENT_MANAGER_ROLES)[number];
type PaymentRefundRole = (typeof PAYMENT_REFUND_ROLES)[number];

function isPaymentManagerRole(
  role: OrganizationMemberRole,
): role is PaymentManagerRole {
  return (PAYMENT_MANAGER_ROLES as readonly string[]).includes(role);
}

function isPaymentRefundRole(
  role: OrganizationMemberRole,
): role is PaymentRefundRole {
  return (PAYMENT_REFUND_ROLES as readonly string[]).includes(role);
}

function isManualMethod(
  method: CreatePaymentDto['method'],
): method is (typeof MANUAL_PAYMENT_METHODS)[number] {
  return (MANUAL_PAYMENT_METHODS as readonly string[]).includes(method);
}

function toPaymentDto(row: Payment) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    invoiceId: row.invoiceId,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    status: row.status,
    transactionId: row.transactionId,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sumSucceededCents(rows: Payment[]): bigint {
  return rows.reduce(
    (sum, row) => sum + parseMoneyToCents(row.amount, 'amount'),
    0n,
  );
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly customerNotifications: CustomerNotificationsService,
    private readonly automationIngress: AutomationIngressService,
  ) {}

  async createForInvoice(
    actorUserId: string,
    organizationId: string,
    invoiceId: string,
    dto: CreatePaymentDto,
  ) {
    await this.requirePaymentManager(organizationId, actorUserId);

    const invoice = await findInvoiceInOrganization(organizationId, invoiceId);
    if (!invoice) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    if (dto.customerId !== undefined && dto.customerId !== invoice.customerId) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Customer does not match the invoice',
        error: 'Bad Request',
      });
    }

    if (invoice.status === 'VOID') {
      throw new ConflictException({
        statusCode: 409,
        message: 'Cannot record a payment against a void invoice',
        error: 'Conflict',
      });
    }

    if (invoice.status === 'DRAFT') {
      throw new ConflictException({
        statusCode: 409,
        message: 'Cannot record a payment against a draft invoice',
        error: 'Conflict',
      });
    }

    if (invoice.status === 'PAID') {
      throw new ConflictException({
        statusCode: 409,
        message: 'Invoice is already paid in full',
        error: 'Conflict',
      });
    }

    let amountCents: bigint;
    try {
      amountCents = parseMoneyToCents(dto.amount, 'amount');
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message:
          error instanceof Error ? error.message : 'Invalid payment amount',
        error: 'Bad Request',
      });
    }

    if (amountCents <= 0n) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Amount must be greater than zero',
        error: 'Bad Request',
      });
    }

    const transactionId = dto.transactionId?.trim() || null;
    if (transactionId) {
      const existingByTxn = await findPaymentByTransactionId(
        organizationId,
        transactionId,
      );
      if (existingByTxn) {
        // Idempotent replay: same org + transactionId returns the prior payment.
        if (
          existingByTxn.invoiceId !== invoice.id ||
          existingByTxn.amount !== centsToMoneyString(amountCents) ||
          existingByTxn.method !== dto.method
        ) {
          throw new ConflictException({
            statusCode: 409,
            message:
              'transactionId already used for a different payment in this organization',
            error: 'Conflict',
          });
        }
        return { payment: toPaymentDto(existingByTxn) };
      }
    }

    // ONLINE cannot be marked SUCCEEDED without a verified provider callback.
    const status = dto.method === 'ONLINE' ? 'PENDING' : 'SUCCEEDED';
    if (status === 'SUCCEEDED' && !isManualMethod(dto.method)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Unsupported payment method for manual success',
        error: 'Bad Request',
      });
    }

    if (status === 'SUCCEEDED') {
      if (!isPayableInvoiceStatus(invoice.status)) {
        throw new ConflictException({
          statusCode: 409,
          message: `Cannot record a succeeded payment on an invoice in ${invoice.status} status`,
          error: 'Conflict',
        });
      }

      const dueCents = parseMoneyToCents(invoice.amountDue, 'amountDue');
      if (amountCents > dueCents) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Payment amount exceeds invoice amount due',
          error: 'Bad Request',
        });
      }
    }

    const paidAt = status === 'SUCCEEDED' ? new Date() : null;
    const amount = centsToMoneyString(amountCents);

    try {
      const created = await db.transaction(async (tx) => {
        const paymentRow = await createPayment(
          {
            id: randomUUID(),
            organizationId,
            customerId: invoice.customerId,
            invoiceId: invoice.id,
            amount,
            currency: invoice.currency,
            method: dto.method,
            status,
            transactionId,
            paidAt,
          },
          tx,
        );

        if (status === 'SUCCEEDED') {
          await this.applySucceededBalance(organizationId, invoice, tx);
        }

        return paymentRow;
      });

      if (created.status === 'SUCCEEDED') {
        await this.customerNotifications.notifyFromEvent({
          organizationId,
          customerId: created.customerId,
          eventType: 'PAYMENT_CONFIRMED',
          idempotencyKey: `PAYMENT_CONFIRMED:${created.id}`,
          payload: {
            paymentId: created.id,
            invoiceId: created.invoiceId,
            amount: created.amount,
            currency: created.currency,
            method: created.method,
          },
        });

        await this.automationIngress.accept({
          organizationId,
          triggerEvent: 'PAYMENT_RECEIVED',
          eventId: created.id,
          context: {
            customerId: created.customerId,
            jobId: invoice.jobId,
            invoiceId: created.invoiceId,
            paymentId: created.id,
            currency: created.currency,
            method: created.method,
          },
        });
      }

      return { payment: toPaymentDto(created) };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (
        error instanceof Error &&
        /unique|duplicate/i.test(error.message)
      ) {
        if (transactionId) {
          const raced = await findPaymentByTransactionId(
            organizationId,
            transactionId,
          );
          if (raced) {
            return { payment: toPaymentDto(raced) };
          }
        }
        throw new ConflictException({
          statusCode: 409,
          message: 'Unable to create payment due to a conflict',
          error: 'Conflict',
        });
      }
      this.logger.error('Failed to create payment', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create payment',
        error: 'Internal Server Error',
      });
    }
  }

  async listForInvoice(
    actorUserId: string,
    organizationId: string,
    invoiceId: string,
  ) {
    await this.requirePaymentManager(organizationId, actorUserId);

    const invoice = await findInvoiceInOrganization(organizationId, invoiceId);
    if (!invoice) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    const payments = await listPaymentsForInvoice(organizationId, invoiceId);
    return { payments: payments.map(toPaymentDto) };
  }

  async getById(
    actorUserId: string,
    organizationId: string,
    paymentId: string,
  ) {
    await this.requirePaymentManager(organizationId, actorUserId);

    const row = await findPaymentInOrganization(organizationId, paymentId);
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Payment not found',
        error: 'Not Found',
      });
    }

    return { payment: toPaymentDto(row) };
  }

  async refund(
    actorUserId: string,
    organizationId: string,
    paymentId: string,
  ) {
    await this.requirePaymentRefunder(organizationId, actorUserId);

    const existing = await findPaymentInOrganization(organizationId, paymentId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Payment not found',
        error: 'Not Found',
      });
    }

    if (existing.status === 'REFUNDED') {
      return { payment: toPaymentDto(existing) };
    }

    if (existing.status !== 'SUCCEEDED') {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot refund a payment in ${existing.status} status`,
        error: 'Conflict',
      });
    }

    if (existing.method === 'ONLINE') {
      throw new ConflictException({
        statusCode: 409,
        message:
          'Online payment refunds require verified payment-provider confirmation',
        error: 'Conflict',
      });
    }

    const invoice = await findInvoiceInOrganization(
      organizationId,
      existing.invoiceId,
    );
    if (!invoice) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }

    if (invoice.status === 'VOID') {
      throw new ConflictException({
        statusCode: 409,
        message: 'Cannot refund a payment on a void invoice',
        error: 'Conflict',
      });
    }

    try {
      const refunded = await db.transaction(async (tx) => {
        const paymentRow = await updatePaymentStatusInOrganization(
          {
            organizationId,
            paymentId: existing.id,
            status: 'REFUNDED',
          },
          tx,
        );
        if (!paymentRow) {
          throw new Error('Failed to refund payment');
        }

        await this.applySucceededBalance(organizationId, invoice, tx);
        return paymentRow;
      });

      return { payment: toPaymentDto(refunded) };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Failed to refund payment', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to refund payment',
        error: 'Internal Server Error',
      });
    }
  }

  private async applySucceededBalance(
    organizationId: string,
    invoice: Invoice,
    executor: NonNullable<
      Parameters<typeof listSucceededPaymentsForInvoice>[2]
    >,
  ) {
    const succeeded = await listSucceededPaymentsForInvoice(
      organizationId,
      invoice.id,
      executor,
    );
    const succeededPaidCents = sumSucceededCents(succeeded);

    let balance: ReturnType<typeof deriveInvoiceBalanceAfterPayment>;
    try {
      balance = deriveInvoiceBalanceAfterPayment({
        invoice,
        succeededPaidCents,
      });
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message:
          error instanceof Error ? error.message : 'Invalid invoice balance',
        error: 'Bad Request',
      });
    }

    if (!canTransitionInvoiceStatus(invoice.status, balance.status)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot move invoice from ${invoice.status} to ${balance.status}`,
        error: 'Conflict',
      });
    }

    const updated = await updateInvoiceBalanceInOrganization(
      {
        organizationId,
        invoiceId: invoice.id,
        amountPaid: balance.amountPaid,
        amountDue: balance.amountDue,
        status: balance.status,
        paidAt: balance.paidAt,
      },
      executor,
    );

    if (!updated) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    }
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

  private async requirePaymentManager(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isPaymentManagerRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Only owners, admins, and dispatchers can manage payments',
        error: 'Forbidden',
      });
    }
    return membership;
  }

  private async requirePaymentRefunder(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.requireActiveMember(organizationId, userId);
    if (!isPaymentRefundRole(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only owners and admins can refund payments',
        error: 'Forbidden',
      });
    }
    return membership;
  }
}
