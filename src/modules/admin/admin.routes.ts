import { Router } from 'express';
import { db } from '../../config/db';
import { requireRole } from '../../middleware/auth';

export const adminRouter = Router();

// Solo administradores pueden ver el panel
adminRouter.use(requireRole('admin'));

// ── GET /api/admin/dashboard — métricas principales ───────────────────────────
adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const { mes = new Date().getMonth() + 1, anio = new Date().getFullYear() } = req.query;

    const [ordenes, ingresos, mecanicos, repuestos] = await Promise.all([
      // Órdenes por estado
      db.query(`
        SELECT estado, COUNT(*)::int AS total
        FROM ordenes_trabajo
        WHERE EXTRACT(MONTH FROM created_at) = $1
          AND EXTRACT(YEAR  FROM created_at) = $2
        GROUP BY estado
      `, [mes, anio]),

      // Ingresos del mes (cotizaciones aprobadas)
      db.query(`
        SELECT
          COALESCE(SUM(total),0)::numeric    AS total_mes,
          COALESCE(AVG(total),0)::numeric    AS promedio_orden,
          COUNT(*)::int                      AS total_cotizaciones
        FROM cotizaciones
        WHERE estado = 'aprobada'
          AND EXTRACT(MONTH FROM created_at) = $1
          AND EXTRACT(YEAR  FROM created_at) = $2
      `, [mes, anio]),

      // Rendimiento por mecánico
      db.query(`
        SELECT
          m.nombre,
          COUNT(o.id)::int  AS ordenes_completadas,
          COALESCE(SUM(s.horas_trabajo),0)::numeric AS horas_totales
        FROM mecanicos m
        LEFT JOIN ordenes_trabajo o ON o.mecanico_id = m.id
          AND o.estado IN ('terminado','entregado')
          AND EXTRACT(MONTH FROM o.updated_at) = $1
          AND EXTRACT(YEAR  FROM o.updated_at) = $2
        LEFT JOIN servicios_realizados s ON s.mecanico_id = m.id
        WHERE m.activo = TRUE
        GROUP BY m.id, m.nombre
        ORDER BY ordenes_completadas DESC
      `, [mes, anio]),

      // Repuestos con stock bajo
      db.query(`
        SELECT nombre, codigo_sku, stock, stock_minimo
        FROM repuestos
        WHERE stock <= stock_minimo AND activo = TRUE
        ORDER BY stock ASC
        LIMIT 10
      `),
    ]);

    res.json({
      ordenes_por_estado:   ordenes.rows,
      ingresos:             ingresos.rows[0],
      rendimiento_mecanicos: mecanicos.rows,
      alertas_stock_bajo:   repuestos.rows,
      periodo: { mes, anio },
    });
  } catch (err) {
    next(err);
  }
});
