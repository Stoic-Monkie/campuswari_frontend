import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Menu } from "./Menu";

const setup = () => {
  const onReport = vi.fn();
  const onBlock = vi.fn();
  render(
    <div>
      <Menu
        label="More options"
        items={[
          { label: "Report", onSelect: onReport },
          { label: "Block", onSelect: onBlock, danger: true },
        ]}
      />
      <p>outside</p>
    </div>,
  );
  return { onReport, onBlock, user: userEvent.setup() };
};

describe("Menu", () => {
  it("is closed until opened, and announces its state", async () => {
    const { user } = setup();
    const button = screen.getByRole("button", { name: "More options" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("runs the chosen item and closes", async () => {
    const { user, onBlock, onReport } = setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Block" }));
    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(onReport).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes with Escape and returns focus to the button", async () => {
    const { user } = setup();
    const button = screen.getByRole("button", { name: "More options" });
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("closes when you click elsewhere", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByText("outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("moves between items with the arrow keys", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("menuitem", { name: "Report" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Block" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Report" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Block" })).toHaveFocus();
  });

  it("renders nothing when there are no items", () => {
    const { container } = render(<Menu label="More options" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
