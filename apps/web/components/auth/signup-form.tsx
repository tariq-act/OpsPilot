"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LuArrowRight, LuMail, LuUserRound } from "react-icons/lu";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const requirements = [
  {
    id: "length",
    label: "8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "upper",
    label: "1 uppercase",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "1 number",
    test: (value: string) => /\d/.test(value),
  },
] as const;

export function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () =>
      requirements.map((requirement) => ({
        ...requirement,
        met: requirement.test(password),
      })),
    [password],
  );

  const passwordValid = passwordChecks.every((check) => check.met);
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Passwords do not match"
      : undefined;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordValid &&
    confirmPassword.length > 0 &&
    !confirmError &&
    !loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordValid) {
      setError("Password does not meet the requirements.");
      return;
    }
    if (!confirmPassword) {
      setError("Confirm your password.");
      return;
    }
    if (confirmError) return;

    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        fetchOptions: { credentials: "include" },
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to create account.");
        return;
      }

      // New user lands on onboarding to create their first organization.
      router.push("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Create your OpsPilot account
        </CardTitle>
        <CardDescription>
          Set up your account and start managing your business.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <GoogleButton />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              or
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-name">Full name</Label>
            <div className="relative">
              <LuUserRound
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="signup-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="John Smith"
                autoComplete="name"
                required
                className="h-11 rounded-xl pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-email">Work email</Label>
            <div className="relative">
              <LuMail
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="john@company.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <PasswordField
              id="signup-password"
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Create a password"
              autoComplete="new-password"
              required
              disabled={loading}
            />
            <div className="flex flex-wrap gap-2">
              {passwordChecks.map((requirement) => (
                <span
                  key={requirement.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                    requirement.met
                      ? "bg-success/10 text-success ring-success/20"
                      : "bg-muted text-muted-foreground ring-border",
                  )}
                >
                  {requirement.label}
                </span>
              ))}
            </div>
          </div>

          <PasswordField
            id="signup-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
            disabled={loading}
            error={confirmError}
          />

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link
              href="#"
              className="font-medium text-primary hover:text-primary/80"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="#"
              className="font-medium text-primary hover:text-primary/80"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-xl"
            disabled={!canSubmit}
          >
            {loading ? "Creating account…" : "Create account"}
            {!loading && <LuArrowRight data-icon="inline-end" />}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80"
            >
              Log in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
