export type Highlight = { title: string; description: string }

// Titles must stay in sync with HIGHLIGHT_ICONS in dialisis.my enhanced-center-details.tsx.
export const HIGHLIGHT_PRESETS: Highlight[] = [
  {
    title: "Rawatan hemodialisis berkualiti",
    description:
      "Rawatan dialisis berkualiti tinggi dengan mesin moden dan kakitangan yang terlatih.",
  },
  {
    title: "Pasukan rawatan berpengalaman & mesra",
    description:
      "Doktor dan jururawat yang berpengalaman, mesra dan sentiasa memantau pesakit sepanjang rawatan.",
  },
  {
    title: "Mudah diakses dengan kemudahan parkir",
    description:
      "Lokasi strategik dengan tempat letak kereta yang mencukupi untuk pesakit dan keluarga.",
  },
  {
    title: "Ruang rawatan bersih dan berhawa dingin",
    description:
      "Ruang rawatan yang bersih, selesa dan berhawa dingin sepanjang sesi dialisis.",
  },
  {
    title: "Dialyzer guna sekali 100%",
    description:
      "Dialyzer baharu digunakan bagi setiap sesi rawatan, tanpa guna semula, untuk mengurangkan risiko jangkitan.",
  },
  {
    title: "Panel PERKESO",
    description:
      "Pusat panel PERKESO. Pesakit yang layak boleh mendapatkan rawatan dengan tajaan PERKESO.",
  },
  {
    title: "Ruang khas pesakit hepatitis",
    description:
      "Ruang rawatan berasingan untuk pesakit hepatitis bagi mengelakkan jangkitan silang.",
  },
  {
    title: "Buka hujung minggu & cuti umum",
    description:
      "Sesi rawatan turut disediakan pada hujung minggu dan cuti umum supaya jadual dialisis tidak terganggu.",
  },
  {
    title: "Terima pesakit pelawat & percutian",
    description:
      "Menerima pesakit dari luar kawasan yang memerlukan dialisis sementara semasa bercuti atau melawat keluarga.",
  },
  {
    title: "Mesra kerusi roda",
    description:
      "Laluan masuk dan ruang rawatan mudah diakses dengan kerusi roda untuk warga emas dan OKU.",
  },
]

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export const isPresetHighlight = (title: string) =>
  HIGHLIGHT_PRESETS.some((preset) => sameTitle(preset.title, title))

export function parseHighlights(value: string | null | undefined): Highlight[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":")
      if (separatorIndex === -1) return { title: line, description: "" }
      return {
        title: line.slice(0, separatorIndex).trim(),
        description: line.slice(separatorIndex + 1).trim(),
      }
    })
}

// Presets first in canonical order, then custom ones; one "Title: description" per line.
export function serializeHighlights(items: Highlight[]) {
  const presets = HIGHLIGHT_PRESETS.flatMap(
    (preset) => items.find((item) => sameTitle(item.title, preset.title)) ?? []
  )
  const custom = items.filter((item) => !isPresetHighlight(item.title))
  return [...presets, ...custom]
    .map((item) => ({
      title: item.title.replace(/:/g, " ").replace(/\s+/g, " ").trim(),
      description: item.description.replace(/\s+/g, " ").trim(),
    }))
    .filter((item) => item.title)
    .map((item) => (item.description ? `${item.title}: ${item.description}` : item.title))
    .join("\n")
}

export function findHighlight(items: Highlight[], title: string) {
  return items.find((item) => sameTitle(item.title, title))
}
