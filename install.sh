#!/bin/bash
set -e

# Labitat Native Installer
# Supported: Debian 12+, Ubuntu 22.04+, Proxmox VE 8+
# Usage:
#   Install:   curl -sSf https://raw.githubusercontent.com/DoomedRamen/labitat/main/install.sh | bash
#   Uninstall: curl -sSf https://raw.githubusercontent.com/DoomedRamen/labitat/main/install.sh | bash -s -- --uninstall

# ── Configuration ─────────────────────────────────────────────────────────────
APP_NAME="labitat"
APP_DIR="/opt/$APP_NAME"
DATA_DIR="/var/lib/$APP_NAME"
SERVICE_USER="$APP_NAME"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
PORT=3000
GITHUB_REPO="https://github.com/DoomedRamen/labitat.git"
NODE_MAJOR=22

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Helpers ───────────────────────────────────────────────────────────────────
is_debian_based() {
  command -v apt-get &>/dev/null || command -v apt &>/dev/null
}

is_root() {
  [ "$(id -u)" -eq 0 ]
}

check_requirements() {
  if ! is_debian_based; then
    log_error "This installer only supports Debian/Ubuntu-based systems."
    log_error "For other systems, use Docker: docker compose up -d"
    exit 1
  fi

  if ! is_root; then
    log_error "This script must be run as root (use sudo)."
    exit 1
  fi
}

# ── Install ───────────────────────────────────────────────────────────────────
install() {
  log_info "Installing $APP_NAME..."

  # Install system dependencies
  log_info "Installing system dependencies..."
  apt-get update -qq
  apt-get install -y -qq curl git build-essential &>/dev/null

  # Install Node.js if not present
  if ! command -v node &>/dev/null; then
    log_info "Installing Node.js $NODE_MAJOR..."
    curl -fsSL https://deb.nodesource.com/setup_$NODE_MAJOR.x | bash -
    apt-get install -y -qq nodejs &>/dev/null
  else
    log_info "Node.js already installed: $(node --version)"
  fi

  # Install pnpm if not present
  if ! command -v pnpm &>/dev/null; then
    log_info "Installing pnpm..."
    npm install -g pnpm &>/dev/null
  else
    log_info "pnpm already installed: $(pnpm --version)"
  fi

  # Create service user
  if ! id "$SERVICE_USER" &>/dev/null; then
    log_info "Creating system user: $SERVICE_USER"
    useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  fi

  # Create data directory
  mkdir -p "$DATA_DIR"
  chown "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"

  # Clone or update application
  if [ -d "$APP_DIR/.git" ]; then
    log_info "Updating existing installation..."
    cd "$APP_DIR"
    git fetch --tags
    git checkout main
    git pull
  else
    log_info "Cloning $APP_NAME from GitHub..."
    git clone "$GITHUB_REPO" "$APP_DIR"
    cd "$APP_DIR"
  fi

  # Install dependencies and build
  log_info "Installing dependencies..."
  pnpm install --frozen-lockfile

  log_info "Pushing database schema..."
  DATABASE_URL="file:$DATA_DIR/$APP_NAME.db" pnpm db:push

  log_info "Building application..."
  pnpm build

  # Set ownership
  chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
  chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"

  # Create systemd service
  log_info "Creating systemd service..."
  cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Labitat Homelab Dashboard
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:$DATA_DIR/$APP_NAME.db
Environment=PORT=$PORT
ExecStart=$(command -v node) $APP_DIR/.next/standalone/server.js
Restart=on-failure
RestartSec=5
# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  # Enable and start service
  systemctl daemon-reload
  systemctl enable "$APP_NAME"
  systemctl restart "$APP_NAME"

  # Generate SECRET_KEY if not set
  if [ ! -f "$APP_DIR/.env" ]; then
    SECRET_KEY=$(openssl rand -base64 32)
    cat > "$APP_DIR/.env" << EOF
SECRET_KEY=$SECRET_KEY
DATABASE_URL=file:$DATA_DIR/$APP_NAME.db
NODE_ENV=production
PORT=$PORT
EOF
    chown "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    log_warn "Generated SECRET_KEY — back it up! It's in $APP_DIR/.env"
  fi

  # Restart with env file
  systemctl restart "$APP_NAME"

  echo ""
  log_info "Installation complete!"
  log_info "Visit: http://<your-server-ip>:$PORT"
  log_info "Create your admin account on first visit."
  echo ""
  log_info "Useful commands:"
  log_info "  View logs:     journalctl -u $APP_NAME -f"
  log_info "  Restart:       systemctl restart $APP_NAME"
  log_info "  Stop:          systemctl stop $APP_NAME"
  log_info "  Update:        cd $APP_DIR && git pull && pnpm install && pnpm build && systemctl restart $APP_NAME"
  log_info "  Uninstall:     curl -sSf $GITHUB_REPO/raw/main/install.sh | bash -s -- --uninstall"
}

# ── Uninstall ─────────────────────────────────────────────────────────────────
uninstall() {
  log_warn "Uninstalling $APP_NAME..."

  # Stop and disable service
  if systemctl is-active "$APP_NAME" &>/dev/null; then
    systemctl stop "$APP_NAME"
    systemctl disable "$APP_NAME"
  fi

  # Remove service file
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload

  # Remove application directory
  if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    log_info "Removed $APP_DIR"
  fi

  # Remove service user
  if id "$SERVICE_USER" &>/dev/null; then
    userdel "$SERVICE_USER" 2>/dev/null || true
    log_info "Removed user $SERVICE_USER"
  fi

  echo ""
  log_warn "Application removed."
  log_warn "Data directory ($DATA_DIR) was NOT deleted."
  log_warn "To delete all data: rm -rf $DATA_DIR"
  echo ""
  log_info "Uninstall complete."
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  check_requirements

  if [ "${1:-}" = "--uninstall" ] || [ "${1:-}" = "-u" ]; then
    uninstall
  else
    install
  fi
}

main "$@"
