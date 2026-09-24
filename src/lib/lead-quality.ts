import { sql } from "drizzle-orm"
import { intakeLead } from "@/db/schema"

export const LEAD_FIX_AT = "2026-09-24T11:12:55.000+00:00"
export const CONTACTS_TRACKED_SINCE = LEAD_FIX_AT
export const VIEWS_TRACKED_SINCE = "2026-09-24T12:01:50.000+00:00"
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000

const TEST_NAME_WORDS = ["test", "ujian", "debug", "abaikan"]
const TEST_NOTES_PREFIX = "testing"

export type LeadQuality = "test" | "invalid" | "stale" | "valid"

export function isTestLead(lead: {
  fullName: string
  additionalNotes: string | null
}) {
  const name = lead.fullName.toLowerCase()
  return (
    TEST_NAME_WORDS.some((word) => name.includes(word)) ||
    (lead.additionalNotes ?? "").trim().toLowerCase().startsWith(TEST_NOTES_PREFIX)
  )
}

export const testLeadSql = sql`(${sql.join(
  TEST_NAME_WORDS.map(
    (word) => sql`lower(${intakeLead.fullName}) like ${`%${word}%`}`
  ),
  sql` or `
)} or lower(trim(coalesce(${intakeLead.additionalNotes}, ''))) like ${`${TEST_NOTES_PREFIX}%`})`

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000

function phoneTail(phone: string) {
  return phone.replace(/\D/g, "").slice(-9)
}

export function leadDuplicateKey(lead: {
  dialysisCenterId: string
  phoneNumber: string
  createdAt: string
}) {
  const mytDay = new Date(Date.parse(lead.createdAt) + MYT_OFFSET_MS)
    .toISOString()
    .slice(0, 10)
  return `${lead.dialysisCenterId}|${phoneTail(lead.phoneNumber)}|${mytDay}`
}

export const leadDuplicateKeySql = sql`${intakeLead.dialysisCenterId} || '|' || substr(replace(replace(replace(replace(replace(${intakeLead.phoneNumber}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), -9) || '|' || date(${intakeLead.createdAt}, '+8 hours')`

export function getLeadQuality(
  lead: {
    createdAt: string
    status: string
    fullName: string
    additionalNotes: string | null
  },
  now = Date.now()
): LeadQuality {
  if (isTestLead(lead)) return "test"
  const createdMs = Date.parse(lead.createdAt)
  if (createdMs < Date.parse(LEAD_FIX_AT)) return "invalid"
  if (lead.status === "new" && now - createdMs > STALE_AFTER_MS) return "stale"
  return "valid"
}
