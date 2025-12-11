// /lib/emailHelpers.ts

export function buildLaneDescription(
  args:
    | {
        origin_city?: string | null;
        origin_state?: string | null;
        dest_city?: string | null;
        dest_state?: string | null;
      }
    | string,
): string {
  // Backwards-compatible: if someone passes a plain string, just return it.
  if (typeof args === "string") {
    return args;
  }

  const { origin_city, origin_state, dest_city, dest_state } = args;

  const originParts = [origin_city, origin_state].filter(Boolean).join(", ");
  const destParts = [dest_city, dest_state].filter(Boolean).join(", ");

  if (!originParts && !destParts) return "";

  if (!originParts) return destParts;
  if (!destParts) return originParts;

  return `${originParts} → ${destParts}`;
}

export function formatDateTime(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  // You can tweak this for your preferred display format
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}
