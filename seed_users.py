"""
Script de seeding integral para GoodMates.

Crea/actualiza:
- Usuarios (tenants, landlords, admin)
- Perfiles completos de tenants
- Propiedades (sin imagenes)
- Solicitudes (pendiente/aceptada/rechazada/confirmada/egresada)
- Grupos activos por propiedad y miembros
- Calificaciones entre tenants y hacia landlords
- Matches (pendiente/aceptado/rechazado)
- Conversaciones y mensajes de matches aceptados

Requisitos:
    pip install mysql-connector-python bcrypt

Uso:
    python seed_users.py
"""

import json
import uuid
from datetime import datetime

import bcrypt
import mysql.connector


DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'Password',
    'database': 'goodmates',
}

PASSWORD = 'prueba123'


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def to_json(value):
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


TENANTS = [
    {
        'nombre_usuario': 'carlos_mtz',
        'nombre': 'Carlos',
        'apellido': 'Martinez',
        'email': 'carlos.mtz@itesmgdl.mx',
        'genero': 'Masculino',
        'universidad': 'ITESM GDL',
        'carrera': 'Ingenieria en Sistemas',
        'biografia': 'Backend developer y fan del running. Busco convivencia ordenada y tranquila.',
        'perfil': {
            'edad': 22,
            'presupuesto': 7800,
            'ciudad': 'Zapopan',
            'horario': 'Mixto',
            'semestre': 8,
            'ocupacion': 'Estudiante y practicante',
            'mascotas': False,
            'fumador': False,
            'limpieza': 5,
            'ruido': 2,
            'visitantes': 'Ocasionalmente',
            'hobbies': ['Running', 'Programacion', 'Cafe', 'Series'],
            'preferencia_visitantes': 'No me importa',
            'preferencia_social': 3,
            'preferencia_ruido': 2,
            'preferencia_mascotas': 'No me importan',
        },
    },
    {
        'nombre_usuario': 'ana_lopez',
        'nombre': 'Ana',
        'apellido': 'Lopez',
        'email': 'ana.lopez@itesmgdl.mx',
        'genero': 'Femenino',
        'universidad': 'ITESM GDL',
        'carrera': 'Administracion de Empresas',
        'biografia': 'Me gusta cocinar, mantener espacios limpios y respetar horarios de descanso.',
        'perfil': {
            'edad': 21,
            'presupuesto': 8500,
            'ciudad': 'Zapopan',
            'horario': 'Matutino',
            'semestre': 6,
            'ocupacion': 'Estudiante',
            'mascotas': False,
            'fumador': False,
            'limpieza': 5,
            'ruido': 2,
            'visitantes': 'Raramente',
            'hobbies': ['Cocinar', 'Yoga', 'Lectura', 'Pilates'],
            'preferencia_visitantes': 'No me agrada',
            'preferencia_social': 3,
            'preferencia_ruido': 2,
            'preferencia_mascotas': 'No me importan',
        },
    },
    {
        'nombre_usuario': 'diego_hdz',
        'nombre': 'Diego',
        'apellido': 'Hernandez',
        'email': 'diego.hdz@udeg.mx',
        'genero': 'Masculino',
        'universidad': 'UdeG',
        'carrera': 'Arquitectura',
        'biografia': 'Arquitecto en formacion, trabajo freelance. Responsable con pagos y tareas del hogar.',
        'perfil': {
            'edad': 23,
            'presupuesto': 7000,
            'ciudad': 'Guadalajara',
            'horario': 'Vespertino',
            'semestre': 9,
            'ocupacion': 'Estudiante y freelancer',
            'mascotas': False,
            'fumador': False,
            'limpieza': 4,
            'ruido': 3,
            'visitantes': 'Ocasionalmente',
            'hobbies': ['Arquitectura', 'Fotografia', 'Musica', 'Diseño'],
            'preferencia_visitantes': 'No me importa',
            'preferencia_social': 4,
            'preferencia_ruido': 3,
            'preferencia_mascotas': 'No me importan',
        },
    },
    {
        'nombre_usuario': 'sofia_ramirez',
        'nombre': 'Sofia',
        'apellido': 'Ramirez',
        'email': 'sofia.ram@itesmgdl.mx',
        'genero': 'Femenino',
        'universidad': 'ITESM GDL',
        'carrera': 'Psicologia',
        'biografia': 'Me interesa una convivencia empatica y calmada. Prefiero espacios silenciosos para estudiar.',
        'perfil': {
            'edad': 20,
            'presupuesto': 7600,
            'ciudad': 'Zapopan',
            'horario': 'Matutino',
            'semestre': 5,
            'ocupacion': 'Estudiante',
            'mascotas': True,
            'fumador': False,
            'limpieza': 4,
            'ruido': 2,
            'visitantes': 'Raramente',
            'hobbies': ['Lectura', 'Yoga', 'Cine', 'Podcast'],
            'preferencia_visitantes': 'No me agrada',
            'preferencia_social': 2,
            'preferencia_ruido': 2,
            'preferencia_mascotas': 'Me gustan',
        },
    },
    {
        'nombre_usuario': 'miguel_torres',
        'nombre': 'Miguel',
        'apellido': 'Torres',
        'email': 'miguel.torres@iteso.mx',
        'genero': 'Masculino',
        'universidad': 'ITESO',
        'carrera': 'Ingenieria Mecatronica',
        'biografia': 'Deportista y disciplinado. Busco roomies puntuales y respetuosos.',
        'perfil': {
            'edad': 24,
            'presupuesto': 9800,
            'ciudad': 'Tlaquepaque',
            'horario': 'Matutino',
            'semestre': 8,
            'ocupacion': 'Estudiante y medio tiempo',
            'mascotas': False,
            'fumador': False,
            'limpieza': 5,
            'ruido': 3,
            'visitantes': 'Ocasionalmente',
            'hobbies': ['Gimnasio', 'Running', 'Futbol', 'Cocinar'],
            'preferencia_visitantes': 'No me importa',
            'preferencia_social': 4,
            'preferencia_ruido': 3,
            'preferencia_mascotas': 'No me importan',
        },
    },
    {
        'nombre_usuario': 'valentina_gzz',
        'nombre': 'Valentina',
        'apellido': 'Gonzalez',
        'email': 'vale.gzz@itesmgdl.mx',
        'genero': 'Femenino',
        'universidad': 'ITESM GDL',
        'carrera': 'Comunicacion',
        'biografia': 'Creativa, ordenada y fan de la fotografia. Me adapto bien a reglas claras.',
        'perfil': {
            'edad': 22,
            'presupuesto': 8200,
            'ciudad': 'Zapopan',
            'horario': 'Vespertino',
            'semestre': 7,
            'ocupacion': 'Estudiante',
            'mascotas': False,
            'fumador': False,
            'limpieza': 4,
            'ruido': 3,
            'visitantes': 'Ocasionalmente',
            'hobbies': ['Fotografia', 'Cine', 'Arte', 'Viajes'],
            'preferencia_visitantes': 'No me importa',
            'preferencia_social': 4,
            'preferencia_ruido': 3,
            'preferencia_mascotas': 'No me importan',
        },
    },
    {
        'nombre_usuario': 'roberto_silva',
        'nombre': 'Roberto',
        'apellido': 'Silva',
        'email': 'roberto.silva@udeg.mx',
        'genero': 'Masculino',
        'universidad': 'UdeG',
        'carrera': 'Medicina',
        'biografia': 'Interno de medicina con horarios largos. Valoro mucho el silencio y la limpieza.',
        'perfil': {
            'edad': 25,
            'presupuesto': 6800,
            'ciudad': 'Guadalajara',
            'horario': 'Nocturno',
            'semestre': 10,
            'ocupacion': 'Estudiante',
            'mascotas': False,
            'fumador': False,
            'limpieza': 4,
            'ruido': 1,
            'visitantes': 'Raramente',
            'hobbies': ['Lectura', 'Gimnasio', 'Podcast', 'Cafe'],
            'preferencia_visitantes': 'No me agrada',
            'preferencia_social': 2,
            'preferencia_ruido': 1,
            'preferencia_mascotas': 'No me importan',
        },
    },
    {
        'nombre_usuario': 'mariana_castillo',
        'nombre': 'Mariana',
        'apellido': 'Castillo',
        'email': 'mariana.cas@iteso.mx',
        'genero': 'Femenino',
        'universidad': 'ITESO',
        'carrera': 'Derecho',
        'biografia': 'Muy organizada y responsable. Me gustan acuerdos claros entre roomies.',
        'perfil': {
            'edad': 21,
            'presupuesto': 9200,
            'ciudad': 'Tlaquepaque',
            'horario': 'Matutino',
            'semestre': 6,
            'ocupacion': 'Estudiante',
            'mascotas': False,
            'fumador': False,
            'limpieza': 5,
            'ruido': 2,
            'visitantes': 'Ocasionalmente',
            'hobbies': ['Lectura', 'Series', 'Baile', 'Senderismo'],
            'preferencia_visitantes': 'No me importa',
            'preferencia_social': 3,
            'preferencia_ruido': 2,
            'preferencia_mascotas': 'No me importan',
        },
    },
]

