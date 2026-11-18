import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "@/components/search/global-search";
import type { OrganizationListItem, SearchResponse } from "@/lib/types";

const state = vi.hoisted(() => ({
  current: null as OrganizationListItem | null,
}));
vi.mock("@/components/providers/org-provider", () => ({ useOrg: () => state }));

const response: SearchResponse = {
  query: "Alex",
  limitPerGroup: 5,
  groups: [
    {
      type: "customers",
      results: [
        {
          id: "customer-1",
          title: "Alex Customer",
          description: "5551234567 · alex@example.test",
          status: "ACTIVE",
        },
      ],
      hasMore: false,
    },
    {
      type: "serviceRequests",
      results: [
        {
          id: "request-1",
          title: "Repair pump",
          description: "Alex Customer",
          status: "ACCEPTED",
        },
      ],
      hasMore: false,
    },
    {
      type: "jobs",
      results: [
        {
          id: "job-1",
          title: "Inspect pump",
          description: "Alex Customer · Warehouse",
          status: "IN_PROGRESS",
        },
      ],
      hasMore: false,
    },
    {
      type: "technicians",
      results: [
        {
          id: "technician-1",
          title: "Alex Technician",
          description: "EMP-001",
          status: "ACTIVE",
        },
      ],
      hasMore: false,
    },
    {
      type: "invoices",
      results: [
        {
          id: "invoice-1",
          title: "INV-001",
          description: "Alex Customer · USD 100.00",
          status: "SENT",
        },
      ],
      hasMore: true,
    },
  ],
};

function organization(
  id = "org-a",
  role: OrganizationListItem["role"] = "OWNER",
): OrganizationListItem {
  return {
    id,
    role,
    name: id,
    membershipId: `membership-${id}`,
    membershipStatus: "ACTIVE",
    slug: id,
    logo: null,
    phone: null,
    email: null,
    address: null,
    timezone: "UTC",
    currency: "USD",
    createdAt: "",
    updatedAt: "",
  };
}

const fetchMock = vi.fn<typeof fetch>();
const clients: QueryClient[] = [];

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  const tree = () => (
    <QueryClientProvider client={client}>
      <GlobalSearch />
    </QueryClientProvider>
  );
  const result = render(tree());
  return { ...result, rerenderSearch: () => result.rerender(tree()) };
}

async function openAndSearch(term = "Alex") {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Global search" }));
  const input = screen.getByRole("searchbox", { name: "Search records" });
  await user.type(input, term);
  return { user, input };
}

