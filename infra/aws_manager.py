#!/usr/bin/env python3
"""
aws_manager.py - Gestor de Recursos AWS para GoodMates
=======================================================
Script Python para gestionar todos los recursos de AWS del proyecto GoodMates:
  - ECR: Construccion y push de imagenes Docker
  - CloudFormation: Deploy y actualizacion del stack de infraestructura
  - S3: Subida del build de React al bucket del frontend
  - CloudFront: Invalidacion de cache despues de cada deploy
  - ECS: Actualizacion forzada de servicios (redeploying contenedores)
  - RDS: Informacion del estado de la base de datos

Requisitos:
  pip install boto3 rich click

Configuracion:
  aws configure  (o usar variables de entorno AWS_ACCESS_KEY_ID, etc.)

Uso:
  python aws_manager.py deploy           # Deploy completo
  python aws_manager.py status           # Estado de todos los recursos
  python aws_manager.py push-images      # Solo construir y subir imagenes Docker
  python aws_manager.py update-frontend  # Solo actualizar el frontend en S3+CloudFront
  python aws_manager.py update-backend   # Solo redesplegar el backend en ECS
  python aws_manager.py logs             # Ver logs del backend en tiempo real
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Optional

import boto3
import click
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.text import Text
from botocore.exceptions import ClientError, NoCredentialsError

# ── Configuracion global ─────────────────────────────────────────────────────

console = Console()

# Ruta raiz del proyecto (directorio padre de este script)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# Configuracion del proyecto
CONFIG = {
    "project_name": "goodmates",
    "aws_region": os.getenv("AWS_REGION", "us-east-1"),
    "stack_name": os.getenv("STACK_NAME", "goodmates-prod"),
    "environment": os.getenv("ENVIRONMENT", "production"),
    "cloudformation_template": str(PROJECT_ROOT / "infra" / "aws" / "cloudfront.yaml"),
    "frontend_build_dir": str(PROJECT_ROOT / "frontend" / "build"),
    "backend_dockerfile": str(PROJECT_ROOT / "infra" / "docker" / "Dockerfile.backend"),
    "frontend_dockerfile": str(PROJECT_ROOT / "infra" / "docker" / "Dockerfile.frontend"),
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_aws_account_id(session: boto3.Session) -> str:
    """Obtiene el ID de la cuenta AWS actual."""
    sts = session.client("sts")
    return sts.get_caller_identity()["Account"]


def get_stack_output(cf_client, stack_name: str, output_key: str) -> Optional[str]:
    """Obtiene el valor de un output del stack de CloudFormation."""
    try:
        response = cf_client.describe_stacks(StackName=stack_name)
        outputs = response["Stacks"][0].get("Outputs", [])
        for output in outputs:
            if output["OutputKey"] == output_key:
                return output["OutputValue"]
    except ClientError:
        pass
    return None


def run_command(cmd: list[str], cwd: Optional[str] = None, capture: bool = False) -> int:
    """Ejecuta un comando de shell y retorna el codigo de salida."""
    console.print(f"[dim]▶ {' '.join(cmd)}[/dim]")
    result = subprocess.run(cmd, cwd=cwd or str(PROJECT_ROOT), capture_output=capture)
    if capture:
        return result.returncode, result.stdout.decode(), result.stderr.decode()
    return result.returncode


def check_aws_credentials(session: boto3.Session) -> bool:
    """Verifica que las credenciales de AWS esten configuradas."""
    try:
        sts = session.client("sts")
        identity = sts.get_caller_identity()
        console.print(
            f"[green]✓[/green] Credenciales AWS validas - "
            f"Account: [bold]{identity['Account']}[/bold] | "
            f"ARN: [dim]{identity['Arn']}[/dim]"
        )
        return True
    except NoCredentialsError:
        console.print("[red]✗[/red] No se encontraron credenciales de AWS.")
        console.print("  Ejecuta: [bold]aws configure[/bold]")
        console.print("  O define las variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")
        return False


# ── Gestion de ECR (Elastic Container Registry) ──────────────────────────────

class ECRManager:
    """Gestiona la creacion de repositorios ECR y el push de imagenes Docker."""

    def __init__(self, session: boto3.Session):
        self.ecr = session.client("ecr", region_name=CONFIG["aws_region"])
        self.account_id = get_aws_account_id(session)
        self.region = CONFIG["aws_region"]
        self.registry = f"{self.account_id}.dkr.ecr.{self.region}.amazonaws.com"

    def ensure_repository(self, repo_name: str) -> str:
        """Crea el repositorio ECR si no existe. Retorna el URI del repositorio."""
        try:
            response = self.ecr.describe_repositories(repositoryNames=[repo_name])
            uri = response["repositories"][0]["repositoryUri"]
            console.print(f"[green]✓[/green] Repositorio ECR existente: [bold]{uri}[/bold]")
            return uri
        except ClientError as e:
            if e.response["Error"]["Code"] == "RepositoryNotFoundException":
                console.print(f"[yellow]→[/yellow] Creando repositorio ECR: {repo_name}")
                response = self.ecr.create_repository(
                    repositoryName=repo_name,
                    imageScanningConfiguration={"scanOnPush": True},
                    encryptionConfiguration={"encryptionType": "AES256"},
                )
                uri = response["repository"]["repositoryUri"]
                console.print(f"[green]✓[/green] Repositorio creado: [bold]{uri}[/bold]")
                return uri
            raise

    def login(self) -> bool:
        """Autentica Docker con ECR."""
        console.print("[yellow]→[/yellow] Autenticando Docker con ECR...")
        response = self.ecr.get_authorization_token()
        token_data = response["authorizationData"][0]
        import base64
        token = base64.b64decode(token_data["authorizationToken"]).decode()
        username, password = token.split(":", 1)

        exitcode = run_command([
            "docker", "login",
            "--username", username,
            "--password-stdin",
            self.registry
        ])

        if exitcode != 0:
            # Intenta con echo directamente (Windows)
            proc = subprocess.run(
                ["docker", "login", "--username", username, "--password", password, self.registry],
                capture_output=True
            )
            exitcode = proc.returncode

        if exitcode == 0:
            console.print("[green]✓[/green] Docker autenticado con ECR")
            return True
        else:
            console.print("[red]✗[/red] Fallo la autenticacion con ECR")
            return False

    def build_and_push(self, service: str, dockerfile: str, image_tag: str = "latest") -> str:
        """Construye la imagen Docker y la sube a ECR."""
        repo_name = f"{CONFIG['project_name']}-{service}"
        repo_uri = self.ensure_repository(repo_name)
        full_tag = f"{repo_uri}:{image_tag}"

        console.print(f"\n[bold yellow]Construyendo imagen: {service}[/bold yellow]")

        # Build de la imagen Docker
        exitcode = run_command([
            "docker", "build",
            "-f", dockerfile,
            "-t", full_tag,
            str(PROJECT_ROOT)
        ])

        if exitcode != 0:
            console.print(f"[red]✗[/red] Error al construir la imagen {service}")
            return None

        console.print(f"[green]✓[/green] Imagen construida: {full_tag}")

        # Push a ECR
        console.print(f"[yellow]→[/yellow] Subiendo imagen a ECR...")
        exitcode = run_command(["docker", "push", full_tag])

        if exitcode != 0:
            console.print(f"[red]✗[/red] Error al subir la imagen {service} a ECR")
            return None

        console.print(f"[green]✓[/green] Imagen subida exitosamente: {full_tag}")
        return full_tag


# ── Gestion de CloudFormation ─────────────────────────────────────────────────

class CloudFormationManager:
    """Gestiona el stack de CloudFormation (deploy, update, status)."""

    def __init__(self, session: boto3.Session):
        self.cf = session.client("cloudformation", region_name=CONFIG["aws_region"])
        self.stack_name = CONFIG["stack_name"]

    def stack_exists(self) -> bool:
        """Verifica si el stack ya existe."""
        try:
            self.cf.describe_stacks(StackName=self.stack_name)
            return True
        except ClientError as e:
            if "does not exist" in str(e):
                return False
            raise

    def get_stack_status(self) -> Optional[str]:
        """Retorna el estado actual del stack."""
        try:
            response = self.cf.describe_stacks(StackName=self.stack_name)
            return response["Stacks"][0]["StackStatus"]
        except ClientError:
            return None

    def deploy(self, parameters: dict, template_path: str) -> bool:
        """
        Crea o actualiza el stack de CloudFormation.
        Espera hasta que la operacion complete.
        """
        with open(template_path, "r") as f:
            template_body = f.read()

        cf_parameters = [
            {"ParameterKey": k, "ParameterValue": v}
            for k, v in parameters.items()
        ]

        operation = "update" if self.stack_exists() else "create"

        console.print(f"\n[bold yellow]CloudFormation: {operation.upper()} stack '{self.stack_name}'[/bold yellow]")

        try:
            if operation == "create":
                self.cf.create_stack(
                    StackName=self.stack_name,
                    TemplateBody=template_body,
                    Parameters=cf_parameters,
                    Capabilities=["CAPABILITY_NAMED_IAM"],
                    OnFailure="ROLLBACK",
                    Tags=[
                        {"Key": "Project", "Value": CONFIG["project_name"]},
                        {"Key": "Environment", "Value": CONFIG["environment"]},
                        {"Key": "ManagedBy", "Value": "aws_manager.py"},
                    ],
                )
                waiter = self.cf.get_waiter("stack_create_complete")
            else:
                self.cf.update_stack(
                    StackName=self.stack_name,
                    TemplateBody=template_body,
                    Parameters=cf_parameters,
                    Capabilities=["CAPABILITY_NAMED_IAM"],
                )
                waiter = self.cf.get_waiter("stack_update_complete")

            console.print(f"[yellow]⏳[/yellow] Esperando que el stack {operation} complete...")
            waiter.wait(
                StackName=self.stack_name,
                WaiterConfig={"Delay": 15, "MaxAttempts": 60}
            )
            console.print(f"[green]✓[/green] Stack {operation} completado exitosamente")
            return True

        except ClientError as e:
            error_msg = str(e)
            if "No updates are to be performed" in error_msg:
                console.print("[green]✓[/green] No hay cambios en el stack (ya esta actualizado)")
                return True
            console.print(f"[red]✗[/red] Error en CloudFormation: {error_msg}")
            return False

    def get_outputs(self) -> dict:
        """Retorna todos los outputs del stack como un diccionario."""
        try:
            response = self.cf.describe_stacks(StackName=self.stack_name)
            outputs = response["Stacks"][0].get("Outputs", [])
            return {o["OutputKey"]: o["OutputValue"] for o in outputs}
        except ClientError:
            return {}

    def show_status_table(self):
        """Muestra una tabla con el estado del stack y sus recursos."""
        console.print(f"\n[bold]Stack: {self.stack_name}[/bold]")

        try:
            # Estado general del stack
            response = self.cf.describe_stacks(StackName=self.stack_name)
            stack = response["Stacks"][0]
            status = stack["StackStatus"]
            status_color = "green" if "COMPLETE" in status else "red" if "FAILED" in status else "yellow"

            console.print(f"Estado: [{status_color}]{status}[/{status_color}]")
            console.print(f"Creado: {stack.get('CreationTime', 'N/A')}")
            console.print(f"Actualizado: {stack.get('LastUpdatedTime', 'N/A')}")

            # Tabla de outputs
            outputs = self.get_outputs()
            if outputs:
                table = Table(title="Outputs del Stack", show_header=True)
                table.add_column("Output", style="cyan")
                table.add_column("Valor", style="white")

                for key, value in outputs.items():
                    table.add_row(key, value)

                console.print(table)

        except ClientError as e:
            console.print(f"[red]Error al obtener estado del stack: {e}[/red]")


# ── Gestion de S3 (Frontend) ──────────────────────────────────────────────────

class S3Manager:
    """Gestiona la subida del build de React al bucket S3."""

    def __init__(self, session: boto3.Session):
        self.s3 = session.client("s3", region_name=CONFIG["aws_region"])

    def sync_frontend(self, bucket_name: str) -> bool:
        """
        Sube todos los archivos del build de React al bucket S3.
        Establece correctamente los Cache-Control headers.
        """
        build_dir = CONFIG["frontend_build_dir"]

        if not os.path.exists(build_dir):
            console.print(f"[red]✗[/red] No se encontro el build de React en: {build_dir}")
            console.print("  Ejecuta primero: cd frontend && npm run build")
            return False

        console.print(f"\n[bold yellow]Subiendo frontend a S3: {bucket_name}[/bold yellow]")

        # Contar archivos
        files = list(Path(build_dir).rglob("*"))
        files = [f for f in files if f.is_file()]
        total = len(files)
        uploaded = 0
        errors = 0

        def get_content_type(filepath: str) -> str:
            """Detecta el Content-Type del archivo."""
            types = {
                ".html": "text/html",
                ".css": "text/css",
                ".js": "application/javascript",
                ".json": "application/json",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".svg": "image/svg+xml",
                ".ico": "image/x-icon",
                ".woff": "font/woff",
                ".woff2": "font/woff2",
                ".ttf": "font/ttf",
                ".txt": "text/plain",
                ".webp": "image/webp",
            }
            ext = Path(filepath).suffix.lower()
            return types.get(ext, "application/octet-stream")

        def get_cache_control(filepath: str) -> str:
            """Define el Cache-Control segun el tipo de archivo."""
            name = Path(filepath).name
            ext = Path(filepath).suffix.lower()

            if name == "index.html":
                # index.html NUNCA se cachea (permite actualizaciones inmediatas)
                return "no-cache, no-store, must-revalidate"
            elif ext in [".js", ".css"] and "." in name.replace(ext, ""):
                # Archivos con hash en el nombre (ej: main.abc123.js) se cachean eternamente
                return "public, max-age=31536000, immutable"
            else:
                return "public, max-age=86400"  # 1 dia para el resto

        for file_path in files:
            relative_key = str(file_path.relative_to(build_dir)).replace("\\", "/")
            try:
                self.s3.upload_file(
                    str(file_path),
                    bucket_name,
                    relative_key,
                    ExtraArgs={
                        "ContentType": get_content_type(str(file_path)),
                        "CacheControl": get_cache_control(str(file_path)),
                    }
                )
                uploaded += 1
                if uploaded % 10 == 0 or uploaded == total:
                    console.print(f"  [dim]Subidos {uploaded}/{total} archivos...[/dim]")
            except Exception as e:
                console.print(f"[red]✗[/red] Error subiendo {relative_key}: {e}")
                errors += 1

        if errors == 0:
            console.print(f"[green]✓[/green] Frontend subido exitosamente: {total} archivos")
            return True
        else:
            console.print(f"[yellow]⚠[/yellow] Frontend subido con {errors} errores de {total} archivos")
            return False


# ── Gestion de CloudFront ─────────────────────────────────────────────────────

class CloudFrontManager:
    """Gestiona la invalidacion de cache de CloudFront."""

    def __init__(self, session: boto3.Session):
        self.cf = session.client("cloudfront", region_name="us-east-1")  # CF es global, siempre us-east-1

    def invalidate(self, distribution_id: str, paths: list[str] = None) -> bool:
        """
        Crea una invalidacion de cache en CloudFront.
        Por defecto invalida todo (/*).
        """
        if not distribution_id:
            console.print("[red]✗[/red] No se encontro el Distribution ID de CloudFront")
            return False

        if paths is None:
            paths = ["/*"]  # Invalida todo el cache

        console.print(f"\n[bold yellow]Invalidando cache de CloudFront: {distribution_id}[/bold yellow]")
        console.print(f"  Paths: {', '.join(paths)}")

        try:
            response = self.cf.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch={
                    "Paths": {
                        "Quantity": len(paths),
                        "Items": paths,
                    },
                    "CallerReference": str(int(time.time())),
                }
            )

            invalidation_id = response["Invalidation"]["Id"]
            status = response["Invalidation"]["Status"]

            console.print(f"[green]✓[/green] Invalidacion iniciada: {invalidation_id} (Status: {status})")
            console.print("  [dim]La invalidacion puede tardar 1-5 minutos en propagarse globalmente[/dim]")
            return True

        except ClientError as e:
            console.print(f"[red]✗[/red] Error al invalidar CloudFront: {e}")
            return False

    def get_distribution_info(self, distribution_id: str) -> dict:
        """Obtiene informacion de la distribucion CloudFront."""
        try:
            response = self.cf.get_distribution(Id=distribution_id)
            dist = response["Distribution"]
            config = dist["DistributionConfig"]
            return {
                "id": dist["Id"],
                "domain": dist["DomainName"],
                "status": dist["Status"],
                "enabled": config["Enabled"],
                "price_class": config.get("PriceClass", "N/A"),
                "http_version": config.get("HttpVersion", "N/A"),
            }
        except ClientError:
            return {}


# ── Gestion de ECS ────────────────────────────────────────────────────────────

class ECSManager:
    """Gestiona los servicios de ECS Fargate."""

    def __init__(self, session: boto3.Session):
        self.ecs = session.client("ecs", region_name=CONFIG["aws_region"])
        self.logs_client = session.client("logs", region_name=CONFIG["aws_region"])
        self.cluster_name = f"{CONFIG['project_name']}-cluster"

    def force_redeploy(self, service_name: str) -> bool:
        """Fuerza un redeploy del servicio ECS (sin cambiar la task definition)."""
        full_service = f"{CONFIG['project_name']}-{service_name}-service"
        console.print(f"[yellow]→[/yellow] Redesplegando servicio: {full_service}")

        try:
            self.ecs.update_service(
                cluster=self.cluster_name,
                service=full_service,
                forceNewDeployment=True,
            )
            console.print(f"[green]✓[/green] Redeploy iniciado para {full_service}")
            return True
        except ClientError as e:
            console.print(f"[red]✗[/red] Error al redesplegar {full_service}: {e}")
            return False

    def update_service_image(self, service_name: str, new_image: str) -> bool:
        """Actualiza la imagen Docker en la Task Definition y redesploya el servicio."""
        full_service = f"{CONFIG['project_name']}-{service_name}-service"
        task_family = f"{CONFIG['project_name']}-{service_name}"

        console.print(f"[yellow]→[/yellow] Actualizando imagen de {service_name}: {new_image}")

        try:
            # Obtener la task definition actual
            response = self.ecs.describe_task_definition(taskDefinition=task_family)
            task_def = response["taskDefinition"]

            # Actualizar la imagen en el contenedor
            containers = task_def["containerDefinitions"]
            for container in containers:
                if container["name"] == service_name:
                    container["image"] = new_image

            # Registrar nueva revision de la task definition
            new_td = self.ecs.register_task_definition(
                family=task_family,
                containerDefinitions=containers,
                cpu=task_def["cpu"],
                memory=task_def["memory"],
                networkMode=task_def["networkMode"],
                requiresCompatibilities=task_def["requiresCompatibilities"],
                executionRoleArn=task_def["executionRoleArn"],
                taskRoleArn=task_def.get("taskRoleArn", ""),
            )

            new_td_arn = new_td["taskDefinition"]["taskDefinitionArn"]
            console.print(f"[green]✓[/green] Nueva task definition registrada: {new_td_arn.split('/')[-1]}")

            # Actualizar el servicio con la nueva task definition
            self.ecs.update_service(
                cluster=self.cluster_name,
                service=full_service,
                taskDefinition=new_td_arn,
                forceNewDeployment=True,
            )
            console.print(f"[green]✓[/green] Servicio actualizado con nueva imagen")
            return True

        except ClientError as e:
            console.print(f"[red]✗[/red] Error al actualizar imagen: {e}")
            return False

    def get_service_status(self) -> list[dict]:
        """Retorna el estado de todos los servicios ECS del proyecto."""
        try:
            # Listar servicios del cluster
            response = self.ecs.list_services(cluster=self.cluster_name)
            if not response["serviceArns"]:
                return []

            details = self.ecs.describe_services(
                cluster=self.cluster_name,
                services=response["serviceArns"]
            )

            services = []
            for svc in details["services"]:
                deploy = svc.get("deployments", [{}])[0]
                services.append({
                    "name": svc["serviceName"],
                    "status": svc["status"],
                    "desired": svc["desiredCount"],
                    "running": svc["runningCount"],
                    "pending": svc["pendingCount"],
                    "deploy_status": deploy.get("status", "N/A"),
                })
            return services

        except ClientError:
            return []

    def stream_logs(self, service_name: str, tail: int = 50):
        """Muestra los ultimos logs del backend en CloudWatch."""
        log_group = f"/ecs/{CONFIG['project_name']}/{service_name}"
        console.print(f"[bold yellow]Logs de {service_name} (ultimas {tail} lineas):[/bold yellow]")

        try:
            # Obtener los streams de log mas recientes
            streams_resp = self.logs_client.describe_log_streams(
                logGroupName=log_group,
                orderBy="LastEventTime",
                descending=True,
                limit=3,
            )

            if not streams_resp["logStreams"]:
                console.print("[yellow]No hay logs disponibles aun[/yellow]")
                return

            for stream in streams_resp["logStreams"][:2]:
                stream_name = stream["logStreamName"]
                console.print(f"[dim]Stream: {stream_name}[/dim]")

                events_resp = self.logs_client.get_log_events(
                    logGroupName=log_group,
                    logStreamName=stream_name,
                    limit=tail,
                    startFromHead=False,
                )

                for event in events_resp["events"]:
                    timestamp = time.strftime(
                        "%Y-%m-%d %H:%M:%S",
                        time.localtime(event["timestamp"] / 1000)
                    )
                    message = event["message"].strip()
                    console.print(f"[dim]{timestamp}[/dim] {message}")

        except ClientError as e:
            console.print(f"[red]Error al obtener logs: {e}[/red]")


# ── Gestion de RDS ────────────────────────────────────────────────────────────

class RDSManager:
    """Informacion y gestion basica de la base de datos RDS."""

    def __init__(self, session: boto3.Session):
        self.rds = session.client("rds", region_name=CONFIG["aws_region"])
        self.instance_id = f"{CONFIG['project_name']}-mysql"

    def get_status(self) -> dict:
        """Retorna informacion del estado de la instancia RDS."""
        try:
            response = self.rds.describe_db_instances(DBInstanceIdentifier=self.instance_id)
            instance = response["DBInstances"][0]
            return {
                "id": instance["DBInstanceIdentifier"],
                "status": instance["DBInstanceStatus"],
                "engine": f"{instance['Engine']} {instance['EngineVersion']}",
                "instance_class": instance["DBInstanceClass"],
                "endpoint": instance.get("Endpoint", {}).get("Address", "N/A"),
                "port": instance.get("Endpoint", {}).get("Port", "N/A"),
                "multi_az": instance["MultiAZ"],
                "storage_gb": instance["AllocatedStorage"],
                "backup_retention": instance["BackupRetentionPeriod"],
            }
        except ClientError:
            return {}

    def show_status(self):
        """Muestra el estado de la RDS en una tabla."""
        info = self.get_status()
        if not info:
            console.print("[yellow]⚠[/yellow] No se encontro la instancia RDS")
            return

        table = Table(title=f"RDS MySQL - {self.instance_id}", show_header=False)
        table.add_column("Campo", style="cyan")
        table.add_column("Valor", style="white")

        status_color = "green" if info["status"] == "available" else "yellow"
        table.add_row("Estado", f"[{status_color}]{info['status']}[/{status_color}]")
        table.add_row("Motor", info["engine"])
        table.add_row("Clase", info["instance_class"])
        table.add_row("Endpoint", str(info["endpoint"]))
        table.add_row("Puerto", str(info["port"]))
        table.add_row("Multi-AZ", "Si" if info["multi_az"] else "No")
        table.add_row("Almacenamiento", f"{info['storage_gb']} GB")
        table.add_row("Backup (dias)", str(info["backup_retention"]))

        console.print(table)


# ── CLI Commands ──────────────────────────────────────────────────────────────

@click.group()
@click.option("--region", default=CONFIG["aws_region"], help="Region de AWS")
@click.option("--profile", default=None, help="Perfil de AWS (~/.aws/credentials)")
@click.pass_context
def cli(ctx, region, profile):
    """
    GoodMates AWS Manager - Gestiona la infraestructura de AWS del proyecto.
    """
    ctx.ensure_object(dict)
    CONFIG["aws_region"] = region

    session = boto3.Session(
        region_name=region,
        profile_name=profile,
    )

    if not check_aws_credentials(session):
        sys.exit(1)

    ctx.obj["session"] = session
    ctx.obj["account_id"] = get_aws_account_id(session)


@cli.command()
@click.option("--db-password", required=True, envvar="DB_PASSWORD", help="Password de MySQL")
@click.option("--jwt-secret", required=True, envvar="JWT_SECRET", help="Secreto JWT")
@click.option("--google-client-id", default="", envvar="GOOGLE_CLIENT_ID")
@click.option("--certificate-arn", default="", envvar="CERTIFICATE_ARN")
@click.option("--image-tag", default="latest", help="Tag para las imagenes Docker")
@click.option("--skip-build", is_flag=True, help="Omitir build de imagenes Docker")
@click.option("--skip-infra", is_flag=True, help="Omitir deploy de CloudFormation")
@click.pass_context
def deploy(ctx, db_password, jwt_secret, google_client_id, certificate_arn, image_tag, skip_build, skip_infra):
    """
    Deploy completo: imagenes Docker + infraestructura CloudFormation + frontend S3.
    """
    session = ctx.obj["session"]
    account_id = ctx.obj["account_id"]

    console.print(Panel.fit(
        f"[bold green]GoodMates - Deploy a AWS[/bold green]\n"
        f"Region: [cyan]{CONFIG['aws_region']}[/cyan] | "
        f"Stack: [cyan]{CONFIG['stack_name']}[/cyan] | "
        f"Account: [cyan]{account_id}[/cyan]"
    ))

    backend_image = None
    frontend_image = None

    # ── PASO 1: Build y Push de imagenes Docker ─────────────────
    if not skip_build:
        ecr = ECRManager(session)
        if not ecr.login():
            sys.exit(1)

        backend_image = ecr.build_and_push("backend", CONFIG["backend_dockerfile"], image_tag)
        frontend_image = ecr.build_and_push("frontend", CONFIG["frontend_dockerfile"], image_tag)

        if not backend_image or not frontend_image:
            console.print("[red]✗[/red] Fallo el build de imagenes. Abortando deploy.")
            sys.exit(1)
    else:
        # Usar las imagenes existentes en ECR
        region = CONFIG["aws_region"]
        backend_image = f"{account_id}.dkr.ecr.{region}.amazonaws.com/goodmates-backend:{image_tag}"
        frontend_image = f"{account_id}.dkr.ecr.{region}.amazonaws.com/goodmates-frontend:{image_tag}"
        console.print(f"[yellow]→[/yellow] Usando imagenes existentes: {image_tag}")

    # ── PASO 2: Deploy de infraestructura CloudFormation ────────
    if not skip_infra:
        cf = CloudFormationManager(session)
        parameters = {
            "ProjectName": CONFIG["project_name"],
            "Environment": CONFIG["environment"],
            "BackendImage": backend_image,
            "FrontendImage": frontend_image,
            "DBPassword": db_password,
            "JWTSecret": jwt_secret,
            "GoogleClientId": google_client_id,
            "CertificateArn": certificate_arn,
        }

        success = cf.deploy(parameters, CONFIG["cloudformation_template"])
        if not success:
            console.print("[red]✗[/red] Fallo el deploy de CloudFormation. Abortando.")
            sys.exit(1)

    # ── PASO 3: Build del frontend React ────────────────────────
    console.print("\n[bold yellow]Construyendo frontend React...[/bold yellow]")
    exitcode = run_command(["npm", "run", "build"], cwd=str(PROJECT_ROOT / "frontend"))
    if exitcode != 0:
        console.print("[red]✗[/red] Fallo el build de React")
        sys.exit(1)
    console.print("[green]✓[/green] Build de React completado")

    # ── PASO 4: Subir frontend a S3 ─────────────────────────────
    cf_manager = CloudFormationManager(session)
    outputs = cf_manager.get_outputs()

    bucket_name = outputs.get("FrontendBucketName")
    distribution_id = outputs.get("CloudFrontDistributionId")

    if bucket_name:
        s3 = S3Manager(session)
        if not s3.sync_frontend(bucket_name):
            console.print("[yellow]⚠[/yellow] Problemas al subir el frontend a S3")
    else:
        console.print("[yellow]⚠[/yellow] No se encontro el bucket S3 en los outputs del stack")

    # ── PASO 5: Invalidar cache de CloudFront ───────────────────
    if distribution_id:
        cf_cdn = CloudFrontManager(session)
        cf_cdn.invalidate(distribution_id)
    else:
        console.print("[yellow]⚠[/yellow] No se encontro el Distribution ID de CloudFront")

    # ── Resumen final ────────────────────────────────────────────
    cloudfront_url = outputs.get("CloudFrontURL", "Revisa la consola de AWS")
    console.print(Panel.fit(
        f"[bold green]✓ Deploy completado exitosamente![/bold green]\n\n"
        f"🌐 URL de la aplicacion: [bold cyan]{cloudfront_url}[/bold cyan]\n"
        f"📊 Consola AWS: https://console.aws.amazon.com/cloudformation\n"
        f"📝 Logs ECS: https://console.aws.amazon.com/ecs"
    ))


@cli.command()
@click.pass_context
def status(ctx):
    """Muestra el estado de todos los recursos AWS del proyecto."""
    session = ctx.obj["session"]

    console.print(Panel.fit("[bold]Estado de GoodMates en AWS[/bold]"))

    # CloudFormation
    console.print("\n[bold cyan]CloudFormation[/bold cyan]")
    cf = CloudFormationManager(session)
    cf.show_status_table()

    # ECS Services
    console.print("\n[bold cyan]ECS Services[/bold cyan]")
    ecs = ECSManager(session)
    services = ecs.get_service_status()
    if services:
        table = Table(title="Servicios ECS", show_header=True)
        table.add_column("Servicio", style="cyan")
        table.add_column("Estado")
        table.add_column("Deseados", justify="center")
        table.add_column("Corriendo", justify="center")
        table.add_column("Pendientes", justify="center")
        table.add_column("Deploy", style="dim")

        for svc in services:
            running_color = "green" if svc["running"] == svc["desired"] else "yellow"
            table.add_row(
                svc["name"],
                svc["status"],
                str(svc["desired"]),
                f"[{running_color}]{svc['running']}[/{running_color}]",
                str(svc["pending"]),
                svc["deploy_status"],
            )
        console.print(table)
    else:
        console.print("[yellow]No se encontraron servicios ECS[/yellow]")

    # RDS
    console.print("\n[bold cyan]RDS MySQL[/bold cyan]")
    rds = RDSManager(session)
    rds.show_status()


@cli.command()
@click.option("--image-tag", default="latest")
@click.pass_context
def push_images(ctx, image_tag):
    """Solo construye y sube las imagenes Docker a ECR."""
    session = ctx.obj["session"]
    ecr = ECRManager(session)

    if not ecr.login():
        sys.exit(1)

    backend_image = ecr.build_and_push("backend", CONFIG["backend_dockerfile"], image_tag)
    frontend_image = ecr.build_and_push("frontend", CONFIG["frontend_dockerfile"], image_tag)

    if backend_image and frontend_image:
        console.print("\n[green]✓ Imagenes subidas exitosamente:[/green]")
        console.print(f"  Backend:  {backend_image}")
        console.print(f"  Frontend: {frontend_image}")
    else:
        sys.exit(1)


@cli.command()
@click.pass_context
def update_frontend(ctx):
    """Rebuilda el frontend React y lo sube a S3 + invalida CloudFront."""
    session = ctx.obj["session"]

    # Build de React
    console.print("[bold yellow]Construyendo frontend React...[/bold yellow]")
    exitcode = run_command(["npm", "run", "build"], cwd=str(PROJECT_ROOT / "frontend"))
    if exitcode != 0:
        sys.exit(1)

    # Obtener outputs del stack
    cf = CloudFormationManager(session)
    outputs = cf.get_outputs()

    bucket_name = outputs.get("FrontendBucketName")
    distribution_id = outputs.get("CloudFrontDistributionId")

    if not bucket_name:
        console.print("[red]✗[/red] No se encontro el bucket S3. Verifica que el stack este desplegado.")
        sys.exit(1)

    # Subir a S3
    s3 = S3Manager(session)
    s3.sync_frontend(bucket_name)

    # Invalidar CloudFront
    if distribution_id:
        cf_cdn = CloudFrontManager(session)
        cf_cdn.invalidate(distribution_id)

    console.print("[green]✓ Frontend actualizado exitosamente[/green]")


@cli.command()
@click.pass_context
def update_backend(ctx):
    """Fuerza un redeploy del servicio backend en ECS."""
    session = ctx.obj["session"]
    ecs = ECSManager(session)
    ecs.force_redeploy("backend")


@cli.command()
@click.option("--service", default="backend", type=click.Choice(["backend", "frontend"]))
@click.option("--tail", default=50, help="Numero de lineas a mostrar")
@click.pass_context
def logs(ctx, service, tail):
    """Muestra los logs de un servicio ECS desde CloudWatch."""
    session = ctx.obj["session"]
    ecs = ECSManager(session)
    ecs.stream_logs(service, tail)


@cli.command()
@click.pass_context
def info(ctx):
    """Muestra la configuracion actual del gestor."""
    table = Table(title="Configuracion del AWS Manager", show_header=False)
    table.add_column("Parametro", style="cyan")
    table.add_column("Valor")

    account_id = ctx.obj["account_id"]
    region = CONFIG["aws_region"]

    for k, v in CONFIG.items():
        table.add_row(k, str(v))

    table.add_row("aws_account_id", account_id)
    table.add_row("ecr_registry", f"{account_id}.dkr.ecr.{region}.amazonaws.com")

    console.print(table)


# ── Punto de entrada ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli(obj={})
