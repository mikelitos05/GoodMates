#!/bin/bash
# ============================================================
# ec2_manager.sh - Gestion de Instancias EC2 en AWS
# ============================================================
# Script Bash para crear, monitorear y gestionar instancias
# EC2 para el proyecto GoodMates.
#
# Uso:
#   ./infra/bash/ec2_manager.sh <comando> [opciones]
#
# Comandos:
#   create       Crea una nueva instancia EC2
#   status       Muestra el estado de las instancias
#   start        Inicia una instancia detenida
#   stop         Detiene una instancia
#   ssh          Conecta via SSH a la instancia
#   deploy       Despliega la app en la instancia via SSM
#   logs         Muestra los logs de la aplicacion
# ============================================================

set -euo pipefail

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Configuracion del proyecto ───────────────────────────────
PROJECT="goodmates"
REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="t2.micro"          # Free Tier eligible
AMI_ID="ami-0c55b159cbfafe1f0"    # Amazon Linux 2023 (us-east-1)
KEY_NAME="${PROJECT}-keypair"
SECURITY_GROUP="${PROJECT}-ec2-sg"
TAG_NAME="${PROJECT}-server"
INSTANCE_PROFILE="LabInstanceProfile"  # LabRole para AWS Academy

# ── Ayuda ────────────────────────────────────────────────────
usage() {
    echo ""
    echo -e "${BOLD}Uso: $0 <comando>${NC}"
    echo ""
    echo "Comandos disponibles:"
    echo "  create     Crea un nuevo servidor EC2 para GoodMates"
    echo "  status     Muestra estado e IP de las instancias"
    echo "  start      Inicia una instancia detenida"
    echo "  stop       Detiene la instancia en ejecucion"
    echo "  terminate  Termina (elimina) la instancia"
    echo "  ssh        Abre conexion SSH a la instancia"
    echo "  deploy     Despliega actualizaciones via AWS SSM"
    echo "  logs       Muestra logs de PM2 via SSM"
    echo "  s3-sync    Sube el build del frontend a S3"
    echo ""
    exit 1
}

# ── Obtener ID de instancia activa ───────────────────────────
get_instance_id() {
    aws ec2 describe-instances \
        --region "${REGION}" \
        --filters \
            "Name=tag:Name,Values=${TAG_NAME}" \
            "Name=instance-state-name,Values=running,stopped,pending" \
        --query "Reservations[0].Instances[0].InstanceId" \
        --output text 2>/dev/null | grep -v "None" || echo ""
}

# ── Obtener IP publica de la instancia ───────────────────────
get_public_ip() {
    local instance_id="$1"
    aws ec2 describe-instances \
        --region "${REGION}" \
        --instance-ids "${instance_id}" \
        --query "Reservations[0].Instances[0].PublicIpAddress" \
        --output text
}

# ── Crear Security Group ─────────────────────────────────────
ensure_security_group() {
    log_info "Verificando Security Group ${SECURITY_GROUP}..."

    local sg_id
    sg_id=$(aws ec2 describe-security-groups \
        --region "${REGION}" \
        --filters "Name=group-name,Values=${SECURITY_GROUP}" \
        --query "SecurityGroups[0].GroupId" \
        --output text 2>/dev/null | grep -v "None" || echo "")

    if [ -z "${sg_id}" ]; then
        log_info "Creando Security Group..."
        sg_id=$(aws ec2 create-security-group \
            --region "${REGION}" \
            --group-name "${SECURITY_GROUP}" \
            --description "SG para GoodMates EC2 server" \
            --query "GroupId" --output text)

        # Reglas de ingreso
        aws ec2 authorize-security-group-ingress \
            --region "${REGION}" \
            --group-id "${sg_id}" \
            --protocol tcp --port 22 --cidr 0.0.0.0/0   # SSH

        aws ec2 authorize-security-group-ingress \
            --region "${REGION}" \
            --group-id "${sg_id}" \
            --protocol tcp --port 80 --cidr 0.0.0.0/0   # HTTP

        aws ec2 authorize-security-group-ingress \
            --region "${REGION}" \
            --group-id "${sg_id}" \
            --protocol tcp --port 443 --cidr 0.0.0.0/0  # HTTPS

        aws ec2 authorize-security-group-ingress \
            --region "${REGION}" \
            --group-id "${sg_id}" \
            --protocol tcp --port 5001 --cidr 0.0.0.0/0 # Backend API

        log_success "Security Group creado: ${sg_id}"
    else
        log_warn "Security Group ya existe: ${sg_id}"
    fi

    echo "${sg_id}"
}

