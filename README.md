# GoodMates

GoodMates es una aplicacion web para roommates, propiedades, solicitudes, grupos de convivencia, tareas, board compartido y chat en tiempo real. El proyecto tiene frontend React, backend Node.js/Express y base de datos MySQL.

Este README se enfoca en el despliegue de GoodMates con Docker, incluyendo el flujo para AWS Lab Learner.

## Estructura

```text
GoodMates/
├── backend/
├── frontend/
├── infra/
│   ├── aws/
│   │   └── goodmates-aws-base.yaml
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   ├── docker-compose.aws.yml
│   │   └── nginx.conf
│   └── scripts/
│       ├── deploy-goodmates-one-shot.ps1
│       └── deploy-transport-lab.ps1
├── docker-compose.yml
├── .dockerignore
└── .env.docker
```

## Arquitectura de despliegue

### Local y Docker

- `db`: MySQL 8 en contenedor.
- `backend`: API Node.js/Express en contenedor.
- `frontend`: Nginx en contenedor sirviendo React y haciendo proxy a `/api`, `/socket.io` y `/uploads`.

### AWS Lab Learner

El despliegue en AWS usa una sola EC2 administrada por Systems Manager. Dentro de esa instancia se levanta todo con `docker compose`:

- `frontend` en el puerto `80`
- `backend` solo en la red interna de Docker
- `db` solo en la red interna de Docker

No depende de RDS, ECS, ECR ni SSH, porque esos puntos suelen dar problemas o requerir permisos extra en cuentas tipo Lab Learner.

## Que cambio en el despliegue

Antes, el flujo principal hacia EC2 instalaba Apache, PM2 y MariaDB directamente sobre la maquina, y copiaba el backend/frontend desempaquetados.

Ahora, el script principal:

1. Despliega la infraestructura base con CloudFormation.
2. Empaqueta el codigo fuente necesario para construir las imagenes Docker.
3. Sube ese paquete a S3.
4. Usa SSM para que la EC2 descargue el paquete.
5. Instala Docker y Docker Compose si hace falta.
6. Genera un `.env.aws` remoto.
7. Ejecuta `docker compose build` y `docker compose up -d`.
8. Valida la app en `http://DNS_PUBLICO/api/health`.

El artefacto sigue viajando como `.tar.gz` por S3, pero la aplicacion ya no se ejecuta "a mano" en EC2: corre completa en contenedores.

## Requisitos previos

Necesitas:

- AWS CLI
- PowerShell
- `tar`
- Credenciales vigentes de AWS

Configura la sesion:

```powershell
aws configure
aws configure set aws_session_token "PEGA_AQUI_TU_SESSION_TOKEN"
aws sts get-caller-identity
```

## Despliegue completo en AWS

Desde la raiz del proyecto:

```powershell
cd C:\Users\migue\OneDrive\Documentos\GoodMates

.\infra\scripts\deploy-goodmates-one-shot.ps1 `
  -Action all `
  -Region us-east-1 `
  -StackName transport-cloud-lab `
  -ProjectName transporte-lab `
  -InstanceType t3.micro
```

Al terminar, el frontend queda en:

```text
http://DNS_PUBLICO_DE_EC2
```

Y el backend se valida via proxy en:

```text
http://DNS_PUBLICO_DE_EC2/api/health
```

## Redeploy solo de la aplicacion

Si la infraestructura ya existe:

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action app -Region us-east-1
```

## Probar el despliegue

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action test -Region us-east-1
```

Eso revisa:

- frontend por HTTP
- backend via `/api/health`
- bundle principal de React

## Eliminar recursos

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action delete -Region us-east-1
```

## Docker local

Para levantar todo localmente:

```powershell
docker compose --env-file .env.docker up --build
```

La app queda en:

```text
http://localhost
```

El frontend usa mismo origen cuando corre en Docker/Nginx, asi que API, Socket.io y uploads viajan por el proxy interno. Si corres el frontend con `react-scripts start`, sigue usando `http://<host>:5001` como fallback para desarrollo.

## Archivos importantes

| Archivo | Funcion |
|---|---|
| `docker-compose.yml` | Stack principal para frontend, backend y MySQL. |
| `infra/docker/docker-compose.aws.yml` | Override para AWS; no expone DB ni backend al exterior. |
| `infra/docker/nginx.conf` | Proxy hacia backend y Socket.io. |
| `infra/scripts/deploy-goodmates-one-shot.ps1` | Script principal de infraestructura + app en Docker. |
| `infra/scripts/deploy-transport-lab.ps1` | Script base de CloudFormation. |
| `infra/aws/goodmates-aws-base.yaml` | VPC, EC2, S3, DynamoDB, CloudWatch y permisos base. |
| `frontend/src/services/api.js` | Resolucion de URL de API e imagenes. |
| `frontend/src/pages/ChatPage.js` | Cliente Socket.io para chat en tiempo real. |
| `backend/src/config/db.js` | Conexion MySQL. |
| `backend/src/config/initDb.js` | Creacion y ajuste del esquema. |

## Consideraciones para AWS Lab Learner

- El script sigue usando `-SkipRds`.
- La base de datos funcional vive en Docker dentro de la EC2.
- Solo se expone el puerto `80` al publico.
- La administracion se hace por SSM, no por SSH.
- No se requiere ECR para que el despliegue funcione.

En produccion real, lo natural seria separar base de datos, TLS, balanceo, secretos y almacenamiento persistente de forma mas robusta.
