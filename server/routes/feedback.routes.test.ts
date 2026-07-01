import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    createFeedback: vi.fn(async (data: any) => ({ id: "fb-1", ...data })),
    getAllFeedback: vi.fn(async () => [{ id: "fb-1", feedback: "Nice" }]),
  },
}));
vi.mock("../storage", () => ({ storage: mocks.storage }));

function appWith(router: any) {
  const app = express();
  app.use(express.json());
  app.use("/feedback", router);
  return app;
}

describe("feedback routes", () => {
  let router: any;
  beforeEach(async () => {
    vi.clearAllMocks();
    router = (await import("./feedback.routes")).default;
  });

  it("validates and stores feedback", async () => {
    const app = appWith(router);
    expect((await request(app).post("/feedback").send({ feedback: "   " })).status).toBe(400);
    const res = await request(app).post("/feedback").set("User-Agent", "vitest").send({ feedback: "  Nice  ", email: " a@example.com " });
    expect(res.body).toMatchObject({ success: true, id: "fb-1" });
    expect(mocks.storage.createFeedback).toHaveBeenCalledWith(expect.objectContaining({ feedback: "Nice", email: "a@example.com", userAgent: expect.stringContaining("vitest") }));
  });

  it("rejects feedback and email that exceed length limits", async () => {
    const app = appWith(router);
    const longFeedback = await request(app).post("/feedback").send({ feedback: "a".repeat(5001) });
    expect(longFeedback.status).toBe(400);
    const longEmail = await request(app).post("/feedback").send({ feedback: "hi", email: "a".repeat(255) });
    expect(longEmail.status).toBe(400);
    expect(mocks.storage.createFeedback).not.toHaveBeenCalled();
  });

  it("lists feedback and handles storage failures", async () => {
    const app = appWith(router);
    expect((await request(app).get("/feedback")).body).toEqual({ feedbacks: [{ id: "fb-1", feedback: "Nice" }], count: 1 });

    mocks.storage.createFeedback.mockRejectedValueOnce(new Error("db"));
    expect((await request(app).post("/feedback").send({ feedback: "x" })).status).toBe(500);
    mocks.storage.getAllFeedback.mockRejectedValueOnce(new Error("db"));
    expect((await request(app).get("/feedback")).status).toBe(500);
  });
});
