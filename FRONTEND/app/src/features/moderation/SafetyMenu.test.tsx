import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as blocksApi from "../../api/endpoints/blocks";
import * as reportsApi from "../../api/endpoints/reports";
import { ApiError } from "../../api/errors";
import { makeMe } from "../../test/factories";
import { renderPage, stubGuestSession } from "../../test/utils";
import { SafetyMenu } from "./SafetyMenu";

vi.mock("../../api/endpoints/blocks");
vi.mock("../../api/endpoints/reports");
const meRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../me/useMe", () => ({ useMe: () => ({ data: meRef.current }) }));
const blocks = vi.mocked(blocksApi);
const reports = vi.mocked(reportsApi);

const other = { id: "u-other", username: "other" };
const open = (author = other, onRemoved?: () => void, type: "POST" | "COMMENT" | "USER" = "POST") =>
  renderPage(<SafetyMenu author={author} targetType={type} targetId="t1" {...(onRemoved ? { onRemoved } : {})} />, { route: "/" });

beforeEach(() => {
  stubGuestSession();
  meRef.current = makeMe();
  blocks.blockUser.mockResolvedValue(undefined);
  blocks.listBlocks.mockResolvedValue({ items: [], nextCursor: null });
  reports.createReport.mockResolvedValue({ id: "r1", status: "OPEN" });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("SafetyMenu", () => {
  it("is not shown on your own content", () => {
    open({ id: "u-me", username: "me" });
    expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
  });

  it("is not shown until we know who you are", () => {
    meRef.current = undefined;
    open();
    expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
  });

  it("offers report and block for someone else's post", async () => {
    open();
    await userEvent.setup().click(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("menuitem", { name: "Report post" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Block @other" })).toBeInTheDocument();
  });

  it("words the report item for comments and people", async () => {
    open(other, undefined, "COMMENT");
    await userEvent.setup().click(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("menuitem", { name: "Report comment" })).toBeInTheDocument();
  });

  it("opens the report dialog for the right target", async () => {
    open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Report post" }));
    expect(screen.getByRole("dialog", { name: "Report this post" })).toBeInTheDocument();
  });

  it("asks before blocking, then blocks by user id and reports back", async () => {
    const onRemoved = vi.fn();
    open(other, onRemoved);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Block @other" }));
    const dialog = screen.getByRole("dialog", { name: "Block @other?" });
    expect(dialog).toHaveTextContent(/aren’t told/);
    expect(blocks.blockUser).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Block" }));
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(blocks.blockUser.mock.calls[0]?.[0]).toBe("u-other");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does nothing when blocking is cancelled", async () => {
    open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Block @other" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(blocks.blockUser).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the dialog open and says why when blocking fails", async () => {
    blocks.blockUser.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    const onRemoved = vi.fn();
    open(other, onRemoved);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Block @other" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Block" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That account isn’t available.");
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
