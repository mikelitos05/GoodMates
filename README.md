# GoodMates

GoodMates es una aplicación web para gestión de roommates, propiedades, perfiles, solicitudes, grupos de convivencia, tareas, tablero compartido y chat. El proyecto está dividido en un frontend React y un backend Node.js/Express con base de datos MySQL/MariaDB.

Este README se enfoca principalmente en el despliegue de GoodMates en AWS Learner Lab.

## Arquitectura del Proyecto

```text
GoodMates/
├── backend/                  # API Node.js / Express
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── utils/
│   ├── uploads/
│   ├── package.json
│   └── package-lock.json
├── frontend/                 # Aplicación React
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── infra/
│   ├── aws/
│   │   └── learner-lab-transport.yaml
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── nginx.conf
│   └── scripts/
│       ├── deploy-goodmates-one-shot.ps1
│       └── deploy-transport-lab.ps1
├── docker-compose.yml
└── .env.docker
```

## Componentes Principales

| Componente | Tecnología | Función |
|---|---|---|
| Frontend | React | Interfaz web de GoodMates. |
| Backend | Node.js + Express | API REST, autenticación, lógica de negocio y Socket.io. |
| Base de datos | MySQL/MariaDB | Persistencia de usuarios, propiedades, grupos, tareas y mensajes. |
| Servidor web | Apache en EC2 | Sirve el build estático del frontend. |
| Process manager | PM2 | Mantiene activo el backend en EC2. |
| Infraestructura | CloudFormation | Crea VPC, EC2, S3, DynamoDB, CloudWatch y Security Groups. |
| Acceso administrativo | AWS Systems Manager | Permite administrar EC2 sin SSH. |

## Despliegue en AWS Learner Lab

El despliegue recomendado se hace con el script:

```text
infra/scripts/deploy-goodmates-one-shot.ps1
```

Este script automatiza todo el proceso:

1. Crea o actualiza la infraestructura base en AWS.
2. Compila el frontend React.
3. Empaqueta frontend y backend.
4. Sube el paquete a S3.
5. Descarga el paquete desde EC2 mediante una URL prefirmada.
6. Instala Node.js, Apache, PM2 y MariaDB en EC2.
7. Configura la base de datos local.
8. Publica el frontend en Apache.
9. Inicia el backend con PM2.
10. Valida que frontend, backend y bundle de React respondan correctamente.

## Requisitos Previos

En tu equipo necesitas:

- AWS CLI instalado.
- Node.js y npm instalados.
- PowerShell.
- `tar` disponible en la terminal.
- Credenciales activas de AWS Learner Lab.

Configura AWS CLI con las credenciales temporales del laboratorio:

```powershell
aws configure
aws configure set aws_session_token "PEGA_AQUI_TU_SESSION_TOKEN"
aws sts get-caller-identity
```

El último comando debe devolver tu cuenta y ARN temporal del laboratorio.

## Despliegue Completo One-Shot

Desde la raíz del proyecto:

```powershell
cd C:\Users\migue\OneDrive\Documentos\GoodMates

.\infra\scripts\deploy-goodmates-one-shot.ps1 `
  -Action all `
  -Region us-east-1 `
  -StackName transport-cloud-lab `
  -ProjectName transporte-lab `
  -InstanceType t3.micro
```

Este comando despliega infraestructura y aplicación.

Al terminar, el script mostrará dos URLs:

```text
Frontend: http://DNS_PUBLICO_DE_EC2
Backend:  http://DNS_PUBLICO_DE_EC2:5001/api/health
```

Usa `http://`, no `https://`, porque este despliegue de laboratorio no configura certificado SSL.

## Actualizar Solo la Aplicación

Si la infraestructura ya existe y solo quieres recompilar y redeplegar GoodMates:

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action app -Region us-east-1
```

Esto no recrea la VPC ni la EC2. Solo vuelve a compilar, empaquetar y publicar GoodMates sobre la instancia existente.

## Probar el Despliegue

Para validar que todo quedó funcionando:

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action test -Region us-east-1
```

La prueba revisa:

- Frontend por HTTP.
- Backend en `/api/health`.
- Bundle principal de React.

El backend debe responder algo similar a:

```json
{
  "success": true,
  "message": "Servidor GoodMates funcionando correctamente"
}
```

## Eliminar Recursos