LANDLORDS = [
    {
        'nombre_usuario': 'pedro_arrendador',
        'nombre': 'Pedro',
        'apellido': 'Garcia',
        'email': 'pedro.garcia@gmail.com',
        'genero': 'Masculino',
        'universidad': None,
        'carrera': None,
        'biografia': 'Administrador de propiedades en Zona Real y Providencia.',
    },
    {
        'nombre_usuario': 'lucia_rentas',
        'nombre': 'Lucia',
        'apellido': 'Mendoza',
        'email': 'lucia.mendoza@gmail.com',
        'genero': 'Femenino',
        'universidad': None,
        'carrera': None,
        'biografia': 'Rentas residenciales para estudiantes y profesionistas jovenes.',
    },
    {
        'nombre_usuario': 'jorge_propiedades',
        'nombre': 'Jorge',
        'apellido': 'Salinas',
        'email': 'jorge.salinas@gmail.com',
        'genero': 'Masculino',
        'universidad': None,
        'carrera': None,
        'biografia': 'Propietario con enfoque en contratos claros y mantenimiento constante.',
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
        'biografia': 'Administrador principal de GoodMates.',
    }
]

PROPERTIES = [
    {
        'key': 'loft_tecdistrito',
        'landlord': 'pedro_arrendador',
        'titulo': 'Loft moderno en Zona Real',
        'descripcion': 'Loft amueblado con servicios incluidos, ideal para estudiantes del Tec.',
        'direccion': 'Av. Santa Margarita 2500',
        'ciudad': 'Zapopan',
        'estado': 'Jalisco',
        'precio': 9500,
        'habitaciones': 3,
        'banos': 2,
        'min_meses_permanencia': 6,
        'area': 120,
        'amenidades': ['Internet de alta velocidad', 'Cocina equipada', 'Lavadora', 'Aire acondicionado'],
        'reglas': ['No fumar dentro', 'Respetar horario de descanso', 'Visitas hasta las 11pm'],
        'lugares_cercanos': ['ITESM Campus Guadalajara', 'Plaza Real Center', 'Parque Metropolitano'],
        'latitud': 20.7301,
        'longitud': -103.4471,
        'destacada': True,
        'imagenes': [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        ],
    },
    {
        'key': 'depa_centro_mty',
        'landlord': 'lucia_rentas',
        'titulo': 'Departamento compartido en Zona Americana',
        'descripcion': 'Departamento con excelente ubicacion y acceso a transporte publico.',
        'direccion': 'Calle Libertad 1120',
        'ciudad': 'Guadalajara',
        'estado': 'Jalisco',
        'precio': 7800,
        'habitaciones': 2,
        'banos': 1,
        'min_meses_permanencia': 4,
        'area': 82,
        'amenidades': ['Internet', 'Refrigerador', 'Microondas', 'Agua caliente'],
        'reglas': ['No fiestas entre semana', 'Mantener areas comunes limpias'],
        'lugares_cercanos': ['Chapultepec', 'Estacion de Tren Ligero', 'UdeG CUCS'],
        'latitud': 20.6728,
        'longitud': -103.3688,
        'destacada': False,
        'imagenes': [
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
            'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
            'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
        ],
    },
    {
        'key': 'casa_udem',
        'landlord': 'jorge_propiedades',
        'titulo': 'Casa para roomies cerca del ITESO',
        'descripcion': 'Casa amplia con patio y espacios de estudio. Ideal para estancias largas.',
        'direccion': 'Av. Camino al ITESO 210',
        'ciudad': 'Tlaquepaque',
        'estado': 'Jalisco',
        'precio': 11200,
        'habitaciones': 4,
        'banos': 3,
        'min_meses_permanencia': 6,
        'area': 200,
        'amenidades': ['Patio', 'Cochera', 'Internet', 'Cuarto de lavado'],
        'reglas': ['No mascotas grandes', 'No ruido despues de medianoche'],
        'lugares_cercanos': ['ITESO', 'Plaza Centro Sur', 'Parque Tecnologico'],
        'latitud': 20.6139,
        'longitud': -103.4093,
        'destacada': True,
        'imagenes': [
            'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
            'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800',
        ],
    },
    {
        'key': 'suite_obispado',
        'landlord': 'pedro_arrendador',
        'titulo': 'Suite estudiantil en Providencia',
        'descripcion': 'Suite privada con escritorio ergonomico y excelente iluminacion.',
        'direccion': 'Av. Providencia 3100',
        'ciudad': 'Guadalajara',
        'estado': 'Jalisco',
        'precio': 6900,
        'habitaciones': 2,
        'banos': 1,
        'min_meses_permanencia': 3,
        'area': 68,
        'amenidades': ['Internet', 'Escritorio', 'Closet amplio'],
        'reglas': ['No fumar', 'Sin fiestas'],
        'lugares_cercanos': ['Punto Sao Paulo', 'UAG', 'Hospital San Javier'],
        'latitud': 20.7029,
        'longitud': -103.3855,
        'destacada': False,
        'imagenes': [
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
            'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
        ],
    },
]

