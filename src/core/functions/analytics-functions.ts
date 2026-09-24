import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  sql,
  type Column,
} from "drizzle-orm"
import { db } from "@/db/connection"
import {
  centerView,
  contactClick,
  dialysisCenter,
  intakeLead,
  state,
  userCenterAccess,
} from "@/db/schema"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import { getUserRole } from "@/lib/user-role"
import {
  clampRange,
  describeSourcePage,
  getAnalyticsRange,
  toDbDate,
} from "@/lib/analytics"
import {
  CONTACTS_TRACKED_SINCE,
  LEAD_FIX_AT,
  leadDuplicateKeySql,
  STALE_AFTER_MS,
  testLeadSql,
  VIEWS_TRACKED_SINCE,
} from "@/lib/lead-quality"

const PeriodSchema = z.union([z.literal(7), z.literal(30), z.literal(90)])

type AnalyticsMetrics = {
  views: number
  visitors: number
  call: number
  whatsapp: number
  directions: number
  contactVisitors: number
  leads: number
  booked: number
  followUp: number
}

const emptyMetrics = (): AnalyticsMetrics => ({
  views: 0,
  visitors: 0,
  call: 0,
  whatsapp: 0,
  directions: 0,
  contactVisitors: 0,
  leads: 0,
  booked: 0,
  followUp: 0,
})

function addMetrics(
  target: AnalyticsMetrics,
  source: Partial<AnalyticsMetrics>
) {
  for (const key of Object.keys(source) as (keyof AnalyticsMetrics)[]) {
    target[key] += source[key] ?? 0
  }
}

async function getCenterScope(userId: string, centerId?: string) {
  const role = await getUserRole(userId)

  if (centerId) {
    if (role !== "superadmin") {
      const [access] = await db
        .select({ id: userCenterAccess.id })
        .from(userCenterAccess)
        .where(
          and(
            eq(userCenterAccess.userId, userId),
            eq(userCenterAccess.dialysisCenterId, centerId)
          )
        )
        .limit(1)

      if (!access) {
        throw new Error("Access denied")
      }
    }

    return { role, filter: (column: Column) => eq(column, centerId) }
  }

  const centerIds =
    role === "superadmin"
      ? db.select({ id: dialysisCenter.id }).from(dialysisCenter)
      : db
          .select({ id: userCenterAccess.dialysisCenterId })
          .from(userCenterAccess)
          .where(eq(userCenterAccess.userId, userId))

  return { role, filter: (column: Column) => inArray(column, centerIds) }
}

const mytDay = (column: Column) => sql<string>`date(${column}, '+8 hours')`
const total = (expression: ReturnType<typeof sql>) =>
  sql<number>`coalesce(sum(${expression}), 0)`.mapWith(Number)

const viewFields = {
  views: total(sql`${centerView.count}`),
  visitors: count(),
}

const contactFields = {
  call: total(sql`${contactClick.kind} = 'call'`),
  whatsapp: total(sql`${contactClick.kind} = 'whatsapp'`),
  directions: total(sql`${contactClick.kind} = 'directions'`),
}

function getLeadQuery(since: string) {
  const stale = sql`status = 'new' and ${intakeLead.createdAt} < ${toDbDate(Date.now() - STALE_AFTER_MS)}`
  const uniqueLeads = (condition: ReturnType<typeof sql>) =>
    sql<number>`count(distinct case when ${condition} then ${leadDuplicateKeySql} end)`.mapWith(
      Number
    )

  return {
    fields: {
      leads: uniqueLeads(sql`not (${stale})`),
      booked: uniqueLeads(sql`status = 'booked'`),
      followUp: uniqueLeads(stale),
    },
    where: sql`${intakeLead.createdAt} >= ${since} and not ${testLeadSql}`,
  }
}

function getTrackedRanges(period: z.infer<typeof PeriodSchema>) {
  const range = getAnalyticsRange(period)
  return {
    range,
    views: clampRange(range, VIEWS_TRACKED_SINCE),
    contacts: clampRange(range, CONTACTS_TRACKED_SINCE),
    leads: clampRange(range, LEAD_FIX_AT),
  }
}

