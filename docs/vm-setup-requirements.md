# VM Setup Requirements for OpenCode Orchestration

## Local vs Remote Deployment

**Current Design:** Works in BOTH local and remote environments
- ✅ Local computer: Use directly (PM2 on localhost)
- ✅ Remote VM: Same setup, just need additional components

---

## VM Setup Requirements

### Core Requirements (Same as Local)

| Component | Purpose | Installation |
|-----------|---------|--------------|
| **Node.js 18+** | Runtime | `nvm install 18 && nvm use 18` |
| **Beads CLI** | Task tracking | `go install github.com/steveyegge/beads@latest` |
| **OpenCode CLI** | Agent execution | Already present on VM if cloning repo |
| **PM2** | Process manager (headless workers) | `npm install -g pm2` |
| **UBS** | Static analysis (quality gate) | `curl -sSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash` |
| **Python 3.10+** | Required for MCP Agent Mail | `sudo apt install python3.10` or use pyenv |
| **Pip/pipx** | Python package management | `sudo apt install python3-pip` + `python3 -m pipx ensurepath` |

### Remote-Specific Requirements

| Component | Purpose | Installation |
|-----------|---------|--------------|
| **MCP Agent Mail Server** | Central message broker for agent communication | See below for setup |
| **Nginx/Apache** | Reverse proxy for MCP server (optional but recommended) | `sudo apt install nginx` |
| **Systemd Service** | Auto-start MCP server on boot | Create systemd unit file |
| **Firewall Rules** | Open MCP server port (default: 8000) | `sudo ufw allow 8000` |
| **SSH Access** | Remote access for orchestration monitoring | `sudo apt install openssh-server` |
| **Monitoring (Optional)** | Track VM health, PM2 processes, Beads tasks | See monitoring section below |

---

## MCP Agent Mail Server Setup (Remote-Only)

### Option 1: Standalone MCP Server (Recommended for VM)

**Setup:**

```bash
# 1. Install dependencies
sudo apt install -y python3.10 python3.10-venv python3-pip

# 2. Clone MCP Agent Mail repo
git clone https://github.com/your-org/mcp-agent-mail.git /opt/mcp-agent-mail
cd /opt/mcp-agent-mail

# 3. Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create systemd service file
sudo tee /etc/systemd/system/mcp-agent-mail.service > /dev/null <<EOF
[Unit]
Description=MCP Agent Mail Server
After=network.target

[Service]
Type=simple
User=opencode
WorkingDirectory=/opt/mcp-agent-mail
Environment="PATH=/opt/mcp-agent-mail/venv/bin"
ExecStart=/opt/mcp-agent-mail/venv/bin/python -m mcp_agent_mail.server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 6. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mcp-agent-mail
sudo systemctl start mcp-agent-mail

# 7. Verify service
sudo systemctl status mcp-agent-mail
curl http://localhost:8000/health
```

**Firewall:**
```bash
sudo ufw allow 8000/tcp
sudo ufw enable
```

**Monitoring:**
```bash
# Check logs
sudo journalctl -u mcp-agent-mail -f

# Check service status
sudo systemctl status mcp-agent-mail
```

### Option 2: MCP Server via Supervisor (Alternative)

**Setup:**

```bash
# 1. Install Supervisor
sudo apt install -y supervisor

# 2. Create Supervisor config
sudo tee /etc/supervisor/conf.d/mcp-agent-mail.conf > /dev/null <<EOF
[program:mcp-agent-mail]
command=/opt/mcp-agent-mail/venv/bin/python -m mcp_agent_mail.server
directory=/opt/mcp-agent-mail
user=opencode
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=600
stdout_logfile=/var/log/mcp-agent-mail/mcp-agent-mail.log
stderr_logfile=/var/log/mcp-agent-mail/mcp-agent-mail-err.log
EOF

# 3. Start service
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mcp-agent-mail
```

### Option 3: MCP Server via Docker (Production)

