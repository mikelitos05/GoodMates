# GoodMates

Aplicacion web fullstack para conectar roommates y gestionar convivencias compartidas en Mexico. Permite a inquilinos encontrar companeros de cuarto compatibles, a arrendadores publicar propiedades y gestionar inquilinos, y a administradores supervisar todo el sistema.

---

## Tabla de Contenidos

1. [Stack Tecnologico](#stack-tecnologico)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Instalacion y Configuracion](#instalacion-y-configuracion)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Backend](#backend)
   - [Servidor y Configuracion](#servidor-y-configuracion)
   - [Base de Datos](#base-de-datos)
   - [Autenticacion y Middleware](#autenticacion-y-middleware)
   - [API Endpoints](#api-endpoints)
   - [Servicios de Negocio](#servicios-de-negocio)
   - [Socket.io (Tiempo Real)](#socketio-tiempo-real)
   - [Subida de Archivos](#subida-de-archivos)
6. [Frontend](#frontend)
   - [Contexto de Autenticacion](#contexto-de-autenticacion)
   - [Rutas y Navegacion](#rutas-y-navegacion)
   - [Paginas por Rol](#paginas-por-rol)
   - [Componentes Compartidos](#componentes-compartidos)
   - [Servicio API (api.js)](#servicio-api-apijs)
   - [Datos Estaticos](#datos-estaticos)
7. [Sistema de Roles](#sistema-de-roles)
8. [Funcionalidades Principales](#funcionalidades-principales)
9. [Seeding de Datos](#seeding-de-datos)

---

## Stack Tecnologico

| Capa              | Tecnologia                            |
|-------------------|---------------------------------------|
| Frontend          | React 19, React Router DOM 7          |
| Mapas             | Leaflet 1.9, React Leaflet 5          |
| Tiempo real       | Socket.io Client 4.8                  |
| Cliente HTTP      | Fetch API nativo                      |
| Build             | Create React App (react-scripts 5)    |
| Backend           | Express.js 4.21, Node.js              |
| Autenticacion     | JWT (jsonwebtoken 9)                  |
| Hashing           | bcrypt 5.1                            |
| Base de datos     | MySQL (mysql2 3.11, pool de promesas) |
| Tiempo real       | Socket.io 4.8                         |
| Subida archivos   | Multer 2.0                            |
| IDs               | UUID v4                               |
| CORS              | cors 2.8                              |
| Variables entorno | dotenv 16.4                           |

---

## Arquitectura del Proyecto

```
Cliente (React :3000)  <-->  Servidor (Express :5001)  <-->  MySQL (:3306)
        |                           |
        +--- Socket.io (WS) -------+
```

- **Frontend**: SPA en React que se comunica con el backend via API REST y Socket.io.
- **Backend**: API REST en Express con Socket.io integrado para eventos en tiempo real.
- **Base de datos**: MySQL con pool de conexiones (maximo 10 concurrentes).
- **Archivos**: Las imagenes de propiedades se almacenan en `backend/uploads/propiedades/` y se sirven como archivos estaticos en `/uploads`.

---

## Instalacion y Configuracion

### Prerrequisitos

- Node.js (v18+)
- MySQL Server (v8+)
- npm
- Python 3 (opcional, para seeding)

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd Miguel
```

### 2. Configurar la base de datos

Crear una base de datos MySQL llamada `goodmates`:

```sql
CREATE DATABASE goodmates;
```

### 3. Configurar variables de entorno del backend

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` con tus credenciales:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=goodmates
JWT_SECRET=tu_clave_secreta_para_jwt
FRONTEND_URL=http://localhost:3000
```

### 4. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Iniciar la aplicacion

```bash
# Terminal 1 - Backend (puerto 5001)
cd backend
npm run dev

# Terminal 2 - Frontend (puerto 3000)
cd frontend
npm start
```

El backend auto-inicializa las tablas de la base de datos al arrancar (`initDb.js`).

### 6. Acceso desde red local

El servidor detecta automaticamente la IP de la red local e imprime la URL para acceder desde otros dispositivos (ej. celular). El frontend tambien resuelve dinamicamente el hostname del backend.

---

## Estructura de Archivos

```
Miguel/
├── backend/
│   ├── src/
│   │   ├── server.js                    # Punto de entrada del servidor
│   │   ├── config/
│   │   │   ├── db.js                    # Pool de conexiones MySQL
│   │   │   └── initDb.js               # Creacion automatica de tablas
│   │   ├── middleware/
│   │   │   └── authMiddleware.js        # JWT + verificacion de roles
│   │   ├── routes/
│   │   │   ├── auth.js                  # Registro, login, verificacion
│   │   │   ├── perfiles.js              # CRUD perfiles de inquilinos
│   │   │   ├── propiedades.js           # CRUD propiedades (con multer)
│   │   │   ├── matches.js               # Sistema de compatibilidad
│   │   │   ├── grupos.js                # Grupos de roommates
│   │   │   ├── tareas.js                # Gestor de tareas
│   │   │   ├── board.js                 # Mates Board (publicaciones)
│   │   │   ├── calificaciones.js        # Sistema de calificaciones
│   │   │   ├── solicitudes.js           # Solicitudes inquilino-arrendador
│   │   │   ├── chat.js                  # Chat en tiempo real
│   │   │   ├── convivencia.js           # Estado de convivencia
│   │   │   └── admin.js                 # Panel de administracion
│   │   └── services/
│   │       ├── compatibilityService.js  # Algoritmo de compatibilidad
│   │       ├── convivenciaRules.js      # Reglas de convivencia
│   │       └── ratingsService.js        # Logica de calificaciones
│   ├── uploads/
│   │   └── propiedades/                 # Imagenes subidas
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── index.js                     # Punto de entrada React
│   │   ├── App.js                       # Router principal + rutas
│   │   ├── contexts/
│   │   │   └── AuthContext.js           # Estado global de autenticacion
│   │   ├── services/
│   │   │   └── api.js                   # Cliente API centralizado (50+ funciones)
│   │   ├── components/
│   │   │   └── shared/
│   │   │       ├── Navbar.js            # Barra de navegacion
│   │   │       ├── Footer.js            # Pie de pagina
│   │   │       ├── ProtectedRoute.js    # Guard de rutas por rol
│   │   │       ├── RatingModal.js       # Modal de calificacion
│   │   │       └── IntroVideo.js        # Video introductorio
│   │   ├── pages/
│   │   │   ├── LandingPage.js           # Pagina de inicio publica
│   │   │   ├── LoginPage.js             # Inicio de sesion
│   │   │   ├── RegisterPage.js          # Registro de usuario
│   │   │   ├── ChatPage.js              # Chat (inquiry y match)
│   │   │   ├── tenant/
│   │   │   │   ├── TenantDashboard.js   # Dashboard del inquilino
│   │   │   │   ├── TenantProfile.js     # Perfil de compatibilidad
│   │   │   │   ├── PropertySearch.js    # Busqueda de propiedades
│   │   │   │   ├── PropertyDetail.js    # Detalle de propiedad
│   │   │   │   └── MatchesPage.js       # Matches de compatibilidad
│   │   │   ├── landlord/
│   │   │   │   ├── LandlordDashboard.js # Dashboard del arrendador
│   │   │   │   ├── PropertyManager.js   # CRUD de propiedades
│   │   │   │   ├── InquiryManager.js    # Gestion de solicitudes
│   │   │   │   └── LandlordTenants.js   # Inquilinos activos
│   │   │   ├── roommate/
│   │   │   │   ├── RoommateGroup.js     # Grupo de convivencia
│   │   │   │   ├── TaskManager.js       # Gestor de tareas
│   │   │   │   └── MatesBoard.js        # Tablero de publicaciones
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.js    # Panel de administracion
│   │   │   └── legal/
│   │   │       ├── TermsPage.js         # Terminos y condiciones
│   │   │       ├── PrivacyPage.js       # Politica de privacidad
│   │   │       └── ContactPage.js       # Pagina de contacto
│   │   └── data/
│   │       ├── mexicoLocations.js       # Estados y ciudades de Mexico
│   │       ├── cityCoordinates.js       # Coordenadas para el mapa
│   │       ├── hobbyOptions.js          # Catalogo de hobbies
│   │       ├── careerOptions.js         # Catalogo de carreras
│   │       └── propertyOptions.js       # Amenidades y reglas
│   └── package.json
│
├── seed_users.py                        # Script de seeding (Python)
├── .gitignore
└── README.md
```

---

## Backend

### Servidor y Configuracion

**Archivo**: `backend/src/server.js`

El servidor Express se configura con:

- **CORS** abierto para desarrollo (refleja el origin de cada peticion).
- **JSON body parser** para peticiones con cuerpo JSON.
- **Archivos estaticos** servidos desde `/uploads`.
- **Socket.io** montado sobre el mismo servidor HTTP.
- **Manejo de errores** centralizado (multer, errores generales).
- Escucha en `0.0.0.0` para permitir acceso desde la red local.
- Detecta la IP LAN automaticamente para facilitar pruebas moviles.

**Archivo**: `backend/src/config/db.js`

Pool de conexiones MySQL con:
- Maximo 10 conexiones concurrentes.
- API basada en promesas (`mysql2/promise`).
- Resolucion dinamica del hostname para soporte LAN.
- Funcion `testConnection()` para verificar conectividad al arrancar.

**Archivo**: `backend/src/config/initDb.js`

Al iniciar el servidor, crea automaticamente todas las tablas si no existen (`CREATE TABLE IF NOT EXISTS`). No se necesita ejecutar migraciones manualmente.

---

### Base de Datos

**Motor**: MySQL
**Nombre**: `goodmates`

#### Esquema de Tablas

| Tabla | Descripcion | Campos Clave |
|-------|-------------|--------------|
| `usuarios` | Cuentas de usuario | id (UUID), username, email, password_hash, nombre, apellido, telefono, rol (tenant/landlord/admin), estado (activo/suspendido/baja), foto_perfil |
| `perfiles` | Datos de compatibilidad del inquilino | id_usuario (FK), edad, presupuesto_min/max, ciudad, estado_mexico, horario, semestre, carrera, hobbies (JSON), mascotas, fumador, limpieza (1-5), ruido (1-5), visitas, genero_preferido |
| `propiedades` | Propiedades publicadas | id (UUID), id_arrendador (FK), titulo, descripcion, direccion, ciudad, estado_mexico, precio, num_habitaciones, num_banos, capacidad_maxima, amenidades (JSON), reglas (JSON), imagenes (JSON), latitud, longitud, disponible |
| `matches` | Matches de compatibilidad | id, id_usuario1, id_usuario2, compatibilidad (%), estado (pendiente/aceptado/rechazado), solicitado_por |
| `grupos_roommates` | Grupos de convivencia | id (UUID), id_propiedad (FK), nombre, creado_por |
| `miembros_grupo` | Miembros de cada grupo (N:M) | id_grupo (FK), id_usuario (FK), rol_grupo (admin/miembro) |
| `tareas` | Tareas del grupo | id, id_grupo (FK), titulo, descripcion, asignado_a (FK), estado, fecha_limite, prioridad |
| `publicaciones_board` | Posts en el Mates Board | id, id_grupo (FK), id_autor (FK), tipo (anuncio/pregunta/evento/general), titulo, contenido |
| `respuestas_board` | Respuestas a publicaciones | id, id_publicacion (FK), id_autor (FK), contenido |
| `calificaciones` | Calificaciones entre usuarios | id, id_calificador (FK), id_calificado (FK), puntuacion (1-5), comentario, tipo (roommate_a_roommate/landlord_a_tenant/tenant_a_landlord) |
| `calificaciones_pendientes` | Pendientes arrendador -> inquilino | id, id_arrendador, id_inquilino, id_propiedad |
| `calificaciones_pendientes_tenant` | Pendientes inquilino -> arrendador | id, id_inquilino, id_arrendador, id_propiedad |
| `calificaciones_grupo` | Calificaciones grupales | id, id_grupo, id_calificador, puntuacion, comentario |
| `notificaciones` | Notificaciones in-app | id, id_usuario (FK), tipo, mensaje, leida, datos_extra (JSON) |
| `solicitudes_informes` | Solicitudes inquilino-arrendador | id, id_inquilino (FK), id_arrendador (FK), id_propiedad (FK), estado (pendiente/aceptada/rechazada/confirmada/declinada), mensaje |
| `mensajes_chat` | Mensajes del chat de solicitudes | id, id_solicitud (FK), id_remitente (FK), mensaje |
| `conversaciones_match` | Conversaciones entre matches | id, id_match (FK) |
| `mensajes_match_chat` | Mensajes del chat de matches | id, id_conversacion (FK), id_remitente (FK), mensaje |

#### Relaciones Principales

```
usuarios 1──N perfiles         (un usuario tiene un perfil)
usuarios 1──N propiedades      (un arrendador tiene muchas propiedades)
usuarios N──M matches          (usuarios se emparejan entre si)
propiedades 1──N grupos        (una propiedad tiene grupos)
grupos N──M usuarios           (via miembros_grupo)
grupos 1──N tareas             (un grupo tiene tareas)
grupos 1──N publicaciones      (un grupo tiene publicaciones)
publicaciones 1──N respuestas  (una publicacion tiene respuestas)
solicitudes 1──N mensajes_chat (una solicitud tiene mensajes)
matches 1──1 conversaciones    (un match tiene una conversacion)
conversaciones 1──N mensajes   (una conversacion tiene mensajes)
```

---

### Autenticacion y Middleware

**Archivo**: `backend/src/middleware/authMiddleware.js`

#### `verificarToken`
- Extrae el JWT del header `Authorization: Bearer <token>`.
- Valida el token con `JWT_SECRET`.
- Inyecta `req.usuario` con: `{ id, username, email, rol }`.
- Retorna 401 si no hay token o es invalido.

#### `verificarRol(...rolesPermitidos)`
- Middleware factory que acepta un array de roles.
- Verifica que `req.usuario.rol` este en la lista permitida.
- Retorna 403 si el rol no esta autorizado.

#### `cargarUsuarioOpcional`
- Similar a `verificarToken` pero no falla si no hay token.
- Util para endpoints publicos que muestran info adicional a usuarios autenticados.

#### Flujo de autenticacion

```
1. POST /api/auth/register  -->  Crea usuario con bcrypt hash  -->  Retorna JWT
2. POST /api/auth/login     -->  Valida credenciales            -->  Retorna JWT
3. GET  /api/auth/verify     -->  Valida JWT existente           -->  Retorna datos usuario
4. Todas las rutas protegidas usan verificarToken + verificarRol
```

El token JWT contiene: `{ id, username, email, rol }` y expira en **24 horas**.
En el frontend, el token se almacena en `localStorage` con clave `token`.

---

### API Endpoints

#### Autenticacion (`/api/auth`)

| Metodo | Ruta       | Descripcion              | Auth |
|--------|-----------|--------------------------|------|
| POST   | /register | Registro de usuario      | No   |
| POST   | /login    | Inicio de sesion         | No   |
| GET    | /verify   | Verificar token valido   | Si   |

#### Perfiles (`/api/perfiles`)

| Metodo | Ruta       | Descripcion              | Auth | Rol     |
|--------|-----------|--------------------------|------|---------|
| GET    | /me       | Obtener mi perfil        | Si   | tenant  |
| PUT    | /me       | Actualizar mi perfil     | Si   | tenant  |
| GET    | /:userId  | Ver perfil de otro       | Si   | tenant  |

#### Propiedades (`/api/propiedades`)

| Metodo | Ruta                      | Descripcion                | Auth | Rol      |
|--------|--------------------------|----------------------------|------|----------|
| GET    | /                        | Listar con filtros         | Opc  | Cualq.   |
| GET    | /mis-propiedades         | Mis propiedades            | Si   | landlord |
| GET    | /:id                     | Detalle de propiedad       | Opc  | Cualq.   |
| GET    | /:id/inquilinos          | Inquilinos activos         | Si   | landlord |
| POST   | /                        | Crear propiedad (imagenes) | Si   | landlord |
| PUT    | /:id                     | Editar propiedad           | Si   | landlord |
| DELETE | /:id                     | Eliminar propiedad         | Si   | landlord |
| DELETE | /:id/inquilinos/:tenantId| Remover inquilino          | Si   | landlord |

#### Matches (`/api/matches`)

| Metodo | Ruta                     | Descripcion                   | Auth | Rol    |
|--------|-------------------------|-------------------------------|------|--------|
| GET    | /all-tenants             | Todos los tenants + compat.   | Si   | tenant |
| GET    | /                        | Mis matches                   | Si   | tenant |
| POST   | /calcular                | Calcular matches              | Si   | tenant |
| POST   | /:targetUserId/solicitar | Solicitar match               | Si   | tenant |
| PUT    | /:id/aceptar             | Aceptar match                 | Si   | tenant |
| PUT    | /:id/rechazar            | Rechazar match                | Si   | tenant |
| DELETE | /:id/desvincular         | Desvincular match             | Si   | tenant |

#### Grupos (`/api/grupos`)

| Metodo | Ruta                        | Descripcion        | Auth | Rol    |
|--------|----------------------------|--------------------|------|--------|
| GET    | /mi-grupo                  | Mi grupo actual    | Si   | tenant |
| POST   | /                          | Crear grupo        | Si   | tenant |
| POST   | /:groupId/miembros         | Agregar miembro    | Si   | tenant |
| DELETE | /:groupId/miembros/:userId | Remover miembro    | Si   | tenant |

#### Tareas (`/api/tareas`)

| Metodo | Ruta                  | Descripcion        | Auth | Rol    |
|--------|----------------------|--------------------|------|--------|
| GET    | /grupo/:groupId      | Tareas del grupo   | Si   | tenant |
| POST   | /                    | Crear tarea        | Si   | tenant |
| PUT    | /:taskId             | Editar tarea       | Si   | tenant |
| PUT    | /:taskId/completar   | Completar tarea    | Si   | tenant |
| DELETE | /:taskId             | Eliminar tarea     | Si   | tenant |

#### Mates Board (`/api/board`)

| Metodo | Ruta                       | Descripcion           | Auth | Rol    |
|--------|---------------------------|-----------------------|------|--------|
| GET    | /grupo/:groupId           | Publicaciones grupo   | Si   | tenant |
| POST   | /                         | Crear publicacion     | Si   | tenant |
| POST   | /:postId/respuestas       | Responder publicacion | Si   | tenant |
| DELETE | /:postId                  | Eliminar publicacion  | Si   | tenant |

#### Calificaciones (`/api/calificaciones`)

| Metodo | Ruta                            | Descripcion                    | Auth | Rol           |
|--------|---------------------------------|-------------------------------|------|---------------|
| POST   | /                               | Calificar a otro usuario       | Si   | tenant/landlord|
| GET    | /usuario/:userId                | Ver calificaciones de usuario  | Si   | Cualq.        |
| POST   | /grupo                          | Calificar grupo                | Si   | tenant        |
| GET    | /pendientes                     | Calificaciones pendientes (L)  | Si   | landlord      |
| PUT    | /pendientes/:pendingId/omitir   | Omitir calificacion            | Si   | landlord      |
| GET    | /pendientes-tenant              | Calificaciones pendientes (T)  | Si   | tenant        |

#### Solicitudes (`/api/solicitudes`)

| Metodo | Ruta                  | Descripcion                  | Auth | Rol           |
|--------|----------------------|------------------------------|------|---------------|
| POST   | /                    | Enviar solicitud             | Si   | tenant        |
| GET    | /mis-solicitudes     | Mis solicitudes enviadas     | Si   | tenant        |
| GET    | /recibidas           | Solicitudes recibidas        | Si   | landlord      |
| PUT    | /:id/aceptar         | Aceptar solicitud            | Si   | landlord      |
| PUT    | /:id/rechazar        | Rechazar solicitud           | Si   | landlord      |
| PUT    | /:id/confirmar       | Confirmar inquilino          | Si   | landlord      |
| PUT    | /:id/declinar        | Declinar inquilino           | Si   | landlord      |
| GET    | /contador            | Contar interesados           | Si   | landlord      |

#### Chat (`/api/chat`)

| Metodo | Ruta                       | Descripcion                  | Auth | Rol           |
|--------|---------------------------|------------------------------|------|---------------|
| GET    | /mis-chats                 | Mis chats activos            | Si   | tenant/landlord|
| GET    | /solicitud/:idSolicitud    | Mensajes de solicitud        | Si   | tenant/landlord|
| POST   | /solicitud/:idSolicitud    | Enviar mensaje solicitud     | Si   | tenant/landlord|
| GET    | /match/:idMatch            | Mensajes de match            | Si   | tenant        |
| POST   | /match/:idMatch            | Enviar mensaje match         | Si   | tenant        |

#### Admin (`/api/admin`)

| Metodo | Ruta                       | Descripcion                | Auth | Rol   |
|--------|---------------------------|----------------------------|------|-------|
| GET    | /estadisticas              | Estadisticas del sistema   | Si   | admin |
| GET    | /usuarios                  | Listar usuarios            | Si   | admin |
| PUT    | /usuarios/:userId/estado   | Cambiar estado de usuario  | Si   | admin |
| GET    | /propiedades               | Listar propiedades         | Si   | admin |
| DELETE | /propiedades/:id           | Eliminar propiedad         | Si   | admin |

#### Convivencia (`/api/convivencia`)

| Metodo | Ruta    | Descripcion               | Auth | Rol    |
|--------|---------|---------------------------|------|--------|
| GET    | /estado | Estado de mi convivencia  | Si   | tenant |

#### Health Check

| Metodo | Ruta         | Descripcion             | Auth |
|--------|-------------|-------------------------|------|
| GET    | /api/health  | Estado del servidor     | No   |

---

### Servicios de Negocio

#### Servicio de Compatibilidad (`compatibilityService.js`)

Calcula un porcentaje de compatibilidad entre dos perfiles de inquilinos usando pesos:

| Criterio     | Peso | Logica |
|-------------|------|--------|
| Ciudad       | 20   | Coincidencia exacta |
| Presupuesto  | 15   | Solapamiento de rangos |
| Horario      | 15   | Coincidencia exacta |
| Limpieza     | 15   | Diferencia en escala 1-5 |
| Ruido        | 10   | Diferencia en escala 1-5 |
| Mascotas     | 10   | Coincidencia booleana |
| Fumador      | 10   | Coincidencia booleana |
| Visitas      | 5    | Coincidencia exacta |
| Hobbies      | +    | Bonus por hobbies compartidos |

**Resultado**: Porcentaje de 0 a 100 (puede superar 100 con bonus de hobbies, se trunca).

#### Servicio de Convivencia (`convivenciaRules.js`)

- Valida capacidad de la propiedad antes de agregar inquilinos.
- Gestiona la remocion de inquilinos de convivencias activas.
- Recupera el contexto de convivencia actual de un inquilino.

#### Servicio de Calificaciones (`ratingsService.js`)

- Crea calificaciones pendientes cuando un inquilino deja una propiedad.
- Calcula resumenes de calificaciones (promedio, conteo).
- Soporta calificaciones bidireccionales (arrendador-inquilino).

---

### Socket.io (Tiempo Real)

**Eventos del servidor** (definidos en `server.js`):

| Evento Entrada          | Evento Salida          | Descripcion                              |
|------------------------|------------------------|------------------------------------------|
| `unirse-usuario`       | -                      | Usuario se une a su sala personal        |
| `unirse-grupo`         | -                      | Usuario se une a la sala de su grupo     |
| `unirse-chat`          | -                      | Usuario se une a una sala de chat        |
| `nueva-publicacion`    | `publicacion-creada`   | Nueva publicacion en el Mates Board      |
| `nueva-respuesta`      | `respuesta-creada`     | Nueva respuesta a una publicacion        |
| `tarea-actualizada`    | `tarea-cambio`         | Cambio en una tarea del grupo            |

**Salas**: `usuario-{id}`, `grupo-{id}`, `chat-{id}`

La instancia de `io` se comparte con las rutas via `app.set('io', io)`.

---

### Subida de Archivos

- **Libreria**: Multer 2.0
- **Destino**: `backend/uploads/propiedades/`
- **Limite**: 5 MB por archivo
- **Formatos**: JPEG, PNG, WebP, GIF
- **Servido en**: `http://localhost:5001/uploads/propiedades/{nombre_archivo}`
- **Nombre**: UUID + extension original para evitar colisiones

---

## Frontend

### Contexto de Autenticacion

**Archivo**: `frontend/src/contexts/AuthContext.js`

Provee un `AuthProvider` que envuelve toda la aplicacion con:

- **Estado**: `usuario`, `loading`, `isAuthenticated`
- **Metodos**: `login()`, `register()`, `logout()`, `actualizarPerfil()`
- **Persistencia**: Token JWT en `localStorage`
- **Auto-verificacion**: Al montar, verifica el token existente con `/api/auth/verify`

**Hook**: `useAuth()` para acceder al contexto desde cualquier componente.

---

### Rutas y Navegacion

**Archivo**: `frontend/src/App.js`

| Ruta                     | Componente          | Rol Requerido | Descripcion                |
|-------------------------|---------------------|---------------|----------------------------|
| `/`                     | LandingPage         | Publico       | Pagina de inicio           |
| `/login`                | LoginPage           | Publico       | Inicio de sesion           |
| `/register`             | RegisterPage        | Publico       | Registro                   |
| `/tenant/dashboard`     | TenantDashboard     | tenant        | Dashboard inquilino        |
| `/tenant/profile`       | TenantProfile       | tenant        | Perfil de compatibilidad   |
| `/tenant/properties`    | PropertySearch      | tenant        | Busqueda de propiedades    |
| `/tenant/properties/:id`| PropertyDetail      | tenant        | Detalle de propiedad       |
| `/tenant/matches`       | MatchesPage         | tenant        | Matches de compatibilidad  |
| `/landlord/dashboard`   | LandlordDashboard   | landlord      | Dashboard arrendador       |
| `/landlord/properties`  | PropertyManager     | landlord      | Gestion de propiedades     |
| `/landlord/inquiries`   | InquiryManager      | landlord      | Gestion de solicitudes     |
| `/landlord/tenants`     | LandlordTenants     | landlord      | Inquilinos activos         |
| `/roommate/group`       | RoommateGroup       | tenant        | Grupo de convivencia       |
| `/roommate/tasks`       | TaskManager         | tenant        | Gestor de tareas           |
| `/roommate/board`       | MatesBoard          | tenant        | Tablero de publicaciones   |
| `/admin/dashboard`      | AdminDashboard      | admin         | Panel de administracion    |
| `/chat/:idSolicitud`    | ChatPage (inquiry)  | tenant/landlord| Chat de solicitud        |
| `/chat/match/:idMatch`  | ChatPage (match)    | tenant        | Chat de match              |
| `/terminos`             | TermsPage           | Publico       | Terminos y condiciones     |
| `/privacidad`           | PrivacyPage         | Publico       | Politica de privacidad     |
| `/contacto`             | ContactPage         | Publico       | Pagina de contacto         |
| `*`                     | Redirect a `/`      | -             | Ruta no encontrada         |

La proteccion de rutas se realiza con el componente `ProtectedRoute`, que verifica autenticacion y rol antes de renderizar.

---

### Paginas por Rol

#### Publicas
- **LandingPage**: Pagina de inicio con informacion del servicio.
- **LoginPage**: Formulario de inicio de sesion.
- **RegisterPage**: Formulario de registro con seleccion de rol.
- **Paginas Legales**: Terminos, privacidad, contacto.

#### Tenant (Inquilino)
- **TenantDashboard**: Vista general con resumen de actividad.
- **TenantProfile**: Formulario de perfil de compatibilidad (edad, presupuesto, horario, hobbies, preferencias).
- **PropertySearch**: Busqueda de propiedades con filtros y vista de mapa (Leaflet).
- **PropertyDetail**: Detalle completo de una propiedad con galeria y opcion de enviar solicitud.
- **MatchesPage**: Lista de matches con porcentaje de compatibilidad.

#### Landlord (Arrendador)
- **LandlordDashboard**: Dashboard con estadisticas de propiedades y solicitudes.
- **PropertyManager**: CRUD completo de propiedades con subida de imagenes.
- **InquiryManager**: Gestion de solicitudes recibidas (aceptar/rechazar/confirmar/declinar).
- **LandlordTenants**: Vista de inquilinos activos por propiedad.

#### Roommate (Convivencia)
- **RoommateGroup**: Gestion del grupo de convivencia (miembros, invitaciones).
- **TaskManager**: Gestor de tareas con asignacion, prioridades y estados.
- **MatesBoard**: Tablero de publicaciones con tipos (anuncio, pregunta, evento, general) y respuestas.

#### Admin
- **AdminDashboard**: Estadisticas del sistema, gestion de usuarios (activar/suspender) y propiedades.

#### Compartido
- **ChatPage**: Chat unificado que soporta dos modos: solicitudes (tenant-landlord) y matches (tenant-tenant).

---

### Componentes Compartidos

**Directorio**: `frontend/src/components/shared/`

| Componente      | Descripcion                                                    |
|----------------|----------------------------------------------------------------|
| Navbar         | Barra de navegacion responsive con menu por rol                |
| Footer         | Pie de pagina con enlaces legales                              |
| ProtectedRoute | HOC que verifica autenticacion y rol antes de renderizar       |
| RatingModal    | Modal reutilizable para calificar usuarios (1-5 estrellas)     |
| IntroVideo     | Video introductorio que se muestra al cargar la app por primera vez |

---

### Servicio API (`api.js`)

**Archivo**: `frontend/src/services/api.js`

Cliente API centralizado con 50+ funciones que encapsulan todas las llamadas al backend.

**Configuracion**:
- URL base dinamica: `http://{window.location.hostname}:5001/api`
- Token JWT inyectado automaticamente en el header `Authorization`
- Manejo de errores unificado

**Funciones principales por modulo**:

```
Auth:         login(), register(), verifyToken()
Perfiles:     getMyProfile(), updateProfile(), getUserProfile()
Propiedades:  getProperties(), getProperty(), createProperty(), updateProperty(), deleteProperty()
Matches:      getAllTenants(), getMatches(), requestMatch(), acceptMatch(), rejectMatch()
Grupos:       getMyGroup(), createGroup(), addMember(), removeMember()
Tareas:       getGroupTasks(), createTask(), updateTask(), completeTask(), deleteTask()
Board:        getGroupPosts(), createPost(), replyToPost(), deletePost()
Calific.:     rateUser(), getUserRatings(), rateGroup(), getPendingRatings()
Solicitudes:  createInquiry(), getMyInquiries(), getReceivedInquiries(), acceptInquiry()...
Chat:         getMyChats(), getInquiryMessages(), sendInquiryMessage(), getMatchMessages()...
Admin:        getStats(), getUsers(), changeUserStatus(), getAdminProperties(), deleteAdminProperty()
Convivencia:  getConvivenciaStatus()
Utilidades:   getImageUrl()
```

---

### Datos Estaticos

**Directorio**: `frontend/src/data/`

| Archivo              | Contenido                                          |
|---------------------|---------------------------------------------------|
| mexicoLocations.js  | Estados y ciudades de Mexico para formularios      |
| cityCoordinates.js  | Coordenadas lat/lng de ciudades para Leaflet       |
| hobbyOptions.js     | Catalogo de hobbies para el perfil                 |
| careerOptions.js    | Catalogo de carreras universitarias                |
| propertyOptions.js  | Opciones de amenidades y reglas para propiedades   |

---

## Sistema de Roles

```
┌─────────────────────────────────────────────────────────┐
│                      ADMIN                               │
│  - Ver estadisticas del sistema                          │
│  - Gestionar usuarios (activar, suspender)               │
│  - Gestionar propiedades (eliminar)                      │
├─────────────────────────────────────────────────────────┤
│                     LANDLORD                             │
│  - Publicar y gestionar propiedades                      │
│  - Recibir y gestionar solicitudes                       │
│  - Chatear con inquilinos interesados                    │
│  - Confirmar/declinar inquilinos                         │
│  - Calificar inquilinos                                  │
│  - Ver inquilinos activos por propiedad                  │
├─────────────────────────────────────────────────────────┤
│                      TENANT                              │
│  - Crear perfil de compatibilidad                        │
│  - Buscar propiedades (con mapa)                         │
│  - Enviar solicitudes a arrendadores                     │
│  - Buscar roommates compatibles (matches)                │
│  - Chatear con matches y arrendadores                    │
│  - Formar grupos de convivencia                          │
│  - Gestionar tareas del grupo                            │
│  - Publicar en el Mates Board                            │
│  - Calificar roommates y arrendadores                    │
└─────────────────────────────────────────────────────────┘
```

---

## Funcionalidades Principales

### 1. Sistema de Matching
Los inquilinos completan un perfil de compatibilidad. El algoritmo calcula un porcentaje entre 0-100% basado en ciudad, presupuesto, horario, limpieza, ruido, mascotas, fumador, visitas y hobbies compartidos. Los usuarios pueden solicitar, aceptar o rechazar matches.

### 2. Busqueda de Propiedades
Los inquilinos buscan propiedades con filtros (ciudad, precio, habitaciones) y vista de mapa interactivo usando Leaflet. Cada propiedad muestra galeria de imagenes, amenidades, reglas y ubicacion.

### 3. Flujo de Solicitudes
1. Inquilino envia solicitud a una propiedad.
2. Arrendador recibe y puede **aceptar** o **rechazar**.
3. Si acepta, puede **confirmar** (el inquilino entra a la propiedad) o **declinar**.
4. Durante el proceso, ambos pueden chatear en tiempo real.

### 4. Convivencia
Una vez confirmados, los inquilinos forman un grupo de convivencia donde pueden:
- Gestionar tareas compartidas (asignar, priorizar, completar).
- Publicar en el Mates Board (anuncios, preguntas, eventos).
- Todo se actualiza en tiempo real via Socket.io.

### 5. Sistema de Calificaciones
- Roommate a roommate (1-5 estrellas + comentario).
- Arrendador a inquilino y viceversa.
- Se generan calificaciones pendientes cuando un inquilino deja una propiedad.

### 6. Chat en Tiempo Real
Dos tipos de chat:
- **Chat de solicitud**: entre inquilino y arrendador durante el proceso de solicitud.
- **Chat de match**: entre dos inquilinos que hicieron match de compatibilidad.

---

## Seeding de Datos

**Archivo**: `seed_users.py`

Script en Python para poblar la base de datos con datos de ejemplo.

### Prerrequisitos

```bash
pip install mysql-connector-python bcrypt
```

### Uso

```bash
python seed_users.py
```

Crea usuarios de ejemplo con perfiles, propiedades y datos de prueba para facilitar el desarrollo y las demos.

---

## Scripts Disponibles

### Backend

```bash
npm start       # Inicia con node (produccion)
npm run dev     # Inicia con nodemon (desarrollo, hot reload)
```

### Frontend

```bash
npm start       # Servidor de desarrollo (puerto 3000)
npm run build   # Build de produccion
npm test        # Ejecutar tests
```