GROUP_ASSIGNMENTS = [
    {
        'property_key': 'loft_tecdistrito',
        'group_name': 'Roomies Zona Real',
        'creator': 'carlos_mtz',
        'members': ['carlos_mtz', 'ana_lopez', 'sofia_ramirez'],
    },
    {
        'property_key': 'depa_centro_mty',
        'group_name': 'Centro GDL Team',
        'creator': 'diego_hdz',
        'members': ['diego_hdz', 'valentina_gzz'],
    },
    {
        'property_key': 'casa_udem',
        'group_name': 'Casa ITESO Roomies',
        'creator': 'miguel_torres',
        'members': ['miguel_torres', 'mariana_castillo'],
    },
]

EXTRA_INQUIRIES = [
    {'tenant': 'roberto_silva', 'property_key': 'suite_obispado', 'estado': 'pendiente', 'mensaje': 'Me interesa visitar el lugar esta semana, queda cerca de mi facultad.'},
    {'tenant': 'roberto_silva', 'property_key': 'depa_centro_mty', 'estado': 'rechazada', 'mensaje': 'Busco algo mas tranquilo y cerca de mi hospital.'},
]

RATINGS = [
    # -- Grupo Loft Zona Real: carlos_mtz, ana_lopez, sofia_ramirez --
    {'from': 'carlos_mtz', 'to': 'ana_lopez', 'property_key': 'loft_tecdistrito', 'score': 4.7, 'comment': 'Muy ordenada y respetuosa.'},
    {'from': 'ana_lopez', 'to': 'carlos_mtz', 'property_key': 'loft_tecdistrito', 'score': 4.6, 'comment': 'Cumple acuerdos y paga puntual.'},
    {'from': 'sofia_ramirez', 'to': 'carlos_mtz', 'property_key': 'loft_tecdistrito', 'score': 4.8, 'comment': 'Excelente companero de casa, muy tranquilo.'},
    {'from': 'carlos_mtz', 'to': 'sofia_ramirez', 'property_key': 'loft_tecdistrito', 'score': 4.5, 'comment': 'Buena convivencia, respeta espacios.'},
    {'from': 'ana_lopez', 'to': 'sofia_ramirez', 'property_key': 'loft_tecdistrito', 'score': 4.6, 'comment': 'Companera tranquila y empatica.'},
    {'from': 'sofia_ramirez', 'to': 'ana_lopez', 'property_key': 'loft_tecdistrito', 'score': 4.7, 'comment': 'Cocina rico y mantiene todo limpio.'},
    # -- Grupo Depa Centro GDL: diego_hdz, valentina_gzz --
    {'from': 'diego_hdz', 'to': 'valentina_gzz', 'property_key': 'depa_centro_mty', 'score': 4.4, 'comment': 'Buena comunicacion y respeto.'},
    {'from': 'valentina_gzz', 'to': 'diego_hdz', 'property_key': 'depa_centro_mty', 'score': 4.3, 'comment': 'Responsable con tareas del departamento.'},
    # -- Grupo Casa ITESO: miguel_torres, mariana_castillo --
    {'from': 'miguel_torres', 'to': 'mariana_castillo', 'property_key': 'casa_udem', 'score': 4.6, 'comment': 'Muy organizada con los acuerdos de la casa.'},
    {'from': 'mariana_castillo', 'to': 'miguel_torres', 'property_key': 'casa_udem', 'score': 4.5, 'comment': 'Disciplinado y respetuoso con los horarios.'},
    # -- Calificaciones a landlords --
    {'from': 'carlos_mtz', 'to': 'pedro_arrendador', 'property_key': 'loft_tecdistrito', 'score': 4.6, 'comment': 'Atencion rapida a mantenimiento.'},
    {'from': 'ana_lopez', 'to': 'pedro_arrendador', 'property_key': 'loft_tecdistrito', 'score': 4.4, 'comment': 'Buena comunicacion durante la renta.'},
    {'from': 'diego_hdz', 'to': 'lucia_rentas', 'property_key': 'depa_centro_mty', 'score': 4.2, 'comment': 'Proceso claro y trato amable.'},
    {'from': 'miguel_torres', 'to': 'jorge_propiedades', 'property_key': 'casa_udem', 'score': 4.5, 'comment': 'Contrato claro y buen mantenimiento.'},
    {'from': 'mariana_castillo', 'to': 'jorge_propiedades', 'property_key': 'casa_udem', 'score': 4.7, 'comment': 'Siempre atento a necesidades de la casa.'},
    # -- Calificaciones de landlords a tenants --
    {'from': 'pedro_arrendador', 'to': 'carlos_mtz', 'property_key': 'loft_tecdistrito', 'score': 4.5, 'comment': 'Inquilino confiable.'},
    {'from': 'pedro_arrendador', 'to': 'ana_lopez', 'property_key': 'loft_tecdistrito', 'score': 4.7, 'comment': 'Excelente convivencia y cuidado del inmueble.'},
    {'from': 'lucia_rentas', 'to': 'diego_hdz', 'property_key': 'depa_centro_mty', 'score': 4.3, 'comment': 'Cumplio acuerdos y reglas.'},
    {'from': 'jorge_propiedades', 'to': 'miguel_torres', 'property_key': 'casa_udem', 'score': 4.6, 'comment': 'Puntual con pagos y responsable.'},
    {'from': 'jorge_propiedades', 'to': 'mariana_castillo', 'property_key': 'casa_udem', 'score': 4.8, 'comment': 'Excelente inquilina, muy organizada.'},
]

