import { client } from "@/db/connection"

let schemaPromise: Promise<void> | null = null

const getColumnNames = async (tableName: string) => {
  const result = await client.execute(`select name from pragma_table_info('${tableName}')`)
  return new Set(result.rows.map((row) => String(row.name)))
}

const addColumnIfMissing = async (
  tableName: string,
  columnName: string,
  definition: string
) => {
  const columns = await getColumnNames(tableName)
  if (columns.has(columnName)) return

  try {
    await client.execute(`alter table ${tableName} add column ${definition}`)
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("duplicate column")) {
      return
    }

    throw error
  }
}

export const ensureAdminDatabaseSchema = () => {
  schemaPromise ??= ensureSchema().catch((error) => {
    schemaPromise = null
    throw error
  })

  return schemaPromise
}

async function ensureSchema() {
  await client.execute(`
    create table if not exists CenterFaq (
      id text primary key not null,
      question text not null,
      answer text not null,
      displayOrder integer default 0 not null,
      isActive integer default 1 not null,
      dialysisCenterId text not null,
      createdAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updatedAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      foreign key (dialysisCenterId) references DialysisCenter(id) on delete cascade
    )
  `)
  await client.execute("create index if not exists centerFaq_dialysisCenterId_idx on CenterFaq (dialysisCenterId)")
  await client.execute("create index if not exists centerFaq_displayOrder_idx on CenterFaq (displayOrder)")
  await client.execute("create index if not exists centerFaq_isActive_idx on CenterFaq (isActive)")

  await client.execute(`
    create table if not exists CenterOperatingHour (
      id text primary key not null,
      dayOfWeek integer not null,
      openTime text not null,
      closeTime text not null,
      isClosed integer default 0 not null,
      dialysisCenterId text not null,
      createdAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updatedAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      foreign key (dialysisCenterId) references DialysisCenter(id) on delete cascade
    )
  `)
  await client.execute("create index if not exists centerOperatingHour_dialysisCenterId_idx on CenterOperatingHour (dialysisCenterId)")
  await client.execute("create index if not exists centerOperatingHour_dayOfWeek_idx on CenterOperatingHour (dayOfWeek)")

  await client.execute(`
    create table if not exists invitation (
      id text primary key not null,
      token text not null,
      center_ids text not null,
      expires_at integer not null,
      used integer default 0 not null,
      used_by text,
      created_by text not null,
      created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      foreign key (used_by) references user(id),
      foreign key (created_by) references user(id)
    )
  `)
  await client.execute("create unique index if not exists invitation_token_unique on invitation (token)")
  await client.execute("create index if not exists invitation_token_idx on invitation (token)")
  await client.execute("create index if not exists invitation_createdBy_idx on invitation (created_by)")
  await addColumnIfMissing("invitation", "email", "email text")
  await client.execute("create index if not exists invitation_email_idx on invitation (email)")

  await addColumnIfMissing("DialysisCenter", "whatsappPicName", "whatsappPicName text")
  await addColumnIfMissing("DialysisCenter", "whatsappPicPhoneNumber", "whatsappPicPhoneNumber text")
  await addColumnIfMissing("DialysisCenter", "whatsappPicOptedInAt", "whatsappPicOptedInAt integer")
  await addColumnIfMissing("DialysisCenter", "whatsappTemplateName", "whatsappTemplateName text")
  await addColumnIfMissing(
    "DialysisCenter",
    "whatsappTemplateLanguageCode",
    "whatsappTemplateLanguageCode text default 'ms'"
  )

  await client.execute(`
    create table if not exists IntakeLead (
      id text primary key not null,
      dialysisCenterId text not null,
      fullName text not null,
      myKadNumber text not null,
      homeAddress text not null,
      preferredDate integer not null,
      preferredSession text not null,
      phoneNumber text not null,
      labResultUrl text,
      labResultS3Key text,
      labResultOriginalName text,
      additionalNotes text,
      consentAt integer not null,
      ipAddress text,
      userAgent text,
      whatsappHandoffUrl text not null,
      picNotificationStatus text default 'pending' not null,
      picNotificationMessageId text,
      picNotificationError text,
      accessToken text not null,
      accessExpiresAt integer not null,
      viewedAt integer,
      createdAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updatedAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      foreign key (dialysisCenterId) references DialysisCenter(id) on delete cascade
    )
  `)
  await client.execute("create unique index if not exists IntakeLead_accessToken_unique on IntakeLead (accessToken)")
  await client.execute("create index if not exists IntakeLead_dialysisCenterId_idx on IntakeLead (dialysisCenterId)")
  await client.execute("create index if not exists IntakeLead_createdAt_idx on IntakeLead (createdAt)")
  await client.execute("create index if not exists IntakeLead_accessToken_idx on IntakeLead (accessToken)")
}
