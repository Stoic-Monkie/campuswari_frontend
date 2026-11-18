import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { makePost } from "../../test/factories";
import { PostCard } from "./PostCard";

const qc = new QueryClient();
const shell = (ui: React.ReactNode) => (
  <QueryClientProvider client={qc}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>
);
const wrap = (ui: React.ReactNode) => render(shell(ui));

describe("PostCard", () => {
  it("shows user text as plain text, never as HTML", () => {
    const evil = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const { container } = wrap(<PostCard post={makePost({ id: "1", content: evil })} />);
    expect(screen.getByText(evil)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the author, handle and counts", () => {
    wrap(<PostCard post={makePost({ id: "1", likeCount: 7, commentCount: 3 })} />);
    expect(screen.getByText("Other Person")).toBeInTheDocument();
    expect(screen.getByText(/@other/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like (7 likes)" })).toBeInTheDocument();
    expect(screen.getByLabelText("3 comments")).toBeInTheDocument();
  });

  it("shows the image only when there is one", () => {
    const { container, rerender } = wrap(<PostCard post={makePost({ id: "1" })} />);
    expect(container.querySelector("article img")).toBeNull();
    rerender(shell(<PostCard post={makePost({ id: "1", imageUrl: "https://img.example/a.jpg" })} />));
    expect(container.querySelector("article img")).toHaveAttribute("src", "https://img.example/a.jpg");
  });

  it("shows delete only when allowed, and reports the click", async () => {
    const onDelete = vi.fn();
    const post = makePost({ id: "1" });
    const { rerender } = wrap(<PostCard post={post} canDelete={false} onDelete={onDelete} />);
    expect(screen.queryByRole("button", { name: "Delete post" })).toBeNull();
    rerender(shell(<PostCard post={post} canDelete onDelete={onDelete} />));
    await userEvent.setup().click(screen.getByRole("button", { name: "Delete post" }));
    expect(onDelete).toHaveBeenCalledWith(post);
  });
});
