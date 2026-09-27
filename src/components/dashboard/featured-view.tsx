import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createFeaturedSlot,
  endFeaturedSlot,
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
import { Badge } from "@/components/ui/badge"
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
import { centersQuery, featuredSlotsQuery } from "./queries"

type Scope = "town" | "state"

function slotStatus(slot: FeaturedSlotRow, now: number) {
  if (Date.parse(slot.endsAt) <= now) return "expired"
  if (Date.parse(slot.startsAt) > now) return "upcoming"
  return "active"
}

export function FeaturedView() {
  const { data: slots = [], isLoading } = useQuery(featuredSlotsQuery)
  const now = Date.now()
  const groups = (["active", "upcoming", "expired"] as const).map((status) => ({
    status,
    slots: slots.filter((slot) => slotStatus(slot, now) === status),
  }))

  return (
    <div className="space-y-4">
      <CreateSlotCard />
      {isLoading ? (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">Loading slots...</p>
      ) : (
        groups.map((group) => (
          <SlotGroup key={group.status} status={group.status} slots={group.slots} />
        ))
      )}
    </div>
  )
}

const GROUP_TITLES = {
  active: "Active",
  upcoming: "Upcoming",
  expired: "Expired",
} as const

function SlotGroup({
  status,
  slots,
}: {
  status: keyof typeof GROUP_TITLES
  slots: FeaturedSlotRow[]
}) {
  const queryClient = useQueryClient()
  const endMutation = useMutation({
    mutationFn: (id: string) => endFeaturedSlot({ data: { id } }),
    onSuccess: () => {
      toast.success(status === "upcoming" ? "Slot cancelled" : "Slot ended")
      queryClient.invalidateQueries({ queryKey: ["featuredSlots"] })
    },
    onError: (error) => toast.error(error.message || "Failed to end slot"),
  })

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {GROUP_TITLES[status]} <span className="tabular-nums">({slots.length})</span>
      </h2>
      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No {GROUP_TITLES[status].toLowerCase()} slots.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {slots.map((slot) => (
            <li key={slot.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4 md:px-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{slot.centerName}</span>
                  <Badge variant="secondary">{slot.scope === "town" ? "Town" : "State"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {slot.scope === "town"
                    ? `${slot.town}, ${slot.stateName}`
                    : `All of ${slot.stateName}`}
                </p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {toMytDayInput(slot.startsAt)} → {toMytDayInput(slot.endsAt)}
              </span>
              {status !== "expired" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={endMutation.isPending}>
                      {status === "upcoming" ? "Cancel" : "End now"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {status === "upcoming" ? "Cancel this slot?" : "End this slot now?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {slot.centerName} stops being featured
                        {slot.scope === "town" ? ` in ${slot.town}` : ` in ${slot.stateName}`}.
                        Their Pro plan is not changed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => endMutation.mutate(slot.id)}
                      >
                        {status === "upcoming" ? "Cancel slot" : "End slot"}
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
  const queryClient = useQueryClient()
  const { data: centers = [] } = useQuery(centersQuery)
  const { data: states = [] } = useQuery({ queryKey: ["states"], queryFn: () => getStates() })
  const today = toMytDay(Date.now())
  const [scope, setScope] = useState<Scope>("town")
  const [stateId, setStateId] = useState("")
  const [town, setTown] = useState("")
  const [centerId, setCenterId] = useState("")
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(addYear(today))

  const inState = centers.filter((center) => center.stateId === stateId)
  const stateName = states.find((state) => state.id === stateId)?.name ?? ""
  const towns = citiesForState(stateName)
  const candidates = inState.filter(
    (center) => scope === "state" || (town && isCenterInTown(center, town))
  )

  const createMutation = useMutation({
    mutationFn: () =>
      createFeaturedSlot({
        data: {
          scope,
          stateId,
          town,
          dialysisCenterId: centerId,
          startsAt: startOfMytDay(startsOn),
          endsAt: endOfMytDay(endsOn),
        },
      }),
    onSuccess: () => {
      toast.success("Featured slot created")
      setCenterId("")
      queryClient.invalidateQueries({ queryKey: ["featuredSlots"] })
      queryClient.invalidateQueries({ queryKey: ["centers"] })
    },
    onError: (error) => toast.error(error.message || "Failed to create slot"),
  })

  const canSubmit =
    stateId && centerId && startsOn && endsOn && (scope === "state" || town)

  return (
    <Card>
      <CardHeader>
        <CardTitle>New featured slot</CardTitle>
        <CardDescription>
          One centre per town and one per state at a time. The centre is moved to Pro until at
          least the end date.
        </CardDescription>
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
            <FieldLabel htmlFor="slot-scope">Scope</FieldLabel>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as Scope)
                setCenterId("")
              }}
            >
              <SelectTrigger id="slot-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="town">Town</SelectItem>
                <SelectItem value="state">State</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="slot-state">State</FieldLabel>
            <Select
              value={stateId}
              onValueChange={(value) => {
                setStateId(value)
                setTown("")
                setCenterId("")
              }}
            >
              <SelectTrigger id="slot-state" className="w-full">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {scope === "town" && (
            <Field>
              <FieldLabel htmlFor="slot-town">Town</FieldLabel>
              <Select
                value={town}
                disabled={towns.length === 0}
                onValueChange={(value) => {
                  setTown(value)
                  setCenterId("")
                }}
              >
                <SelectTrigger id="slot-town" className="w-full">
                  <SelectValue placeholder="Select a town" />
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
          )}
          <Field>
            <FieldLabel htmlFor="slot-center">Centre</FieldLabel>
            <Select
              value={centerId}
              disabled={candidates.length === 0 || (scope === "town" && !town)}
              onValueChange={setCenterId}
            >
              <SelectTrigger id="slot-center" className="w-full">
                <SelectValue placeholder="Select a centre" />
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
            <FieldLabel htmlFor="slot-starts">Starts on</FieldLabel>
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
            <FieldLabel htmlFor="slot-ends">Ends on (last day)</FieldLabel>
            <Input
              id="slot-ends"
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </Field>
          <div className="md:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={!canSubmit || createMutation.isPending} className="h-10">
              {createMutation.isPending ? "Creating..." : "Create slot"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
