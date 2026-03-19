import { beforeEach, describe, expect, it, vi } from "vitest"

const { betterAuthMock, drizzleAdapterMock, tanstackStartCookiesMock } =
  vi.hoisted(() => ({
    betterAuthMock: vi.fn((config) => config),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    tanstackStartCookiesMock: vi.fn(() => "tanstack-start-cookies"),
  }))

vi.mock("better-auth", () => ({
  betterAuth: betterAuthMock,
}))

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterMock,
}))

vi.mock("better-auth/tanstack-start", () => ({
  tanstackStartCookies: tanstackStartCookiesMock,
}))

vi.mock("@/db/connection", () => ({
  db: {},
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  createPasswordResetEmail: vi.fn(() => "<p>reset</p>"),
}))

describe("auth config", () => {
  beforeEach(() => {
    vi.resetModules()
    betterAuthMock.mockClear()
    drizzleAdapterMock.mockClear()
    tanstackStartCookiesMock.mockClear()
    process.env.BETTER_AUTH_SECRET = "test-secret"
  })

  it("uses Better Auth's default password hashing", async () => {
    await import("./auth")

    const config = betterAuthMock.mock.calls[0]?.[0]

    expect(config.emailAndPassword.enabled).toBe(true)
    expect(config.emailAndPassword.password).toBeUndefined()
  })
})
