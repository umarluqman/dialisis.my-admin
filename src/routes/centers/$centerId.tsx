import { LocaleToggle } from "@/components/locale-toggle"
import { PreviewBanner } from "@/components/dashboard/preview-banner"
import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  getCenterById,
  createCenter,
  updateCenter,
  deleteCenter,
  getStates,
  getCurrentUserRole,
  resolveGoogleMapsCoordinates,
  getEarlybirdSeats,
  updateCenterPlan,
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
import { endOfMytDay, isPlanActive, toMytDayInput } from "@/lib/plan"
import {
  HEPATITIS_BAYS,
  SECTORS,
  TREATMENT_UNITS,
  fromHepatitisBay,
  hasListValue,
  mergePhoneNumbers,
  toHepatitisBay,
  toggleListValue,
} from "@/lib/center-fields"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
  BadgeCheck,
  Clock,
  CreditCard,
  FileQuestion,
  ListChecks,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  Users,
  X,
} from "lucide-react"
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
import { defineCopy, useCopy } from "@/lib/i18n"

const COPY = defineCopy({
  en: {
    centerUpdated: "Center updated successfully",
    updateCenterFailed: "Failed to update center",
    centerDeleted: "Center deleted",
    deleteCenterFailed: "Failed to delete center",
    centerCreated: "Center created successfully",
    createCenterFailed: "Failed to create center",
    findingMap: "Finding map...",
    saving: "Saving...",
    createCenter: "Create Center",
    editCenter: "Edit Center",
    saveChanges: "Save Changes",
    unsavedChanges: "Unsaved changes",
    allChangesSaved: "All changes saved",
    leaveConfirm: "You have unsaved changes. Leave without saving?",
    coordinatesFound: "Coordinates found.",
    findingCoordinates: "Finding coordinates...",
    coordinatesFoundFromLink: "Coordinates found from Google Maps link.",
    coordinatesNotFound: "Could not find coordinates from this link.",
    mapLinkUnresolved: "Could not resolve this Google Maps link.",
    enterCenterName: "Please enter a center name",
    selectState: "Please select a state",
    mapCoordinatesNotFound: "Could not find map coordinates",
    pasteMapHint: "Paste a Google Maps share link, embed, or coordinates.",
    loading: "Loading...",
    backToDashboard: "Back to dashboard",
    centerDetails: "Dialysis center details",
    deleteCenter: "Delete center",
    deleteCenterTitle: "Delete this center?",
    thisCenter: "this center",
    deleteCenterDescription: (name: string) =>
      `This permanently removes ${name} along with its images, FAQs, operating hours and intake leads. This cannot be undone.`,
    cancel: "Cancel",
    delete: "Delete",
    basicInfo: "Basic Information",
    basicInfoDescription: "General details about the dialysis center",
    centerName: "Center Name",
    centerNamePlaceholder: "Enter center name",
    sector: "Sector",
    sectorPlaceholder: "Select a sector",
    sectors: {
      PRIVATE: "Private",
      MOH: "Government (MOH)",
      NGO: "NGO",
      UNIVERSITY: "University",
      "ARMED FORCE": "Armed Forces",
    },
    description: "Description",
    descriptionPlaceholder: "Enter center description",
    contactInfo: "Contact Information",
    contactInfoDescription: "Phone, email, and website details",
    phoneNumbers: "Phone Numbers",
    phoneNumberPlaceholder: "e.g., 03-1234 5678",
    addPhoneNumber: "Add number",
    removePhoneNumber: "Remove number",
    email: "Email",
    emailPlaceholder: "Enter email",
    website: "Website",
    leadFollowUp: "Lead Follow-Up",
    leadFollowUpDescription:
      "Email alerts go to assigned admin users; WhatsApp handoff uses the PIC number",
    picName: "PIC Name",
    picNamePlaceholder: "Enter PIC name",
    picWhatsapp: "PIC WhatsApp Number",
    leadEmailNote:
      "SES lead emails are sent to assigned PIC/admin users for this center. If no user is assigned, the center email is used as fallback.",
    location: "Location",
    locationDescription: "Address and location details",
    address: "Address",
    addressPlaceholder: "Full address including unit, floor or block (e.g. Level 2, Block B)",
    googleMapsEmbed: "Google Maps Embed",
    googleMapsEmbedPlaceholder:
      "Paste Google Maps share link, iframe, or coordinates",
    wazeCoordinates: (lat: number, lng: number) =>
      `Waze coordinates: ${lat}, ${lng}`,
    wazeHint: "Paste a Google Maps link to auto-fill Waze coordinates.",
    town: "Town",
    townPlaceholder: "Enter town",
    state: "State",
    statePlaceholder: "Select a state",
    staffInfo: "Staff Information",
    staffInfoDescription: "Key personnel at the dialysis center",
    drInCharge: "Doctor In Charge",
    drInChargePlaceholder: "Enter doctor name",
    drInChargeTel: "Doctor Phone",
    drInChargeTelPlaceholder: "Enter doctor phone",
    panelNephrologist: "Panel Nephrologist",
    panelNephrologistPlaceholder: "Enter nephrologist name",
    centreManager: "Centre Manager",
    centreManagerPlaceholder: "Enter manager name",
    centreCoordinator: "Centre Coordinator",
    centreCoordinatorPlaceholder: "Enter coordinator name",
    facilities: "Facilities",
    facilitiesDescription: "Equipment and services available",
    units: "Treatments Offered",
    unitsHint: "Tick every treatment this centre provides.",
    unitOptions: {
      "CAPD Unit": "Peritoneal dialysis (CAPD)",
      "HD Unit": "Haemodialysis (HD)",
      "Tx Unit": "Kidney transplant",
      "MRRB Unit": "MRRB",
    },
    hepatitisBay: "Hepatitis Bay",
    hepatitisBayHint: "Leave unticked if there is no hepatitis bay.",
    benefits: "Benefits",
    benefitsPlaceholder: "Enter benefits and services offered",
    listingDetails: "Listing Details",
    listingDetailsDescription: "What families ask before they call",
    sessionSlots: "Session Slots",
    sessionSlotsPlaceholder: "e.g., Morning 7am, Afternoon 12pm, Evening 5pm",
    perkesoPanel: "PERKESO panel",
    perkesoPanelHint: "Centre is on the PERKESO (SOCSO) dialysis panel",
    additionalDetails: "Additional Details",
    additionalDetailsDescription:
      "Create the center first to manage operating hours and FAQs.",
    planUpdated: "Plan updated",
    updatePlanFailed: "Failed to update plan",
    plan: "Plan",
    proExpired: "Pro expired",
    verified: "Verified",
    planDescription: "Superadmin only. Changes go live on the public site.",
    asasFree: "Asas (free)",
    planEndsOn: "Plan ends on",
    planEndsOnHint: "Last day of Pro (Malaysia time). Leave empty for no end date.",
    earlybirdSeats: (used: number, total: number, full: boolean) =>
      `${used} / ${total} earlybird seats used${full ? " · full" : ""}`,
    loadingSeats: "Loading seats...",
    savePlan: "Save plan",
    unverify: "Unverify",
    markVerified: "Mark verified",
    verifiedOn: (date: string) => `Verified on ${date}`,
    intakeLeads: "Intake Leads",
    intakeLeadsDescription: "Recent appointment requests from the public site",
    loadingLeads: "Loading leads...",
    noLeads: "No intake leads for this center yet.",
    days: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    hoursSaved: "Operating hours saved",
    saveHoursFailed: "Failed to save operating hours",
    operatingHours: "Operating Hours",
    operatingHoursDescription: "Set the opening and closing times for each day",
    closed: "Closed",
    to: "to",
    saveHours: "Save Hours",
    faqAdded: "FAQ added",
    addFaqFailed: "Failed to add FAQ",
    faqUpdated: "FAQ updated",
    updateFaqFailed: "Failed to update FAQ",
    faqDeleted: "FAQ deleted",
    deleteFaqFailed: "Failed to delete FAQ",
    faqs: "FAQs",
    faqsDescription: "Frequently asked questions for this center",
    question: "Question",
    answer: "Answer",
    save: "Save",
    edit: "Edit",
    addNewFaq: "Add New FAQ",
    adding: "Adding...",
    addFaq: "Add FAQ",
  },
  ms: {
    centerUpdated: "Pusat dikemas kini",
    updateCenterFailed: "Gagal mengemas kini pusat",
    centerDeleted: "Pusat dipadam",
    deleteCenterFailed: "Gagal memadam pusat",
    centerCreated: "Pusat dicipta",
    createCenterFailed: "Gagal mencipta pusat",
    findingMap: "Mencari peta...",
    saving: "Menyimpan...",
    createCenter: "Cipta pusat",
    editCenter: "Sunting pusat",
    saveChanges: "Simpan perubahan",
    unsavedChanges: "Belum disimpan",
    allChangesSaved: "Semua telah disimpan",
    leaveConfirm: "Ada perubahan belum disimpan. Keluar tanpa menyimpan?",
    coordinatesFound: "Koordinat ditemui.",
    findingCoordinates: "Mencari koordinat...",
    coordinatesFoundFromLink: "Koordinat ditemui daripada pautan Google Maps.",
    coordinatesNotFound: "Koordinat tidak ditemui dalam pautan ini.",
    mapLinkUnresolved: "Tidak dapat memproses pautan Google Maps ini.",
    enterCenterName: "Sila masukkan nama pusat",
    selectState: "Sila pilih negeri",
    mapCoordinatesNotFound: "Koordinat peta tidak ditemui",
    pasteMapHint: "Tampal pautan kongsi, benaman atau koordinat Google Maps.",
    loading: "Memuatkan...",
    backToDashboard: "Kembali ke papan pemuka",
    centerDetails: "Butiran pusat dialisis",
    deleteCenter: "Padam pusat",
    deleteCenterTitle: "Padam pusat ini?",
    thisCenter: "pusat ini",
    deleteCenterDescription: (name: string) =>
      `Tindakan ini memadam ${name} secara kekal bersama gambar, soalan lazim, waktu operasi dan permohonan temujanjinya. Tindakan ini tidak boleh dibatalkan.`,
    cancel: "Batal",
    delete: "Padam",
    basicInfo: "Maklumat asas",
    basicInfoDescription: "Butiran umum tentang pusat dialisis",
    centerName: "Nama pusat",
    centerNamePlaceholder: "Masukkan nama pusat",
    sector: "Sektor",
    sectorPlaceholder: "Pilih sektor",
    sectors: {
      PRIVATE: "Swasta",
      MOH: "Kerajaan (KKM)",
      NGO: "NGO",
      UNIVERSITY: "Universiti",
      "ARMED FORCE": "Angkatan Tentera",
    },
    description: "Penerangan",
    descriptionPlaceholder: "Masukkan penerangan pusat",
    contactInfo: "Maklumat hubungan",
    contactInfoDescription: "Butiran telefon, e-mel dan laman web",
    phoneNumbers: "No. telefon",
    phoneNumberPlaceholder: "cth. 03-1234 5678",
    addPhoneNumber: "Tambah nombor",
    removePhoneNumber: "Buang nombor",
    email: "E-mel",
    emailPlaceholder: "Masukkan e-mel",
    website: "Laman web",
    leadFollowUp: "Susulan permohonan",
    leadFollowUpDescription:
      "Makluman e-mel dihantar kepada pengguna pentadbir yang ditugaskan; WhatsApp disalurkan ke nombor PIC",
    picName: "Nama PIC",
    picNamePlaceholder: "Masukkan nama PIC",
    picWhatsapp: "No. WhatsApp PIC",
    leadEmailNote:
      "E-mel permohonan SES dihantar kepada pengguna PIC/pentadbir yang ditugaskan untuk pusat ini. Jika tiada pengguna ditugaskan, e-mel pusat akan digunakan sebagai ganti.",
    location: "Lokasi",
    locationDescription: "Butiran alamat dan lokasi",
    address: "Alamat",
    addressPlaceholder: "Alamat penuh termasuk unit, tingkat atau blok (cth. Aras 2, Blok B)",
    googleMapsEmbed: "Benaman Google Maps",
    googleMapsEmbedPlaceholder:
      "Tampal pautan kongsi, iframe atau koordinat Google Maps",
    wazeCoordinates: (lat: number, lng: number) =>
      `Koordinat Waze: ${lat}, ${lng}`,
    wazeHint: "Tampal pautan Google Maps untuk mengisi koordinat Waze secara automatik.",
    town: "Bandar",
    townPlaceholder: "Masukkan bandar",
    state: "Negeri",
    statePlaceholder: "Pilih negeri",
    staffInfo: "Maklumat kakitangan",
    staffInfoDescription: "Kakitangan utama di pusat dialisis",
    drInCharge: "Doktor bertanggungjawab",
    drInChargePlaceholder: "Masukkan nama doktor",
    drInChargeTel: "Telefon doktor",
    drInChargeTelPlaceholder: "Masukkan no. telefon doktor",
    panelNephrologist: "Pakar nefrologi panel",
    panelNephrologistPlaceholder: "Masukkan nama pakar nefrologi",
    centreManager: "Pengurus pusat",
    centreManagerPlaceholder: "Masukkan nama pengurus",
    centreCoordinator: "Penyelaras pusat",
    centreCoordinatorPlaceholder: "Masukkan nama penyelaras",
    facilities: "Kemudahan",
    facilitiesDescription: "Peralatan dan perkhidmatan yang tersedia",
    units: "Rawatan ditawarkan",
    unitsHint: "Tandakan semua rawatan yang disediakan pusat ini.",
    unitOptions: {
      "CAPD Unit": "Dialisis peritoneal (CAPD)",
      "HD Unit": "Hemodialisis (HD)",
      "Tx Unit": "Pemindahan buah pinggang",
      "MRRB Unit": "MRRB",
    },
    hepatitisBay: "Ruang hepatitis",
    hepatitisBayHint: "Biarkan kosong jika tiada ruang hepatitis.",
    benefits: "Faedah",
    benefitsPlaceholder: "Masukkan faedah dan perkhidmatan yang ditawarkan",
    listingDetails: "Butiran penyenaraian",
    listingDetailsDescription: "Perkara yang ditanya keluarga sebelum menghubungi",
    sessionSlots: "Slot sesi",
    sessionSlotsPlaceholder: "cth. Pagi 7:00, Tengah hari 12:00, Petang 5:00",
    perkesoPanel: "Panel PERKESO",
    perkesoPanelHint: "Pusat ini panel dialisis PERKESO",
    additionalDetails: "Butiran tambahan",
    additionalDetailsDescription:
      "Cipta pusat dahulu untuk mengurus waktu operasi dan soalan lazim.",
    planUpdated: "Pelan dikemas kini",
    updatePlanFailed: "Gagal mengemas kini pelan",
    plan: "Pelan",
    proExpired: "Pro tamat tempoh",
    verified: "Disahkan",
    planDescription: "Superadmin sahaja. Perubahan terus dipaparkan di laman awam.",
    asasFree: "Asas (percuma)",
    planEndsOn: "Pelan tamat pada",
    planEndsOnHint:
      "Hari terakhir Pro (waktu Malaysia). Biarkan kosong jika tiada tarikh tamat.",
    earlybirdSeats: (used: number, total: number, full: boolean) =>
      `${used} / ${total} tempat earlybird digunakan${full ? " · penuh" : ""}`,
    loadingSeats: "Memuatkan tempat...",
    savePlan: "Simpan pelan",
    unverify: "Batal pengesahan",
    markVerified: "Tandakan disahkan",
    verifiedOn: (date: string) => `Disahkan pada ${date}`,
    intakeLeads: "Permohonan temujanji",
    intakeLeadsDescription: "Permohonan temujanji terkini daripada laman awam",
    loadingLeads: "Memuatkan permohonan...",
    noLeads: "Belum ada permohonan temujanji untuk pusat ini.",
    days: ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"],
    hoursSaved: "Waktu operasi disimpan",
    saveHoursFailed: "Gagal menyimpan waktu operasi",
    operatingHours: "Waktu operasi",
    operatingHoursDescription: "Tetapkan waktu buka dan tutup bagi setiap hari",
    closed: "Tutup",
    to: "hingga",
    saveHours: "Simpan waktu",
    faqAdded: "Soalan lazim ditambah",
    addFaqFailed: "Gagal menambah soalan lazim",
    faqUpdated: "Soalan lazim dikemas kini",
    updateFaqFailed: "Gagal mengemas kini soalan lazim",
    faqDeleted: "Soalan lazim dipadam",
    deleteFaqFailed: "Gagal memadam soalan lazim",
    faqs: "Soalan lazim",
    faqsDescription: "Soalan lazim untuk pusat ini",
    question: "Soalan",
    answer: "Jawapan",
    save: "Simpan",
    edit: "Sunting",
    addNewFaq: "Tambah soalan lazim baru",
    adding: "Menambah...",
    addFaq: "Tambah soalan lazim",
  },
})

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
  sector: string
  description: string
  phoneNumbers: string[]
  email: string
  website: string
  address: string
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
  sessionSlots: string
  perkesoPanel: boolean
  whatsappPicName: string
  whatsappPicPhoneNumber: string
}

