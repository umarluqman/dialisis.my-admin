import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createFeaturedSlot,
  endFeaturedSlot,
  type CompanyRow,
  type FeaturedSlotRow,
} from "@/core/functions/featured-slot-functions"
import { getStates } from "@/core/functions/center-functions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toMytDay } from "@/lib/analytics"
import { citiesForState, isCenterInTown } from "@/lib/cities"
import { addYear, endOfMytDay, startOfMytDay, toMytDayInput } from "@/lib/plan"
import { defineCopy, useCopy } from "@/lib/i18n"
import { centersQuery, companiesQuery, featuredSlotsQuery } from "./queries"

const ALL = "all"

type SlotStatus = "active" | "upcoming" | "expired"

const COPY = defineCopy({
  en: {
    loading: "Loading slots...",
    groupTitles: {
      active: "Active",
      upcoming: "Upcoming",
      expired: "Expired",
    } satisfies Record<SlotStatus, string>,
    empty: (group: string) => `No ${group} slots.`,
    cancelled: "Slot cancelled",
    ended: "Slot ended",
    endFailed: "Failed to end slot",
    brand: "Brand",
    allBrands: "All brands",
    state: "State",
    town: "Town",
    cancel: "Cancel",
    endNow: "End now",
    cancelTitle: "Cancel this slot?",
    endTitle: "End this slot now?",
    endDescription: (center: string, place: string | null) =>
      `${center} stops being featured in ${place}. Their Pro plan is not changed.`,
    keep: "Keep",
    cancelSlot: "Cancel slot",
    endSlot: "End slot",
    created: "Featured slot created",
    createFailed: "Failed to create slot",
    newTitle: "New featured slot",
    newDescription:
      "One centre per town at a time. The centre is moved to Pro until at least the end date.",
    selectState: "Select a state",
    selectTown: "Select a town",
    centre: "Centre",
    selectCentre: "Select a centre",
    startsOn: "Starts on",
    endsOn: "Ends on (last day)",
    creating: "Creating...",
    create: "Create slot",
  },
  ms: {
    loading: "Memuatkan slot...",
    groupTitles: {
      active: "Aktif",
      upcoming: "Akan datang",
      expired: "Tamat tempoh",
    },
    empty: (group: string) => `Tiada slot ${group}.`,
    cancelled: "Slot dibatalkan",
    ended: "Slot ditamatkan",
    endFailed: "Gagal menamatkan slot",
    brand: "Jenama",
    allBrands: "Semua jenama",
    state: "Negeri",
    town: "Bandar",
    cancel: "Batal",
    endNow: "Tamatkan sekarang",
    cancelTitle: "Batalkan slot ini?",
    endTitle: "Tamatkan slot ini sekarang?",
    endDescription: (center: string, place: string | null) =>
      `${center} tidak lagi dipaparkan sebagai pilihan di ${place}. Pelan Pro mereka tidak berubah.`,
    keep: "Kekalkan",
    cancelSlot: "Batalkan slot",
    endSlot: "Tamatkan slot",
    created: "Slot pilihan dicipta",
    createFailed: "Gagal mencipta slot",
    newTitle: "Slot pilihan baru",
    newDescription:
      "Satu pusat bagi setiap bandar pada satu masa. Pusat ditukar ke pelan Pro sekurang-kurangnya hingga tarikh tamat.",
    selectState: "Pilih negeri",
    selectTown: "Pilih bandar",
    centre: "Pusat",
    selectCentre: "Pilih pusat",
    startsOn: "Mula pada",
    endsOn: "Tamat pada (hari terakhir)",
    creating: "Mencipta...",
    create: "Cipta slot",
  },
})

function slotStatus(slot: FeaturedSlotRow, now: number): SlotStatus {
  if (Date.parse(slot.endsAt) <= now) return "expired"
  if (Date.parse(slot.startsAt) > now) return "upcoming"
  return "active"
}

export function FeaturedView() {
  const t = useCopy(COPY)
  const { data: slots = [], isLoading } = useQuery(featuredSlotsQuery)
  const { data: companies = [] } = useQuery(companiesQuery)
  const [brandId, setBrandId] = useState(ALL)
  const slotBrands = companies.filter((company) =>
    slots.some((slot) => slot.companyId === company.id)
  )
  const visibleSlots =
    brandId === ALL ? slots : slots.filter((slot) => slot.companyId === brandId)
  const now = Date.now()
  const groups = (["active", "upcoming", "expired"] as const).map((status) => ({
    status,
    slots: visibleSlots.filter((slot) => slotStatus(slot, now) === status),
  }))

  return (
    <div className="space-y-4">
      <CreateSlotCard />
      {slotBrands.length > 0 && (
        <BrandSelect
          value={brandId}
          onValueChange={setBrandId}
          companies={slotBrands}
          className="w-full md:w-64"
        />
      )}
      {isLoading ? (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">{t.loading}</p>
      ) : (
        groups.map((group) => (
          <SlotGroup key={group.status} status={group.status} slots={group.slots} />
        ))
      )}
    </div>
  )
}

