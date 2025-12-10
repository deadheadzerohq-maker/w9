// app/lib/emailHelpers.ts

export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildLaneDescription(
  originCity?: string | null,
  originState?: string | null,
  destCity?: string | null,
  destState?: string | null,
): string {
  const origin =
    originCity && originState
      ? `${originCity}, ${originState}`
      : originCity || originState || "Origin";
  const dest =
    destCity && destState
      ? `${destCity}, ${destState}`
      : destCity || destState || "Destination";
  return `${origin} → ${dest}`;
}
