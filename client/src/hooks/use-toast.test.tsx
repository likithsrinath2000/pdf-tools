import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("use-toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("handles reducer add, update, dismiss, and remove actions", async () => {
    const { reducer } = await import("./use-toast");
    const initial = { toasts: [] as any[] };
    const added = reducer(initial, { type: "ADD_TOAST", toast: { id: "1", title: "One", open: true } });
    expect(added.toasts).toHaveLength(1);

    const limited = reducer(added, { type: "ADD_TOAST", toast: { id: "2", title: "Two", open: true } });
    expect(limited.toasts).toHaveLength(1);
    expect(limited.toasts[0].id).toBe("2");

    const updated = reducer(limited, { type: "UPDATE_TOAST", toast: { id: "2", title: "Updated" } });
    expect(updated.toasts[0].title).toBe("Updated");

    const dismissedOne = reducer(updated, { type: "DISMISS_TOAST", toastId: "2" });
    expect(dismissedOne.toasts[0].open).toBe(false);

    const removedOne = reducer(dismissedOne, { type: "REMOVE_TOAST", toastId: "2" });
    expect(removedOne.toasts).toEqual([]);

    const dismissedAll = reducer({ toasts: [{ id: "a", open: true }, { id: "b", open: true }] as any[] }, { type: "DISMISS_TOAST" });
    expect(dismissedAll.toasts.every((toast) => toast.open === false)).toBe(true);

    expect(reducer(dismissedAll, { type: "REMOVE_TOAST" }).toasts).toEqual([]);
  });

  it("creates, updates, dismisses, and removes toasts after the delay", async () => {
    const { useToast, toast } = await import("./use-toast");
    const { result, unmount } = renderHook(() => useToast());

    let created!: ReturnType<typeof toast>;
    act(() => {
      created = toast({ title: "Saved", description: "Done" });
    });
    expect(result.current.toasts[0]).toMatchObject({ id: created.id, title: "Saved", open: true });

    act(() => {
      created.update({ id: "ignored", title: "Updated", open: true });
    });
    expect(result.current.toasts[0]).toMatchObject({ id: created.id, title: "Updated" });

    act(() => {
      result.current.toasts[0].onOpenChange?.(false);
    });
    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(999_999);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toasts).toEqual([]);
    unmount();
  });

  it("dismisses all active toasts and ignores duplicate remove timers", async () => {
    const { useToast, toast } = await import("./use-toast");
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "First" });
      toast({ title: "Second" });
      result.current.dismiss();
      result.current.dismiss();
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1_000_000);
    });
    expect(result.current.toasts).toEqual([]);
  });
});
