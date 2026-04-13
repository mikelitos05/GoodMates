#!/bin/bash
# ============================================================
# setup.sh - Script de Instalacion de Dependencias GoodMates
# ============================================================
# Instala todas las herramientas necesarias para el entorno
# de desarrollo y produccion en una instancia EC2 (Amazon Linux 2023)
#
# Uso:
#   chmod +x infra/bash/setup.sh
#   ./infra/bash/setup.sh
# ============================================================

set -euo pipefail  # Salir ante cualquier error

# ── Colores para output ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'  # Sin color

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Variables de configuracion ───────────────────────────────
NODE_VERSION="20"
PROJECT_DIR="/opt/goodmates"
APP_USER="ec2-user"

echo ""
echo "============================================"
echo "   GoodMates - Setup de Entorno AWS EC2    "
echo "============================================"
echo ""

# ── 1. Actualizar el sistema ─────────────────────────────────
log_info "Actualizando paquetes del sistema..."
sudo dnf update -y -q
log_success "Sistema actualizado"

# ── 2. Instalar utilidades basicas ───────────────────────────
log_info "Instalando utilidades basicas..."
sudo dnf install -y -q \
    git \
    curl \
    wget \
    unzip \
    jq \
    htop \
    vim \
    tar
log_success "Utilidades instaladas"

# ── 3. Instalar Node.js ${NODE_VERSION} via NVM ──────────────
log_info "Instalando Node.js ${NODE_VERSION}..."

if command -v node &>/dev/null; then
    CURRENT_NODE=$(node --version)
    log_warn "Node.js ya instalado: ${CURRENT_NODE}"
else
    # Instalar via NodeSource
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | sudo bash - -q
    sudo dnf install -y -q nodejs
    log_success "Node.js $(node --version) instalado"
fi

# ── 4. Instalar PM2 (gestor de procesos Node.js) ─────────────
log_info "Instalando PM2..."
if command -v pm2 &>/dev/null; then
    log_warn "PM2 ya instalado: $(pm2 --version)"
else
    sudo npm install -g pm2 --quiet
    log_success "PM2 $(pm2 --version) instalado"
fi

# ── 5. Instalar Python 3 y pip ───────────────────────────────
log_info "Instalando Python 3 y pip..."
sudo dnf install -y -q python3 python3-pip
log_success "Python $(python3 --version) instalado"

# ── 6. Instalar AWS CLI v2 ───────────────────────────────────
log_info "Instalando AWS CLI v2..."
if command -v aws &>/dev/null; then
    log_warn "AWS CLI ya instalado: $(aws --version)"
else
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
    unzip -q /tmp/awscliv2.zip -d /tmp/
    sudo /tmp/aws/install
    rm -rf /tmp/awscliv2.zip /tmp/aws/
    log_success "AWS CLI $(aws --version) instalado"
fi

# ── 7. Instalar Docker ───────────────────────────────────────
log_info "Instalando Docker..."
if command -v docker &>/dev/null; then
    log_warn "Docker ya instalado: $(docker --version)"
else
    sudo dnf install -y -q docker
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker "${APP_USER}"
    log_success "Docker $(docker --version) instalado y activo"
fi

# ── 8. Instalar dependencias Python del proyecto ─────────────
log_info "Instalando dependencias Python (boto3, rich, click)..."
if [ -f "${PROJECT_DIR}/infra/requirements.txt" ]; then
    pip3 install -r "${PROJECT_DIR}/infra/requirements.txt" -q
    log_success "Dependencias Python instaladas"
else
    pip3 install boto3 rich click -q
    log_warn "requirements.txt no encontrado, paquetes base instalados"
fi

# ── 9. Instalar dependencias Node del backend ────────────────
log_info "Instalando dependencias Node.js del backend..."
if [ -d "${PROJECT_DIR}/backend" ]; then
    cd "${PROJECT_DIR}/backend"
    npm ci --omit=dev --quiet
    log_success "Dependencias del backend instaladas"
else
    log_warn "Directorio ${PROJECT_DIR}/backend no encontrado, omitiendo"
fi

# ── 10. Configurar PM2 para inicio automatico ────────────────
log_info "Configurando PM2 para inicio automatico con el sistema..."
pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" 2>/dev/null || true
log_success "PM2 startup configurado"

# ── Resumen ──────────────────────────────────────────────────
echo ""
echo "============================================"
echo "        Instalacion completada!             "
echo "============================================"
echo ""
echo "Herramientas instaladas:"
echo "  Node.js:  $(node --version 2>/dev/null || echo 'N/A')"
echo "  npm:      $(npm --version 2>/dev/null || echo 'N/A')"
echo "  Python:   $(python3 --version 2>/dev/null || echo 'N/A')"
echo "  AWS CLI:  $(aws --version 2>/dev/null || echo 'N/A')"
echo "  Docker:   $(docker --version 2>/dev/null || echo 'N/A')"
echo "  PM2:      $(pm2 --version 2>/dev/null || echo 'N/A')"
echo ""
log_success "Entorno listo para correr GoodMates"
