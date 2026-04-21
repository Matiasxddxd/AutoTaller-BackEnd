import { Router } from 'express';
import { body, param } from 'express-validator';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { requireRole } from '../../middleware/auth';
import { generateQuotePDF } from '../../utils/pdf';
import path from 'path';
import fs from 'fs';

export const quotesRouter = Router();

// ── GET /api/quotes — listar cotizaciones ─────────────────────────────────────
quotesRouter.get('/', async (req, res, next) => {
  try {
    const { estado, cliente_id } = req.query;
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let i = 1;

    if (estado)     { conditions.push(`q.estado = $${i++}`);      values.push(estado); }
    if (cliente_id) { conditions.push(`q.cliente_id = $${i++}`);  values.push(cliente_id); }

    const { rows } = await db.query(
      `SELECT
         q.*,
         c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
         v.marca, v.modelo, v.patente
       FROM cotizaciones q
       JOIN clientes c ON c.id = q.cliente_id
       JOIN vehiculos v ON v.id = q.vehiculo_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY q.created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/quotes/:id — detalle con items ───────────────────────────────────
quotesRouter.get('/:id', param('id').isUUID(), validateRequest, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT q.*,
         c.nombre AS cliente_nombre, c.email AS cliente_email, c.telefono AS cliente_telefono,
         v.marca, v.modelo, v.patente, v.anio, v.color
       FROM cotizaciones q
       JOIN clientes c ON c.id = q.cliente_id
       JOIN vehiculos v ON v.id = q.vehiculo_id
       WHERE q.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) throw new AppError('Cotización no encontrada', 404);

    const { rows: items } = await db.query(
      `SELECT ci.*, r.nombre AS repuesto_nombre, r.codigo_sku
       FROM cotizacion_items ci
       LEFT JOIN repuestos r ON r.id = ci.repuesto_id
       WHERE ci.cotizacion_id = $1
       ORDER BY ci.tipo, ci.descripcion`,
      [req.params.id]
    );

    res.json({ ...rows[0], items });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/quotes — crear cotización con items ─────────────────────────────
quotesRouter.post(
  '/',
  requireRole('admin', 'mecanico'),
  [
    body('cliente_id').isUUID(),
    body('vehiculo_id').isUUID(),
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un ítem'),
    body('items.*.tipo').isIn(['repuesto','mano_de_obra','otro']),
    body('items.*.descripcion').trim().notEmpty(),
    body('items.*.cantidad').isFloat({ min: 0.01 }),
    body('items.*.precio_unitario').isFloat({ min: 0 }),
    body('vencimiento').optional().isDate(),
    validateRequest,
  ],
  async (req, res, next) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const { cliente_id, vehiculo_id, items, notas, vencimiento } = req.body;

      // Calcular totales
      const subtotal = items.reduce(
        (sum: number, i: any) => sum + (i.cantidad * i.precio_unitario), 0
      );
      const iva   = Math.round(subtotal * 0.19);
      const total = subtotal + iva;

      // Crear cotización
      const { rows: [cotizacion] } = await client.query(
        `INSERT INTO cotizaciones
           (cliente_id, vehiculo_id, subtotal, iva, total, notas, vencimiento)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [cliente_id, vehiculo_id, subtotal, iva, total, notas, vencimiento]
      );

      // Insertar items
      for (const item of items) {
        await client.query(
          `INSERT INTO cotizacion_items
             (cotizacion_id, repuesto_id, tipo, descripcion, cantidad, precio_unitario)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [cotizacion.id, item.repuesto_id || null, item.tipo,
           item.descripcion, item.cantidad, item.precio_unitario]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ ...cotizacion, items });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── PATCH /api/quotes/:id/status — aprobar o rechazar ────────────────────────
quotesRouter.patch(
  '/:id/status',
  requireRole('admin', 'mecanico'),
  [
    param('id').isUUID(),
    body('estado').isIn(['enviada','aprobada','rechazada','vencida']),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { estado } = req.body;

      const { rows } = await db.query(
        `UPDATE cotizaciones SET estado=$1, updated_at=NOW()
         WHERE id=$2 RETURNING *`,
        [estado, req.params.id]
      );
      if (!rows[0]) throw new AppError('Cotización no encontrada', 404);

      // Si se aprueba, crear automáticamente una orden de trabajo
      if (estado === 'aprobada') {
        await db.query(
          `INSERT INTO ordenes_trabajo (vehiculo_id, cotizacion_id, diagnostico)
           SELECT vehiculo_id, id, 'Orden generada desde cotización aprobada'
           FROM cotizaciones WHERE id = $1`,
          [req.params.id]
        );
      }

      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/quotes/:id/pdf — generar y descargar PDF ────────────────────────
quotesRouter.get('/:id/pdf', param('id').isUUID(), validateRequest, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT q.*,
         c.nombre AS cliente_nombre, c.email AS cliente_email, c.rut AS cliente_rut,
         v.marca, v.modelo, v.patente, v.anio
       FROM cotizaciones q
       JOIN clientes c ON c.id = q.cliente_id
       JOIN vehiculos v ON v.id = q.vehiculo_id
       WHERE q.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) throw new AppError('Cotización no encontrada', 404);

    const { rows: items } = await db.query(
      'SELECT * FROM cotizacion_items WHERE cotizacion_id = $1', [req.params.id]
    );

    const pdf = await generateQuotePDF({ ...rows[0], items });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${req.params.id.slice(0,8)}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});
