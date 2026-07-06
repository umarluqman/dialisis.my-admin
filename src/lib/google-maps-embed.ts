export type MapCoordinates = {
  latitude: number
  longitude: number
}

const NUMBER_PATTERN = "-?\\d+(?:\\.\\d+)?"

function normalizeMapValue(value: string) {
  return value
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
}

function extractSrc(value: string) {
  const normalized = normalizeMapValue(value)
  const srcMatch = normalized.match(/\bsrc=(["'])(.*?)\1/i)
  return srcMatch?.[2]?.trim() || normalized
}

function tryDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function toValidCoordinates(latitude: number, longitude: number) {
  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { latitude, longitude }
  }

  return null
}

export function extractGoogleMapsUrl(value: string) {
  const src = extractSrc(value)
  const urlMatch = src.match(/https?:\/\/[^\s"'<>]+/i)
  return urlMatch?.[0] ?? null
}

export function extractGoogleMapsCoordinates(value: string): MapCoordinates | null {
  const src = extractSrc(value)
  const candidates = [src, tryDecode(src)]

  for (const candidate of candidates) {
    const embedMatch = candidate.match(
      new RegExp(`!2d(${NUMBER_PATTERN})!3d(${NUMBER_PATTERN})`)
    )
    if (embedMatch) {
      const longitude = Number(embedMatch[1])
      const latitude = Number(embedMatch[2])
      const coordinates = toValidCoordinates(latitude, longitude)
      if (coordinates) return coordinates
    }

    const placeDataMatch = candidate.match(
      new RegExp(`!3d(${NUMBER_PATTERN})!4d(${NUMBER_PATTERN})`)
    )
    if (placeDataMatch) {
      const latitude = Number(placeDataMatch[1])
      const longitude = Number(placeDataMatch[2])
      const coordinates = toValidCoordinates(latitude, longitude)
      if (coordinates) return coordinates
    }

    const atMatch = candidate.match(
      new RegExp(`@(${NUMBER_PATTERN}),(${NUMBER_PATTERN})`)
    )
    if (atMatch) {
      const latitude = Number(atMatch[1])
      const longitude = Number(atMatch[2])
      const coordinates = toValidCoordinates(latitude, longitude)
      if (coordinates) return coordinates
    }

    const queryMatch = candidate.match(
      new RegExp(
        `[?&](?:q|query|ll|center|destination|daddr)=(${NUMBER_PATTERN}),(${NUMBER_PATTERN})`
      )
    )
    if (queryMatch) {
      const latitude = Number(queryMatch[1])
      const longitude = Number(queryMatch[2])
      const coordinates = toValidCoordinates(latitude, longitude)
      if (coordinates) return coordinates
    }
  }

  return null
}
