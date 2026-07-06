import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  getCenterById,
  createCenter,
  updateCenter,
  getStates,
  getCurrentUserRole,
  resolveGoogleMapsCoordinates,
} from "@/core/functions/center-functions"
import {
  getFaqsForCenter,
  createFaq,
  updateFaq,
  deleteFaq,
} from "@/core/functions/faq-functions"
import {
  getOperatingHoursForCenter,
  upsertOperatingHours,
} from "@/core/functions/operating-hour-functions"
import { getIntakeLeads } from "@/core/functions/intake-lead-functions"
import { useSession } from "@/lib/auth-client"
import { extractGoogleMapsCoordinates } from "@/lib/google-maps-embed"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { IntakeLeadList } from "@/components/intake-lead-list"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  ArrowLeft,
  Building2,
  Clock,
  FileQuestion,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Settings2,
  Stethoscope,
  Users,
} from "lucide-react"

export const Route = createFileRoute("/centers/$centerId")({
  component: CenterEditPage,
  loader: async ({ params }) => {
    if (params.centerId === "new") {
      return { center: null }
    }

    const center = await getCenterById({ data: { id: params.centerId } })
    return { center }
  },
})

type CenterFormData = {
  dialysisCenterName: string
  title: string
  sector: string
  description: string
  tel: string
  phoneNumber: string
  fax: string
  email: string
  website: string
  address: string
  addressWithUnit: string
  googleMapsEmbed: string
  longitude: number | null
  latitude: number | null
  town: string
  stateId: string
  drInCharge: string
  drInChargeTel: string
  panelNephrologist: string
  centreManager: string
  centreCoordinator: string
  units: string
  hepatitisBay: string
  benefits: string
  featured: boolean
  whatsappPicName: string
  whatsappPicPhoneNumber: string
}

const EMPTY_CENTER_FORM_DATA: CenterFormData = {
  dialysisCenterName: "",
  title: "",
  sector: "",
  description: "",
  tel: "",
  phoneNumber: "",
  fax: "",
  email: "",
  website: "",
  address: "",
  addressWithUnit: "",
  googleMapsEmbed: "",
  longitude: null,
  latitude: null,
  town: "",
  stateId: "",
  drInCharge: "",
  drInChargeTel: "",
  panelNephrologist: "",
  centreManager: "",
  centreCoordinator: "",
  units: "",
  hepatitisBay: "",
  benefits: "",
  featured: false,
  whatsappPicName: "",
  whatsappPicPhoneNumber: "",
}

