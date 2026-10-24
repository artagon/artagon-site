// USMR 14.12: collection dates are UTC; display dates must use the same day
// as datetime, RSS, and sitemap output on every build machine.
export function formatPostDate(
  date: Date,
  style: "byline" | "card" = "byline",
): string {
  return new Intl.DateTimeFormat(style === "byline" ? "en-GB" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function postDateParts(date: Date) {
  const iso = date.toISOString();
  return {
    year: iso.slice(0, 4),
    monthDay: `${iso.slice(5, 7)} · ${iso.slice(8, 10)}`,
    iso,
  };
}
