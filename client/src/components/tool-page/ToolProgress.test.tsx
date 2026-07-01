import React from 'react';
(globalThis as any).React = React;
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolProgress } from "./ToolProgress";

describe("ToolProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders server-side processing progress", () => {
    render(<ToolProgress stage="processing" progress={42.4} error={null} color="bg-blue-500" />);

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Processing..." })).toBeInTheDocument();
    expect(screen.getByText("Hold tight, this won't take long.")).toBeInTheDocument();
  });

  it("renders and rotates client-side processing messaging", () => {
    render(<ToolProgress stage="processing" progress={10} error={null} color="bg-green-500" isClientSide />);

    expect(screen.getByText("Processing in your browser")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Local Processing" })).toBeInTheDocument();
    expect(screen.getByText("Your browser is flexing its muscles! 💪")).toBeInTheDocument();
    expect(screen.getByText("Your files stay on your device - nothing uploaded to servers")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("No servers were harmed in this operation 🌱")).toBeInTheDocument();
  });

  it("renders download states with and without local badge", () => {
    const { rerender } = render(<ToolProgress stage="download" progress={100} error={null} color="bg-green-500" />);
    expect(document.querySelector(".text-green-600 svg")).toBeInTheDocument();
    expect(screen.queryByText("Processed locally in your browser")).not.toBeInTheDocument();

    rerender(<ToolProgress stage="download" progress={100} error={null} color="bg-green-500" isClientSide />);
    expect(screen.getByText("Processed locally in your browser")).toBeInTheDocument();
  });

  it("renders the error state and null for unsupported stages", () => {
    const { container, rerender } = render(<ToolProgress stage="error" progress={0} error="Exploded" color="bg-red-500" />);

    expect(screen.getByRole("heading", { name: "Oops! Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("Exploded")).toBeInTheDocument();

    rerender(<ToolProgress stage={"upload" as any} progress={0} error={null} color="bg-red-500" />);
    expect(container).toBeEmptyDOMElement();
  });
});