**Setup:**

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Create Docker Compose file
cat > /opt/mcp-agent-mail/docker-compose.yml <<EOF
version: '3.8'
services:
  mcp-agent-mail:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - MCP_SERVER_PORT=8000
      - MCP_SERVER_HOST=0.0.0.0
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# 3. Start MCP server
cd /opt/mcp-agent-mail
docker-compose up -d

# 4. Verify
docker-compose logs -f
curl http://localhost:8000/health
```

---

## PM2 Ecosystem Setup (Local & Remote)

**Setup:**

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Create ecosystem file
cat > ~/.config/opencode/pm2-ecosystem.js <<EOF
module.exports = {
  apps: [
    {
      name: 'mcp-agent-mail-server',
      script: '/opt/mcp-agent-mail/venv/bin/python',
      args: '-m mcp_agent_mail.server',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: '/var/log/pm2/mcp-agent-mail-error.log',
      out_file: '/var/log/pm2/mcp-agent-mail-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'orchestrator',
      script: '/Users/buddhi/.config/opencode/orchestrator.sh',
      interpreter: 'bash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        USE_MCP: 'true',
        MCP_SERVER_URL: 'http://localhost:8000'
      },
      error_file: '/var/log/pm2/orchestrator-error.log',
      out_file: '/var/log/pm2/orchestrator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
}
EOF

# 3. Start PM2 ecosystem
pm2 start pm2-ecosystem.js

# 4. Save PM2 process list
pm2 save

# 5. Start on boot (optional)
pm2 startup
```

**Monitoring:**
```bash
# Check all PM2 processes
pm2 list

# Check orchestrator logs
pm2 logs orchestrator

# Restart orchestrator
pm2 restart orchestrator

# Stop all PM2 processes
pm2 stop all
```

---

## Monitoring & Observability (Remote VM)

### 1. System Monitoring

**Install Monitoring Stack:**

```bash
# Install Prometheus (metrics collection)
sudo apt install -y prometheus

# Install Grafana (visualization)
sudo apt install -y grafana

# Install Node Exporter (system metrics)
sudo apt install -y prometheus-node-exporter
```

**Configure:**

```bash
# Prometheus config
cat > /etc/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  - job_name: 'pm2'
    static_configs:
      - targets: ['localhost:9615']
  - job_name: 'mcp-server'
    static_configs:
      - targets: ['localhost:8000']
EOF

# Start Prometheus
sudo systemctl start prometheus

# Start Grafana
sudo systemctl start grafana-server

# Access Grafana: http://vm-ip:3000
# Default login: admin/admin
```

### 2. Log Aggregation

**Option 1: Loki + Promtail (Simple):**

```bash
# Install Loki (log aggregation)
sudo apt install -y loki

# Install Promtail (log shipping)
sudo apt install -y promtail

# Configure Promtail
cat > /etc/promtail/config.yml <<EOF
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: opencode-logs
    static_configs:
      - targets:
          - localhost
          labels:
              job: opencode
              __path__: /var/log/opencode/*.log
EOF

# Start services
sudo systemctl start loki
sudo systemctl start promtail
```

**Option 2: ELK Stack (Full-featured):**

```bash
# Install Elasticsearch
sudo apt install -y elasticsearch

# Install Logstash (log processing)
sudo apt install -y logstash

# Install Kibana (log visualization)
sudo apt install -y kibana
```

### 3. Alerting

**Configure Alerts (Prometheus Alertmanager):**

```bash
# Install Alertmanager
sudo apt install -y prometheus-alertmanager

# Configure alerts
cat > /etc/prometheus/alerts.yml <<EOF
groups:
  - name: opencode_alerts
    interval: 30s
    rules:
      - alert: OrchestratorDown
        expr: up{job="orchestrator"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Orchestrator is down"

      - alert: MCPServerDown
        expr: up{job="mcp-server"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "MCP Agent Mail server is down"

      - alert: PM2WorkerFailure
        expr: pm2_workers_failed > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PM2 worker has failed repeatedly"
EOF

# Start Alertmanager
sudo systemctl start prometheus-alertmanager
```

