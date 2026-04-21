import { db } from './db';

const migrate = async () => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 Iniciando migración...');

    // ── Extensiones ──────────────────────────────────────────────────────────
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // ── SUCURSALES ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sucursales (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre      VARCHAR(100) NOT NULL,
        direccion   VARCHAR(200),
        telefono    VARCHAR(20),
        activa      BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── USERS ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email          VARCHAR(150) UNIQUE NOT NULL,
        password_hash  VARCHAR(255) NOT NULL,
        role           VARCHAR(20) NOT NULL CHECK (role IN ('admin','mecanico','cliente')),
        activo         BOOLEAN DEFAULT TRUE,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── CLIENTES ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
        nombre       VARCHAR(100) NOT NULL,
        telefono     VARCHAR(20),
        email        VARCHAR(150),
        rut          VARCHAR(12) UNIQUE,
        direccion    VARCHAR(200),
        notas        TEXT,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── MECANICOS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mecanicos (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
        sucursal_id   UUID REFERENCES sucursales(id),
        nombre        VARCHAR(100) NOT NULL,
        especialidad  VARCHAR(100),
        rut           VARCHAR(12) UNIQUE,
        telefono      VARCHAR(20),
        activo        BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── VEHÍCULOS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehiculos (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        marca         VARCHAR(50) NOT NULL,
        modelo        VARCHAR(50) NOT NULL,
        anio          SMALLINT,
        patente       VARCHAR(10) UNIQUE NOT NULL,
        vin           VARCHAR(17) UNIQUE,
        color         VARCHAR(30),
        kilometraje   INTEGER,
        combustible   VARCHAR(20) DEFAULT 'gasolina',
        notas         TEXT,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── REPUESTOS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS repuestos (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre         VARCHAR(150) NOT NULL,
        codigo_sku     VARCHAR(50) UNIQUE,
        descripcion    TEXT,
        precio_costo   NUMERIC(12,2) DEFAULT 0,
        precio_venta   NUMERIC(12,2) NOT NULL,
        stock          INTEGER DEFAULT 0,
        stock_minimo   INTEGER DEFAULT 1,
        unidad         VARCHAR(20) DEFAULT 'unidad',
        activo         BOOLEAN DEFAULT TRUE,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── COTIZACIONES ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cliente_id    UUID NOT NULL REFERENCES clientes(id),
        vehiculo_id   UUID NOT NULL REFERENCES vehiculos(id),
        estado        VARCHAR(20) DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','enviada','aprobada','rechazada','vencida')),
        subtotal      NUMERIC(12,2) DEFAULT 0,
        iva           NUMERIC(12,2) DEFAULT 0,
        total         NUMERIC(12,2) DEFAULT 0,
        notas         TEXT,
        vencimiento   DATE,
        pdf_url       VARCHAR(500),
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── COTIZACIÓN ITEMS ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cotizacion_items (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cotizacion_id   UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
        repuesto_id     UUID REFERENCES repuestos(id) ON DELETE SET NULL,
        tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('repuesto','mano_de_obra','otro')),
        descripcion     VARCHAR(200) NOT NULL,
        cantidad        NUMERIC(10,2) DEFAULT 1,
        precio_unitario NUMERIC(12,2) NOT NULL,
        subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── ÓRDENES DE TRABAJO ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ordenes_trabajo (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cotizacion_id   UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
        vehiculo_id     UUID NOT NULL REFERENCES vehiculos(id),
        mecanico_id     UUID REFERENCES mecanicos(id) ON DELETE SET NULL,
        sucursal_id     UUID REFERENCES sucursales(id),
        estado          VARCHAR(20) DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','en_proceso','terminado','entregado')),
        prioridad       VARCHAR(10) DEFAULT 'normal' CHECK (prioridad IN ('baja','normal','alta','urgente')),
        diagnostico     TEXT,
        notas_internas  TEXT,
        kilometraje_ingreso INTEGER,
        fecha_ingreso   TIMESTAMP DEFAULT NOW(),
        fecha_estimada  DATE,
        fecha_entrega   TIMESTAMP,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── SERVICIOS REALIZADOS ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicios_realizados (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        orden_id        UUID NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
        mecanico_id     UUID REFERENCES mecanicos(id) ON DELETE SET NULL,
        descripcion     VARCHAR(200) NOT NULL,
        observaciones   TEXT,
        horas_trabajo   NUMERIC(5,2),
        fecha_hora      TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── HISTORIAL DE ESTADOS ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS estado_historial (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        orden_id         UUID NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
        usuario_id       UUID REFERENCES users(id) ON DELETE SET NULL,
        estado_anterior  VARCHAR(20),
        estado_nuevo     VARCHAR(20) NOT NULL,
        comentario       TEXT,
        created_at       TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── NOTIFICACIONES ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        orden_id     UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
        cliente_id   UUID REFERENCES clientes(id) ON DELETE CASCADE,
        canal        VARCHAR(20) NOT NULL CHECK (canal IN ('whatsapp','email','sms')),
        tipo         VARCHAR(50) NOT NULL,
        mensaje      TEXT NOT NULL,
        enviada      BOOLEAN DEFAULT FALSE,
        error        TEXT,
        enviada_at   TIMESTAMP,
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── ÍNDICES para consultas frecuentes ────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente    ON vehiculos(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_vehiculos_patente    ON vehiculos(patente);
      CREATE INDEX IF NOT EXISTS idx_ordenes_estado       ON ordenes_trabajo(estado);
      CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo     ON ordenes_trabajo(vehiculo_id);
      CREATE INDEX IF NOT EXISTS idx_ordenes_mecanico     ON ordenes_trabajo(mecanico_id);
      CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_historial_orden      ON estado_historial(orden_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migración completada — todas las tablas creadas.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', err);
    throw err;
  } finally {
    client.release();
    await db.end();
  }
};

migrate();
