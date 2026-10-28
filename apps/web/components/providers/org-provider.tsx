"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useOrganizationsQuery } from "@/lib/query/organizations";
import type { OrganizationListItem } from "@/lib/types";

/**
 * Client UI state for the selected organization.
 * The organization list itself lives in the TanStack Query cache.
 */
interface OrgContextValue {
  organizations: OrganizationListItem[];
  current: OrganizationListItem | null;
  loading: boolean;
  error: string | null;
  switchOrganization: (id: string) => void;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "opspilot:org";

type Listener = () => void;
const listeners = new Set<Listener>();

function emitOrgSelectionChange() {
  for (const listener of listeners) listener();
}

function subscribeOrgSelection(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getStoredOrgId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredOrgId(id: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage failures; selection still works for this session.
  }
  emitOrgSelectionChange();
}

function getServerOrgId(): string | null {
  return null;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { organizations, server, refetch, isPending, isError } =
    useOrganizationsQuery();

  const storedId = useSyncExternalStore(
    subscribeOrgSelection,
    getStoredOrgId,
    getServerOrgId,
  );

  const current =
    (storedId ? organizations.find((org) => org.id === storedId) : undefined) ??
    organizations[0] ??
    null;

  const switchOrganization = useCallback((id: string) => {
    setStoredOrgId(id);
  }, []);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const loading = isPending && organizations.length === 0;
  const errorMessage = isError
    ? (server.error?.message ??
      "Unable to load organizations. Please try again.")
    : null;

  return (
    <OrgContext.Provider
      value={{
        organizations,
        current,
        loading,
        error: errorMessage,
        switchOrganization,
        refresh,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used inside <OrgProvider>");
  }
  return ctx;
}
