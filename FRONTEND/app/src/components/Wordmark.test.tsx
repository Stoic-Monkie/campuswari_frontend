import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./Wordmark";

describe("Wordmark", () => {
  it("is announced as CampusWari", () => {
    render(<Wordmark />);
    expect(screen.getByRole("img", { name: "CampusWari" })).toBeInTheDocument();
  });
});
