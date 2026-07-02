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

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
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
      setError(result.error.message ?? "Failed to send sign-in code")
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
      setError(result.error.message ?? "Invalid sign-in code")
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            {codeSent
              ? "Enter the code sent to your email"
              : "Enter your email to receive a one-time code"}
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
              <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="otp">One-time code</Label>
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
                  ? "Verifying..."
                  : "Sending..."
                : codeSent
                  ? "Verify Code"
                  : "Send Code"}
            </Button>
            {codeSent && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={sendCode}
              >
                Send Code Again
              </Button>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have access?{" "}
              <Link
                to="/auth/sign-up"
                className="text-primary underline-offset-4 hover:underline"
              >
                Use invitation
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
