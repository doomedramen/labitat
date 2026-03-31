#!/bin/bash
#
# Labitat Installer for Debian/Proxmox
# Usage: bash <(curl -s https://raw.githubusercontent.com/labitat/labitat/main/install.sh)
#
# This script:
# 1. Installs Node.js 20 via NodeSource
# 2. Installs pnpm
# 3. Clones the repo to /opt/labitat
# 4. Runs pnpm install && pnpm build
# 5. Creates a systemd service (labitat.service)
# 6. Prompts for SECRET_KEY and initial admin password
# 7. Writes config.yaml and .env
# 8. Starts and enables the service
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/labitat"
SERVICE_NAME="labitat"
DATA_DIR="/var/lib/labitat"
CONFIG_FILE="/opt/labitat/config.yaml"
ENV_FILE="/opt/labitat/.env"

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Generate random string for SECRET_KEY
generate_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

# Generate bcrypt password hash
generate_password_hash() {
    local password="$1"
    node -e "require('bcryptjs').hash('$password', 12).then(console.log)"
}

# Prompt for user input
prompt() {
    local prompt_text="$1"
    local default_value="$2"
    local result=""
    
    if [[ -n "$default_value" ]]; then
        read -p "$prompt_text [$default_value]: " result
        echo "${result:-$default_value}"
    else
        read -p "$prompt_text: " result
        echo "$result"
    fi
}

prompt_password() {
    local prompt_text="$1"
    local result=""
    
    while true; do
        read -s -p "$prompt_text: " result
        echo
        read -s -p "Confirm password: " result_confirm
        echo
        
        if [[ "$result" == "$result_confirm" ]] && [[ -n "$result" ]]; then
            echo "$result"
            return
        else
            print_error "Passwords do not match or are empty. Please try again."
        fi
    done
}

# Install system dependencies
install_dependencies() {
    print_header "Installing System Dependencies"
    
    # Update package list
    apt-get update -qq
    
    # Install required packages
    apt-get install -y -qq \
        curl \
        git \
        wget \
        openssl \
        ca-certificates \
        gnupg
    
    print_success "System dependencies installed"
}

# Install Node.js 20
install_nodejs() {
    print_header "Installing Node.js 20"
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        local node_version=$(node -v)
        print_info "Node.js is already installed: $node_version"
        
        if [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -ge 20 ]]; then
            print_success "Node.js version is sufficient (>= 20)"
            return
        else
            print_info "Node.js version is too old, installing Node.js 20..."
        fi
    fi
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    print_success "Node.js $(node -v) installed"
}

# Install pnpm
install_pnpm() {
    print_header "Installing pnpm"
    
    if command -v pnpm &> /dev/null; then
        print_info "pnpm is already installed: $(pnpm -v)"
        return
    fi
    
    # Enable corepack (comes with Node.js 16+)
    corepack enable
    corepack prepare pnpm@latest --activate
    
    print_success "pnpm $(pnpm -v) installed"
}

# Clone or update repository
clone_repository() {
    print_header "Setting Up Labitat"
    
    if [[ -d "$INSTALL_DIR" ]]; then
        print_info "Labitat is already installed at $INSTALL_DIR"
        read -p "Do you want to update it? (y/n): " update_choice
        
        if [[ "$update_choice" == "y" ]]; then
            cd "$INSTALL_DIR"
            git pull origin main
            print_success "Labitat updated"
        fi
    else
        print_info "Cloning Labitat to $INSTALL_DIR"
        git clone https://github.com/labitat/labitat.git "$INSTALL_DIR"
        print_success "Labitat cloned"
    fi
    
    cd "$INSTALL_DIR"
}

# Install Node.js dependencies and build
build_application() {
    print_header "Building Application"
    
    print_info "Installing dependencies..."
    pnpm install --frozen-lockfile
    
    print_info "Building application..."
    pnpm build
    
    print_success "Application built"
}

# Create data directory
create_data_directory() {
    print_header "Creating Data Directory"
    
    mkdir -p "$DATA_DIR"
    chown -R labitat:labitat "$DATA_DIR" 2>/dev/null || true
    chmod 750 "$DATA_DIR"
    
    print_success "Data directory created at $DATA_DIR"
}

# Create configuration files
create_config() {
    print_header "Creating Configuration"
    
    # Generate SECRET_KEY
    local secret_key=$(generate_secret)
    
    # Prompt for admin credentials
    echo
    print_info "Create admin account"
    local admin_email=$(prompt "Admin email" "admin@home.lab")
    local admin_password=$(prompt_password "Admin password")
    local password_hash=$(generate_password_hash "$admin_password")
    
    # Prompt for app title
    local app_title=$(prompt "Dashboard title" "My Homelab")
    
    # Create .env file
    cat > "$ENV_FILE" << EOF
# Labitat Environment Variables
# Generated by install.sh on $(date)

SECRET_KEY=$secret_key
DATABASE_URL=file:$DATA_DIR/labitat.db
NODE_ENV=production
EOF
    
    chmod 600 "$ENV_FILE"
    print_success ".env file created"
    
    # Create config.yaml file
    cat > "$CONFIG_FILE" << EOF
# Labitat Configuration
# Generated by install.sh on $(date)

auth:
  email: $admin_email
  passwordHash: $password_hash

app:
  title: $app_title
  defaultPollingMs: 10000
EOF
    
    chmod 600 "$CONFIG_FILE"
    print_success "config.yaml file created"
    
    # Store password for display later
    ADMIN_PASSWORD="$admin_password"
}

# Create systemd service
create_systemd_service() {
    print_header "Creating Systemd Service"
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Labitat Dashboard
After=network.target

[Service]
Type=exec
User=root
WorkingDirectory=$INSTALL_DIR
Environment=PATH=/usr/bin:/usr/local/bin
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    print_success "Systemd service created and enabled"
}

# Start the service
start_service() {
    print_header "Starting Labitat Service"
    
    systemctl start "$SERVICE_NAME"
    
    # Wait for service to start
    sleep 3
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Labitat service started"
    else
        print_error "Failed to start Labitat service"
        systemctl status "$SERVICE_NAME" --no-pager
        exit 1
    fi
}

# Print completion message
print_completion() {
    print_header "Installation Complete!"
    
    echo
    echo -e "${GREEN}Labitat has been successfully installed!${NC}"
    echo
    echo -e "  Dashboard URL: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
    echo -e "  Admin Email:   ${BLUE}$ADMIN_EMAIL${NC}"
    echo -e "  Admin Password: ${BLUE}$ADMIN_PASSWORD${NC}"
    echo
    echo -e "${YELLOW}Important:${NC}"
    echo "  - Please change your password after first login"
    echo "  - Keep your config.yaml and .env files secure"
    echo "  - The database is stored at $DATA_DIR"
    echo
    echo -e "Useful commands:"
    echo -e "  ${BLUE}systemctl status $SERVICE_NAME${NC}   - Check service status"
    echo -e "  ${BLUE}systemctl restart $SERVICE_NAME${NC}  - Restart service"
    echo -e "  ${BLUE}journalctl -u $SERVICE_NAME -f${NC}   - View logs"
    echo
}

# Main installation function
main() {
    print_header "Labitat Installer"
    
    check_root
    
    install_dependencies
    install_nodejs
    install_pnpm
    clone_repository
    build_application
    create_data_directory
    create_config
    create_systemd_service
    start_service
    print_completion
}

# Run main function
main