MATCHES = [
    {'u1': 'roberto_silva', 'u2': 'carlos_mtz', 'compat': 72, 'estado': 'pendiente'},
    {'u1': 'roberto_silva', 'u2': 'diego_hdz', 'compat': 70, 'estado': 'aceptado'},
]

MATCH_CHAT_MESSAGES = {
    ('roberto_silva', 'diego_hdz'): [
        ('roberto_silva', 'Hola Diego, vi que tenemos match. Tu como llevas lo de buscar depa?'),
        ('diego_hdz', 'Que tal Roberto! Pues ya estoy instalado en Guadalajara, pero si gustas platiquemos.'),
        ('roberto_silva', 'Sale, para mi es clave mantener silencio entre semana por mis guardias en el hospital.'),
    ],
}


def ensure_user(cursor, user_data, role, password_hash, mode_busqueda_default=True):
    cursor.execute(
        'SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s LIMIT 1',
        (user_data['nombre_usuario'],)
    )
    row = cursor.fetchone()

    if row:
        user_id = row['id_usuario']
        if role == 'tenant':
            cursor.execute(
                '''UPDATE usuarios
                   SET nombre = %s,
                       apellido = %s,
                       email = %s,
                       contrasena_hash = %s,
                       genero = %s,
                       universidad = %s,
                       carrera = %s,
                       biografia = %s,
                       rol = 'tenant',
                       estado_cuenta = 'activo',
                       perfil_completo = TRUE,
                       modo_busqueda_activo = %s
                   WHERE id_usuario = %s''',
                (
                    user_data['nombre'],
                    user_data['apellido'],
                    user_data['email'],
                    password_hash,
                    user_data.get('genero'),
                    user_data.get('universidad'),
                    user_data.get('carrera'),
                    user_data.get('biografia'),
                    bool(mode_busqueda_default),
                    user_id,
                )
            )
        else:
            cursor.execute(
                '''UPDATE usuarios
                   SET nombre = %s,
                       apellido = %s,
                       email = %s,
                       contrasena_hash = %s,
                       genero = %s,
                       universidad = %s,
                       carrera = %s,
                       biografia = %s,
                       rol = %s,
                       estado_cuenta = 'activo'
                   WHERE id_usuario = %s''',
                (
                    user_data['nombre'],
                    user_data['apellido'],
                    user_data['email'],
                    password_hash,
                    user_data.get('genero'),
                    user_data.get('universidad'),
                    user_data.get('carrera'),
                    user_data.get('biografia'),
                    role,
                    user_id,
                )
            )
        return user_id, False

    user_id = new_id()
    if role == 'tenant':
        cursor.execute(
            '''INSERT INTO usuarios
               (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash,
                genero, universidad, carrera, biografia, rol, estado_cuenta,
                perfil_completo, modo_busqueda_activo)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                       'tenant', 'activo', TRUE, %s)''',
            (
                user_id,
                user_data['nombre_usuario'],
                user_data['nombre'],
                user_data['apellido'],
                user_data['email'],
                password_hash,
                user_data.get('genero'),
                user_data.get('universidad'),
                user_data.get('carrera'),
                user_data.get('biografia'),
                bool(mode_busqueda_default),
            )
        )
    else:
        cursor.execute(
            '''INSERT INTO usuarios
               (id_usuario, nombre_usuario, nombre, apellido, email, contrasena_hash,
                genero, universidad, carrera, biografia, rol, estado_cuenta)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'activo')''',
            (
                user_id,
                user_data['nombre_usuario'],
                user_data['nombre'],
                user_data['apellido'],
                user_data['email'],
                password_hash,
                user_data.get('genero'),
                user_data.get('universidad'),
                user_data.get('carrera'),
                user_data.get('biografia'),
                role,
            )
        )
    return user_id, True


