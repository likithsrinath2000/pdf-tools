import type { Express } from "express";
import type { Server } from "http";
import { storage } from "../storage";
import { logRequest } from "../logger";
import { register, httpRequestDuration } from "../metrics";
import pdfRoutes from "./pdf.routes";
import jobRoutes from "./job.routes";
import imageRoutes from "./image.routes";
import officeRoutes from "./office.routes";
import feedbackRoutes from "./feedback.routes";

/**
 * Registers all API routes for the application
 * @param httpServer - The HTTP server instance
 * @param app - The Express application instance
 * @returns The HTTP server instance
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  /**
   * Request timing middleware
   * Logs request duration and records metrics for all API requests
   */
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      logRequest(req.method, req.path, duration, res.statusCode);
      httpRequestDuration.observe(
        { method: req.method, route: req.path, status_code: res.statusCode.toString() },
        duration
      );
    });
    next();
  });

  /**
   * @route GET /api/health
   * @description Health check endpoint to verify server and database status
   * @returns {Object} Server health status including uptime and database connection
   */
  app.get("/api/health", async (req, res) => {
    try {
      const dbCheck = await storage.getRecentJobs(1);
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: "connected",
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({ 
        status: "error", 
        timestamp: new Date().toISOString(),
        database: "disconnected"
      });
    }
  });

  /**
   * @route GET /api/metrics
   * @description Prometheus metrics endpoint for monitoring
   * @returns {string} Prometheus-formatted metrics data
   */
  app.get("/api/metrics", async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Mount modular route handlers
  app.use("/api", pdfRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/images", imageRoutes);
  app.use("/api/office", officeRoutes);
  app.use("/api/feedback", feedbackRoutes);

  return httpServer;
}
