# PDFTools Deployment Guide

## Azure VM Deployment

This guide will help you deploy PDFTools to an Azure VM for production use with support for multiple concurrent users.

### Prerequisites

- Azure account with an active subscription
- SSH access to your Azure VM
- Domain name (optional, but recommended)

### System Requirements

**Minimum Recommended Specs:**
- VM Size: Standard_B2s or larger (2 vCPUs, 4GB RAM)
- OS: Ubuntu 22.04 LTS
- Storage: 30GB SSD (minimum)
- Network: Allow ports 80, 443, and 22

**For High Traffic:**
- VM Size: Standard_D2s_v3 or larger (2 vCPUs, 8GB RAM)
- Storage: 50GB+ SSD
- Consider Load Balancer for multiple instances

## Step 1: Provision Azure VM

```bash
# Create resource group
az group create --name pdftools-rg --location eastus

# Create VM
az vm create \
  --resource-group pdftools-rg \
  --name pdftools-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard
 
# Open HTTP and HTTPS ports
az vm open-port --port 80 --resource-group pdftools-rg --name pdftools-vm --priority 1001
az vm open-port --port 443 --resource-group pdftools-rg --name pdftools-vm --priority 1002
```

## Step 2: Initial Server Setup

SSH into your VM:

```bash
ssh azureuser@<your-vm-ip>
```

Update system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Dependencies

### Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

### Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In the PostgreSQL prompt:

```sql
CREATE DATABASE pdftools;
CREATE USER pdftools_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pdftools TO pdftools_user;
\q
```

### Install PDF/Image Processing Tools

```bash
sudo apt install -y \
  ghostscript \
  poppler-utils \
  qpdf \
  imagemagick \
  libreoffice \
  wkhtmltopdf
```

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 4: Deploy Application

### Clone or Upload Application

```bash
cd /home/azureuser
# Option 1: Clone from git
git clone <your-repo-url> pdftools
cd pdftools

# Option 2: Upload via SCP from local machine
# scp -r ./pdftools azureuser@<vm-ip>:/home/azureuser/
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create `.env` file:

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://pdftools_user:your_secure_password@localhost:5432/pdftools

# Logging
LOG_LEVEL=info

# File Upload Limits
MAX_FILE_SIZE=104857600  # 100MB in bytes

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here
EOF
```

Generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Build Application

```bash
npm run build
```

### Push Database Schema

```bash
npm run db:push
```

## Step 5: Configure Process Manager (PM2)

Install PM2 globally:

```bash
sudo npm install -g pm2
```

Create PM2 ecosystem file:

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'pdftools',
    script: 'dist/index.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '1G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}
EOF
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Copy and run the command that PM2 outputs to enable startup on boot.

## Step 6: Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo cat > /etc/nginx/sites-available/pdftools << 'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=5r/s;

# Upstream
upstream pdftools_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    client_max_body_size 100M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logging
    access_log /var/log/nginx/pdftools_access.log;
    error_log /var/log/nginx/pdftools_error.log;
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://pdftools_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Upload endpoint with stricter rate limiting
    location /api/jobs {
        limit_req zone=upload_limit burst=5 nodelay;
        
        proxy_pass http://pdftools_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        client_body_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Static files
    location / {
        proxy_pass http://pdftools_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/pdftools /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: SSL/TLS with Let's Encrypt (Optional but Recommended)

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Obtain SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot will automatically configure Nginx for HTTPS and set up auto-renewal.

## Step 8: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Step 9: Monitoring and Logging

### View Application Logs

```bash
# PM2 logs
pm2 logs pdftools

# Application logs
tail -f logs/combined.log
tail -f logs/error.log

# Nginx logs
sudo tail -f /var/log/nginx/pdftools_access.log
sudo tail -f /var/log/nginx/pdftools_error.log
```

### Monitor Application Status

```bash
pm2 status
pm2 monit
```

### Access Metrics

Visit `http://your-domain.com/api/metrics` to see Prometheus-compatible metrics.

## Step 10: Performance Tuning

### PostgreSQL Optimization

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 5MB
min_wal_size = 1GB
max_wal_size = 4GB
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Node.js Memory Optimization

If you experience memory issues, adjust PM2 configuration:

```javascript
// In ecosystem.config.js
max_memory_restart: '2G',  // Increase if needed
```

## Scaling for Multiple Concurrent Users

### Horizontal Scaling (Multiple Instances)

PM2 cluster mode automatically uses all CPU cores. For more capacity:

1. **Use Azure Load Balancer**: Deploy multiple VMs behind a load balancer
2. **Shared Database**: All instances connect to the same PostgreSQL database
3. **Shared File Storage**: Use Azure Blob Storage for uploaded/processed files

### Vertical Scaling (Bigger VM)

Upgrade VM size in Azure portal:

```bash
az vm resize \
  --resource-group pdftools-rg \
  --name pdftools-vm \
  --size Standard_D4s_v3  # 4 vCPUs, 16GB RAM
```

## Backup Strategy

### Database Backups

Create daily backup cron job:

```bash
crontab -e
```

Add:

```cron
0 2 * * * pg_dump -U pdftools_user pdftools > /home/azureuser/backups/pdftools_$(date +\%Y\%m\%d).sql
0 3 * * * find /home/azureuser/backups -name "pdftools_*.sql" -mtime +7 -delete
```

### Application Backups

```bash
# Backup application code and config
tar -czf pdftools-backup-$(date +%Y%m%d).tar.gz \
  pdftools/ \
  .env \
  ecosystem.config.js
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs pdftools --lines 100

# Check database connection
psql -U pdftools_user -d pdftools -h localhost

# Check environment variables
cat .env
```

### High Memory Usage

```bash
# Monitor processes
pm2 monit

# Restart application
pm2 restart pdftools

# Clear processed files
rm -rf output_files/*
rm -rf uploads/*
```

### Slow Performance

```bash
# Check database performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check disk space
df -h

# Check CPU and memory
htop
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong session secret
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall (ufw)
- [ ] Set up regular security updates
- [ ] Implement rate limiting (configured in Nginx)
- [ ] Regular backup schedule
- [ ] Monitor error logs
- [ ] Keep dependencies updated

## Maintenance

### Update Application

```bash
cd /home/azureuser/pdftools
git pull origin main  # or upload new files
npm install
npm run build
npm run db:push  # if schema changed
pm2 restart pdftools
```

### Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot  # if kernel updated
```

## Cost Optimization

1. **Use Azure Reserved Instances**: Save up to 72% with 1-3 year commitments
2. **Auto-shutdown during off-hours**: Configure via Azure portal
3. **Optimize file cleanup**: Regularly delete old processed files
4. **Monitor resource usage**: Adjust VM size based on actual needs

## Support

For issues specific to PDFTools application, check:
- Application logs: `logs/combined.log`
- PM2 logs: `pm2 logs`
- GitHub issues: (your repository)

For Azure-specific issues:
- Azure Support Portal
- Azure Documentation: https://docs.microsoft.com/azure/

---

**Deployment completed!** Your PDFTools application should now be accessible at `https://your-domain.com` and ready to handle multiple concurrent users.
