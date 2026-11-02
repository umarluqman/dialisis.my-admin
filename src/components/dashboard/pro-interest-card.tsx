import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { defineCopy, useCopy } from "@/lib/i18n"
import { proInterestQuery } from "./queries"

const COPY = defineCopy({
  en: {
    title: "Pro interest",
    description: "Upgrade clicks from PICs and “I'm interested” taps on the site.",
    center: "Centre",
    clicks: "Clicks",
    interested: "Interested",
    anonymous: (n: number) => `${n} interested from site visitors without a centre`,
    empty: "No interest yet.",
    contacts: "Form submissions",
  },
  ms: {
    title: "Minat Pro",
    description: "Klik naik taraf oleh PIC dan tekan “Saya berminat” di laman.",
    center: "Pusat",
    clicks: "Klik",
    interested: "Berminat",
    anonymous: (n: number) => `${n} berminat daripada pelawat laman tanpa pusat`,
    empty: "Belum ada minat.",
    contacts: "Borang dihantar",
  },
})

export function ProInterestCard() {
  const t = useCopy(COPY)
  const { data } = useQuery(proInterestQuery)
  if (!data) return null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.centers.length === 0 && data.anonymousInterested === 0 && data.contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        )}
        {data.centers.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">{t.center}</th>
                <th className="py-1 text-right font-medium">{t.clicks}</th>
                <th className="py-1 text-right font-medium">{t.interested}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.centers.map((center) => (
                <tr key={center.id} className="border-t">
                  <td className="py-1.5 pr-2">{center.name}</td>
                  <td className="py-1.5 text-right">{center.clicks}</td>
                  <td className="py-1.5 text-right">{center.interested}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data.contacts.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">{t.contacts}</p>
            <ul className="divide-y text-sm">
              {data.contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                  <span>
                    {c.name} · {c.title}
                    {c.centerName && <span className="text-muted-foreground"> · {c.centerName}</span>}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    <a href={`https://wa.me/${c.phone?.replace(/\D/g, "").replace(/^0/, "60")}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                      {c.phone}
                    </a>{" "}
                    · {c.plan === "bandar" ? `Pilihan Bandar${c.townName ? ` (${c.townName})` : ""}` : "Pro"} · {c.createdAt.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.anonymousInterested > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {t.anonymous(data.anonymousInterested)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
