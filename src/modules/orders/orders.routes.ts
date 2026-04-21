import { Router } from 'express';
import { body, param } from 'express-validator';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { requireRole } from '../../middleware/auth';
import { OrderStatus } from '../../types';
import { notificationService } from '../notifications/notification.service';

export const ordersRouter = Router();

// Helper: emitir estado por WebSocket (se inyecta desde app.ts)
let _io: any;
export const setSocketIO = (io: any) => { _io = io; };

// ── GET /api/orders — listar con filtros ──────────────────────────────────────
ordersRouter.get('/', async (req, res, next) => {
  try {
    const { estado, mecanico_id, sucursal_id } = req.query;

    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let i = 1;

    if (estado)       { conditions.push(`o.estado = $${i++}`);       values.push(estado); }
    if (mecanico_id)  { conditions.push(`o.mecanico_id = $${i++}`);  values.push(mecanico_id); }
    if (sucursal_id)  { conditions.push(`o.sucursal_id = $${i++}`);  values.push(sucursal_id); }

    // Mecánicos solo ven sus propias órdenes
    if (req.user?.role === 'mecanico') {
      const { rows } = await db.query(
        'SELECT id FROM mecanicos WHERE user_id = $1', [req.user.userId]
      );
      if (rows[0]) {
        conditions.push(`o.mecanico_id = $${i++}`);
        values.push(rows[0].id);
      }
    }

    const { rows } = await db.query(
      `SELECT
         o.*,
         v.marca, v.modelo, v.patente, v.color, v.kilometraje,
         c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
         m.nombre AS mecanico_nombre
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = (SELECT cliente_id FROM vehiculos WHERE id = o.vehiculo_id)
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE o.prioridad
           WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2
           WHEN 'normal' THEN 3  WHEN 'baja' THEN 4
         END,
         o.created_at DESC`,
      values
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:id — detalle completo ────────────────────────────────────
ordersRouter.get('/:id', param('id').isUUID(), validateRequest, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         o.*,
         v.marca, v.modelo, v.patente, v.vin, v.color, v.kilometraje, v.anio,
         c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email,
         m.nombre AS mecanico_nombre, m.especialidad AS mecanico_especialidad
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = (SELECT cliente_id FROM vehiculos WHERE id = o.vehiculo_id)
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) throw new AppError('Orden no encontrada', 404);

    // Historial de estados
    const { rows: historial } = await db.query(
      `SELECT h.*, u.email AS usuario_email
       FROM estado_historial h
       LEFT JOIN users u ON u.id = h.usuario_id
       WHERE h.orden_id = $1
       ORDER BY h.created_at ASC`,
      [req.params.id]
    );

    // Servicios realizados
    const { rows: servicios } = await db.query(
      `SELECT s.*, m.nombre AS mecanico_nombre
       FROM servicios_realizados s
       LEFT JOIN mecanicos m ON m.id = s.mecanico_id
       WHERE s.orden_id = $1
       ORDER BY s.fecha_hora DESC`,
      [req.params.id]
    );

    res.json({ ...rows[0], historial, servicios });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/orders — crear orden ────────────────────────────────────────────
ordersRouter.post(
  '/',
  requireRole('admin', 'mecanico'),
  [
    body('vehiculo_id').isUUID().withMessage('Vehículo requerido'),
    body('diagnostico').optional().trim(),
    body('prioridad').optional().isIn(['baja','normal','alta','urgente']),
    body('fecha_estimada').optional().isDate(),
    body('kilometraje_ingreso').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const {
        vehiculo_id, cotizacion_id, mecanico_id, sucursal_id,
        diagnostico, notas_internas, prioridad, fecha_estimada, kilometraje_ingreso
      } = req.body;

      const { rows } = await db.query(
        `INSERT INTO ordenes_trabajo
           (vehiculo_id, cotizacion_id, mecanico_id, sucursal_id,
            diagnostico, notas_internas, prioridad, fecha_estimada, kilometraje_ingreso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [vehiculo_id, cotizacion_id, mecanico_id, sucursal_id,
         diagnostico, notas_internas, prioridad || 'normal', fecha_estimada, kilometraje_ingreso]
      );

      // Registrar estado inicial en historial
      await db.query(
        `INSERT INTO estado_historial (orden_id, usuario_id, estado_nuevo, comentario)
         VALUES ($1, $2, 'pendiente', 'Orden creada')`,
        [rows[0].id, req.user!.userId]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/orders/:id/status — cambiar estado con notificación ────────────
ordersRouter.patch(
  '/:id/status',
  requireRole('admin', 'mecanico'),
  [
    param('id').isUUID(),
    body('estado').isIn(['pendiente','en_proceso','terminado','entregado']),
    body('comentario').optional().trim(),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { estado, comentario } = req.body as { estado: OrderStatus; comentario?: string };
      const orderId = req.params.id;

      // Obtener orden actual con datos del cliente
      const { rows } = await db.query(
        `SELECT o.estado AS estado_actual, o.vehiculo_id,
                c.telefono, c.email, c.nombre AS cliente_nombre,
                v.patente, v.marca, v.modelo
         FROM ordenes_trabajo o
         JOIN vehiculos v ON v.id = o.vehiculo_id
         JOIN clientes c ON c.id = v.cliente_id
         WHERE o.id = $1`,
        [orderId]
      );
      if (!rows[0]) throw new AppError('Orden no encontrada', 404);

      const orden = rows[0];
      const estadoAnterior = orden.estado_actual;

      // Validar transición de estado
      const transiciones: Record<OrderStatus, OrderStatus[]> = {
        pendiente:   ['en_proceso'],
        en_proceso:  ['terminado'],
        terminado:   ['entregado'],
        entregado:   [],
      };
      if (!transiciones[estadoAnterior as OrderStatus]?.includes(estado)) {
        throw new AppError(
          `No se puede pasar de "${estadoAnterior}" a "${estado}"`, 422
        );
      }

      // Actualizar estado
      const extra: Record<string, string> = {};
      if (estado === 'entregado') extra['fecha_entrega'] = 'NOW()';

      await db.query(
        `UPDATE ordenes_trabajo
         SET estado=$1, updated_at=NOW() ${estado === 'entregado' ? ', fecha_entrega=NOW()' : ''}
         WHERE id=$2`,
        [estado, orderId]
      );

      // Registrar en historial
      await db.query(
        `INSERT INTO estado_historial
           (orden_id, usuario_id, estado_anterior, estado_nuevo, comentario)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, req.user!.userId, estadoAnterior, estado, comentario]
      );

      // Notificación WhatsApp cuando el auto está listo
      if (estado === 'terminado' && orden.telefono) {
        await notificationService.sendWhatsApp(
          orden.telefono,
          `🔧 Hola ${orden.cliente_nombre}, tu vehículo ` +
          `${orden.marca} ${orden.modelo} (${orden.patente}) ` +
          `está listo para retiro. ¡Te esperamos!`
        );
      }

      // Emitir por WebSocket en tiempo real
      if (_io) {
        _io.to(`order:${orderId}`).emit('order:status_updated', {
          orderId, estadoAnterior, estadoNuevo: estado, timestamp: new Date()
        });
      }

      res.json({ orderId, estadoAnterior, estadoNuevo: estado });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/orders/:id/services — registrar trabajo realizado ───────────────
ordersRouter.post(
  '/:id/services',
  requireRole('admin', 'mecanico'),
  [
    param('id').isUUID(),
    body('descripcion').trim().notEmpty(),
    body('observaciones').optional().trim(),
    body('horas_trabajo').optional().isFloat({ min: 0 }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { descripcion, observaciones, horas_trabajo } = req.body;

      // Obtener mecánico asociado al usuario
      const { rows: [mec] } = await db.query(
        'SELECT id FROM mecanicos WHERE user_id = $1', [req.user!.userId]
      );

      const { rows } = await db.query(
        `INSERT INTO servicios_realizados
           (orden_id, mecanico_id, descripcion, observaciones, horas_trabajo)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, mec?.id, descripcion, observaciones, horas_trabajo]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);
