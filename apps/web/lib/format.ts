/** Short id for tables (full UUID stays available via title/tooltip). */
export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function formatDate(
  value: string | null | undefined,
  timeZone = "UTC",
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
}

export function formatDateTime(
  value: string | null | undefined,
  timeZone = "UTC",
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(
      date,
    );
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      ...options,
      timeZone: "UTC",
    }).format(date);
  }
}

export function formatCustomerAddress(customer: {
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): string | null {
  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.postalCode,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Format API money decimal strings with the invoice/org currency code. */
export function formatMoney(
  amount: string | null | undefined,
  currency = "USD",
): string {
  if (amount == null || amount === "") return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Sum API money decimal strings using integer cents (display aggregation only).
 * Backend remains the source of truth for invoice balances.
 */
export function sumMoneyStrings(amounts: readonly string[]): string {
  let cents = 0n;
  for (const amount of amounts) {
    const trimmed = amount.trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) continue;
    const negative = trimmed.startsWith("-");
    const unsigned = negative ? trimmed.slice(1) : trimmed;
    const parts = unsigned.split(".");
    const wholePart = parts[0] ?? "0";
    const fractionPart = parts[1] ?? "";
    const value =
      BigInt(wholePart) * 100n + BigInt((fractionPart + "00").slice(0, 2));
    cents += negative ? -value : value;
  }
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}
