import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount any React trees and clear the jsdom document after every client test.
// Without this, DOM rendered by one test can leak into the next when files share
// a worker, causing "multiple elements found" flakes under parallelism.
afterEach(() => {
  cleanup();
});
