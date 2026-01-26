# PDFTools - Complete PDF & Image Manipulation Suite

A lightweight, scalable, and production-ready web application for PDF and image manipulation with 30+ tools. Built with React, Express, PostgreSQL, and powerful file processing libraries.

*Because life is too short to fight with printers.* 🖨️

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

- Compress Image - Optimize image size with visual preview
- Resize Image - Change dimensions with live preview
- Crop Image - Trim to specific area with visual editor
- Rotate Image - Rotate by degrees with preview
- Convert Format - Change image format (JPG, PNG, WebP, TIFF)

### Create Office Documents

- Create Word Doc - Build .docx documents from scratch with rich text editor
- Create Excel - Design spreadsheets (.xlsx) with rows, columns, and formulas
- Create PowerPoint - Build presentations (.pptx) with slides, titles, and content

## Performance Optimizations

This application includes extensive performance optimizations for fast loading and smooth user experience:

### Frontend Optimizations

| Optimization | Description | Benefit |
|-------------|-------------|---------|
| **Code Splitting** | React.lazy() for all pages and tool editors | Smaller initial bundle, faster first load |
| **Service Worker** | Caches static assets (CSS, JS, fonts, images) | Offline support, instant repeat visits |
| **React.memo** | Applied to ToolCard, Footer, and tool-page components | Reduced unnecessary re-renders |
| **TanStack Query** | 5-min staleTime, 30-min cache retention | Fewer API calls, faster data access |
| **Thumbnail Caching** | IndexedDB with 24h expiry, 100 item max | Fast file previews |
| **Cookie Preferences** | 30-day storage for theme, language, recent tools | Personalized experience |

### Backend Optimizations

| Optimization | Description | Benefit |
|-------------|-------------|---------|
| **HTTP Caching** | 1-year cache for static assets with immutable flag | Browser caching maximized |
| **ETag Support** | Conditional requests for unchanged resources | Reduced bandwidth |
| **Modular Routes** | Split into pdf, image, office, job, feedback routes | Better maintainability |
| **Async Processing** | Non-blocking job queue pattern | Handles concurrent users |
| **Auto Cleanup** | Files deleted after 24 hours | Disk space management |

### Code Organization

```
client/src/
├── components/
│   ├── tool-page/          # Modular tool page components
│   │   ├── ToolHeader.tsx
│   │   ├── ToolProgress.tsx
│   │   ├── ToolActions.tsx
│   │   ├── FileList.tsx
│   │   └── useToolProcessing.ts
│   └── tools/              # Tool-specific editors
├── lib/
│   ├── cache.ts            # localStorage caching with TTL
│   ├── preferences.ts      # Cookie-based user preferences
│   └── thumbnailCache.ts   # IndexedDB thumbnail storage
└── hooks/
    └── usePreferences.ts   # User preference management

server/
├── routes/
│   ├── index.ts           # Route aggregator
│   ├── pdf.routes.ts      # PDF processing routes
│   ├── image.routes.ts    # Image processing routes
│   ├── office.routes.ts   # Office document routes
│   ├── job.routes.ts      # Job management routes
│   └── feedback.routes.ts # User feedback routes
└── services/
    ├── pdf.service.ts     # PDF processing logic
    └── office.service.ts  # Office document logic
```

## Technology Stack

### Frontend
- React 19 with TypeScript
- Wouter (lightweight routing)
- TailwindCSS v4
- Shadcn/ui components
- TanStack Query

### Backend
- Node.js 20
- Express 5
- PostgreSQL (Neon)
- Drizzle ORM
- pdf-lib, sharp, libreoffice

### Infrastructure
- Winston (logging with daily rotation)
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
export DATABASE_URL="postgresql://user:pass@localhost:5432/pdftools"
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

## Azure VM Deployment

### Quick Deployment Steps

1. **Provision Azure VM**
   ```bash
   # Recommended: Standard_B2s (2 vCPUs, 4GB RAM) with Ubuntu 22.04 LTS
   ```

2. **Install Dependencies**
   ```bash
   # SSH into your VM
   ssh azureuser@your-vm-ip

   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install system dependencies
   sudo apt install -y ghostscript poppler-utils qpdf imagemagick libreoffice wkhtmltopdf nginx

   # Install PM2 globally
   sudo npm install -g pm2
   ```

3. **Deploy Application**
   ```bash
   # Clone and build
   git clone <repository-url> /opt/pdftools
   cd /opt/pdftools
   npm install
   npm run build

   # Start with PM2 (cluster mode for multi-core)
   pm2 start npm --name "pdftools" -i max -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/pdftools
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Enable and Start**
   ```bash
   sudo ln -s /etc/nginx/sites-available/pdftools /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

