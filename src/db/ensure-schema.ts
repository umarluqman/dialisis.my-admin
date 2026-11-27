import { client } from "@/db/connection"

let schemaPromise: Promise<void> | null = null

export const ensureAdminDatabaseSchema = () => {
  schemaPromise ??= ensureSchema().catch((error) => {
    schemaPromise = null
    throw error
  })

  return schemaPromise
}

const OPTIONAL_COLUMNS: Record<string, Array<{ name: string; definition: string }>> = {
  invitation: [{ name: "email", definition: "email text" }],
  user: [
    { name: "onboarding_seen_at", definition: "onboarding_seen_at integer" },
    { name: "onboarding_dismissed_at", definition: "onboarding_dismissed_at integer" },
  ],
  DialysisCenter: [
    { name: "whatsappPicName", definition: "whatsappPicName text" },
    { name: "whatsappPicPhoneNumber", definition: "whatsappPicPhoneNumber text" },
    { name: "whatsappPicOptedInAt", definition: "whatsappPicOptedInAt integer" },
    { name: "whatsappTemplateName", definition: "whatsappTemplateName text" },
    { name: "whatsappTemplateLanguageCode", definition: "whatsappTemplateLanguageCode text default 'ms'" },
    { name: "googleMapsEmbed", definition: "googleMapsEmbed text" },
  ],
  IntakeLead: [{ name: "patientType", definition: "patientType text" }],
  sales_prospect: [
    { name: "email", definition: "email text" },
    { name: "contacted_at", definition: "contacted_at integer" },
    { name: "email_subject", definition: "email_subject text" },
    { name: "email_body", definition: "email_body text" },
    { name: "email_subject_bm", definition: "email_subject_bm text" },
    { name: "email_body_bm", definition: "email_body_bm text" },
    { name: "email_lang", definition: "email_lang text not null default 'ms'" },
    { name: "email_image_url", definition: "email_image_url text" },
    { name: "email_image_caption", definition: "email_image_caption text" },
    { name: "email_sent_at", definition: "email_sent_at integer" },
    { name: "email_step", definition: "email_step integer not null default 0" },
  ],
}

