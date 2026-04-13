#!/bin/bash

set -e

# Color output for clarity
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/bagley2014/calist"
DEPLOY_DIR="/opt/calist"
SERVICE_NAME="calist"
SERVICE_USER="calist"
SERVICE_GROUP="calist"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handler
error_exit() {
    log_error "$1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error_exit "This script must be run as root (use sudo)"
fi

log_info "Starting Calist deployment..."

# Step 1: Install Bun if needed
log_info "Checking for Bun installation..."
if ! command -v bun &> /dev/null; then
    log_warn "Bun not found. Installing Bun..."
    export SHELL=/bin/bash
    curl -fsSL https://bun.com/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    if ! command -v bun &> /dev/null; then
        error_exit "Bun installation failed"
    fi
    log_success "Bun installed successfully"
else
    log_success "Bun already installed ($(bun --version))"
fi

# Step 2: Check for updates before doing anything disruptive
log_info "Checking repository state in $DEPLOY_DIR..."

if [ -d "$DEPLOY_DIR/.git" ]; then
    cd "$DEPLOY_DIR"
    git fetch origin
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/master)
    if [ "$LOCAL" = "$REMOTE" ]; then
        log_success "Already up to date. Nothing to deploy."
        exit 0
    fi
    log_info "Updates found ($LOCAL -> $REMOTE). Proceeding with deployment..."
    NEEDS_CLONE=false
else
    log_info "Repository not yet cloned. Proceeding with fresh install..."
    NEEDS_CLONE=true
fi

# Step 3: Stop existing service if running
log_info "Checking for existing Calist service..."
if systemctl is-active --quiet $SERVICE_NAME; then
    log_warn "Stopping existing $SERVICE_NAME service..."
    systemctl stop $SERVICE_NAME
    log_success "$SERVICE_NAME service stopped"
else
    log_info "$SERVICE_NAME service is not running"
fi

# Step 4: Clone or pull repository
log_info "Setting up repository in $DEPLOY_DIR..."

if [ "$NEEDS_CLONE" = false ]; then
    log_info "Pulling latest master..."
    cd "$DEPLOY_DIR"
    git checkout master
    git pull origin master
    log_success "Repository updated"
else
    log_info "Cloning repository..."
    mkdir -p "$(dirname "$DEPLOY_DIR")"
    git clone -b master "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    log_success "Repository cloned"
fi

# Step 5: Create calist user and group if they don't exist
log_info "Checking for $SERVICE_USER user and group..."

if ! id "$SERVICE_USER" &>/dev/null; then
    log_warn "User $SERVICE_USER not found. Creating..."
    useradd -r -s /bin/bash -d "$DEPLOY_DIR" -m "$SERVICE_USER"
    log_success "User $SERVICE_USER created"
else
    log_success "User $SERVICE_USER already exists"
fi

# Ensure proper ownership and permissions
log_info "Setting directory permissions..."
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DEPLOY_DIR"
chmod 755 "$DEPLOY_DIR"
log_success "Permissions set"

# Step 6: Install dependencies, build, and migrate
log_info "Installing dependencies..."
cd "$DEPLOY_DIR"
sudo -u "$SERVICE_USER" bun install --frozen-lockfile || error_exit "bun install failed"
log_success "Dependencies installed"

log_info "Building application..."
sudo -u "$SERVICE_USER" bun run build || error_exit "bun run build failed"
log_success "Application built"

# Ensure data directory exists with proper permissions
log_info "Setting up data directory..."
mkdir -p "$DEPLOY_DIR/data"
chown "$SERVICE_USER:$SERVICE_GROUP" "$DEPLOY_DIR/data"
chmod 755 "$DEPLOY_DIR/data"

log_info "Running database migrations..."
sudo -u "$SERVICE_USER" bun run migrate || error_exit "bun run migrate failed"
log_success "Database migrations completed"

# Step 7: Install systemd service
log_info "Installing systemd service..."

if [ ! -f "$DEPLOY_DIR/calist.service" ]; then
    error_exit "calist.service file not found in repository"
fi

# Copy service file, substituting paths
cp "$DEPLOY_DIR/calist.service" /etc/systemd/system/$SERVICE_NAME.service

# Update paths in the service file if they differ from defaults
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$DEPLOY_DIR|g" /etc/systemd/system/$SERVICE_NAME.service
sed -i "s|ExecStart=.*|ExecStart=$(command -v bun) run src/server/index.ts|g" /etc/systemd/system/$SERVICE_NAME.service
sed -i "s|User=.*|User=$SERVICE_USER|g" /etc/systemd/system/$SERVICE_NAME.service
sed -i "s|Group=.*|Group=$SERVICE_GROUP|g" /etc/systemd/system/$SERVICE_NAME.service

log_success "Systemd service file installed"

log_info "Reloading systemd daemon..."
systemctl daemon-reload
log_success "Systemd daemon reloaded"

log_info "Enabling $SERVICE_NAME service..."
systemctl enable $SERVICE_NAME
log_success "$SERVICE_NAME service enabled"

# Step 8: Start the service
log_info "Starting $SERVICE_NAME service..."
systemctl start $SERVICE_NAME

# Verify service is running
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    log_success "$SERVICE_NAME service is running"
else
    log_error "$SERVICE_NAME service failed to start. Check logs with: systemctl status $SERVICE_NAME"
    exit 1
fi

# Final summary
echo ""
log_success "=========================================="
log_success "Calist deployment completed successfully!"
log_success "=========================================="
echo ""
log_info "Service status:"
systemctl status $SERVICE_NAME --no-pager || true
echo ""
log_info "Next steps:"
echo "  1. Configure a reverse proxy (Caddy/Nginx) to forward to 127.0.0.1:3100"
echo "  2. Set NODE_ENV environment variable if needed (currently checking defaults)"
echo "  3. View logs: systemctl logs -u $SERVICE_NAME -f"
echo ""
log_info "Service location: /etc/systemd/system/$SERVICE_NAME.service"
log_info "Application directory: $DEPLOY_DIR"
log_info "Database location: $DEPLOY_DIR/data/calist.db"
echo ""
