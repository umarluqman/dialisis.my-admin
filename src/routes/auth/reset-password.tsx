import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LocaleToggle } from "@/components/locale-toggle"
import { defineCopy, useCopy } from "@/lib/i18n"

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
})

const COPY = defineCopy({
  en: {
    title: "Password Removed",
    description: "Use your email address to receive a one-time sign-in code.",
    signIn: "Sign in with email code",
  },
  ms: {
    title: "Kata laluan dibuang",
    description: "Gunakan alamat e-mel anda untuk menerima kod log masuk sekali guna.",
    signIn: "Log masuk dengan kod e-mel",
  },
})

function ResetPasswordPage() {
  const t = useCopy(COPY)

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <LocaleToggle className="absolute top-4 right-4" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
          <CardDescription>
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/auth/sign-in">{t.signIn}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
