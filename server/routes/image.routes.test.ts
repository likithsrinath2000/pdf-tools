import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import router from "./image.routes";

describe("image routes", () => {
  it("mounts as an empty informational router", async () => {
    const app = express();
    app.use("/images", router);
    expect((await request(app).get("/images")).status).toBe(404);
  });
});
