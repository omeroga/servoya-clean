// ✅ Guatemala Time Helper (v1.0)

export function getGuatemalaTimestamp() {
  const now = new Date();
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Guatemala",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  return { localDate, localTime };
}