import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logger, logStartup, logRequest } from "./logger";
import { cleanupService } from "./services/cleanup.service";
import compression from "compression";
import helmet from "helmet";
import { rateLimit, cors } from "./middleware/security";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(cors());

if (process.env.NODE_ENV === "production") {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Google Translate widget injects scripts from several Google origins.
        scriptSrc: [
          "'self'", "'unsafe-inline'", "'unsafe-eval'",
          "https://translate.google.com",
          "https://translate.googleapis.com",
          "https://translate-pa.googleapis.com",
          "https://*.googleapis.com",
          "https://*.google.com",
          "https://www.gstatic.com",
        ],
        // Google Fonts stylesheet + Translate widget styles.
        styleSrc: [
          "'self'", "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://www.gstatic.com",
        ],
        imgSrc: [
          "'self'", "data:", "blob:",
          "https://*.gstatic.com",
          "https://*.googleapis.com",
          "https://*.google.com",
        ],
        // Google Fonts + Translate widget font/image assets.
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "https://translate.googleapis.com",
          "https://translate-pa.googleapis.com",
          "https://*.googleapis.com",
        ],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'", "https://www.google.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
}

// Global API rate limit (per IP). Set high enough that a long-running job
// polled every second (~900 requests / 15 min) plus normal browsing/download
// traffic stays well under the cap; the heavy work is throttled separately at
// job creation. Tune via env if needed.
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || "3000", 10),
}));

app.set('trust proxy', 1);

httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;
httpServer.maxHeadersCount = 100;

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    logRequest(req.method, path, duration, res.statusCode);
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  cleanupService.start();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error("Unhandled error:", { error: err.message, stack: err.stack?.substring(0, 500) });

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const env = process.env.NODE_ENV || "development";

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logStartup(port, env);
      log(`serving on port ${port}`);
    },
  );

  // Track shutdown state to prevent duplicate handling
  let isShuttingDown = false;
  
  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) {
      logger.info(`${signal} received again, forcing exit...`);
      process.exit(1);
    }
    
    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);
    cleanupService.stop();
    
    // Force close all connections after 3 seconds
    const forceExitTimeout = setTimeout(() => {
      logger.warn('Graceful shutdown timeout, forcing exit...');
      process.exit(1);
    }, 3000);
    
    httpServer.close(() => {
      clearTimeout(forceExitTimeout);
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Close all existing connections
    httpServer.closeAllConnections?.();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception - Server will restart:', { 
      error: error.message, 
      stack: error.stack?.substring(0, 1000) 
    });
    console.error('FATAL: Uncaught Exception:', error);
    cleanupService.stop();
    httpServer.close(() => {
      process.exit(1);
    });
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', { 
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack?.substring(0, 1000) : undefined
    });
    console.error('WARNING: Unhandled Promise Rejection:', reason);
  });
})();
