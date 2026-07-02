import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Password Removed</CardTitle>
          <CardDescription>
            Use your email address to receive a one-time sign-in code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/auth/sign-in">Sign in with email code</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
