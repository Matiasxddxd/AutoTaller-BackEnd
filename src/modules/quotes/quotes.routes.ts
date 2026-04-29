import { Router } from 'express';
import { body } from 'express-validator';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { generateQuotePDF } from '../../utils/pdf';

export const quotesRouter = Router();

// ── GET /api/quotes ───────────────────────────────────────────────────────────
quotesRouter.get('/', async (req, res, next) => {
  try {
    const { estado, cliente_id } = req.query;
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (estado) { params.push(estado); where += ` AND q.estado = $${params.length}`; }
    if (cliente_id) { params.push(cliente_id); where += ` AND q.cliente_id = $${params.length}`; }

    const { rows } = await db.query(`
      SELECT q.*,
             c.nombre  AS cliente_nombre,
             v.patente, v.marca, v.modelo
      FROM cotizaciones q
      JOIN clientes  c ON c.id = q.cliente_id
      JOIN vehiculos v ON v.id = q.vehiculo_id
      ${where}
      ORDER BY q.created_at DESC
    `, params);

    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/quotes/:id ───────────────────────────────────────────────────────
quotesRouter.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT q.*,
             c.nombre AS cliente_nombre, c.email AS cliente_email,
             c.telefono AS cliente_telefono, c.rut AS cliente_rut,
             v.patente, v.marca, v.modelo, v.anio, v.color
      FROM cotizaciones q
      JOIN clientes  c ON c.id = q.cliente_id
      JOIN vehiculos v ON v.id = q.vehiculo_id
      WHERE q.id = $1
    `, [req.params.id]);

    if (!rows[0]) throw new AppError('Cotización no encontrada', 404);

    const { rows: items } = await db.query(
      'SELECT * FROM cotizacion_items WHERE cotizacion_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({ ...rows[0], items });
  } catch (err) { next(err); }
});

// ── POST /api/quotes ──────────────────────────────────────────────────────────
quotesRouter.post('/', [
  body('cliente_id').notEmpty(),
  body('vehiculo_id').notEmpty(),
  body('items').isArray({ min: 1 }),
  validateRequest,
], async (req, res, next) => {
  try {
    const { cliente_id, vehiculo_id, items, notas, vencimiento, incluye_iva } = req.body;

    const subtotal = items.reduce((s: number, i: any) =>
      s + (Number(i.cantidad) * Number(i.precio_unitario)), 0);

    const usaIva = incluye_iva !== false; // true por defecto
    const iva   = usaIva ? subtotal * 0.19 : 0;
    const total  = subtotal + iva;

    const { rows } = await db.query(`
      INSERT INTO cotizaciones (cliente_id, vehiculo_id, subtotal, iva, total, notas, vencimiento, creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [cliente_id, vehiculo_id, subtotal, iva, total, notas, vencimiento || null, req.user?.userId]);

    const cotizacion = rows[0];

    for (const item of items) {
      await db.query(`
        INSERT INTO cotizacion_items (cotizacion_id, tipo, descripcion, cantidad, precio_unitario)
        VALUES ($1,$2,$3,$4,$5)
      `, [cotizacion.id, item.tipo, item.descripcion, item.cantidad, item.precio_unitario]);
    }

    res.status(201).json(cotizacion);
  } catch (err) { next(err); }
});

// ── PATCH /api/quotes/:id/status ──────────────────────────────────────────────
quotesRouter.patch('/:id/status', [
  body('estado').isIn(['borrador','enviada','aprobada','rechazada','vencida']),
  validateRequest,
], async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE cotizaciones SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [req.body.estado, req.params.id]
    );
    if (!rows[0]) throw new AppError('No encontrada', 404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/quotes/:id ────────────────────────────────────────────────────
quotesRouter.delete('/:id', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') throw new AppError('Solo admins pueden eliminar cotizaciones', 403);

    await db.query('DELETE FROM cotizacion_items WHERE cotizacion_id = $1', [req.params.id]);
    await db.query('DELETE FROM cotizaciones WHERE id = $1', [req.params.id]);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── GET /api/quotes/:id/pdf ───────────────────────────────────────────────────
quotesRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const { generateQuotePDF } = await import('../../utils/pdf');
    const { rows } = await db.query(`
      SELECT q.*, c.nombre AS cliente_nombre, c.email AS cliente_email,
             c.telefono AS cliente_telefono, c.rut AS cliente_rut,
             v.patente, v.marca, v.modelo, v.anio
      FROM cotizaciones q
      JOIN clientes c ON c.id = q.cliente_id
      JOIN vehiculos v ON v.id = q.vehiculo_id
      WHERE q.id = $1
    `, [req.params.id]);

    if (!rows[0]) throw new AppError('No encontrada', 404);

    const { rows: items } = await db.query(
      'SELECT * FROM cotizacion_items WHERE cotizacion_id = $1',
      [req.params.id]
    );

    const pdf = await generateQuotePDF({ ...rows[0], items });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${req.params.id.slice(0,8)}.pdf`);
    res.send(pdf);
  } catch (err) { next(err); }
});