async function ensureSchema() {
  // Batch 1: tables & indexes (1 HTTP subrequest to Turso)
  await client.batch(
    [
      `create table if not exists user (
        id text primary key,
        name text not null,
        email text not null unique,
        email_verified integer default 0 not null,
        image text,
        role text default 'pic' not null,
        created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
      )`,
      `create table if not exists session (
        id text primary key,
        expires_at integer not null,
        token text not null unique,
        created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        ip_address text,
        user_agent text,
        user_id text not null,
        foreign key (user_id) references user(id) on delete cascade
      )`,
      "create index if not exists session_userId_idx on session (user_id)",
      `create table if not exists account (
        id text primary key,
        account_id text not null,
        provider_id text not null,
        user_id text not null,
        access_token text,
        refresh_token text,
        id_token text,
        access_token_expires_at integer,
        refresh_token_expires_at integer,
        scope text,
        password text,
        created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        foreign key (user_id) references user(id) on delete cascade
      )`,
      "create index if not exists account_userId_idx on account (user_id)",
      `create table if not exists verification (
        id text primary key,
        identifier text not null,
        value text not null,
        expires_at integer not null,
        created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
      )`,
      "create index if not exists verification_identifier_idx on verification (identifier)",
      `create table if not exists user_center_access (
        id text primary key,
        user_id text not null,
        dialysis_center_id text not null,
        created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        foreign key (user_id) references user(id) on delete cascade,
        foreign key (dialysis_center_id) references DialysisCenter(id) on delete cascade
      )`,
      "create index if not exists userCenterAccess_userId_idx on user_center_access (user_id)",
      "create index if not exists userCenterAccess_dialysisCenterId_idx on user_center_access (dialysis_center_id)",
      `create table if not exists CenterFaq (
        id text primary key not null,
        question text not null,
        answer text not null,
        displayOrder integer default 0 not null,
        isActive integer default 1 not null,
        dialysisCenterId text not null,
        createdAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updatedAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        foreign key (dialysisCenterId) references DialysisCenter(id) on delete cascade
      )`,
      "create index if not exists centerFaq_dialysisCenterId_idx on CenterFaq (dialysisCenterId)",
      "create index if not exists centerFaq_displayOrder_idx on CenterFaq (displayOrder)",
      "create index if not exists centerFaq_isActive_idx on CenterFaq (isActive)",
      `create table if not exists CenterOperatingHour (
        id text primary key not null,
        dayOfWeek integer not null,
        openTime text not null,
        closeTime text not null,
        isClosed integer default 0 not null,
        dialysisCenterId text not null,
        createdAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updatedAt integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        foreign key (dialysisCenterId) references DialysisCenter(id) on delete cascade
      )`,
      "create index if not exists centerOperatingHour_dialysisCenterId_idx on CenterOperatingHour (dialysisCenterId)",
      "create index if not exists centerOperatingHour_dayOfWeek_idx on CenterOperatingHour (dayOfWeek)",
      `create table if not exists invitation (
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
      )`,
      "create unique index if not exists invitation_token_unique on invitation (token)",
      "create index if not exists invitation_token_idx on invitation (token)",
      "create index if not exists invitation_createdBy_idx on invitation (created_by)",
      `create table if not exists IntakeLead (
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
      )`,
      "create unique index if not exists IntakeLead_accessToken_unique on IntakeLead (accessToken)",
      "create index if not exists IntakeLead_dialysisCenterId_idx on IntakeLead (dialysisCenterId)",
      "create index if not exists IntakeLead_createdAt_idx on IntakeLead (createdAt)",
      "create index if not exists IntakeLead_accessToken_idx on IntakeLead (accessToken)",
      `create table if not exists sales_prospect (
        id text primary key not null,
        organization text not null,
        dialysis_center_id text,
        contact_name text,
        phone text,
        stage text default 'lead' not null,
        lost_reason text,
        notes text,
        next_follow_up_at integer,
        demo_at integer,
        pilot_at integer,
        paid_at integer,
        lost_at integer,
        created_by text not null,
        created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
        foreign key (dialysis_center_id) references DialysisCenter(id) on delete set null,
        foreign key (created_by) references user(id)
      )`,
      "create index if not exists salesProspect_stage_idx on sales_prospect (stage)",
      "create index if not exists salesProspect_dialysisCenterId_idx on sales_prospect (dialysis_center_id)",
      `create table if not exists sales_prospect_center (
        prospect_id text not null,
        dialysis_center_id text not null,
        primary key (prospect_id, dialysis_center_id),
        foreign key (prospect_id) references sales_prospect(id) on delete cascade,
        foreign key (dialysis_center_id) references DialysisCenter(id) on delete cascade
      )`,
      "create index if not exists salesProspectCenter_dialysisCenterId_idx on sales_prospect_center (dialysis_center_id)",
      `insert or ignore into sales_prospect_center (prospect_id, dialysis_center_id)
        select id, dialysis_center_id from sales_prospect where dialysis_center_id is not null`,
      "update sales_prospect set dialysis_center_id = null where dialysis_center_id is not null",
    ],
    "write"
  )

  // Batch 2: inspect existing columns for all tables in 1 HTTP subrequest
  const tables = Object.keys(OPTIONAL_COLUMNS)
  const pragmaResults = await client.batch(
    tables.map((t) => `select name from pragma_table_info('${t}')`),
    "read"
  )

  const alters: string[] = []
  tables.forEach((table, idx) => {
    const existing = new Set(pragmaResults[idx].rows.map((row) => String(row.name)))
    for (const col of OPTIONAL_COLUMNS[table]) {
      if (!existing.has(col.name)) {
        alters.push(`alter table ${table} add column ${col.definition}`)
      }
    }
  })

  if (alters.length > 0) {
    for (const sql of alters) {
      try {
        await client.execute(sql)
      } catch (error) {
        if (!(error instanceof Error && error.message.toLowerCase().includes("duplicate column"))) {
          throw error
        }
      }
    }
  }

  // Ensure invitation email index exists after invitation.email column is guaranteed
  await client.execute("create index if not exists invitation_email_idx on invitation (email)")
}