---

## Backup & Disaster Recovery

### 1. Configuration Backup

```bash
# Create backup script
cat > /opt/scripts/backup-opencode.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/opt/backups/opencode
DATE=$(date +%Y%m%d_%H%M%S)

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
  ~/.config/opencode \
  /etc/systemd/system/mcp-agent-mail.service \
  /etc/supervisor/conf.d/mcp-agent-mail.conf

# Backup Beads database
tar -czf $BACKUP_DIR/beads_$DATE.tar.gz \
  ~/.local/share/beads

# Backup PM2 ecosystem
cp ~/.config/opencode/pm2-ecosystem.js \
  $BACKUP_DIR/pm2-ecosystem_$DATE.js

# Keep last 30 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /opt/scripts/backup-opencode.sh

# Schedule daily backup (cron)
crontab -l | grep -v backup-opencode || (crontab -l; echo "0 2 * * * /opt/scripts/backup-opencode.sh") | crontab -
```

### 2. Disaster Recovery

**Steps to Restore:**

```bash
# 1. Restore configuration
tar -xzf /opt/backups/opencode/config_20260109_020000.tar.gz -C /

# 2. Restore Beads database
tar -xzf /opt/backups/opencode/beads_20260109_020000.tar.gz -C ~/.local/share/

# 3. Restart services
sudo systemctl restart mcp-agent-mail
pm2 restart all
```

---

## Security Considerations

### 1. Network Security

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8000/tcp  # MCP server
sudo ufw allow 3000/tcp  # Grafana (if monitoring)
sudo ufw enable
```

### 2. Authentication

**MCP Server Authentication (Recommended):**

```bash
# Add authentication to MCP server
cat >> /opt/mcp-agent-mail/config.py <<EOF
# Enable authentication
MCP_AUTH_ENABLED = True
MCP_AUTH_TOKEN = os.getenv('MCP_AUTH_TOKEN', 'your-secret-token')

# Require agent registration
MCP_REQUIRE_REGISTRATION = True
EOF

# Set environment variable
echo "export MCP_AUTH_TOKEN='your-secret-token'" >> ~/.bashrc
```

### 3. SSL/TLS (Production)

```bash
# Install Certbot
sudo apt install -y certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d your-vm-domain.com -d mcp.your-vm-domain.com

