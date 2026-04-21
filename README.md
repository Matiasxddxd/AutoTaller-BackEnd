# 🔧 AutoTaller — Backend API

API REST + WebSockets para sistema de gestión de taller mecánico.

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express 4 |
| Base de datos | PostgreSQL 16 |
| Tiempo real | Socket.io |
| Auth | JWT (jsonwebtoken) |
| Notificaciones | Twilio (WhatsApp) |
| PDF | Puppeteer |
| Validación | express-validator |

---

## Inicio rápido

### Opción A — Con Docker (recomendado)

```bash
# 1. Clonar e instalar
git clone <repo> autotaller-backend
cd autotaller-backend

# 2. Levantar PostgreSQL + API
docker-compose up -d

# 3. Crear tablas
docker-compose exec api npm run db:migrate

# 4. Cargar datos de prueba
docker-compose exec api npm run db:seed
```

La API queda disponible en `http://localhost:3000`

---

### Opción B — Sin Docker (desarrollo local)

**Prerequisitos:** Node.js 20+, PostgreSQL 16 corriendo localmente.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# → Editar .env con tus datos de conexión

# 3. Crear la base de datos
createdb autotaller   # o desde psql: CREATE DATABASE autotaller;

# 4. Crear tablas
npm run db:migrate

# 5. Cargar datos iniciales (opcional)
npm run db:seed

# 6. Iniciar en modo desarrollo (hot reload)
npm run dev
```

---

## Variables de entorno

Copia `.env.example` a `.env` y configura:

```bash
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=autotaller
DB_USER=postgres
DB_PASSWORD=tu_password

JWT_SECRET=clave_larga_y_segura_minimo_32_caracteres
JWT_EXPIRES_IN=7d

# Para WhatsApp (opcional en desarrollo)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

> En desarrollo, si no configuras Twilio, las notificaciones se imprimen en consola (modo simulado).

---

## Endpoints de la API

### Auth — `/api/auth`
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/login` | Iniciar sesión | No |
| POST | `/register` | Crear usuario | Admin |
| GET | `/me` | Datos del usuario actual | Sí |

### Clientes — `/api/clients`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar (búsqueda + paginación) |
| GET | `/:id` | Detalle con vehículos y órdenes |
| POST | `/` | Crear cliente |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Eliminar (solo admin) |

### Vehículos — `/api/vehicles`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar (filtro por cliente o búsqueda) |
| GET | `/:id` | Detalle con historial de órdenes |
| POST | `/` | Registrar vehículo |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Eliminar (solo admin) |

### Cotizaciones — `/api/quotes`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar (filtro por estado/cliente) |
| GET | `/:id` | Detalle con ítems |
| POST | `/` | Crear con ítems |
| PATCH | `/:id/status` | Aprobar / rechazar |
| GET | `/:id/pdf` | Descargar PDF |

### Órdenes de trabajo — `/api/orders`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar (filtro por estado/mecánico) |
| GET | `/:id` | Detalle + historial + servicios |
| POST | `/` | Crear orden |
| PATCH | `/:id/status` | Cambiar estado + notificación WhatsApp |
| POST | `/:id/services` | Registrar trabajo realizado |

### Repuestos — `/api/repuestos`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar (con alerta stock bajo) |
| POST | `/` | Crear (solo admin) |
| PUT | `/:id` | Actualizar (solo admin) |
| PATCH | `/:id/stock` | Ajustar stock |

### Admin — `/api/admin` (solo rol admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | Métricas del mes |

---

## Roles y permisos

| Acción | Admin | Mecánico | Cliente |
|--------|-------|----------|---------|
| Ver órdenes | Todas | Solo las suyas | — |
| Crear clientes/vehículos | ✓ | ✓ | — |
| Cambiar estado OT | ✓ | ✓ | — |
| Registrar servicios | ✓ | ✓ | — |
| Crear/editar repuestos | ✓ | — | — |
| Panel admin + métricas | ✓ | — | — |
| Eliminar registros | ✓ | — | — |

---

## WebSockets

El servidor expone un canal de tiempo real para actualizaciones de estado.

**Desde el frontend:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { withCredentials: true });

// Suscribirse a una orden específica
socket.emit('join:order', orderId);

// Escuchar cambios de estado
socket.on('order:status_updated', ({ orderId, estadoAnterior, estadoNuevo }) => {
  console.log(`OT ${orderId}: ${estadoAnterior} → ${estadoNuevo}`);
});
```

---

## Flujo de estados de una OT

```
pendiente → en_proceso → terminado → entregado
```

Las transiciones son validadas — no se puede saltar estados.  
Al pasar a `terminado`, se envía WhatsApp automático al cliente.

---

## Estructura del proyecto

```
src/
├── config/
│   ├── db.ts           → Pool de conexiones PostgreSQL
│   ├── migrate.ts      → Crear todas las tablas
│   └── seed.ts         → Datos iniciales de prueba
├── middleware/
│   ├── auth.ts         → JWT + guardias de rol
│   └── errorHandler.ts → Manejo centralizado de errores
├── modules/
│   ├── auth/           → Login, register, /me
│   ├── clients/        → CRUD clientes
│   ├── vehicles/       → CRUD vehículos
│   ├── quotes/         → Cotizaciones + PDF
│   ├── orders/         → OT + estados + WebSocket
│   ├── repuestos/      → Inventario de repuestos
│   ├── notifications/  → WhatsApp + email
│   └── admin/          → Métricas del dashboard
├── types/
│   └── index.ts        → Tipos TypeScript compartidos
├── utils/
│   └── pdf.ts          → Generación de PDF con Puppeteer
├── app.ts              → Express + Socket.io setup
└── server.ts           → Punto de entrada
```

---

## Credenciales de prueba (después del seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@autotaller.cl | Admin1234! |
| Mecánico | juan@autotaller.cl | Mec12345! |
| Cliente | pedro@email.cl | Cliente1! |

---

## Próximos pasos

1. Construir el frontend en React + Tailwind
2. Agregar módulo de sucursales múltiples
3. Implementar recordatorios automáticos de mantención
4. Portal del cliente con URL única por vehículo
