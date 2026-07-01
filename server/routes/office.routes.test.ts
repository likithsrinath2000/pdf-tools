import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import router from "./office.routes";

describe("office routes", () => {
  it("mounts as an empty informational router", async () => {
    const app = express();
    app.use("/office", router);
    expect((await request(app).get("/office")).status).toBe(404);
  });
});