def ensure_profile(cursor, user_id, profile):
    cursor.execute('SELECT id_perfil FROM perfiles WHERE id_usuario = %s LIMIT 1', (user_id,))
    row = cursor.fetchone()

    values = (
        profile.get('edad'),
        profile.get('presupuesto'),
        profile.get('ciudad'),
        profile.get('horario'),
        profile.get('semestre'),
        profile.get('ocupacion'),
        bool(profile.get('mascotas', False)),
        bool(profile.get('fumador', False)),
        profile.get('limpieza', 3),
        profile.get('ruido', 3),
        profile.get('visitantes'),
        to_json(profile.get('hobbies', [])),
        profile.get('preferencia_visitantes', 'No me importa'),
        profile.get('preferencia_social', 3),
        profile.get('preferencia_ruido', 3),
        profile.get('preferencia_mascotas', 'No me importan'),
    )

    if row:
        cursor.execute(
            '''UPDATE perfiles
               SET edad = %s,
                   presupuesto = %s,
                   ciudad = %s,
                   horario = %s,
                   semestre = %s,
                   ocupacion = %s,
                   mascotas = %s,
                   fumador = %s,
                   limpieza = %s,
                   ruido = %s,
                   visitantes = %s,
                   hobbies = %s,
                   preferencia_visitantes = %s,
                   preferencia_social = %s,
                   preferencia_ruido = %s,
                   preferencia_mascotas = %s
               WHERE id_usuario = %s''',
            values + (user_id,)
        )
        return False

    cursor.execute(
        '''INSERT INTO perfiles
           (id_perfil, id_usuario, edad, presupuesto, ciudad, horario,
            semestre, ocupacion, mascotas, fumador, limpieza, ruido,
            visitantes, hobbies, preferencia_visitantes, preferencia_social,
            preferencia_ruido, preferencia_mascotas)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        (new_id(), user_id) + values
    )
    return True


def ensure_property(cursor, landlord_id, prop_data):
    cursor.execute(
        'SELECT id_propiedad FROM propiedades WHERE id_landlord = %s AND titulo = %s LIMIT 1',
        (landlord_id, prop_data['titulo'])
    )
    row = cursor.fetchone()

    values = (
        prop_data['descripcion'],
        prop_data['direccion'],
        prop_data['ciudad'],
        prop_data['estado'],
        prop_data['precio'],
        prop_data['habitaciones'],
        prop_data['banos'],
        prop_data['habitaciones'],
        prop_data.get('min_meses_permanencia', 3),
        prop_data.get('area', None),
        to_json(prop_data.get('amenidades', [])),
        to_json(prop_data.get('reglas', [])),
        to_json(prop_data.get('imagenes', [])),
        to_json(prop_data.get('lugares_cercanos', [])),
        prop_data.get('latitud'),
        prop_data.get('longitud'),
        True,
        bool(prop_data.get('destacada', False)),
    )

    if row:
        prop_id = row['id_propiedad']
        cursor.execute(
            '''UPDATE propiedades
               SET descripcion = %s,
                   direccion = %s,
                   ciudad = %s,
                   estado = %s,
                   precio = %s,
                   habitaciones = %s,
                   banos = %s,
                   habitaciones_disponibles = %s,
                   min_meses_permanencia = %s,
                   area = %s,
                   amenidades = %s,
                   reglas = %s,
                   imagenes = %s,
                   lugares_cercanos = %s,
                   latitud = %s,
                   longitud = %s,
                   disponible = %s,
                   destacada = %s
               WHERE id_propiedad = %s''',
            values + (prop_id,)
        )
        return prop_id, False

    prop_id = new_id()
    cursor.execute(
        '''INSERT INTO propiedades
           (id_propiedad, id_landlord, titulo, descripcion, direccion, ciudad, estado,
            precio, habitaciones, banos, habitaciones_disponibles, min_meses_permanencia,
            area, amenidades, reglas, imagenes, lugares_cercanos, latitud, longitud,
            disponible, destacada)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        (prop_id, landlord_id, prop_data['titulo']) + values
    )
    return prop_id, True


