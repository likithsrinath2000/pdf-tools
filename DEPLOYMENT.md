# PDFTools Deployment Guide

Complete guide for **local development** and **Azure Container Apps** production deployment.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Production Features](#production-features)
3. [Azure Container Apps Deployment](#azure-container-apps-deployment)
4. [GitHub Actions CI/CD](#github-actions-cicd)
5. [Updating Your App](#updating-your-app)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
7. [Cost Estimation](#cost-estimation)

---

## Local Development

### Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd pdftools

# Install dependencies
npm install

# Set up environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/pdftools"

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

### Building for Production

```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

---

## Production Features

### Log Rotation

PDFTools uses `winston-daily-rotate-file` for automatic log management:

- **Combined logs**: `logs/combined-YYYY-MM-DD.log` (7-day retention)
- **Error logs**: `logs/error-YYYY-MM-DD.log` (14-day retention)
- **Compressed archives**: Old logs are gzipped automatically
- **Max file size**: 50MB per log file

### Automatic File Cleanup

Uploaded and processed files are automatically deleted after 24 hours:

- **Configurable via**: `FILE_MAX_AGE_HOURS` environment variable
- **Cleanup interval**: Every 60 minutes (configurable via `CLEANUP_INTERVAL_MINUTES`)
- **Empty directories** are removed automatically

### Environment Variables

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

---

## Azure Container Apps Deployment

Azure Container Apps provides **full features including LibreOffice** for Office document conversions, with auto-scaling and managed infrastructure.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Cloud                               │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ Container        │    │ Container Apps Environment        │  │
│  │ Registry (ACR)   │───▶│ ┌────────────────────────────┐   │  │
│  │                  │    │ │ pdftools Container App     │   │  │
│  │ pdftools:v1      │    │ │ - Runs your Docker image   │   │  │
│  │ pdftools:v2      │    │ │ - Auto-scales 1-5 replicas │   │  │
│  └──────────────────┘    │ │ - HTTPS ingress            │   │  │
│                          │ └────────────────────────────┘   │  │
│                          └──────────────────────────────────┘  │
│                                         │                       │
│                                         ▼                       │
│                          ┌──────────────────────────────────┐  │
│                          │ PostgreSQL Flexible Server       │  │
│                          │ - pdftools_db database           │  │
│                          │ - Managed backups                │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Prerequisites

- [ ] Azure CLI installed (`az --version` to check)
- [ ] Node.js 20+ installed
- [ ] Logged into Azure (`az login`)

```bash
# Install Azure CLI
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login
az account set --subscription "<your-subscription-id>"
```

---

### Step 1: Build Application Locally

```bash
npm install
npm run build
```

Verify the build:
```bash
ls -la dist/
# Should see index.cjs and public/ folder
```

---

### Step 2: Create Resource Group

```bash
az group create --name pdftools-rg --location eastus
```

---

### Step 3: Create PostgreSQL Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name pdftools-db-server \
  --resource-group pdftools-rg \
  --location eastus \
  --admin-user pdfadmin \
  --admin-password "YourSecureP@ssw0rd123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access Enabled \
  --yes

# Create the database
az postgres flexible-server db create \
  --resource-group pdftools-rg \
  --server-name pdftools-db-server \
  --database-name pdftools_db

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group pdftools-rg \
  --name pdftools-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your local IP (for running migrations)
az postgres flexible-server firewall-rule create \
  --resource-group pdftools-rg \
  --name pdftools-db-server \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

**Save your connection string:**
```
postgresql://pdfadmin:YourSecureP@ssw0rd123!@pdftools-db-server.postgres.database.azure.com:5432/pdftools_db?sslmode=require
```

---

### Step 4: Create Container Registry

```bash
# Create container registry (name must be globally unique, lowercase, no dashes)
az acr create \
  --name pdftoolsregistry \
  --resource-group pdftools-rg \
  --sku Basic \
  --admin-enabled true

# Get the registry credentials
az acr credential show --name pdftoolsregistry --output table
```

---

### Step 5: Build and Push Docker Image

**Option A: Build in Azure (recommended, no Docker required locally)**

```bash
az acr build \
  --registry pdftoolsregistry \
  --resource-group pdftools-rg \
  --image pdftools:v1 \
  --file Dockerfile \
  .
```

**Option B: Build locally with Docker**

```bash
az acr login --name pdftoolsregistry
docker build -t pdftoolsregistry.azurecr.io/pdftools:v1 .
docker push pdftoolsregistry.azurecr.io/pdftools:v1
```

---

### Step 6: Register Container Apps Provider

```bash
az provider register -n Microsoft.App --wait
```

---

### Step 7: Create Container Apps Environment

```bash
az containerapp env create \
  --name pdftools-env \
  --resource-group pdftools-rg \
  --location eastus
```

This takes 2-3 minutes.

---

### Step 8: Deploy the Container App

```bash
# Get ACR password
ACR_PASSWORD=$(az acr credential show --name pdftoolsregistry --query "passwords[0].value" -o tsv)

# Create the container app
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
  --cpu 1 \
  --memory 2Gi \
  --min-replicas 1 \
  --max-replicas 5 \
  --secrets "db-url=postgresql://pdfadmin:YourSecureP@ssw0rd123!@pdftools-db-server.postgres.database.azure.com:5432/pdftools_db?sslmode=require" \
  --env-vars "NODE_ENV=production" "DATABASE_URL=secretref:db-url"
```

---

### Step 9: Get Your App URL

```bash
az containerapp show \
  --name pdftools \
  --resource-group pdftools-rg \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv
```

Your app: `https://pdftools.<random>.eastus.azurecontainerapps.io`

---

### Step 10: Run Database Migrations

Run this locally:

```bash
export DATABASE_URL="postgresql://pdfadmin:YourSecureP@ssw0rd123!@pdftools-db-server.postgres.database.azure.com:5432/pdftools_db?sslmode=require"
npm run db:push
```

---

### Step 11: Verify Deployment

```bash
# Check app status
az containerapp show --name pdftools --resource-group pdftools-rg --query "properties.runningStatus"

# View logs
az containerapp logs show --name pdftools --resource-group pdftools-rg --follow

# Test health endpoint
curl https://your-app-url.azurecontainerapps.io/api/health
```

---

## GitHub Actions CI/CD

Automate deployments on every push to main.

### Step 1: Create Service Principal

```bash
az ad sp create-for-rbac \
  --name "github-actions-pdftools" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/pdftools-rg \
  --sdk-auth
```

Save the JSON output.

### Step 2: Add GitHub Secret

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `AZURE_CREDENTIALS`
4. Value: Paste the entire JSON output from Step 1

### Step 3: Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy to Azure Container Apps

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_CONTAINER_REGISTRY: pdftoolsregistry
  CONTAINER_APP_NAME: pdftools
  RESOURCE_GROUP: pdftools-rg
  IMAGE_NAME: pdftools

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and push image to ACR
        run: |
          az acr build \
            --registry ${{ env.AZURE_CONTAINER_REGISTRY }} \
            --image ${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --image ${{ env.IMAGE_NAME }}:latest \
            --file Dockerfile \
            .

      - name: Deploy to Azure Container Apps
        run: |
          az containerapp update \
            --name ${{ env.CONTAINER_APP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

Now every push to `main` automatically deploys to Azure.

---

## Updating Your App

### Manual Update

```bash
# 1. Build locally
npm run build

# 2. Build and push new image
az acr build \
  --registry pdftoolsregistry \
  --resource-group pdftools-rg \
  --image pdftools:v2 \
  --file Dockerfile \
  .

# 3. Update container app
az containerapp update \
  --name pdftools \
  --resource-group pdftools-rg \
  --image pdftoolsregistry.azurecr.io/pdftools:v2
```

### Update Environment Variables

```bash
az containerapp update \
  --name pdftools \
  --resource-group pdftools-rg \
  --set-env-vars "NEW_VAR=value"
```

### Update Secrets

```bash
az containerapp secret set \
  --name pdftools \
  --resource-group pdftools-rg \
  --secrets "db-url=NEW_CONNECTION_STRING"
```

---

## Monitoring & Troubleshooting

### View Logs

```bash
# Stream live logs
az containerapp logs show --name pdftools --resource-group pdftools-rg --follow

# View recent logs
az containerapp logs show --name pdftools --resource-group pdftools-rg --tail 100
```

### Check App Status

```bash
az containerapp show --name pdftools --resource-group pdftools-rg --query "properties.runningStatus"
```

### Health Check

```bash
curl https://your-app-url.azurecontainerapps.io/api/health
```

### Restart App

```bash
az containerapp revision restart --name pdftools --resource-group pdftools-rg --revision $(az containerapp revision list --name pdftools --resource-group pdftools-rg --query "[0].name" -o tsv)
```

### Scale App

```bash
az containerapp update \
  --name pdftools \
  --resource-group pdftools-rg \
  --min-replicas 2 \
  --max-replicas 10
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection failed | Check `DATABASE_URL` format includes `?sslmode=require` |
| App not starting | Check logs with `az containerapp logs show` |
| Out of memory | Increase `--memory` in container app update |
| Slow performance | Increase `--cpu` or scale replicas |

---

## Cost Estimation

### Container Apps Setup

| Resource | Cost |
|----------|------|
| Container Apps | ~$50-100/month (based on usage) |
| Container Registry (Basic) | ~$5/month |
| PostgreSQL Flexible Server (B1ms) | ~$15/month |
| **Total** | **~$70-120/month** |

### Tips to Reduce Costs

- Set `--min-replicas 0` for consumption-based pricing (with cold start)
- Use reserved instances for PostgreSQL
- Monitor and right-size resources based on actual usage

---

## Quick Reference

```bash
# View all resources
az resource list --resource-group pdftools-rg --output table

# Get app URL
az containerapp show --name pdftools --resource-group pdftools-rg --query "properties.configuration.ingress.fqdn" -o tsv

# View container app details
az containerapp show --name pdftools --resource-group pdftools-rg

# Delete everything (be careful!)
az group delete --name pdftools-rg --yes
```

---

## Support

- **Application logs**: `az containerapp logs show`
- **Health endpoint**: `/api/health`
- **Metrics endpoint**: `/api/metrics`

For Azure issues:
- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [Azure PostgreSQL Documentation](https://docs.microsoft.com/azure/postgresql/)