function CenterEditPage() {
  const navigate = useNavigate()
  const { centerId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isNewCenter = centerId === "new"

  const { data: userRole } = useQuery({
    queryKey: ["userRole", session?.user?.id],
    queryFn: () => getCurrentUserRole(),
    enabled: !!session,
  })

  const centerQuery = useQuery({
    queryKey: ["center", centerId],
    queryFn: () => getCenterById({ data: { id: centerId } }),
    enabled: !isNewCenter,
    initialData: loaderData.center ?? undefined,
  })
  const center = centerQuery.data
  const centerLoading = !isNewCenter && centerQuery.isLoading
  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => getStates(),
  })

  const [formData, setFormData] = useState<CenterFormData>(EMPTY_CENTER_FORM_DATA)
  const [isResolvingMap, setIsResolvingMap] = useState(false)
  const [mapMessage, setMapMessage] = useState("")

  useEffect(() => {
    if (center) {
      setFormData({
        dialysisCenterName: center.dialysisCenterName ?? "",
        title: center.title ?? "",
        sector: center.sector ?? "",
        description: center.description ?? "",
        tel: center.tel ?? "",
        phoneNumber: center.phoneNumber ?? "",
        fax: center.fax ?? "",
        email: center.email ?? "",
        website: center.website ?? "",
        address: center.address ?? "",
        addressWithUnit: center.addressWithUnit ?? "",
        googleMapsEmbed: center.googleMapsEmbed ?? "",
        longitude: center.longitude ?? null,
        latitude: center.latitude ?? null,
        town: center.town ?? "",
        stateId: center.stateId ?? "",
        drInCharge: center.drInCharge ?? "",
        drInChargeTel: center.drInChargeTel ?? "",
        panelNephrologist: center.panelNephrologist ?? "",
        centreManager: center.centreManager ?? "",
        centreCoordinator: center.centreCoordinator ?? "",
        units: center.units ?? "",
        hepatitisBay: center.hepatitisBay ?? "",
        benefits: center.benefits ?? "",
        featured: center.featured ?? false,
        whatsappPicName: center.whatsappPicName ?? "",
        whatsappPicPhoneNumber: center.whatsappPicPhoneNumber ?? "",
      })
    }
  }, [center])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CenterFormData>) =>
      updateCenter({ data: { id: centerId, data } }),
    onSuccess: () => {
      toast.success("Center updated successfully")
      queryClient.invalidateQueries({ queryKey: ["center", centerId] })
      queryClient.invalidateQueries({ queryKey: ["centers"] })
      queryClient.invalidateQueries({ queryKey: ["allCenters"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update center")
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CenterFormData) => createCenter({ data }),
    onSuccess: async (createdCenter) => {
      toast.success("Center created successfully")
      await queryClient.invalidateQueries({ queryKey: ["centers"] })
      await queryClient.invalidateQueries({ queryKey: ["allCenters"] })
      navigate({
        to: "/centers/$centerId",
        params: { centerId: createdCenter.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create center")
    },
  })

  const isSaving = updateMutation.isPending || createMutation.isPending
  const isSubmitDisabled = isSaving || isResolvingMap
  const saveButtonText = isResolvingMap
    ? "Finding map..."
    : isSaving
    ? "Saving..."
    : isNewCenter
      ? "Create Center"
      : "Save Changes"

  const resolveMapCoordinates = async (value: string) => {
    if (!value.trim()) return null

    const directCoordinates = extractGoogleMapsCoordinates(value)
    if (directCoordinates) {
      setFormData((prev) => ({
        ...prev,
        latitude: directCoordinates.latitude,
        longitude: directCoordinates.longitude,
      }))
      setMapMessage("Coordinates found.")
      return directCoordinates
    }

    setIsResolvingMap(true)
    setMapMessage("Finding coordinates...")

    try {
      const result = await resolveGoogleMapsCoordinates({ data: { value } })
      if (result.coordinates) {
        setFormData((prev) => ({
          ...prev,
          latitude: result.coordinates!.latitude,
          longitude: result.coordinates!.longitude,
        }))
        setMapMessage("Coordinates found from Google Maps link.")
        return result.coordinates
      }

      setMapMessage("Could not find coordinates from this link.")
      return null
    } catch {
      setMapMessage("Could not resolve this Google Maps link.")
      return null
    } finally {
      setIsResolvingMap(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.dialysisCenterName.trim()) {
      toast.error("Please enter a center name")
      return
    }

    if (!formData.stateId) {
      toast.error("Please select a state")
      return
    }

    let submitData = formData
    if (
      formData.googleMapsEmbed.trim() &&
      (formData.latitude == null || formData.longitude == null)
    ) {
      const coordinates = await resolveMapCoordinates(formData.googleMapsEmbed)
      if (!coordinates) {
        toast.error("Could not find map coordinates")
        return
      }

      submitData = {
        ...formData,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }
    }

    if (isNewCenter) {
      createMutation.mutate(submitData)
      return
    }

    updateMutation.mutate(submitData)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGoogleMapsEmbedChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value
    const coordinates = extractGoogleMapsCoordinates(value)
    setFormData((prev) => ({
      ...prev,
      googleMapsEmbed: value,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    }))
    setMapMessage(
      coordinates
        ? "Coordinates found."
        : value.trim()
          ? "Paste a Google Maps share link, embed, or coordinates."
          : ""
    )
  }

  if (centerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24 sm:pb-8">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-20 -mx-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-lg sm:border sm:px-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild className="size-10 shrink-0">
              <Link to="/dashboard" aria-label="Back to dashboard">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold sm:text-2xl">
                  {isNewCenter ? "Create Center" : "Edit Center"}
                </h1>
                {!isNewCenter && center?.state?.name && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {center.state.name}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {formData.dialysisCenterName || "Dialysis center details"}
              </p>
            </div>
            <Button
              type="submit"
              form="center-form"
              disabled={isSubmitDisabled}
              className="hidden h-10 gap-2 px-4 sm:inline-flex"
            >
              <Save className="size-4" />
              {saveButtonText}
            </Button>
          </div>
        </div>

        <form id="center-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Building2 className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
                  <CardDescription>General details about the dialysis center</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="dialysisCenterName">
                    Center Name
                  </FieldLabel>
                  <Input
                    id="dialysisCenterName"
                    name="dialysisCenterName"
                    value={formData.dialysisCenterName}
                    onChange={handleInputChange}
                    placeholder="Enter center name"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="title">Title</FieldLabel>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter title"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="sector">Sector</FieldLabel>
                    <Input
                      id="sector"
                      name="sector"
                      value={formData.sector}
                      onChange={handleInputChange}
                      placeholder="e.g., Private, Government"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter center description"
                    rows={3}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Phone className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
                  <CardDescription>Phone, email, and website details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="tel">Telephone</FieldLabel>
                    <Input
                      inputMode="tel"
                      id="tel"
                      name="tel"
                      value={formData.tel}
                      onChange={handleInputChange}
                      placeholder="Enter telephone"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
                    <Input
                      inputMode="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="fax">Fax</FieldLabel>
                    <Input
                      inputMode="tel"
                      id="fax"
                      name="fax"
                      value={formData.fax}
                      onChange={handleInputChange}
                      placeholder="Enter fax number"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="website">Website</FieldLabel>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Lead Follow-Up</CardTitle>
                  <CardDescription>Email alerts go to assigned admin users; WhatsApp handoff uses the PIC number</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="whatsappPicName">PIC Name</FieldLabel>
                    <Input
                      id="whatsappPicName"
                      name="whatsappPicName"
                      value={formData.whatsappPicName}
                      onChange={handleInputChange}
                      placeholder="Enter PIC name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="whatsappPicPhoneNumber">
                      PIC WhatsApp Number
                    </FieldLabel>
                    <Input
                      inputMode="tel"
                      id="whatsappPicPhoneNumber"
                      name="whatsappPicPhoneNumber"
                      value={formData.whatsappPicPhoneNumber}
                      onChange={handleInputChange}
                      placeholder="60123456789"
                    />
                  </Field>
                </div>
                <p className="text-sm text-muted-foreground">
                  SES lead emails are sent to assigned PIC/admin users for this center.
                  If no user is assigned, the center email is used as fallback.
                </p>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Location</CardTitle>
                  <CardDescription>Address and location details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter full address"
                    rows={2}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="addressWithUnit">
                    Address with Unit
                  </FieldLabel>
                  <Input
                    id="addressWithUnit"
                    name="addressWithUnit"
                    value={formData.addressWithUnit}
                    onChange={handleInputChange}
                    placeholder="Enter address with unit number"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="googleMapsEmbed">
                    Google Maps Embed
                  </FieldLabel>
                  <Textarea
                    id="googleMapsEmbed"
                    name="googleMapsEmbed"
                    value={formData.googleMapsEmbed}
                    onChange={handleGoogleMapsEmbedChange}
                    onBlur={() => {
                      if (
                        formData.googleMapsEmbed.trim() &&
                        (formData.latitude == null || formData.longitude == null)
                      ) {
                        void resolveMapCoordinates(formData.googleMapsEmbed)
                      }
                    }}
                    placeholder="Paste Google Maps share link, iframe, or coordinates"
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.latitude != null && formData.longitude != null
                      ? `Waze coordinates: ${formData.latitude}, ${formData.longitude}`
                      : mapMessage || "Paste a Google Maps link to auto-fill Waze coordinates."}
                  </p>
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="town">Town</FieldLabel>
                    <Input
                      id="town"
                      name="town"
                      value={formData.town}
                      onChange={handleInputChange}
                      placeholder="Enter town"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="stateId">State</FieldLabel>
                    <Select
                      value={formData.stateId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, stateId: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states?.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Users className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Staff Information</CardTitle>
                  <CardDescription>Key personnel at the dialysis center</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="drInCharge">
                      Doctor In Charge
                    </FieldLabel>
                    <Input
                      id="drInCharge"
                      name="drInCharge"
                      value={formData.drInCharge}
                      onChange={handleInputChange}
                      placeholder="Enter doctor name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="drInChargeTel">
                      Doctor Phone
                    </FieldLabel>
                    <Input
                      inputMode="tel"
                      id="drInChargeTel"
                      name="drInChargeTel"
                      value={formData.drInChargeTel}
                      onChange={handleInputChange}
                      placeholder="Enter doctor phone"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="panelNephrologist">
                    Panel Nephrologist
                  </FieldLabel>
                  <Input
                    id="panelNephrologist"
                    name="panelNephrologist"
                    value={formData.panelNephrologist}
                    onChange={handleInputChange}
                    placeholder="Enter nephrologist name"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="centreManager">
                      Centre Manager
                    </FieldLabel>
                    <Input
                      id="centreManager"
                      name="centreManager"
                      value={formData.centreManager}
                      onChange={handleInputChange}
                      placeholder="Enter manager name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="centreCoordinator">
                      Centre Coordinator
                    </FieldLabel>
                    <Input
                      id="centreCoordinator"
                      name="centreCoordinator"
                      value={formData.centreCoordinator}
                      onChange={handleInputChange}
                      placeholder="Enter coordinator name"
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Stethoscope className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Facilities</CardTitle>
                  <CardDescription>Equipment and services available</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="units">Units</FieldLabel>
                    <Input
                      id="units"
                      name="units"
                      value={formData.units}
                      onChange={handleInputChange}
                      placeholder="Number of units"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="hepatitisBay">
                      Hepatitis Bay
                    </FieldLabel>
                    <Input
                      id="hepatitisBay"
                      name="hepatitisBay"
                      value={formData.hepatitisBay}
                      onChange={handleInputChange}
                      placeholder="Enter hepatitis bay info"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="benefits">Benefits</FieldLabel>
                  <Textarea
                    id="benefits"
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleInputChange}
                    placeholder="Enter benefits and services offered"
                    rows={3}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {userRole?.role === "superadmin" && (
            <Card>
              <CardHeader className="gap-2 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <Settings2 className="size-5 text-primary" />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Display Settings</CardTitle>
                    <CardDescription>Control how this center appears on the website</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <Field orientation="horizontal">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, featured: checked }))
                      }
                    />
                    <Label htmlFor="featured">Featured Center</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Featured centers are highlighted on the homepage
                  </p>
                </Field>
              </CardContent>
            </Card>
          )}
        </form>

        {isNewCenter ? (
          <Card>
            <CardHeader className="px-4 py-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Additional Details</CardTitle>
              <CardDescription>
                Create the center first to manage operating hours and FAQs.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <IntakeLeadsSection centerId={centerId} />
            <OperatingHoursSection centerId={centerId} />
            <FaqSection centerId={centerId} />
          </>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-lg backdrop-blur sm:hidden">
        <Button
          type="submit"
          form="center-form"
          disabled={isSubmitDisabled}
          className="h-11 w-full gap-2"
        >
          <Save className="size-4" />
          {saveButtonText}
        </Button>
      </div>
    </div>
  )
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

type HourEntry = {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

const DEFAULT_HOURS: HourEntry[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: "07:00",
  closeTime: "22:00",
  isClosed: false,
}))

function IntakeLeadsSection({ centerId }: { centerId: string }) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["intakeLeads", centerId],
    queryFn: () => getIntakeLeads({ data: { centerId, limit: 20 } }),
  })

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MessageCircle className="size-5 text-primary" />
          Intake Leads
        </CardTitle>
        <CardDescription>
          Recent appointment requests from the public site
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Loading leads...
          </div>
        ) : (
          <IntakeLeadList
            leads={leads}
            emptyMessage="No intake leads for this center yet."
            showCenter={false}
          />
        )}
      </CardContent>
    </Card>
  )
}

