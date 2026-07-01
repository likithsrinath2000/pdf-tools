import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiClient: {
    checkPDFEncrypted: vi.fn(),
    createJob: vi.fn(),
    pollJobStatus: vi.fn(),
    getJob: vi.fn(),
    downloadJob: vi.fn(),
    deleteJob: vi.fn(),
  },
  canProcessClientSideAsync: vi.fn(),
  processClientSide: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));
vi.mock("@/lib/clientProcessing", () => ({
  canProcessClientSideAsync: mocks.canProcessClientSideAsync,
  processClientSide: mocks.processClientSide,
  downloadBlob: mocks.downloadBlob,
}));

import { useToolProcessing } from "./useToolProcessing";

const file = (name = "file.pdf", type = "application/pdf", contents = "pdf") =>
  new File([contents], name, { type });

const completedJob = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  toolId: "merge-pdf",
  status: "completed",
  progress: 100,
  outputFile: "out.pdf",
  ...overrides,
});

describe("useToolProcessing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.canProcessClientSideAsync.mockResolvedValue({
      canProcess: false,
      reason: "Server recommended",
      capabilities: { performanceScore: 44, recommendation: "server" },
    });
    mocks.apiClient.checkPDFEncrypted.mockResolvedValue(true);
    mocks.apiClient.createJob.mockResolvedValue({ jobId: "job-1" });
    mocks.apiClient.pollJobStatus.mockImplementation(async (_jobId: string, onProgress: (job: any) => void) => {
      onProgress(completedJob({ status: "processing", progress: 60 }));
      return completedJob();
    });
    mocks.apiClient.getJob.mockResolvedValue(completedJob());
    mocks.apiClient.downloadJob.mockResolvedValue(undefined);
    mocks.apiClient.deleteJob.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("predicts processing mode and resets all state when the tool changes", async () => {
    mocks.canProcessClientSideAsync.mockResolvedValueOnce({
      canProcess: true,
      reason: "Small files",
      capabilities: { performanceScore: 88 },
    });
    const { result, rerender } = renderHook(({ toolId }) => useToolProcessing(toolId), {
      initialProps: { toolId: "merge-pdf" as string | undefined },
    });

    await act(async () => {
      await result.current.handleFilesSelected([file("a.pdf")], "merge-pdf");
    });

    await waitFor(() => expect(result.current.processingPrediction).toMatchObject({
      mode: "client",
      reason: "Small files",
      deviceScore: 88,
    }));

    act(() => {
      result.current.setProcessingOptions({ quality: 10 });
      result.current.setStage("download");
      result.current.setPdfNotEncrypted(true);
    });

    rerender({ toolId: "split-pdf" });

    expect(result.current.stage).toBe("upload");
    expect(result.current.files).toEqual([]);
    expect(result.current.progress).toBe(0);
    expect(result.current.currentJob).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.processingOptions).toEqual({});
    expect(result.current.pdfNotEncrypted).toBe(false);
    expect(result.current.checkingEncryption).toBe(false);
    expect(result.current.processedClientSide).toBe(false);
    expect(result.current.clientResult).toBeNull();
    expect(result.current.processingPrediction).toBeNull();
  });

  it("defaults prediction to server when capability checking fails", async () => {
    mocks.canProcessClientSideAsync.mockRejectedValueOnce(new Error("capability failure"));
    const { result } = renderHook(() => useToolProcessing("merge-pdf"));

    await act(async () => {
      await result.current.handleFilesSelected([file("a.pdf")], "merge-pdf");
    });

    await waitFor(() => expect(result.current.processingPrediction).toEqual({
      mode: "server",
      reason: "Will be processed on our secure servers",
    }));
  });

  it("selects files with max slicing and checks unlock-pdf encryption states", async () => {
    const { result } = renderHook(() => useToolProcessing("unlock-pdf"));
    const files = [file("encrypted.pdf"), file("ignored.pdf")];

    mocks.apiClient.checkPDFEncrypted.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.handleFilesSelected(files, "unlock-pdf", 1);
    });
    expect(result.current.files).toEqual([files[0]]);
    expect(result.current.stage).toBe("files-selected");
    expect(result.current.pdfNotEncrypted).toBe(true);
    expect(result.current.checkingEncryption).toBe(false);

    mocks.apiClient.checkPDFEncrypted.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.handleFilesSelected([file("locked.pdf")], "unlock-pdf", 1);
    });
    expect(result.current.pdfNotEncrypted).toBe(false);

    mocks.apiClient.checkPDFEncrypted.mockRejectedValueOnce(new Error("network"));
    await act(async () => {
      await result.current.handleFilesSelected([file("unknown.pdf")], "unlock-pdf", 1);
    });
    expect(console.error).toHaveBeenCalledWith("Failed to check encryption:", expect.any(Error));
    expect(result.current.checkingEncryption).toBe(false);
  });

  it("appends files, removes files, returns to upload when empty, and reorders", async () => {
    const { result } = renderHook(() => useToolProcessing("merge-pdf"));
    const a = file("a.pdf");
    const b = file("b.pdf");

    await act(async () => {
      await result.current.handleFilesSelected([a], "merge-pdf");
      await result.current.handleFilesSelected([b], "merge-pdf");
    });
    expect(result.current.files.map((f) => f.name)).toEqual(["a.pdf", "b.pdf"]);

    act(() => result.current.handleReorder([b, a]));
    expect(result.current.files.map((f) => f.name)).toEqual(["b.pdf", "a.pdf"]);

    act(() => result.current.removeFile(0));
    expect(result.current.files.map((f) => f.name)).toEqual(["a.pdf"]);
    expect(result.current.stage).toBe("files-selected");

    act(() => result.current.removeFile(0));
    expect(result.current.files).toEqual([]);
    expect(result.current.stage).toBe("upload");
  });

  it("processes client-side successfully, downloads the in-memory result, and deletes by reset", async () => {
    const outputFile = new Blob(["done"], { type: "application/pdf" });
    mocks.canProcessClientSideAsync.mockResolvedValue({
      canProcess: true,
      reason: "Local capable",
      capabilities: { performanceScore: 99, recommendation: "client" },
    });
    mocks.processClientSide.mockImplementation(async (_toolId, _files, _options, onProgress) => {
      onProgress(37);
      return { outputFile, outputFileName: "merged.pdf" };
    });

    const { result } = renderHook(() => useToolProcessing("merge-pdf"));
    await act(async () => {
      await result.current.handleFilesSelected([file("a.pdf")], "merge-pdf");
    });
    act(() => result.current.setProcessingOptions({ order: "reverse" }));

    await act(async () => {
      await result.current.handleProcess("merge-pdf");
    });

    expect(mocks.processClientSide).toHaveBeenCalledWith("merge-pdf", result.current.files, { order: "reverse" }, expect.any(Function));
    expect(result.current.progress).toBe(37);
    expect(result.current.stage).toBe("download");
    expect(result.current.processedClientSide).toBe(true);
    expect(result.current.clientResult).toMatchObject({ outputFile, outputFileName: "merged.pdf" });
    expect(mocks.apiClient.createJob).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleDownload("merge-pdf");
    });
    expect(mocks.downloadBlob).toHaveBeenCalledWith(outputFile, "merged.pdf");

    await act(async () => {
      await result.current.handleDeleteFile();
    });
    expect(mocks.apiClient.deleteJob).not.toHaveBeenCalled();
    expect(result.current.stage).toBe("upload");
    expect(result.current.files).toEqual([]);
  });

  it("falls back from client processing to server processing", async () => {
    mocks.canProcessClientSideAsync.mockResolvedValue({ canProcess: true, reason: "Try local" });
    mocks.processClientSide.mockRejectedValue(new Error("CLIENT_FALLBACK: unsupported option"));

    const { result } = renderHook(() => useToolProcessing("merge-pdf"));
    await act(async () => {
      await result.current.handleFilesSelected([file("a.pdf")], "merge-pdf");
    });
    await waitFor(() => expect(result.current.files).toHaveLength(1));
    await act(async () => {
      await result.current.handleProcess("merge-pdf");
    });

    expect(mocks.apiClient.createJob).toHaveBeenCalledWith("merge-pdf", expect.arrayContaining([
      expect.objectContaining({ name: "a.pdf" }),
    ]), {});
    expect(mocks.apiClient.pollJobStatus).toHaveBeenCalledWith("job-1", expect.any(Function));
    expect(mocks.apiClient.getJob).toHaveBeenCalledWith("job-1");
    expect(result.current.stage).toBe("download");
    expect(result.current.processedClientSide).toBe(false);
    expect(result.current.currentJob).toMatchObject({ id: "job-1", status: "completed" });
  });

  it("stops on real client-side errors", async () => {
    mocks.canProcessClientSideAsync.mockResolvedValue({ canProcess: true, reason: "Try local" });
    mocks.processClientSide.mockRejectedValue(new Error("Bad PDF"));

    const { result } = renderHook(() => useToolProcessing("merge-pdf"));
    await act(async () => {
      await result.current.handleFilesSelected([file("bad.pdf")], "merge-pdf");
      await result.current.handleProcess("merge-pdf");
    });

    expect(result.current.stage).toBe("error");
    expect(result.current.error).toBe("Bad PDF");
    expect(mocks.apiClient.createJob).not.toHaveBeenCalled();
  });

  it("uses server processing, downloads the server result, deletes it, and resets", async () => {
    const { result } = renderHook(() => useToolProcessing("compress-pdf"));

    await act(async () => {
      await result.current.handleFilesSelected([file("server.pdf")], "compress-pdf");
      await result.current.handleProcess("compress-pdf");
    });

    expect(result.current.stage).toBe("download");
    expect(result.current.progress).toBe(60);
    expect(result.current.processedClientSide).toBe(false);

    await act(async () => {
      await result.current.handleDownload("compress-pdf");
    });
    expect(mocks.apiClient.downloadJob).toHaveBeenCalledWith("job-1", expect.stringMatching(/^compress-pdf_\d+\.pdf$/));

    await act(async () => {
      await result.current.handleDeleteFile();
    });
    expect(mocks.apiClient.deleteJob).toHaveBeenCalledWith("job-1");
    expect(result.current.stage).toBe("upload");
    expect(result.current.currentJob).toBeNull();
  });

  it("handles server processing errors, download errors, no-job downloads, and delete failures", async () => {
    const { result } = renderHook(() => useToolProcessing("compress-pdf"));

    await act(async () => {
      await result.current.handleDownload("compress-pdf");
    });
    expect(mocks.apiClient.downloadJob).not.toHaveBeenCalled();

    mocks.apiClient.createJob.mockRejectedValueOnce(new Error("Server down"));
    await act(async () => {
      await result.current.handleFilesSelected([file("server.pdf")], "compress-pdf");
      await result.current.handleProcess("compress-pdf");
    });
    expect(result.current.stage).toBe("error");
    expect(result.current.error).toBe("Server down");

    await act(async () => {
      result.current.setStage("upload");
      result.current.setFiles([file("ok.pdf")]);
    });
    await act(async () => {
      await result.current.handleProcess("compress-pdf");
    });

    mocks.apiClient.downloadJob.mockRejectedValueOnce(new Error("Download failed"));
    await act(async () => {
      await result.current.handleDownload("compress-pdf");
    });
    expect(result.current.error).toBe("Download failed");

    mocks.apiClient.deleteJob.mockRejectedValueOnce(new Error("delete failed"));
    await act(async () => {
      await result.current.handleDeleteFile();
    });
    expect(console.error).toHaveBeenCalledWith("Failed to delete file:", expect.any(Error));
    expect(result.current.stage).toBe("upload");
  });

  it("ignores processing when no tool id is provided and supports manual reset", async () => {
    const { result } = renderHook(() => useToolProcessing(undefined));

    await act(async () => {
      await result.current.handleFilesSelected([file("a.pdf")], "merge-pdf");
      await result.current.handleProcess("");
    });

    expect(result.current.stage).toBe("files-selected");
    expect(mocks.canProcessClientSideAsync).not.toHaveBeenCalled();

    act(() => result.current.handleReset());
    expect(result.current.stage).toBe("upload");
    expect(result.current.files).toEqual([]);
    expect(result.current.processingPrediction).toBeNull();
  });
});