beforeEach(() => {
  state.current = organization();
  fetchMock.mockReset().mockImplementation(async () => Response.json(response));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("global search", () => {
  it("debounces input, trims the query and never searches below two characters", async () => {
    mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Global search" }));
    const input = screen.getByRole("searchbox");
    await user.type(input, " A");
    expect(fetchMock).not.toHaveBeenCalled();
    await user.type(input, "lex ");
    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      new URL(String(fetchMock.mock.calls[0]![0])).searchParams.get("q"),
    ).toBe("Alex");
    await screen.findByRole("link", { name: /Alex Customer.*555/ });
    await user.clear(input);
    await user.type(input, "B");
    expect(screen.getByRole("status").textContent).toContain(
      "Search customers",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("groups results with details and links to all existing detail pages", async () => {
    mount();
    await openAndSearch();
    await screen.findByRole("link", { name: /Alex Customer.*555/ });
    for (const [heading, href] of [
      ["Customers", "/dashboard/customers/customer-1"],
      ["Service requests", "/dashboard/service-requests/request-1"],
      ["Jobs", "/dashboard/jobs/job-1"],
      ["Technicians", "/dashboard/technicians/technician-1"],
      ["Invoices", "/dashboard/invoices/invoice-1"],
    ]) {
      const section = screen.getByRole("region", { name: heading });
      expect(within(section).getByRole("link").getAttribute("href")).toBe(href);
    }
    expect(
      screen.getByText(
        "Showing the first 5 matches. Refine your search for more.",
      ),
    ).toBeTruthy();
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      credentials: "include",
      headers: { "x-organization-id": "org-a" },
      signal: expect.any(AbortSignal),
    });
  });

  it("supports the keyboard shortcut, initial focus, arrow navigation, Escape and focus return", async () => {
    mount();
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "Global search" });
    trigger.focus();
    await user.keyboard("{Control>}k{/Control}");
    const input = screen.getByRole("searchbox");
    await waitFor(() => expect(document.activeElement).toBe(input));
    await user.type(input, "Alex");
    const first = await screen.findByRole("link", {
      name: /Alex Customer.*555/,
    });
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(first);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: /Repair pump/ }),
    );
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(input);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("announces loading while waiting for the backend", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount();
    await openAndSearch();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toContain("Searching");
    await act(async () => resolve(Response.json(response)));
    await screen.findByRole("link", { name: /Alex Customer.*555/ });
  });

  it("shows an empty state for an unmatched query", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...response, groups: [] }));
    mount();
    await openAndSearch();
    await screen.findByText(
      "No results found. Try a different name, title or ID.",
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows backend errors and retries the same search", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: "Server error" }, { status: 500 }),
    );
    mount();
    const { user } = await openAndSearch();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to search right now",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("link", { name: /Alex Customer.*555/ });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, "Your session expired. Sign in again."],
    [403, "You do not have permission to do this."],
  ])(
    "handles access error %s without showing results",
    async (status, message) => {
      fetchMock.mockResolvedValue(
        Response.json({ message: "Denied" }, { status }),
      );
      mount();
      await openAndSearch();
      expect((await screen.findByRole("alert")).textContent).toContain(message);
      expect(screen.queryByRole("region", { name: "Customers" })).toBeNull();
    },
  );

  it("hides previous results immediately when the query becomes too short", async () => {
    mount();
    const { user, input } = await openAndSearch();
    await screen.findByRole("link", { name: /Alex Customer.*555/ });
    await user.clear(input);
    await user.type(input, "a");
    expect(
      screen.queryByRole("link", { name: /Alex Customer.*555/ }),
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps late responses from replacing the latest search", async () => {
    let resolveOld!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolveOld = done;
        }),
    );
    fetchMock.mockResolvedValue(
      Response.json({
        ...response,
        query: "Pump",
        groups: [
          {
            type: "jobs",
            results: [
              {
                id: "pump",
                title: "Pump result",
                description: "Warehouse",
                status: "DRAFT",
              },
            ],
            hasMore: false,
          },
        ],
      }),
    );
    mount();
    const { user, input } = await openAndSearch();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.clear(input);
    await user.type(input, "Pump");
    await screen.findByRole("link", { name: /Pump result/ });
    await act(async () => resolveOld(Response.json(response)));
    expect(
      screen.queryByRole("link", { name: /Alex Customer.*555/ }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: /Pump result/ })).toBeTruthy();
  });

  it("resets the dialog and scopes requests when the organization changes", async () => {
    const view = mount();
    const { user } = await openAndSearch();
    await screen.findByRole("link", { name: /Alex Customer.*555/ });
    state.current = organization("org-b");
    view.rerenderSearch();
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Global search" }));
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(
      screen.queryByRole("link", { name: /Alex Customer.*555/ }),
    ).toBeNull();
    await user.type(input, "Alex");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]![1]?.headers).toMatchObject({
      "x-organization-id": "org-b",
    });
  });

  it("links technicians to their existing job execution page", async () => {
    state.current = organization("org-a", "TECHNICIAN");
    mount();
    await openAndSearch();
    expect(
      (await screen.findByRole("link", { name: /Inspect pump/ })).getAttribute(
        "href",
      ),
    ).toBe("/dashboard/my-work/job-1");
  });

  it("does not render search without an active organization", () => {
    state.current = null;
    mount();
    expect(screen.queryByRole("button", { name: "Global search" })).toBeNull();
  });
});
