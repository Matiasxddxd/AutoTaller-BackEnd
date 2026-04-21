import { Router } from 'express';
import { body, param } from 'express-validator';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { requireRole } from '../../middleware/auth';

export const vehiclesRouter = Router();

// ── GET /api/vehicles — listar con filtro por cliente ────────────────────────
vehiclesRouter.get('/', async (req, res, next) => {
  try {
    const { cliente_id, search } = req.query;
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let i = 1;

    if (cliente_id) { conditions.push(`v.cliente_id = $${i++}`); values.push(cliente_id); }
    if (search) {
      conditions.push(`(v.patente ILIKE $${i} OR v.marca ILIKE $${i} OR v.modelo ILIKE $${i} OR v.vin ILIKE $${i})`);
      values.push(`%${search}%`); i++;
    }

    const { rows } = await db.query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY v.created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/vehicles/:id — detalle con historial de órdenes ─────────────────
vehiclesRouter.get('/:id', param('id').isUUID(), validateRequest, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.email AS cliente_email, c.telefono AS cliente_telefono
       FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) throw new AppError('Vehículo no encontrado', 404);

    const { rows: ordenes } = await db.query(
      `SELECT o.*, m.nombre AS mecanico_nombre
       FROM ordenes_trabajo o
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       WHERE o.vehiculo_id = $1
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );

    res.json({ ...rows[0], historial_ordenes: ordenes });
  } catch (err) { next(err); }
});

// ── POST /api/vehicles — registrar vehículo ───────────────────────────────────
vehiclesRouter.post(
  '/',
  requireRole('admin', 'mecanico'),
  [
    body('cliente_id').isUUID().withMessage('Cliente requerido'),
    body('marca').trim().notEmpty().withMessage('Marca requerida'),
    body('modelo').trim().notEmpty().withMessage('Modelo requerido'),
    body('patente').trim().notEmpty().toUpperCase().withMessage('Patente requerida'),
    body('anio').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
    body('vin').optional().trim().isLength({ max: 17 }),
    body('kilometraje').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { cliente_id, marca, modelo, patente, anio, vin, color, kilometraje, combustible, notas } = req.body;
      const { rows } = await db.query(
        `INSERT INTO vehiculos (cliente_id, marca, modelo, patente, anio, vin, color, kilometraje, combustible, notas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [cliente_id, marca, modelo, patente.toUpperCase(), anio, vin, color, kilometraje, combustible || 'gasolina', notas]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/vehicles/:id — actualizar ────────────────────────────────────────
vehiclesRouter.put(
  '/:id',
  requireRole('admin', 'mecanico'),
  param('id').isUUID(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { marca, modelo, anio, color, kilometraje, combustible, notas } = req.body;
      const { rows } = await db.query(
        `UPDATE vehiculos SET marca=$1, modelo=$2, anio=$3, color=$4, kilometraje=$5,
         combustible=$6, notas=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
        [marca, modelo, anio, color, kilometraje, combustible, notas, req.params.id]
      );
      if (!rows[0]) throw new AppError('Vehículo no encontrado', 404);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── DELETE /api/vehicles/:id — solo admin ─────────────────────────────────────
vehiclesRouter.delete(
  '/:id',
  requireRole('admin'),
  param('id').isUUID(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rowCount } = await db.query('DELETE FROM vehiculos WHERE id=$1', [req.params.id]);
      if (!rowCount) throw new AppError('Vehículo no encontrado', 404);
      res.status(204).send();
    } catch (err) { next(err); }
  }
);
