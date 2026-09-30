import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  isNotNull,
  sql,
  type Column,
  type SQL,
} from "drizzle-orm"
import { db } from "@/db/connection"
import {
  centerView,
  contactClick,
  dialysisCenter,
  featuredEvent,
  featuredSlot,
  intakeLead,
  locationView,
  state,
} from "@/db/schema"
import { ensureAdminDatabaseSchema } from "@/db/ensure-schema"
import { authMiddleware } from "@/lib/middleware"
import { getAccess } from "@/lib/access"
import { requireSuperadmin } from "@/lib/center-admin"
import { isCenterInTown, townForCenter } from "@/lib/cities"
import {
  clampRange,
  CONTACT_KINDS,
  describeSourcePage,
  getAnalyticsRange,
  isValidRange,
  SOURCE_KEYS,
  toDbDate,
  type AnalyticsRange,
  type SourceKey,
} from "@/lib/analytics"
import {
  CONTACTS_TRACKED_SINCE,
  LEAD_FIX_AT,
  leadDuplicateKeySql,
  STALE_AFTER_MS,
  testLeadSql,
  VIEWS_TRACKED_SINCE,
} from "@/lib/lead-quality"

const rangeFields = { from: z.string(), to: z.string() }
const contactFilterFields = {
  contact: z.enum(CONTACT_KINDS).optional(),
  source: z.enum(SOURCE_KEYS).optional(),
}
const withValidRange = <T extends AnalyticsRange>(schema: z.ZodType<T>) =>
  schema.refine(isValidRange, "Invalid date range")

type ContactFilter = {
  contact?: (typeof CONTACT_KINDS)[number]
  source?: SourceKey
}
type LocationFilter = { state?: string; town?: string }

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

async function getCenterScope(
  userId: string,
  centerId?: string,
  location: LocationFilter = {}
) {
  const { role, centerIds } = await getAccess(userId)

  if (centerId) {
    if (centerIds && !centerIds.includes(centerId)) {
      throw new Error("Access denied")
    }

    return { role, filter: (column: Column) => eq(column, centerId) }
  }

  const scopedIds = db
    .select({ id: dialysisCenter.id })
    .from(dialysisCenter)
    .where(
      and(
        centerIds ? inArray(dialysisCenter.id, centerIds) : undefined,
        location.state
          ? inArray(
              dialysisCenter.stateId,
              db.select({ id: state.id }).from(state).where(eq(state.name, location.state))
            )
          : undefined,
        location.town ? eq(dialysisCenter.town, location.town) : undefined
      )
    )

  return { role, filter: (column: Column) => inArray(column, scopedIds) }
}

const mytDay = (column: Column) => sql<string>`date(${column}, '+8 hours')`
const total = (expression: ReturnType<typeof sql>) =>
  sql<number>`coalesce(sum(${expression}), 0)`.mapWith(Number)

const viewFields = {
  views: total(sql`${centerView.count}`),
  visitors: count(),
}

const featuredFields = {
  impressions: total(sql`${featuredEvent.kind} = 'impression'`),
  clicks: total(sql`${featuredEvent.kind} = 'click'`),
}

const contactFields = {
  call: total(sql`${contactClick.kind} = 'call'`),
  whatsapp: total(sql`${contactClick.kind} = 'whatsapp'`),
  directions: total(sql`${contactClick.kind} = 'directions'`),
}

function sourceSql(source: SourceKey) {
  const page = contactClick.sourcePage
  const known: Record<Exclude<SourceKey, "other">, SQL> = {
    home: sql`${page} = '/'`,
    map: sql`${page} = '/peta'`,
    center: sql`${page} <> '/' and substr(${page}, 2) in (select ${dialysisCenter.slug} from ${dialysisCenter})`,
    chain: sql`${page} like '/rangkaian%'`,
    location: sql`${page} like '/lokasi%'`,
  }
  if (source !== "other") return known[source]
  return sql`${page} is not null and not (${sql.join(
    Object.values(known).map((condition) => sql`(${condition})`),
    sql` or `
  )})`
}

