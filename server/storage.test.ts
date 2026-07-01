import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { returningRows: [] as any[], selectRows: [] as any[] };
  const insertChain = { values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve(state.returningRows)) })) };
  const updateChain = { set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) };
  const deleteChain = { where: vi.fn(() => Promise.resolve()) };
  const selectChain = {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(state.selectRows)),
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(state.selectRows)),
        then: (resolve: (rows: any[]) => void) => Promise.resolve(state.selectRows).then(resolve),
      })),
    })),
  };
  const db = {
    insert: vi.fn(() => insertChain),
    select: vi.fn(() => selectChain),
    update: vi.fn(() => updateChain),
    delete: vi.fn(() => deleteChain),
  };
  return { state, db, insertChain, updateChain, deleteChain, selectChain };
});

vi.mock("./db", () => ({ db: mocks.db }));

describe("DatabaseStorage", () => {
  let storage: import("./storage").DatabaseStorage;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.state.returningRows = [];
    mocks.state.selectRows = [];
    const mod = await import("./storage");
    storage = new mod.DatabaseStorage();
  });

  it("creates jobs and feedback via insert returning", async () => {
    mocks.state.returningRows = [{ id: "job-1" }];
    await expect(storage.createJob({ toolId: "merge-pdf", status: "processing", inputFiles: [], progress: 0 })).resolves.toEqual({ id: "job-1" });
    expect(mocks.db.insert).toHaveBeenCalled();
    expect(mocks.insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ toolId: "merge-pdf" }));

    mocks.state.returningRows = [{ id: "fb-1", feedback: "great" }];
    await expect(storage.createFeedback({ feedback: "great", email: null, userAgent: null, ipAddress: null })).resolves.toEqual({ id: "fb-1", feedback: "great" });
  });

  it("gets one job or undefined", async () => {
    mocks.state.selectRows = [{ id: "job-1" }];
    await expect(storage.getJob("job-1")).resolves.toEqual({ id: "job-1" });
    expect(mocks.selectChain.from).toHaveBeenCalled();

    mocks.state.selectRows = [];
    await expect(storage.getJob("missing")).resolves.toBeUndefined();
  });

  it("updates status, output, errors, and deletes jobs", async () => {
    await storage.updateJobStatus("job-1", "processing", 30);
    expect(mocks.updateChain.set).toHaveBeenCalledWith({ status: "processing", progress: 30 });

    await storage.updateJobStatus("job-1", "completed");
    expect(mocks.updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", completedAt: expect.any(Date) }));

    await storage.updateJobOutput("job-1", "out.pdf");
    expect(mocks.updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ outputFile: "out.pdf", status: "completed", progress: 100 }));

    await storage.updateJobError("job-1", "boom");
    expect(mocks.updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ error: "boom", status: "failed" }));

    await storage.deleteJob("job-1");
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("returns recent jobs and feedback ordered by creation time", async () => {
    mocks.state.selectRows = [{ id: "a" }, { id: "b" }];
    await expect(storage.getRecentJobs(2)).resolves.toHaveLength(2);
    await expect(storage.getAllFeedback()).resolves.toHaveLength(2);
  });
});
