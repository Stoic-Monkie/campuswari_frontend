import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as reportsApi from "../../api/endpoints/reports";
import { ApiError } from "../../api/errors";
import { renderPage, stubGuestSession } from "../../test/utils";
import { ReportDialog } from "./ReportDialog";

vi.mock("../../api/endpoints/reports");
const reports = vi.mocked(reportsApi);

const open = (onClose = vi.fn(), type: "POST" | "COMMENT" | "USER" = "POST") => {
  renderPage(<ReportDialog targetType={type} targetId="t1" onClose={onClose} />, { route: "/" });
  return onClose;
};

beforeEach(() => {
  stubGuestSession();
  reports.createReport.mockResolvedValue({ id: "r1", status: "OPEN" });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ReportDialog", () => {
  it("needs a reason before it can be sent", async () => {
    open();
    const send = screen.getByRole("button", { name: "Send report" });
    expect(send).toBeDisabled();
    await userEvent.setup().click(screen.getByRole("radio", { name: /Spam/ }));
    expect(send).toBeEnabled();
  });

  it("sends the target, the reason and no details when none were written", async () => {
    open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Harassment/ }));
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByText("Thanks for letting us know")).toBeInTheDocument();
    expect(reports.createReport.mock.calls[0]?.[0]).toEqual({ targetType: "POST", targetId: "t1", reason: "HARASSMENT" });
  });

  it("sends trimmed details when they were written", async () => {
    open(vi.fn(), "COMMENT");
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Something else/ }));
    await user.type(screen.getByLabelText(/More details/), "  keeps messaging me  ");
    await user.click(screen.getByRole("button", { name: "Send report" }));
    await screen.findByText("Thanks for letting us know");
    expect(reports.createReport.mock.calls[0]?.[0]).toEqual({
      targetType: "COMMENT",
      targetId: "t1",
      reason: "OTHER",
      details: "keeps messaging me",
    });
  });

  it("treats an already-reported target as a normal success", async () => {
    // The API answers 200 with the original report; the client sees the same shape.
    reports.createReport.mockResolvedValue({ id: "old", status: "OPEN" });
    open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Spam/ }));
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByText("Thanks for letting us know")).toBeInTheDocument();
  });

  it("blocks over-long details", async () => {
    open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Spam/ }));
    fireEvent.change(screen.getByLabelText(/More details/), { target: { value: "x".repeat(501) } });
    expect(screen.getByText("501/500")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send report" })).toBeDisabled();
  });

  it("says when the thing is no longer available", async () => {
    reports.createReport.mockRejectedValue(new ApiError({ status: 404, code: "NOT_FOUND" }));
    open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Spam/ }));
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This post is no longer available.");
  });

  it("shows the server's reason for a 400, such as reporting yourself", async () => {
    reports.createReport.mockRejectedValue(new ApiError({ status: 400, code: "BAD_REQUEST", detail: "You can't report yourself." }));
    open(vi.fn(), "USER");
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Spam/ }));
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You can't report yourself.");
  });

  it("shows the wait when rate limited, and Cancel closes", async () => {
    reports.createReport.mockRejectedValue(new ApiError({ status: 429, code: "RATE_LIMITED", retryAfter: 600 }));
    const onClose = open();
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Spam/ }));
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("10 minutes");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
