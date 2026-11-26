export const DEFAULT_ZOHO_FROM_EMAIL = "luqman@dialisis.my"
export const DEFAULT_ZOHO_FROM_NAME = "Umar Luqman"

function getEnvValue(name: string) {
  if (typeof process !== "undefined") {
    return process.env?.[name]?.trim() || undefined
  }
}

export function getZohoMailConfig() {
  const clientId = getEnvValue("ZOHO_CLIENT_ID")
  const clientSecret = getEnvValue("ZOHO_CLIENT_SECRET")
  const refreshToken = getEnvValue("ZOHO_REFRESH_TOKEN")
  const accountId = getEnvValue("ZOHO_ACCOUNT_ID")
  const fromEmail = getEnvValue("ZOHO_FROM_EMAIL") || DEFAULT_ZOHO_FROM_EMAIL
  const fromName = getEnvValue("ZOHO_FROM_NAME") || DEFAULT_ZOHO_FROM_NAME
  const domain = getEnvValue("ZOHO_MAIL_DOMAIN") || "zoho.com"

  return {
    configured: Boolean(clientId && clientSecret && refreshToken && accountId),
    fromEmail,
    fromName,
    accountId,
    domain,
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildOutreachEmailHtml({
  body,
  imageUrl,
  imageCaption,
}: {
  body: string
  imageUrl?: string | null
  imageCaption?: string | null
}) {
  const paragraphs = body
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .filter((p) => p.trim().length > 0)
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;">${escapeHtml(p.trim()).replace(/\r?\n/g, "<br />")}</p>`
    )
    .join("")

  const trimmedImageUrl = imageUrl?.trim()
  const trimmedCaption = imageCaption?.trim()
  const imageBlock = trimmedImageUrl
    ? `<div style="margin:18px 0 6px 0;">` +
      `<img src="${escapeHtml(trimmedImageUrl)}" alt="${escapeHtml(trimmedCaption || "Preview")}" style="max-width:560px;width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;display:block;" />` +
      (trimmedCaption
        ? `<p style="margin:6px 0 0 0;font-size:13px;line-height:1.45;color:#5a6864;">${escapeHtml(trimmedCaption)}</p>`
        : "") +
      `</div>`
    : ""

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a2421;"><div style="max-width:600px;">${paragraphs}${imageBlock}</div></body></html>`
}

export async function sendZohoEmail({
  to,
  subject,
  body,
  imageUrl,
  imageCaption,
}: {
  to: string
  subject: string
  body: string
  imageUrl?: string | null
  imageCaption?: string | null
}): Promise<{ messageId?: string }> {
  const clientId = getEnvValue("ZOHO_CLIENT_ID")
  const clientSecret = getEnvValue("ZOHO_CLIENT_SECRET")
  const refreshToken = getEnvValue("ZOHO_REFRESH_TOKEN")
  const config = getZohoMailConfig()

  if (!config.configured || !clientId || !clientSecret || !refreshToken || !config.accountId) {
    throw new Error(
      "Zoho Mail is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, and ZOHO_ACCOUNT_ID."
    )
  }

  const tokenParams = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const tokenRes = await fetch(`https://accounts.${config.domain}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  })

  const tokenData = (await tokenRes.json().catch(() => null)) as {
    access_token?: string
    error?: string
    error_description?: string
  } | null

  if (!tokenRes.ok || !tokenData?.access_token) {
    const detail = tokenData?.error_description || tokenData?.error || `HTTP ${tokenRes.status}`
    throw new Error(`Zoho OAuth token refresh failed: ${detail}`)
  }

  const html = buildOutreachEmailHtml({ body, imageUrl, imageCaption })

  const sendRes = await fetch(
    `https://mail.${config.domain}/api/accounts/${encodeURIComponent(config.accountId)}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fromAddress: config.fromEmail,
        toAddress: to,
        subject,
        content: html,
        mailFormat: "html",
      }),
    }
  )

  const sendData = (await sendRes.json().catch(() => null)) as {
    data?: { messageId?: string; moreInfo?: string }
    status?: { description?: string }
  } | null

  if (!sendRes.ok) {
    const detail =
      sendData?.data?.moreInfo || sendData?.status?.description || `HTTP ${sendRes.status}`
    throw new Error(`Zoho Mail send failed: ${detail}`)
  }

  return {
    messageId: sendData?.data?.messageId ? String(sendData.data.messageId) : undefined,
  }
}
