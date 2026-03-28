#!/usr/bin/env python3
"""
backup.py — Script de respaldo para el proyecto GoodMates.

Crea un archivo .tar.gz comprimido con todos los archivos del proyecto,
excluyendo directorios y archivos innecesarios como node_modules, .git, build, .env, etc.

Uso:
    python3 backup.py
    python3 backup.py --destino /ruta/a/backups
    python3 backup.py --proyecto /ruta/al/proyecto --destino /ruta/a/backups
"""

import os
import sys
import tarfile
import argparse
from datetime import datetime


# Patrones de exclusión (directorios y archivos que NO se respaldan)
EXCLUSIONES = [
    "node_modules",
    ".git",
    "build",
    "__pycache__",
    ".env",
    ".env.local",
    ".env.development.local",
    ".env.test.local",
    ".env.production.local",
    ".DS_Store",
    "*.tar.gz",
    "commit_log.txt",
]


def debe_excluir(ruta, exclusiones):
    """
    Determina si una ruta debe ser excluida del respaldo.

    Args:
        ruta (str): Ruta del archivo o directorio.
        exclusiones (list): Lista de nombres/patrones a excluir.

    Returns:
        bool: True si debe excluirse, False en caso contrario.
    """
    nombre = os.path.basename(ruta)
    for patron in exclusiones:
        # Coincidencia exacta de nombre
        if nombre == patron:
            return True
        # Coincidencia por extensión (ej. *.tar.gz)
        if patron.startswith("*") and nombre.endswith(patron[1:]):
            return True
    return False


def filtro_tar(info):
    """
    Filtro para tarfile que excluye archivos/directorios no deseados.

    Args:
        info (tarfile.TarInfo): Información del archivo a agregar.

    Returns:
        tarfile.TarInfo o None: El objeto TarInfo si debe incluirse, None si se excluye.
    """
    # Verificar cada componente de la ruta
    partes = info.name.split(os.sep)
    for parte in partes:
        if debe_excluir(parte, EXCLUSIONES):
            return None
    return info


def formatear_tamano(tamano_bytes):
    """
    Convierte bytes a un formato legible (KB, MB, GB).

    Args:
        tamano_bytes (int): Tamaño en bytes.

    Returns:
        str: Tamaño formateado con unidad.
    """
    for unidad in ["B", "KB", "MB", "GB"]:
        if tamano_bytes < 1024.0:
            return f"{tamano_bytes:.2f} {unidad}"
        tamano_bytes /= 1024.0
    return f"{tamano_bytes:.2f} TB"


def crear_respaldo(ruta_proyecto, ruta_destino):
    """
    Crea un archivo de respaldo .tar.gz del proyecto.

    Args:
        ruta_proyecto (str): Ruta absoluta al directorio del proyecto.
        ruta_destino (str): Ruta absoluta al directorio donde se guardará el respaldo.

    Returns:
        str: Ruta al archivo de respaldo creado.
    """
    # Validar que el directorio del proyecto existe
    if not os.path.isdir(ruta_proyecto):
        print(f"Error: El directorio del proyecto no existe: {ruta_proyecto}")
        sys.exit(1)

    # Crear el directorio de destino si no existe
    os.makedirs(ruta_destino, exist_ok=True)

    # Generar nombre del archivo con fecha y hora
    ahora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    nombre_proyecto = os.path.basename(os.path.normpath(ruta_proyecto))
    nombre_archivo = f"{nombre_proyecto}_backup_{ahora}.tar.gz"
    ruta_archivo = os.path.join(ruta_destino, nombre_archivo)

    print("=" * 60)
    print("  RESPALDO DE GOODMATES")
    print("=" * 60)
    print(f"  Proyecto : {ruta_proyecto}")
    print(f"  Destino  : {ruta_destino}")
    print(f"  Archivo  : {nombre_archivo}")
    print("-" * 60)

    # Contar archivos para mostrar progreso
    archivos_incluidos = 0
    archivos_excluidos = 0

    def filtro_con_conteo(info):
        nonlocal archivos_incluidos, archivos_excluidos
        resultado = filtro_tar(info)
        if resultado is None:
            archivos_excluidos += 1
        else:
            archivos_incluidos += 1
        return resultado

    # Crear el archivo tar.gz
    try:
        with tarfile.open(ruta_archivo, "w:gz") as tar:
            tar.add(ruta_proyecto, arcname=nombre_proyecto, filter=filtro_con_conteo)

        tamano = os.path.getsize(ruta_archivo)

        print(f"\n  Respaldo creado exitosamente")
        print(f"   Archivos incluidos : {archivos_incluidos}")
        print(f"  Archivos excluidos : {archivos_excluidos}")
        print(f"  Tamaño del respaldo: {formatear_tamano(tamano)}")
        print(f"  Ubicación: {ruta_archivo}")
        print("=" * 60)

        return ruta_archivo

    except PermissionError:
        print(f"Error: Sin permisos para escribir en: {ruta_destino}")
        sys.exit(1)
    except Exception as e:
        print(f"Error al crear el respaldo: {e}")
        sys.exit(1)


def main():
    """Punto de entrada principal del script."""
    # Determinar la ruta del proyecto (un nivel arriba del directorio scripts/)
    directorio_script = os.path.dirname(os.path.abspath(__file__))
    ruta_proyecto_default = os.path.dirname(directorio_script)
    ruta_destino_default = os.path.expanduser("~/backups/GoodMates")

    parser = argparse.ArgumentParser(
        description="Script de respaldo para el proyecto GoodMates",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python3 backup.py
  python3 backup.py --destino /home/usuario/mis_backups
  python3 backup.py --proyecto /ruta/al/proyecto --destino /tmp/backups
        """,
    )
    parser.add_argument(
        "--proyecto",
        type=str,
        default=ruta_proyecto_default,
        help=f"Ruta al directorio del proyecto (default: {ruta_proyecto_default})",
    )
    parser.add_argument(
        "--destino",
        type=str,
        default=ruta_destino_default,
        help=f"Ruta donde se guardará el respaldo (default: {ruta_destino_default})",
    )

    args = parser.parse_args()

    # Convertir a rutas absolutas
    ruta_proyecto = os.path.abspath(args.proyecto)
    ruta_destino = os.path.abspath(args.destino)

    crear_respaldo(ruta_proyecto, ruta_destino)


if __name__ == "__main__":
    main()
