import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationSettings } from "./organization-settings";
import { TeamSettings } from "./team-settings";
import { ProfileSettings, SecuritySettings } from "./account-settings";
import { SettingsShell } from "./settings-shell";
import type { OrganizationListItem, Member } from "@/lib/types";
import { queryKeys } from "@/lib/query/keys";

const state = vi.hoisted(() => ({
  current: null as OrganizationListItem | null,
  loading: false,
  error: null,
  refresh: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  listSessions: vi.fn(),
  revokeOtherSessions: vi.fn(),
}));
vi.mock("@/components/providers/org-provider", () => ({ useOrg: () => state }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/settings/general",
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      isPending: false,
      data: {
        user: {
          id: "user-a",
          name: "Alice",
          email: "alice@example.test",
          image: null,
          emailVerified: false,
        },
        session: { id: "current" },
      },
    }),
    updateUser: state.updateUser,
    changePassword: state.changePassword,
    listSessions: state.listSessions,
    revokeOtherSessions: state.revokeOtherSessions,
  },
}));

function org(
  id = "a",
  role: OrganizationListItem["role"] = "OWNER",
): OrganizationListItem {
  return {
    id,
    name: `Business ${id}`,
    slug: `business-${id}`,
    logo: null,
    phone: null,
    email: null,
    address: null,
    timezone: "UTC",
    currency: "USD",
    role,
    membershipStatus: "ACTIVE",
    membershipId: "m-owner",
    createdAt: "",
    updatedAt: "",
  };
}

const owner: Member = {
  id: "m-owner",
  userId: "user-a",
  organizationId: "a",
  userName: "Alice",
  userEmail: "alice@example.test",
  role: "OWNER",
  status: "ACTIVE",
  createdAt: "",
  updatedAt: "",
};
const technician: Member = {
  ...owner,
  id: "m-tech",
  userId: "user-b",
  userName: "Bob",
  userEmail: "bob@example.test",
  role: "TECHNICIAN",
};
const fetchMock = vi.fn<typeof fetch>();

function json(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function setup(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(queryKeys.organizations.list(), {
    organizations: [state.current],
  });
  const result = render(element, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...result, client };
}

beforeEach(() => {
  state.current = org();
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  state.updateUser.mockResolvedValue({ data: { status: true }, error: null });
  state.changePassword.mockResolvedValue({
    data: { status: true },
    error: null,
  });
  state.listSessions.mockResolvedValue({
    data: [
      { id: "current", userAgent: "Current browser", expiresAt: "2027-01-01" },
      { id: "other", userAgent: "Other browser", expiresAt: "2027-01-01" },
    ],
    error: null,
  });
  state.revokeOtherSessions.mockResolvedValue({
    data: { status: true },
    error: null,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("organization settings", () => {
  it("hides organization navigation and blocks direct manager pages for non-managers", () => {
    state.current = org("a", "TECHNICIAN");
    setup(
      <SettingsShell>
        <OrganizationSettings />
      </SettingsShell>,
    );
    expect(screen.getByText("Access restricted")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "General" })).toBeNull();
    expect(screen.getByRole("link", { name: "My Profile" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Security" })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves organization fields to the selected tenant and refreshes its cache", async () => {
    const user = userEvent.setup();
    const updated = { ...org(), name: "New business" };
    fetchMock.mockImplementation(() => json({ organization: updated }));
    const { client } = setup(<OrganizationSettings />);
    await user.clear(screen.getByLabelText("Business name"));
    await user.type(screen.getByLabelText("Business name"), "New business");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Organization settings saved.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/a"),
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          name: "New business",
          slug: "business-a",
          logo: null,
          email: null,
          phone: null,
          address: null,
        }),
      }),
    );
    expect(client.getQueryData(queryKeys.organizations.list())).toEqual({
      organizations: [updated],
    });
  });

  it("clears unsaved fields when switching organizations and confirms currency changes", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() =>
      json({ organization: { ...org("b"), currency: "CAD" } }),
    );
    const { rerender } = setup(<OrganizationSettings preferences />);
    await user.clear(screen.getByLabelText("Default currency"));
    await user.type(screen.getByLabelText("Default currency"), "EUR");
    state.current = org("b");
    rerender(<OrganizationSettings preferences />);
    expect(
      (screen.getByLabelText("Default currency") as HTMLInputElement).value,
    ).toBe("USD");
    await user.clear(screen.getByLabelText("Default currency"));
    await user.type(screen.getByLabelText("Default currency"), "CAD");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await screen.findByText("Organization settings saved.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/b"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ timezone: "UTC", currency: "CAD" }),
      }),
    );
  });
});

