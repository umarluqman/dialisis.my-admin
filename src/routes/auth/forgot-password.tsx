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

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
})

const COPY = defineCopy({
  en: {
    title: "Password Removed",
    description: "Dialisis Admin now uses one-time email codes.",
    signIn: "Sign in with email code",
  },
  ms: {
    title: "Kata laluan dibuang",
    description: "Dialisis Admin kini menggunakan kod e-mel sekali guna.",
    signIn: "Log masuk dengan kod e-mel",
  },
})

function ForgotPasswordPage() {
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
