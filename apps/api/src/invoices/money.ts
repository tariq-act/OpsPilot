/**
 * Decimal-safe money helpers using integer minor units (cents).
 * Never use floating-point arithmetic for invoice totals.
 */

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export function parseMoneyToCents(value: string, fieldName: string): bigint {
  const trimmed = value.trim();
  if (!MONEY_PATTERN.test(trimmed)) {
    throw new Error(`${fieldName} must be a decimal with up to 2 places`);
  }

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const cents =
    BigInt(wholePart) * 100n + BigInt((fractionPart + '00').slice(0, 2));
  return negative ? -cents : cents;
}

export function parseQuantityToHundredths(
  value: string,
  fieldName: string,
): bigint {
  const trimmed = value.trim();
  if (!QUANTITY_PATTERN.test(trimmed)) {
    throw new Error(`${fieldName} must be a decimal with up to 2 places`);
  }

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const hundredths =
    BigInt(wholePart) * 100n + BigInt((fractionPart + '00').slice(0, 2));
  return negative ? -hundredths : hundredths;
}

export function centsToMoneyString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

/** amount = round(quantity * unitPrice, 2) using hundredths × cents → cents. */
export function lineAmountCents(
  quantityHundredths: bigint,
  unitPriceCents: bigint,
): bigint {
  const product = quantityHundredths * unitPriceCents;
  // Divide by 100 (quantity scale) with half-up rounding away from zero.
  if (product >= 0n) {
    return (product + 50n) / 100n;
  }
  return (product - 50n) / 100n;
}

export type InvoiceTotalsInput = {
  lineAmountsCents: readonly bigint[];
  discountCents: bigint;
  taxCents: bigint;
  amountPaidCents: bigint;
};

export type InvoiceTotals = {
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  amountDue: string;
};

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const subtotalCents = input.lineAmountsCents.reduce(
    (sum, amount) => sum + amount,
    0n,
  );

  if (input.discountCents < 0n) {
    throw new Error('discount must be non-negative');
  }
  if (input.taxCents < 0n) {
    throw new Error('tax must be non-negative');
  }
  if (input.amountPaidCents < 0n) {
    throw new Error('amountPaid must be non-negative');
  }
  if (input.discountCents > subtotalCents) {
    throw new Error('discount cannot exceed subtotal');
  }

  const totalCents = subtotalCents - input.discountCents + input.taxCents;
  if (totalCents < 0n) {
    throw new Error('total cannot be negative');
  }
  if (input.amountPaidCents > totalCents) {
    throw new Error('amountPaid cannot exceed total');
  }

  const amountDueCents = totalCents - input.amountPaidCents;

  return {
    subtotal: centsToMoneyString(subtotalCents),
    discount: centsToMoneyString(input.discountCents),
    tax: centsToMoneyString(input.taxCents),
    total: centsToMoneyString(totalCents),
    amountPaid: centsToMoneyString(input.amountPaidCents),
    amountDue: centsToMoneyString(amountDueCents),
  };
}