# Configure Nginx with SSL
cat > /etc/nginx/sites-available/mcp-agent-mail <<EOF
server {
    listen 443 ssl;
    server_name mcp.your-vm-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-vm-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-vm-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx
```

---

## Summary: VM vs Local

| Component | Local | Remote VM | Notes |
|-----------|--------|-----------|--------|
| **Node.js** | Required | Required | Same |
| **Beads CLI** | Required | Required | Same |
| **OpenCode CLI** | Required | Required | Same |
| **PM2** | Required | Required | Same |
| **UBS** | Required | Required | Same |
| **Python 3.10+** | Required | Required | Same |
| **MCP Server** | Optional (use localhost) | **REQUIRED** | Remote needs central server |
| **Nginx/Apache** | Optional | Recommended | Reverse proxy for MCP |
| **Systemd/Supervisor** | Optional | Recommended | Auto-start MCP server |
| **Firewall** | Optional | **REQUIRED** | Open MCP port |
| **Monitoring** | Optional | Recommended | Prometheus/Grafana |
| **Log Aggregation** | Optional | Recommended | Loki/ELK |
| **Alerting** | Optional | Recommended | Prometheus Alertmanager |
| **Backup** | Recommended | **REQUIRED** | Automated backups |
| **SSL/TLS** | Optional | Recommended | For production |

---

## VM Setup Script (One-Command Setup)

```bash
#!/bin/bash
# opencode-vm-setup.sh - Automated VM setup for opencode orchestration

set -e

echo "🚀 Setting up opencode orchestration environment on VM..."

# Step 1: Install dependencies
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y \
  python3.10 python3.10-venv python3-pip \
  git curl wget build-essential \
  nginx openssh-server ufw

# Step 2: Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Step 3: Install Go (for Beads)
echo "📦 Installing Go..."
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# Step 4: Install Beads CLI
echo "📦 Installing Beads CLI..."
go install github.com/steveyegge/beads@latest

# Step 5: Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Step 6: Install UBS
echo "📦 Installing UBS..."
curl -sSL https://raw.githubusercontent.com/Dicklesworthstone/ultimate_bug_scanner/master/install.sh | bash

# Step 7: Setup MCP Agent Mail Server
echo "📦 Setting up MCP Agent Mail Server..."
git clone https://github.com/your-org/mcp-agent-mail.git /opt/mcp-agent-mail
cd /opt/mcp-agent-mail
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Step 8: Create systemd service
echo "📦 Creating systemd service..."
sudo tee /etc/systemd/system/mcp-agent-mail.service > /dev/null <<EOF
[Unit]
Description=MCP Agent Mail Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/mcp-agent-mail
Environment="PATH=/opt/mcp-agent-mail/venv/bin"
ExecStart=/opt/mcp-agent-mail/venv/bin/python -m mcp_agent_mail.server
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mcp-agent-mail
sudo systemctl start mcp-agent-mail

# Step 9: Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 8000/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# Step 10: Setup PM2 ecosystem
echo "📦 Setting up PM2 ecosystem..."
cat > ~/.config/opencode/pm2-ecosystem.js <<EOF
module.exports = {
  apps: [
    {
      name: 'mcp-agent-mail-server',
      script: '/opt/mcp-agent-mail/venv/bin/python',
      args: '-m mcp_agent_mail.server',
      autorestart: true,
      instances: 1
    }
  ]
}
EOF

pm2 start pm2-ecosystem.js
pm2 save
pm2 startup

# Step 11: Health check
echo "🏥 Running health check..."
sleep 5
if curl -sf http://localhost:8000/health; then
    echo "✅ MCP Agent Mail server is running"
else
    echo "❌ MCP Agent Mail server is not running"
    exit 1
fi

if pm2 list | grep -q "online"; then
    echo "✅ PM2 ecosystem is running"
else
    echo "❌ PM2 ecosystem is not running"
    exit 1
fi

echo ""
echo "✅ VM setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone opencode repository: git clone https://github.com/your-org/opencode.git"
echo "  2. Run orchestrator: cd opencode && pm2 start orchestrator"
echo "  3. Monitor logs: pm2 logs orchestrator"
echo "  4. Check status: bd ready"
echo ""
echo "MCP Server URL: http://$(curl -s ifconfig.me):8000"
echo ""
```

---

## Deployment Comparison

| Aspect | Local | Remote VM |
|---------|--------|-----------|
| **Setup Time** | 10-15 min | 30-45 min (with automation) |
| **Cost** | Free (uses existing hardware) | $5-50/mo (VM hosting) |
| **Performance** | Limited by local CPU/RAM | Scalable (upgrade VM size) |
| **Reliability** | Depends on local machine | 24/7 uptime |
| **Monitoring** | Manual setup required | Centralized monitoring recommended |
| **Collaboration** | Single user | Multiple users possible |
| **Backup** | Manual | Automated (required) |
| **Security** | Less exposure | Requires hardening |
| **Use Case** | Development, testing | Production, team orchestration |

---

**Documents Created:**
- `/Users/buddhi/.config/opencode/docs/beads-consolidation-plan.md` - Task cleanup plan
- `/Users/buddhi/.config/opencode/docs/vm-setup-requirements.md` - VM setup guide

**Recommendation:** Start with local development, plan VM setup for production. Use automation scripts to minimize setup time.
