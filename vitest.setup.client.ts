import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Guarantee a clean DOM for every client test. `cleanup()` unmounts React trees
// after each test, but portalled nodes (Radix Dialog/Select/Toast) or DOM from a
// prior test file sharing the same worker can still linger — which caused
// intermittent "multiple elements found" flakes (even failing the deploy gate).
// Explicitly resetting document.body before each test makes isolation
// deterministic regardless of what ran before.
beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
});
