// /lib/emailHelpers.ts

// Build a lane description like "Phoenix, AZ → Chicago, IL"
export function buildLaneDescription(args: {
  origin_city?: string | null;
  origin_state?: string | null;
  dest_city?: string | null;
  dest_state?: string | null;
}): string {
  const { origin_city, origin_state, dest_city, dest_state } = args;

  const originParts = [origin_city, origin_state].filter(Boolean).join(", ");
  const destParts = [dest_city, dest_state].filter(Boolean).join(", ");

  if (!originParts && !destParts) return "";
  if (!originParts) return destParts;
  if (!destParts) return originParts;

  return `${originParts} → ${destParts}`;
}

// Format a date/time string into a readable form
export function formatDateTime(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}
