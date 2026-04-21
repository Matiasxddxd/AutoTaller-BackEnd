import bcrypt from 'bcryptjs';
import { db } from './db';

const seed = async () => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Insertando datos iniciales...');

    // ── Sucursal principal ────────────────────────────────────────────────────
    const { rows: [sucursal] } = await client.query(`
      INSERT INTO sucursales (nombre, direccion, telefono)
      VALUES ('Casa Matriz', 'Av. Principal 1234, Santiago', '+56222345678')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    if (!sucursal) {
      console.log('ℹ️  Datos ya existen, saltando seed.');
      await client.query('ROLLBACK');
      return;
    }

    // ── Usuarios ──────────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('Admin1234!', 12);

    const { rows: [adminUser] } = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('admin@autotaller.cl', $1, 'admin')
      RETURNING id;
    `, [hash]);

    const mecHash = await bcrypt.hash('Mec12345!', 12);
    const { rows: [mecUser] } = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('juan@autotaller.cl', $1, 'mecanico')
      RETURNING id;
    `, [mecHash]);

    const cliHash = await bcrypt.hash('Cliente1!', 12);
    const { rows: [cliUser] } = await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('pedro@email.cl', $1, 'cliente')
      RETURNING id;
    `, [cliHash]);

    // ── Mecánico ──────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO mecanicos (user_id, sucursal_id, nombre, especialidad, rut, telefono)
      VALUES ($1, $2, 'Juan Méndez', 'Motor y transmisión', '12345678-9', '+56912345678');
    `, [mecUser.id, sucursal.id]);

    // ── Cliente de prueba ─────────────────────────────────────────────────────
    const { rows: [cliente] } = await client.query(`
      INSERT INTO clientes (user_id, nombre, telefono, email, rut)
      VALUES ($1, 'Pedro González', '+56987654321', 'pedro@email.cl', '9876543-2')
      RETURNING id;
    `, [cliUser.id]);

    // ── Vehículo de prueba ────────────────────────────────────────────────────
    const { rows: [vehiculo] } = await client.query(`
      INSERT INTO vehiculos (cliente_id, marca, modelo, anio, patente, vin, color, kilometraje)
      VALUES ($1, 'Toyota', 'Corolla', 2019, 'ABCD12', '1HGBH41JXMN109186', 'Blanco', 85000)
      RETURNING id;
    `, [cliente.id]);

    // ── Repuestos de ejemplo ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO repuestos (nombre, codigo_sku, precio_costo, precio_venta, stock, stock_minimo, unidad)
      VALUES
        ('Filtro de aceite Toyota', 'FIL-ACE-001', 3500,  8000,  20, 5, 'unidad'),
        ('Aceite motor 5W-30 1L',   'ACE-5W30-1L', 4200,  9500,  50, 10,'litro'),
        ('Pastillas de freno delanteras', 'FRE-PAS-DEL', 18000, 35000, 8, 2, 'juego'),
        ('Filtro de aire', 'FIL-AIR-001', 4500, 12000, 15, 3, 'unidad'),
        ('Bujía NGK iridium', 'BUJ-NGK-001', 3800, 9000, 30, 8, 'unidad');
    `);

    await client.query('COMMIT');
    console.log('✅ Seed completado.\n');
    console.log('📋 Credenciales de prueba:');
    console.log('   Admin    → admin@autotaller.cl  / Admin1234!');
    console.log('   Mecánico → juan@autotaller.cl   / Mec12345!');
    console.log('   Cliente  → pedro@email.cl       / Cliente1!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', err);
    throw err;
  } finally {
    client.release();
    await db.end();
  }
};

seed();