function OperatingHoursSection({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient()
  const [hours, setHours] = useState<HourEntry[]>(DEFAULT_HOURS)

  const { data: savedHours } = useQuery({
    queryKey: ["operatingHours", centerId],
    queryFn: () => getOperatingHoursForCenter({ data: { centerId } }),
  })

  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      setHours(
        DEFAULT_HOURS.map((def) => {
          const saved = savedHours.find((s) => s.dayOfWeek === def.dayOfWeek)
          return saved
            ? {
                dayOfWeek: saved.dayOfWeek,
                openTime: saved.openTime,
                closeTime: saved.closeTime,
                isClosed: saved.isClosed,
              }
            : def
        })
      )
    }
  }, [savedHours])

  const saveMutation = useMutation({
    mutationFn: () => upsertOperatingHours({ data: { centerId, hours } }),
    onSuccess: () => {
      toast.success("Operating hours saved")
      queryClient.invalidateQueries({
        queryKey: ["operatingHours", centerId],
      })
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save operating hours"),
  })

  const updateDay = (dayOfWeek: number, field: keyof HourEntry, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    )
  }

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Clock className="size-5 text-primary" />
          Operating Hours
        </CardTitle>
        <CardDescription>
          Set the opening and closing times for each day
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
        {hours.map((h) => (
          <div
            key={h.dayOfWeek}
            className="rounded-lg border bg-background p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {DAY_NAMES[h.dayOfWeek]}
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={h.isClosed}
                  onCheckedChange={(checked) =>
                    updateDay(h.dayOfWeek, "isClosed", checked)
                  }
                />
                <Label className="text-sm">Closed</Label>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Input
                type="time"
                value={h.openTime}
                onChange={(e) =>
                  updateDay(h.dayOfWeek, "openTime", e.target.value)
                }
                disabled={h.isClosed}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={h.closeTime}
                onChange={(e) =>
                  updateDay(h.dayOfWeek, "closeTime", e.target.value)
                }
                disabled={h.isClosed}
              />
            </div>
          </div>
        ))}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-10 w-full sm:w-auto"
          size="sm"
        >
          {saveMutation.isPending ? "Saving..." : "Save Hours"}
        </Button>
      </CardContent>
    </Card>
  )
}

