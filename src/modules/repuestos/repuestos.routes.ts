import { Router } from 'express';
import { body, param } from 'express-validator';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { requireRole } from '../../middleware/auth';

export const repuestosRouter = Router();

// ── GET /api/repuestos — listar con alerta de stock bajo ─────────────────────
repuestosRouter.get('/', async (req, res, next) => {
  try {
    const { search, stock_bajo } = req.query;
    const conditions: string[] = ['activo = TRUE'];
    const values: any[] = [];
    let i = 1;

    if (search) {
      conditions.push(`(nombre ILIKE $${i} OR codigo_sku ILIKE $${i})`);
      values.push(`%${search}%`); i++;
    }
    if (stock_bajo === 'true') {
      conditions.push(`stock <= stock_minimo`);
    }

    const { rows } = await db.query(
      `SELECT *, (stock <= stock_minimo) AS stock_critico
       FROM repuestos WHERE ${conditions.join(' AND ')}
       ORDER BY nombre ASC`,
      values
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/repuestos — crear repuesto ──────────────────────────────────────
repuestosRouter.post(
  '/',
  requireRole('admin'),
  [
    body('nombre').trim().notEmpty(),
    body('precio_venta').isFloat({ min: 0 }),
    body('precio_costo').optional().isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    body('stock_minimo').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { nombre, codigo_sku, descripcion, precio_costo, precio_venta, stock, stock_minimo, unidad } = req.body;
      const { rows } = await db.query(
        `INSERT INTO repuestos (nombre, codigo_sku, descripcion, precio_costo, precio_venta, stock, stock_minimo, unidad)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [nombre, codigo_sku, descripcion, precio_costo || 0, precio_venta, stock || 0, stock_minimo || 1, unidad || 'unidad']
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PATCH /api/repuestos/:id/stock — ajustar stock ───────────────────────────
repuestosRouter.patch(
  '/:id/stock',
  requireRole('admin', 'mecanico'),
  [
    param('id').isUUID(),
    body('cantidad').isInt().withMessage('Cantidad requerida (positiva o negativa)'),
    body('motivo').optional().trim(),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { cantidad, motivo } = req.body;
      const { rows } = await db.query(
        `UPDATE repuestos SET stock = stock + $1, updated_at = NOW()
         WHERE id = $2 AND (stock + $1) >= 0
         RETURNING *`,
        [cantidad, req.params.id]
      );
      if (!rows[0]) throw new AppError('Repuesto no encontrado o stock insuficiente', 422);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/repuestos/:id — actualizar ───────────────────────────────────────
repuestosRouter.put(
  '/:id',
  requireRole('admin'),
  param('id').isUUID(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { nombre, codigo_sku, descripcion, precio_costo, precio_venta, stock_minimo, unidad, activo } = req.body;
      const { rows } = await db.query(
        `UPDATE repuestos SET nombre=$1, codigo_sku=$2, descripcion=$3, precio_costo=$4,
         precio_venta=$5, stock_minimo=$6, unidad=$7, activo=$8, updated_at=NOW()
         WHERE id=$9 RETURNING *`,
        [nombre, codigo_sku, descripcion, precio_costo, precio_venta, stock_minimo, unidad, activo, req.params.id]
      );
      if (!rows[0]) throw new AppError('Repuesto no encontrado', 404);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);
