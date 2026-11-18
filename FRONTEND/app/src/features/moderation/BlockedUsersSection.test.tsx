import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as blocksApi from "../../api/endpoints/blocks";
import { ApiError } from "../../api/errors";
import { renderPage, stubGuestSession } from "../../test/utils";
import { BlockedUsersSection } from "./BlockedUsersSection";

vi.mock("../../api/endpoints/blocks");
const blocks = vi.mocked(blocksApi);

const person = (id: string) => ({ id: `u-${id}`, username: id, displayName: `Person ${id}`, blockedAt: "2026-11-01T00:00:00Z" });
const open = () => renderPage(<BlockedUsersSection />, { route: "/" });

beforeEach(() => stubGuestSession());
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("BlockedUsersSection", () => {
  it("lists blocked people", async () => {
    blocks.listBlocks.mockResolvedValue({ items: [person("ann"), person("bo")], nextCursor: null });
    open();
    expect(await screen.findByText("Person ann")).toBeInTheDocument();
    expect(screen.getByText("@bo")).toBeInTheDocument();
  });

  it("shows an empty message", async () => {
    blocks.listBlocks.mockResolvedValue({ items: [], nextCursor: null });
    open();
    expect(await screen.findByText("You haven’t blocked anyone")).toBeInTheDocument();
  });

  it("unblocks by user id and the person leaves the list", async () => {
    blocks.listBlocks
      .mockResolvedValueOnce({ items: [person("ann"), person("bo")], nextCursor: null })
      .mockResolvedValue({ items: [person("bo")], nextCursor: null });
    blocks.unblockUser.mockResolvedValue(undefined);
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Unblock @ann" }));
    await waitFor(() => expect(screen.queryByText("Person ann")).toBeNull());
    expect(blocks.unblockUser.mock.calls[0]?.[0]).toBe("u-ann");
    expect(screen.getByText("Person bo")).toBeInTheDocument();
  });

  it("pages with the cursor", async () => {
    blocks.listBlocks
      .mockResolvedValueOnce({ items: [person("ann")], nextCursor: "N1" })
      .mockResolvedValueOnce({ items: [person("bo")], nextCursor: null });
    open();
    await screen.findByText("Person ann");
    await userEvent.setup().click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Person bo")).toBeInTheDocument();
    expect(blocks.listBlocks.mock.calls[1]?.[0]).toEqual({ cursor: "N1" });
  });

  it("shows an error with a retry", async () => {
    blocks.listBlocks.mockRejectedValueOnce(new ApiError({ status: 500, code: "INTERNAL_ERROR" }));
    blocks.listBlocks.mockResolvedValueOnce({ items: [person("ann")], nextCursor: null });
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Person ann")).toBeInTheDocument();
  });

  it("tells you when an unblock fails", async () => {
    blocks.listBlocks.mockResolvedValue({ items: [person("ann")], nextCursor: null });
    blocks.unblockUser.mockRejectedValue(new ApiError({ status: 500, code: "INTERNAL_ERROR" }));
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Unblock @ann" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(screen.getByText("Person ann")).toBeInTheDocument();
  });
});
