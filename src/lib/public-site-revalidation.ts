export type PublicCenterRevalidationInput = {
  slug?: string | null
  oldSlug?: string | null
  stateName?: string | null
  town?: string | null
  oldStateName?: string | null
  oldTown?: string | null
}

type PublicSiteRevalidationResult =
  | { ok: true; skipped: true }
  | { ok: boolean; skipped: false; status: number }

function getEnvValue(name: string) {
  if (typeof process !== "undefined") {
    return process.env?.[name]
  }
}

function getRevalidationUrl() {
  return (
    getEnvValue("DIALISIS_MY_REVALIDATE_URL") ||
    "https://dialisis.my/api/revalidate-center"
  )
}

export async function revalidatePublicCenter(
  input: PublicCenterRevalidationInput
): Promise<PublicSiteRevalidationResult> {
  const secret = getEnvValue("DIALISIS_MY_REVALIDATE_SECRET")

  if (!secret) {
    return { ok: true, skipped: true }
  }

  const response = await fetch(getRevalidationUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  })

  return {
    ok: response.ok,
    skipped: false,
    status: response.status,
  }
}

export async function revalidatePublicCenterQuietly(
  input: PublicCenterRevalidationInput
) {
  try {
    const result = await revalidatePublicCenter(input)

    if (!result.ok) {
      console.warn("[public-site] revalidation failed", result)
    }

    return result
  } catch (error) {
    console.warn("[public-site] revalidation failed", error)
    return { ok: false, skipped: false, status: 0 }
  }
}