# ── COMANDO: create ──────────────────────────────────────────
cmd_create() {
    log_info "Creando instancia EC2 para GoodMates..."

    # Verificar que no exista ya
    local existing
    existing=$(get_instance_id)
    if [ -n "${existing}" ]; then
        log_warn "Ya existe una instancia: ${existing}"
        cmd_status
        return
    fi

    # Obtener el Security Group
    local sg_id
    sg_id=$(ensure_security_group)

    # User data: script que se ejecuta al iniciar EC2
    local userdata
    userdata=$(cat <<'USERDATA'
#!/bin/bash
# Configuracion inicial de la instancia EC2
set -e

# Actualizar sistema e instalar Node.js
dnf update -y
dnf install -y git curl

# Instalar Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Instalar PM2 globalmente
npm install -g pm2

# Clonar o actualizar el proyecto
if [ -d "/opt/goodmates" ]; then
    cd /opt/goodmates && git pull
else
    git clone https://github.com/TU_USUARIO/GoodMates.git /opt/goodmates
fi

# Instalar dependencias del backend
cd /opt/goodmates/backend
npm ci --omit=dev

# Crear archivo .env con variables de entorno
# (En produccion estas vendrian de Parameter Store o Secrets Manager)
cat > /opt/goodmates/backend/.env << 'ENV'
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=goodmates
JWT_SECRET=change_me_in_production
NODE_ENV=production
ENV

# Iniciar el backend con PM2
cd /opt/goodmates/backend
pm2 start src/server.js --name goodmates-backend
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
USERDATA
    )

    # Crear la instancia EC2
    local instance_id
    instance_id=$(aws ec2 run-instances \
        --region "${REGION}" \
        --image-id "${AMI_ID}" \
        --instance-type "${INSTANCE_TYPE}" \
        --key-name "${KEY_NAME}" \
        --security-group-ids "${sg_id}" \
        --iam-instance-profile "Name=${INSTANCE_PROFILE}" \
        --user-data "${userdata}" \
        --tag-specifications \
            "ResourceType=instance,Tags=[{Key=Name,Value=${TAG_NAME}},{Key=Project,Value=${PROJECT}},{Key=Environment,Value=production}]" \
        --query "Instances[0].InstanceId" \
        --output text)

    log_success "Instancia creada: ${instance_id}"
    log_info "Esperando que la instancia este disponible..."

    aws ec2 wait instance-running \
        --region "${REGION}" \
        --instance-ids "${instance_id}"

    local public_ip
    public_ip=$(get_public_ip "${instance_id}")

    echo ""
    echo "=========================================="
    log_success "Instancia EC2 lista!"
    echo "  ID:      ${instance_id}"
    echo "  IP:      ${public_ip}"
    echo "  URL:     http://${public_ip}:5001/api/health"
    echo "  SSH:     ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@${public_ip}"
    echo "=========================================="
}

# ── COMANDO: status ──────────────────────────────────────────
cmd_status() {
    log_info "Estado de instancias EC2 [${PROJECT}] en ${REGION}:"
    echo ""

    aws ec2 describe-instances \
        --region "${REGION}" \
        --filters "Name=tag:Project,Values=${PROJECT}" \
        --query "Reservations[].Instances[].[InstanceId,InstanceType,State.Name,PublicIpAddress,LaunchTime]" \
        --output table

    echo ""
}

# ── COMANDO: start ───────────────────────────────────────────
cmd_start() {
    local instance_id
    instance_id=$(get_instance_id)
    [ -z "${instance_id}" ] && log_error "No se encontro ninguna instancia ${TAG_NAME}"

    log_info "Iniciando instancia ${instance_id}..."
    aws ec2 start-instances --region "${REGION}" --instance-ids "${instance_id}" >/dev/null
    aws ec2 wait instance-running --region "${REGION}" --instance-ids "${instance_id}"

    local ip
    ip=$(get_public_ip "${instance_id}")
    log_success "Instancia iniciada. IP publica: ${ip}"
}

# ── COMANDO: stop ────────────────────────────────────────────
cmd_stop() {
    local instance_id
    instance_id=$(get_instance_id)
    [ -z "${instance_id}" ] && log_error "No se encontro ninguna instancia ${TAG_NAME}"

    log_warn "Deteniendo instancia ${instance_id}..."
    aws ec2 stop-instances --region "${REGION}" --instance-ids "${instance_id}" >/dev/null
    aws ec2 wait instance-stopped --region "${REGION}" --instance-ids "${instance_id}"
    log_success "Instancia detenida"
}

# ── COMANDO: terminate ───────────────────────────────────────
cmd_terminate() {
    local instance_id
    instance_id=$(get_instance_id)
    [ -z "${instance_id}" ] && log_error "No se encontro ninguna instancia ${TAG_NAME}"

    echo -e "${RED}ATENCION: Esta accion eliminara permanentemente la instancia ${instance_id}${NC}"
    read -r -p "Escribe 'ELIMINAR' para confirmar: " confirm
    [ "${confirm}" != "ELIMINAR" ] && log_error "Operacion cancelada"

    aws ec2 terminate-instances --region "${REGION}" --instance-ids "${instance_id}" >/dev/null
    log_success "Instancia ${instance_id} terminada"
}

