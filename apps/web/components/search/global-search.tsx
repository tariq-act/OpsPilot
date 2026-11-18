"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Search } from "lucide-react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  useGlobalSearchQuery,
} from "@/lib/query/search";
import type { MemberRole, SearchEntityType } from "@/lib/types";

const GROUPS: Record<SearchEntityType, { label: string; path: string }> = {
  customers: { label: "Customers", path: "customers" },
  serviceRequests: { label: "Service requests", path: "service-requests" },
  jobs: { label: "Jobs", path: "jobs" },
  technicians: { label: "Technicians", path: "technicians" },
  invoices: { label: "Invoices", path: "invoices" },
};

export function GlobalSearch() {
  const { current } = useOrg();
  if (!current) return null;
  return (
    <SearchDialog
      key={`${current.id}:${current.membershipId}:${current.role}`}
      organizationId={current.id}
      membershipId={current.membershipId}
      organizationName={current.name}
      role={current.role}
    />
  );
}

type SearchProps = {
  organizationId: string;
  membershipId: string;
  organizationName: string;
  role: MemberRole;
};

function SearchDialog(props: SearchProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !event.altKey &&
        !event.repeat
      ) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            ref={triggerRef}
            variant="outline"
            className="gap-2 text-muted-foreground"
            aria-label="Global search"
            aria-keyshortcuts="Control+k Meta+k"
          />
        }
      >
        <Search aria-hidden="true" className="size-4" />
        <span>Search</span>
        <kbd className="ml-4 hidden text-xs sm:inline" aria-hidden="true">
          ⌘ / Ctrl K
        </kbd>
      </DialogTrigger>
      {open && (
        <SearchBody
          {...props}
          triggerRef={triggerRef}
          onNavigate={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

function SearchBody({
  organizationId,
  membershipId,
  organizationName,
  role,
  triggerRef,
  onNavigate,
}: SearchProps & {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onNavigate: () => void;
}) {
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const query = input.trim();
  const eligible = query.length >= SEARCH_MIN_LENGTH;
  const debouncing = query !== debouncedQuery;
  const search = useGlobalSearchQuery(
    organizationId,
    membershipId,
    role,
    debouncedQuery,
    eligible && !debouncing,
  );
  const loading =
    eligible && (debouncing || search.isFetching || search.isPending);
  const groups =
    eligible && !loading && !search.isError ? (search.data?.groups ?? []) : [];
  const count = groups.reduce((sum, group) => sum + group.results.length, 0);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(query),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  function navigateResults(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = Array.from(
      resultsRef.current?.querySelectorAll<HTMLAnchorElement>(
        "a[data-search-result]",
      ) ?? [],
    );
    if (!links.length) return;
    const currentIndex = links.findIndex((link) => link === event.target);
    if (event.target !== inputRef.current && currentIndex === -1) return;
    event.preventDefault();
    const next =
      event.key === "ArrowDown"
        ? currentIndex + 1
        : currentIndex === -1
          ? links.length - 1
          : currentIndex - 1;
    if (next < 0 || next >= links.length) inputRef.current?.focus();
    else links[next]?.focus();
  }

  return (
    <DialogContent
      className="gap-4 sm:max-w-2xl"
      initialFocus={inputRef}
      finalFocus={triggerRef}
      onKeyDown={navigateResults}
    >
      <DialogHeader>
        <DialogTitle>Global search</DialogTitle>
        <DialogDescription>
          Search records you can access in {organizationName}.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <label htmlFor={`${hintId}-input`} className="sr-only">
          Search records
        </label>
        <Input
          id={`${hintId}-input`}
          ref={inputRef}
          type="search"
          value={input}
          maxLength={SEARCH_MAX_LENGTH}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search names, titles, phone numbers or IDs…"
          autoComplete="off"
          aria-describedby={hintId}
        />
        <p id={hintId} className="text-xs text-muted-foreground">
          Enter at least {SEARCH_MIN_LENGTH} characters. Use ↑ ↓ or Tab to move
          through results, Enter to open, Esc to close.
        </p>
      </div>
      <div
        ref={resultsRef}
        className="max-h-[55dvh] min-h-24 overflow-y-auto"
      >
        <p
          role="status"
          className={
            groups.length && count
              ? "sr-only"
              : "py-6 text-center text-sm text-muted-foreground"
          }
        >
          {!eligible ? (
            "Search customers, service requests, jobs, technicians and invoices."
          ) : loading ? (
            <>
              <Loader2
                aria-hidden="true"
                className="mr-2 inline size-4 animate-spin motion-reduce:animate-none"
              />
              Searching…
            </>
          ) : search.isError ? (
            ""
          ) : count ? (
            `${count} results found.`
          ) : (
            "No results found. Try a different name, title or ID."
          )}
        </p>
        {eligible && !loading && search.isError && (
          <div role="alert" className="space-y-3 py-6 text-center text-sm">
            <p className="text-destructive">
              {toUserErrorMessage(
                search.error,
                "Unable to search right now. Please try again.",
              )}
            </p>
            {search.error instanceof ApiError && search.error.isUnauthorized ? (
              <Link href="/login" className="underline">
                Sign in again
              </Link>
            ) : (
              <Button variant="outline" onClick={() => void search.refetch()}>
                Try again
              </Button>
            )}
          </div>
        )}
        {groups
          .filter((group) => group.results.length > 0)
          .map((group) => (
            <section
              key={group.type}
              aria-labelledby={`${hintId}-${group.type}`}
              className="mb-4 last:mb-0"
            >
              <h2
                id={`${hintId}-${group.type}`}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                {GROUPS[group.type].label}
              </h2>
              <ul className="space-y-1">
                {group.results.map((result) => (
                  <li key={result.id}>
                    <Link
                      data-search-result
                      href={`/dashboard/${group.type === "jobs" && role === "TECHNICIAN" ? "my-work" : GROUPS[group.type].path}/${encodeURIComponent(result.id)}`}
                      onClick={onNavigate}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {result.status.replaceAll("_", " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {group.hasMore && (
                <p className="px-3 pt-2 text-xs text-muted-foreground">
                  Showing the first {search.data?.limitPerGroup} matches. Refine
                  your search for more.
                </p>
              )}
            </section>
          ))}
      </div>
    </DialogContent>
  );
}
