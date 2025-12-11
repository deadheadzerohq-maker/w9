// /lib/emailHelpers.ts

//
// buildLaneDescription()
// Supports ALL call styles:
//   1) buildLaneDescription({ origin_city, origin_state, dest_city, dest_state })
//   2) buildLaneDescription(originCity, originState, destCity, destState)
//   3) buildLaneDescription("Phoenix, AZ → Chicago, IL")
//

// --- Overload signatures for TypeScript ---
export function buildLaneDescription(
  origin_city: string | null | undefined,
  origin_state: string | null | undefined,
  dest_city: string | null | undefined,
  dest_state: string | null | undefined,
): string;

export function buildLaneDescription(
  args:
    | {
        origin_city?: string | null;
        origin_state?: string | null;
        dest_city?: string | null;
        dest_state?: string | null;
      }
    | string,
): string;

// --- Unified implementation ---
export function buildLaneDescription(
  a:
    | string
    | {
        origin_city?: string | null;
        origin_state?: string | null;
        dest_city?: string | null;
        dest_state?: string | null;
      },
  b?: string | null,
  c?: string | null,
  d?: string | null,
): string {
  // CASE 1 — single string passed
  if (typeof a === "string" && b === undefined && c === undefined && d === undefined) {
    return a;
  }

  // CASE 2 — object form
  if (typeof a === "object" && a !== null) {
    const { origin_city, origin_state, dest_city, dest_state } = a;

    const originParts = [origin_city, origin_state].filter(Boolean).join(", ");
    const destParts   = [dest_city, dest_state].filter(Boolean).join(", ");

    if (!originParts && !destParts) return "";
    if (!originParts) return destParts;
    if (!destParts) return originParts;

    return `${originParts} → ${destParts}`;
  }

  // CASE 3 — 4-argument form
  const origin_city = a as string | null | undefined;
  const origin_state = b as string | null | undefined;
  const dest_city = c as string | null | undefined;
  const dest_state = d as string | null | undefined;

  const originParts = [origin_city, origin_state].filter(Boolean).join(", ");
  const destParts   = [dest_city, dest_state].filter(Boolean).join(", ");

  if (!originParts && !destParts) return "";
  if (!originParts) return destParts;
  if (!destParts) return originParts;

  return `${originParts} → ${destParts}`;
}

//
// formatDateTime()
//

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