const EMPTY_CENTER_FORM_DATA: CenterFormData = {
  dialysisCenterName: "",
  sector: "",
  description: "",
  phoneNumbers: [""],
  email: "",
  website: "",
  address: "",
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
  sessionSlots: "",
  perkesoPanel: false,
  whatsappPicName: "",
  whatsappPicPhoneNumber: "",
}

type CenterPayload = Omit<CenterFormData, "phoneNumbers"> & { phoneNumber: string }

function toCenterPayload({ phoneNumbers, ...data }: CenterFormData): CenterPayload {
  return {
    ...data,
    phoneNumber: phoneNumbers.map((phone) => phone.trim()).filter(Boolean).join(", "),
    hepatitisBay: toHepatitisBay(data.hepatitisBay),
  }
}

function CenterEditPage() {
  const navigate = useNavigate()
  const { centerId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isNewCenter = centerId === "new"
  const t = useCopy(COPY)

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
  const [savedData, setSavedData] = useState<CenterFormData>(EMPTY_CENTER_FORM_DATA)
  const allowLeaveRef = useRef(false)
  const [isResolvingMap, setIsResolvingMap] = useState(false)
  const [mapMessage, setMapMessage] = useState("")

  useEffect(() => {
    if (center) {
      const phoneNumbers = mergePhoneNumbers(center.phoneNumber, center.tel)
      const data: CenterFormData = {
        dialysisCenterName: center.dialysisCenterName ?? "",
        sector: (center.sector ?? "").toUpperCase(),
        description: center.description ?? "",
        phoneNumbers: phoneNumbers.length ? phoneNumbers : [""],
        email: center.email ?? "",
        website: center.website ?? "",
        address: center.addressWithUnit || center.address || "",
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
        hepatitisBay: fromHepatitisBay(center.hepatitisBay),
        benefits: center.benefits ?? "",
        sessionSlots: center.sessionSlots ?? "",
        perkesoPanel: center.perkesoPanel,
        whatsappPicName: center.whatsappPicName ?? "",
        whatsappPicPhoneNumber: center.whatsappPicPhoneNumber ?? "",
      }
      setFormData(data)
      setSavedData(data)
    }
  }, [center])

  const updateMutation = useMutation({
    mutationFn: (data: CenterPayload) =>
      updateCenter({ data: { id: centerId, data } }),
    onSuccess: () => {
      toast.success(t.centerUpdated)
      queryClient.invalidateQueries({ queryKey: ["center", centerId] })
      queryClient.invalidateQueries({ queryKey: ["centers"] })
      queryClient.invalidateQueries({ queryKey: ["allCenters"] })
    },
    onError: (error) => {
      toast.error(error.message || t.updateCenterFailed)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCenter({ data: { id: centerId } }),
    onSuccess: async () => {
      toast.success(t.centerDeleted)
      allowLeaveRef.current = true
      await queryClient.invalidateQueries({ queryKey: ["centers"] })
      await queryClient.invalidateQueries({ queryKey: ["allCenters"] })
      navigate({ to: "/dashboard" })
    },
    onError: (error) => toast.error(error.message || t.deleteCenterFailed),
  })

  const createMutation = useMutation({
    mutationFn: (data: CenterPayload) => createCenter({ data }),
    onSuccess: async (createdCenter) => {
      toast.success(t.centerCreated)
      allowLeaveRef.current = true
      await queryClient.invalidateQueries({ queryKey: ["centers"] })
      await queryClient.invalidateQueries({ queryKey: ["allCenters"] })
      navigate({
        to: "/centers/$centerId",
        params: { centerId: createdCenter.id },
      })
    },
    onError: (error) => {
      toast.error(error.message || t.createCenterFailed)
    },
  })

  const isSaving = updateMutation.isPending || createMutation.isPending
  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData)
  const isSubmitDisabled = !isDirty || isSaving || isResolvingMap

  useBlocker({
    shouldBlockFn: () =>
      isDirty && !allowLeaveRef.current && !window.confirm(t.leaveConfirm),
    enableBeforeUnload: () => isDirty && !allowLeaveRef.current,
  })
  const saveButtonText = isResolvingMap
    ? t.findingMap
    : isSaving
    ? t.saving
    : isNewCenter
      ? t.createCenter
      : t.saveChanges

  const resolveMapCoordinates = async (value: string) => {
    if (!value.trim()) return null

    const directCoordinates = extractGoogleMapsCoordinates(value)
    if (directCoordinates) {
      setFormData((prev) => ({
        ...prev,
        latitude: directCoordinates.latitude,
        longitude: directCoordinates.longitude,
      }))
      setMapMessage(t.coordinatesFound)
      return directCoordinates
    }

    setIsResolvingMap(true)
    setMapMessage(t.findingCoordinates)

    try {
      const result = await resolveGoogleMapsCoordinates({ data: { value } })
      if (result.coordinates) {
        setFormData((prev) => ({
          ...prev,
          latitude: result.coordinates!.latitude,
          longitude: result.coordinates!.longitude,
        }))
        setMapMessage(t.coordinatesFoundFromLink)
        return result.coordinates
      }

      setMapMessage(t.coordinatesNotFound)
      return null
    } catch {
      setMapMessage(t.mapLinkUnresolved)
      return null
    } finally {
      setIsResolvingMap(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.dialysisCenterName.trim()) {
      toast.error(t.enterCenterName)
      return
    }

    if (!formData.stateId) {
      toast.error(t.selectState)
      return
    }

    let submitData = formData
    if (
      formData.googleMapsEmbed.trim() &&
      (formData.latitude == null || formData.longitude == null)
    ) {
      const coordinates = await resolveMapCoordinates(formData.googleMapsEmbed)
      if (!coordinates) {
        toast.error(t.mapCoordinatesNotFound)
        return
      }

      submitData = {
        ...formData,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }
    }

    const payload = toCenterPayload(submitData)
    if (isNewCenter) {
      createMutation.mutate(payload)
      return
    }

    updateMutation.mutate(payload)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const toggleList =
    (key: "units" | "hepatitisBay", options: readonly string[]) =>
    (option: string, checked: boolean) =>
      setFormData((prev) => ({
        ...prev,
        [key]: toggleListValue(prev[key], option, checked, options),
      }))
  const toggleUnit = toggleList("units", TREATMENT_UNITS)
  const toggleHepatitisBay = toggleList("hepatitisBay", HEPATITIS_BAYS)

  const setPhoneNumber = (index: number, value: string) =>
    setFormData((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) => (i === index ? value : phone)),
    }))

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
        ? t.coordinatesFound
        : value.trim()
          ? t.pasteMapHint
          : ""
    )
  }

  if (centerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t.loading}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {userRole?.preview && <PreviewBanner label={userRole.preview.label} />}
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-20 -mx-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-lg sm:border sm:px-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild className="size-10 shrink-0">
              <Link to="/dashboard" aria-label={t.backToDashboard}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold sm:text-2xl">
                  {isNewCenter ? t.createCenter : t.editCenter}
                </h1>
                {!isNewCenter && center?.state?.name && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {center.state.name}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {formData.dialysisCenterName || t.centerDetails}
              </p>
            </div>
            <LocaleToggle className="shrink-0" />
            {!isNewCenter && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0 text-destructive hover:text-destructive"
                    aria-label={t.deleteCenter}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.deleteCenterTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.deleteCenterDescription(formData.dialysisCenterName || t.thisCenter)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                    >
                      {t.delete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <form id="center-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Building2 className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">{t.basicInfo}</CardTitle>
                  <CardDescription>{t.basicInfoDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="dialysisCenterName">
                    {t.centerName}
                  </FieldLabel>
                  <Input
                    id="dialysisCenterName"
                    name="dialysisCenterName"
                    value={formData.dialysisCenterName}
                    onChange={handleInputChange}
                    placeholder={t.centerNamePlaceholder}
                  />
                </Field>
                <Field className="md:max-w-[calc(50%-0.5rem)]">
                  <FieldLabel htmlFor="sector">{t.sector}</FieldLabel>
                  <Select
                    value={formData.sector}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, sector: value }))
                    }
                  >
                    <SelectTrigger id="sector" className="w-full">
                      <SelectValue placeholder={t.sectorPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {t.sectors[sector]}
                        </SelectItem>
                      ))}
                      {formData.sector &&
                        !SECTORS.includes(formData.sector as (typeof SECTORS)[number]) && (
                          <SelectItem value={formData.sector}>{formData.sector}</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">{t.description}</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t.descriptionPlaceholder}
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
                  <CardTitle className="text-base sm:text-lg">{t.contactInfo}</CardTitle>
                  <CardDescription>{t.contactInfoDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="phoneNumber-0">{t.phoneNumbers}</FieldLabel>
                  <div className="flex flex-col gap-2">
                    {formData.phoneNumbers.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          inputMode="tel"
                          id={`phoneNumber-${index}`}
                          value={phone}
                          onChange={(e) => setPhoneNumber(index, e.target.value)}
                          placeholder={t.phoneNumberPlaceholder}
                        />
                        {formData.phoneNumbers.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            aria-label={t.removePhoneNumber}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit gap-2"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          phoneNumbers: [...prev.phoneNumbers, ""],
                        }))
                      }
                    >
                      <Plus className="size-4" />
                      {t.addPhoneNumber}
                    </Button>
                  </div>
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="email">{t.email}</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t.emailPlaceholder}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="website">{t.website}</FieldLabel>
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
                  <CardTitle className="text-base sm:text-lg">{t.leadFollowUp}</CardTitle>
                  <CardDescription>{t.leadFollowUpDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="whatsappPicName">{t.picName}</FieldLabel>
                    <Input
                      id="whatsappPicName"
                      name="whatsappPicName"
                      value={formData.whatsappPicName}
                      onChange={handleInputChange}
                      placeholder={t.picNamePlaceholder}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="whatsappPicPhoneNumber">
                      {t.picWhatsapp}
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
                  {t.leadEmailNote}
                </p>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">{t.location}</CardTitle>
                  <CardDescription>{t.locationDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="address">{t.address}</FieldLabel>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder={t.addressPlaceholder}
                    rows={3}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="googleMapsEmbed">
                    {t.googleMapsEmbed}
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
                    placeholder={t.googleMapsEmbedPlaceholder}
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.latitude != null && formData.longitude != null
                      ? t.wazeCoordinates(formData.latitude, formData.longitude)
                      : mapMessage || t.wazeHint}
                  </p>
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="town">{t.town}</FieldLabel>
                    <Input
                      id="town"
                      name="town"
                      value={formData.town}
                      onChange={handleInputChange}
                      placeholder={t.townPlaceholder}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="stateId">{t.state}</FieldLabel>
                    <Select
                      value={formData.stateId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, stateId: value }))
                      }
                    >
                      <SelectTrigger id="stateId" className="w-full">
                        <SelectValue placeholder={t.statePlaceholder} />
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
                  <CardTitle className="text-base sm:text-lg">{t.staffInfo}</CardTitle>
                  <CardDescription>{t.staffInfoDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="drInCharge">
                      {t.drInCharge}
                    </FieldLabel>
                    <Input
                      id="drInCharge"
                      name="drInCharge"
                      value={formData.drInCharge}
                      onChange={handleInputChange}
                      placeholder={t.drInChargePlaceholder}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="drInChargeTel">
                      {t.drInChargeTel}
                    </FieldLabel>
                    <Input
                      inputMode="tel"
                      id="drInChargeTel"
                      name="drInChargeTel"
                      value={formData.drInChargeTel}
                      onChange={handleInputChange}
                      placeholder={t.drInChargeTelPlaceholder}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="panelNephrologist">
                    {t.panelNephrologist}
                  </FieldLabel>
                  <Input
                    id="panelNephrologist"
                    name="panelNephrologist"
                    value={formData.panelNephrologist}
                    onChange={handleInputChange}
                    placeholder={t.panelNephrologistPlaceholder}
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="centreManager">
                      {t.centreManager}
                    </FieldLabel>
                    <Input
                      id="centreManager"
                      name="centreManager"
                      value={formData.centreManager}
                      onChange={handleInputChange}
                      placeholder={t.centreManagerPlaceholder}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="centreCoordinator">
                      {t.centreCoordinator}
                    </FieldLabel>
                    <Input
                      id="centreCoordinator"
                      name="centreCoordinator"
                      value={formData.centreCoordinator}
                      onChange={handleInputChange}
                      placeholder={t.centreCoordinatorPlaceholder}
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
                  <CardTitle className="text-base sm:text-lg">{t.facilities}</CardTitle>
                  <CardDescription>{t.facilitiesDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <CheckboxGroup
                    id="units"
                    label={t.units}
                    hint={t.unitsHint}
                    options={TREATMENT_UNITS}
                    labels={t.unitOptions}
                    value={formData.units}
                    onToggle={toggleUnit}
                  />
                  <CheckboxGroup
                    id="hepatitisBay"
                    label={t.hepatitisBay}
                    hint={t.hepatitisBayHint}
                    options={HEPATITIS_BAYS}
                    labels={{ "Hep B": "Hepatitis B", "Hep C": "Hepatitis C" }}
                    value={formData.hepatitisBay}
                    onToggle={toggleHepatitisBay}
                  />
                </div>
                <Field>
                  <FieldLabel htmlFor="benefits">{t.benefits}</FieldLabel>
                  <Textarea
                    id="benefits"
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleInputChange}
                    placeholder={t.benefitsPlaceholder}
                    rows={3}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <ListChecks className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base sm:text-lg">{t.listingDetails}</CardTitle>
                  <CardDescription>{t.listingDetailsDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="sessionSlots">{t.sessionSlots}</FieldLabel>
                  <Textarea
                    id="sessionSlots"
                    name="sessionSlots"
                    value={formData.sessionSlots}
                    onChange={handleInputChange}
                    placeholder={t.sessionSlotsPlaceholder}
                    rows={3}
                  />
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    id="perkesoPanel"
                    checked={formData.perkesoPanel}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, perkesoPanel: checked }))
                    }
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="perkesoPanel">{t.perkesoPanel}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t.perkesoPanelHint}
                    </p>
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </form>

        {isNewCenter ? (
          <Card>
            <CardHeader className="px-4 py-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">{t.additionalDetails}</CardTitle>
              <CardDescription>
                {t.additionalDetailsDescription}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {userRole?.role === "superadmin" && center && (
              <PlanSection
                key={[center.plan, center.planEndsAt, center.earlybird, center.verifiedAt].join("|")}
                center={center}
              />
            )}
            {userRole?.role === "superadmin" && (
              <IntakeLeadsSection centerId={centerId} />
            )}
            <OperatingHoursSection centerId={centerId} />
            <FaqSection centerId={centerId} />
          </>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <p className="flex-1 text-sm text-muted-foreground" aria-live="polite">
            {isDirty ? t.unsavedChanges : isNewCenter ? "" : t.allChangesSaved}
          </p>
          <Button
            type="submit"
            form="center-form"
            disabled={isSubmitDisabled}
            className="h-11 gap-2 px-5"
          >
            <Save className="size-4" />
            {saveButtonText}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CheckboxGroup<T extends string>({
  id,
  label,
  hint,
  options,
  labels,
  value,
  onToggle,
}: {
  id: string
  label: string
  hint: string
  options: readonly T[]
  labels: Record<T, string>
  value: string
  onToggle: (option: T, checked: boolean) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {options.map((option) => (
        <Label key={option} className="flex h-9 items-center gap-3 font-normal">
          <Checkbox
            id={`${id}-${option}`}
            checked={hasListValue(value, option)}
            onCheckedChange={(checked) => onToggle(option, checked === true)}
          />
          {labels[option]}
        </Label>
      ))}
      <p className="text-sm text-muted-foreground">{hint}</p>
    </fieldset>
  )
}

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

type CenterData = Awaited<ReturnType<typeof getCenterById>>

function PlanSection({ center }: { center: CenterData }) {
  const queryClient = useQueryClient()
  const t = useCopy(COPY)
  const [plan, setPlan] = useState(center.plan)
  const [planEndsOn, setPlanEndsOn] = useState(toMytDayInput(center.planEndsAt))
  const [earlybird, setEarlybird] = useState(center.earlybird)

  const { data: seats } = useQuery({
    queryKey: ["earlybirdSeats"],
    queryFn: () => getEarlybirdSeats(),
  })

  const saveMutation = useMutation({
    mutationFn: (data: Omit<Parameters<typeof updateCenterPlan>[0]["data"], "id">) =>
      updateCenterPlan({ data: { id: center.id, ...data } }),
    onSuccess: () => {
      toast.success(t.planUpdated)
      queryClient.invalidateQueries({ queryKey: ["center", center.id] })
      queryClient.invalidateQueries({ queryKey: ["centers"] })
      queryClient.invalidateQueries({ queryKey: ["earlybirdSeats"] })
    },
    onError: (error) => toast.error(error.message || t.updatePlanFailed),
  })

  const seatsFull = !!seats && seats.used >= seats.total && !center.earlybird
  const active = isPlanActive(center)

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CreditCard className="size-5 text-primary" />
          {t.plan}
          {active ? (
            <Badge>Pro</Badge>
          ) : (
            <Badge variant="secondary">
              {center.plan === "pro" ? t.proExpired : "Asas"}
            </Badge>
          )}
          {center.verifiedAt && (
            <Badge variant="outline">
              <BadgeCheck />
              {t.verified}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{t.planDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="plan">{t.plan}</FieldLabel>
            <Select value={plan} onValueChange={(value) => setPlan(value as typeof plan)}>
              <SelectTrigger id="plan" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asas">{t.asasFree}</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="planEndsOn">{t.planEndsOn}</FieldLabel>
            <Input
              id="planEndsOn"
              type="date"
              value={planEndsOn}
              onChange={(e) => setPlanEndsOn(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {t.planEndsOnHint}
            </p>
          </Field>
        </div>
        <Field orientation="horizontal">
          <div className="flex items-center gap-3">
            <Switch
              id="earlybird"
              checked={earlybird}
              disabled={seatsFull && !earlybird}
              onCheckedChange={setEarlybird}
            />
            <Label htmlFor="earlybird">Earlybird</Label>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {seats
              ? t.earlybirdSeats(seats.used, seats.total, seatsFull)
              : t.loadingSeats}
          </p>
        </Field>
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
          <Button
            onClick={() =>
              saveMutation.mutate({
                plan,
                planEndsAt: planEndsOn ? endOfMytDay(planEndsOn) : null,
                earlybird,
                verified: !!center.verifiedAt,
              })
            }
            disabled={saveMutation.isPending}
            className="h-10"
          >
            {saveMutation.isPending ? t.saving : t.savePlan}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              saveMutation.mutate({
                plan: center.plan,
                planEndsAt: center.planEndsAt,
                earlybird: center.earlybird,
                verified: !center.verifiedAt,
              })
            }
            disabled={saveMutation.isPending}
            className="h-10"
          >
            <BadgeCheck className="size-4" />
            {center.verifiedAt ? t.unverify : t.markVerified}
          </Button>
          {center.verifiedAt && (
            <span className="text-sm text-muted-foreground">
              {t.verifiedOn(toMytDayInput(center.verifiedAt))}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function IntakeLeadsSection({ centerId }: { centerId: string }) {
  const t = useCopy(COPY)
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["intakeLeads", centerId],
    queryFn: () => getIntakeLeads({ data: { centerId, limit: 20 } }),
  })

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MessageCircle className="size-5 text-primary" />
          {t.intakeLeads}
        </CardTitle>
        <CardDescription>
          {t.intakeLeadsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t.loadingLeads}
          </div>
        ) : (
          <IntakeLeadList
            leads={leads}
            emptyMessage={t.noLeads}
            showCenter={false}
          />
        )}
      </CardContent>
    </Card>
  )
}

function OperatingHoursSection({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient()
  const t = useCopy(COPY)
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
      toast.success(t.hoursSaved)
      queryClient.invalidateQueries({
        queryKey: ["operatingHours", centerId],
      })
    },
    onError: (error) =>
      toast.error(error.message || t.saveHoursFailed),
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
          {t.operatingHours}
        </CardTitle>
        <CardDescription>
          {t.operatingHoursDescription}
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
                {t.days[h.dayOfWeek]}
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={h.isClosed}
                  onCheckedChange={(checked) =>
                    updateDay(h.dayOfWeek, "isClosed", checked)
                  }
                />
                <Label className="text-sm">{t.closed}</Label>
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
              <span className="text-sm text-muted-foreground">{t.to}</span>
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
          {saveMutation.isPending ? t.saving : t.saveHours}
        </Button>
      </CardContent>
    </Card>
  )
}

function FaqSection({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient()
  const t = useCopy(COPY)
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
      toast.success(t.faqAdded)
      setNewQuestion("")
      setNewAnswer("")
      invalidateFaqs()
    },
    onError: (error) => toast.error(error.message || t.addFaqFailed),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { faqId: string; question: string; answer: string }) =>
      updateFaq({ data }),
    onSuccess: () => {
      toast.success(t.faqUpdated)
      setEditingId(null)
      invalidateFaqs()
    },
    onError: (error) => toast.error(error.message || t.updateFaqFailed),
  })

  const deleteMutation = useMutation({
    mutationFn: (faqId: string) => deleteFaq({ data: { faqId } }),
    onSuccess: () => {
      toast.success(t.faqDeleted)
      invalidateFaqs()
    },
    onError: (error) => toast.error(error.message || t.deleteFaqFailed),
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
          {t.faqs}
        </CardTitle>
        <CardDescription>
          {t.faqsDescription}
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
                      placeholder={t.question}
                    />
                    <Textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      placeholder={t.answer}
                      rows={3}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(faq.id)}
                        disabled={updateMutation.isPending}
                      >
                        {t.save}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        {t.cancel}
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
                        {t.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(faq.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {t.delete}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">{t.addNewFaq}</p>
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={t.question}
          />
          <Textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder={t.answer}
            rows={3}
          />
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || !newQuestion.trim() || !newAnswer.trim()}
          >
            {createMutation.isPending ? t.adding : t.addFaq}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
