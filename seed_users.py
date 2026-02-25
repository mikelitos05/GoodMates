"""
Script para insertar datos de prueba en la base de datos de GoodMates.
Inserta usuarios (inquilinos, arrendadores, admin) con contraseña: prueba123

Requisitos:
    pip install mysql-connector-python bcrypt

Uso:
    python seed_users.py
"""

import mysql.connector
import bcrypt
import uuid


# --- Configuración de conexión (debe coincidir con el .env del backend) ---
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'admin',
    'database': 'goodmates',
}

# Contraseña para TODOS los usuarios de prueba
PASSWORD = 'prueba123'


def hash_password(password: str) -> str:
    """Hashea la contraseña con bcrypt (compatible con el backend Node.js)."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def new_id() -> str:
    """Genera un UUID v4 como string."""
    return str(uuid.uuid4())


# ============================================================================
# DATOS DE USUARIOS
# ============================================================================

TENANTS = [
    {
        'nombre_usuario': 'carlos_mtz',
        'nombre': 'Carlos',
        'apellido': 'Martínez',
        'email': 'carlos.mtz@tec.mx',
        'genero': 'Masculino',
        'universidad': 'Tec de Monterrey',
        'carrera': 'Ingeniería en Sistemas',
        'biografia': 'Estudiante de ISC, me gusta programar y jugar videojuegos.',
    },
    {
        'nombre_usuario': 'ana_lopez',
        'nombre': 'Ana',
        'apellido': 'López',
        'email': 'ana.lopez@tec.mx',
        'genero': 'Femenino',
        'universidad': 'Tec de Monterrey',
        'carrera': 'Administración de Empresas',
        'biografia': 'Me encanta cocinar y hacer yoga por las mañanas.',
    },
    {
        'nombre_usuario': 'diego_hdz',
        'nombre': 'Diego',
        'apellido': 'Hernández',
        'email': 'diego.hdz@uanl.mx',
        'genero': 'Masculino',
        'universidad': 'UANL',
        'carrera': 'Arquitectura',
        'biografia': 'Soy diseñador y arquitecto en formación, busco un lugar tranquilo.',
    },
    {
        'nombre_usuario': 'sofia_ramirez',
        'nombre': 'Sofía',
        'apellido': 'Ramírez',
        'email': 'sofia.ram@tec.mx',
        'genero': 'Femenino',
        'universidad': 'Tec de Monterrey',
        'carrera': 'Psicología',
        'biografia': 'Amo a los animales, tengo un gatito. Busco roomies tranquilos.',
    },
    {
        'nombre_usuario': 'miguel_torres',
        'nombre': 'Miguel',
        'apellido': 'Torres',
        'email': 'miguel.torres@udem.mx',
        'genero': 'Masculino',
        'universidad': 'UDEM',
        'carrera': 'Ingeniería Mecatrónica',
        'biografia': 'Deportista, estudio y trabajo medio tiempo. Muy ordenado.',
    },
    {
        'nombre_usuario': 'valentina_gzz',
        'nombre': 'Valentina',
        'apellido': 'González',
        'email': 'vale.gzz@tec.mx',
        'genero': 'Femenino',
        'universidad': 'Tec de Monterrey',
        'carrera': 'Comunicación',
        'biografia': 'Creativa, me gusta la fotografía y el cine independiente.',
    },
    {
        'nombre_usuario': 'roberto_silva',
        'nombre': 'Roberto',
        'apellido': 'Silva',
        'email': 'roberto.silva@uanl.mx',
        'genero': 'Masculino',
        'universidad': 'UANL',
        'carrera': 'Medicina',
        'biografia': 'Estudiante de medicina, horarios nocturnos. Necesito silencio para estudiar.',
    },
    {
        'nombre_usuario': 'mariana_castillo',
        'nombre': 'Mariana',
        'apellido': 'Castillo',
        'email': 'mariana.cas@udem.mx',
        'genero': 'Femenino',
        'universidad': 'UDEM',
        'carrera': 'Derecho',
        'biografia': 'Organizada y responsable. Me gusta leer y ver series.',
    },
]

LANDLORDS = [
    {
        'nombre_usuario': 'pedro_arrendador',
        'nombre': 'Pedro',
        'apellido': 'García',
        'email': 'pedro.garcia@gmail.com',
        'genero': 'Masculino',
        'universidad': None,
        'carrera': None,
        'biografia': 'Propietario de varios departamentos en la zona Tec.',
    },
    {
        'nombre_usuario': 'lucia_rentas',
        'nombre': 'Lucía',
        'apellido': 'Mendoza',
        'email': 'lucia.mendoza@gmail.com',
        'genero': 'Femenino',
        'universidad': None,
        'carrera': None,
        'biografia': 'Rento habitaciones amuebladas cerca de universidades.',
    },
]

ADMINS = [
    {
        'nombre_usuario': 'admin_gm',
        'nombre': 'Admin',
        'apellido': 'GoodMates',
        'email': 'admin@goodmates.mx',
        'genero': None,
        'universidad': None,
        'carrera': None,
        'biografia': 'Administrador del sistema GoodMates.',
    },
]

# Perfiles extendidos para los tenants (índice corresponde al tenant en TENANTS)
TENANT_PROFILES = [
    {  # Carlos
        'edad': 21, 'presupuesto': 5500, 'ciudad': 'Monterrey',
        'horario': 'Nocturno', 'semestre': 7, 'ocupacion': 'Estudiante',
        'mascotas': False, 'fumador': False, 'limpieza': 4, 'ruido': 4,
        'visitantes': 'Ocasionalmente',
        'hobbies': ['Videojuegos', 'Programación', 'Series', 'Gimnasio'],
    },
    {  # Ana
        'edad': 20, 'presupuesto': 6000, 'ciudad': 'Monterrey',
        'horario': 'Matutino', 'semestre': 5, 'ocupacion': 'Estudiante',
        'mascotas': False, 'fumador': False, 'limpieza': 5, 'ruido': 2,
        'visitantes': 'Raramente',
        'hobbies': ['Cocinar', 'Yoga', 'Lectura', 'Viajes'],
    },
    {  # Diego
        'edad': 22, 'presupuesto': 4500, 'ciudad': 'San Nicolás',
        'horario': 'Vespertino', 'semestre': 9, 'ocupacion': 'Estudiante / Freelancer',
        'mascotas': False, 'fumador': True, 'limpieza': 3, 'ruido': 3,
        'visitantes': 'Ocasionalmente',
        'hobbies': ['Arte', 'Fotografía', 'Música', 'Netflix'],
    },
    {  # Sofía
        'edad': 19, 'presupuesto': 5000, 'ciudad': 'Monterrey',
        'horario': 'Matutino', 'semestre': 3, 'ocupacion': 'Estudiante',
        'mascotas': True, 'fumador': False, 'limpieza': 4, 'ruido': 2,
        'visitantes': 'Raramente',
        'hobbies': ['Lectura', 'Yoga', 'Series', 'Running'],
    },
    {  # Miguel
        'edad': 23, 'presupuesto': 7000, 'ciudad': 'San Pedro',
        'horario': 'Matutino', 'semestre': 8, 'ocupacion': 'Estudiante / Medio tiempo',
        'mascotas': False, 'fumador': False, 'limpieza': 5, 'ruido': 3,
        'visitantes': 'Ocasionalmente',
        'hobbies': ['Gimnasio', 'Deportes', 'Running', 'Cocinar'],
    },
    {  # Valentina
        'edad': 21, 'presupuesto': 5500, 'ciudad': 'Monterrey',
        'horario': 'Vespertino', 'semestre': 6, 'ocupacion': 'Estudiante',
        'mascotas': False, 'fumador': False, 'limpieza': 3, 'ruido': 4,
        'visitantes': 'Frecuentemente',
        'hobbies': ['Fotografía', 'Películas', 'Arte', 'Viajes'],
    },
    {  # Roberto
        'edad': 24, 'presupuesto': 4000, 'ciudad': 'Monterrey',
        'horario': 'Nocturno', 'semestre': 10, 'ocupacion': 'Estudiante',
        'mascotas': False, 'fumador': False, 'limpieza': 4, 'ruido': 1,
        'visitantes': 'Raramente',
        'hobbies': ['Lectura', 'Gimnasio', 'Series'],
    },
    {  # Mariana
        'edad': 20, 'presupuesto': 6500, 'ciudad': 'San Pedro',
        'horario': 'Matutino', 'semestre': 4, 'ocupacion': 'Estudiante',
        'mascotas': False, 'fumador': False, 'limpieza': 5, 'ruido': 2,
        'visitantes': 'Ocasionalmente',
        'hobbies': ['Lectura', 'Series', 'Baile', 'Viajes'],
    },
]


def main():
    print('=' * 60)
    print('  GoodMates - Script de datos de prueba')
    print('=' * 60)
    print()

    # Hashear la contraseña una sola vez (es el mismo hash para todos)
    print(f'Hasheando contraseña "{PASSWORD}"...')
    password_hash = hash_password(PASSWORD)
    print(f'Hash generado: {password_hash[:20]}...')
    print()

    # Conectar a la base de datos
    print(f'Conectando a MySQL ({DB_CONFIG["host"]}:{DB_CONFIG["port"]}/{DB_CONFIG["database"]})...')
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    print('Conexión exitosa.')
    print()

    inserted_tenants = 0
    inserted_landlords = 0
    inserted_admins = 0
    inserted_profiles = 0
    skipped = 0

    # --- Insertar Tenants ---
    print('--- INQUILINOS (tenants) ---')
    tenant_ids = []
    for i, tenant in enumerate(TENANTS):
        # Verificar si ya existe
        cursor.execute(
            'SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s OR email = %s',
            (tenant['nombre_usuario'], tenant['email'])
        )
        existing = cursor.fetchone()
        if existing:
            print(f'  ⚠ {tenant["nombre_usuario"]} ({tenant["email"]}) ya existe, saltando...')
            tenant_ids.append(existing[0])
            skipped += 1
            continue

        user_id = new_id()
        tenant_ids.append(user_id)

        cursor.execute(
            '''INSERT INTO usuarios
               (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash,
                genero, universidad, carrera, biografia, rol, estado_cuenta)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'tenant', 'activo')''',
            (
                user_id, tenant['nombre_usuario'], tenant['nombre'], tenant['apellido'],
                tenant['email'], password_hash, tenant['genero'],
                tenant['universidad'], tenant['carrera'], tenant['biografia'],
            )
        )
        inserted_tenants += 1
        print(f'  ✓ {tenant["nombre_usuario"]} - {tenant["nombre"]} {tenant["apellido"]}')

        # Insertar perfil extendido
        if i < len(TENANT_PROFILES):
            profile = TENANT_PROFILES[i]
            profile_id = new_id()
            import json
            hobbies_json = json.dumps(profile['hobbies']) if profile.get('hobbies') else None

            cursor.execute(
                '''INSERT INTO perfiles
                   (id_perfil, id_usuario, edad, presupuesto, ciudad, horario,
                    semestre, ocupacion, mascotas, fumador, limpieza, ruido, visitantes, hobbies)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                (
                    profile_id, user_id, profile['edad'], profile['presupuesto'],
                    profile['ciudad'], profile['horario'], profile['semestre'],
                    profile['ocupacion'], profile['mascotas'], profile['fumador'],
                    profile['limpieza'], profile['ruido'], profile['visitantes'],
                    hobbies_json,
                )
            )
            inserted_profiles += 1

    print()

    # --- Insertar Landlords ---
    print('--- ARRENDADORES (landlords) ---')
    for landlord in LANDLORDS:
        cursor.execute(
            'SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s OR email = %s',
            (landlord['nombre_usuario'], landlord['email'])
        )
        if cursor.fetchone():
            print(f'  ⚠ {landlord["nombre_usuario"]} ({landlord["email"]}) ya existe, saltando...')
            skipped += 1
            continue

        user_id = new_id()
        cursor.execute(
            '''INSERT INTO usuarios
               (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash,
                genero, universidad, carrera, biografia, rol, estado_cuenta)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'landlord', 'activo')''',
            (
                user_id, landlord['nombre_usuario'], landlord['nombre'], landlord['apellido'],
                landlord['email'], password_hash, landlord['genero'],
                landlord['universidad'], landlord['carrera'], landlord['biografia'],
            )
        )
        inserted_landlords += 1
        print(f'  ✓ {landlord["nombre_usuario"]} - {landlord["nombre"]} {landlord["apellido"]}')

    print()

    # --- Insertar Admins ---
    print('--- ADMINISTRADORES ---')
    for admin in ADMINS:
        cursor.execute(
            'SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s OR email = %s',
            (admin['nombre_usuario'], admin['email'])
        )
        if cursor.fetchone():
            print(f'  ⚠ {admin["nombre_usuario"]} ({admin["email"]}) ya existe, saltando...')
            skipped += 1
            continue

        user_id = new_id()
        cursor.execute(
            '''INSERT INTO usuarios
               (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash,
                genero, universidad, carrera, biografia, rol, estado_cuenta)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'admin', 'activo')''',
            (
                user_id, admin['nombre_usuario'], admin['nombre'], admin['apellido'],
                admin['email'], password_hash, admin['genero'],
                admin['universidad'], admin['carrera'], admin['biografia'],
            )
        )
        inserted_admins += 1
        print(f'  ✓ {admin["nombre_usuario"]} - {admin["nombre"]} {admin["apellido"]}')

    print()

    # Confirmar cambios
    conn.commit()
    cursor.close()
    conn.close()

    # --- Resumen ---
    print('=' * 60)
    print('  RESUMEN')
    print('=' * 60)
    print(f'  Inquilinos insertados:   {inserted_tenants}')
    print(f'  Perfiles insertados:     {inserted_profiles}')
    print(f'  Arrendadores insertados: {inserted_landlords}')
    print(f'  Admins insertados:       {inserted_admins}')
    print(f'  Saltados (ya existían):  {skipped}')
    print(f'  Total nuevos usuarios:   {inserted_tenants + inserted_landlords + inserted_admins}')
    print()
    print(f'  Contraseña de todos: {PASSWORD}')
    print()
    print('  Usuarios de prueba disponibles:')
    print('  ─────────────────────────────────────')
    for t in TENANTS:
        print(f'    🏠 {t["nombre_usuario"]:25s} (tenant)')
    for l in LANDLORDS:
        print(f'    🏢 {l["nombre_usuario"]:25s} (landlord)')
    for a in ADMINS:
        print(f'    👑 {a["nombre_usuario"]:25s} (admin)')
    print()
    print('  ¡Listo! Puedes iniciar sesión con cualquier usuario.')
    print('=' * 60)


if __name__ == '__main__':
    main()
