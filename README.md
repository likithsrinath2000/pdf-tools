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
- Azure Container Apps (auto-scaling, managed)
- Azure Container Registry (private image storage)
- Azure PostgreSQL Flexible Server
- Winston (logging with daily rotation)
- Prometheus metrics
- Docker multi-stage builds

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- System dependencies (see below)

### System Dependencies

```bash
# Ubuntu/Debian
sudo apt install ghostscript poppler-utils qpdf imagemagick libreoffice wkhtmltopdf

# macOS (using Homebrew)
brew install ghostscript poppler qpdf imagemagick
brew install --cask libreoffice wkhtmltopdf

# Verify installations
gs --version          # Ghostscript
pdftoppm -v           # Poppler
qpdf --version        # QPDF
convert --version     # ImageMagick
soffice --version     # LibreOffice
wkhtmltopdf --version # wkhtmltopdf
```

> **Note for macOS users:**
> - LibreOffice and wkhtmltopdf are installed as casks (GUI applications)
> - You may need to allow them in System Preferences → Security & Privacy on first run
> - If `soffice` is not found, add to PATH: `export PATH="/Applications/LibreOffice.app/Contents/MacOS:$PATH"`

### PostgreSQL Setup (Local Development)

**Option 1: Install directly**

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# macOS
brew install postgresql@14
brew services start postgresql@14
```

Create database and user:

```bash
# Connect to PostgreSQL
sudo -u postgres psql   # Linux
psql postgres           # macOS

# Run these SQL commands:
CREATE DATABASE pdftools;
CREATE USER pdftools_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pdftools TO pdftools_user;
ALTER DATABASE pdftools OWNER TO pdftools_user;
\q
```

Your connection string will be:
```
postgresql://pdftools_user:your_password@localhost:5432/pdftools
```

**Option 2: Use Docker (easiest)**

```bash
docker run -d \
  --name pdftools-postgres \
  -e POSTGRES_USER=pdftools_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=pdftools \
  -p 5432:5432 \
  postgres:15

# Connection string:
# postgresql://pdftools_user:your_password@localhost:5432/pdftools
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

## Azure Container Apps Deployment (Recommended)

Deploy to Azure with auto-scaling, managed infrastructure, and full LibreOffice support.

### Quick Deployment

```bash
# 1. Login to Azure
az login

# 2. Create resource group
az group create --name pdftools-rg --location eastus

# 3. Create PostgreSQL database
az postgres flexible-server create \
  --name pdftools-db-server \
  --resource-group pdftools-rg \
  --location eastus \
  --admin-user pdfadmin \
  --admin-password "YourSecureP@ssw0rd!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --public-access Enabled \
  --yes

az postgres flexible-server db create \
  --resource-group pdftools-rg \
  --server-name pdftools-db-server \
  --database-name pdftools_db

# 4. Create container registry
az acr create \
  --name pdftoolsregistry \
  --resource-group pdftools-rg \
  --sku Basic \
  --admin-enabled true

# 5. Build application and push to registry
npm run build
az acr build \
  --registry pdftoolsregistry \
  --resource-group pdftools-rg \
  --image pdftools:v1 \
  --file Dockerfile .

# 6. Create Container Apps environment
az provider register -n Microsoft.App --wait
az containerapp env create \
  --name pdftools-env \
  --resource-group pdftools-rg \
  --location eastus

# 7. Deploy container app
ACR_PASSWORD=$(az acr credential show --name pdftoolsregistry --query "passwords[0].value" -o tsv)
az containerapp create \
  --name pdftools \
  --resource-group pdftools-rg \
  --environment pdftools-env \
  --image pdftoolsregistry.azurecr.io/pdftools:v1 \
  --registry-server pdftoolsregistry.azurecr.io \
  --registry-username pdftoolsregistry \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8080 \
  --ingress external \
  --cpu 1 --memory 2Gi \
  --min-replicas 1 --max-replicas 5 \
  --secrets "db-url=postgresql://pdfadmin:YourSecureP@ssw0rd!@pdftools-db-server.postgres.database.azure.com:5432/pdftools_db?sslmode=require" \
  --env-vars "NODE_ENV=production" "DATABASE_URL=secretref:db-url"

# 8. Get your app URL
az containerapp show --name pdftools --resource-group pdftools-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv

# 9. Run database migrations locally
export DATABASE_URL="postgresql://pdfadmin:YourSecureP@ssw0rd!@pdftools-db-server.postgres.database.azure.com:5432/pdftools_db?sslmode=require"
npm run db:push
```

### Update Deployment

```bash
npm run build
az acr build --registry pdftoolsregistry --image pdftools:v2 --file Dockerfile .
az containerapp update --name pdftools --resource-group pdftools-rg \
  --image pdftoolsregistry.azurecr.io/pdftools:v2
```

### Monitoring

```bash
# View logs
az containerapp logs show --name pdftools --resource-group pdftools-rg --follow

# Health check
curl https://your-app-url.azurecontainerapps.io/api/health

# Prometheus metrics
curl https://your-app-url.azurecontainerapps.io/api/metrics
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | Request latency by method, route, status |
| `pdftools_jobs_total` | Counter | Total jobs by status (completed, failed) |
| `pdftools_active_jobs` | Gauge | Currently processing jobs |
| `pdftools_file_size_bytes` | Histogram | Uploaded file sizes |

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Local Docker Deployment

### Docker Compose (with PostgreSQL)

```bash
# Create .env file
cat > .env << EOF
DB_PASSWORD=your_secure_password
SESSION_SECRET=$(openssl rand -hex 32)
EOF

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Standalone Docker

```bash
# Build image
npm run build
docker build -t pdftools:latest .

# Run container
docker run -p 8080:8080 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e NODE_ENV=production \
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
