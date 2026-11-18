import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest has no globals here, so React Testing Library cannot clean up by itself.
afterEach(() => cleanup());

// jsdom has no object URLs; the photo preview needs them.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => "blob:test-preview";
  URL.revokeObjectURL = () => undefined;
}
