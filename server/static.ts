import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const ONE_YEAR_IN_SECONDS = 31536000;

  app.use(
    express.static(distPath, {
      maxAge: ONE_YEAR_IN_SECONDS * 1000,
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        
        if (['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
          res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
          res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`);
        } else if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    })
  );

  app.use("/{*path}", (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
