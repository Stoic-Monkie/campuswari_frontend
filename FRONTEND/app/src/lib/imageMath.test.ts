import { describe, expect, it } from "vitest";
import { fitWithin, pickedFileProblem, squareCrop } from "./imageMath";

describe("fitWithin", () => {
  it("leaves small pictures alone", () => {
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });
  it("scales the longer side down and keeps the shape", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000 });
  });
  it("never produces a zero side", () => {
    expect(fitWithin(10000, 1, 100).height).toBe(1);
  });
});

describe("squareCrop", () => {
  it("takes the centred square of a landscape and a portrait picture", () => {
    expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 });
    expect(squareCrop(200, 500)).toEqual({ sx: 0, sy: 150, size: 200 });
    expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 });
  });
});

describe("pickedFileProblem", () => {
  it("accepts ordinary photos, including formats we convert", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) {
      expect(pickedFileProblem({ type, size: 3_000_000 })).toBeNull();
    }
  });
  it("refuses non-images and huge files", () => {
    expect(pickedFileProblem({ type: "application/pdf", size: 10 })).toMatch(/image/);
    expect(pickedFileProblem({ type: "image/jpeg", size: 60 * 1024 * 1024 })).toMatch(/too large/);
  });
});