# ── COMANDO: ssh ─────────────────────────────────────────────
cmd_ssh() {
    local instance_id
    instance_id=$(get_instance_id)
    [ -z "${instance_id}" ] && log_error "No se encontro ninguna instancia activa"

    local ip
    ip=$(get_public_ip "${instance_id}")
    local key_path="${HOME}/.ssh/${KEY_NAME}.pem"

    [ ! -f "${key_path}" ] && log_error "No se encontro la clave SSH: ${key_path}"

    log_info "Conectando a ${ip}..."
    ssh -i "${key_path}" -o StrictHostKeyChecking=no "ec2-user@${ip}"
}

# ── COMANDO: deploy (via AWS SSM) ────────────────────────────
cmd_deploy() {
    local instance_id
    instance_id=$(get_instance_id)
    [ -z "${instance_id}" ] && log_error "No se encontro ninguna instancia activa"

    log_info "Desplegando actualizaciones en ${instance_id} via SSM..."

    local command_id
    command_id=$(aws ssm send-command \
        --region "${REGION}" \
        --instance-ids "${instance_id}" \
        --document-name "AWS-RunShellScript" \
        --comment "Deploy GoodMates backend" \
        --parameters 'commands=[
            "cd /opt/goodmates",
            "git pull origin main",
            "cd backend && npm ci --omit=dev",
            "pm2 restart goodmates-backend || pm2 start src/server.js --name goodmates-backend",
            "pm2 save",
            "echo Deploy completado: $(date)"
        ]' \
        --query "Command.CommandId" \
        --output text)

    log_info "Comando SSM enviado: ${command_id}"
    log_info "Esperando resultado..."

    aws ssm wait command-executed \
        --region "${REGION}" \
        --command-id "${command_id}" \
        --instance-id "${instance_id}" 2>/dev/null || true

    # Mostrar output del comando
    aws ssm get-command-invocation \
        --region "${REGION}" \
        --command-id "${command_id}" \
        --instance-id "${instance_id}" \
        --query "[Status,StandardOutputContent]" \
        --output text

    log_success "Deploy completado!"
}

# ── COMANDO: logs (via SSM) ──────────────────────────────────
cmd_logs() {
    local instance_id
    instance_id=$(get_instance_id)
    [ -z "${instance_id}" ] && log_error "No se encontro ninguna instancia activa"

    log_info "Obteniendo logs de PM2 en ${instance_id}..."

    aws ssm send-command \
        --region "${REGION}" \
        --instance-ids "${instance_id}" \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["pm2 logs goodmates-backend --lines 50 --nostream"]' \
        --query "Command.CommandId" \
        --output text | xargs -I{} bash -c '
            sleep 5
            aws ssm get-command-invocation \
                --region '"${REGION}"' \
                --command-id {} \
                --instance-id '"${instance_id}"' \
                --query "StandardOutputContent" \
                --output text'
}

# ── COMANDO: s3-sync ─────────────────────────────────────────
cmd_s3_sync() {
    local bucket_name="${1:-}"

    if [ -z "${bucket_name}" ]; then
        # Intentar obtener del stack de CloudFormation
        bucket_name=$(aws cloudformation describe-stacks \
            --region "${REGION}" \
            --stack-name "${PROJECT}-prod" \
            --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
            --output text 2>/dev/null || echo "")
    fi

    [ -z "${bucket_name}" ] && log_error "Especifica el nombre del bucket: $0 s3-sync <nombre-bucket>"

    local build_dir
    build_dir="$(dirname "$(dirname "$(realpath "$0")")")/frontend/build"

    if [ ! -d "${build_dir}" ]; then
        log_warn "Build no encontrado en ${build_dir}. Ejecutando npm run build..."
        cd "$(dirname "${build_dir}")"
        npm run build
    fi

    log_info "Sincronizando frontend con S3: s3://${bucket_name}"

    # Subir index.html sin cache
    aws s3 cp "${build_dir}/index.html" \
        "s3://${bucket_name}/index.html" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "text/html"

    # Subir assets estaticos con cache largo
    aws s3 sync "${build_dir}" "s3://${bucket_name}" \
        --exclude "index.html" \
        --cache-control "public, max-age=31536000, immutable" \
        --delete

    log_success "Frontend sincronizado con s3://${bucket_name}"

    # Invalidar CloudFront si existe distribution ID
    local dist_id
    dist_id=$(aws cloudformation describe-stacks \
        --region "${REGION}" \
        --stack-name "${PROJECT}-prod" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -n "${dist_id}" ] && [ "${dist_id}" != "None" ]; then
        log_info "Invalidando cache de CloudFront: ${dist_id}..."
        aws cloudfront create-invalidation \
            --distribution-id "${dist_id}" \
            --paths "/*" >/dev/null
        log_success "Cache de CloudFront invalidado"
    fi
}

# ── Despachador de comandos ───────────────────────────────────
COMMAND="${1:-}"

case "${COMMAND}" in
    create)    cmd_create ;;
    status)    cmd_status ;;
    start)     cmd_start ;;
    stop)      cmd_stop ;;
    terminate) cmd_terminate ;;
    ssh)       cmd_ssh ;;
    deploy)    cmd_deploy ;;
    logs)      cmd_logs ;;
    s3-sync)   cmd_s3_sync "${2:-}" ;;
    *)         usage ;;
esac
