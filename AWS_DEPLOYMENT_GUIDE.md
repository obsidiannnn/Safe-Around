# SafeAround - AWS Deployment Guide 🚀

Complete guide to deploy SafeAround backend on AWS with Docker.

---

## 📋 Prerequisites

- AWS Account
- Domain name (optional but recommended)
- Google Maps API Key
- Firebase Cloud Messaging (FCM) Key
- Twilio Account (for SMS alerts)

---

## 🏗️ Part 1: AWS Infrastructure Setup

### Option A: EC2 Instance (Recommended for Start)

1. **Launch EC2 Instance**
   ```bash
   Instance Type: t3.medium (2 vCPU, 4GB RAM) or larger
   AMI: Ubuntu 22.04 LTS
   Storage: 30GB gp3 SSD minimum
   Security Group: Open ports 22, 80, 443, 8080
   ```

2. **Connect to Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Docker & Docker Compose**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Verify installation
   docker --version
   docker-compose --version
   
   # Logout and login again for group changes
   exit
   ```

### Option B: ECS (Elastic Container Service)

For production-scale deployment, use ECS with Fargate:
- Auto-scaling
- Load balancing
- Better resource management
- See `AWS_ECS_DEPLOYMENT.md` for detailed guide

---

## 📦 Part 2: Application Setup

### 1. Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/obsidiannnn/Safe-Around.git
cd Safe-Around/backend
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```bash
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
GIN_MODE=release
ENVIRONMENT=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=safearound_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_NAME=safearound_prod
DB_SSLMODE=disable
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_POOL_SIZE=10

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
JWT_EXPIRY=168h
JWT_REFRESH_EXPIRY=720h

# External APIs
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
FCM_SERVER_KEY=your_fcm_server_key_here

# App Configuration
API_VERSION=v1
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
MAX_UPLOAD_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Docker
APP_VERSION=latest
```

### 3. Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

---

## 🔒 Part 3: SSL/HTTPS Setup with Let's Encrypt

### 1. Install Nginx

```bash
sudo apt install nginx -y
```

### 2. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/safearound
```

**Nginx Configuration:**

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket Proxy
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8080;
        access_log off;
    }
}
```

### 3. Enable Site and Get SSL Certificate

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/safearound /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

---

## 🗄️ Part 4: Database Management

### 1. Run Migrations

```bash
# Enter backend container
docker-compose exec backend sh

# Run migrations (if using golang-migrate)
migrate -path ./migrations -database "postgresql://safearound_user:password@postgres:5432/safearound_prod?sslmode=disable" up

# Or use your custom migration command
./safearound-api migrate up

# Exit container
exit
```

### 2. Database Backups

Create backup script:

```bash
nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/safearound_$DATE.sql"

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U safearound_user safearound_prod > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

```bash
chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## 📊 Part 5: Monitoring & Logging

### 1. CloudWatch Integration (Optional)

Install CloudWatch agent:

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### 2. Application Logs

```bash
# View real-time logs
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 backend

# Save logs to file
docker-compose logs backend > backend-logs.txt
```

### 3. Health Monitoring Script

```bash
nano /home/ubuntu/health-check.sh
```

```bash
#!/bin/bash
HEALTH_URL="http://localhost:8080/health/ping"
SLACK_WEBHOOK="your-slack-webhook-url"

if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "Health check failed!"
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 SafeAround Backend is DOWN!"}' \
        $SLACK_WEBHOOK
    
    # Restart services
    cd /home/ubuntu/Safe-Around/backend
    docker-compose restart backend
fi
```

```bash
chmod +x /home/ubuntu/health-check.sh

# Run every 5 minutes
crontab -e
# Add: */5 * * * * /home/ubuntu/health-check.sh
```

---

## 🔄 Part 6: CI/CD with GitHub Actions

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main, production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/Safe-Around
            git pull origin main
            cd backend
            docker-compose pull
            docker-compose up -d --build
            docker-compose ps
```

**Add GitHub Secrets:**
- `EC2_HOST`: Your EC2 public IP
- `EC2_SSH_KEY`: Your private SSH key

---

## 🚀 Part 7: Performance Optimization

### 1. Enable Docker Logging Limits

Edit `docker-compose.yml`:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 2. Database Connection Pooling

Already configured in `.env`:
```bash
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
```

### 3. Redis Caching

Redis is already configured in docker-compose.yml

---

## 🧪 Part 8: Testing Deployment

```bash
# Test health endpoint
curl https://yourdomain.com/health/ping

# Test API endpoint
curl -X POST https://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919997759064","password":"Anurag@123"}'

# Test WebSocket
wscat -c wss://yourdomain.com/ws/crime
```

---

## 📱 Part 9: Update Frontend Configuration

Update frontend `.env`:

```bash
EXPO_PUBLIC_API_URL=https://yourdomain.com/api/v1
EXPO_PUBLIC_WS_URL=wss://yourdomain.com/ws
```

---

## 🛠️ Troubleshooting

### Backend not starting

```bash
# Check logs
docker-compose logs backend

# Check if port is in use
sudo netstat -tulpn | grep 8080

# Restart services
docker-compose restart
```

### Database connection issues

```bash
# Check if postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U safearound_user -d safearound_prod
```

### SSL certificate issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## 📊 Cost Estimation (AWS)

**Monthly Costs:**
- EC2 t3.medium: ~$30/month
- EBS Storage (30GB): ~$3/month
- Data Transfer: ~$10-50/month (depends on usage)
- **Total: ~$43-83/month**

**For Production Scale:**
- Use RDS for PostgreSQL: +$15-100/month
- Use ElastiCache for Redis: +$15-50/month
- Use Application Load Balancer: +$16/month
- **Total: ~$89-249/month**

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched and configured
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Docker containers running
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained
- [ ] Database migrations run
- [ ] Backup script configured
- [ ] Health monitoring setup
- [ ] CI/CD pipeline configured
- [ ] Frontend updated with production URL
- [ ] Testing completed

---

## 🎉 Your SafeAround Backend is Live!

Access your API at: `https://yourdomain.com/api/v1`

Monitor health at: `https://yourdomain.com/health`

---

## 📞 Support

For issues, check:
1. Application logs: `docker-compose logs -f`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. System logs: `sudo journalctl -u docker -f`