### Viewing Metrics on Azure VM

The application exposes Prometheus-compatible metrics at `/api/metrics`. Here's how to view them:

#### Option 1: Direct Access (Quick Check)
```bash
# SSH into your VM and curl the metrics endpoint
curl http://localhost:5000/api/metrics

# Sample output:
# http_request_duration_seconds_bucket{...} 0.045
# pdftools_jobs_total{status="completed"} 150
# pdftools_active_jobs 3
```

#### Option 2: Prometheus + Grafana Setup

1. **Install Prometheus**
   ```bash
   # Download and install Prometheus
   wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
   tar xvfz prometheus-*.tar.gz
   cd prometheus-*

   # Configure prometheus.yml
   cat > prometheus.yml << EOF
   global:
     scrape_interval: 15s

   scrape_configs:
     - job_name: 'pdftools'
       static_configs:
         - targets: ['localhost:5000']
       metrics_path: '/api/metrics'
   EOF

   # Start Prometheus
   ./prometheus --config.file=prometheus.yml &
   ```

2. **Install Grafana**
   ```bash
   sudo apt install -y grafana
   sudo systemctl start grafana-server
   sudo systemctl enable grafana-server
   ```

3. **Access Dashboards**
   - Prometheus: `http://your-vm-ip:9090`
   - Grafana: `http://your-vm-ip:3000` (default: admin/admin)

4. **Create Grafana Dashboard**
   - Add Prometheus as data source (`http://localhost:9090`)
   - Import dashboard or create panels with queries:
     - Request rate: `rate(http_request_duration_seconds_count[5m])`
     - Response time: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
     - Active jobs: `pdftools_active_jobs`
     - Jobs completed: `pdftools_jobs_total{status="completed"}`

#### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | Request latency by method, route, status |
| `pdftools_jobs_total` | Counter | Total jobs by status (completed, failed) |
| `pdftools_active_jobs` | Gauge | Currently processing jobs |
| `pdftools_file_size_bytes` | Histogram | Uploaded file sizes |

### Health Monitoring

```bash
# Check application health
curl http://localhost:5000/api/health

# Response:
# {"status":"ok","timestamp":"2024-01-26T12:00:00Z","database":"connected","uptime":86400}

# View PM2 status
pm2 status

# View application logs
pm2 logs pdftools --lines 100
```

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with database status |
| `/api/metrics` | GET | Prometheus metrics |
| `/api/jobs` | POST | Create processing job |
| `/api/jobs/:id` | GET | Get job status |
| `/api/jobs/:id/download` | GET | Download processed file |
| `/api/jobs/:id` | DELETE | Delete job and files |
| `/api/feedback` | POST | Submit user feedback |
| `/api/feedback` | GET | List all feedback |

## Project Structure

```
pdftools/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── lib/          # Utilities & API client
│   │   └── hooks/        # Custom React hooks
│   └── public/
│       └── sw.js         # Service worker
├── server/               # Express backend
│   ├── routes/           # Modular API routes
│   ├── services/         # Processing services
│   ├── storage.ts        # Database layer
│   ├── logger.ts         # Winston logging
│   └── metrics.ts        # Prometheus metrics
├── shared/               # Shared types & schemas
│   └── schema.ts         # Drizzle database schema
├── feedback/             # User feedback storage
├── uploads/              # Temporary file storage
└── logs/                 # Application logs
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `UPLOADS_DIR` | File upload directory | ./uploads |
| `LOGS_DIR` | Log files directory | ./logs |
| `FILE_MAX_AGE_HOURS` | Hours before file deletion | 24 |
| `CLEANUP_INTERVAL_MINUTES` | Cleanup check interval | 60 |
| `LOG_LEVEL` | Logging verbosity | info |

## Security

- HTTPS enforced (production)
- Rate limiting per IP
- File size limits (100MB default)
- CORS configuration
- Security headers (X-Frame-Options, CSP, etc.)
- Files deleted after processing
- No permanent storage of user data
- Environment variable secrets

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

Built with:
- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing
- [LibreOffice](https://www.libreoffice.org/) - Office document conversion
- [Ghostscript](https://www.ghostscript.com/) - PDF compression
- [Shadcn/ui](https://ui.shadcn.com/) - UI components

---

**Made with ❤️ by the PDFTools Team**

*If your PDFs could talk, they'd thank us. But they can't, so we'll settle for your feedback!*
