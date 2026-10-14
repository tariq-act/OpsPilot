"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { listOrganizations } from "@/lib/api/organizations";
import type { OrganizationListItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgContextValue {
  /** All organizations the current user belongs to. */
  organizations: OrganizationListItem[];
  /** The currently selected organization, or null while loading. */
  current: OrganizationListItem | null;
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /** Non-null when the fetch failed. */
  error: string | null;
  /** Switch the active organization by id. */
  switchOrganization: (id: string) => void;
  /** Re-fetch the list (e.g. after creating a new organization). */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const OrgContext = createContext<OrgContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const STORAGE_KEY = "opspilot:org";

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    listOrganizations()
      .then(({ organizations: orgs }) => {
        if (ignore) return;
        setOrganizations(orgs);

        const stored = sessionStorage.getItem(STORAGE_KEY);
        const restoredId =
          stored && orgs.some((o) => o.id === stored)
            ? stored
            : (orgs[0]?.id ?? null);
        setCurrentId(restoredId);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(
          err instanceof Error ? err.message : "Failed to load organizations.",
        );
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { organizations: orgs } = await listOrganizations();
      setOrganizations(orgs);

      // Restore previously selected org, or fall back to first.
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const restoredId =
        stored && orgs.some((o) => o.id === stored)
          ? stored
          : (orgs[0]?.id ?? null);
      setCurrentId(restoredId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load organizations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const switchOrganization = useCallback((id: string) => {
    setCurrentId(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  }, []);

  const current = organizations.find((o) => o.id === currentId) ?? null;

  return (
    <OrgContext.Provider
      value={{
        organizations,
        current,
        loading,
        error,
        switchOrganization,
        refresh: fetchOrganizations,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used inside <OrgProvider>");
  }
  return ctx;
}
