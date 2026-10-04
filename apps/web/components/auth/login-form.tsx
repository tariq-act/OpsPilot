"use client"

import Link from "next/link"
import { useState } from "react"
import { LuArrowRight, LuMail } from "react-icons/lu"

import { GoogleButton } from "@/components/auth/google-button"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>
          Sign in to your OpsPilot account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <LuMail
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          <PasswordField
            id="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="remember-me"
              className="flex cursor-pointer items-center gap-2 font-normal text-foreground-secondary"
            >
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              Remember me
            </Label>
            <Link
              href="#"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" className="h-11 w-full rounded-xl">
            Sign in
            <LuArrowRight data-icon="inline-end" />
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              or
            </span>
            <Separator className="flex-1" />
          </div>

          <GoogleButton />

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:text-primary/80"
            >
              Create account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
