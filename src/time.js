// -----------------------------------------------------------------------------
// Local days. The Gladys supervisor injects TZ, the time zone of Gladys: "today"
// (the counters of the day) starts at local midnight.
// -----------------------------------------------------------------------------

/** Local midnight of the day of `ms`, in ms. */
export function localMidnight(ms) {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The local date of `ms`, "YYYY-MM-DD". */
export function localDate(ms) {
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
