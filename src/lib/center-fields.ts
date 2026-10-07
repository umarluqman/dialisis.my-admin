export const SECTORS = ["PRIVATE", "MOH", "NGO", "UNIVERSITY", "ARMED FORCE"] as const

export const TREATMENT_UNITS = ["CAPD Unit", "HD Unit", "Tx Unit", "MRRB Unit"] as const

export const HEPATITIS_BAYS = ["Hep B", "Hep C"] as const

const NO_HEPATITIS_BAY = "Not Available"

export function splitList(value: string | null | undefined, separator: RegExp = /,/) {
  return (value ?? "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
}

// Keeps known options in canonical order and preserves unknown legacy values.
export function toggleListValue(
  value: string,
  option: string,
  checked: boolean,
  options: readonly string[]
) {
  const items = splitList(value).filter((item) => item.toLowerCase() !== option.toLowerCase())
  if (checked) items.push(option)
  const known = options.filter((o) => items.some((i) => i.toLowerCase() === o.toLowerCase()))
  const unknown = items.filter((i) => !options.some((o) => o.toLowerCase() === i.toLowerCase()))
  return [...known, ...unknown].join(", ")
}

export function hasListValue(value: string, option: string) {
  return splitList(value).some((item) => item.toLowerCase() === option.toLowerCase())
}

export function fromHepatitisBay(value: string | null | undefined) {
  return value?.trim() === NO_HEPATITIS_BAY ? "" : (value ?? "")
}

export function toHepatitisBay(value: string) {
  return value.trim() || NO_HEPATITIS_BAY
}

function phoneKey(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return phone.toLowerCase()
  return digits.startsWith("0") ? `6${digits}` : digits
}

export function mergePhoneNumbers(...values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  return values
    .flatMap((value) => splitList(value, /[,;/\n]+/))
    .filter((phone) => {
      const key = phoneKey(phone)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
