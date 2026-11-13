import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ChevronRight, Circle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOnboarding } from "@/core/functions/onboarding-functions"
import { defineCopy, useCopy } from "@/lib/i18n"
import { onboardingSteps, type OnboardingStep } from "@/lib/onboarding"
import { centersQuery, onboardingQuery } from "./queries"

const STEP_FIELD: Record<OnboardingStep, string> = {
  profile: "description",
  verified: "verified",
  whatsapp: "whatsappPicName",
}

const COPY = defineCopy({
  en: {
    slides: [
      {
        title: "Welcome to DialisisMY Admin",
        body: "Families use dialisis.my to find a dialysis centre for someone they love. Here you keep your centre's listing accurate and see how many people view and contact it.",
      },
      {
        title: "Make your listing complete",
        body: "Add a description, phone, address, treatment units and photos. Then mark the centre verified so families see the Verified badge.",
      },
      {
        title: "Be reachable on WhatsApp",
        body: "Add the PIC name and WhatsApp number so patients can reach the right person about appointments.",
      },
    ],
    skip: "Skip",
    next: "Next",
    start: "Get started",
    title: "Get your centre ready",
    description: "Families trust complete, verified listings.",
    progress: (done: number, total: number) => `${done}/${total}`,
    steps: {
      profile: "Complete the centre profile",
      verified: "Mark the centre verified",
      whatsapp: "Add the PIC WhatsApp number",
    } satisfies Record<OnboardingStep, string>,
    hints: {
      profile: "Description, phone, address, units and a photo",
      verified: "Shows the Verified badge on your listing",
      whatsapp: "So patients reach the right person",
    } satisfies Record<OnboardingStep, string>,
    dismiss: "Hide",
  },
  ms: {
    slides: [
      {
        title: "Selamat datang ke DialisisMY Admin",
        body: "Keluarga menggunakan dialisis.my untuk mencari pusat dialisis bagi insan tersayang. Di sini anda memastikan maklumat pusat anda tepat dan melihat berapa ramai yang melihat dan menghubunginya.",
      },
      {
        title: "Lengkapkan maklumat pusat",
        body: "Tambah penerangan, telefon, alamat, unit rawatan dan gambar. Kemudian tandakan pusat sebagai disahkan supaya keluarga melihat lencana Disahkan.",
      },
      {
        title: "Mudah dihubungi melalui WhatsApp",
        body: "Tambah nama dan nombor WhatsApp PIC supaya pesakit dapat menghubungi orang yang betul tentang temujanji.",
      },
    ],
    skip: "Langkau",
    next: "Seterusnya",
    start: "Mula",
    title: "Sediakan pusat anda",
    description: "Keluarga mempercayai maklumat yang lengkap dan disahkan.",
    progress: (done: number, total: number) => `${done}/${total}`,
    steps: {
      profile: "Lengkapkan profil pusat",
      verified: "Tandakan pusat sebagai disahkan",
      whatsapp: "Tambah nombor WhatsApp PIC",
    },
    hints: {
      profile: "Penerangan, telefon, alamat, unit dan gambar",
      verified: "Paparkan lencana Disahkan di laman anda",
      whatsapp: "Supaya pesakit menghubungi orang yang betul",
    },
    dismiss: "Sembunyi",
  },
})

function useMarkOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (field: "seen" | "dismissed") => updateOnboarding({ data: { field } }),
    onMutate: (field) =>
      queryClient.setQueryData(onboardingQuery.queryKey, (old) => old && { ...old, [field]: true }),
  })
}

export function PicOnboarding() {
  const t = useCopy(COPY)
  const { data: onboarding } = useQuery(onboardingQuery)
  const { data: centers } = useQuery(centersQuery)
  const mark = useMarkOnboarding()
  const [slide, setSlide] = useState(0)

  if (!onboarding || !centers?.length) return null

  const steps = onboardingSteps(centers)
  const doneCount = steps.filter((s) => s.done).length
  const lastSlide = slide === t.slides.length - 1

  return (
    <>
      <AlertDialog open={!onboarding.seen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.slides[slide].title}</AlertDialogTitle>
            <AlertDialogDescription>{t.slides[slide].body}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center gap-1.5" aria-hidden>
            {t.slides.map((s, i) => (
              <span
                key={s.title}
                className={`size-1.5 rounded-full ${i === slide ? "bg-primary" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <AlertDialogFooter>
            {!lastSlide && (
              <Button variant="ghost" onClick={() => mark.mutate("seen")}>
                {t.skip}
              </Button>
            )}
            <Button
              onClick={() => (lastSlide ? mark.mutate("seen") : setSlide(slide + 1))}
            >
              {lastSlide ? t.start : t.next}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!onboarding.dismissed && doneCount < steps.length && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>
              {t.title}{" "}
              <span className="text-muted-foreground tabular-nums">
                {t.progress(doneCount, steps.length)}
              </span>
            </CardTitle>
            <CardDescription>{t.description}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => mark.mutate("dismissed")}>
                {t.dismiss}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {steps.map(({ step, done, centerId }) => (
                <li key={step}>
                  <Link
                    to="/centers/$centerId"
                    params={{ centerId }}
                    hash={STEP_FIELD[step]}
                    className="flex items-center gap-3 py-2.5 hover:text-primary"
                  >
                    {done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
                        {t.steps[step]}
                      </span>
                      <span className="block text-xs text-muted-foreground">{t.hints[step]}</span>
                    </span>
                    {!done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
