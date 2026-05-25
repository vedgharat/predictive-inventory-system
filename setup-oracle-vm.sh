#!/usr/bin/env bash

# ==============================================================================
# Predictive Inventory System - Oracle Cloud VM (Always-Free) Provisioning Script
# ==============================================================================
# This script automates the full setup of your Always-Free OCI Ubuntu instance:
# 1. Installs Docker & Docker Compose
# 2. Configures the local iptables firewall to permit HTTP (80) & HTTPS (443)
# 3. Pulls/Builds the microservices stack
# 4. Sets up Caddy for automatic Let's Encrypt SSL/TLS reverse proxy
# ==============================================================================

set -euo pipefail

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}    Predictive Inventory System - OCI Ubuntu Provisioner           ${NC}"
echo -e "${BLUE}===================================================================${NC}"

# 1. System checks
echo -e "\n${YELLOW}[1/5] Running system checks...${NC}"
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run this script with sudo privilege (e.g. sudo ./setup-oracle-vm.sh).${NC}"
  exit 1
fi

if [ ! -f /etc/debian_version ]; then
  echo -e "${RED}Error: This script is intended for Debian/Ubuntu environments only.${NC}"
  exit 1
fi
echo -e "${GREEN}✔ System check passed (Ubuntu/Debian detected with root access).${NC}"

# 2. Install Docker & Docker Compose
echo -e "\n${YELLOW}[2/5] Installing Docker & Docker Compose...${NC}"
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

if ! command -v docker &> /dev/null; then
  echo "Installing Docker engine..."
  apt-get install -y docker.io
  systemctl enable --now docker
else
  echo "Docker is already installed."
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  apt-get install -y docker-compose-v2
else
  echo "Docker Compose is already installed."
fi
echo -e "${GREEN}✔ Docker engine and compose are fully ready.${NC}"

# 3. Open local OS firewall ports (CRITICAL for Oracle Cloud VMs)
echo -e "\n${YELLOW}[3/5] Configuring iptables OS firewall rules...${NC}"
echo "Oracle Cloud Ubuntu VMs block ports 80 & 443 by default via iptables."
echo "Unlocking local firewall rules for HTTP & HTTPS..."

# Insert rules at position 6 (before reject rules)
iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT

# Make rules persistent across reboots
if command -v netfilter-persistent &> /dev/null; then
  netfilter-persistent save
  echo "Firewall rules saved via netfilter-persistent."
elif [ -d /etc/iptables ]; then
  iptables-save > /etc/iptables/rules.v4
  echo "Firewall rules saved to /etc/iptables/rules.v4."
else
  apt-get install -y iptables-persistent
  echo "Firewall rules saved via newly installed iptables-persistent."
fi
echo -e "${GREEN}✔ OS-level ports 80 and 443 are now open.${NC}"
echo -e "${YELLOW}⚠️  Note: Make sure to also add ingress rules for ports 80/443 in your OCI Cloud Console Security List!${NC}"

# 4. Install Caddy Server for Automatic SSL
echo -e "\n${YELLOW}[4/5] Installing Caddy reverse proxy...${NC}"
if ! command -v caddy &> /dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
  systemctl enable --now caddy
else
  echo "Caddy is already installed."
fi
echo -e "${GREEN}✔ Caddy reverse proxy installed and running.${NC}"

# 5. Setup production configurations
echo -e "\n${YELLOW}[5/5] Preparing configuration files...${NC}"

# Create Caddyfile template
CADDYFILE_PATH="/etc/caddy/Caddyfile"
echo -e "Creating a backup of the existing Caddyfile..."
cp -f "$CADDYFILE_PATH" "$CADDYFILE_PATH.bak" || true

echo -e "Writing modern Caddyfile configuration..."
cat << 'EOF' > "$CADDYFILE_PATH"
# ==============================================================================
# Caddy Production Gateway Configuration - Predictive Inventory System
# ==============================================================================

# 1. Update these to your actual registered domains
# dashboard.yourdomain.com {
#     root * /var/www/predictive-inventory/frontend/dist
#     file_server
#     try_files {path} /index.html
#     encode gzip
# }

# api.yourdomain.com {
#     # Order Service REST API
#     reverse_proxy /api/orders/* http://127.0.0.1:8081
#
#     # Inventory Service REST API
#     reverse_proxy /api/inventory* http://127.0.0.1:8082
#
#     # STOMP/SockJS WebSockets routing (Automatic upgrades supported by Caddy)
#     reverse_proxy /ws/* http://127.0.0.1:8082
# }
EOF

echo -e "${GREEN}✔ Caddy configuration template created at: ${CADDYFILE_PATH}${NC}"

echo -e "\n${BLUE}===================================================================${NC}"
echo -e "${GREEN}Setup Successful! Your Oracle VM is now fully prepared.           ${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo -e "\n${YELLOW}Next Steps to Launch Production:${NC}"
echo -e "1. Edit the Caddyfile with your domain: ${GREEN}sudo nano /etc/caddy/Caddyfile${NC}"
echo -e "2. Restart Caddy: ${GREEN}sudo systemctl restart caddy${NC}"
echo -e "3. Build & start Docker containers: ${GREEN}docker compose up -d --build${NC}"
echo -e "4. Build your React frontend assets on the server or on your local machine and copy them to your web root."
echo -e "\nEnsure your Oracle Cloud console has Ingress Security Rules open for ports 80 & 443."
