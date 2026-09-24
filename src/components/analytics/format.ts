const numberFormat = new Intl.NumberFormat("en-MY")

const dayFormat = new Intl.DateTimeFormat("en-MY", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
})

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
