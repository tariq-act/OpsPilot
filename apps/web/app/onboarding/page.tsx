"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowRight, LuBuilding2 } from "react-icons/lu";

import { BrandMark } from "@/components/auth/brand-mark";
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
import { useCreateOrganizationMutation } from "@/lib/query/organizations";

/** Convert a display name to a URL-safe slug. */
function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [timezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [error, setError] = useState<string | null>(null);
  const createOrganization = useCreateOrganizationMutation();

  const slug = slugOverride || toSlug(name);
  const loading = createOrganization.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await createOrganization.mutateAsync({
        name: name.trim(),
        slug,
        timezone,
        currency: "USD",
      });
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create organization.",
      );
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background-subtle px-4 py-12">
      <div className="mb-8">
        <BrandMark />
      </div>

      <Card className="w-full max-w-md rounded-2xl shadow-md">
        <CardHeader className="gap-2">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <LuBuilding2 className="size-5 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Set up your organization
          </CardTitle>
          <CardDescription>
            Create your business profile to start managing jobs and dispatching
            technicians.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-name">Business name</Label>
              <Input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme HVAC Services"
                autoComplete="organization"
                required
                className="h-11 rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="org-slug">
                URL slug{" "}
                <span className="font-normal text-muted-foreground">
                  (auto-generated)
                </span>
              </Label>
              <Input
                id="org-slug"
                type="text"
                value={slugOverride || slug}
                onChange={(e) =>
                  setSlugOverride(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  )
                }
                placeholder="acme-hvac-services"
                pattern="[a-z0-9-]+"
                required
                className="h-11 rounded-xl font-mono text-sm"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full rounded-xl"
              disabled={loading || !name.trim()}
            >
              {loading ? "Creating…" : "Create organization"}
              {!loading && <LuArrowRight data-icon="inline-end" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