def upsert_inquiry(cursor, tenant_id, prop_id, landlord_id, estado, mensaje):
    cursor.execute(
        'SELECT id_solicitud FROM solicitudes_informes WHERE id_tenant = %s AND id_propiedad = %s LIMIT 1',
        (tenant_id, prop_id)
    )
    row = cursor.fetchone()

    if row:
        cursor.execute(
            '''UPDATE solicitudes_informes
               SET id_landlord = %s,
                   estado = %s,
                   mensaje_tenant = %s,
                   fecha_actualizacion = CURRENT_TIMESTAMP
               WHERE id_solicitud = %s''',
            (landlord_id, estado, mensaje, row['id_solicitud'])
        )
        return row['id_solicitud'], False

    inquiry_id = new_id()
    cursor.execute(
        '''INSERT INTO solicitudes_informes
           (id_solicitud, id_tenant, id_propiedad, id_landlord, estado, mensaje_tenant)
           VALUES (%s, %s, %s, %s, %s, %s)''',
        (inquiry_id, tenant_id, prop_id, landlord_id, estado, mensaje)
    )
    return inquiry_id, True


def upsert_rating(cursor, from_id, to_id, prop_id, score, comment):
    cursor.execute(
        '''SELECT id_calificacion
           FROM calificaciones
           WHERE id_usuario_calificador = %s
             AND id_usuario_calificado = %s
             AND (id_propiedad = %s OR (id_propiedad IS NULL AND %s IS NULL))
           LIMIT 1''',
        (from_id, to_id, prop_id, prop_id)
    )
    row = cursor.fetchone()

    if row:
        cursor.execute(
            '''UPDATE calificaciones
               SET puntuacion = %s,
                   comentario = %s,
                   fecha_calificacion = CURRENT_TIMESTAMP
               WHERE id_calificacion = %s''',
            (score, comment, row['id_calificacion'])
        )
        return False

    cursor.execute(
        '''INSERT INTO calificaciones
           (id_calificacion, id_usuario_calificador, id_usuario_calificado, id_propiedad, puntuacion, comentario)
           VALUES (%s, %s, %s, %s, %s, %s)''',
        (new_id(), from_id, to_id, prop_id, score, comment)
    )
    return True


def upsert_match(cursor, u1_id, u2_id, compat, estado):
    cursor.execute(
        '''SELECT id_match
           FROM matches
           WHERE (id_usuario_1 = %s AND id_usuario_2 = %s)
              OR (id_usuario_1 = %s AND id_usuario_2 = %s)
           LIMIT 1''',
        (u1_id, u2_id, u2_id, u1_id)
    )
    row = cursor.fetchone()

    if row:
        match_id = row['id_match']
        cursor.execute(
            '''UPDATE matches
               SET id_usuario_1 = %s,
                   id_usuario_2 = %s,
                   porcentaje_compatibilidad = %s,
                   estado = %s,
                   fecha_actualizacion = CURRENT_TIMESTAMP
               WHERE id_match = %s''',
            (u1_id, u2_id, compat, estado, match_id)
        )
        return match_id, False

    match_id = new_id()
    cursor.execute(
        '''INSERT INTO matches
           (id_match, id_usuario_1, id_usuario_2, porcentaje_compatibilidad, estado)
           VALUES (%s, %s, %s, %s, %s)''',
        (match_id, u1_id, u2_id, compat, estado)
    )
    return match_id, True


