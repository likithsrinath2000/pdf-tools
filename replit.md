# PDFTools

## Overview

PDFTools is a comprehensive web application for PDF and image manipulation, offering 30+ tools including merging, splitting, compressing, converting, and editing documents. Built as a full-stack application with React frontend and Express backend, it processes files server-side using specialized libraries for PDF manipulation (pdf-lib), image processing (sharp), and office document conversion (LibreOffice).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library
- **Build Tool**: Vite with custom plugins for meta images and Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **File Handling**: Multer for multipart uploads (100MB limit)
- **Job Processing**: Asynchronous job queue pattern with status polling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Single `processing_jobs` table tracking file processing status, progress, input/output files, and errors
- **File Storage**: Temporary local storage in `uploads/` directory

### Processing Services
- **PDF Operations**: pdf-lib for merging, splitting, page manipulation
- **Image Processing**: Sharp for compression, resize, crop, format conversion
- **Office Conversion**: LibreOffice (headless) for Word/Excel/PowerPoint to PDF conversion

### Monitoring & Observability
- **Logging**: Winston logger with daily rotating files (winston-daily-rotate-file)
- **Log Rotation**: 7-day retention for combined logs, 14-day for errors, auto-compressed
- **Metrics**: Prometheus-compatible metrics via prom-client (request duration, job counts, file sizes)
- **Health Check**: `/api/health` endpoint for infrastructure monitoring
- **Auto-Cleanup**: CleanupService automatically deletes files older than 24 hours

### Build & Deployment
- **Development**: Vite dev server with HMR, tsx for backend
- **Production Build**: esbuild bundles server to CJS, Vite builds client to `dist/public`
- **Deployment Target**: Azure VM with Ubuntu (documented in DEPLOYMENT.md)

## External Dependencies

### Core Services
- **PostgreSQL**: Primary database (required, connection via `DATABASE_URL`)
- **Redis**: Job queue backend via Bull (optional, for production scaling)
- **LibreOffice**: System dependency for office document conversions

### NPM Libraries (Key)
- `pdf-lib`: Pure JavaScript PDF manipulation
- `sharp`: High-performance image processing
- `drizzle-orm` + `drizzle-kit`: Type-safe database ORM
- `bull` + `@bull-board`: Job queue with admin UI
- `winston`: Structured logging
- `prom-client`: Prometheus metrics
- `multer`: File upload handling

### Frontend Libraries
- `@tanstack/react-query`: Async state management
- `framer-motion`: Animations (used in drag-drop reorder)
- `react-dropzone`: File upload zones
- `wouter`: Client routing
- Radix UI primitives via shadcn/ui