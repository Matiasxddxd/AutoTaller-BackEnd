import { Router } from 'express';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

export const adminRouter = Router();

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') throw new AppError('Solo admins', 403);

    const now = new Date();
    const mes  = parseInt(req.query.mes  as string) || now.getMonth() + 1;
    const anio = parseInt(req.query.anio as string) || now.getFullYear();

    const [ordenes, clientes, repuestos, ingresos] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'pendiente')   AS pendientes,
          COUNT(*) FILTER (WHERE estado = 'en_proceso')  AS en_proceso,
          COUNT(*) FILTER (WHERE estado = 'terminada')   AS terminadas,
          COUNT(*) FILTER (WHERE estado = 'entregada')   AS entregadas,
          COUNT(*)                                        AS total
        FROM ordenes_trabajo
        WHERE EXTRACT(MONTH FROM created_at) = $1
          AND EXTRACT(YEAR  FROM created_at) = $2
      `, [mes, anio]),

      db.query(`SELECT COUNT(*) AS total FROM clientes`),

      db.query(`
        SELECT COUNT(*) FILTER (WHERE stock_actual <= stock_minimo) AS bajo_stock,
               COUNT(*) AS total
        FROM repuestos
      `),

      db.query(`
        SELECT COALESCE(SUM(total), 0) AS mes_actual,
               COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at) = $3
                                  AND EXTRACT(YEAR  FROM created_at) = $4
                               THEN total END), 0) AS mes_anterior
        FROM cotizaciones
        WHERE estado = 'aprobada'
          AND EXTRACT(YEAR FROM created_at) = $2
          AND EXTRACT(MONTH FROM created_at) <= $1
      `, [mes, anio, mes - 1 || 12, mes === 1 ? anio - 1 : anio]),
    ]);

    res.json({
      ordenes: ordenes.rows[0],
      clientes: clientes.rows[0],
      repuestos: repuestos.rows[0],
      ingresos: ingresos.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
adminRouter.get('/users', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') throw new AppError('Solo admins', 403);

    const { rows } = await db.query(`
      SELECT u.id, u.email, u.role, u.activo, u.created_at,
             m.nombre, m.telefono, m.especialidad
      FROM users u
      LEFT JOIN mecanicos m ON m.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') throw new AppError('Solo admins', 403);

    const { id } = req.params;

    // No permitir eliminar al propio admin
    if (id === req.user.userId) throw new AppError('No puedes eliminarte a ti mismo', 400);

    await db.query('UPDATE users SET activo = FALSE WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});