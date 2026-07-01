import React from 'react';
(globalThis as any).React = React;
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FileText } from "lucide-react";
import { ToolHeader } from "./ToolHeader";

describe("ToolHeader", () => {
  it("renders the icon, title, description, and color class", () => {
    const { container } = render(
      <ToolHeader icon={FileText} title="Merge PDF" description="Combine PDF files" color="bg-red-500" />,
    );

    expect(screen.getByRole("heading", { name: "Merge PDF" })).toBeInTheDocument();
    expect(screen.getByText("Combine PDF files")).toBeInTheDocument();
    expect(container.querySelector(".bg-red-500 svg")).toBeInTheDocument();
  });
});