function FaqSection({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient()
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState("")
  const [editAnswer, setEditAnswer] = useState("")

  const { data: faqs = [] } = useQuery({
    queryKey: ["faqs", centerId],
    queryFn: () => getFaqsForCenter({ data: { centerId } }),
  })

  const invalidateFaqs = () =>
    queryClient.invalidateQueries({ queryKey: ["faqs", centerId] })

  const createMutation = useMutation({
    mutationFn: (data: { question: string; answer: string }) =>
      createFaq({ data: { centerId, ...data } }),
    onSuccess: () => {
      toast.success("FAQ added")
      setNewQuestion("")
      setNewAnswer("")
      invalidateFaqs()
    },
    onError: (error) => toast.error(error.message || "Failed to add FAQ"),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { faqId: string; question: string; answer: string }) =>
      updateFaq({ data }),
    onSuccess: () => {
      toast.success("FAQ updated")
      setEditingId(null)
      invalidateFaqs()
    },
    onError: (error) => toast.error(error.message || "Failed to update FAQ"),
  })

  const deleteMutation = useMutation({
    mutationFn: (faqId: string) => deleteFaq({ data: { faqId } }),
    onSuccess: () => {
      toast.success("FAQ deleted")
      invalidateFaqs()
    },
    onError: (error) => toast.error(error.message || "Failed to delete FAQ"),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.trim() || !newAnswer.trim()) return
    createMutation.mutate({ question: newQuestion, answer: newAnswer })
  }

  const startEditing = (faq: { id: string; question: string; answer: string }) => {
    setEditingId(faq.id)
    setEditQuestion(faq.question)
    setEditAnswer(faq.answer)
  }

  const handleUpdate = (faqId: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) return
    updateMutation.mutate({ faqId, question: editQuestion, answer: editAnswer })
  }

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileQuestion className="size-5 text-primary" />
          FAQs
        </CardTitle>
        <CardDescription>
          Frequently asked questions for this center
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
        {faqs.length > 0 && (
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="rounded-lg border p-4 space-y-3"
              >
                {editingId === faq.id ? (
                  <>
                    <Input
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      placeholder="Question"
                    />
                    <Textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      placeholder="Answer"
                      rows={3}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(faq.id)}
                        disabled={updateMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-medium">
                        {index + 1}. {faq.question}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {faq.answer}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(faq)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(faq.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Add New FAQ</p>
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question"
          />
          <Textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer"
            rows={3}
          />
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || !newQuestion.trim() || !newAnswer.trim()}
          >
            {createMutation.isPending ? "Adding..." : "Add FAQ"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
