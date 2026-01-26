# PDFTools - Complete PDF & Image Manipulation Suite

A lightweight, scalable, and production-ready web application for PDF and image manipulation with 30+ tools. Built with React, Express, PostgreSQL, and powerful file processing libraries.

## Features

### PDF Tools

**Organize:**
- Merge PDF - Combine multiple PDFs into one
- Split PDF - Separate pages into individual files
- Remove Pages - Delete unwanted pages
- Extract Pages - Pull specific pages out
- Organize PDF - Reorder and rotate pages
- Scan to PDF - Convert images to PDF

**Optimize:**
- Compress PDF - Reduce file size (3 quality levels)
- Repair PDF - Fix corrupted files

**Convert TO PDF:**
- JPG/PNG to PDF
- Word to PDF (.doc, .docx)
- PowerPoint to PDF (.ppt, .pptx)
- Excel to PDF (.xls, .xlsx)
- HTML to PDF

**Convert FROM PDF:**
- PDF to JPG
- PDF to Word
- PDF to PowerPoint
- PDF to Excel

**Security:**
- Protect PDF - Add password protection
- Unlock PDF - Remove password protection
- Sign PDF - Digital signatures

### Image Tools

- Compress Image - Optimize image size
- Resize Image - Change dimensions
- Crop Image - Trim to specific area
- Rotate Image - Rotate by degrees
- Convert Format - Change image format (JPG, PNG, WebP, TIFF)

### Create Office Documents

- Create Word Doc - Build .docx documents from scratch with rich text editor
- Create Excel - Design spreadsheets (.xlsx) with rows, columns, and formulas
- Create PowerPoint - Build presentations (.pptx) with slides, titles, and content

## Technology Stack

### Frontend
- React 19
- Wouter (routing)
- TailwindCSS
- Shadcn/ui components
- TanStack Query

### Backend
- Node.js 20
- Express 5
- PostgreSQL (Neon)
- Drizzle ORM
- pdf-lib, sharp, libreoffice

### Infrastructure
- Winston (logging)
- Prometheus metrics
- PM2 (process management)
- Nginx (reverse proxy)
- Docker support

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- System dependencies (see below)

### System Dependencies

```bash
# Ubuntu/Debian
sudo apt install ghostscript poppler-utils qpdf imagemagick libreoffice wkhtmltopdf

# macOS
brew install ghostscript poppler qpdf imagemagick libreoffice
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pdftools
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Push database schema:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

Visit `http://localhost:5000`

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Create .env file with your secrets
echo "DB_PASSWORD=your_secure_password" > .env
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Build Custom Docker Image

```bash
docker build -t pdftools:latest .
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://... \
  -e SESSION_SECRET=... \
  pdftools:latest
```

## Azure VM Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete Azure VM deployment guide including:

- VM provisioning
- Nginx configuration
- SSL setup with Let's Encrypt
- PM2 cluster mode
- Performance tuning
- Backup strategies
- Monitoring and logging

## Development

### Project Structure

```
pdftools/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── lib/         # Utilities & API client
│   └── index.html
├── server/              # Express backend
│   ├── services/        # PDF/image processing services
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database layer
│   ├── logger.ts        # Winston logging
│   └── metrics.ts       # Prometheus metrics
├── shared/              # Shared types & schemas
│   └── schema.ts        # Drizzle database schema
└── migrations/          # Database migrations
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema
- `npm run check` - TypeScript type checking

### API Endpoints

- `POST /api/jobs` - Create processing job
- `GET /api/jobs/:jobId` - Get job status
- `GET /api/jobs/:jobId/download` - Download processed file
- `DELETE /api/jobs/:jobId` - Delete job and files
- `GET /api/health` - Health check
- `GET /api/metrics` - Prometheus metrics

## Architecture

### File Processing Flow

1. User uploads file(s) via frontend
2. Backend receives files, creates job in database
3. Job processing starts asynchronously
4. Progress updates stored in database
5. Frontend polls for job status
6. Processed file ready for download
7. Files auto-deleted after 24 hours

### Concurrency

- PM2 cluster mode for multi-core utilization
- PostgreSQL connection pooling
- Async job processing (non-blocking)
- Rate limiting via Nginx

### Observability

**Logging:**
- Structured JSON logs with Winston
- Separate error and combined logs
- Request/response logging middleware

**Metrics:**
- Prometheus-compatible metrics endpoint
- HTTP request duration histogram
- Job processing counters
- Active jobs gauge
- File size histograms

**Health Checks:**
- `/api/health` endpoint
- Database connectivity check
- Uptime reporting

## Security

- HTTPS enforced (production)
- Rate limiting per IP
- File size limits (100MB default)
- CORS configuration
- Security headers (X-Frame-Options, CSP, etc.)
- Files deleted after processing
- No permanent storage of user data
- Environment variable secrets

## Performance

### Optimization Techniques

- PM2 cluster mode (all CPU cores)
- PostgreSQL query optimization
- Nginx gzip compression
- File streaming for large uploads
- Async processing (non-blocking)
- Connection pooling

### Tested Capacity

- Single B2s Azure VM: ~50 concurrent users
- Standard_D2s_v3: ~200 concurrent users
- Horizontal scaling supported via load balancer

## Testing

The application includes comprehensive test coverage:

- Unit tests for service layer
- Integration tests for API endpoints
- Load testing scenarios
- Database migration tests

Run tests:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Email: support@pdftools.example.com

## Acknowledgments

Built with:
- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing
- [LibreOffice](https://www.libreoffice.org/) - Office document conversion
- [Ghostscript](https://www.ghostscript.com/) - PDF compression
- [Shadcn/ui](https://ui.shadcn.com/) - UI components

---

**Made with ❤️ by the PDFTools Team**

*Because life is too short to fight with printers.*
