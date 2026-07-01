import React from 'react';
(globalThis as any).React = React;
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileList } from "./FileList";

describe("FileList", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders image previews, file icons, sizes, and remove buttons", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const files = [
      new File([new Uint8Array(1024 * 1024)], "photo.png", { type: "image/png" }),
      new File([new Uint8Array(512 * 1024)], "document.pdf", { type: "application/pdf" }),
    ];

    render(<FileList files={files} onRemove={onRemove} />);

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("document.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.00 MB")).toBeInTheDocument();
    expect(screen.getByText("0.50 MB")).toBeInTheDocument();
    expect(screen.getByAltText("preview")).toHaveAttribute("src", "blob:preview");
    expect(URL.createObjectURL).toHaveBeenCalledWith(files[0]);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("renders an empty list without controls", () => {
    render(<FileList files={[]} onRemove={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
