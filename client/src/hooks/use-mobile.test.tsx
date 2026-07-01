import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  let changeHandler: (() => void) | undefined;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    changeHandler = undefined;
    removeEventListener = vi.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        media: "(max-width: 767px)",
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          changeHandler = handler;
        }),
        removeEventListener,
      })),
    });
  });

  it("reports desktop initially and registers a media query listener", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });

    const { result, unmount } = renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    expect(result.current).toBe(false);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("updates when the viewport crosses the mobile breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 });
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);

    act(() => {
      window.innerWidth = 900;
      changeHandler?.();
    });
    expect(result.current).toBe(false);

    act(() => {
      window.innerWidth = 767;
      changeHandler?.();
    });
    expect(result.current).toBe(true);
  });
});
