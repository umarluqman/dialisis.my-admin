import { describe, expect, it } from "vitest"
import { TREATMENT_UNITS, mergePhoneNumbers, toggleListValue } from "./center-fields"

describe("toggleListValue", () => {
  it("keeps canonical order and legacy values", () => {
    expect(toggleListValue("HD Unit, Foo", "CAPD Unit", true, TREATMENT_UNITS)).toBe("CAPD Unit, HD Unit, Foo")
    expect(toggleListValue("hd unit", "HD Unit", false, TREATMENT_UNITS)).toBe("")
  })
})

describe("mergePhoneNumbers", () => {
  it("splits and dedupes across columns", () => {
    expect(mergePhoneNumbers("09-580 7527, 011-6322 4295", "09-580 7527")).toEqual([
      "09-580 7527",
      "011-6322 4295",
    ])
    expect(mergePhoneNumbers("+6017-3994 168", "017-399 4168", "")).toEqual(["+6017-3994 168"])
  })
})