function contactFilterSql({ contact, source }: ContactFilter) {
  return and(
    contact ? eq(contactClick.kind, contact) : undefined,
    source ? sourceSql(source) : undefined
  )
}

function getLeadQuery(since: string, until: string) {
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
    where: sql`${intakeLead.createdAt} >= ${since} and ${intakeLead.createdAt} < ${until} and not ${testLeadSql}`,
  }
}

function getTrackedRanges(input: AnalyticsRange) {
  const range = getAnalyticsRange(input)
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
    withValidRange(
      z.object({
        ...rangeFields,
        ...contactFilterFields,
        centerId: z.string().min(1).optional(),
        state: z.string().min(1).optional(),
        town: z.string().min(1).optional(),
      })
    )
  )
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const scope = await getCenterScope(context.session.user.id, data.centerId, data)
    const { range, views: viewRange, contacts: contactRange, leads: leadRange } =
      getTrackedRanges(data)
    const leadQuery = getLeadQuery(leadRange.previousSince, range.until)
    const contactFilter = contactFilterSql(data)
    const viewDay = mytDay(centerView.createdAt)
    const contactDay = mytDay(contactClick.createdAt)
    const leadDay = mytDay(intakeLead.createdAt)

    const [views, contacts, leads, sourceRows, [featured]] = await Promise.all([
      db
        .select({ day: viewDay, ...viewFields })
        .from(centerView)
        .where(
          and(
            scope.filter(centerView.dialysisCenterId),
            gte(centerView.createdAt, viewRange.previousSince),
            lt(centerView.createdAt, range.until)
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
            gte(contactClick.createdAt, contactRange.previousSince),
            lt(contactClick.createdAt, range.until),
            contactFilter
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
            lt(contactClick.createdAt, range.until),
            isNotNull(contactClick.sourcePage),
            contactFilter
          )
        )
        .groupBy(contactClick.sourcePage),
      db
        .select(featuredFields)
        .from(featuredEvent)
        .where(
          and(
            scope.filter(featuredEvent.dialysisCenterId),
            gte(featuredEvent.createdAt, range.since),
            lt(featuredEvent.createdAt, range.until)
          )
        ),
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
      { key: SourceKey; sub?: string; value: number }
    >()
    for (const row of sourceRows) {
      const source = describeSourcePage(row.path!, centerSlugs)
      const id = `${source.key}|${source.sub ?? ""}`
      const group = sources.get(id) ?? { ...source, value: 0 }
      group.value += row.value
      sources.set(id, group)
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
        const viewsTracked = day >= viewRange.startDay
        const contactsTracked = day >= contactRange.startDay
        return {
          day,
          views: viewsTracked ? metrics.views : null,
          visitors: viewsTracked ? metrics.visitors : null,
          whatsapp: contactsTracked ? metrics.whatsapp : null,
          call: contactsTracked ? metrics.call : null,
          directions: contactsTracked ? metrics.directions : null,
          leads: day >= leadRange.startDay ? metrics.leads : null,
        }
      }),
      sources: Array.from(sources.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      featured,
    }
  })

function inTownSql(town: string) {
  const pattern = `%${town}%`
  return sql`(${dialysisCenter.town} like ${pattern} or ${dialysisCenter.address} like ${pattern} or ${dialysisCenter.addressWithUnit} like ${pattern})`
}

