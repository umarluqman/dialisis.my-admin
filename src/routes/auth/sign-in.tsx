import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { authClient, signIn } from "@/lib/auth-client"
import { useState } from "react"
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
import { LocaleToggle } from "@/components/locale-toggle"
import { defineCopy, useCopy } from "@/lib/i18n"

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
})

const COPY = defineCopy({
  en: {
    sendFailed: "Failed to send sign-in code",
    invalidCode: "Invalid sign-in code",
    title: "Sign In",
    enterCode: "Enter the code sent to your email",
    enterEmail: "Enter your email to receive a one-time code",
    email: "Email",
    oneTimeCode: "One-time code",
    verifying: "Verifying...",
    sending: "Sending...",
    verifyCode: "Verify Code",
    sendCode: "Send Code",
    sendAgain: "Send Code Again",
    noAccess: "Don't have access?",
    useInvitation: "Use invitation",
  },
  ms: {
    sendFailed: "Gagal menghantar kod log masuk",
    invalidCode: "Kod log masuk tidak sah",
    title: "Log masuk",
    enterCode: "Masukkan kod yang dihantar ke e-mel anda",
    enterEmail: "Masukkan e-mel anda untuk menerima kod sekali guna",
    email: "E-mel",
    oneTimeCode: "Kod sekali guna",
    verifying: "Mengesahkan...",
    sending: "Menghantar...",
    verifyCode: "Sahkan kod",
    sendCode: "Hantar kod",
    sendAgain: "Hantar semula kod",
    noAccess: "Tiada akses?",
    useInvitation: "Guna jemputan",
  },
})

function SignInPage() {
  const navigate = useNavigate()
  const t = useCopy(COPY)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const sendCode = async () => {
    setIsLoading(true)
    setError("")

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })

    if (result.error) {
      setError(result.error.message ?? t.sendFailed)
    } else {
      setCodeSent(true)
    }

    setIsLoading(false)
  }

  const verifyCode = async () => {
    setIsLoading(true)
    setError("")

    const result = await signIn.emailOtp({
      email,
      otp,
    })

    if (result.error) {
      setError(result.error.message ?? t.invalidCode)
      setIsLoading(false)
      return
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

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <LocaleToggle className="absolute top-4 right-4" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
          <CardDescription>
            {codeSent ? t.enterCode : t.enterEmail}
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
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m@example.com"
                required
                disabled={isLoading || codeSent}
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
              disabled={isLoading || (codeSent && otp.length !== 6)}
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
              {t.noAccess}{" "}
              <Link
                to="/auth/sign-up"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t.useInvitation}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