export const getAnalyticsOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ period: PeriodSchema, centerId: z.string().min(1).optional() })
  )
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const scope = await getCenterScope(context.session.user.id, data.centerId)
    const { range, views: viewRange, contacts: contactRange, leads: leadRange } =
      getTrackedRanges(data.period)
    const leadQuery = getLeadQuery(leadRange.previousSince)
    const viewDay = mytDay(centerView.createdAt)
    const contactDay = mytDay(contactClick.createdAt)
    const leadDay = mytDay(intakeLead.createdAt)

    const [views, contacts, leads, sourceRows] = await Promise.all([
      db
        .select({ day: viewDay, ...viewFields })
        .from(centerView)
        .where(
          and(
            scope.filter(centerView.dialysisCenterId),
            gte(centerView.createdAt, viewRange.previousSince)
          )
        )
        .groupBy(viewDay),
      db
        .select({
          day: contactDay,
          ...contactFields,
          contactVisitors: sql<number>`count(distinct ${contactClick.dialysisCenterId} || '|' || ${contactClick.visitorKey})`.mapWith(
            Number
          ),
        })
        .from(contactClick)
        .where(
          and(
            scope.filter(contactClick.dialysisCenterId),
            gte(contactClick.createdAt, contactRange.previousSince)
          )
        )
        .groupBy(contactDay),
      db
        .select({ day: leadDay, ...leadQuery.fields })
        .from(intakeLead)
        .where(and(scope.filter(intakeLead.dialysisCenterId), leadQuery.where))
        .groupBy(leadDay),
      db
        .select({ path: contactClick.sourcePage, value: count() })
        .from(contactClick)
        .where(
          and(
            scope.filter(contactClick.dialysisCenterId),
            gte(contactClick.createdAt, contactRange.since),
            isNotNull(contactClick.sourcePage)
          )
        )
        .groupBy(contactClick.sourcePage),
    ])

    const current = emptyMetrics()
    const previous = emptyMetrics()
    const byDay = new Map(range.days.map((day) => [day, emptyMetrics()]))

    for (const { day, ...metrics } of [...views, ...contacts, ...leads]) {
      addMetrics(day >= range.startDay ? current : previous, metrics)
      const dayMetrics = byDay.get(day)
      if (dayMetrics) addMetrics(dayMetrics, metrics)
    }

    const slugCandidates = sourceRows
      .map((row) => row.path!.slice(1))
      .filter((slug) => slug && !slug.includes("/"))
    const centerSlugs = new Set(
      slugCandidates.length > 0
        ? (
            await db
              .select({ slug: dialysisCenter.slug })
              .from(dialysisCenter)
              .where(inArray(dialysisCenter.slug, slugCandidates))
          ).map((row) => row.slug)
        : []
    )

    const sources = new Map<
      string,
      { label: string; sub?: string; value: number }
    >()
    for (const row of sourceRows) {
      const source = describeSourcePage(row.path!, centerSlugs)
      const key = `${source.label}|${source.sub ?? ""}`
      const group = sources.get(key) ?? { ...source, value: 0 }
      group.value += row.value
      sources.set(key, group)
    }

    return {
      startDay: contactRange.startDay,
      endDay: range.days[range.days.length - 1],
      trackedSince: {
        views: VIEWS_TRACKED_SINCE,
        contacts: CONTACTS_TRACKED_SINCE,
      },
      comparable: {
        views: viewRange.comparable,
        contacts: contactRange.comparable,
        leads: leadRange.comparable,
      },
      hasData: views.length + contacts.length + leads.length > 0,
      current,
      previous,
      daily: range.days.map((day) => {
        const metrics = byDay.get(day)!
        return {
          day,
          views: day >= viewRange.startDay ? metrics.views : null,
          contacts:
            day >= contactRange.startDay
              ? metrics.call + metrics.whatsapp + metrics.directions
              : null,
        }
      }),
      sources: Array.from(sources.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    }
  })

export const getAnalyticsBranches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ period: PeriodSchema }))
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const userId = context.session.user.id
    const scope = await getCenterScope(userId)
    const ranges = getTrackedRanges(data.period)
    const leadQuery = getLeadQuery(ranges.leads.since)

    const [centers, views, contacts, leads] = await Promise.all([
      db
        .select({
          id: dialysisCenter.id,
          slug: dialysisCenter.slug,
          name: dialysisCenter.dialysisCenterName,
          town: dialysisCenter.town,
          state: state.name,
        })
        .from(dialysisCenter)
        .leftJoin(state, eq(dialysisCenter.stateId, state.id))
        .where(scope.filter(dialysisCenter.id))
        .orderBy(dialysisCenter.dialysisCenterName),
      db
        .select({ centerId: centerView.dialysisCenterId, ...viewFields })
        .from(centerView)
        .where(
          and(
            scope.filter(centerView.dialysisCenterId),
            gte(centerView.createdAt, ranges.views.since)
          )
        )
        .groupBy(centerView.dialysisCenterId),
      db
        .select({
          centerId: contactClick.dialysisCenterId,
          ...contactFields,
          contactVisitors: sql<number>`count(distinct ${contactClick.visitorKey})`.mapWith(
            Number
          ),
        })
        .from(contactClick)
        .where(
          and(
            scope.filter(contactClick.dialysisCenterId),
            gte(contactClick.createdAt, ranges.contacts.since)
          )
        )
        .groupBy(contactClick.dialysisCenterId),
      db
        .select({ centerId: intakeLead.dialysisCenterId, ...leadQuery.fields })
        .from(intakeLead)
        .where(and(scope.filter(intakeLead.dialysisCenterId), leadQuery.where))
        .groupBy(intakeLead.dialysisCenterId),
    ])

    const byCenter = new Map(
      centers.map((center) => [center.id, emptyMetrics()])
    )
    for (const { centerId, ...metrics } of [...views, ...contacts, ...leads]) {
      const target = byCenter.get(centerId)
      if (target) addMetrics(target, metrics)
    }

    return centers.map((center) => {
      const metrics = byCenter.get(center.id)!
      return {
        ...center,
        state: center.state ?? "",
        views: metrics.views,
        visitors: metrics.visitors,
        contacts: metrics.call + metrics.whatsapp + metrics.directions,
        contactVisitors: metrics.contactVisitors,
        leads: metrics.leads,
      }
    })
  })

export type AnalyticsBranch = Awaited<
  ReturnType<typeof getAnalyticsBranches>
>[number]