export const getTownComparison = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    withValidRange(z.object({ ...rangeFields, centerId: z.string().min(1) }))
  )
  .handler(async ({ context, data }) => {
    await getCenterScope(context.session.user.id, data.centerId)
    const { range, views: viewRange } = getTrackedRanges(data)

    const [center] = await db
      .select({
        stateId: dialysisCenter.stateId,
        stateName: state.name,
        town: dialysisCenter.town,
        address: dialysisCenter.address,
        addressWithUnit: dialysisCenter.addressWithUnit,
      })
      .from(dialysisCenter)
      .leftJoin(state, eq(dialysisCenter.stateId, state.id))
      .where(eq(dialysisCenter.id, data.centerId))
      .limit(1)

    const town = center && townForCenter(center, center.stateName ?? "")
    if (!town) return null

    const inTown = and(eq(dialysisCenter.stateId, center.stateId), inTownSql(town))

    const [[{ centers }], rows] = await Promise.all([
      db.select({ centers: count() }).from(dialysisCenter).where(inTown),
      db
        .select({ centerId: centerView.dialysisCenterId, views: viewFields.views })
        .from(centerView)
        .innerJoin(dialysisCenter, eq(centerView.dialysisCenterId, dialysisCenter.id))
        .where(
          and(
            inTown,
            gte(centerView.createdAt, viewRange.since),
            lt(centerView.createdAt, range.until)
          )
        )
        .groupBy(centerView.dialysisCenterId),
    ])

    if (centers < 2) return null

    const townViews = rows.reduce((sum, row) => sum + row.views, 0)
    return {
      town,
      centers,
      views: rows.find((row) => row.centerId === data.centerId)?.views ?? 0,
      townAverage: townViews / centers,
    }
  })

export const getLocationDemand = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(withValidRange(z.object(rangeFields)))
  .handler(async ({ context, data }) => {
    await requireSuperadmin(context.session.user.id)
    const { since, until } = getAnalyticsRange(data)
    const now = toDbDate(Date.now())

    const [views, centers, slots] = await Promise.all([
      db
        .select({
          stateId: locationView.stateId,
          stateName: state.name,
          town: locationView.town,
          views: total(sql`${locationView.count}`),
          visitors: count(),
        })
        .from(locationView)
        .innerJoin(state, eq(locationView.stateId, state.id))
        .where(and(gte(locationView.createdAt, since), lt(locationView.createdAt, until)))
        .groupBy(locationView.stateId, locationView.town),
      db
        .select({
          stateId: dialysisCenter.stateId,
          town: dialysisCenter.town,
          address: dialysisCenter.address,
          addressWithUnit: dialysisCenter.addressWithUnit,
        })
        .from(dialysisCenter),
      db
        .select({ stateId: featuredSlot.stateId, town: featuredSlot.town })
        .from(featuredSlot)
        .where(and(lte(featuredSlot.startsAt, now), gt(featuredSlot.endsAt, now))),
    ])

    const slotKey = (stateId: string, town: string) => `${stateId}|${town.toLowerCase()}`
    const takenSlots = new Set(slots.map((slot) => slotKey(slot.stateId, slot.town)))

    return views
      .map((row) => ({
        ...row,
        centers: centers.filter(
          (center) =>
            center.stateId === row.stateId && (!row.town || isCenterInTown(center, row.town))
        ).length,
        slotTaken: takenSlots.has(slotKey(row.stateId, row.town)),
      }))
      .sort((a, b) => b.views - a.views)
  })

export type LocationDemandRow = Awaited<
  ReturnType<typeof getLocationDemand>
>[number]

export const getAnalyticsBranches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    withValidRange(z.object({ ...rangeFields, ...contactFilterFields }))
  )
  .handler(async ({ context, data }) => {
    await ensureAdminDatabaseSchema()

    const userId = context.session.user.id
    const scope = await getCenterScope(userId)
    const ranges = getTrackedRanges(data)
    const { until } = ranges.range
    const leadQuery = getLeadQuery(ranges.leads.since, until)

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
            gte(centerView.createdAt, ranges.views.since),
            lt(centerView.createdAt, until)
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
            gte(contactClick.createdAt, ranges.contacts.since),
            lt(contactClick.createdAt, until),
            contactFilterSql(data)
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
