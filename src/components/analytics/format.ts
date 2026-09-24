const numberFormat = new Intl.NumberFormat("en-MY")

const dayFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
})

const mytDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function formatMytDateTime(iso: string) {
  const part = Object.fromEntries(
    mytDateTimeFormat
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value])
  )
  return `${part.day} ${part.month} ${part.year}, ${part.hour}:${part.minute} ${part.dayPeriod}`
}

export function formatNumber(value: number) {
  return numberFormat.format(value)
}

export function formatDay(day: string) {
  return dayFormat.format(new Date(`${day}T00:00:00Z`))
}

export function contactRate(contactVisitors: number, visitors: number) {
  return visitors > 0 ? contactVisitors / visitors : 0
}

export function formatRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}