function BrandSelect({
  id,
  value,
  onValueChange,
  companies,
  className,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  companies: CompanyRow[]
  className: string
}) {
  const t = useCopy(COPY)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={t.brand} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t.allBrands}</SelectItem>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SlotGroup({
  status,
  slots,
}: {
  status: SlotStatus
  slots: FeaturedSlotRow[]
}) {
  const t = useCopy(COPY)
  const queryClient = useQueryClient()
  const endMutation = useMutation({
    mutationFn: (id: string) => endFeaturedSlot({ data: { id } }),
    onSuccess: () => {
      toast.success(status === "upcoming" ? t.cancelled : t.ended)
      queryClient.invalidateQueries({ queryKey: ["featuredSlots"] })
    },
    onError: (error) => toast.error(error.message || t.endFailed),
  })

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.groupTitles[status]} <span className="tabular-nums">({slots.length})</span>
      </h2>
      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t.empty(t.groupTitles[status].toLowerCase())}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {slots.map((slot) => (
            <li key={slot.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4 md:px-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{slot.centerName}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.town}, {slot.stateName}
                </p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {toMytDayInput(slot.startsAt)} → {toMytDayInput(slot.endsAt)}
              </span>
              {status !== "expired" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={endMutation.isPending}>
                      {status === "upcoming" ? t.cancel : t.endNow}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {status === "upcoming" ? t.cancelTitle : t.endTitle}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t.endDescription(slot.centerName, slot.town)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.keep}</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => endMutation.mutate(slot.id)}
                      >
                        {status === "upcoming" ? t.cancelSlot : t.endSlot}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CreateSlotCard() {
  const t = useCopy(COPY)
  const queryClient = useQueryClient()
  const { data: centers = [] } = useQuery(centersQuery)
  const { data: states = [] } = useQuery({ queryKey: ["states"], queryFn: () => getStates() })
  const { data: companies = [] } = useQuery(companiesQuery)
  const [brandId, setBrandId] = useState(ALL)
  const today = toMytDay(Date.now())
  const [stateId, setStateId] = useState("")
  const [town, setTown] = useState("")
  const [centerId, setCenterId] = useState("")
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(addYear(today))

  const branded = brandId !== ALL
  const pool = branded ? centers.filter((center) => center.companyId === brandId) : centers
  const stateOptions = branded
    ? states.filter((state) => pool.some((center) => center.stateId === state.id))
    : states
  const inState = pool.filter((center) => center.stateId === stateId)
  const stateName = states.find((state) => state.id === stateId)?.name ?? ""
  const towns = citiesForState(stateName).filter(
    (name) => !branded || inState.some((center) => isCenterInTown(center, name))
  )
  const candidates = inState.filter((center) => town && isCenterInTown(center, town))

  const createMutation = useMutation({
    mutationFn: () =>
      createFeaturedSlot({
        data: {
          stateId,
          town,
          dialysisCenterId: centerId,
          startsAt: startOfMytDay(startsOn),
          endsAt: endOfMytDay(endsOn),
        },
      }),
    onSuccess: () => {
      toast.success(t.created)
      setCenterId("")
      queryClient.invalidateQueries({ queryKey: ["featuredSlots"] })
      queryClient.invalidateQueries({ queryKey: ["centers"] })
    },
    onError: (error) => toast.error(error.message || t.createFailed),
  })

  const canSubmit = stateId && town && centerId && startsOn && endsOn

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.newTitle}</CardTitle>
        <CardDescription>{t.newDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) createMutation.mutate()
          }}
        >
          <Field>
            <FieldLabel htmlFor="slot-brand">{t.brand}</FieldLabel>
            <BrandSelect
              id="slot-brand"
              value={brandId}
              onValueChange={(value) => {
                setBrandId(value)
                setStateId("")
                setTown("")
                setCenterId("")
              }}
              companies={companies}
              className="w-full"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-state">{t.state}</FieldLabel>
            <Select
              value={stateId}
              onValueChange={(value) => {
                setStateId(value)
                setTown("")
                setCenterId("")
              }}
            >
              <SelectTrigger id="slot-state" className="w-full">
                <SelectValue placeholder={t.selectState} />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-town">{t.town}</FieldLabel>
              <Select
                value={town}
                disabled={towns.length === 0}
                onValueChange={(value) => {
                  setTown(value)
                  setCenterId("")
                }}
              >
                <SelectTrigger id="slot-town" className="w-full">
                  <SelectValue placeholder={t.selectTown} />
                </SelectTrigger>
                <SelectContent>
                  {towns.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-center">{t.centre}</FieldLabel>
            <Select
              value={centerId}
              disabled={candidates.length === 0 || !town}
              onValueChange={setCenterId}
            >
              <SelectTrigger id="slot-center" className="w-full">
                <SelectValue placeholder={t.selectCentre} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.dialysisCenterName}
                    {center.town ? ` · ${center.town}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-starts">{t.startsOn}</FieldLabel>
            <Input
              id="slot-starts"
              type="date"
              value={startsOn}
              onChange={(e) => {
                setStartsOn(e.target.value)
                if (e.target.value) setEndsOn(addYear(e.target.value))
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-ends">{t.endsOn}</FieldLabel>
            <Input
              id="slot-ends"
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </Field>
          <div className="md:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={!canSubmit || createMutation.isPending} className="h-10">
              {createMutation.isPending ? t.creating : t.create}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
