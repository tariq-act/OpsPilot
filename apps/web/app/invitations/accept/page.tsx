"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LuCircleCheck, LuCircleX, LuLoader } from "react-icons/lu";

import { BrandMark } from "@/components/auth/brand-mark";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type State = "loading" | "success" | "error";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>(() =>
    token ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(() =>
    token ? "" : "No invitation token provided.",
  );

  useEffect(() => {
    if (!token) return;

    api
      .post(`/invitations/${token}/accept`)
      .then(() => setState("success"))
      .catch((err: unknown) => {
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Unable to accept invitation.",
        );
      });
  }, [token]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-md">
      {state === "loading" && (
        <>
          <LuLoader
            className="mx-auto mb-4 size-10 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="font-medium text-foreground">Accepting invitation…</p>
        </>
      )}

      {state === "success" && (
        <>
          <LuCircleCheck
            className="mx-auto mb-4 size-10 text-success"
            aria-hidden="true"
          />
          <h1 className="mb-2 text-lg font-semibold tracking-tight">
            You&apos;re in!
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Your invitation was accepted. You can now access the organization
            dashboard.
          </p>
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={() => router.replace("/dashboard")}
          >
            Go to dashboard
          </Button>
        </>
      )}

      {state === "error" && (
        <>
          <LuCircleX
            className="mx-auto mb-4 size-10 text-destructive"
            aria-hidden="true"
          />
          <h1 className="mb-2 text-lg font-semibold tracking-tight">
            Invitation failed
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{errorMessage}</p>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl"
            onClick={() => router.replace("/login")}
          >
            Back to login
          </Button>
        </>
      )}
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background-subtle px-4">
      <div className="mb-8">
        <BrandMark />
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-md">
            <LuLoader
              className="mx-auto mb-4 size-10 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="font-medium text-foreground">Loading…</p>
          </div>
        }
      >
        <AcceptInvitationContent />
      </Suspense>
    </div>
  );
}
