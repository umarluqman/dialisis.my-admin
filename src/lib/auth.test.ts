import { beforeEach, describe, expect, it, vi } from "vitest"

const { betterAuthMock, drizzleAdapterMock, emailOtpMock, tanstackStartCookiesMock } =
  vi.hoisted(() => ({
    betterAuthMock: vi.fn((config) => config),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    emailOtpMock: vi.fn((config) => ({ plugin: "email-otp", config })),
    tanstackStartCookiesMock: vi.fn(() => "tanstack-start-cookies"),
  }))

vi.mock("better-auth", () => ({
  betterAuth: betterAuthMock,
}))

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterMock,
}))

vi.mock("better-auth/plugins", () => ({
  emailOTP: emailOtpMock,
}))

vi.mock("better-auth/tanstack-start", () => ({
  tanstackStartCookies: tanstackStartCookiesMock,
}))

vi.mock("@/db/connection", () => ({
  db: {},
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  createOtpEmail: vi.fn(() => ({ html: "<p>otp</p>", text: "otp" })),
}))

describe("auth config", () => {
  beforeEach(() => {
    vi.resetModules()
    betterAuthMock.mockClear()
    drizzleAdapterMock.mockClear()
    emailOtpMock.mockClear()
    tanstackStartCookiesMock.mockClear()
    process.env.BETTER_AUTH_SECRET = "test-secret"
  })

  it("uses email OTP instead of password sign-in", async () => {
    await import("./auth")

    const config = betterAuthMock.mock.calls[0]?.[0]

    expect(config.emailAndPassword.enabled).toBe(false)
    expect(emailOtpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        otpLength: 6,
        expiresIn: 300,
      })
    )
  })
})