Al terminar la práctica o las capturas, elimina los recursos para no consumir presupuesto del Learner Lab:

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action delete -Region us-east-1
```

Esto elimina el stack de CloudFormation y los recursos asociados.

## Acciones Disponibles del Script

| Acción | Descripción |
|---|---|
| `all` | Crea/actualiza infraestructura y despliega GoodMates. |
| `infra` | Solo crea o actualiza la infraestructura AWS. |
| `app` | Solo despliega la aplicación en una EC2 existente. |
| `test` | Valida frontend, backend y JS principal. |
| `delete` | Elimina el stack y los recursos creados. |

## Infraestructura Creada

El template `infra/aws/learner-lab-transport.yaml` crea:

- VPC.
- Subredes públicas y privadas.
- Internet Gateway.
- Security Group para puertos `80` y `5001`.
- EC2 con Amazon Linux 2023.
- S3 privado para paquetes y evidencias.
- DynamoDB para eventos/evidencias.
- CloudWatch Alarm y Dashboard.
- Acceso administrativo mediante Systems Manager.

## Restricciones del Learner Lab

Durante el despliegue se adaptó la arquitectura a las restricciones del laboratorio:

- No se usó SSH; se usó AWS Systems Manager Session Manager.
- RDS no se desplegó porque el laboratorio bloqueó `rds:CreateDBInstance`.
- Lambda no se desplegó si no existe un rol asumible por Lambda.
- La base de datos funcional de GoodMates se instaló como MariaDB local dentro de EC2.
- El volumen raíz de EC2 se crea cifrado para cumplir con las políticas del entorno.

En un ambiente real de producción, lo recomendable sería usar Amazon RDS para la base de datos, HTTPS con CloudFront o Application Load Balancer y secretos administrados con AWS Secrets Manager.

## Cómo Queda GoodMates en EC2

Después del despliegue:

```text
/var/www/html
```

Contiene el frontend React compilado.

```text
/opt/goodmates/backend
```

Contiene el backend Node.js/Express.

PM2 ejecuta el backend como:

```text
goodmates-backend
```

La base de datos local se crea con:

```text
DB_NAME=goodmates
DB_USER=goodmates_user
DB_PASSWORD=GoodMatesLab2026
```

## Docker

El proyecto también incluye soporte Docker:

```text
infra/docker/Dockerfile.backend
infra/docker/Dockerfile.frontend
docker-compose.yml
```

Para levantar GoodMates localmente con Docker:

```powershell
docker-compose --env-file .env.docker up --build
```

Esto crea:

- Contenedor MySQL.
- Contenedor backend.
- Contenedor frontend con Nginx.

Docker es útil para desarrollo y pruebas, mientras que el script one-shot se usa para el despliegue en AWS Learner Lab.

## Archivos Clave Para el Despliegue

| Archivo | Importancia |
|---|---|
| `infra/scripts/deploy-goodmates-one-shot.ps1` | Script principal de despliegue completo. |
| `infra/scripts/deploy-transport-lab.ps1` | Script base para infraestructura AWS. |
| `infra/aws/learner-lab-transport.yaml` | Template CloudFormation. |
| `backend/package.json` | Dependencias y arranque del backend. |
| `backend/src/server.js` | Entrada principal del backend. |
| `backend/src/config/db.js` | Conexión a la base de datos. |
| `backend/src/config/initDb.js` | Creación/verificación de tablas. |
| `frontend/package.json` | Dependencias y build del frontend. |
| `frontend/src/App.js` | Rutas principales de React. |
| `frontend/src/services/api.js` | Configura llamadas al backend en el puerto `5001`. |
| `docker-compose.yml` | Despliegue local con contenedores. |

## Problemas Comunes

### La página se ve en blanco

Verifica que el bundle JS responda con HTTP 200:

```powershell
.\infra\scripts\deploy-goodmates-one-shot.ps1 -Action test -Region us-east-1
```

El script corrige permisos de Apache con `chmod` y `restorecon`.

### `SessionManagerPlugin is not found`

AWS CLI está instalado, pero falta el plugin local de Session Manager. Puedes entrar por la consola de AWS en:

```text
Systems Manager > Session Manager > Start session
```

### El stack está en `ROLLBACK_COMPLETE`

CloudFormation no permite actualizar un stack en ese estado. El script one-shot intenta borrarlo automáticamente antes de recrearlo.

### RDS da error de permisos

Es una restricción del Learner Lab. Para esta práctica se usa MariaDB local en EC2.

## Resumen

GoodMates puede desplegarse en AWS Learner Lab usando un flujo automatizado con PowerShell, CloudFormation, S3, EC2, Apache, PM2 y MariaDB. El objetivo del despliegue es tener una forma repetible de publicar la aplicación sin configurar cada componente manualmente.

