import React from 'react';
(globalThis as any).React = React;
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateToolActions, DownloadActions, ErrorActions, FilesSelectedActions } from "./ToolActions";

describe("ToolActions", () => {
  it("renders selected-file actions and processing predictions", async () => {
    const user = userEvent.setup();
    const onAddMore = vi.fn();
    const onProcess = vi.fn();
    const { rerender } = render(
      <FilesSelectedActions
        showAddMore
        onAddMore={onAddMore}
        onProcess={onProcess}
        actionText="Merge"
        color="bg-red-500"
        processingPrediction={{ mode: "checking", reason: "Analyzing..." }}
      />,
    );

    expect(screen.getByText("Analyzing your files...")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add more files/i }));
    await user.click(screen.getByRole("button", { name: /merge/i }));
    expect(onAddMore).toHaveBeenCalledTimes(1);
    expect(onProcess).toHaveBeenCalledTimes(1);

    rerender(
      <FilesSelectedActions
        showAddMore={false}
        onAddMore={onAddMore}
        onProcess={onProcess}
        actionText="Compress"
        color="bg-blue-500"
        processingPrediction={{ mode: "client", reason: "Small files", deviceScore: 91 }}
      />,
    );
    expect(screen.queryByRole("button", { name: /add more files/i })).not.toBeInTheDocument();
    expect(screen.getByText("Will process in your browser")).toBeInTheDocument();
    expect(screen.getByText(/Device score: 91\/100/)).toBeInTheDocument();

    rerender(
      <FilesSelectedActions
        showAddMore={false}
        onAddMore={onAddMore}
        onProcess={onProcess}
        actionText="Unlock"
        color="bg-blue-500"
        processingPrediction={{ mode: "server", reason: "Needs qpdf" }}
      />,
    );
    expect(screen.getByText("Will process on server")).toBeInTheDocument();
    expect(screen.getByText("Needs qpdf")).toBeInTheDocument();

    rerender(
      <FilesSelectedActions
        showAddMore={false}
        onAddMore={onAddMore}
        onProcess={onProcess}
        actionText="Run"
        color="bg-blue-500"
        processingPrediction={null}
      />,
    );
    expect(screen.queryByText(/Will process|Analyzing/)).not.toBeInTheDocument();
  });

  it("fires download-stage action callbacks", async () => {
    const user = userEvent.setup();
    const handlers = {
      onDownload: vi.fn(),
      onBackToEdit: vi.fn(),
      onStartOver: vi.fn(),
      onDelete: vi.fn(),
    };
    render(<DownloadActions {...handlers} />);

    expect(screen.getByRole("heading", { name: "Task Completed!" })).toBeInTheDocument();
    await user.click(screen.getByTestId("button-download"));
    await user.click(screen.getByTestId("button-back-to-edit"));
    await user.click(screen.getByTestId("button-start-over"));
    await user.click(screen.getByTestId("button-delete"));

    expect(handlers.onDownload).toHaveBeenCalledTimes(1);
    expect(handlers.onBackToEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onStartOver).toHaveBeenCalledTimes(1);
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows a purged state (no download button) after a server file was downloaded", async () => {
    const user = userEvent.setup();
    const handlers = {
      onDownload: vi.fn(),
      onBackToEdit: vi.fn(),
      onStartOver: vi.fn(),
      onDelete: vi.fn(),
    };
    render(<DownloadActions {...handlers} alreadyDownloaded isClientSide={false} />);

    expect(screen.getByRole("heading", { name: "Downloaded" })).toBeInTheDocument();
    // The dead download button is gone; only start-over / back-to-edit remain.
    expect(screen.queryByTestId("button-download")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-delete")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("button-start-over"));
    expect(handlers.onStartOver).toHaveBeenCalledTimes(1);
  });

  it("keeps the download button for client-side results even after downloading", async () => {
    const handlers = { onDownload: vi.fn(), onBackToEdit: vi.fn(), onStartOver: vi.fn(), onDelete: vi.fn() };
    // Client-side results live in the browser and can be re-downloaded.
    render(<DownloadActions {...handlers} alreadyDownloaded isClientSide />);
    expect(screen.getByRole("heading", { name: "Task Completed!" })).toBeInTheDocument();
    expect(screen.getByTestId("button-download")).toBeInTheDocument();
  });

  it("fires error and create action callbacks and respects disabled state", async () => {
    const user = userEvent.setup();
    const onTryAgain = vi.fn();
    const onProcess = vi.fn();
    const { rerender } = render(<ErrorActions onTryAgain={onTryAgain} />);

    await user.click(screen.getByTestId("button-try-again"));
    expect(onTryAgain).toHaveBeenCalledTimes(1);

    rerender(<CreateToolActions onProcess={onProcess} disabled actionText="Create PDF" color="bg-purple-500" />);
    expect(screen.getByRole("button", { name: /create pdf/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /create pdf/i }));
    expect(onProcess).not.toHaveBeenCalled();

    rerender(<CreateToolActions onProcess={onProcess} disabled={false} actionText="Create PDF" color="bg-purple-500" />);
    await user.click(screen.getByRole("button", { name: /create pdf/i }));
    expect(onProcess).toHaveBeenCalledTimes(1);
  });
});
