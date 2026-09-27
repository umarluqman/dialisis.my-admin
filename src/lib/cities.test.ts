import { describe, expect, it } from "vitest"
import { citiesForState, isCenterInTown, townForCenter } from "./cities"

const center = (town: string, address = "") => ({ town, address, addressWithUnit: "" })

describe("citiesForState", () => {
  it("matches DB state names to public town pages", () => {
    expect(citiesForState("Kelantan")).toContain("Bachok")
    expect(citiesForState("Negeri-Sembilan")).toEqual(citiesForState("Negeri Sembilan"))
    expect(citiesForState("Putrajaya")).toEqual([])
  })
})

describe("isCenterInTown", () => {
  it("matches town, address or unit address case-insensitively", () => {
    expect(isCenterInTown(center("KAJANG"), "Kajang")).toBe(true)
    expect(isCenterInTown(center("", "Jalan 1, 43000 Kajang"), "Kajang")).toBe(true)
    expect(isCenterInTown(center("Bangi"), "Kajang")).toBe(false)
  })
})

describe("townForCenter", () => {
  it("prefers the centre's own town field over address matches", () => {
    expect(townForCenter(center("Kajang", "Jalan Semenyih"), "Selangor")).toBe("Kajang")
    expect(townForCenter(center("", "43000 Kajang"), "Selangor")).toBe("Kajang")
    expect(townForCenter(center("Nowhere"), "Selangor")).toBeNull()
  })
})