describe("team settings", () => {
  it("loads real members and invitations, protects owner controls, and requires confirmation for removal", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url, init) => {
      if (init?.method === "DELETE") return json({ success: true });
      return String(url).endsWith("/members")
        ? json({ members: [owner, technician] })
        : json({ invitations: [] });
    });
    setup(<TeamSettings />);
    const alice = await screen.findByText("Alice (you)");
    const bob = await screen.findByText("Bob");
    expect(within(alice.closest("tr")!).queryByRole("button")).toBeNull();
    const remove = within(bob.closest("tr")!).getByRole("button", {
      name: "Remove",
    });
    await user.click(remove);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
    await user.click(remove);
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await screen.findByText("Team membership updated.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/a/members/m-tech"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates a private invitation link using the existing invitation contract", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url, init) => {
      if (init?.method === "POST")
        return json({ invitation: { token: "private-test-token" } }, 201);
      return String(url).endsWith("/members")
        ? json({ members: [owner] })
        : json({ invitations: [] });
    });
    setup(<TeamSettings />);
    await user.type(screen.getByLabelText("Email address"), "new@example.test");
    await user.selectOptions(screen.getByLabelText("Role"), "DISPATCHER");
    await user.click(screen.getByRole("button", { name: "Create invitation" }));
    const link = (await screen.findByLabelText(
      "Private invitation link",
    )) as HTMLInputElement;
    expect(link.value).toContain(
      "/invitations/accept?token=private-test-token",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/a/invitations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "new@example.test", role: "DISPATCHER" }),
      }),
    );
  });
});

describe("settings error handling", () => {
  it("shows a conflict and retains existing organization cache after a rejected save", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() =>
      json(
        {
          statusCode: 409,
          error: "Conflict",
          message: "Organization slug already taken",
        },
        409,
      ),
    );
    const { client } = setup(<OrganizationSettings />);
    await user.clear(screen.getByLabelText("Organization slug"));
    await user.type(
      screen.getByLabelText("Organization slug"),
      "duplicate-org",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Organization slug already taken",
    );
    expect(client.getQueryData(queryKeys.organizations.list())).toEqual({
      organizations: [org()],
    });
  });
});

describe("personal settings", () => {
  it("confirms other-session revocation and refreshes the session list", async () => {
    const user = userEvent.setup();
    setup(<SecuritySettings />);
    await user.click(
      await screen.findByRole("button", { name: "Sign out other sessions" }),
    );
    expect(state.revokeOtherSessions).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await screen.findByText("Other sessions signed out.");
    expect(state.revokeOtherSessions).toHaveBeenCalledTimes(1);
    expect(state.listSessions.mock.calls.length).toBeGreaterThan(1);
  });
  it("updates the authenticated profile even without an organization", async () => {
    state.current = null;
    const user = userEvent.setup();
    setup(<ProfileSettings />);
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "New name");
    expect(
      (screen.getByLabelText("Email address") as HTMLInputElement).readOnly,
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Profile saved.");
    expect(state.updateUser).toHaveBeenCalledWith({
      name: "New name",
      image: null,
    });
  });

  it("rejects mismatched passwords and confirms a password change with session revocation", async () => {
    const user = userEvent.setup();
    setup(<SecuritySettings />);
    await user.type(screen.getByLabelText("Current password"), "OldPassword1");
    await user.type(screen.getByLabelText("New password"), "NewPassword1");
    await user.type(screen.getByLabelText("Confirm new password"), "Mismatch");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Passwords do not match.")).toBeTruthy();
    expect(state.changePassword).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "NewPassword1",
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(state.changePassword).toHaveBeenCalledWith({
        currentPassword: "OldPassword1",
        newPassword: "NewPassword1",
        revokeOtherSessions: true,
      }),
    );
    await screen.findByText(
      "Password changed. Other sessions have been signed out.",
    );
  });
});
