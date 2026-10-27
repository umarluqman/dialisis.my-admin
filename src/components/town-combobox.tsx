import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { createTown, getTowns, type TownRow } from "@/core/functions/town-functions"
import { defineCopy, useCopy } from "@/lib/i18n"

const COPY = defineCopy({
  en: {
    placeholder: "Search town",
    pickState: "Pick a state first",
    noTowns: "No matching town.",
    add: (name: string) => `Add "${name}"`,
  },
  ms: {
    placeholder: "Cari bandar",
    pickState: "Pilih negeri dahulu",
    noTowns: "Tiada bandar sepadan.",
    add: (name: string) => `Tambah "${name}"`,
  },
})

export function useTowns() {
  return useQuery({ queryKey: ["towns"], queryFn: () => getTowns() })
}

export function TownCombobox({
  id,
  stateId,
  value,
  onChange,
  canCreate = false,
  disabled = false,
}: {
  id?: string
  stateId: string
  value: string
  onChange: (townId: string) => void
  canCreate?: boolean
  disabled?: boolean
}) {
  const t = useCopy(COPY)
  const queryClient = useQueryClient()
  const { data: towns = [] } = useTowns()
  const [query, setQuery] = useState("")
  const options = towns.filter((town) => town.stateId === stateId)
  const selected = options.find((town) => town.id === value) ?? null

  const createMutation = useMutation({
    mutationFn: (name: string) => createTown({ data: { stateId, name } }),
    onSuccess: async (town) => {
      await queryClient.invalidateQueries({ queryKey: ["towns"] })
      onChange(town.id)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(town: TownRow | null) => onChange(town?.id ?? "")}
      onInputValueChange={setQuery}
      itemToStringLabel={(town: TownRow) => town.name}
      isItemEqualToValue={(town: TownRow, other: TownRow) => town.id === other.id}
      disabled={disabled || !stateId}
    >
      <ComboboxInput
        id={id}
        placeholder={stateId ? t.placeholder : t.pickState}
        disabled={disabled || !stateId}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {canCreate && query.trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(query.trim())}
            >
              {t.add(query.trim())}
            </Button>
          ) : (
            t.noTowns
          )}
        </ComboboxEmpty>
        <ComboboxList>
          {(town: TownRow) => (
            <ComboboxItem key={town.id} value={town}>
              {town.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
