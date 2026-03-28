#!/usr/bin/env python3
"""
auto_commit.py — Script para automatizar commits y push al repositorio GoodMates.

Detecta cambios pendientes en el repositorio, hace git add, commit y push automáticamente.
Registra la actividad en un archivo de log.

Uso:
    python3 auto_commit.py
    python3 auto_commit.py --mensaje "Mi commit personalizado"
    python3 auto_commit.py --rama main --remote origin
"""

import os
import sys
import subprocess
import argparse
from datetime import datetime


# Archivo de log (en el mismo directorio que el script)
DIRECTORIO_SCRIPT = os.path.dirname(os.path.abspath(__file__))
ARCHIVO_LOG = os.path.join(DIRECTORIO_SCRIPT, "commit_log.txt")


def ejecutar_comando(comando, cwd=None):
    """
    Ejecuta un comando del sistema y retorna su salida.

    Args:
        comando (list): Lista con el comando y sus argumentos.
        cwd (str): Directorio de trabajo para el comando.

    Returns:
        tuple: (codigo_retorno, salida_stdout, salida_stderr)
    """
    try:
        resultado = subprocess.run(
            comando,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        return resultado.returncode, resultado.stdout.strip(), resultado.stderr.strip()
    except subprocess.TimeoutExpired:
        return 1, "", "Error: El comando excedió el tiempo límite (120s)"
    except FileNotFoundError:
        return 1, "", f"Error: Comando no encontrado: {comando[0]}"
    except Exception as e:
        return 1, "", f"Error inesperado: {e}"


def registrar_log(mensaje):
    """
    Registra un mensaje en el archivo de log con fecha y hora.

    Args:
        mensaje (str): Mensaje a registrar.
    """
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linea = f"[{ahora}] {mensaje}\n"
    try:
        with open(ARCHIVO_LOG, "a", encoding="utf-8") as f:
            f.write(linea)
    except Exception as e:
        print(f"  ⚠️  No se pudo escribir en el log: {e}")


def verificar_git(ruta_proyecto):
    """
    Verifica que Git esté instalado y que la ruta sea un repositorio válido.

    Args:
        ruta_proyecto (str): Ruta al directorio del proyecto.
    """
    # Verificar que Git está instalado
    codigo, _, error = ejecutar_comando(["git", "--version"])
    if codigo != 0:
        print("Error: Git no está instalado en el sistema.")
        print("   Instala Git con: sudo apt install git")
        sys.exit(1)

    # Verificar que es un repositorio Git
    codigo, _, _ = ejecutar_comando(["git", "rev-parse", "--is-inside-work-tree"], cwd=ruta_proyecto)
    if codigo != 0:
        print(f"Error: '{ruta_proyecto}' no es un repositorio Git.")
        sys.exit(1)


def verificar_remote(ruta_proyecto, remote):
    """
    Verifica que el remote existe en el repositorio.

    Args:
        ruta_proyecto (str): Ruta al directorio del proyecto.
        remote (str): Nombre del remote a verificar.

    Returns:
        str: URL del remote.
    """
    codigo, salida, _ = ejecutar_comando(
        ["git", "remote", "get-url", remote], cwd=ruta_proyecto
    )
    if codigo != 0:
        print(f"Error: El remote '{remote}' no existe.")
        print(f"   Configúralo con: git remote add {remote} <URL>")
        sys.exit(1)
    return salida


def obtener_cambios(ruta_proyecto):
    """
    Obtiene la lista de archivos con cambios pendientes.

    Args:
        ruta_proyecto (str): Ruta al directorio del proyecto.

    Returns:
        list: Lista de líneas con los cambios detectados.
    """
    codigo, salida, _ = ejecutar_comando(
        ["git", "status", "--porcelain"], cwd=ruta_proyecto
    )
    if codigo != 0:
        print("Error al verificar el estado del repositorio.")
        sys.exit(1)

    if not salida:
        return []

    return salida.split("\n")


def auto_commit(ruta_proyecto, mensaje, rama, remote):
    """
    Realiza el ciclo completo de add, commit y push.

    Args:
        ruta_proyecto (str): Ruta absoluta al directorio del proyecto.
        mensaje (str): Mensaje del commit.
        rama (str): Nombre de la rama.
        remote (str): Nombre del remote.
    """
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("=" * 60)
    print("  AUTO-COMMIT DE GOODMATES")
    print("=" * 60)
    print(f"  Proyecto : {ruta_proyecto}")
    print(f"  Rama     : {rama}")
    print(f"  Remote   : {remote}")
    print(f"  Fecha    : {ahora}")
    print("-" * 60)

    # 1. Verificar Git y remote
    verificar_git(ruta_proyecto)
    url_remote = verificar_remote(ruta_proyecto, remote)
    print(f"  URL: {url_remote}")

    # 2. Obtener cambios pendientes
    cambios = obtener_cambios(ruta_proyecto)

    if not cambios:
        msg = "Sin cambios pendientes. No se realizó ningún commit."
        print(f"\n  {msg}")
        print("=" * 60)
        registrar_log(f"SIN CAMBIOS - {msg}")
        return

    print(f"\n  Cambios detectados ({len(cambios)} archivos):")
    for cambio in cambios[:15]:  # Mostrar máximo 15
        print(f"     {cambio}")
    if len(cambios) > 15:
        print(f"     ... y {len(cambios) - 15} archivos más")

    # 3. Git add
    print("\n  Ejecutando git add ...")
    codigo, _, error = ejecutar_comando(["git", "add", "."], cwd=ruta_proyecto)
    if codigo != 0:
        print(f"  Error en git add: {error}")
        registrar_log(f"ERROR - git add falló: {error}")
        sys.exit(1)
    print("  git add completado")

    # 4. Git commit
    print(f"  Ejecutando git commit ...")
    codigo, salida, error = ejecutar_comando(
        ["git", "commit", "-m", mensaje], cwd=ruta_proyecto
    )
    if codigo != 0:
        # Si no hay cambios staged (posible si .gitignore los excluye)
        if "nothing to commit" in error or "nothing to commit" in salida:
            msg = "Nada que hacer commit (los cambios pueden estar en .gitignore)."
            print(f"  {msg}")
            registrar_log(f"SIN CAMBIOS STAGED - {msg}")
            return
        print(f"  Error en git commit: {error}")
        registrar_log(f"ERROR - git commit falló: {error}")
        sys.exit(1)
    print(f"  Commit realizado: \"{mensaje}\"")

    # 5. Git push
    print(f"  Ejecutando git push {remote} {rama} ...")
    codigo, salida, error = ejecutar_comando(
        ["git", "push", remote, rama], cwd=ruta_proyecto
    )
    if codigo != 0:
        print(f"  Error en git push: {error}")
        print(f"  Tip: Verifica tus credenciales de Git o permisos del repositorio.")
        registrar_log(f"ERROR - git push falló: {error}")
        sys.exit(1)
    print(f"  Push completado a {remote}/{rama}")

    # 6. Resumen final
    resumen = f"ÉXITO - Commit: \"{mensaje}\" | Archivos: {len(cambios)} | Rama: {rama}"
    registrar_log(resumen)

    print("\n" + "=" * 60)
    print(f"  Auto-commit completado exitosamente")
    print(f"  Mensaje  : {mensaje}")
    print(f"  Archivos : {len(cambios)} modificados")
    print(f"  Log      : {ARCHIVO_LOG}")
    print("=" * 60)


def main():
    """Punto de entrada principal del script."""
    # Determinar la ruta del proyecto (un nivel arriba del directorio scripts/)
    ruta_proyecto_default = os.path.dirname(DIRECTORIO_SCRIPT)
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mensaje_default = f"Auto-commit: {ahora}"

    parser = argparse.ArgumentParser(
        description="Script de auto-commit para el proyecto GoodMates",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python3 auto_commit.py
  python3 auto_commit.py --mensaje "feat: nuevas funciones"
  python3 auto_commit.py --rama develop --remote origin
  python3 auto_commit.py --proyecto /ruta/al/repo --mensaje "fix: corrección"
        """,
    )
    parser.add_argument(
        "--proyecto",
        type=str,
        default=ruta_proyecto_default,
        help=f"Ruta al directorio del proyecto (default: {ruta_proyecto_default})",
    )
    parser.add_argument(
        "--mensaje",
        type=str,
        default=mensaje_default,
        help='Mensaje del commit (default: "Auto-commit: <fecha y hora>")',
    )
    parser.add_argument(
        "--rama",
        type=str,
        default="main",
        help="Rama de destino para el push (default: main)",
    )
    parser.add_argument(
        "--remote",
        type=str,
        default="origin",
        help="Nombre del remote (default: origin)",
    )

    args = parser.parse_args()

    # Convertir a ruta absoluta
    ruta_proyecto = os.path.abspath(args.proyecto)

    if not os.path.isdir(ruta_proyecto):
        print(f"Error: El directorio del proyecto no existe: {ruta_proyecto}")
        sys.exit(1)

    auto_commit(ruta_proyecto, args.mensaje, args.rama, args.remote)


if __name__ == "__main__":
    main()
