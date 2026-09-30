import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { authClient, signIn } from "@/lib/auth-client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  getInvitationByToken,
  consumeInvitation,
} from "@/core/functions/invitation-functions"
import { z } from "zod"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LocaleToggle } from "@/components/locale-toggle"
import { defineCopy, useCopy } from "@/lib/i18n"

const signUpSearchSchema = z.object({
  invite: z.string().optional(),
})

export const Route = createFileRoute("/auth/sign-up")({
  validateSearch: signUpSearchSchema,
  component: SignUpPage,
})

const COPY = defineCopy({
  en: {
    wrongEmail: "Use the email address this invitation was sent to",
    sendFailed: "Failed to send verification code",
    invalidCode: "Invalid verification code",
    assigned: "Access verified and centers assigned!",
    assignFailed: "Access verified but failed to assign centers",
    validating: "Validating invitation...",
    invalidInvitation: "Invalid Invitation",
    error: "Error",
    invitationUnusable: "This invitation link is invalid, expired, or has already been used.",
    contactAdmin: "Please contact your administrator for a new invitation link.",
    title: "Create Account",
    description: "Enter your information and verify by one-time email code",
    name: "Name",
    email: "Email",
    oneTimeCode: "One-time code",
    verifying: "Verifying...",
    sending: "Sending...",
    verifyCode: "Verify Code",
    sendCode: "Send Code",
    sendAgain: "Send Code Again",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    assignedCenters: "Assigned Centers",
    assignedDescription: (email: string) =>
      `After signing up with ${email}, you will have access to these dialysis centers`,
    noInvitation: "No Invitation",
    needInvitation:
      "You need an invitation link from an administrator to register. Contact your admin to get an invite.",
  },
  ms: {
    wrongEmail: "Gunakan alamat e-mel yang menerima jemputan ini",
    sendFailed: "Gagal menghantar kod pengesahan",
    invalidCode: "Kod pengesahan tidak sah",
    assigned: "Akses disahkan dan pusat telah diberikan!",
    assignFailed: "Akses disahkan tetapi gagal memberikan pusat",
    validating: "Mengesahkan jemputan...",
    invalidInvitation: "Jemputan tidak sah",
    error: "Ralat",
    invitationUnusable: "Pautan jemputan ini tidak sah, tamat tempoh atau telah digunakan.",
    contactAdmin: "Sila hubungi pentadbir anda untuk pautan jemputan baru.",
    title: "Cipta akaun",
    description: "Masukkan maklumat anda dan sahkan dengan kod e-mel sekali guna",
    name: "Nama",
    email: "E-mel",
    oneTimeCode: "Kod sekali guna",
    verifying: "Mengesahkan...",
    sending: "Menghantar...",
    verifyCode: "Sahkan kod",
    sendCode: "Hantar kod",
    sendAgain: "Hantar semula kod",
    haveAccount: "Sudah ada akaun?",
    signIn: "Log masuk",
    assignedCenters: "Pusat yang diberikan",
    assignedDescription: (email: string) =>
      `Selepas mendaftar dengan ${email}, anda boleh mengakses pusat dialisis ini`,
    noInvitation: "Tiada jemputan",
    needInvitation:
      "Anda memerlukan pautan jemputan daripada pentadbir untuk mendaftar. Hubungi pentadbir anda untuk mendapatkan jemputan.",
  },
})

function SignUpPage() {
  const navigate = useNavigate()
  const t = useCopy(COPY)
  const { invite } = Route.useSearch()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const {
    data: invitation,
    isLoading: invitationLoading,
    error: invitationError,
  } = useQuery({
    queryKey: ["invitation", invite],
    queryFn: () => getInvitationByToken({ data: { token: invite! } }),
    enabled: !!invite,
    retry: false,
  })

  const consumeInvitationMutation = useMutation({
    mutationFn: (userId: string) =>
      consumeInvitation({ data: { token: invite!, userId, name } }),
  })

  useEffect(() => {
    if (invitation?.email) {
      setEmail(invitation.email)
    }
  }, [invitation?.email])

  const sendCode = async () => {
    setIsLoading(true)
    setError("")

    if (
      invitation?.email &&
      email.trim().toLowerCase() !== invitation.email.toLowerCase()
    ) {
      setError(t.wrongEmail)
      setIsLoading(false)
      return
    }

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })

    if (result.error) {
      setError(result.error.message ?? t.sendFailed)
      setIsLoading(false)
      return
    }

    setCodeSent(true)
    setIsLoading(false)
  }

  const verifyCode = async () => {
    setIsLoading(true)
    setError("")

    const verificationPayload = {
      email,
      otp,
      name,
    }
    const result = await signIn.emailOtp(verificationPayload)

    if (result.error) {
      setError(result.error.message ?? t.invalidCode)
      setIsLoading(false)
      return
    }

    if (invite && result.data?.user?.id) {
      try {
        await consumeInvitationMutation.mutateAsync(result.data.user.id)
        toast.success(t.assigned)
      } catch {
        toast.error(t.assignFailed)
      }
    }

    navigate({ to: "/dashboard" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (codeSent) {
      await verifyCode()
      return
    }

    await sendCode()
  }

  if (invite && invitationLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <LocaleToggle className="absolute top-4 right-4" />
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t.validating}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invite && invitationError) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <LocaleToggle className="absolute top-4 right-4" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {t.invalidInvitation}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>{t.error}</AlertTitle>
              <AlertDescription>
                {invitationError instanceof Error
                  ? invitationError.message
                  : t.invitationUnusable}
              </AlertDescription>
            </Alert>
            <p className="text-center text-sm text-muted-foreground">
              {t.contactAdmin}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <LocaleToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
            <CardDescription>
              {t.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t.name}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={isLoading || codeSent}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m@example.com"
                  required
                  disabled={isLoading || codeSent || !!invitation?.email}
                />
              </div>
              {codeSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp">{t.oneTimeCode}</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !invite || (codeSent && otp.length !== 6)}
              >
                {isLoading
                  ? codeSent
                    ? t.verifying
                    : t.sending
                  : codeSent
                    ? t.verifyCode
                    : t.sendCode}
              </Button>
              {codeSent && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={sendCode}
                >
                  {t.sendAgain}
                </Button>
              )}
              <p className="text-center text-sm text-muted-foreground">
                {t.haveAccount}{" "}
                <Link
                  to="/auth/sign-in"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t.signIn}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {invitation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.assignedCenters}</CardTitle>
              <CardDescription>
                {t.assignedDescription(invitation.email ?? "")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {invitation.centers.map((center) => (
                  <li
                    key={center?.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="size-2 rounded-full bg-primary" />
                    <span>{center?.dialysisCenterName}</span>
                    {center?.stateName && (
                      <span className="text-muted-foreground">
                        ({center.stateName})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {!invite && (
          <Alert>
            <AlertTitle>{t.noInvitation}</AlertTitle>
            <AlertDescription>
              {t.needInvitation}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
