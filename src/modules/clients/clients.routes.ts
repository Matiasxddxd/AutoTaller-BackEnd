import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { requireRole } from '../../middleware/auth';

export const clientsRouter = Router();

// ── GET /api/clients — listar con búsqueda y paginación ──────────────────────
clientsRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query.search as string || '';
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT
         c.*,
         COUNT(v.id)::int  AS total_vehiculos,
         COUNT(o.id)::int  AS total_ordenes
       FROM clientes c
       LEFT JOIN vehiculos v ON v.cliente_id = c.id
       LEFT JOIN ordenes_trabajo o ON o.vehiculo_id = v.id
       WHERE
         c.nombre  ILIKE $1 OR
         c.email   ILIKE $1 OR
         c.telefono ILIKE $1 OR
         c.rut     ILIKE $1
       GROUP BY c.id
       ORDER BY c.nombre ASC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*)::int FROM clientes
       WHERE nombre ILIKE $1 OR email ILIKE $1 OR telefono ILIKE $1 OR rut ILIKE $1`,
      [`%${search}%`]
    );

    res.json({ data: rows, total: count, page, limit });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/clients/:id — detalle completo ───────────────────────────────────
clientsRouter.get('/:id', param('id').isUUID(), validateRequest, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM clientes WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) throw new AppError('Cliente no encontrado', 404);

    // Vehículos del cliente
    const { rows: vehiculos } = await db.query(
      'SELECT * FROM vehiculos WHERE cliente_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    // Últimas órdenes
    const { rows: ordenes } = await db.query(
      `SELECT o.*, v.marca, v.modelo, v.patente
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       WHERE v.cliente_id = $1
       ORDER BY o.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ ...rows[0], vehiculos, ordenes });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/clients — crear cliente ─────────────────────────────────────────
clientsRouter.post(
  '/',
  requireRole('admin', 'mecanico'),
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('telefono').optional().isMobilePhone('any'),
    body('email').optional().isEmail().normalizeEmail(),
    body('rut').optional().trim(),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { nombre, telefono, email, rut, direccion, notas } = req.body;

      const { rows } = await db.query(
        `INSERT INTO clientes (nombre, telefono, email, rut, direccion, notas)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [nombre, telefono, email, rut, direccion, notas]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/clients/:id — actualizar ─────────────────────────────────────────
clientsRouter.put(
  '/:id',
  requireRole('admin', 'mecanico'),
  param('id').isUUID(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { nombre, telefono, email, rut, direccion, notas } = req.body;

      const { rows } = await db.query(
        `UPDATE clientes
         SET nombre=$1, telefono=$2, email=$3, rut=$4, direccion=$5, notas=$6, updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [nombre, telefono, email, rut, direccion, notas, req.params.id]
      );
      if (!rows[0]) throw new AppError('Cliente no encontrado', 404);

      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/clients/:id — solo admin ──────────────────────────────────────
clientsRouter.delete(
  '/:id',
  requireRole('admin'),
  param('id').isUUID(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rowCount } = await db.query(
        'DELETE FROM clientes WHERE id = $1', [req.params.id]
      );
      if (!rowCount) throw new AppError('Cliente no encontrado', 404);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
