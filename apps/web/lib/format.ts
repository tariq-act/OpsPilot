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
