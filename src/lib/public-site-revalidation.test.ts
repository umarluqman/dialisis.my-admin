import { beforeEach, describe, expect, it, vi } from "vitest"

import { revalidatePublicCenter } from "./public-site-revalidation"

describe("revalidatePublicCenter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.DIALISIS_MY_REVALIDATE_SECRET
    delete process.env.DIALISIS_MY_REVALIDATE_URL
  })

  it("skips when no secret is configured", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const result = await revalidatePublicCenter({ slug: "center-a" })

    expect(result).toEqual({ ok: true, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts center details to the public revalidation endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal("fetch", fetchMock)
    process.env.DIALISIS_MY_REVALIDATE_SECRET = "test-secret"
    process.env.DIALISIS_MY_REVALIDATE_URL =
      "https://dialisis.my/api/revalidate-center"

    const result = await revalidatePublicCenter({
      slug: "center-a",
      oldSlug: "center-old",
      stateName: "Selangor",
      town: "Shah Alam",
      oldStateName: "Kuala Lumpur",
      oldTown: "Cheras",
    })

    expect(result).toEqual({ ok: true, skipped: false, status: 200 })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dialisis.my/api/revalidate-center",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "center-a",
          oldSlug: "center-old",
          stateName: "Selangor",
          town: "Shah Alam",
          oldStateName: "Kuala Lumpur",
          oldTown: "Cheras",
        }),
      }
    )
  })
})
