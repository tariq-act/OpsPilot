"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LuCircleCheck, LuCircleX, LuLoader } from "react-icons/lu";

import { BrandMark } from "@/components/auth/brand-mark";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { toUserErrorMessage } from "@/lib/query/errors";
import type { AcceptInvitationResponse } from "@/lib/types";
import { queryKeys } from "@/lib/query/keys";

type State = "loading" | "success" | "error";

function AcceptInvitationContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = searchParams.get("token");

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [state, setState] = useState<State>(() =>
    token ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(() =>
    token ? "" : "No invitation token provided.",
  );
  const hasAttempted = useRef(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    if (!token) return;

    if (sessionLoading) return;

    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    const loginUrl = `/login?next=${encodeURIComponent(fullPath)}`;

    if (!session?.user) {
      router.replace(loginUrl);
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    api
      .post<AcceptInvitationResponse>(
        `/invitations/${encodeURIComponent(token)}/accept`,
      )
      .then(async (res) => {
        if (typeof window !== "undefined" && res.membership?.organizationId) {
          sessionStorage.setItem("opspilot:org", res.membership.organizationId);
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.all,
        });
        setState("success");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.isUnauthorized) {
          router.replace(loginUrl);
          return;
        }
        setState("error");
        setErrorMessage(
          toUserErrorMessage(err, "Unable to accept invitation."),
        );
      });
  }, [
    token,
    sessionLoading,
    session,
    pathname,
    searchParams,
    router,
    queryClient,
  ]);

  const queryString = searchParams.toString();
  const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
  const backToLoginUrl = token
    ? `/login?next=${encodeURIComponent(fullPath)}`
    : "/login";

  async function switchAccount() {
    setSwitchingAccount(true);
    try {
      if (session?.user) {
        const result = await authClient.signOut();
        if (result.error) throw new Error("Unable to sign out.");
        queryClient.clear();
      }
      router.replace(backToLoginUrl);
    } catch {
      setErrorMessage("Unable to switch accounts. Please try again.");
      setSwitchingAccount(false);
    }
  }

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
            disabled={switchingAccount}
            onClick={() => void switchAccount()}
          >
            {switchingAccount
              ? "Signing out…"
              : session?.user
                ? "Sign in with another account"
                : "Back to login"}
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