def set_match_chat(cursor, match_id, u1_id, u2_id, messages):
    cursor.execute(
        '''INSERT INTO conversaciones_match (id_match, id_usuario_1, id_usuario_2, activa)
           VALUES (%s, %s, %s, TRUE)
           ON DUPLICATE KEY UPDATE
             id_usuario_1 = VALUES(id_usuario_1),
             id_usuario_2 = VALUES(id_usuario_2),
             activa = TRUE,
             fecha_actualizacion = CURRENT_TIMESTAMP''',
        (match_id, u1_id, u2_id)
    )

    cursor.execute('DELETE FROM mensajes_match_chat WHERE id_match = %s', (match_id,))

    for sender_id, content in messages:
        cursor.execute(
            '''INSERT INTO mensajes_match_chat
               (id_mensaje, id_match, id_emisor, contenido)
               VALUES (%s, %s, %s, %s)''',
            (new_id(), match_id, sender_id, content)
        )


def main():
    print('=' * 72)
    print(' GoodMates - Seed integral de usuarios, perfiles, propiedades y relaciones')
    print('=' * 72)

    password_hash = hash_password(PASSWORD)
    print(f'Conectando a {DB_CONFIG["host"]}:{DB_CONFIG["port"]}/{DB_CONFIG["database"]} ...')

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    created = {
        'tenants': 0,
        'landlords': 0,
        'admins': 0,
        'profiles': 0,
        'properties': 0,
        'groups': 0,
        'inquiries': 0,
        'ratings': 0,
        'matches': 0,
    }

    users = {}
    tenant_ids = []

    print('\n--- Usuarios ---')
    for t in TENANTS:
        uid, is_new = ensure_user(cursor, t, 'tenant', password_hash)
        users[t['nombre_usuario']] = uid
        tenant_ids.append(uid)
        if is_new:
            created['tenants'] += 1
        profile_new = ensure_profile(cursor, uid, t['perfil'])
        if profile_new:
            created['profiles'] += 1
        print(f"  {'✓' if is_new else '↺'} tenant: {t['nombre_usuario']}")

    for l in LANDLORDS:
        uid, is_new = ensure_user(cursor, l, 'landlord', password_hash)
        users[l['nombre_usuario']] = uid
        if is_new:
            created['landlords'] += 1
        print(f"  {'✓' if is_new else '↺'} landlord: {l['nombre_usuario']}")

    for a in ADMINS:
        uid, is_new = ensure_user(cursor, a, 'admin', password_hash)
        users[a['nombre_usuario']] = uid
        if is_new:
            created['admins'] += 1
        print(f"  {'✓' if is_new else '↺'} admin: {a['nombre_usuario']}")

    print('\n--- Propiedades ---')
    property_ids = {}
    for p in PROPERTIES:
        landlord_id = users[p['landlord']]
        prop_id, is_new = ensure_property(cursor, landlord_id, p)
        property_ids[p['key']] = prop_id
        if is_new:
            created['properties'] += 1
        print(f"  {'✓' if is_new else '↺'} propiedad: {p['titulo']}")

    print('\n--- Reconfigurando grupos activos de tenants seed ---')
    if tenant_ids:
        placeholders = ','.join(['%s'] * len(tenant_ids))
        cursor.execute(f'DELETE FROM miembros_grupo WHERE id_usuario IN ({placeholders})', tuple(tenant_ids))

    prop_seed_ids = [property_ids[p['key']] for p in PROPERTIES]
    if prop_seed_ids:
        placeholders = ','.join(['%s'] * len(prop_seed_ids))
        cursor.execute(f'DELETE FROM grupos_roommates WHERE id_propiedad IN ({placeholders})', tuple(prop_seed_ids))

    grouped_usernames = set()
    for assignment in GROUP_ASSIGNMENTS:
        prop_id = property_ids[assignment['property_key']]
        group_id = new_id()
        cursor.execute(
            'INSERT INTO grupos_roommates (id_grupo, nombre, id_propiedad, activo) VALUES (%s, %s, %s, TRUE)',
            (group_id, assignment['group_name'], prop_id)
        )
        created['groups'] += 1

        landlord_id = None
        cursor.execute('SELECT id_landlord FROM propiedades WHERE id_propiedad = %s', (prop_id,))
        landlord_row = cursor.fetchone()
        if landlord_row:
            landlord_id = landlord_row['id_landlord']

        for username in assignment['members']:
            uid = users[username]
            grouped_usernames.add(username)
            role = 'creador' if username == assignment['creator'] else 'miembro'
            cursor.execute(
                '''INSERT INTO miembros_grupo (id_miembro, id_grupo, id_usuario, rol_en_grupo)
                   VALUES (%s, %s, %s, %s)''',
                (new_id(), group_id, uid, role)
            )
            cursor.execute(
                '''UPDATE usuarios
                   SET modo_busqueda_activo = FALSE,
                       fecha_activacion_busqueda = NULL
                   WHERE id_usuario = %s''',
                (uid,)
            )

            if landlord_id:
                _, inquiry_new = upsert_inquiry(
                    cursor,
                    uid,
                    prop_id,
                    landlord_id,
                    'confirmada',
                    'Confirmado como inquilino en grupo activo',
                )
                if inquiry_new:
                    created['inquiries'] += 1

    for t in TENANTS:
        uid = users[t['nombre_usuario']]
        if t['nombre_usuario'] not in grouped_usernames:
            cursor.execute(
                '''UPDATE usuarios
                   SET modo_busqueda_activo = TRUE,
                       fecha_activacion_busqueda = %s
                   WHERE id_usuario = %s''',
                (datetime.utcnow(), uid)
            )

    print(f'  ✓ grupos recreados: {created["groups"]}')

    print('\n--- Solicitudes adicionales ---')
    for item in EXTRA_INQUIRIES:
        tenant_id = users[item['tenant']]
        prop_id = property_ids[item['property_key']]
        cursor.execute('SELECT id_landlord FROM propiedades WHERE id_propiedad = %s', (prop_id,))
        landlord_id = cursor.fetchone()['id_landlord']

        _, inquiry_new = upsert_inquiry(
            cursor,
            tenant_id,
            prop_id,
            landlord_id,
            item['estado'],
            item.get('mensaje'),
        )
        if inquiry_new:
            created['inquiries'] += 1
        print(f"  {'✓' if inquiry_new else '↺'} {item['tenant']} -> {item['property_key']} ({item['estado']})")

    print('\n--- Ajustando disponibilidad de propiedades ---')
    for p in PROPERTIES:
        prop_id = property_ids[p['key']]
        habitaciones = p['habitaciones']
        cursor.execute(
            '''SELECT COUNT(*) AS ocupados
               FROM grupos_roommates g
               JOIN miembros_grupo mg ON mg.id_grupo = g.id_grupo
               WHERE g.id_propiedad = %s AND g.activo = TRUE''',
            (prop_id,)
        )
        ocupados = int(cursor.fetchone()['ocupados'])
        disponibles = max(0, habitaciones - ocupados)
        cursor.execute(
            '''UPDATE propiedades
               SET habitaciones_disponibles = %s,
                   disponible = %s
               WHERE id_propiedad = %s''',
            (disponibles, disponibles > 0, prop_id)
        )
        print(f'  ↺ {p["titulo"]}: {disponibles}/{habitaciones} disponibles')

    print('\n--- Calificaciones ---')
    for r in RATINGS:
        from_id = users[r['from']]
        to_id = users[r['to']]
        prop_id = property_ids[r['property_key']] if r.get('property_key') else None
        is_new = upsert_rating(cursor, from_id, to_id, prop_id, r['score'], r.get('comment'))
        if is_new:
            created['ratings'] += 1
        print(f"  {'✓' if is_new else '↺'} {r['from']} -> {r['to']} ({r['score']})")

    print('\n--- Matches ---')
    match_id_map = {}
    for m in MATCHES:
        u1_id = users[m['u1']]
        u2_id = users[m['u2']]
        match_id, is_new = upsert_match(cursor, u1_id, u2_id, m['compat'], m['estado'])
        match_id_map[(m['u1'], m['u2'])] = (match_id, u1_id, u2_id)
        if is_new:
            created['matches'] += 1
        print(f"  {'✓' if is_new else '↺'} {m['u1']} <-> {m['u2']} ({m['estado']}, {m['compat']}%)")

    print('\n--- Chats de matches aceptados ---')
    for (u1, u2), message_rows in MATCH_CHAT_MESSAGES.items():
        key = (u1, u2)
        if key not in match_id_map:
            rev = (u2, u1)
            if rev not in match_id_map:
                continue
            key = rev

        match_id, u1_id, u2_id = match_id_map[key]
        sender_payload = [(users[sender], content) for sender, content in message_rows]
        set_match_chat(cursor, match_id, u1_id, u2_id, sender_payload)
        print(f'  ↺ chat match: {u1} <-> {u2} ({len(sender_payload)} mensajes)')

    conn.commit()
    cursor.close()
    conn.close()

    print('\n' + '=' * 72)
    print(' RESUMEN')
    print('=' * 72)
    print(f" Tenants nuevos:      {created['tenants']}")
    print(f" Landlords nuevos:    {created['landlords']}")
    print(f" Admins nuevos:       {created['admins']}")
    print(f" Perfiles nuevos:     {created['profiles']}")
    print(f" Propiedades nuevas:  {created['properties']}")
    print(f" Grupos creados:      {created['groups']}")
    print(f" Solicitudes nuevas:  {created['inquiries']}")
    print(f" Calificaciones nuevas: {created['ratings']}")
    print(f" Matches nuevos:      {created['matches']}")
    print(f"\n Contraseña para todos los usuarios: {PASSWORD}")
    print('=' * 72)


if __name__ == '__main__':
    main()
