import React from 'react';
(globalThis as any).React = React;
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stored: {
    theme: "dark" as const,
    recentTools: ["merge-pdf", "compress-pdf"],
    compressionQuality: 70,
    language: "es",
  },
  getPreferences: vi.fn(),
  setPreferences: vi.fn(),
  addRecentTool: vi.fn(),
}));

vi.mock("@/lib/preferences", () => ({
  DEFAULT_PREFERENCES: {
    theme: "system",
    recentTools: [],
    compressionQuality: 80,
    language: "en",
  },
  getPreferences: mocks.getPreferences,
  setPreferences: mocks.setPreferences,
  addRecentTool: mocks.addRecentTool,
  updatePreference: vi.fn(),
}));

import { usePreferences } from "./usePreferences";

describe("usePreferences", () => {
  beforeEach(() => {
    mocks.getPreferences.mockReturnValue({ ...mocks.stored, recentTools: [...mocks.stored.recentTools] });
    mocks.setPreferences.mockClear();
    mocks.addRecentTool.mockClear();
  });

  it("loads stored preferences on mount", async () => {
    const { result } = renderHook(() => usePreferences());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.theme).toBe("dark");
    expect(result.current.recentTools).toEqual(["merge-pdf", "compress-pdf"]);
  });

  it("updates individual and partial preferences", async () => {
    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.updateTheme("light"));
    expect(result.current.theme).toBe("light");
    expect(mocks.setPreferences).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "light" }));

    act(() => result.current.updateCompressionQuality(150));
    expect(result.current.compressionQuality).toBe(100);

    act(() => result.current.updateCompressionQuality(-5));
    expect(result.current.compressionQuality).toBe(0);

    act(() => result.current.updateLanguage("fr"));
    expect(result.current.language).toBe("fr");

    act(() => result.current.updateAll({ theme: "system", compressionQuality: 55 }));
    expect(result.current.theme).toBe("system");
    expect(result.current.compressionQuality).toBe(55);
  });

  it("tracks recently used tools without duplicates and caps the list", async () => {
    mocks.getPreferences.mockReturnValue({ ...mocks.stored, recentTools: ["a", "b", "c", "d", "e", "f"] });
    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.trackToolUsage("c"));
    expect(mocks.addRecentTool).toHaveBeenCalledWith("c");
    expect(result.current.recentTools).toEqual(["c", "a", "b", "d", "e", "f"]);

    act(() => result.current.trackToolUsage("g"));
    expect(result.current.recentTools).toEqual(["g", "c", "a", "b", "d", "e"]);
  });
});
